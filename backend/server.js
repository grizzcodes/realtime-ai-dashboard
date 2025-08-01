// backend/server.js
require('dotenv').config();
const express = require('express');
const http = require('http');
const socketIo = require('socket.io');
const cors = require('cors');

const app = express();
const server = http.createServer(app);
const io = socketIo(server, {
  cors: {
    origin: "http://localhost:3000",
    methods: ["GET", "POST", "PATCH"]
  }
});

app.use(cors());
app.use(express.json());

// Import services
const NotionService = require('./src/services/notionService');
const IntegrationService = require('./src/services/integrationService');
const SupabaseService = require('./src/services/supabaseService');
const FirefliesService = require('./src/services/firefliesService');
const OpenAIService = require('./src/services/openAIService');
const ClaudeService = require('./src/services/claudeService');

const notionService = new NotionService();
const integrationService = new IntegrationService();
const supabaseService = new SupabaseService();
const firefliesService = new FirefliesService();
const openAIService = new OpenAIService();
const claudeService = new ClaudeService();

console.log('🚀 Starting Realtime AI Dashboard Backend...');

// Integration status check
async function checkIntegrationStatus() {
  const status = {};
  
  try {
    const supabaseTest = await supabaseService.testConnection();
    status.supabase = supabaseTest;
  } catch (error) {
    status.supabase = { success: false, error: error.message };
  }

  try {
    const notionTest = await notionService.testConnection();
    status.notion = notionTest;
  } catch (error) {
    status.notion = { success: false, error: error.message };
  }

  try {
    const firefliesTest = await firefliesService.testConnection();
    status.fireflies = firefliesTest;
  } catch (error) {
    status.fireflies = { success: false, error: error.message };
  }

  try {
    const calendarTest = await integrationService.testCalendarConnection();
    status.calendar = calendarTest;
  } catch (error) {
    status.calendar = { success: false, error: error.message };
  }

  try {
    const gmailTest = await integrationService.testGmailConnection();
    status.gmail = gmailTest;
  } catch (error) {
    status.gmail = { success: false, error: error.message };
  }

  status.openai = {
    success: !!process.env.OPENAI_API_KEY,
    message: process.env.OPENAI_API_KEY ? 'API key configured' : 'API key not configured'
  };

  status.claude = {
    success: !!process.env.ANTHROPIC_API_KEY,
    message: process.env.ANTHROPIC_API_KEY ? 'API key configured' : 'API key not configured'
  };

  const mockNotImplemented = { success: false, error: 'Service integration not yet implemented' };
  status.slack = mockNotImplemented;
  status.linear = mockNotImplemented;
  status.github = mockNotImplemented;
  status.runway = mockNotImplemented;

  return status;
}

// API Routes
app.get('/health', async (req, res) => {
  try {
    const apiConnections = await checkIntegrationStatus();
    res.json({ 
      status: 'healthy', 
      timestamp: new Date().toISOString(),
      user: 'dashboard-user',
      apiConnections
    });
  } catch (error) {
    console.error('❌ Health check failed:', error);
    res.status(500).json({
      status: 'error',
      error: error.message,
      timestamp: new Date().toISOString()
    });
  }
});

app.get('/api/health', async (req, res) => {
  try {
    const apiConnections = await checkIntegrationStatus();
    res.json({ 
      status: 'healthy', 
      timestamp: new Date().toISOString(),
      user: 'dashboard-user',
      apiConnections
    });
  } catch (error) {
    console.error('❌ Health check failed:', error);
    res.status(500).json({
      status: 'error',
      error: error.message,
      timestamp: new Date().toISOString()
    });
  }
});

app.post('/api/ai-test', async (req, res) => {
  try {
    console.log('🤖 Testing AI integration...');
    const { message } = req.body;
    
    let aiResponse = null;
    let aiService = 'none';
    
    // Try OpenAI first
    if (process.env.OPENAI_API_KEY) {
      try {
        const openAIResult = await openAIService.processMessage(message || 'Test message for task creation');
        if (openAIResult.success) {
          aiResponse = openAIResult;
          aiService = 'openai';
        }
      } catch (error) {
        console.log('⚠️ OpenAI failed, trying Claude:', error.message);
      }
    }
    
    // Try Claude if OpenAI failed or unavailable
    if (!aiResponse && process.env.ANTHROPIC_API_KEY) {
      try {
        const claudeResult = await claudeService.processMessage(message || 'Test message for task creation');
        if (claudeResult.success) {
          aiResponse = claudeResult;
          aiService = 'claude';
        }
      } catch (error) {
        console.log('⚠️ Claude failed:', error.message);
      }
    }
    
    if (aiResponse) {
      // Emit real-time update
      io.emit('aiTestUpdate', {
        type: 'ai_test_completed',
        service: aiService,
        result: aiResponse,
        timestamp: new Date().toISOString()
      });
      
      res.json({
        success: true,
        service: aiService,
        result: aiResponse,
        message: `AI test successful using ${aiService.toUpperCase()}`
      });
    } else {
      res.status(400).json({
        success: false,
        error: 'No AI service available. Please configure OPENAI_API_KEY or ANTHROPIC_API_KEY',
        availableServices: {
          openai: !!process.env.OPENAI_API_KEY,
          claude: !!process.env.ANTHROPIC_API_KEY
        }
      });
    }
  } catch (error) {
    console.error('❌ AI test failed:', error);
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

app.post('/api/ai-chat', async (req, res) => {
  try {
    console.log('💬 AI Chat request received...');
    const { message, model, isAdmin, conversationHistory } = req.body;
    
    let aiResponse = null;
    let aiService = 'none';
    
    // Use the specified model or fallback
    if (model === 'claude' && process.env.ANTHROPIC_API_KEY) {
      try {
        const claudeResult = await claudeService.processMessage(message, conversationHistory);
        if (claudeResult.success) {
          aiResponse = claudeResult;
          aiService = 'claude';
        }
      } catch (error) {
        console.log('⚠️ Claude failed, trying OpenAI:', error.message);
      }
    }
    
    // Try OpenAI if Claude failed or was not requested
    if (!aiResponse && process.env.OPENAI_API_KEY) {
      try {
        const openAIResult = await openAIService.processMessage(message, conversationHistory);
        if (openAIResult.success) {
          aiResponse = openAIResult;
          aiService = 'openai';
        }
      } catch (error) {
        console.log('⚠️ OpenAI failed:', error.message);
      }
    }
    
    if (aiResponse) {
      // Emit real-time chat update
      io.emit('aiChatUpdate', {
        type: 'ai_chat_response',
        service: aiService,
        message: aiResponse.content || aiResponse.response,
        timestamp: new Date().toISOString()
      });
      
      res.json({
        success: true,
        response: aiResponse.content || aiResponse.response || 'AI response received',
        service: aiService,
        actions: aiResponse.actions || []
      });
    } else {
      res.status(400).json({
        success: false,
        error: 'No AI service available. Please configure OPENAI_API_KEY or ANTHROPIC_API_KEY'
      });
    }
  } catch (error) {
    console.error('❌ AI chat failed:', error);
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

app.get('/api/tasks', async (req, res) => {
  try {
    console.log('📋 Fetching tasks from Notion...');
    const notionResult = await notionService.getTasks();
    
    if (notionResult.success) {
      const tasks = notionResult.tasks || [];
      console.log(`✅ Found ${tasks.length} tasks from Notion`);
      
      res.json({
        success: true,
        tasks: tasks,
        statusOptions: notionResult.statusOptions || ['Not started', 'In progress', 'Completed'],
        source: 'notion',
        count: tasks.length
      });
    } else {
      console.log('⚠️ Notion tasks failed:', notionResult.error);
      res.status(400).json({
        success: false,
        error: notionResult.error,
        tasks: [],
        statusOptions: []
      });
    }
  } catch (error) {
    console.error('❌ Failed to get tasks:', error);
    res.status(500).json({
      success: false,
      error: error.message,
      tasks: [],
      statusOptions: []
    });
  }
});

// Add task completion endpoint
app.patch('/api/notion/task/:taskId/complete', async (req, res) => {
  try {
    const { taskId } = req.params;
    const { completed } = req.body;
    
    console.log(`📝 ${completed ? 'Completing' : 'Uncompleting'} task: ${taskId}`);
    
    const result = await notionService.updateTaskStatus(taskId, completed ? 'completed' : 'pending');
    
    if (result.success) {
      // Emit real-time update to all clients
      io.emit('taskUpdate', {
        type: 'task_status_updated',
        taskId: taskId,
        completed: completed,
        timestamp: new Date().toISOString()
      });
      
      res.json({
        success: true,
        message: `Task ${completed ? 'completed' : 'reopened'}`,
        taskId: taskId
      });
    } else {
      res.status(400).json({
        success: false,
        error: result.error
      });
    }
  } catch (error) {
    console.error('❌ Failed to update task:', error);
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

// Add Gmail latest emails endpoint
app.get('/api/gmail/latest', async (req, res) => {
  try {
    console.log('📧 Fetching latest Gmail emails...');
    
    const result = await integrationService.getLatestEmails(5);
    
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

app.get('/api/calendar/events', async (req, res) => {
  try {
    const maxResults = parseInt(req.query.maxResults) || 10;
    const result = await integrationService.getUpcomingEvents(maxResults);
    res.json(result);
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

app.get('/api/fireflies/meetings', async (req, res) => {
  try {
    console.log('📞 Fetching Fireflies meetings...');
    
    let meetings = [];
    let source = 'mock';
    
    if (process.env.FIREFLIES_API_KEY) {
      try {
        const firefliesResult = await firefliesService.getRecentTranscripts(5);
        if (firefliesResult.success && firefliesResult.transcripts && firefliesResult.transcripts.length > 0) {
          meetings = firefliesResult.transcripts.map(transcript => ({
            id: transcript.id,
            title: transcript.title || 'Untitled Meeting',
            date: transcript.date || new Date().toISOString(),
            duration: transcript.duration || 30,
            participants: transcript.participants?.map(p => p.name) || ['Unknown'],
            summary: transcript.summary?.overview || 'No summary available',
            actionItems: transcript.summary?.action_items || [],
            keywords: transcript.summary?.keywords || [],
            meeting_url: transcript.meeting_url,
            transcript_url: `https://app.fireflies.ai/view/${transcript.id}`
          }));
          source = 'fireflies';
          console.log(`✅ Loaded ${meetings.length} real Fireflies meetings`);
        }
      } catch (error) {
        console.log('⚠️ Fireflies API error:', error.message);
      }
    }
    
    if (meetings.length === 0) {
      meetings = [
        {
          id: 'ff_001',
          title: 'Weekly Product Sync',
          date: new Date(Date.now() - 86400000).toISOString(),
          duration: 45,
          participants: ['Sarah Johnson', 'Mike Chen', 'Emma Wilson'],
          summary: 'Discussed Q1 roadmap priorities and upcoming development.',
          actionItems: ['Sarah to prioritize bug fixes', 'Mike to schedule interviews'],
          keywords: ['roadmap', 'bugs'],
          meeting_url: 'https://zoom.us/j/mock-1',
          transcript_url: 'https://app.fireflies.ai/view/mock-1'
        }
      ];
      source = 'mock';
      console.log('📋 Using mock Fireflies data');
    }

    res.json({ 
      success: true, 
      meetings: meetings,
      source: source,
      count: meetings.length,
      note: source === 'mock' ? 'Configure FIREFLIES_API_KEY for real data' : undefined
    });
    
  } catch (error) {
    console.error('❌ Fireflies endpoint error:', error);
    res.status(500).json({ 
      success: false, 
      error: error.message,
      meetings: []
    });
  }
});

// Individual service test endpoints
app.get('/api/test/notion', async (req, res) => {
  try {
    const result = await notionService.testConnection();
    res.json(result);
  } catch (error) {
    res.json({ success: false, error: error.message });
  }
});

app.get('/api/test/fireflies', async (req, res) => {
  try {
    const result = await firefliesService.testConnection();
    res.json(result);
  } catch (error) {
    res.json({ success: false, error: error.message });
  }
});

app.get('/api/test/gmail', async (req, res) => {
  try {
    const result = await integrationService.testGmailConnection();
    res.json(result);
  } catch (error) {
    res.json({ success: false, error: error.message });
  }
});

app.get('/api/test/calendar', async (req, res) => {
  try {
    const result = await integrationService.testCalendarConnection();
    res.json(result);
  } catch (error) {
    res.json({ success: false, error: error.message });
  }
});

app.get('/api/test/openai', async (req, res) => {
  try {
    if (!process.env.OPENAI_API_KEY) {
      return res.json({ success: false, error: 'OPENAI_API_KEY not configured' });
    }
    
    const result = await openAIService.processMessage('Test message');
    res.json({ success: true, message: 'OpenAI connection successful', result });
  } catch (error) {
    res.json({ success: false, error: error.message });
  }
});

app.get('/api/test/claude', async (req, res) => {
  try {
    if (!process.env.ANTHROPIC_API_KEY) {
      return res.json({ success: false, error: 'ANTHROPIC_API_KEY not configured' });
    }
    
    const result = await claudeService.processMessage('Test message');
    res.json({ success: true, message: 'Claude connection successful', result });
  } catch (error) {
    res.json({ success: false, error: error.message });
  }
});

// Webhooks for ngrok
app.post('/webhook/fireflies', express.raw({ type: 'application/json' }), (req, res) => {
  try {
    console.log('🎙️ Fireflies webhook received:', req.body);
    const payload = JSON.parse(req.body);
    
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

app.post('/webhook/notion', (req, res) => {
  try {
    console.log('📝 Notion webhook received:', req.body);
    
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

app.get('/webhook/health', (req, res) => {
  res.json({ 
    status: 'healthy', 
    webhooks: ['fireflies', 'notion'],
    ngrokReady: true,
    timestamp: new Date().toISOString()
  });
});

// Start server
const PORT = process.env.PORT || 3002;
server.listen(PORT, () => {
  console.log(`🌐 Server running on port ${PORT}`);
  console.log(`📊 Dashboard: http://localhost:3000`);
  console.log(`🔗 Health check: http://localhost:${PORT}/api/health`);
  console.log(`📋 Tasks: http://localhost:${PORT}/api/tasks`);
  console.log(`🎙️ Fireflies: http://localhost:${PORT}/api/fireflies/meetings`);
  console.log(`🌐 Webhook health: http://localhost:${PORT}/webhook/health`);
  console.log(`🤖 AI Test: http://localhost:${PORT}/api/ai-test`);
  console.log(`💬 AI Chat: http://localhost:${PORT}/api/ai-chat`);
  console.log(`📝 Task Complete: http://localhost:${PORT}/api/notion/task/:id/complete`);
  console.log(`📧 Latest Gmail: http://localhost:${PORT}/api/gmail/latest`);
  console.log(`✅ Real data integration enabled`);
  
  console.log('\n🔧 Environment Status:');
  console.log('======================');
  console.log('NOTION_API_KEY:', process.env.NOTION_API_KEY ? '✅ Set' : '❌ Missing');
  console.log('OPENAI_API_KEY:', process.env.OPENAI_API_KEY ? '✅ Set' : '❌ Missing');
  console.log('ANTHROPIC_API_KEY:', process.env.ANTHROPIC_API_KEY ? '✅ Set' : '❌ Missing');
  console.log('FIREFLIES_API_KEY:', process.env.FIREFLIES_API_KEY ? '✅ Set' : '❌ Missing');
  console.log('GOOGLE_CLIENT_ID:', process.env.GOOGLE_CLIENT_ID ? '✅ Set' : '❌ Missing');
});

module.exports = { app, server, io };