// backend/src/services/calendarService.js
const { google } = require('googleapis');

class CalendarService {
  constructor() {
    this.oauth2Client = new google.auth.OAuth2(
      process.env.GOOGLE_CLIENT_ID,
      process.env.GOOGLE_CLIENT_SECRET,
      'http://localhost:3002/auth/google/callback'
    );
    
    this.setupCredentials();
  }

  setupCredentials() {
    if (process.env.GOOGLE_REFRESH_TOKEN) {
      this.oauth2Client.setCredentials({
        refresh_token: process.env.GOOGLE_REFRESH_TOKEN
      });
    }
  }

  async refreshAccessToken() {
    try {
      const { credentials } = await this.oauth2Client.refreshAccessToken();
      this.oauth2Client.setCredentials(credentials);
      return credentials.access_token;
    } catch (error) {
      throw new Error(`Token refresh failed: ${error.message}`);
    }
  }

  async testConnection() {
    try {
      if (!process.env.GOOGLE_REFRESH_TOKEN) {
        return { 
          success: false, 
          error: 'OAuth setup required. Visit /auth/google',
          needsAuth: true
        };
      }

      // Ensure we have a fresh access token
      await this.refreshAccessToken();

      const calendar = google.calendar({ version: 'v3', auth: this.oauth2Client });
      const response = await calendar.calendarList.list();
      
      const primaryCalendar = response.data.items.find(cal => cal.primary);
      
      return {
        success: true,
        message: `Connected: ${response.data.items.length} calendar(s)`,
        details: {
          totalCalendars: response.data.items.length,
          primaryCalendar: primaryCalendar?.summary || 'No primary calendar found'
        }
      };
    } catch (error) {
      console.error('Calendar connection error:', error);
      
      const needsAuth = error.code === 401 || 
                       error.message.includes('invalid_grant') ||
                       error.message.includes('Token has been expired');
      
      return {
        success: false,
        error: `Calendar API error: ${error.message}`,
        needsAuth
      };
    }
  }

  async getUpcomingEvents(maxResults = 10) {
    try {
      await this.refreshAccessToken();
      
      const calendar = google.calendar({ version: 'v3', auth: this.oauth2Client });
      const now = new Date().toISOString();
      
      const response = await calendar.events.list({
        calendarId: 'primary',
        timeMin: now,
        maxResults,
        singleEvents: true,
        orderBy: 'startTime'
      });

      const events = response.data.items || [];
      
      return {
        success: true,
        events: events.map(event => {
          // Enhanced attendee processing
          const attendees = event.attendees || [];
          const processedAttendees = attendees.map(attendee => ({
            email: attendee.email,
            displayName: attendee.displayName || attendee.email.split('@')[0],
            responseStatus: attendee.responseStatus,
            organizer: attendee.organizer || false,
            optional: attendee.optional || false
          }));

          return {
            id: event.id,
            title: event.summary || 'Untitled Event', // FIXED: Always include title
            summary: event.summary || 'Untitled Event',
            start: event.start?.dateTime || event.start?.date,
            end: event.end?.dateTime || event.end?.date,
            description: event.description,
            location: event.location || 'No location',
            attendees: processedAttendees, // Enhanced attendee data
            attendeeEmails: attendees.map(a => a.email), // Simple email list for backwards compatibility
            organizer: event.organizer,
            hangoutLink: event.hangoutLink,
            meetLink: event.conferenceData?.conferenceSolution?.name === 'Google Meet' ? 
                     event.conferenceData.entryPoints?.find(ep => ep.entryPointType === 'video')?.uri : null,
            status: event.status,
            created: event.created,
            updated: event.updated
          };
        })
      };
    } catch (error) {
      return {
        success: false,
        error: `Failed to fetch events: ${error.message}`
      };
    }
  }

  async getTodaysEvents() {
    try {
      await this.refreshAccessToken();
      
      const calendar = google.calendar({ version: 'v3', auth: this.oauth2Client });
      const today = new Date();
      const startOfDay = new Date(today.setHours(0, 0, 0, 0)).toISOString();
      const endOfDay = new Date(today.setHours(23, 59, 59, 999)).toISOString();
      
      const response = await calendar.events.list({
        calendarId: 'primary',
        timeMin: startOfDay,
        timeMax: endOfDay,
        singleEvents: true,
        orderBy: 'startTime'
      });

      const events = response.data.items || [];

      return {
        success: true,
        events: events.map(event => ({
          id: event.id,
          title: event.summary || 'Untitled Event',
          summary: event.summary || 'Untitled Event',
          start: event.start?.dateTime || event.start?.date,
          end: event.end?.dateTime || event.end?.date,
          location: event.location || 'No location',
          attendees: (event.attendees || []).map(attendee => ({
            email: attendee.email,
            displayName: attendee.displayName || attendee.email.split('@')[0],
            responseStatus: attendee.responseStatus
          }))
        })),
        count: events.length
      };
    } catch (error) {
      return {
        success: false,
        error: error.message
      };
    }
  }

  async createEvent(eventData) {
    try {
      await this.refreshAccessToken();
      
      const calendar = google.calendar({ version: 'v3', auth: this.oauth2Client });
      
      const event = {
        summary: eventData.title,
        description: eventData.description,
        start: {
          dateTime: eventData.startTime,
          timeZone: eventData.timeZone || 'America/New_York'
        },
        end: {
          dateTime: eventData.endTime,
          timeZone: eventData.timeZone || 'America/New_York'
        }
      };

      if (eventData.attendees) {
        event.attendees = eventData.attendees.map(email => ({ email }));
      }

      const response = await calendar.events.insert({
        calendarId: 'primary',
        resource: event
      });

      return {
        success: true,
        event: response.data,
        message: 'Event created successfully'
      };
    } catch (error) {
      return {
        success: false,
        error: `Failed to create event: ${error.message}`
      };
    }
  }
}

module.exports = CalendarService;