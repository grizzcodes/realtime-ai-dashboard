// backend/enhanced-endpoints.js - Additional API endpoints
// Note: app, io, and integrationService are provided by main.js as global variables

// Get integration status
app.get('/api/integrations/status', async (req, res) => {
  try {
    console.log('🔗 Checking integration status...');
    
    const status = await integrationService.getAllStatus();
    
    res.json({
      success: true,
      integrations: status
    });
  } catch (error) {
    console.error('❌ Failed to get integration status:', error);
    res.status(500).json({
      success: false,
      error: error.message,
      integrations: {}
    });
  }
});

// Get Notion tasks directly
app.get('/api/notion/tasks', async (req, res) => {
  try {
    console.log('📝 Fetching Notion tasks...');
    
    const result = await integrationService.getNotionTasks();
    
    if (result.success) {
      res.json({
        success: true,
        tasks: result.tasks || [],
        count: result.tasks?.length || 0
      });
    } else {
      res.status(400).json({
        success: false,
        error: result.error,
        tasks: []
      });
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

// Get AI tasks from Supabase
app.get('/api/tasks', async (req, res) => {
  try {
    console.log('🤖 Fetching AI tasks from Supabase...');
    
    const result = await integrationService.getAITasks();
    
    if (result.success) {
      res.json({
        success: true,
        tasks: result.tasks || [],
        count: result.tasks?.length || 0
      });
    } else {
      res.status(400).json({
        success: false,
        error: result.error,
        tasks: []
      });
    }
  } catch (error) {
    console.error('❌ Failed to get AI tasks:', error);
    res.status(500).json({
      success: false,
      error: error.message,
      tasks: []
    });
  }
});

// AI Chat endpoint
app.post('/api/ai/chat', async (req, res) => {
  try {
    const { message, context } = req.body;
    console.log('🤖 AI Chat request:', message.substring(0, 50) + '...');
    
    const result = await integrationService.chatWithAI(message, context);
    
    if (result.success) {
      res.json({
        success: true,
        response: result.response,
        timestamp: new Date().toISOString()
      });
    } else {
      res.status(400).json({
        success: false,
        error: result.error,
        response: 'Sorry, I encountered an error processing your request.'
      });
    }
  } catch (error) {
    console.error('❌ AI chat failed:', error);
    res.status(500).json({
      success: false,
      error: error.message,
      response: 'Sorry, I\'m having trouble connecting right now.'
    });
  }
});

// Enhanced Notion tasks with people filter
app.get('/api/notion/tasks-filtered', async (req, res) => {
  try {
    const { person, status } = req.query;
    console.log(`📋 Fetching filtered tasks (person: ${person}, status: ${status})...`);
    
    const notionResult = await integrationService.getFilteredTasks(person, status);
    
    if (notionResult.success) {
      res.json({
        success: true,
        tasks: notionResult.tasks || [],
        people: notionResult.people || [],
        statusOptions: notionResult.statusOptions || [],
        filters: { person, status }
      });
    } else {
      res.status(400).json({
        success: false,
        error: notionResult.error,
        tasks: []
      });
    }
  } catch (error) {
    console.error('❌ Failed to get filtered tasks:', error);
    res.status(500).json({
      success: false,
      error: error.message,
      tasks: []
    });
  }
});

// Calendar next meetings endpoint
app.get('/api/calendar/next-meetings', async (req, res) => {
  try {
    const limit = parseInt(req.query.limit) || 5;
    console.log(`📅 Fetching next ${limit} meetings...`);
    
    const calendarResult = await integrationService.getNextMeetings(limit);
    
    if (calendarResult.success) {
      res.json({
        success: true,
        meetings: calendarResult.meetings || [],
        count: calendarResult.meetings?.length || 0
      });
    } else {
      res.status(400).json({
        success: false,
        error: calendarResult.error,
        meetings: []
      });
    }
  } catch (error) {
    console.error('❌ Failed to get next meetings:', error);
    res.status(500).json({
      success: false,
      error: error.message,
      meetings: []
    });
  }
});

// Test AI endpoint
app.post('/api/ai-test', async (req, res) => {
  try {
    console.log('🧠 AI Test requested');
    
    const testResult = await integrationService.testAI();
    
    res.json({
      success: true,
      result: testResult,
      timestamp: new Date().toISOString()
    });
  } catch (error) {
    console.error('❌ AI test failed:', error);
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

// Task completion endpoint
app.put('/api/tasks/:taskId/complete', async (req, res) => {
  try {
    const { taskId } = req.params;
    console.log(`✅ Completing task: ${taskId}`);
    
    const result = await integrationService.completeTask(taskId);
    
    if (result.success) {
      io.emit('taskUpdate', {
        type: 'task_completed',
        taskId: taskId,
        timestamp: new Date().toISOString()
      });
      
      res.json({
        success: true,
        message: 'Task completed successfully',
        taskId: taskId
      });
    } else {
      res.status(400).json({
        success: false,
        error: result.error
      });
    }
  } catch (error) {
    console.error('❌ Failed to complete task:', error);
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

// Test individual integrations
app.get('/api/test/:integration', async (req, res) => {
  try {
    const { integration } = req.params;
    console.log(`🧪 Testing ${integration} integration...`);
    
    const result = await integrationService.testIntegration(integration);
    
    res.json({
      success: result.success,
      message: result.message || 'Test completed',
      error: result.error,
      data: result.data
    });
  } catch (error) {
    console.error(`❌ Failed to test ${req.params.integration}:`, error);
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

console.log('🔧 Enhanced endpoints loaded');
