// backend/src/routes/gmailRoutes.js - Gmail API endpoints with search support

module.exports = function(app, gmailService) {
  // Get latest emails endpoint with query support
  app.get('/api/gmail/latest', async (req, res) => {
    try {
      const limit = parseInt(req.query.limit) || 25;
      const query = req.query.query || 'in:inbox'; // Default to inbox
      
      console.log(`📧 Fetching ${limit} Gmail emails with query: ${query}`);
      
      if (!gmailService) {
        console.log('⚠️ Gmail not configured - using mock data');
        return res.json({
          success: true,
          emails: getMockEmails(limit, query),
          count: limit,
          stats: {
            total: limit,
            unread: Math.floor(limit / 3),
            fromKnownContacts: Math.floor(limit / 2)
          }
        });
      }
      
      // Use search method with query
      const result = await gmailService.searchEmails(query, { limit });
      
      if (result.success && result.emails) {
        // Fetch full details for each email
        const detailedEmails = [];
        for (const email of result.emails) {
          try {
            const fullEmail = await gmailService.getEmailDetails(email.id);
            if (fullEmail) {
              detailedEmails.push(fullEmail);
            }
          } catch (err) {
            console.error(`Failed to fetch details for email ${email.id}:`, err);
          }
        }
        
        res.json({
          success: true,
          emails: detailedEmails,
          count: detailedEmails.length,
          stats: {
            total: detailedEmails.length,
            unread: detailedEmails.filter(e => e.isUnread).length,
            fromKnownContacts: 0
          }
        });
      } else {
        // Fallback to getRecentEmails if search fails
        const fallbackResult = await gmailService.getRecentEmails(limit);
        res.json(fallbackResult);
      }
    } catch (error) {
      console.error('Failed to get recent emails:', error.message);
      res.json({
        success: false,
        error: error.message,
        emails: getMockEmails(10, req.query.query),
        count: 10
      });
    }
  });

  // Get email thread endpoint
  app.get('/api/gmail/thread/:threadId', async (req, res) => {
    try {
      const { threadId } = req.params;
      console.log(`📧 Fetching Gmail thread: ${threadId}`);
      
      if (!gmailService) {
        return res.json({
          success: false,
          error: 'Gmail not configured',
          threadId,
          messages: []
        });
      }
      
      const result = await gmailService.getEmailThread(threadId);
      res.json(result);
      
    } catch (error) {
      console.error('Failed to get email thread:', error);
      res.status(500).json({
        success: false,
        error: error.message,
        threadId: req.params.threadId,
        messages: []
      });
    }
  });

  // Send email endpoint
  app.post('/api/gmail/send', async (req, res) => {
    try {
      const { to, subject, body, cc, bcc } = req.body;
      
      if (!gmailService) {
        return res.status(400).json({
          success: false,
          error: 'Gmail not configured'
        });
      }
      
      const result = await gmailService.sendEmail(to, subject, body, { cc, bcc });
      res.json(result);
      
    } catch (error) {
      console.error('Failed to send email:', error);
      res.status(500).json({
        success: false,
        error: error.message
      });
    }
  });

  // Archive email endpoint
  app.post('/api/gmail/archive/:emailId', async (req, res) => {
    try {
      const { emailId } = req.params;
      
      if (!gmailService) {
        return res.status(400).json({
          success: false,
          error: 'Gmail not configured'
        });
      }
      
      const result = await gmailService.archiveEmail(emailId);
      res.json(result);
      
    } catch (error) {
      console.error('Failed to archive email:', error);
      res.status(500).json({
        success: false,
        error: error.message
      });
    }
  });

  // Mark as read endpoint
  app.post('/api/gmail/read/:emailId', async (req, res) => {
    try {
      const { emailId } = req.params;
      
      if (!gmailService) {
        return res.status(400).json({
          success: false,
          error: 'Gmail not configured'
        });
      }
      
      const result = await gmailService.markAsRead(emailId);
      res.json(result);
      
    } catch (error) {
      console.error('Failed to mark email as read:', error);
      res.status(500).json({
        success: false,
        error: error.message
      });
    }
  });

  // Star/unstar email endpoint
  app.post('/api/gmail/star/:emailId', async (req, res) => {
    try {
      const { emailId } = req.params;
      const { star = true } = req.body;
      
      if (!gmailService) {
        return res.status(400).json({
          success: false,
          error: 'Gmail not configured'
        });
      }
      
      const result = await gmailService.toggleStar(emailId, star);
      res.json(result);
      
    } catch (error) {
      console.error('Failed to toggle star:', error);
      res.status(500).json({
        success: false,
        error: error.message
      });
    }
  });

  // Get email stats endpoint
  app.get('/api/gmail/stats', async (req, res) => {
    try {
      if (!gmailService) {
        return res.json({
          success: false,
          error: 'Gmail not configured',
          total: 0,
          unread: 0,
          threads: 0
        });
      }
      
      const result = await gmailService.getEmailStats();
      res.json(result);
      
    } catch (error) {
      console.error('Failed to get email stats:', error);
      res.status(500).json({
        success: false,
        error: error.message
      });
    }
  });

  // Mock data generator
  function getMockEmails(count = 10, query = 'in:inbox') {
    const mockEmails = [];
    const isDrafts = query.includes('drafts');
    const isSent = query.includes('sent');
    
    const senders = isDrafts ? ['Draft'] : isSent ? ['You'] : [
      'Katie Thompson',
      'Marie Chen', 
      'Jennifer Williams',
      'Michelle Rodriguez',
      'Julie Anderson'
    ];
    
    const subjects = isDrafts ? [
      'Meeting notes',
      'Project proposal',
      'Weekly update',
      'Client presentation'
    ] : isSent ? [
      'Re: Project update',
      'Meeting confirmed',
      'Following up',
      'Invoice attached'
    ] : [
      'Re: Dgenz x Open Influence',
      'P&G scalable impact',
      'fresh beauty',
      'brands moment',
      'snack culture'
    ];
    
    const snippets = isDrafts ? [
      'Draft saved...',
      'Working on the proposal...',
      'To be completed...'
    ] : isSent ? [
      'Thanks for the update...',
      'Confirming our meeting...',
      'As discussed...'
    ] : [
      'Hope you had a great summer! I would love to touch base sometime next week...',
      'P&G continues to expand across categories with a portfolio that touches nearly every household...',
      'Farmacy has been leading with clean, sustainable skincare that connects deeply with today\'s beauty consumer...',
      'Marquee Brands has been expanding a portfolio that spans fashion, lifestyle, and culinary icons...',
      'Biena has been scaling plant-based snacking with bold flavors and a clean brand...'
    ];
    
    for (let i = 0; i < count; i++) {
      mockEmails.push({
        id: `mock-${i}-${Date.now()}`,
        threadId: `thread-${i}`,
        from: `${senders[i % senders.length]} <${senders[i % senders.length].toLowerCase().replace(' ', '.')}@example.com>`,
        subject: subjects[i % subjects.length],
        snippet: snippets[i % snippets.length],
        date: new Date(Date.now() - (i * 60 * 60 * 1000)).toISOString(),
        isUnread: !isDrafts && !isSent && i < 3,
        labels: isDrafts ? ['DRAFT'] : isSent ? ['SENT'] : ['INBOX']
      });
    }
    
    return mockEmails;
  }

  console.log('📧 Gmail routes configured with search and thread support');
};