// backend/src/services/gmailService.js
// Enhanced Gmail Service with larger email capacity and SUPA client matching
const { google } = require('googleapis');

class GmailService {
  constructor(supabaseService) {
    this.gmail = null;
    this.auth = null;
    this.initialized = false;
    this.supabase = supabaseService; // Connect to SUPA for client matching
    this.emailCache = new Map(); // Cache for better performance
    this.clientEmailMap = new Map(); // Map emails to clients/leads
    this.maxEmails = 100; // Increased from 25 to 100
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
      
      // Load client email mappings on init
      await this.loadClientEmailMappings();
      
      return { success: true };
    } catch (error) {
      console.error('❌ Gmail initialization failed:', error.message);
      return { success: false, error: error.message };
    }
  }

  // ENHANCED: Load client/lead email mappings from SUPA
  async loadClientEmailMappings() {
    if (!this.supabase) {
      console.log('⚠️ SUPA not connected - client matching disabled');
      return;
    }
    
    try {
      // Get all clients from SUPA
      const { data: clients } = await this.supabase.supabase
        .from('clients')
        .select('*');
      
      if (clients && clients.length > 0) {
        clients.forEach(client => {
          if (client.email) {
            this.clientEmailMap.set(client.email.toLowerCase(), {
              type: 'client',
              data: client
            });
          }
        });
      }
      
      // Get all leads from SUPA
      const { data: leads } = await this.supabase.supabase
        .from('leads')
        .select('*');
      
      if (leads && leads.length > 0) {
        leads.forEach(lead => {
          if (lead.email) {
            this.clientEmailMap.set(lead.email.toLowerCase(), {
              type: 'lead',
              data: lead
            });
          }
        });
      }
      
      // Get all people from SUPA
      const { data: people } = await this.supabase.supabase
        .from('people')
        .select('*');
      
      if (people && people.length > 0) {
        people.forEach(person => {
          if (person.email) {
            this.clientEmailMap.set(person.email.toLowerCase(), {
              type: 'person',
              data: person
            });
          }
        });
      }
      
      console.log(`📧 Loaded ${this.clientEmailMap.size} email-to-contact mappings from SUPA`);
    } catch (error) {
      console.error('Error loading client email mappings:', error);
    }
  }

  // ENHANCED: Match email to client/lead/person
  matchEmailToContact(emailAddress) {
    if (!emailAddress) return null;
    
    // Clean email address (remove name part if present)
    const cleanEmail = this.extractEmailAddress(emailAddress).toLowerCase();
    
    // Look up in our mapping
    const contact = this.clientEmailMap.get(cleanEmail);
    
    if (contact) {
      return {
        found: true,
        type: contact.type,
        name: contact.data.name,
        company: contact.data.company || contact.data.industry,
        status: contact.data.status,
        notes: contact.data.notes,
        id: contact.data.id,
        // Add relationship context
        relationship: this.getRelationshipLevel(contact.data)
      };
    }
    
    // Try domain matching for company emails
    const domain = cleanEmail.split('@')[1];
    if (domain && !domain.includes('gmail') && !domain.includes('yahoo') && !domain.includes('outlook')) {
      // Check if any client has this domain
      for (const [email, contact] of this.clientEmailMap.entries()) {
        if (email.endsWith('@' + domain)) {
          return {
            found: true,
            type: 'related',
            domain: domain,
            possibleCompany: contact.data.company || 'Same domain as ' + contact.data.name,
            notes: 'Likely from same organization'
          };
        }
      }
    }
    
    return {
      found: false,
      type: 'unknown',
      email: cleanEmail,
      notes: 'New contact - not in SUPA database'
    };
  }

  // Determine relationship level based on SUPA data
  getRelationshipLevel(contactData) {
    if (contactData.status === 'active' || contactData.status === 'client') {
      return 'high';
    } else if (contactData.status === 'prospect' || contactData.stage === 'contacted') {
      return 'medium';
    } else {
      return 'low';
    }
  }

  // Extract clean email address from "Name <email@domain.com>" format
  extractEmailAddress(emailString) {
    const match = emailString.match(/<(.+)>/);
    return match ? match[1] : emailString;
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

  // ENHANCED: Get more emails with contact matching
  async getRecentEmails(maxResults = 100) {
    if (!this.initialized) {
      await this.initialize();
    }

    try {
      // Use cache if available and fresh
      const cacheKey = `emails_${maxResults}`;
      if (this.emailCache.has(cacheKey)) {
        const cached = this.emailCache.get(cacheKey);
        if (Date.now() - cached.timestamp < 60000) { // 1 minute cache
          return { success: true, emails: cached.data };
        }
      }

      console.log(`📧 Fetching ${maxResults} emails from Gmail...`);
      
      const response = await this.gmail.users.messages.list({
        userId: 'me',
        maxResults: Math.min(maxResults, 500), // Gmail API max is 500
        q: 'in:inbox OR in:sent', // Get both inbox and sent for full context
        orderBy: 'internalDate desc'
      });

      const messages = response.data.messages || [];
      console.log(`📬 Found ${messages.length} messages, processing ${Math.min(messages.length, maxResults)}...`);
      
      const emailDetails = await Promise.all(
        messages.slice(0, maxResults).map(async (message) => {
          const details = await this.gmail.users.messages.get({
            userId: 'me',
            id: message.id
          });
          
          const from = this.getHeader(details.data.payload.headers, 'From');
          const contact = this.matchEmailToContact(from);
          
          const email = {
            id: message.id,
            threadId: details.data.threadId,
            subject: this.getHeader(details.data.payload.headers, 'Subject'),
            from: from,
            to: this.getHeader(details.data.payload.headers, 'To'),
            date: this.getHeader(details.data.payload.headers, 'Date'),
            snippet: details.data.snippet,
            isUnread: details.data.labelIds?.includes('UNREAD') || false,
            isImportant: details.data.labelIds?.includes('IMPORTANT') || false,
            isStarred: details.data.labelIds?.includes('STARRED') || false,
            labels: details.data.labelIds || [],
            contact: contact,
            priority: this.calculateEmailPriority(
              details.data.snippet,
              contact,
              details.data.labelIds?.includes('UNREAD') || false
            )
          };
          
          return email;
        })
      );

      // Sort by priority and date
      emailDetails.sort((a, b) => {
        if (a.priority !== b.priority) {
          return b.priority - a.priority;
        }
        return new Date(b.date) - new Date(a.date);
      });

      // Cache the results
      this.emailCache.set(cacheKey, {
        data: emailDetails,
        timestamp: Date.now()
      });

      console.log(`✅ Successfully fetched ${emailDetails.length} emails`);
      
      // Calculate stats
      const stats = {
        total: emailDetails.length,
        fromKnownContacts: emailDetails.filter(e => e.contact?.found).length,
        unread: emailDetails.filter(e => e.isUnread).length,
        highPriority: emailDetails.filter(e => e.priority >= 8).length,
        fromClients: emailDetails.filter(e => e.contact?.type === 'client').length,
        fromLeads: emailDetails.filter(e => e.contact?.type === 'lead').length
      };

      return { 
        success: true, 
        emails: emailDetails,
        stats: stats
      };
    } catch (error) {
      console.error('Failed to get recent emails:', error.message);
      return { success: false, error: error.message };
    }
  }

  // Calculate email priority based on various factors
  calculateEmailPriority(snippet, contact, isUnread) {
    let priority = 5; // Base priority
    
    // Contact-based priority
    if (contact?.found) {
      if (contact.type === 'client') priority += 3;
      if (contact.type === 'lead') priority += 2;
      if (contact.relationship === 'high') priority += 2;
    }
    
    // Email characteristics
    if (isUnread) priority += 2;
    
    // Subject/snippet keywords
    const urgentKeywords = ['urgent', 'asap', 'important', 'deadline', 'today', 'tomorrow'];
    const snippetLower = (snippet || '').toLowerCase();
    if (urgentKeywords.some(keyword => snippetLower.includes(keyword))) {
      priority += 2;
    }
    
    return Math.min(priority, 10); // Cap at 10
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

      // Get contact info for the sender
      const from = this.getHeader(payload.headers, 'From');
      const contact = this.matchEmailToContact(from);

      return {
        success: true,
        email: {
          id: messageId,
          subject: this.getHeader(payload.headers, 'Subject'),
          from: from,
          to: this.getHeader(payload.headers, 'To'),
          date: this.getHeader(payload.headers, 'Date'),
          body: body.substring(0, 2000), // Limit for AI processing
          contact: contact
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

      // Clear cache
      this.emailCache.clear();

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

      // Clear cache
      this.emailCache.clear();

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

      // Clear cache
      this.emailCache.clear();

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

  // ENHANCED: Get email stats for dashboard
  async getEmailStats() {
    const emails = await this.getRecentEmails(100);
    
    if (!emails.success) {
      return { success: false, error: emails.error };
    }

    const stats = {
      total: emails.emails.length,
      unread: emails.emails.filter(e => e.isUnread).length,
      fromClients: emails.emails.filter(e => e.contact?.type === 'client').length,
      fromLeads: emails.emails.filter(e => e.contact?.type === 'lead').length,
      fromUnknown: emails.emails.filter(e => !e.contact?.found).length,
      requiresResponse: emails.emails.filter(e => 
        e.isUnread && e.priority >= 7
      ).length,
      highPriority: emails.emails.filter(e => e.priority >= 8).length
    };

    // Group by contact
    const byContact = {};
    emails.emails.forEach(email => {
      const key = email.contact?.name || 'Unknown';
      if (!byContact[key]) {
        byContact[key] = {
          count: 0,
          unread: 0,
          type: email.contact?.type || 'unknown'
        };
      }
      byContact[key].count++;
      if (email.isUnread) byContact[key].unread++;
    });

    // Top senders
    const topSenders = Object.entries(byContact)
      .sort((a, b) => b[1].count - a[1].count)
      .slice(0, 10)
      .map(([name, data]) => ({
        name,
        ...data
      }));

    return {
      success: true,
      stats,
      topSenders,
      lastUpdated: new Date().toISOString()
    };
  }

  // Refresh client mappings (call this when SUPA data changes)
  async refreshClientMappings() {
    this.clientEmailMap.clear();
    await this.loadClientEmailMappings();
    // Clear email cache to re-match contacts
    this.emailCache.clear();
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