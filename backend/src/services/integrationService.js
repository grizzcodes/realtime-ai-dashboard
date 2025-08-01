// backend/src/services/integrationService.js
const { google } = require('googleapis');
const fetch = require('node-fetch');
const CalendarService = require('./calendarService');

class IntegrationService {
  constructor() {
    this.googleAuth = new google.auth.OAuth2(
      process.env.GOOGLE_CLIENT_ID,
      process.env.GOOGLE_CLIENT_SECRET,
      'http://localhost:3002/auth/google/callback'
    );
    
    if (process.env.GOOGLE_REFRESH_TOKEN) {
      this.googleAuth.setCredentials({
        refresh_token: process.env.GOOGLE_REFRESH_TOKEN
      });
    }

    this.calendarService = new CalendarService();
  }

  async testGmailConnection() {
    try {
      if (!process.env.GOOGLE_REFRESH_TOKEN) {
        return { 
          success: false, 
          error: 'OAuth setup required. Visit /auth/google',
          needsAuth: true
        };
      }

      // Refresh access token using oauth2Client
      const { credentials } = await this.googleAuth.refreshAccessToken();
      this.googleAuth.setCredentials(credentials);

      const gmail = google.gmail({ version: 'v1', auth: this.googleAuth });
      const response = await gmail.users.getProfile({ userId: 'me' });
      
      return {
        success: true,
        message: `Connected: ${response.data.emailAddress}`,
        emailAddress: response.data.emailAddress
      };
    } catch (error) {
      console.error('Gmail connection error:', error);
      return {
        success: false,
        error: `Gmail failed: ${error.message}`,
        needsAuth: error.code === 401 || error.message.includes('invalid_grant')
      };
    }
  }

  async testCalendarConnection() {
    return await this.calendarService.testConnection();
  }

  async testSlackConnection() {
    try {
      if (!process.env.SLACK_BOT_TOKEN) {
        return { 
          success: false, 
          error: 'Add SLACK_BOT_TOKEN to .env',
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
          error: `Slack error: ${data.error}`,
          needsAuth: data.error === 'invalid_auth'
        };
      }

      return {
        success: true,
        message: `Connected: ${data.team} (${data.user})`,
        team: data.team,
        user: data.user
      };
    } catch (error) {
      return {
        success: false,
        error: `Slack failed: ${error.message}`
      };
    }
  }

  async testFirefliesConnection() {
    try {
      if (!process.env.FIREFLIES_API_KEY) {
        return { 
          success: false, 
          error: 'Add FIREFLIES_API_KEY to .env',
          needsAuth: true
        };
      }

      const query = `query { user { user_id name email } }`;

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
          error: `Fireflies error: ${data.errors[0].message}`
        };
      }

      return {
        success: true,
        message: `Connected: ${data.data.user.name}`,
        user: data.data.user
      };
    } catch (error) {
      return {
        success: false,
        error: `Fireflies failed: ${error.message}`
      };
    }
  }

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
        total: 4
      }
    };
  }

  // Calendar integration methods
  async getUpcomingEvents(maxResults = 10) {
    return await this.calendarService.getUpcomingEvents(maxResults);
  }

  async getTodaysEvents() {
    return await this.calendarService.getTodaysEvents();
  }

  async createCalendarEvent(eventData) {
    return await this.calendarService.createEvent(eventData);
  }

  async getLatestEmails(limit = 10) {
    try {
      if (!process.env.GOOGLE_REFRESH_TOKEN) {
        return {
          success: false,
          error: 'Google Gmail not configured. Set up OAuth first.',
          emails: []
        };
      }

      const { credentials } = await this.googleAuth.refreshAccessToken();
      this.googleAuth.setCredentials(credentials);

      const gmail = google.gmail({ version: 'v1', auth: this.googleAuth });
      
      const response = await gmail.users.messages.list({
        userId: 'me',
        maxResults: limit,
        labelIds: ['INBOX'],
        q: '-in:chats'
      });

      const messages = response.data.messages || [];
      
      const emailDetails = await Promise.all(
        messages.slice(0, limit).map(async (message) => {
          try {
            const details = await gmail.users.messages.get({
              userId: 'me',
              id: message.id
            });
            
            const headers = details.data.payload.headers;
            const getHeader = (name) => {
              const header = headers.find(h => h.name.toLowerCase() === name.toLowerCase());
              return header ? header.value : '';
            };
            
            const fromHeader = getHeader('From');
            const senderName = fromHeader.includes('<') ? 
              fromHeader.split('<')[0].trim().replace(/"/g, '') : 
              fromHeader;
            
            return {
              id: message.id,
              subject: getHeader('Subject') || 'No Subject',
              from: senderName || 'Unknown Sender',
              date: getHeader('Date'),
              snippet: details.data.snippet || '',
              isUnread: details.data.labelIds?.includes('UNREAD') || false,
              threadId: details.data.threadId
            };
          } catch (error) {
            console.log(`⚠️ Failed to get details for email ${message.id}:`, error.message);
            return {
              id: message.id,
              subject: 'Failed to load',
              from: 'Unknown',
              date: '',
              snippet: 'Error loading email details',
              isUnread: false
            };
          }
        })
      );

      console.log(`✅ Loaded ${emailDetails.length} inbox emails`);

      return {
        success: true,
        emails: emailDetails,
        count: emailDetails.length
      };
      
    } catch (error) {
      console.error('❌ Failed to get latest emails:', error);
      return {
        success: false,
        error: error.message,
        emails: []
      };
    }
  }

  async archiveEmail(emailId) {
    try {
      if (!process.env.GOOGLE_REFRESH_TOKEN) {
        return {
          success: false,
          error: 'Google Gmail not configured. Set up OAuth first.'
        };
      }

      const { credentials } = await this.googleAuth.refreshAccessToken();
      this.googleAuth.setCredentials(credentials);

      const gmail = google.gmail({ version: 'v1', auth: this.googleAuth });
      
      await gmail.users.messages.modify({
        userId: 'me',
        id: emailId,
        resource: {
          removeLabelIds: ['INBOX']
        }
      });

      console.log(`✅ Email ${emailId} archived successfully`);

      return {
        success: true,
        message: 'Email archived successfully',
        emailId: emailId
      };
      
    } catch (error) {
      console.error('❌ Failed to archive email:', error);
      return {
        success: false,
        error: error.message
      };
    }
  }
}

module.exports = IntegrationService;