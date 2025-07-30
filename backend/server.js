// backend/server.js - Main Express server with AI integrations
const express = require('express');
const cors = require('cors');
const http = require('http');
const socketIo = require('socket.io');
require('dotenv').config();

const IntelligentEventProcessor = require('./src/ai/intelligentProcessor');
const NotionService = require('./src/services/notionService');

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

// Initialize services
const aiProcessor = new IntelligentEventProcessor();
const notionService = new NotionService();

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
        const error = await response.json();
        results.openai.error = error.error?.message || 'API key invalid';
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
        const error = await response.json();
        results.claude.error = error.error?.message || 'API key invalid';
      }
    } catch (error) {
      results.claude.error = error.message;
    }
  } else {
    results.claude.error = 'API key not configured';
  }

  // Test Notion
  if (process.env.NOTION_API_KEY) {
    const notionTest = await notionService.testConnection();
    results.notion = notionTest;
  } else {
    results.notion.error = 'API key not configured';
  }

  // Other integrations
  results.gmail.success = !!(process.env.GOOGLE_CLIENT_ID && process.env.GOOGLE_CLIENT_SECRET);
  results.gmail.error = (process.env.GOOGLE_CLIENT_ID && process.env.GOOGLE_CLIENT_SECRET) ? null : 'OAuth not configured';

  results.slack.success = !!process.env.SLACK_BOT_TOKEN;
  results.slack.error = process.env.SLACK_BOT_TOKEN ? null : 'Bot token not configured';

  results.fireflies.success = !!process.env.FIREFLIES_API_KEY;
  results.fireflies.error = process.env.FIREFLIES_API_KEY ? null : 'API key not configured';

  results.calendar.success = !!process.env.GOOGLE_REFRESH_TOKEN;
  results.calendar.error = process.env.GOOGLE_REFRESH_TOKEN ? null : 'OAuth token not configured';

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
      user: process.env.USER || process.env.USERNAME || 'unknown',
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
      // If this is a Notion task, sync the status back to Notion
      if (updatedTask.source === 'notion' && updatedTask.notionId) {
        try {
          await notionService.updateTaskStatus(updatedTask.notionId, status);
          console.log(`📝 Synced status "${status}" back to Notion for task: ${updatedTask.title}`);
        } catch (error) {
          console.error('⚠️ Failed to sync status to Notion:', error.message);
        }
      }
      
      io.emit('taskUpdated', updatedTask);
      res.json({ success: true, task: updatedTask });
    } else {
      res.status(404).json({ success: false, error: 'Task not found' });
    }
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

app.post('/api/ai-test', async (req, res) => {
  try {
    console.log('🧪 AI Test requested...');
    
    const testEvent = {
      source: 'notion',
      type: 'page_update',
      data: {
        message: req.body.message || 'URGENT: Complete Q4 budget planning in Notion by Friday. Need to finalize department allocations and get CFO approval.',
        user: 'test-user',
        page_title: 'Q4 Budget Planning',
        database: 'Project Tasks'
      },
      timestamp: new Date().toISOString()
    };

    const result = await aiProcessor.processEvent(testEvent);
    io.emit('newTask', result);
    
    res.json({
      success: true,
      message: 'AI test completed successfully',
      tasksCreated: result.newTasks.length,
      result
    });
  } catch (error) {
    console.error('❌ AI test failed:', error);
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

// Notion sync endpoint
app.post('/api/notion/sync', async (req, res) => {
  try {
    console.log('📝 Notion sync requested...');
    
    const notionResult = await notionService.getTasks();
    
    if (!notionResult.success) {
      return res.status(400).json({
        success: false,
        error: notionResult.error
      });
    }

    // Add Notion tasks to AI processor
    let importedCount = 0;
    for (const task of notionResult.tasks) {
      aiProcessor.tasks.set(task.id, task);
      importedCount++;
    }

    console.log(`📋 Imported ${importedCount} tasks from Notion`);
    
    // Emit to all connected clients
    io.emit('notionSync', { 
      tasksImported: importedCount,
      tasks: notionResult.tasks 
    });

    res.json({
      success: true,
      message: 'Notion sync completed',
      tasksImported: importedCount,
      tasks: notionResult.tasks
    });
  } catch (error) {
    console.error('❌ Notion sync failed:', error);
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

// Individual API test endpoints
app.get('/api/test/:service', async (req, res) => {
  const { service } = req.params;
  
  try {
    let result;
    
    switch (service) {
      case 'openai':
        if (!process.env.OPENAI_API_KEY) {
          result = { success: false, error: 'OpenAI API key not configured' };
        } else {
          const response = await fetch('https://api.openai.com/v1/models', {
            headers: {
              'Authorization': `Bearer ${process.env.OPENAI_API_KEY}`,
              'Content-Type': 'application/json'
            }
          });
          if (response.ok) {
            const data = await response.json();
            result = { success: true, message: `OpenAI connected! Found ${data.data?.length || 0} models` };
          } else {
            const error = await response.json();
            result = { success: false, error: error.error?.message || 'Invalid API key' };
          }
        }
        break;
        
      case 'claude':
        if (!process.env.ANTHROPIC_API_KEY) {
          result = { success: false, error: 'Claude API key not configured' };
        } else {
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
            result = { success: true, message: 'Claude API connected successfully!' };
          } else {
            const error = await response.json();
            result = { success: false, error: error.error?.message || 'Invalid API key' };
          }
        }
        break;
        
      case 'notion':
        if (!process.env.NOTION_API_KEY) {
          result = { success: false, error: 'API key not configured' };
        } else {
          result = await notionService.testConnection();
          if (result.success) {
            result.message = 'Notion API connected successfully!';
          }
        }
        break;
        
      default:
        const simpleTests = {
          slack: () => ({ 
            success: !!process.env.SLACK_BOT_TOKEN, 
            error: process.env.SLACK_BOT_TOKEN ? null : 'Bot token not configured',
            message: process.env.SLACK_BOT_TOKEN ? 'Slack configuration found' : null
          }),
          gmail: () => ({ 
            success: !!(process.env.GOOGLE_CLIENT_ID && process.env.GOOGLE_CLIENT_SECRET), 
            error: (process.env.GOOGLE_CLIENT_ID && process.env.GOOGLE_CLIENT_SECRET) ? null : 'OAuth not configured',
            message: (process.env.GOOGLE_CLIENT_ID && process.env.GOOGLE_CLIENT_SECRET) ? 'Gmail OAuth configured' : null
          }),
          fireflies: () => ({ 
            success: !!process.env.FIREFLIES_API_KEY, 
            error: process.env.FIREFLIES_API_KEY ? null : 'API key not configured',
            message: process.env.FIREFLIES_API_KEY ? 'Fireflies configuration found' : null
          }),
          calendar: () => ({ 
            success: !!process.env.GOOGLE_REFRESH_TOKEN, 
            error: process.env.GOOGLE_REFRESH_TOKEN ? null : 'OAuth refresh token not configured',
            message: process.env.GOOGLE_REFRESH_TOKEN ? 'Calendar OAuth configured' : null
          }),
          linear: () => ({ 
            success: !!process.env.LINEAR_API_KEY, 
            error: process.env.LINEAR_API_KEY ? null : 'API key not configured',
            message: process.env.LINEAR_API_KEY ? 'Linear configuration found' : null
          }),
          github: () => ({ 
            success: !!process.env.GITHUB_TOKEN, 
            error: process.env.GITHUB_TOKEN ? null : 'Token not configured',
            message: process.env.GITHUB_TOKEN ? 'GitHub configuration found' : null
          })
        };
        
        if (simpleTests[service]) {
          result = simpleTests[service]();
        } else {
          result = { success: false, error: 'Unknown service' };
        }
    }
    
    res.json(result);
  } catch (error) {
    res.json({ success: false, error: error.message });
  }
});

// WebSocket connection handling
io.on('connection', (socket) => {
  console.log('📱 Client connected:', socket.id);
  socket.on('disconnect', () => console.log('📱 Client disconnected:', socket.id));
  socket.emit('connected', { message: 'Connected to AI Dashboard', timestamp: new Date().toISOString() });
});

// Error handlers
app.use((error, req, res, next) => {
  console.error('❌ Server error:', error);
  res.status(500).json({ success: false, error: 'Internal server error' });
});

app.use((req, res) => {
  res.status(404).json({ success: false, error: 'Endpoint not found' });
});

const PORT = process.env.PORT || 3002;
server.listen(PORT, () => {
  console.log(`🚀 Server: http://localhost:${PORT}`);
  console.log(`🧠 AI: ${process.env.OPENAI_API_KEY ? '✅ OpenAI' : '❌ OpenAI'} ${process.env.ANTHROPIC_API_KEY ? '✅ Claude' : '❌ Claude'}`);
  console.log(`📝 Notion: ${process.env.NOTION_API_KEY ? '✅ Connected' : '❌ Not configured'}`);
});

module.exports = { app, server, io };
