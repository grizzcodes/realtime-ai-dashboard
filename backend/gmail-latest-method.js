  async getLatestEmails(limit = 5) {
    try {
      if (!process.env.GOOGLE_REFRESH_TOKEN) {
        return {
          success: false,
          error: 'Google Gmail not configured. Set up OAuth first.',
          emails: []
        };
      }

      // Refresh access token
      const { credentials } = await this.googleAuth.refreshAccessToken();
      this.googleAuth.setCredentials(credentials);

      const gmail = google.gmail({ version: 'v1', auth: this.googleAuth });
      
      // Get latest emails
      const response = await gmail.users.messages.list({
        userId: 'me',
        maxResults: limit,
        q: 'in:inbox'
      });

      const messages = response.data.messages || [];
      
      // Get email details for each message
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
            
            return {
              id: message.id,
              subject: getHeader('Subject') || 'No Subject',
              from: getHeader('From') || 'Unknown Sender',
              date: getHeader('Date'),
              snippet: details.data.snippet || '',
              isUnread: details.data.labelIds?.includes('UNREAD') || false
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