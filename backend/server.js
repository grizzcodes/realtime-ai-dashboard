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
const IntegrationService = require('./src/services/integrationService');
const intelligentProcessor = require('./src/ai/intelligentProcessor');

// Initialize services
const notionService = new NotionService();
const integrationService = new IntegrationService();

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
  const integrationsStatus = await integrationService.getAllIntegrationsStatus();
  
  const status = {
    notion: { success: false, error: null },
    openai: { success: false, error: null },
    claude: { success: false, error: null },
    ...integrationsStatus
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

  return status;
}

// OAuth Routes for Google (Gmail & Calendar)
app.get('/auth/google', (req, res) => {
  const scopes = [
    'https://www.googleapis.com/auth/gmail.readonly',
    'https://www.googleapis.com/auth/calendar',
    'https://www.googleapis.com/auth/userinfo.email'
  ];

  const authUrl = `https://accounts.google.com/o/oauth2/v2/auth?` +
    `client_id=${process.env.GOOGLE_CLIENT_ID}&` +
    `redirect_uri=${encodeURIComponent('http://localhost:3002/auth/google/callback')}&` +
    `response_type=code&` +
    `scope=${encodeURIComponent(scopes.join(' '))}&` +
    `access_type=offline&` +
    `prompt=consent`;

  res.redirect(authUrl);
});

app.get('/auth/google/callback', async (req, res) => {
  const { code } = req.query;
  
  if (!code) {
    return res.send('❌ Authorization failed - no code received');
  }

  try {
    const response = await fetch('https://oauth2.googleapis.com/token', {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body: new URLSearchParams({
        client_id: process.env.GOOGLE_CLIENT_ID,
        client_secret: process.env.GOOGLE_CLIENT_SECRET,
        code,
        grant_type: 'authorization_code',
        redirect_uri: 'http://localhost:3002/auth/google/callback'
      })
    });

    const tokens = await response.json();
    
    if (tokens.error) {
      return res.send(`❌ Token exchange failed: ${tokens.error_description}`);
    }

    res.send(`
      <h2>✅ Google OAuth Success!</h2>
      <p><strong>Refresh Token:</strong></p>
      <textarea style="width:100%;height:60px;">${tokens.refresh_token}</textarea>
      
      <h3>Next Steps:</h3>
      <ol>
        <li>Copy the refresh token above</li>
        <li>Add it to your <code>backend/.env</code> file:
          <pre>GOOGLE_REFRESH_TOKEN=${tokens.refresh_token}</pre>
        </li>
        <li>Restart your backend server</li>
        <li>Test Gmail/Calendar connection in the dashboard</li>
      </ol>
      
      <a href="http://localhost:3000">← Back to Dashboard</a>
    `);

  } catch (error) {
    console.error('OAuth error:', error);
    res.send(`❌ OAuth failed: ${error.message}`);
  }
});

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
      
      case 'gmail':
        const gmailResult = await integrationService.testGmailConnection();
        res.json(gmailResult);
        break;
        
      case 'calendar':
        const calendarResult = await integrationService.testCalendarConnection();
        res.json(calendarResult);
        break;
        
      case 'slack':
        const slackResult = await integrationService.testSlackConnection();
        res.json(slackResult);
        break;
        
      case 'fireflies':
        const firefliesResult = await integrationService.testFirefliesConnection();
        res.json(firefliesResult);
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

// Integration data endpoints
app.get('/api/gmail/messages', async (req, res) => {
  try {
    const result = await integrationService.getRecentEmails(10);
    res.json(result);
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

app.get('/api/calendar/events', async (req, res) => {
  try {
    const result = await integrationService.getUpcomingEvents(10);
    res.json(result);
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

app.get('/api/slack/messages', async (req, res) => {
  try {
    const result = await integrationService.getRecentSlackMessages(10);
    res.json(result);
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

// Get status options endpoint
app.get('/api/notion/status-options', async (req, res) => {
  try {
    const statusOptions = await notionService.getStatusOptions();
    res.json({
      success: true,
      statusOptions: statusOptions
    });
  } catch (error) {
    console.error('❌ Failed to get status options:', error);
    res.status(500).json({
      success: false,
      error: error.message,
      statusOptions: []
    });
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
        statusOptions: notionResult.statusOptions || [],
        source: 'notion'
      });
    } else {
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

// Notion sync endpoint
app.post('/api/notion/sync', async (req, res) => {
  try {
    console.log('📝 Notion sync requested...');
    console.log('🔑 API Key present:', !!process.env.NOTION_API_KEY);
    console.log('🆔 Database ID:', process.env.NOTION_DATABASE_ID);
    
    const notionResult = await notionService.getTasks();
    console.log('📋 Notion result success:', notionResult.success);
    
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
    console.log(`🎨 Found ${notionResult.statusOptions.length} status options`);
    
    // Emit to all connected clients
    io.emit('notionSync', { 
      tasksImported: notionResult.tasks.length,
      tasks: notionResult.tasks,
      statusOptions: notionResult.statusOptions
    });

    res.json({
      success: true,
      message: 'Notion sync completed',
      tasksImported: notionResult.tasks.length,
      tasks: notionResult.tasks,
      statusOptions: notionResult.statusOptions
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
const PORT = process.env.PORT || 3002;
server.listen(PORT, () => {
  console.log(`🌐 Server running on port ${PORT}`);
  console.log(`📊 Dashboard available at http://localhost:${PORT}`);
  console.log(`🔗 Health check: http://localhost:${PORT}/api/health`);
  console.log(`🔐 Google OAuth: http://localhost:${PORT}/auth/google`);
});

// Export for testing
module.exports = { app, server, io };
