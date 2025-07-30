// backend/server.js
require('dotenv').config();
const express = require('express');
const http = require('http');
const socketIo = require('socket.io');
const cors = require('cors');
const path = require('path');

// Initialize Express app
const app = express();
const server = http.createServer(app);
const io = socketIo(server, {
  cors: {
    origin: "http://localhost:3000",
    methods: ["GET", "POST"]
  }
});

// Middleware
app.use(cors());
app.use(express.json());
app.use(express.static('public'));

// Import services
const NotionService = require('./src/services/notionService');
const intelligentProcessor = require('./src/ai/intelligentProcessor');

// Initialize services
const notionService = new NotionService();

console.log('🚀 Starting Realtime AI Dashboard Backend...');
console.log('📝 Notion API Key present:', !!process.env.NOTION_API_KEY);
console.log('🆔 Database ID:', process.env.NOTION_DATABASE_ID);

// Socket connection handling
io.on('connection', (socket) => {
  console.log('👤 User connected:', socket.id);
  
  socket.on('disconnect', () => {
    console.log('👋 User disconnected:', socket.id);
  });
  
  // Handle task analysis requests
  socket.on('analyzeTask', async (taskData) => {
    try {
      console.log('🧠 Analyzing task:', taskData.title);
      const analysis = await intelligentProcessor.analyzeTask(taskData);
      socket.emit('taskAnalysis', analysis);
    } catch (error) {
      console.error('❌ Task analysis failed:', error);
      socket.emit('analysisError', { error: error.message });
    }
  });
});

// Function to check integration statuses
async function checkIntegrationStatus() {
  const status = {
    notion: { success: false, error: null },
    openai: { success: false, error: null },
    claude: { success: false, error: null },
    gmail: { success: false, error: null },
    slack: { success: false, error: null },
    calendar: { success: false, error: null }
  };

  // Test Notion
  try {
    const notionTest = await notionService.testConnection();
    status.notion = notionTest;
  } catch (error) {
    status.notion = { success: false, error: error.message };
  }

  // Test OpenAI
  if (process.env.OPENAI_API_KEY) {
    status.openai = { success: true, message: 'API key configured' };
  } else {
    status.openai = { success: false, error: 'API key not configured' };
  }

  // Test Claude
  if (process.env.ANTHROPIC_API_KEY) {
    status.claude = { success: true, message: 'API key configured' };
  } else {
    status.claude = { success: false, error: 'API key not configured' };
  }

  // Gmail, Slack, Calendar (placeholder - need OAuth setup)
  status.gmail = { success: false, error: 'OAuth not configured' };
  status.slack = { success: false, error: 'OAuth not configured' };
  status.calendar = { success: false, error: 'OAuth not configured' };

  return status;
}

// Health check endpoint with integration status
app.get('/api/health', async (req, res) => {
  try {
    const apiConnections = await checkIntegrationStatus();
    
    res.json({ 
      status: 'healthy', 
      timestamp: new Date().toISOString(),
      user: 'dashboard-user',
      apiConnections: apiConnections,
      notion: {
        configured: !!process.env.NOTION_API_KEY && !!process.env.NOTION_DATABASE_ID
      }
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

// Test integration endpoints
app.get('/api/test/:integration', async (req, res) => {
  const integration = req.params.integration.toLowerCase();
  
  try {
    switch (integration) {
      case 'notion':
        const notionResult = await notionService.testConnection();
        res.json(notionResult);
        break;
      
      case 'openai':
        if (process.env.OPENAI_API_KEY) {
          res.json({ success: true, message: 'OpenAI API key is configured' });
        } else {
          res.json({ success: false, error: 'OpenAI API key not found in .env' });
        }
        break;
      
      case 'claude':
        if (process.env.ANTHROPIC_API_KEY) {
          res.json({ success: true, message: 'Claude API key is configured' });
        } else {
          res.json({ success: false, error: 'Anthropic API key not found in .env' });
        }
        break;
      
      default:
        res.json({ success: false, error: `Integration '${integration}' not implemented yet` });
    }
  } catch (error) {
    res.json({ success: false, error: error.message });
  }
});

// Get tasks endpoint
app.get('/api/tasks', async (req, res) => {
  try {
    const notionResult = await notionService.getTasks();
    
    if (notionResult.success) {
      res.json({
        success: true,
        tasks: notionResult.tasks || [],
        source: 'notion'
      });
    } else {
      res.status(400).json({
        success: false,
        error: notionResult.error,
        tasks: []
      });
    }
  } catch (error) {
    console.error('❌ Failed to get tasks:', error);
    res.status(500).json({
      success: false,
      error: error.message,
      tasks: []
    });
  }
});

// Notion sync endpoint
app.post('/api/notion/sync', async (req, res) => {
  try {
    console.log('📝 Notion sync requested...');
    console.log('🔑 API Key present:', !!process.env.NOTION_API_KEY);
    console.log('🆔 Database ID:', process.env.NOTION_DATABASE_ID);
    
    const notionResult = await notionService.getTasks();
    console.log('📋 Notion result:', notionResult);
    
    if (!notionResult.success) {
      console.error('❌ Notion sync failed:', notionResult.error);
      return res.status(400).json({
        success: false,
        error: notionResult.error,
        debug: {
          hasApiKey: !!process.env.NOTION_API_KEY,
          databaseId: process.env.NOTION_DATABASE_ID
        }
      });
    }

    console.log(`📋 Retrieved ${notionResult.tasks.length} tasks from Notion`);
    
    // Emit to all connected clients
    io.emit('notionSync', { 
      tasksImported: notionResult.tasks.length,
      tasks: notionResult.tasks 
    });

    res.json({
      success: true,
      message: 'Notion sync completed',
      tasksImported: notionResult.tasks.length,
      tasks: notionResult.tasks
    });
  } catch (error) {
    console.error('❌ Notion sync failed:', error);
    res.status(500).json({
      success: false,
      error: error.message,
      stack: error.stack
    });
  }
});

// AI test endpoint
app.post('/api/ai-test', async (req, res) => {
  try {
    res.json({
      success: true,
      message: 'AI test endpoint working',
      tasksCreated: 0,
      note: 'AI functionality not implemented yet'
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

// Start server
const PORT = process.env.PORT || 3001;
server.listen(PORT, () => {
  console.log(`🌐 Server running on port ${PORT}`);
  console.log(`📊 Dashboard available at http://localhost:${PORT}`);
  console.log(`🔗 Health check: http://localhost:${PORT}/api/health`);
});

// Export for testing
module.exports = { app, server, io };
