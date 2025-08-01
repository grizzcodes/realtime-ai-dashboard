// backend/enhanced-endpoints.js - Additional API endpoints
// Note: app, io, and integrationService are provided by main.js as global variables

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

console.log('🔧 Enhanced endpoints loaded');
