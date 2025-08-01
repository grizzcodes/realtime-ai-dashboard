// Add Gmail archive endpoint
app.post('/api/gmail/archive/:emailId', async (req, res) => {
  try {
    const { emailId } = req.params;
    console.log(`📧 Archiving email: ${emailId}`);
    
    const result = await integrationService.archiveEmail(emailId);
    
    if (result.success) {
      // Emit real-time update to refresh email list
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