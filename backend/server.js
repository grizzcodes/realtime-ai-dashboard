// Fireflies webhook endpoint for real-time meeting updates
app.post('/webhook/fireflies', express.raw({ type: 'application/json' }), (req, res) => {
  try {
    console.log('🎙️ Fireflies webhook received:', req.body);
    const payload = JSON.parse(req.body);
    
    // Emit real-time update to connected clients
    io.emit('firefliesUpdate', {
      type: 'meeting_completed',
      meeting: payload.meeting,
      timestamp: new Date().toISOString()
    });
    
    res.status(200).json({ success: true, message: 'Webhook processed' });
  } catch (error) {
    console.error('❌ Fireflies webhook error:', error);
    res.status(400).json({ success: false, error: error.message });
  }
});

// Notion webhook endpoint
app.post('/webhook/notion', (req, res) => {
  try {
    console.log('📝 Notion webhook received:', req.body);
    
    // Emit real-time update
    io.emit('notionUpdate', {
      type: 'database_updated',
      data: req.body,
      timestamp: new Date().toISOString()
    });
    
    res.status(200).json({ success: true });
  } catch (error) {
    console.error('❌ Notion webhook error:', error);
    res.status(400).json({ success: false, error: error.message });
  }
});

// Webhook health check
app.get('/webhook/health', (req, res) => {
  res.json({ 
    status: 'healthy', 
    webhooks: ['fireflies', 'notion'],
    ngrokReady: true,
    timestamp: new Date().toISOString()
  });
});

