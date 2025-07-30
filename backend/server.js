// backend/server.js
require('dotenv').config();
const express = require('express');
const http = require('http');
const socketIo = require('socket.io');
const cors = require('cors');
const fetch = require('node-fetch');

const app = express();
const server = http.createServer(app);
const io = socketIo(server, {
  cors: {
    origin: "http://localhost:3000",
    methods: ["GET", "POST"]
  }
});

app.use(cors());
app.use(express.json());

// Import services
const NotionService = require('./src/services/notionService');
const IntegrationService = require('./src/services/integrationService');

const notionService = new NotionService();
const integrationService = new IntegrationService();

console.log('🚀 Starting Realtime AI Dashboard Backend...');

// Socket handling
io.on('connection', (socket) => {
  console.log('👤 User connected:', socket.id);
  
  // Handle AI chat messages
  socket.on('aiChat', async (data) => {
    try {
      const { message, provider, action } = data;
      
      if (action === 'modify_platform') {
        // Handle platform modifications
        const response = await handlePlatformModification(message, provider);
        socket.emit('aiResponse', { response, type: 'modification' });
      } else {
        // Regular chat
        const response = await getAIResponse(message, provider);
        socket.emit('aiResponse', { response, type: 'chat' });
      }
    } catch (error) {
      socket.emit('aiError', { error: error.message });
    }
  });
  
  socket.on('disconnect', () => {
    console.log('👋 User disconnected:', socket.id);
  });
});

// AI Response Handler
async function getAIResponse(message, provider) {
  const systemPrompt = `You are an AI assistant for the Realtime AI Dashboard. You can help users manage integrations, understand platform features, and provide real-time assistance. Be concise and helpful.`;
  
  if (provider === 'openai' && process.env.OPENAI_API_KEY) {
    const response = await fetch('https://api.openai.com/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${process.env.OPENAI_API_KEY}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        model: 'gpt-4',
        messages: [
          { role: 'system', content: systemPrompt },
          { role: 'user', content: message }
        ],
        max_tokens: 500
      })
    });
    const data = await response.json();
    return data.choices[0].message.content;
  }
  
  if (provider === 'claude' && process.env.ANTHROPIC_API_KEY) {
    const response = await fetch('https://api.anthropic.com/v1/messages', {
      method: 'POST',
      headers: {
        'x-api-key': process.env.ANTHROPIC_API_KEY,
        'Content-Type': 'application/json',
        'anthropic-version': '2023-06-01'
      },
      body: JSON.stringify({
        model: 'claude-3-sonnet-20240229',
        max_tokens: 500,
        messages: [{ role: 'user', content: `${systemPrompt}\n\nUser: ${message}` }]
      })
    });
    const data = await response.json();
    return data.content[0].text;
  }
  
  return "AI service not configured. Please add API keys to use the chatbot.";
}

// Platform Modification Handler
async function handlePlatformModification(message, provider) {
  const modificationPrompt = `You are an admin AI that can suggest platform modifications. Analyze this request and provide specific suggestions: "${message}"`;
  
  // Get AI suggestion
  const suggestion = await getAIResponse(modificationPrompt, provider);
  
  // Return structured response
  return {
    suggestion,
    actions: [
      { type: 'refresh_integrations', label: 'Refresh Integration Status' },
      { type: 'test_all', label: 'Test All Connections' },
      { type: 'reload_tasks', label: 'Reload Tasks' }
    ]
  };
}

// OAuth Routes (fix for calendar)
app.get('/auth/google', (req, res) => {
  const scopes = [
    'https://www.googleapis.com/auth/gmail.readonly',
    'https://www.googleapis.com/auth/calendar.readonly',
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
      <p><strong>Add this to your .env file:</strong></p>
      <textarea style="width:100%;height:60px;">GOOGLE_REFRESH_TOKEN=${tokens.refresh_token}</textarea>
      
      <h3>Next Steps:</h3>
      <ol>
        <li>Copy the token above</li>
        <li>Add it to your backend/.env file</li>
        <li>Restart your backend server</li>
        <li>Test Gmail/Calendar connections</li>
      </ol>
      
      <a href="http://localhost:3000">← Back to Dashboard</a>
    `);

  } catch (error) {
    console.error('OAuth error:', error);
    res.send(`❌ OAuth failed: ${error.message}`);
  }
});

// Integration status check
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

  // Test AI services
  status.openai = process.env.OPENAI_API_KEY 
    ? { success: true, message: 'API key configured' }
    : { success: false, error: 'API key missing' };

  status.claude = process.env.ANTHROPIC_API_KEY 
    ? { success: true, message: 'API key configured' }
    : { success: false, error: 'API key missing' };

  return status;
}

// API Routes
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

app.get('/api/test/:integration', async (req, res) => {
  const integration = req.params.integration.toLowerCase();
  
  try {
    let result;
    
    switch (integration) {
      case 'gmail':
        result = await integrationService.testGmailConnection();
        break;
      case 'calendar':
        result = await integrationService.testCalendarConnection();
        break;
      case 'slack':
        result = await integrationService.testSlackConnection();
        break;
      case 'fireflies':
        result = await integrationService.testFirefliesConnection();
        break;
      case 'notion':
        result = await notionService.testConnection();
        break;
      case 'openai':
        result = process.env.OPENAI_API_KEY 
          ? { success: true, message: 'OpenAI API key configured' }
          : { success: false, error: 'OpenAI API key not found' };
        break;
      case 'claude':
        result = process.env.ANTHROPIC_API_KEY 
          ? { success: true, message: 'Claude API key configured' }
          : { success: false, error: 'Anthropic API key not found' };
        break;
      default:
        result = { success: false, error: `Integration '${integration}' not implemented` };
    }
    
    res.json(result);
  } catch (error) {
    res.json({ success: false, error: error.message });
  }
});

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

app.post('/api/ai-test', async (req, res) => {
  try {
    res.json({
      success: true,
      message: 'AI test endpoint working',
      tasksCreated: 0,
      note: 'AI functionality available'
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

// Platform action endpoints
app.post('/api/admin/refresh-integrations', async (req, res) => {
  try {
    const status = await checkIntegrationStatus();
    io.emit('integrationUpdate', status);
    res.json({ success: true, message: 'Integrations refreshed' });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

app.post('/api/admin/test-all', async (req, res) => {
  try {
    const status = await checkIntegrationStatus();
    const connected = Object.values(status).filter(s => s.success).length;
    const total = Object.keys(status).length;
    
    res.json({ 
      success: true, 
      message: `${connected}/${total} integrations working`,
      status 
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
  console.log(`🔐 Google OAuth: http://localhost:${PORT}/auth/google`);
  console.log(`🔗 Health check: http://localhost:${PORT}/api/health`);
});

module.exports = { app, server, io };
