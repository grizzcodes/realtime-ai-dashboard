// backend/src/services/integrationService.js
const { google } = require('googleapis');
const fetch = require('node-fetch');

class IntegrationService {
  constructor() {
    this.googleAuth = new google.auth.OAuth2(
      process.env.GOOGLE_CLIENT_ID,
      process.env.GOOGLE_CLIENT_SECRET,
      'http://localhost:3002/auth/google/callback'
    );
    
    // Set refresh token if available
    if (process.env.GOOGLE_REFRESH_TOKEN) {
      this.googleAuth.setCredentials({
        refresh_token: process.env.GOOGLE_REFRESH_TOKEN
      });
    }
  }

  // Gmail Integration
  async testGmailConnection() {
    try {
      if (!process.env.GOOGLE_REFRESH_TOKEN) {
        return { 
          success: false, 
          error: 'Gmail requires OAuth setup. Visit /auth/google to authenticate.',
          needsAuth: true
        };
      }

      const gmail = google.gmail({ version: 'v1', auth: this.googleAuth });
      const response = await gmail.users.getProfile({ userId: 'me' });
      
      return {
        success: true,
        message: `Gmail connected: ${response.data.emailAddress}`,
        emailAddress: response.data.emailAddress
      };
    } catch (error) {
      return {
        success: false,
        error: `Gmail connection failed: ${error.message}`,
        needsAuth: error.code === 401
      };
    }
  }

  async getRecentEmails(maxResults = 10) {
    try {
      const gmail = google.gmail({ version: 'v1', auth: this.googleAuth });
      
      const response = await gmail.users.messages.list({
        userId: 'me',
        maxResults,
        q: 'is:unread'
      });

      if (!response.data.messages) {
        return { success: true, emails: [] };
      }

      const emails = await Promise.all(
        response.data.messages.slice(0, 5).map(async (message) => {
          const email = await gmail.users.messages.get({
            userId: 'me',
            id: message.id,
            format: 'metadata',
            metadataHeaders: ['From', 'Subject', 'Date']
          });

          const headers = email.data.payload.headers;
          return {
            id: message.id,
            from: headers.find(h => h.name === 'From')?.value || 'Unknown',
            subject: headers.find(h => h.name === 'Subject')?.value || 'No Subject',
            date: headers.find(h => h.name === 'Date')?.value || new Date().toISOString()
          };
        })
      );

      return { success: true, emails };
    } catch (error) {
      return { success: false, error: error.message, emails: [] };
    }
  }

  // Calendar Integration
  async testCalendarConnection() {
    try {
      if (!process.env.GOOGLE_REFRESH_TOKEN) {
        return { 
          success: false, 
          error: 'Calendar requires OAuth setup. Visit /auth/google to authenticate.',
          needsAuth: true
        };
      }

      const calendar = google.calendar({ version: 'v3', auth: this.googleAuth });
      const response = await calendar.calendarList.list();
      
      return {
        success: true,
        message: `Calendar connected: ${response.data.items.length} calendars found`,
        calendars: response.data.items.length
      };
    } catch (error) {
      return {
        success: false,
        error: `Calendar connection failed: ${error.message}`,
        needsAuth: error.code === 401
      };
    }
  }

  async getUpcomingEvents(maxResults = 10) {
    try {
      const calendar = google.calendar({ version: 'v3', auth: this.googleAuth });
      
      const response = await calendar.events.list({
        calendarId: 'primary',
        timeMin: new Date().toISOString(),
        maxResults,
        singleEvents: true,
        orderBy: 'startTime'
      });

      const events = response.data.items.map(event => ({
        id: event.id,
        summary: event.summary || 'No Title',
        start: event.start.dateTime || event.start.date,
        end: event.end.dateTime || event.end.date,
        attendees: event.attendees ? event.attendees.length : 0
      }));

      return { success: true, events };
    } catch (error) {
      return { success: false, error: error.message, events: [] };
    }
  }

  // Slack Integration
  async testSlackConnection() {
    try {
      if (!process.env.SLACK_BOT_TOKEN) {
        return { 
          success: false, 
          error: 'Slack requires bot token. Add SLACK_BOT_TOKEN to .env file.',
          needsAuth: true
        };
      }

      const response = await fetch('https://slack.com/api/auth.test', {
        headers: {
          'Authorization': `Bearer ${process.env.SLACK_BOT_TOKEN}`,
          'Content-Type': 'application/json'
        }
      });

      const data = await response.json();
      
      if (!data.ok) {
        return {
          success: false,
          error: `Slack connection failed: ${data.error}`,
          needsAuth: data.error === 'invalid_auth'
        };
      }

      return {
        success: true,
        message: `Slack connected: ${data.team} (${data.user})`,
        team: data.team,
        user: data.user
      };
    } catch (error) {
      return {
        success: false,
        error: `Slack connection failed: ${error.message}`
      };
    }
  }

  async getRecentSlackMessages(limit = 10) {
    try {
      const response = await fetch('https://slack.com/api/conversations.list', {
        headers: {
          'Authorization': `Bearer ${process.env.SLACK_BOT_TOKEN}`
        }
      });

      const channelsData = await response.json();
      if (!channelsData.ok) {
        return { success: false, error: channelsData.error, messages: [] };
      }

      // Get messages from first channel
      const channel = channelsData.channels[0];
      if (!channel) {
        return { success: true, messages: [] };
      }

      const messagesResponse = await fetch(
        `https://slack.com/api/conversations.history?channel=${channel.id}&limit=${limit}`,
        {
          headers: {
            'Authorization': `Bearer ${process.env.SLACK_BOT_TOKEN}`
          }
        }
      );

      const messagesData = await messagesResponse.json();
      if (!messagesData.ok) {
        return { success: false, error: messagesData.error, messages: [] };
      }

      const messages = messagesData.messages.map(msg => ({
        id: msg.ts,
        text: msg.text || 'No text',
        user: msg.user || 'Unknown',
        timestamp: new Date(parseFloat(msg.ts) * 1000).toISOString(),
        channel: channel.name
      }));

      return { success: true, messages };
    } catch (error) {
      return { success: false, error: error.message, messages: [] };
    }
  }

  // Fireflies Integration (if API key is provided)
  async testFirefliesConnection() {
    try {
      if (!process.env.FIREFLIES_API_KEY) {
        return { 
          success: false, 
          error: 'Fireflies requires API key. Add FIREFLIES_API_KEY to .env file.',
          needsAuth: true
        };
      }

      // Fireflies uses GraphQL API
      const query = `
        query {
          user {
            user_id
            name
            email
          }
        }
      `;

      const response = await fetch('https://api.fireflies.ai/graphql', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${process.env.FIREFLIES_API_KEY}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({ query })
      });

      const data = await response.json();
      
      if (data.errors) {
        return {
          success: false,
          error: `Fireflies connection failed: ${data.errors[0].message}`
        };
      }

      return {
        success: true,
        message: `Fireflies connected: ${data.data.user.name}`,
        user: data.data.user
      };
    } catch (error) {
      return {
        success: false,
        error: `Fireflies connection failed: ${error.message}`
      };
    }
  }

  // Combined status check
  async getAllIntegrationsStatus() {
    const [gmail, calendar, slack, fireflies] = await Promise.all([
      this.testGmailConnection(),
      this.testCalendarConnection(),
      this.testSlackConnection(),
      this.testFirefliesConnection()
    ]);

    return {
      gmail,
      calendar,
      slack,
      fireflies,
      summary: {
        connected: [gmail, calendar, slack, fireflies].filter(s => s.success).length,
        total: 4,
        needsAuth: [gmail, calendar, slack, fireflies].filter(s => s.needsAuth).length
      }
    };
  }
}

module.exports = IntegrationService;
