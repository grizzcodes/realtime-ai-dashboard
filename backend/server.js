// backend/server.js - Gmail API Routes
// Note: app and io are provided by main.js as global variables

// Add Gmail archive endpoint
app.post('/api/gmail/archive/:emailId', async (req, res) => {
  try {
    const { emailId } = req.params;
    console.log(`📧 Archiving email: ${emailId}`);
    
    const result = await integrationService.archiveEmail(emailId);
    
    if (result.success) {
      io.emit('emailUpdate', {
        type: 'email_archived',
        emailId: emailId,
        timestamp: new Date().toISOString()
      });
      
      res.json({
        success: true,
        message: 'Email archived successfully',
        emailId: emailId
      });
    } else {
      res.status(400).json({
        success: false,
        error: result.error
      });
    }
  } catch (error) {
    console.error('❌ Failed to archive email:', error);
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

// Add Gmail draft reply endpoint
app.post('/api/gmail/draft-reply', async (req, res) => {
  try {
    const { emailId, subject, from, snippet } = req.body;
    console.log(`✉️ Generating draft reply for email: ${emailId}`);
    
    // Generate AI-powered draft reply
    const prompt = `Generate a professional email reply to:
From: ${from}
Subject: ${subject}
Preview: ${snippet}

Please create a brief, professional response that addresses the email content appropriately.`;

    const aiResponse = await integrationService.chatWithAI(prompt, {
      type: 'email_draft',
      originalEmail: { from, subject, snippet }
    });
    
    if (aiResponse.success) {
      res.json({
        success: true,
        draftContent: aiResponse.response,
        emailId: emailId
      });
    } else {
      res.status(400).json({
        success: false,
        error: 'Failed to generate draft reply'
      });
    }
  } catch (error) {
    console.error('❌ Failed to generate draft reply:', error);
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

// Add Gmail latest emails endpoint
app.get('/api/gmail/latest', async (req, res) => {
  try {
    const limit = parseInt(req.query.limit) || 10;
    console.log(`📧 Fetching latest ${limit} Gmail emails...`);
    
    const result = await integrationService.getLatestEmails(limit);
    
    if (result.success) {
      res.json({
        success: true,
        emails: result.emails || [],
        count: result.emails?.length || 0
      });
    } else {
      res.status(400).json({
        success: false,
        error: result.error,
        emails: []
      });
    }
  } catch (error) {
    console.error('❌ Failed to get latest emails:', error);
    res.status(500).json({
      success: false,
      error: error.message,
      emails: []
    });
  }
});

console.log('📧 Gmail API routes loaded');
