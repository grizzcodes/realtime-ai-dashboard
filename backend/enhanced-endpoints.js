// backend/enhanced-endpoints.js - Fixed Notion and Calendar endpoints
// Note: app, io, and integrationService are provided by main.js as global variables

// Import Magic Inbox Processor
const MagicInboxProcessor = require('./src/ai/magicInboxProcessor');

// Magic AI Inbox endpoint
app.get('/api/ai/magic-inbox', async (req, res) => {
  try {
    console.log('✨ Generating Magic AI Inbox...');
    
    // Initialize Magic Inbox processor with available services
    const services = {
      gmail: integrationService.gmailService,
      notion: integrationService.notionService, 
      fireflies: integrationService.firefliesService,
      supabase: integrationService.supabaseService,
      openaiKey: process.env.OPENAI_API_KEY,
      claudeKey: process.env.ANTHROPIC_API_KEY
    };
    
    const magicInbox = new MagicInboxProcessor(services);
    const result = await magicInbox.getCachedMagicInbox();
    
    res.json(result);
  } catch (error) {
    console.error('❌ Magic Inbox failed:', error);
    res.status(500).json({
      success: false,
      error: error.message,
      data: {
        replySuggestions: ['Check your integrations - some services may be offline'],
        quickWins: ['Test your AI and service connections'],
        upcomingTasks: ['Configure your Gmail, Notion, and Fireflies integrations'],
        waitingOn: ['System setup and API key configuration']
      },
      metadata: {
        totalEmails: 0,
        totalTasks: 0,
        totalMeetings: 0,
        lastUpdated: new Date(),
        setupMode: true
      }
    });
  }
});

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

// Calendar endpoints - FIXED method name
app.get('/api/calendar/next-meetings', async (req, res) => {
  try {
    const limit = parseInt(req.query.limit) || 10;
    console.log(`📅 Fetching next ${limit} calendar events...`);
    
    // Use the correct method name: getUpcomingEvents
    const result = await integrationService.calendarService.getUpcomingEvents(limit);
    
    if (result.success) {
      // Transform events to meetings format for compatibility
      const meetings = result.events.map(event => ({
        id: event.id,
        title: event.summary,
        start: event.start,
        end: event.end,
        description: event.description,
        location: event.location,
        attendees: event.attendees,
        link: event.htmlLink
      }));
      
      res.json({
        success: true,
        meetings: meetings,
        count: meetings.length
      });
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

console.log('✨ Enhanced endpoints loaded with Magic AI Inbox');