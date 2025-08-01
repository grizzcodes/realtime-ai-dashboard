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