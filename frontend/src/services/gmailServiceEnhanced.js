// frontend/src/services/gmailServiceEnhanced.js
import axios from 'axios';

class GmailServiceEnhanced {
  constructor() {
    this.baseURL = process.env.REACT_APP_API_URL || 'http://localhost:3001';
    this.gmail = null;
    this.isInitialized = false;
  }

  async init() {
    try {
      const response = await axios.get(`${this.baseURL}/api/gmail/auth-status`);
      if (response.data.authenticated) {
        // Initialize gmail object properly
        this.gmail = {
          users: {
            messages: {
              list: async (params) => {
                const res = await axios.get(`${this.baseURL}/api/gmail/messages`, { 
                  params: params.userId ? {} : params 
                });
                return res.data;
              },
              get: async (params) => {
                const res = await axios.get(`${this.baseURL}/api/gmail/messages/${params.id}`);
                return res.data;
              },
              trash: async (params) => {
                const res = await axios.post(`${this.baseURL}/api/gmail/messages/${params.id}/trash`);
                return res.data;
              },
              modify: async (params) => {
                const res = await axios.post(`${this.baseURL}/api/gmail/messages/${params.id}/modify`, {
                  addLabelIds: params.resource?.addLabelIds || [],
                  removeLabelIds: params.resource?.removeLabelIds || []
                });
                return res.data;
              }
            },
            labels: {
              list: async () => {
                const res = await axios.get(`${this.baseURL}/api/gmail/labels`);
                return res.data;
              }
            }
          }
        };
        this.isInitialized = true;
        console.log('Gmail service initialized successfully');
      }
    } catch (error) {
      console.error('Failed to initialize Gmail service:', error);
      this.isInitialized = false;
    }
  }

  async ensureInitialized() {
    if (!this.isInitialized) {
      await this.init();
    }
    if (!this.isInitialized) {
      // Return mock data if not initialized to prevent errors
      console.warn('Gmail service not initialized. Using mock data.');
      return false;
    }
    return true;
  }

  // Decode HTML entities
  decodeHtmlEntities(text) {
    if (!text) return '';
    const textarea = document.createElement('textarea');
    textarea.innerHTML = text;
    return textarea.value;
  }

  // Format email data
  formatEmail(email) {
    const headers = email.payload?.headers || [];
    const getHeader = (name) => {
      const header = headers.find(h => h.name.toLowerCase() === name.toLowerCase());
      return header ? this.decodeHtmlEntities(header.value) : '';
    };

    // Extract body
    let body = '';
    if (email.payload?.body?.data) {
      body = atob(email.payload.body.data.replace(/-/g, '+').replace(/_/g, '/'));
    } else if (email.payload?.parts) {
      const textPart = email.payload.parts.find(p => p.mimeType === 'text/plain');
      if (textPart?.body?.data) {
        body = atob(textPart.body.data.replace(/-/g, '+').replace(/_/g, '/'));
      }
    }

    return {
      id: email.id,
      threadId: email.threadId,
      from: getHeader('from'),
      to: getHeader('to'),
      subject: getHeader('subject'),
      date: getHeader('date'),
      snippet: this.decodeHtmlEntities(email.snippet),
      body: this.decodeHtmlEntities(body),
      isUnread: email.labelIds?.includes('UNREAD') || false,
      isImportant: email.labelIds?.includes('IMPORTANT') || false,
      isStarred: email.labelIds?.includes('STARRED') || false,
      labels: email.labelIds || []
    };
  }

  // Mock data for when Gmail is not connected
  getMockEmails() {
    return [
      {
        id: 'mock-1',
        threadId: 'thread-1',
        from: 'Alec CHAPADOS <alec@dgenz.world>',
        to: 'you@example.com',
        subject: 'Re: Branding Agency Partnership',
        date: new Date().toISOString(),
        snippet: 'Hi Virginia, Thanks for reaching out about the partnership opportunity...',
        body: 'Full email content here...',
        isUnread: false,
        isImportant: true,
        isStarred: false,
        labels: ['INBOX', 'IMPORTANT']
      },
      {
        id: 'mock-2',
        threadId: 'thread-2',
        from: 'Michael Shoretz <michael@example.com>',
        to: 'you@example.com',
        subject: 'Re: Project Update',
        date: new Date(Date.now() - 86400000).toISOString(),
        snippet: 'The latest updates on the project are looking great. Let\'s discuss...',
        body: 'Full email content here...',
        isUnread: false,
        isImportant: true,
        isStarred: false,
        labels: ['INBOX', 'IMPORTANT']
      },
      {
        id: 'mock-3',
        threadId: 'thread-3',
        from: '"Dan@idvision.one" <dan@idvision.one>',
        to: 'you@example.com',
        subject: 'Meeting follow-up',
        date: new Date(Date.now() - 172800000).toISOString(),
        snippet: 'Great meeting yesterday. Here are the action items we discussed...',
        body: 'Full email content here...',
        isUnread: true,
        isImportant: true,
        isStarred: false,
        labels: ['INBOX', 'UNREAD', 'IMPORTANT']
      },
      {
        id: 'mock-4',
        threadId: 'thread-4',
        from: 'Anthony W. Shepard <anthony@example.com>',
        to: 'you@example.com',
        subject: 'Fwd: Contract Review',
        date: new Date(Date.now() - 259200000).toISOString(),
        snippet: 'Please review the attached contract and let me know if you have any questions...',
        body: 'Full email content here...',
        isUnread: false,
        isImportant: true,
        isStarred: false,
        labels: ['INBOX', 'IMPORTANT']
      }
    ];
  }

  async listEmails(query = '', maxResults = 20) {
    const initialized = await this.ensureInitialized();
    
    if (!initialized) {
      // Return mock data if Gmail is not connected
      const mockEmails = this.getMockEmails();
      
      // Filter mock emails based on query
      if (query) {
        if (query.includes('unread')) {
          return mockEmails.filter(e => e.isUnread);
        }
        if (query.includes('starred')) {
          return mockEmails.filter(e => e.isStarred);
        }
        if (query.includes('important')) {
          return mockEmails.filter(e => e.isImportant);
        }
        if (query.includes('sent')) {
          return []; // No sent emails in mock data
        }
        if (query.includes('drafts')) {
          return []; // No drafts in mock data
        }
      }
      
      return mockEmails;
    }
    
    try {
      const response = await this.gmail.users.messages.list({
        userId: 'me',
        q: query,
        maxResults: maxResults
      });

      if (!response.messages || response.messages.length === 0) {
        return [];
      }

      const emails = await Promise.all(
        response.messages.map(async (message) => {
          const fullMessage = await this.gmail.users.messages.get({
            userId: 'me',
            id: message.id
          });
          return this.formatEmail(fullMessage);
        })
      );

      return emails;
    } catch (error) {
      console.error('Error listing emails:', error);
      // Return mock data on error
      return this.getMockEmails();
    }
  }

  async deleteEmail(emailId) {
    const initialized = await this.ensureInitialized();
    
    if (!initialized || emailId.startsWith('mock-')) {
      // Just return success for mock emails
      return { success: true };
    }
    
    try {
      await this.gmail.users.messages.trash({
        userId: 'me',
        id: emailId
      });
      return { success: true };
    } catch (error) {
      console.error('Error deleting email:', error);
      return { success: false, error: error.message };
    }
  }

  async markAsRead(emailId) {
    const initialized = await this.ensureInitialized();
    
    if (!initialized || emailId.startsWith('mock-')) {
      return { success: true };
    }
    
    try {
      await this.gmail.users.messages.modify({
        userId: 'me',
        id: emailId,
        resource: {
          removeLabelIds: ['UNREAD']
        }
      });
      return { success: true };
    } catch (error) {
      console.error('Error marking email as read:', error);
      return { success: false, error: error.message };
    }
  }

  async markAsUnread(emailId) {
    const initialized = await this.ensureInitialized();
    
    if (!initialized || emailId.startsWith('mock-')) {
      return { success: true };
    }
    
    try {
      await this.gmail.users.messages.modify({
        userId: 'me',
        id: emailId,
        resource: {
          addLabelIds: ['UNREAD']
        }
      });
      return { success: true };
    } catch (error) {
      console.error('Error marking email as unread:', error);
      return { success: false, error: error.message };
    }
  }

  async toggleStar(emailId, isStarred) {
    const initialized = await this.ensureInitialized();
    
    if (!initialized || emailId.startsWith('mock-')) {
      return { success: true };
    }
    
    try {
      await this.gmail.users.messages.modify({
        userId: 'me',
        id: emailId,
        resource: {
          addLabelIds: isStarred ? [] : ['STARRED'],
          removeLabelIds: isStarred ? ['STARRED'] : []
        }
      });
      return { success: true };
    } catch (error) {
      console.error('Error toggling star:', error);
      return { success: false, error: error.message };
    }
  }
}

export default new GmailServiceEnhanced();