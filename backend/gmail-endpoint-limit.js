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