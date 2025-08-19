// backend/server.js - Gmail API Routes
// Note: app and io are provided by main.js as global variables

// Add Gmail thread endpoint
app.get('/api/gmail/thread/:threadId', async (req, res) => {
  try {
    const { threadId } = req.params;
    console.log(`📧 Fetching email thread: ${threadId}`);
    
    const result = await integrationService.getEmailThread(threadId);
    
    if (result.success) {
      res.json({
        success: true,
        threadId: result.threadId,
        messages: result.messages || [],
        messageCount: result.messageCount || 0
      });
    } else {
      res.status(400).json({
        success: false,
        error: result.error
      });
    }
  } catch (error) {
    console.error('❌ Failed to fetch email thread:', error);
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

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

// Add Gmail draft reply endpoint - FIXED
app.post('/api/gmail/draft-reply', async (req, res) => {
  try {
    const { emailId, subject, from, snippet } = req.body;
    console.log(`✉️ Generating draft reply for email: ${emailId}`);
    
    // Generate AI-powered draft reply using OpenAI or Claude
    const prompt = `Generate a professional email reply to:
From: ${from}
Subject: ${subject}
Preview: ${snippet}

Please create a brief, professional response that addresses the email content appropriately. Be concise and helpful.`;

    // Try OpenAI first, then Claude
    let aiResponse = { success: false };
    
    // Check if we have OpenAI configured
    if (integrationService.openaiService) {
      try {
        const response = await integrationService.openaiService.generateResponse(prompt, {
          type: 'email_draft',
          temperature: 0.7,
          max_tokens: 200
        });
        aiResponse = { success: true, response };
      } catch (error) {
        console.log('OpenAI failed, trying Claude...');
      }
    }
    
    // Fallback to Claude if OpenAI fails
    if (!aiResponse.success && integrationService.claudeService) {
      try {
        const response = await integrationService.claudeService.generateResponse(prompt, {
          type: 'email_draft'
        });
        aiResponse = { success: true, response };
      } catch (error) {
        console.log('Claude also failed');
      }
    }
    
    // If no AI is available, use a template
    if (!aiResponse.success) {
      aiResponse = {
        success: true,
        response: `Thank you for your email regarding "${subject}". I'll review this and get back to you shortly.\n\nBest regards`
      };
    }
    
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
      // Return empty array instead of error to prevent frontend crash
      console.log('Gmail not configured or failed:', result.error);
      res.json({
        success: false,
        error: result.error,
        emails: [] // Always return empty array
      });
    }
  } catch (error) {
    console.error('❌ Failed to get latest emails:', error);
    res.json({
      success: false,
      error: error.message,
      emails: [] // Always return empty array
    });
  }
});

console.log('📧 Gmail API routes loaded');
