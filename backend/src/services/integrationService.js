  async testCalendarConnection() {
    try {
      if (!process.env.GOOGLE_REFRESH_TOKEN) {
        return { 
          success: false, 
          error: 'OAuth setup required. Visit /auth/google',
          needsAuth: true
        };
      }

      // First refresh the access token
      const tokenResponse = await fetch('https://oauth2.googleapis.com/token', {
        method: 'POST',
        headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
        body: new URLSearchParams({
          client_id: process.env.GOOGLE_CLIENT_ID,
          client_secret: process.env.GOOGLE_CLIENT_SECRET,
          refresh_token: process.env.GOOGLE_REFRESH_TOKEN,
          grant_type: 'refresh_token'
        })
      });

      const tokens = await tokenResponse.json();
      
      if (tokens.error) {
        return {
          success: false,
          error: `Token refresh failed: ${tokens.error}`,
          needsAuth: true
        };
      }

      // Set the new access token
      this.googleAuth.setCredentials({
        refresh_token: process.env.GOOGLE_REFRESH_TOKEN,
        access_token: tokens.access_token
      });

      const calendar = google.calendar({ version: 'v3', auth: this.googleAuth });
      const response = await calendar.calendarList.list();
      
      return {
        success: true,
        message: `Connected: ${response.data.items.length} calendars`,
        calendars: response.data.items.length
      };
    } catch (error) {
      return {
        success: false,
        error: `Calendar failed: ${error.message}`,
        needsAuth: error.code === 401 || error.message.includes('invalid_grant')
      };
    }
  }