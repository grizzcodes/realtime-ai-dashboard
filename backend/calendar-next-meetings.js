  async getNextMeetings(limit = 5) {
    try {
      if (!process.env.GOOGLE_REFRESH_TOKEN) {
        return {
          success: false,
          error: 'Google Calendar not configured. Set up OAuth first.',
          meetings: []
        };
      }

      // Refresh access token
      const { credentials } = await this.googleAuth.refreshAccessToken();
      this.googleAuth.setCredentials(credentials);

      const calendar = google.calendar({ version: 'v3', auth: this.googleAuth });
      
      const now = new Date();
      const endOfDay = new Date();
      endOfDay.setDate(now.getDate() + 7); // Next 7 days
      
      const response = await calendar.events.list({
        calendarId: 'primary',
        timeMin: now.toISOString(),
        timeMax: endOfDay.toISOString(),
        maxResults: limit,
        singleEvents: true,
        orderBy: 'startTime'
      });

      const meetings = response.data.items?.map(event => ({
        id: event.id,
        title: event.summary || 'No Title',
        start: event.start?.dateTime || event.start?.date,
        end: event.end?.dateTime || event.end?.date,
        attendees: event.attendees?.map(att => ({
          email: att.email,
          name: att.displayName || att.email,
          responseStatus: att.responseStatus
        })) || [],
        location: event.location,
        description: event.description,
        meetLink: event.hangoutLink,
        creator: event.creator,
        allDay: !event.start?.dateTime
      })) || [];

      return {
        success: true,
        meetings,
        count: meetings.length
      };
      
    } catch (error) {
      console.error('❌ Failed to get next meetings:', error);
      return {
        success: false,
        error: error.message,
        meetings: []
      };
    }
  }