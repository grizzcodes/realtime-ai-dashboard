// backend/src/services/gmailService.js
const { google } = require('googleapis');

class GmailService {
  constructor() {
    this.gmail = null;
    this.auth = null;
    this.initialized = false;
  }

  async initialize() {
    try {
      if (!process.env.GOOGLE_CLIENT_ID || !process.env.GOOGLE_CLIENT_SECRET) {
        console.log('⚠️ Gmail not configured - missing Google credentials');
        return { success: false, error: 'Missing Google credentials' };
      }

      this.auth = new google.auth.OAuth2(
        process.env.GOOGLE_CLIENT_ID,
        process.env.GOOGLE_CLIENT_SECRET,
        'http://localhost:3001/auth/google/callback'
      );

      if (process.env.GOOGLE_REFRESH_TOKEN) {
        this.auth.setCredentials({
          refresh_token: process.env.GOOGLE_REFRESH_TOKEN
        });
      }

      this.gmail = google.gmail({ version: 'v1', auth: this.auth });
      this.initialized = true;

      console.log('✅ Gmail service initialized');
      return { success: true };
    } catch (error) {
      console.error('❌ Gmail initialization failed:', error.message);
      return { success: false, error: error.message };
    }
  }

  async testConnection() {
    if (!this.initialized) {
      await this.initialize();
    }

    if (!this.initialized) {
      return { success: false, error: 'Gmail not initialized' };
    }

    try {
      const response = await this.gmail.users.getProfile({ userId: 'me' });
      return { 
        success: true, 
        profile: response.data 
      };
    } catch (error) {
      console.error('Gmail connection test failed:', error.message);
      return { 
        success: false, 
        error: error.message 
      };
    }
  }

  async getRecentEmails(maxResults = 10) {
    if (!this.initialized) {
      await this.initialize();
    }

    try {
      console.log(`📧 Fetching ${maxResults} emails from Gmail...`);
      
      const response = await this.gmail.users.messages.list({
        userId: 'me',
        maxResults: maxResults,
        q: 'in:inbox' // Changed from 'is:unread' to get all inbox emails
      });

      const messages = response.data.messages || [];
      console.log(`📬 Found ${messages.length} messages, processing ${Math.min(messages.length, maxResults)}...`);
      
      // FIXED: Use maxResults instead of hardcoded 5
      const emailDetails = await Promise.all(
        messages.slice(0, maxResults).map(async (message) => {
          const details = await this.gmail.users.messages.get({
            userId: 'me',
            id: message.id
          });
          
          return {
            id: message.id,
            threadId: details.data.threadId,
            subject: this.getHeader(details.data.payload.headers, 'Subject'),
            from: this.getHeader(details.data.payload.headers, 'From'),
            date: this.getHeader(details.data.payload.headers, 'Date'),
            snippet: details.data.snippet,
            isUnread: details.data.labelIds?.includes('UNREAD') || false
          };
        })
      );

      console.log(`✅ Successfully fetched ${emailDetails.length} emails`);
      return { success: true, emails: emailDetails };
    } catch (error) {
      console.error('Failed to get recent emails:', error.message);
      return { success: false, error: error.message };
    }
  }

  async getEmailContent(messageId) {
    if (!this.initialized) {
      await this.initialize();
    }

    try {
      const response = await this.gmail.users.messages.get({
        userId: 'me',
        id: messageId,
        format: 'full'
      });

      const payload = response.data.payload;
      let body = '';

      if (payload.body?.data) {
        body = Buffer.from(payload.body.data, 'base64').toString();
      } else if (payload.parts) {
        const textPart = payload.parts.find(part => 
          part.mimeType === 'text/plain' || part.mimeType === 'text/html'
        );
        if (textPart?.body?.data) {
          body = Buffer.from(textPart.body.data, 'base64').toString();
        }
      }

      return {
        success: true,
        email: {
          id: messageId,
          subject: this.getHeader(payload.headers, 'Subject'),
          from: this.getHeader(payload.headers, 'From'),
          to: this.getHeader(payload.headers, 'To'),
          date: this.getHeader(payload.headers, 'Date'),
          body: body.substring(0, 2000) // Limit for AI processing
        }
      };
    } catch (error) {
      console.error('Failed to get email content:', error.message);
      return { success: false, error: error.message };
    }
  }

  // Archive email functionality
  async archiveEmail(messageId) {
    if (!this.initialized) {
      await this.initialize();
    }

    if (!this.initialized) {
      return { success: false, error: 'Gmail not initialized' };
    }

    try {
      // Remove the INBOX label and add the ARCHIVED label
      const response = await this.gmail.users.messages.modify({
        userId: 'me',
        id: messageId,
        requestBody: {
          removeLabelIds: ['INBOX'],
          addLabelIds: [] // Gmail automatically archives when removing INBOX
        }
      });

      console.log(`✅ Email ${messageId} archived successfully`);
      return { 
        success: true, 
        message: 'Email archived successfully',
        data: response.data 
      };
    } catch (error) {
      console.error('Failed to archive email:', error.message);
      return { 
        success: false, 
        error: error.message 
      };
    }
  }

  // Move email to trash (delete)
  async trashEmail(messageId) {
    if (!this.initialized) {
      await this.initialize();
    }

    if (!this.initialized) {
      return { success: false, error: 'Gmail not initialized' };
    }

    try {
      const response = await this.gmail.users.messages.trash({
        userId: 'me',
        id: messageId
      });

      console.log(`🗑️ Email ${messageId} moved to trash`);
      return { 
        success: true, 
        message: 'Email moved to trash',
        data: response.data 
      };
    } catch (error) {
      console.error('Failed to trash email:', error.message);
      return { 
        success: false, 
        error: error.message 
      };
    }
  }

  // Send email
  async sendEmail(params) {
    if (!this.initialized) {
      await this.initialize();
    }

    if (!this.initialized) {
      return { success: false, error: 'Gmail not initialized' };
    }

    try {
      const { to, subject, body, cc, bcc } = params;
      
      // Create email content
      const emailLines = [];
      emailLines.push(`To: ${to}`);
      if (cc) emailLines.push(`Cc: ${cc}`);
      if (bcc) emailLines.push(`Bcc: ${bcc}`);
      emailLines.push('Content-Type: text/html; charset=utf-8');
      emailLines.push('MIME-Version: 1.0');
      emailLines.push(`Subject: ${subject}`);
      emailLines.push('');
      emailLines.push(body);
      
      const email = emailLines.join('\r\n').trim();
      
      // Convert to base64
      const encodedEmail = Buffer.from(email).toString('base64').replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
      
      const response = await this.gmail.users.messages.send({
        userId: 'me',
        requestBody: {
          raw: encodedEmail
        }
      });

      console.log(`📤 Email sent successfully to ${to}`);
      return { 
        success: true, 
        message: `Email sent to ${to}`,
        messageId: response.data.id
      };
    } catch (error) {
      console.error('Failed to send email:', error.message);
      return { 
        success: false, 
        error: error.message 
      };
    }
  }

  // Mark email as read
  async markAsRead(messageId) {
    if (!this.initialized) {
      await this.initialize();
    }

    if (!this.initialized) {
      return { success: false, error: 'Gmail not initialized' };
    }

    try {
      const response = await this.gmail.users.messages.modify({
        userId: 'me',
        id: messageId,
        requestBody: {
          removeLabelIds: ['UNREAD']
        }
      });

      console.log(`✅ Email ${messageId} marked as read`);
      return { 
        success: true, 
        message: 'Email marked as read',
        data: response.data 
      };
    } catch (error) {
      console.error('Failed to mark email as read:', error.message);
      return { 
        success: false, 
        error: error.message 
      };
    }
  }

  // Star/Unstar email
  async toggleStar(messageId, star = true) {
    if (!this.initialized) {
      await this.initialize();
    }

    if (!this.initialized) {
      return { success: false, error: 'Gmail not initialized' };
    }

    try {
      const response = await this.gmail.users.messages.modify({
        userId: 'me',
        id: messageId,
        requestBody: star 
          ? { addLabelIds: ['STARRED'] }
          : { removeLabelIds: ['STARRED'] }
      });

      console.log(`✅ Email ${messageId} ${star ? 'starred' : 'unstarred'} successfully`);
      return { 
        success: true, 
        message: `Email ${star ? 'starred' : 'unstarred'} successfully`,
        data: response.data 
      };
    } catch (error) {
      console.error(`Failed to ${star ? 'star' : 'unstar'} email:`, error.message);
      return { 
        success: false, 
        error: error.message 
      };
    }
  }

  getHeader(headers, name) {
    const header = headers.find(h => h.name.toLowerCase() === name.toLowerCase());
    return header ? header.value : '';
  }

  // Setup Gmail push notifications (for real-time webhook events)
  async setupPushNotifications() {
    if (!this.initialized) {
      await this.initialize();
    }

    try {
      const response = await this.gmail.users.watch({
        userId: 'me',
        requestBody: {
          topicName: `projects/${process.env.GOOGLE_PROJECT_ID}/topics/gmail-webhook`,
          labelIds: ['INBOX']
        }
      });

      console.log('📧 Gmail push notifications enabled:', response.data);
      return { success: true, data: response.data };
    } catch (error) {
      console.error('Failed to setup Gmail push notifications:', error.message);
      return { success: false, error: error.message };
    }
  }
}

module.exports = GmailService;