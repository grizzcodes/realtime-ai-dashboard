  async archiveEmail(emailId) {
    try {
      if (!process.env.GOOGLE_REFRESH_TOKEN) {
        return {
          success: false,
          error: 'Google Gmail not configured. Set up OAuth first.'
        };
      }

      // Refresh access token
      const { credentials } = await this.googleAuth.refreshAccessToken();
      this.googleAuth.setCredentials(credentials);

      const gmail = google.gmail({ version: 'v1', auth: this.googleAuth });
      
      // Archive email by removing INBOX label
      const response = await gmail.users.messages.modify({
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