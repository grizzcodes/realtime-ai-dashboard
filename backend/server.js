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
    
    // Log the test results
    try {
      await supabaseService.logEvent('admin_test', 'integration_check', {
        connectedCount: connected,
        totalCount: total,
        status,
        timestamp: new Date().toISOString()
      });
    } catch (error) {
      console.log('⚠️ Could not log admin test event');
    }
    
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

// Real-time stats endpoint using Supabase
app.get('/api/stats', async (req, res) => {
  try {
    console.log('📊 Fetching real-time stats...');
    const stats = await supabaseService.getStats();
    
    if (stats.success) {
      res.json({
        success: true,
        stats: stats.stats,
        source: 'supabase',
        timestamp: new Date().toISOString()
      });
    } else {
      // Fallback stats
      res.json({
        success: true,
        stats: {
          totalTasks: 0,
          pendingTasks: 0,
          completedTasks: 0,
          highUrgencyTasks: 0,
          totalEvents: 0
        },
        source: 'fallback',
        note: 'Configure Supabase for real-time stats'
      });
    }
  } catch (error) {
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

// Enhanced Events endpoint
app.get('/api/events', async (req, res) => {
  try {
    console.log('📅 Fetching recent events...');
    const limit = parseInt(req.query.limit) || 20;
    
    const eventsResult = await supabaseService.getRecentEvents(limit);
    
    if (eventsResult.success) {
      res.json({
        success: true,
        events: eventsResult.data,
        count: eventsResult.data.length,
        source: 'supabase'
      });
    } else {
      // Mock events if Supabase unavailable
      res.json({
        success: true,
        events: [
          {
            id: 1,
            source: 'ai_test',
            type: 'task_creation',
            data: { message: 'System initialization' },
            processed_at: new Date().toISOString()
          }
        ],
        count: 1,
        source: 'mock',
        note: 'Configure Supabase for real event tracking'
      });
    }
  } catch (error) {
    res.status(500).json({
      success: false,
      error: error.message,
      events: []
    });
  }
});

// Task status update endpoint
app.put('/api/tasks/:id/status', async (req, res) => {
  try {
    const { id } = req.params;
    const { status } = req.body;
    
    console.log(`📝 Updating task ${id} status to: ${status}`);
    
    // Update in Notion if available
    let notionUpdated = false;
    try {
      const updateResult = await notionService.updateTaskStatus(id, status);
      notionUpdated = updateResult.success;
      if (notionUpdated) {
        console.log('✅ Task status updated in Notion');
      }
    } catch (error) {
      console.log('⚠️ Could not update task in Notion:', error.message);
    }
    
    // Update in Supabase
    let supabaseUpdated = false;
    try {
      await supabaseService.syncTask({
        id,
        status,
        updated_at: new Date().toISOString()
      });
      supabaseUpdated = true;
      console.log('✅ Task status updated in Supabase');
    } catch (error) {
      console.log('⚠️ Could not update task in Supabase:', error.message);
    }
    
    // Log the update event
    try {
      await supabaseService.logEvent('task_update', 'status_change', {
        taskId: id,
        newStatus: status,
        notionUpdated,
        supabaseUpdated,
        timestamp: new Date().toISOString()
      });
    } catch (error) {
      console.log('⚠️ Could not log task update event');
    }
    
    const success = notionUpdated || supabaseUpdated;
    
    res.json({
      success,
      message: success ? 'Task status updated successfully' : 'Failed to update task status',
      updatedIn: {
        notion: notionUpdated,
        supabase: supabaseUpdated
      }
    });
    
  } catch (error) {
    console.error('❌ Task status update failed:', error);
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

// Start server
const PORT = process.env.PORT || 3002;
server.listen(PORT, () => {
  console.log(`🌐 Server running on port ${PORT}`);
  console.log(`📊 Dashboard: http://localhost:3000`);
  console.log(`🔐 Google OAuth: http://localhost:${PORT}/auth/google`);
  console.log(`🔗 Health check: http://localhost:${PORT}/api/health`);
  console.log(`📅 Calendar API: http://localhost:${PORT}/api/calendar/events`);
  console.log(`🤖 AI Chat: http://localhost:${PORT}/api/ai-chat`);
  console.log(`🎙️ Fireflies: http://localhost:${PORT}/api/fireflies/meetings`);
  console.log(`📋 Tasks: http://localhost:${PORT}/api/tasks`);
  console.log(`📊 Stats: http://localhost:${PORT}/api/stats`);
  console.log(`📅 Events: http://localhost:${PORT}/api/events`);
  console.log(`✅ Real data integration enabled - configure API keys for full functionality`);
});

module.exports = { app, server, io };