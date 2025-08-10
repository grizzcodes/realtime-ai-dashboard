// backend/enhanced-endpoints.js - Fixed Notion endpoints
// Note: app, io, and integrationService are provided by main.js as global variables

// Notion task endpoints
app.get('/api/notion/tasks', async (req, res) => {
  try {
    console.log('📝 Fetching Notion tasks...');
    
    // Use the notionService directly from integrationService
    const result = await integrationService.notionService.getTasks();
    
    if (result.success) {
      console.log(`✅ Retrieved ${result.tasks.length} Notion tasks`);
      res.json(result);
    } else {
      console.error('❌ Failed to get Notion tasks:', result.error);
      res.status(400).json(result);
    }
  } catch (error) {
    console.error('❌ Failed to get Notion tasks:', error);
    res.status(500).json({
      success: false,
      error: error.message,
      tasks: []
    });
  }
});

app.post('/api/notion/tasks', async (req, res) => {
  try {
    console.log('📝 Creating Notion task:', req.body);
    
    const result = await integrationService.notionService.createTask(req.body);
    
    if (result.success) {
      console.log('✅ Notion task created:', result.task.id);
      
      // Emit real-time update
      io.emit('notionUpdate', {
        type: 'task_created',
        task: result.task,
        timestamp: new Date().toISOString()
      });
      
      res.json(result);
    } else {
      console.error('❌ Failed to create Notion task:', result.error);
      res.status(400).json(result);
    }
  } catch (error) {
    console.error('❌ Failed to create Notion task:', error);
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

// Integration status endpoint
app.get('/api/integrations/status', async (req, res) => {
  try {
    const status = await integrationService.getAllStatus();
    res.json(status);
  } catch (error) {
    console.error('Failed to get integration status:', error);
    res.status(500).json({
      error: error.message,
      integrations: {}
    });
  }
});

// Test integration endpoint
app.get('/api/test/:service', async (req, res) => {
  try {
    const { service } = req.params;
    const result = await integrationService.testIntegration(service);
    res.json(result);
  } catch (error) {
    console.error(`Failed to test ${req.params.service}:`, error);
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

// Calendar endpoints
app.get('/api/calendar/next-meetings', async (req, res) => {
  try {
    const limit = parseInt(req.query.limit) || 10;
    console.log(`📅 Fetching next ${limit} calendar events...`);
    
    const result = await integrationService.calendarService.getUpcomingMeetings(limit);
    
    if (result.success) {
      res.json(result);
    } else {
      console.log('Calendar not configured or failed:', result.error);
      res.json({
        success: false,
        error: result.error,
        meetings: []
      });
    }
  } catch (error) {
    console.error('Failed to get calendar events:', error);
    res.json({
      success: false,
      error: error.message,
      meetings: []
    });
  }
});

// Fireflies endpoints
app.get('/api/fireflies/meetings', async (req, res) => {
  try {
    const limit = parseInt(req.query.limit) || 10;
    console.log(`🎙️ Fetching ${limit} Fireflies meetings...`);
    
    const result = await integrationService.getFirefliesMeetings(limit);
    
    res.json(result);
  } catch (error) {
    console.error('Failed to get Fireflies meetings:', error);
    res.status(500).json({
      success: false,
      error: error.message,
      meetings: []
    });
  }
});

// AI test endpoint
app.post('/api/ai-test', async (req, res) => {
  try {
    console.log('🧪 Testing AI processing...');
    
    const testMessage = req.body.message || 'Urgent: Fix the payment gateway bug by tomorrow';
    
    // Try OpenAI first, then Claude
    let aiResponse = null;
    
    if (integrationService.openaiService) {
      try {
        const response = await integrationService.openaiService.generateResponse(
          `Analyze this message and create a task: "${testMessage}"`,
          { temperature: 0.7 }
        );
        aiResponse = response;
      } catch (error) {
        console.log('OpenAI failed, trying Claude...');
      }
    }
    
    if (!aiResponse && integrationService.claudeService) {
      try {
        const response = await integrationService.claudeService.generateResponse(
          `Analyze this message and create a task: "${testMessage}"`
        );
        aiResponse = response;
      } catch (error) {
        console.log('Claude also failed');
      }
    }
    
    if (!aiResponse) {
      aiResponse = 'AI services not configured. Task: Fix payment gateway (High Priority)';
    }
    
    // Create a test task
    const task = {
      title: 'Fix payment gateway bug',
      priority: 'High',
      assignee: 'Team',
      dueDate: new Date(Date.now() + 24*60*60*1000).toISOString().split('T')[0],
      status: 'To-do'
    };
    
    // Try to create in Notion
    if (integrationService.notionService) {
      const result = await integrationService.notionService.createTask(task);
      if (result.success) {
        console.log('✅ Test task created in Notion');
      }
    }
    
    res.json({
      success: true,
      message: 'AI test completed',
      analysis: aiResponse,
      task: task
    });
    
  } catch (error) {
    console.error('AI test failed:', error);
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

// Complete task endpoint
app.put('/api/tasks/:taskId/complete', async (req, res) => {
  try {
    const { taskId } = req.params;
    console.log(`✅ Marking task ${taskId} as complete...`);
    
    // Update in Notion
    if (integrationService.notionService) {
      const result = await integrationService.notionService.updateTaskStatus(taskId, 'Done');
      
      if (result.success) {
        io.emit('taskUpdate', {
          type: 'task_completed',
          taskId: taskId,
          timestamp: new Date().toISOString()
        });
        
        res.json(result);
      } else {
        res.status(400).json(result);
      }
    } else {
      res.status(400).json({
        success: false,
        error: 'Notion not configured'
      });
    }
  } catch (error) {
    console.error('Failed to complete task:', error);
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

console.log('✨ Enhanced endpoints loaded');
