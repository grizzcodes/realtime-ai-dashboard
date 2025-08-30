// backend/src/services/calendarService.js
const { google } = require('googleapis');

class CalendarService {
  constructor() {
    // Check if we have a fixed OAuth client from the emergency fix
    if (global.fixedOAuthClient) {
      console.log('✅ Using fixed OAuth client from emergency fix');
      this.oauth2Client = global.fixedOAuthClient;
      this.calendar = google.calendar({ version: 'v3', auth: this.oauth2Client });
    } else if (global.calendarServiceAuth) {
      console.log('✅ Using OAuth client from auth routes');
      this.oauth2Client = global.calendarServiceAuth;
      this.calendar = google.calendar({ version: 'v3', auth: this.oauth2Client });
    } else {
      // Fallback to creating new OAuth client
      this.oauth2Client = new google.auth.OAuth2(
        process.env.GOOGLE_CLIENT_ID,
        process.env.GOOGLE_CLIENT_SECRET,
        'http://localhost:3001/auth/google/callback'
      );

      if (process.env.GOOGLE_REFRESH_TOKEN) {
        this.oauth2Client.setCredentials({
          refresh_token: process.env.GOOGLE_REFRESH_TOKEN
        });
      }

      this.calendar = google.calendar({ version: 'v3', auth: this.oauth2Client });
    }
    
    console.log('📅 CalendarService initialized');
  }

  // Force refresh the OAuth token before making requests
  async ensureAuth() {
    try {
      // If we don't have an access token, refresh it
      const credentials = await this.oauth2Client.getAccessToken();
      if (!credentials.token) {
        console.log('🔄 Refreshing calendar access token...');
        const { credentials: newCreds } = await this.oauth2Client.refreshAccessToken();
        this.oauth2Client.setCredentials(newCreds);
        console.log('✅ Calendar access token refreshed');
      }
      return true;
    } catch (error) {
      console.error('❌ Failed to ensure auth:', error.message);
      
      // Try to use the fixed OAuth client if available
      if (global.fixedOAuthClient && global.fixedOAuthClient !== this.oauth2Client) {
        console.log('🔄 Switching to fixed OAuth client...');
        this.oauth2Client = global.fixedOAuthClient;
        this.calendar = google.calendar({ version: 'v3', auth: this.oauth2Client });
        return true;
      }
      
      return false;
    }
  }

  async testConnection() {
    try {
      // Ensure we have valid auth
      await this.ensureAuth();
      
      const response = await this.calendar.calendarList.list({
        maxResults: 1
      });

      if (response.data.items && response.data.items.length > 0) {
        return {
          success: true,
          message: `Connected to calendar: ${response.data.items[0].summary}`,
          calendarId: response.data.items[0].id
        };
      }

      return {
        success: true,
        message: 'Calendar API connected',
        calendarId: 'primary'
      };
    } catch (error) {
      console.error('Calendar connection test failed:', error);
      return {
        success: false,
        error: error.message || 'Failed to connect to Google Calendar'
      };
    }
  }

  async getUpcomingEvents(days = 7) {
    try {
      // Ensure we have valid auth
      await this.ensureAuth();
      
      const now = new Date();
      const timeMin = now.toISOString();
      const timeMax = new Date(now.getTime() + (days * 24 * 60 * 60 * 1000)).toISOString();

      const response = await this.calendar.events.list({
        calendarId: 'primary',
        timeMin: timeMin,
        timeMax: timeMax,
        maxResults: 50,
        singleEvents: true,
        orderBy: 'startTime'
      });

      const events = response.data.items || [];
      
      return {
        success: true,
        events: events.map(event => ({
          id: event.id,
          summary: event.summary || 'No title',
          start: event.start?.dateTime || event.start?.date,
          end: event.end?.dateTime || event.end?.date,
          description: event.description,
          location: event.location,
          attendees: event.attendees?.map(a => ({
            email: a.email,
            responseStatus: a.responseStatus
          })),
          htmlLink: event.htmlLink
        })),
        count: events.length
      };
    } catch (error) {
      console.error('Failed to get upcoming events:', error);
      return {
        success: false,
        error: error.message,
        events: []
      };
    }
  }

  async createEvent(eventDetails) {
    try {
      // CRITICAL: Ensure we have valid auth before creating event
      const authValid = await this.ensureAuth();
      if (!authValid) {
        throw new Error('Failed to authenticate with Google Calendar');
      }
      
      console.log('📅 Creating calendar event:', eventDetails);

      // Build the event object
      const event = {
        summary: eventDetails.summary || 'New Event',
        description: eventDetails.description || '',
        start: eventDetails.start,
        end: eventDetails.end,
        attendees: eventDetails.attendees || [],
        reminders: eventDetails.reminders || {
          useDefault: false,
          overrides: [
            { method: 'email', minutes: 30 },
            { method: 'popup', minutes: 10 }
          ]
        }
      };

      // Add location if provided
      if (eventDetails.location) {
        event.location = eventDetails.location;
      }

      // Add conference data if requested
      if (eventDetails.conferenceData) {
        event.conferenceData = eventDetails.conferenceData;
      }

      console.log('📅 Sending event to Google Calendar:', event);

      const response = await this.calendar.events.insert({
        calendarId: 'primary',
        requestBody: event,
        conferenceDataVersion: eventDetails.conferenceData ? 1 : 0,
        sendUpdates: 'all'
      });

      console.log('✅ Calendar event created successfully:', response.data.id);

      return {
        success: true,
        data: response.data,
        message: `Event "${event.summary}" created successfully`,
        htmlLink: response.data.htmlLink
      };
    } catch (error) {
      console.error('❌ Failed to create calendar event:', error);
      
      // Check if it's a permission error
      if (error.message?.includes('Insufficient Permission') || error.status === 403) {
        // Try to fix by running the emergency calendar fix
        console.log('🚨 Permission error detected - attempting to use fixed OAuth client...');
        
        if (global.fixedOAuthClient) {
          this.oauth2Client = global.fixedOAuthClient;
          this.calendar = google.calendar({ version: 'v3', auth: this.oauth2Client });
          
          // Retry the event creation
          try {
            const retryResponse = await this.calendar.events.insert({
              calendarId: 'primary',
              requestBody: eventDetails,
              conferenceDataVersion: eventDetails.conferenceData ? 1 : 0,
              sendUpdates: 'all'
            });
            
            console.log('✅ Event created on retry with fixed OAuth client');
            return {
              success: true,
              data: retryResponse.data,
              message: `Event created successfully (after auth fix)`,
              htmlLink: retryResponse.data.htmlLink
            };
          } catch (retryError) {
            console.error('❌ Retry also failed:', retryError.message);
          }
        }
        
        return {
          success: false,
          error: 'Calendar permission error. Please run: http://localhost:3001/api/calendar/fix-and-test',
          needsAuth: true
        };
      }
      
      return {
        success: false,
        error: error.message || 'Failed to create calendar event'
      };
    }
  }

  async updateEvent(eventId, updates) {
    try {
      await this.ensureAuth();
      
      // First get the existing event
      const existing = await this.calendar.events.get({
        calendarId: 'primary',
        eventId: eventId
      });

      // Merge updates with existing data
      const updatedEvent = {
        ...existing.data,
        ...updates
      };

      const response = await this.calendar.events.update({
        calendarId: 'primary',
        eventId: eventId,
        requestBody: updatedEvent
      });

      return {
        success: true,
        data: response.data,
        message: 'Event updated successfully'
      };
    } catch (error) {
      console.error('Failed to update event:', error);
      return {
        success: false,
        error: error.message
      };
    }
  }

  async deleteEvent(eventId) {
    try {
      await this.ensureAuth();
      
      await this.calendar.events.delete({
        calendarId: 'primary',
        eventId: eventId
      });

      return {
        success: true,
        message: 'Event deleted successfully'
      };
    } catch (error) {
      console.error('Failed to delete event:', error);
      return {
        success: false,
        error: error.message
      };
    }
  }

  async searchEvents(query, options = {}) {
    try {
      await this.ensureAuth();
      
      const params = {
        calendarId: 'primary',
        q: query,
        singleEvents: true,
        orderBy: 'startTime',
        maxResults: options.maxResults || 10
      };

      if (options.timeMin) {
        params.timeMin = options.timeMin;
      }
      if (options.timeMax) {
        params.timeMax = options.timeMax;
      }

      const response = await this.calendar.events.list(params);

      return {
        success: true,
        events: response.data.items || [],
        count: (response.data.items || []).length
      };
    } catch (error) {
      console.error('Failed to search events:', error);
      return {
        success: false,
        error: error.message,
        events: []
      };
    }
  }

  async getCalendarList() {
    try {
      await this.ensureAuth();
      
      const response = await this.calendar.calendarList.list({
        maxResults: 50
      });

      return {
        success: true,
        calendars: response.data.items || []
      };
    } catch (error) {
      console.error('Failed to get calendar list:', error);
      return {
        success: false,
        error: error.message,
        calendars: []
      };
    }
  }
}

module.exports = CalendarService;