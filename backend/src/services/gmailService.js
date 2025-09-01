// backend/src/services/gmailService.js
const { google } = require('googleapis');
const { getAuthManager } = require('./googleAuthManager');

class GmailService {
  constructor(supabaseService) {
    this.authManager = getAuthManager();
    this.gmail = null;
    this.supabaseService = supabaseService;
    this.clientMappings = new Map();
    this.lastMappingRefresh = null;
    this.initializeGmail();
  }

  async initializeGmail() {
    try {
      const auth = await this.authManager.getAuthClient();
      this.gmail = google.gmail({ version: 'v1', auth });
      console.log('📧 GmailService initialized with GoogleAuthManager');
    } catch (error) {
      console.error('Failed to initialize Gmail:', error.message);
    }
  }

  async ensureAuth() {
    try {
      const auth = await this.authManager.getAuthClient();
      this.gmail = google.gmail({ version: 'v1', auth });
      return true;
    } catch (error) {
      console.error('❌ Gmail auth failed:', error.message);
      return false;
    }
  }

  async testConnection() {
    try {
      await this.ensureAuth();
      const response = await this.gmail.users.getProfile({
        userId: 'me'
      });
      
      return {
        success: true,
        message: `Connected to Gmail: ${response.data.emailAddress}`,
        messagesTotal: response.data.messagesTotal,
        threadsTotal: response.data.threadsTotal
      };
    } catch (error) {
      console.error('Gmail connection test failed:', error.message);
      return {
        success: false,
        error: error.message || 'Failed to connect to Gmail'
      };
    }
  }

  async getRecentEmails(limit = 50) {
    try {
      await this.ensureAuth();
      
      const response = await this.gmail.users.messages.list({
        userId: 'me',
        maxResults: limit,
        q: 'is:unread OR newer_than:2d'
      });

      if (!response.data.messages || response.data.messages.length === 0) {
        return {
          success: true,
          emails: [],
          count: 0,
          stats: { total: 0, unread: 0, fromKnownContacts: 0 }
        };
      }

      const emails = [];
      for (const message of response.data.messages) {
        try {
          const fullMessage = await this.gmail.users.messages.get({
            userId: 'me',
            id: message.id
          });

          const headers = fullMessage.data.payload.headers;
          const fromHeader = headers.find(h => h.name === 'From');
          const subjectHeader = headers.find(h => h.name === 'Subject');
          const dateHeader = headers.find(h => h.name === 'Date');

          const emailData = {
            id: message.id,
            threadId: message.threadId,
            from: fromHeader?.value || 'Unknown',
            subject: subjectHeader?.value || 'No subject',
            snippet: fullMessage.data.snippet,
            date: dateHeader?.value || new Date().toISOString(),
            isUnread: fullMessage.data.labelIds?.includes('UNREAD') || false
          };

          emails.push(emailData);
        } catch (msgError) {
          console.error(`Failed to fetch message ${message.id}:`, msgError.message);
        }
      }

      return {
        success: true,
        emails,
        count: emails.length,
        stats: {
          total: emails.length,
          unread: emails.filter(e => e.isUnread).length,
          fromKnownContacts: 0
        }
      };
    } catch (error) {
      console.error('Failed to get recent emails:', error.message);
      
      // Try to refresh auth and retry once
      if (error.message?.includes('invalid_grant') || error.message?.includes('Token')) {
        console.log('🔄 Attempting to refresh Gmail auth and retry...');
        const authSuccess = await this.ensureAuth();
        
        if (authSuccess) {
          try {
            // Retry the request
            const response = await this.gmail.users.messages.list({
              userId: 'me',
              maxResults: limit,
              q: 'is:unread OR newer_than:2d'
            });

            if (!response.data.messages || response.data.messages.length === 0) {
              return {
                success: true,
                emails: [],
                count: 0,
                stats: { total: 0, unread: 0, fromKnownContacts: 0 }
              };
            }

            const emails = [];
            for (const message of response.data.messages) {
              try {
                const fullMessage = await this.gmail.users.messages.get({
                  userId: 'me',
                  id: message.id
                });

                const headers = fullMessage.data.payload.headers;
                const fromHeader = headers.find(h => h.name === 'From');
                const subjectHeader = headers.find(h => h.name === 'Subject');
                const dateHeader = headers.find(h => h.name === 'Date');

                const emailData = {
                  id: message.id,
                  threadId: message.threadId,
                  from: fromHeader?.value || 'Unknown',
                  subject: subjectHeader?.value || 'No subject',
                  snippet: fullMessage.data.snippet,
                  date: dateHeader?.value || new Date().toISOString(),
                  isUnread: fullMessage.data.labelIds?.includes('UNREAD') || false
                };

                emails.push(emailData);
              } catch (msgError) {
                console.error(`Failed to fetch message ${message.id}:`, msgError.message);
              }
            }

            return {
              success: true,
              emails,
              count: emails.length,
              stats: {
                total: emails.length,
                unread: emails.filter(e => e.isUnread).length,
                fromKnownContacts: 0
              }
            };
          } catch (retryError) {
            console.error('Gmail retry also failed:', retryError.message);
          }
        }
      }
      
      return {
        success: false,
        error: error.message,
        emails: []
      };
    }
  }

  async searchEmails(query, options = {}) {
    try {
      await this.ensureAuth();
      
      const searchParams = {
        userId: 'me',
        maxResults: options.limit || 50,
        q: query
      };

      const response = await this.gmail.users.messages.list(searchParams);
      
      if (!response.data.messages) {
        return {
          success: true,
          emails: [],
          count: 0
        };
      }

      return {
        success: true,
        emails: response.data.messages,
        count: response.data.messages.length
      };
    } catch (error) {
      console.error('Failed to search emails:', error);
      return {
        success: false,
        error: error.message,
        emails: []
      };
    }
  }

  async getEmailThread(threadId) {
    try {
      await this.ensureAuth();
      
      const response = await this.gmail.users.threads.get({
        userId: 'me',
        id: threadId
      });

      const messages = response.data.messages || [];
      const processedMessages = [];

      for (const message of messages) {
        const headers = message.payload.headers;
        const fromHeader = headers.find(h => h.name === 'From');
        const toHeader = headers.find(h => h.name === 'To');
        const subjectHeader = headers.find(h => h.name === 'Subject');
        const dateHeader = headers.find(h => h.name === 'Date');

        processedMessages.push({
          id: message.id,
          threadId: threadId,
          from: fromHeader?.value || 'Unknown',
          to: toHeader?.value || '',
          subject: subjectHeader?.value || 'No subject',
          date: dateHeader?.value || new Date().toISOString(),
          snippet: message.snippet,
          body: this.extractBody(message.payload),
          isUnread: message.labelIds?.includes('UNREAD') || false
        });
      }

      return {
        success: true,
        threadId,
        messages: processedMessages,
        messageCount: processedMessages.length
      };
    } catch (error) {
      console.error('Failed to get email thread:', error);
      return {
        success: false,
        error: error.message,
        threadId,
        messages: [],
        messageCount: 0
      };
    }
  }

  extractBody(payload) {
    let body = '';
    
    if (payload.parts) {
      for (const part of payload.parts) {
        if (part.mimeType === 'text/plain' && part.body.data) {
          body += Buffer.from(part.body.data, 'base64').toString('utf-8');
        } else if (part.parts) {
          body += this.extractBody(part);
        }
      }
    } else if (payload.body && payload.body.data) {
      body = Buffer.from(payload.body.data, 'base64').toString('utf-8');
    }
    
    return body;
  }

  async sendEmail(to, subject, body, options = {}) {
    try {
      await this.ensureAuth();
      
      const message = [
        `To: ${to}`,
        `Subject: ${subject}`,
        '',
        body
      ].join('\n');

      const encodedMessage = Buffer.from(message).toString('base64')
        .replace(/\+/g, '-')
        .replace(/\//g, '_')
        .replace(/=+$/, '');

      const response = await this.gmail.users.messages.send({
        userId: 'me',
        requestBody: {
          raw: encodedMessage
        }
      });

      return {
        success: true,
        messageId: response.data.id,
        message: 'Email sent successfully'
      };
    } catch (error) {
      console.error('Failed to send email:', error);
      return {
        success: false,
        error: error.message
      };
    }
  }

  async archiveEmail(emailId) {
    try {
      await this.ensureAuth();
      
      await this.gmail.users.messages.modify({
        userId: 'me',
        id: emailId,
        requestBody: {
          removeLabelIds: ['INBOX'],
          addLabelIds: []
        }
      });

      return {
        success: true,
        message: 'Email archived successfully'
      };
    } catch (error) {
      console.error('Failed to archive email:', error);
      return {
        success: false,
        error: error.message
      };
    }
  }

  async markAsRead(emailId) {
    try {
      await this.ensureAuth();
      
      await this.gmail.users.messages.modify({
        userId: 'me',
        id: emailId,
        requestBody: {
          removeLabelIds: ['UNREAD']
        }
      });

      return {
        success: true,
        message: 'Email marked as read'
      };
    } catch (error) {
      console.error('Failed to mark email as read:', error);
      return {
        success: false,
        error: error.message
      };
    }
  }

  async toggleStar(emailId, star = true) {
    try {
      await this.ensureAuth();
      
      await this.gmail.users.messages.modify({
        userId: 'me',
        id: emailId,
        requestBody: {
          addLabelIds: star ? ['STARRED'] : [],
          removeLabelIds: star ? [] : ['STARRED']
        }
      });

      return {
        success: true,
        message: `Email ${star ? 'starred' : 'unstarred'} successfully`
      };
    } catch (error) {
      console.error(`Failed to ${star ? 'star' : 'unstar'} email:`, error);
      return {
        success: false,
        error: error.message
      };
    }
  }

  async getEmailStats() {
    try {
      await this.ensureAuth();
      
      const profile = await this.gmail.users.getProfile({
        userId: 'me'
      });

      const unreadResponse = await this.gmail.users.messages.list({
        userId: 'me',
        q: 'is:unread',
        maxResults: 100
      });

      return {
        success: true,
        total: profile.data.messagesTotal,
        threads: profile.data.threadsTotal,
        unread: unreadResponse.data.resultSizeEstimate || 0
      };
    } catch (error) {
      console.error('Failed to get email stats:', error);
      return {
        success: false,
        error: error.message
      };
    }
  }

  // Initialize method for compatibility
  async initialize() {
    await this.initializeGmail();
  }
  
  // Refresh client mappings if needed
  async refreshClientMappings() {
    // This can be implemented if needed for SUPA integration
    console.log('Client mappings refresh requested');
  }
}

module.exports = GmailService;