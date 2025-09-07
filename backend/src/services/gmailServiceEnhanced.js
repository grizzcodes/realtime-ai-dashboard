// backend/src/services/gmailServiceEnhanced.js
// Enhanced Gmail Service with delete, thread, and reply features

class GmailServiceEnhanced {
  constructor(gmailService) {
    this.gmailService = gmailService;
    // Properly access the gmail object from the service
    this.gmail = gmailService?.gmail || gmailService?.getGmail?.();
    this.auth = gmailService?.auth || gmailService?.getAuth?.();
  }

  async ensureAuth() {
    if (this.gmailService?.ensureAuth) {
      await this.gmailService.ensureAuth();
      // Re-get the gmail object after auth
      this.gmail = this.gmailService.gmail || this.gmailService.getGmail?.();
      this.auth = this.gmailService.auth || this.gmailService.getAuth?.();
    }
  }

  // Trash/delete email
  async trashEmail(emailId) {
    try {
      await this.ensureAuth();
      
      if (!this.gmail) {
        console.error('Gmail service not initialized');
        return {
          success: false,
          error: 'Gmail service not properly initialized'
        };
      }
      
      await this.gmail.users.messages.trash({
        userId: 'me',
        id: emailId
      });

      return {
        success: true,
        message: 'Email moved to trash successfully',
        emailId
      };
    } catch (error) {
      console.error('Failed to trash email:', error);
      return {
        success: false,
        error: error.message
      };
    }
  }

  // Permanently delete email
  async deleteEmail(emailId) {
    try {
      await this.ensureAuth();
      
      if (!this.gmail) {
        return {
          success: false,
          error: 'Gmail service not properly initialized'
        };
      }
      
      await this.gmail.users.messages.delete({
        userId: 'me',
        id: emailId
      });

      return {
        success: true,
        message: 'Email permanently deleted',
        emailId
      };
    } catch (error) {
      console.error('Failed to delete email:', error);
      return {
        success: false,
        error: error.message
      };
    }
  }

  // Send reply with thread support
  async sendReply({ to, subject, body, threadId, inReplyTo, references }) {
    try {
      await this.ensureAuth();
      
      if (!this.gmail) {
        return {
          success: false,
          error: 'Gmail service not properly initialized'
        };
      }
      
      // Build email headers for threading
      const headers = [
        `To: ${to}`,
        `Subject: ${subject}`,
        `In-Reply-To: ${inReplyTo || ''}`,
        `References: ${references || ''}`
      ].filter(h => h && !h.endsWith(': '));

      const message = [
        ...headers,
        '',
        body
      ].join('\n');

      const encodedMessage = Buffer.from(message).toString('base64')
        .replace(/\+/g, '-')
        .replace(/\//g, '_')
        .replace(/=+$/, '');

      const requestBody = {
        raw: encodedMessage
      };

      // Add thread ID if available
      if (threadId) {
        requestBody.threadId = threadId;
      }

      const response = await this.gmail.users.messages.send({
        userId: 'me',
        requestBody
      });

      return {
        success: true,
        messageId: response.data.id,
        threadId: response.data.threadId,
        message: 'Reply sent successfully'
      };
    } catch (error) {
      console.error('Failed to send reply:', error);
      return {
        success: false,
        error: error.message
      };
    }
  }

  // Get full email with body
  async getFullEmail(emailId) {
    try {
      await this.ensureAuth();
      
      if (!this.gmail) {
        console.error('Gmail service not initialized for getFullEmail');
        return {
          success: false,
          error: 'Gmail service not properly initialized'
        };
      }
      
      const response = await this.gmail.users.messages.get({
        userId: 'me',
        id: emailId,
        format: 'full'
      });

      const email = response.data;
      const headers = email.payload.headers;
      
      // Extract headers
      const getHeader = (name) => headers.find(h => h.name === name)?.value || '';
      
      // Extract body
      const body = this.extractBody(email.payload);
      
      return {
        success: true,
        email: {
          id: email.id,
          threadId: email.threadId,
          from: getHeader('From'),
          to: getHeader('To'),
          subject: getHeader('Subject'),
          date: getHeader('Date'),
          messageId: getHeader('Message-ID'),
          inReplyTo: getHeader('In-Reply-To'),
          references: getHeader('References'),
          body: body.text || body.html || '',
          html: body.html,
          snippet: email.snippet,
          labels: email.labelIds || [],
          isUnread: (email.labelIds || []).includes('UNREAD'),
          isStarred: (email.labelIds || []).includes('STARRED'),
          attachments: this.extractAttachments(email.payload)
        }
      };
    } catch (error) {
      console.error('Failed to get full email:', error);
      return {
        success: false,
        error: error.message
      };
    }
  }

  // Extract email body from payload
  extractBody(payload) {
    let textBody = '';
    let htmlBody = '';

    const extractFromParts = (parts) => {
      if (!parts) return;
      
      for (const part of parts) {
        if (part.mimeType === 'text/plain' && part.body.data) {
          textBody = Buffer.from(part.body.data, 'base64').toString('utf-8');
        } else if (part.mimeType === 'text/html' && part.body.data) {
          htmlBody = Buffer.from(part.body.data, 'base64').toString('utf-8');
        } else if (part.parts) {
          extractFromParts(part.parts);
        }
      }
    };

    if (payload.parts) {
      extractFromParts(payload.parts);
    } else if (payload.body?.data) {
      const body = Buffer.from(payload.body.data, 'base64').toString('utf-8');
      if (payload.mimeType === 'text/html') {
        htmlBody = body;
      } else {
        textBody = body;
      }
    }

    return { text: textBody, html: htmlBody };
  }

  // Extract attachments
  extractAttachments(payload) {
    const attachments = [];
    
    const extractFromParts = (parts) => {
      if (!parts) return;
      
      for (const part of parts) {
        if (part.filename && part.body.attachmentId) {
          attachments.push({
            filename: part.filename,
            mimeType: part.mimeType,
            size: part.body.size,
            attachmentId: part.body.attachmentId
          });
        }
        if (part.parts) {
          extractFromParts(part.parts);
        }
      }
    };

    if (payload.parts) {
      extractFromParts(payload.parts);
    }

    return attachments;
  }

  // Get labels
  async getLabels() {
    try {
      await this.ensureAuth();
      
      if (!this.gmail) {
        return {
          success: false,
          error: 'Gmail service not properly initialized',
          labels: []
        };
      }
      
      const response = await this.gmail.users.labels.list({
        userId: 'me'
      });

      return {
        success: true,
        labels: response.data.labels || []
      };
    } catch (error) {
      console.error('Failed to get labels:', error);
      return {
        success: false,
        error: error.message,
        labels: []
      };
    }
  }

  // Apply label to email
  async applyLabel(emailId, labelId) {
    try {
      await this.ensureAuth();
      
      if (!this.gmail) {
        return {
          success: false,
          error: 'Gmail service not properly initialized'
        };
      }
      
      await this.gmail.users.messages.modify({
        userId: 'me',
        id: emailId,
        requestBody: {
          addLabelIds: [labelId]
        }
      });

      return {
        success: true,
        message: 'Label applied successfully'
      };
    } catch (error) {
      console.error('Failed to apply label:', error);
      return {
        success: false,
        error: error.message
      };
    }
  }

  // Remove label from email
  async removeLabel(emailId, labelId) {
    try {
      await this.ensureAuth();
      
      if (!this.gmail) {
        return {
          success: false,
          error: 'Gmail service not properly initialized'
        };
      }
      
      await this.gmail.users.messages.modify({
        userId: 'me',
        id: emailId,
        requestBody: {
          removeLabelIds: [labelId]
        }
      });

      return {
        success: true,
        message: 'Label removed successfully'
      };
    } catch (error) {
      console.error('Failed to remove label:', error);
      return {
        success: false,
        error: error.message
      };
    }
  }
}

module.exports = GmailServiceEnhanced;
