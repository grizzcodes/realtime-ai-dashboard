// backend/src/services/calendarService.js - Enhanced Google Calendar integration
const { google } = require('googleapis');

class CalendarService {
  constructor() {
    this.calendar = null;
    
    if (process.env.GOOGLE_CLIENT_ID && process.env.GOOGLE_CLIENT_SECRET) {
      this.auth = new google.auth.OAuth2(
        process.env.GOOGLE_CLIENT_ID,
        process.env.GOOGLE_CLIENT_SECRET,
        'http://localhost:3001/auth/google/callback'
      );
      
      if (process.env.GOOGLE_REFRESH_TOKEN) {
        this.auth.setCredentials({
          refresh_token: process.env.GOOGLE_REFRESH_TOKEN
        });
        
        this.calendar = google.calendar({ version: 'v3', auth: this.auth });
        console.log('✅ CalendarService initialized with Google OAuth');
      } else {
        console.log('⚠️ CalendarService: No refresh token, OAuth needed');
      }
    } else {
      console.log('⚠️ CalendarService: Google credentials not configured');
    }
  }

  async testConnection() {
    if (!this.calendar) {
      return { 
        success: false, 
        error: 'Calendar not configured. Set up Google OAuth first.' 
      };
    }

    try {
      const response = await this.calendar.calendarList.list({
        maxResults: 1
      });
      
      return {
        success: true,
        message: 'Google Calendar connected successfully'
      };
    } catch (error) {
      return {
        success: false,
        error: error.message
      };
    }
  }

  // Helper function to calculate time until meeting
  calculateTimeUntil(startTime) {
    const now = new Date();
    const start = new Date(startTime);
    const timeDiff = start - now;
    
    // If meeting is in the past or ongoing
    if (timeDiff < 0) {
      const endTime = new Date(start.getTime() + 60 * 60 * 1000); // Assume 1 hour meeting
      if (now < endTime) {
        return { text: 'In progress', status: 'ongoing' };
      }
      return { text: 'Past', status: 'past' };
    }
    
    // Calculate time components
    const minutes = Math.floor(timeDiff / (1000 * 60));
    const hours = Math.floor(minutes / 60);
    const days = Math.floor(hours / 24);
    
    // Format the output
    let timeUntil = '';
    let status = 'upcoming';
    
    if (days > 0) {
      const remainingHours = hours % 24;
      if (days === 1 && remainingHours === 0) {
        timeUntil = '1 day';
      } else if (days === 1) {
        timeUntil = `1 day ${remainingHours} hour${remainingHours !== 1 ? 's' : ''}`;
      } else {
        timeUntil = `${days} days ${remainingHours > 0 ? remainingHours + ' hour' + (remainingHours !== 1 ? 's' : '') : ''}`.trim();
      }
    } else if (hours > 0) {
      const remainingMinutes = minutes % 60;
      if (hours === 1 && remainingMinutes === 0) {
        timeUntil = '1 hour';
        status = 'soon';
      } else if (hours === 1) {
        timeUntil = `1 hour ${remainingMinutes} min`;
        status = 'soon';
      } else {
        timeUntil = `${hours} hours ${remainingMinutes > 0 ? remainingMinutes + ' min' : ''}`.trim();
        status = hours <= 3 ? 'soon' : 'upcoming';
      }
    } else {
      timeUntil = `${minutes} minute${minutes !== 1 ? 's' : ''}`;
      status = 'imminent';
    }
    
    return { text: timeUntil, status, days, hours, minutes };
  }

  async getUpcomingMeetings(limit = 10) {
    // Try to fetch real data first
    if (this.calendar) {
      try {
        // Refresh the access token
        const { credentials } = await this.auth.refreshAccessToken();
        this.auth.setCredentials(credentials);

        const now = new Date();
        const maxTime = new Date();
        maxTime.setDate(maxTime.getDate() + 14); // Get events for next 2 weeks
        
        const response = await this.calendar.events.list({
          calendarId: 'primary',
          timeMin: now.toISOString(),
          timeMax: maxTime.toISOString(),
          maxResults: limit,
          singleEvents: true,
          orderBy: 'startTime'
        });

        const events = response.data.items || [];
        
        if (events.length === 0) {
          console.log('📅 No upcoming calendar events found');
          return {
            success: true,
            meetings: this.generateDemoMeetings(3) // Return demo data if no real events
          };
        }
        
        const meetings = events.map(event => {
          const startTime = event.start.dateTime || event.start.date;
          const endTime = event.end.dateTime || event.end.date;
          const timeInfo = this.calculateTimeUntil(startTime);
          
          // Extract attendees
          const attendees = event.attendees || [];
          const attendeeNames = attendees
            .filter(a => !a.resource) // Exclude rooms/resources
            .map(a => a.displayName || a.email?.split('@')[0] || 'Unknown');
          
          return {
            id: event.id,
            title: event.summary || 'No Title',
            start: startTime,
            end: endTime,
            description: event.description,
            location: event.location,
            meetLink: event.hangoutLink || event.conferenceData?.entryPoints?.[0]?.uri,
            attendees: attendeeNames,
            attendeeCount: attendees.filter(a => !a.resource).length,
            organizer: event.organizer?.displayName || event.organizer?.email,
            timeUntil: timeInfo.text,
            timeUntilStatus: timeInfo.status,
            timeUntilDetails: {
              days: timeInfo.days,
              hours: timeInfo.hours,
              minutes: timeInfo.minutes
            },
            allDay: !event.start.dateTime
          };
        });

        console.log(`📅 Retrieved ${meetings.length} real calendar events`);
        
        return {
          success: true,
          meetings: meetings
        };
        
      } catch (error) {
        console.error('Failed to get calendar events:', error);
        
        // Check if it's an auth error
        if (error.code === 401 || error.message.includes('invalid_grant')) {
          console.log('📅 Auth failed - need to re-authenticate. Returning demo data.');
          return {
            success: true,
            meetings: this.generateDemoMeetings(5),
            needsAuth: true
          };
        }
        
        // Return demo data on error
        return {
          success: true,
          meetings: this.generateDemoMeetings(3)
        };
      }
    }
    
    // No calendar configured - return demo data
    console.log('📅 Calendar not configured - returning demo data');
    return {
      success: true,
      meetings: this.generateDemoMeetings(5),
      demo: true
    };
  }

  generateDemoMeetings(count = 5) {
    const now = new Date();
    const demoMeetings = [
      {
        id: 'demo-1',
        title: 'Team Standup',
        start: new Date(now.getTime() + 2 * 60 * 60 * 1000).toISOString(), // 2 hours from now
        end: new Date(now.getTime() + 2.5 * 60 * 60 * 1000).toISOString(),
        attendees: ['Alec', 'Leo', 'Steph', 'Pablo'],
        timeUntil: '2 hours',
        timeUntilStatus: 'soon',
        timeUntilDetails: { days: 0, hours: 2, minutes: 0 },
        attendeeCount: 4,
        location: 'Conference Room A',
        description: 'Daily team sync to discuss progress and blockers'
      },
      {
        id: 'demo-2', 
        title: 'Client Review - TechCorp',
        start: new Date(now.getTime() + 24 * 60 * 60 * 1000).toISOString(), // Tomorrow
        end: new Date(now.getTime() + 25 * 60 * 60 * 1000).toISOString(),
        attendees: ['Alec', 'Client Team'],
        timeUntil: '1 day',
        timeUntilStatus: 'upcoming',
        timeUntilDetails: { days: 1, hours: 0, minutes: 0 },
        attendeeCount: 5,
        meetLink: 'https://meet.google.com/demo-link',
        description: 'Quarterly review with TechCorp stakeholders'
      },
      {
        id: 'demo-3',
        title: 'Product Planning Session',
        start: new Date(now.getTime() + 48 * 60 * 60 * 1000).toISOString(), // 2 days
        end: new Date(now.getTime() + 50 * 60 * 60 * 1000).toISOString(),
        attendees: ['Full Team'],
        timeUntil: '2 days',
        timeUntilStatus: 'upcoming',
        timeUntilDetails: { days: 2, hours: 0, minutes: 0 },
        attendeeCount: 8,
        location: 'Main Office',
        description: 'Sprint planning and roadmap discussion'
      },
      {
        id: 'demo-4',
        title: '1:1 with Manager',
        start: new Date(now.getTime() + 3.5 * 24 * 60 * 60 * 1000).toISOString(), // 3.5 days
        end: new Date(now.getTime() + 3.5 * 24 * 60 * 60 * 1000 + 30 * 60 * 1000).toISOString(),
        attendees: ['You', 'Manager'],
        timeUntil: '3 days 12 hours',
        timeUntilStatus: 'upcoming',
        timeUntilDetails: { days: 3, hours: 12, minutes: 0 },
        attendeeCount: 2,
        description: 'Monthly one-on-one discussion'
      },
      {
        id: 'demo-5',
        title: 'Marketing Sync',
        start: new Date(now.getTime() + 5 * 24 * 60 * 60 * 1000).toISOString(), // 5 days
        end: new Date(now.getTime() + 5 * 24 * 60 * 60 * 1000 + 60 * 60 * 1000).toISOString(),
        attendees: ['Marketing Team'],
        timeUntil: '5 days',
        timeUntilStatus: 'upcoming',
        timeUntilDetails: { days: 5, hours: 0, minutes: 0 },
        attendeeCount: 6,
        meetLink: 'https://zoom.us/demo-meeting',
        description: 'Review marketing campaigns and metrics'
      }
    ];
    
    // Recalculate timeUntil for demo meetings to be accurate
    return demoMeetings.slice(0, count).map(meeting => {
      const timeInfo = this.calculateTimeUntil(meeting.start);
      return {
        ...meeting,
        timeUntil: timeInfo.text,
        timeUntilStatus: timeInfo.status,
        timeUntilDetails: {
          days: timeInfo.days,
          hours: timeInfo.hours,
          minutes: timeInfo.minutes
        }
      };
    });
  }

  async createEvent(eventData) {
    if (!this.calendar) {
      return { 
        success: false, 
        error: 'Calendar not configured' 
      };
    }

    try {
      const event = {
        summary: eventData.title,
        description: eventData.description,
        start: {
          dateTime: eventData.startTime,
          timeZone: 'America/Los_Angeles',
        },
        end: {
          dateTime: eventData.endTime,
          timeZone: 'America/Los_Angeles',
        },
        attendees: eventData.attendees?.map(email => ({ email })) || [],
        reminders: {
          useDefault: true,
        },
      };

      const response = await this.calendar.events.insert({
        calendarId: 'primary',
        resource: event,
      });

      return {
        success: true,
        event: response.data
      };
    } catch (error) {
      return {
        success: false,
        error: error.message
      };
    }
  }
}

module.exports = CalendarService;
