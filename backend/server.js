// Platform action endpoints
app.post('/api/admin/refresh-integrations', async (req, res) => {
  try {
    console.log('🔄 Refreshing integration status...');
    const status = await checkIntegrationStatus();
    io.emit('integrationUpdate', status);
    
    const connectedCount = Object.values(status).filter(s => s.success).length;
    const totalCount = Object.keys(status).length;
    
    res.json({ 
      success: true, 
      message: `Integration status refreshed: ${connectedCount}/${totalCount} services connected`,
      status 
    });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

app.post('/api/admin/test-all', async (req, res) => {
  try {
    console.log('🧪 Testing all integrations...');
    const status = await checkIntegrationStatus();
    const connected = Object.values(status).filter(s => s.success).length;
    const total = Object.keys(status).length;
    
    res.json({ 
      success: true, 
      message: `Integration test completed: ${connected}/${total} services operational`,
      status,
      summary: {
        total,
        connected,
        failed: total - connected,
        percentage: Math.round((connected / total) * 100)
      }
    });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

// Start server
const PORT = process.env.PORT || 3002;
server.listen(PORT, () => {
  console.log(`🌐 Server running on port ${PORT}`);
  console.log(`📊 Dashboard: http://localhost:3000`);
  console.log(`🔗 Health check: http://localhost:${PORT}/api/health`);
  console.log(`📋 Tasks: http://localhost:${PORT}/api/tasks`);
  console.log(`🎙️ Fireflies: http://localhost:${PORT}/api/fireflies/meetings`);
  console.log(`✅ Real data integration enabled`);
});

module.exports = { app, server, io };