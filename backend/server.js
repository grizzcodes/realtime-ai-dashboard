// backend/server.js - Main Express server with AI integrations
const express = require('express');
const cors = require('cors');
const http = require('http');
const socketIo = require('socket.io');
require('dotenv').config();

const IntelligentEventProcessor = require('./src/ai/intelligentProcessor');

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
app.use(express.urlencoded({ extended: true }));

// Initialize AI processor
const aiProcessor = new IntelligentEventProcessor();

// Test API connections helper
const testApiConnections = async () => {
  const results = {
    openai: { success: false, error: null },
    claude: { success: false, error: null },
    notion: { success: false, error: null },
    gmail: { success: false, error: null },
    slack: { success: false, error: null },
    fireflies: { success: false, error: null },
    calendar: { success: false, error: null },
    linear: { success: false, error: null },
    github: { success: false, error: null }
  };

  // Test OpenAI
  if (process.env.OPENAI_API_KEY) {
    try {
      const response = await fetch('https://api.openai.com/v1/models', {
        headers: {
          'Authorization': `Bearer ${process.env.OPENAI_API_KEY}`,
          'Content-Type': 'application/json'
        }
      });
      results.openai.success = response.ok;
      if (!response.ok) {
        results.openai.error = 'API key invalid or quota exceeded';
      }
    } catch (error) {
      results.openai.error = error.message;
    }
  } else {
    results.openai.error = 'API key not configured';
  }

  // Test Claude
  if (process.env.ANTHROPIC_API_KEY) {
    try {
      const response = await fetch('https://api.anthropic.com/v1/messages', {
        method: 'POST',
        headers: {
          'x-api-key': process.env.ANTHROPIC_API_KEY,
          'anthropic-version': '2023-06-01',
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          model: 'claude-3-haiku-20240307',
          max_tokens: 10,
          messages: [{ role: 'user', content: 'test' }]
        })
      });
      results.claude.success = response.ok;
      if (!response.ok) {
        results.claude.error = 'API key invalid or quota exceeded';
      }
    } catch (error) {
      results.claude.error = error.message;
    }
  } else {
    results.claude.error = 'API key not configured';
  }

  // Test other integrations
  results.notion.success = !!process.env.NOTION_API_KEY;
  results.notion.error = process.env.NOTION_API_KEY ? null : 'API key not configured';

  results.gmail.success = !!(process.env.GOOGLE_CLIENT_ID && process.env.GOOGLE_CLIENT_SECRET);
  results.gmail.error = (process.env.GOOGLE_CLIENT_ID && process.env.GOOGLE_CLIENT_SECRET) ? null : 'OAuth credentials not configured';

  results.slack.success = !!process.env.SLACK_BOT_TOKEN;
  results.slack.error = process.env.SLACK_BOT_TOKEN ? null : 'Bot token not configured';

  results.fireflies.success = !!process.env.FIREFLIES_API_KEY;
  results.fireflies.error = process.env.FIREFLIES_API_KEY ? null : 'API key not configured';

  results.calendar.success = !!process.env.GOOGLE_REFRESH_TOKEN;
  results.calendar.error = process.env.GOOGLE_REFRESH_TOKEN ? null : 'OAuth refresh token not configured';

  results.linear.success = !!process.env.LINEAR_API_KEY;
  results.linear.error = process.env.LINEAR_API_KEY ? null : 'API key not configured';

  results.github.success = !!process.env.GITHUB_TOKEN;
  results.github.error = process.env.GITHUB_TOKEN ? null : 'Token not configured';

  return results;
};

// Routes
app.get('/health', async (req, res) => {
  try {
    const apiConnections = await testApiConnections();
    const stats = await aiProcessor.getStats();
    
    res.json({
      status: 'healthy',
      timestamp: new Date().toISOString(),
      server: 'realtime-ai-dashboard',
      version: '1.0.0',
      apiConnections,
      stats
    });
  } catch (error) {
    res.status(500).json({
      status: 'error',
      error: error.message,
      timestamp: new Date().toISOString()
    });
  }
});

app.get('/api/tasks', async (req, res) => {
  try {
    const tasks = aiProcessor.getTopTasks(50);
    const stats = await aiProcessor.getStats();
    
    res.json({
      success: true,
      tasks,
      stats
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

app.put('/api/tasks/:id/status', async (req, res) => {
  try {
    const { id } = req.params;
    const { status } = req.body;
    
    const updatedTask = await aiProcessor.updateTaskStatus(id, status);
    
    if (updatedTask) {
      // Emit to all connected clients
      io.emit('taskUpdated', updatedTask);
      
      res.json({
        success: true,
        task: updatedTask
      });
    } else {
      res.status(404).json({
        success: false,
        error: 'Task not found'
      });
    }
  } catch (error) {
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

app.get('/api/events', async (req, res) => {
  try {
    const events = await aiProcessor.getRecentEvents(30);
    
    res.json({
      success: true,
      events
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

app.post('/api/ai-test', async (req, res) => {
  try {
    const testEvent = {
      source: 'ai-test',
      type: 'manual_test',
      data: {
        message: req.body.message || 'Test AI processing: Urgent - Fix the payment gateway bug by tomorrow morning. Critical issue affecting customers.',
        user: 'test-user'
      },
      timestamp: new Date().toISOString()
    };

    console.log('🧪 Processing test event...');
    const result = await aiProcessor.processEvent(testEvent);
    
    // Emit to all connected clients
    io.emit('newTask', result);
    io.emit('eventProcessed', result);
    
    res.json({
      success: true,
      message: 'AI test completed successfully',
      result
    });
  } catch (error) {
    console.error('AI test failed:', error);
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

// Individual API test endpoints
app.get('/api/test/openai', async (req, res) => {
  try {
    if (!process.env.OPENAI_API_KEY) {
      return res.json({ success: false, error: 'OpenAI API key not configured' });
    }

    const response = await fetch('https://api.openai.com/v1/models', {
      headers: {
        'Authorization': `Bearer ${process.env.OPENAI_API_KEY}`,
        'Content-Type': 'application/json'
      }
    });

    if (response.ok) {
      const data = await response.json();
      res.json({ 
        success: true, 
        message: 'OpenAI connection successful',
        models: data.data?.length || 0
      });
    } else {
      res.json({ success: false, error: 'Invalid API key or quota exceeded' });
    }
  } catch (error) {
    res.json({ success: false, error: error.message });
  }
});

app.get('/api/test/claude', async (req, res) => {
  try {
    if (!process.env.ANTHROPIC_API_KEY) {
      return res.json({ success: false, error: 'Claude API key not configured' });
    }

    const response = await fetch('https://api.anthropic.com/v1/messages', {
      method: 'POST',
      headers: {
        'x-api-key': process.env.ANTHROPIC_API_KEY,
        'anthropic-version': '2023-06-01',
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        model: 'claude-3-haiku-20240307',
        max_tokens: 10,
        messages: [{ role: 'user', content: 'Hello' }]
      })
    });

    if (response.ok) {
      res.json({ 
        success: true, 
        message: 'Claude connection successful'
      });
    } else {
      res.json({ success: false, error: 'Invalid API key or quota exceeded' });
    }
  } catch (error) {
    res.json({ success: false, error: error.message });
  }
});

// Add test endpoints for other services
const serviceTests = {
  notion: () => ({ 
    success: !!process.env.NOTION_API_KEY, 
    error: process.env.NOTION_API_KEY ? null : 'API key not configured' 
  }),
  slack: () => ({ 
    success: !!process.env.SLACK_BOT_TOKEN, 
    error: process.env.SLACK_BOT_TOKEN ? null : 'Bot token not configured' 
  }),
  gmail: () => ({ 
    success: !!(process.env.GOOGLE_CLIENT_ID && process.env.GOOGLE_CLIENT_SECRET), 
    error: (process.env.GOOGLE_CLIENT_ID && process.env.GOOGLE_CLIENT_SECRET) ? null : 'OAuth credentials not configured' 
  }),
  fireflies: () => ({ 
    success: !!process.env.FIREFLIES_API_KEY, 
    error: process.env.FIREFLIES_API_KEY ? null : 'API key not configured' 
  }),
  calendar: () => ({ 
    success: !!process.env.GOOGLE_REFRESH_TOKEN, 
    error: process.env.GOOGLE_REFRESH_TOKEN ? null : 'OAuth refresh token not configured' 
  }),
  linear: () => ({ 
    success: !!process.env.LINEAR_API_KEY, 
    error: process.env.LINEAR_API_KEY ? null : 'API key not configured' 
  }),
  github: () => ({ 
    success: !!process.env.GITHUB_TOKEN, 
    error: process.env.GITHUB_TOKEN ? null : 'Token not configured' 
  })
};

Object.keys(serviceTests).forEach(service => {
  app.get(`/api/test/${service}`, (req, res) => {
    res.json(serviceTests[service]());
  });
});

// WebSocket connection handling
io.on('connection', (socket) => {
  console.log('📱 Client connected:', socket.id);
  
  socket.on('disconnect', () => {
    console.log('📱 Client disconnected:', socket.id);
  });
  
  // Send initial data to new clients
  socket.emit('connected', {
    message: 'Connected to AI Dashboard',
    timestamp: new Date().toISOString()
  });
});

// Global error handler
app.use((error, req, res, next) => {
  console.error('❌ Server error:', error);
  res.status(500).json({
    success: false,
    error: 'Internal server error',
    message: error.message
  });
});

// 404 handler
app.use((req, res) => {
  res.status(404).json({
    success: false,
    error: 'Endpoint not found',
    path: req.path
  });
});

const PORT = process.env.PORT || 3002;

server.listen(PORT, () => {
  console.log(`
🚀 AI Dashboard Server Running!
🌐 Server: http://localhost:${PORT}
🔌 WebSocket: ws://localhost:${PORT}
📊 Health: http://localhost:${PORT}/health
🧠 AI APIs: ${process.env.OPENAI_API_KEY ? '✅ OpenAI' : '❌ OpenAI'} ${process.env.ANTHROPIC_API_KEY ? '✅ Claude' : '❌ Claude'}
  `);
});

module.exports = { app, server, io };
