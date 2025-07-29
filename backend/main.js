// backend/main.js - Enhanced AI-Powered Real-time Dashboard Server
require('dotenv').config();

const express = require('express');
const http = require('http');
const socketIo = require('socket.io');
const cors = require('cors');
const RealTimeMonitor = require('./src/webhooks/webhookHandler');
const IntelligentProcessor = require('./src/ai/intelligentProcessor');
const NotionService = require('./src/services/notionService');

console.log('🚀 Starting AI-Powered Real-time Dashboard...');

const app = express();
const server = http.createServer(app);
const io = socketIo(server, {
  cors: {
    origin: "http://localhost:3000",
    methods: ["GET", "POST"]
  }
});

app.use(express.json());
app.use(cors());

// Initialize services
const webhookMonitor = new RealTimeMonitor();
const aiProcessor = new IntelligentProcessor();
const notionService = new NotionService();

// Socket.io connection handling
io.on('connection', (socket) => {
  console.log('🔗 Client connected to dashboard');
  
  socket.on('disconnect', () => {
    console.log('❌ Client disconnected');
  });
});

// Test API connections on startup
async function initializeServices() {
  console.log('🔌 Testing API connections...');
  
  const notionTest = await notionService.testConnection();
  if (notionTest.success) {
    console.log('✅ Notion API connected');
  } else {
    console.log('❌ Notion API failed:', notionTest.error);
  }
  
  // Test database connection
  const db = aiProcessor.getDatabase();
  const dbTest = await db.testConnection();
  if (dbTest.success) {
    console.log('✅ Database connected');
  } else {
    console.log('⚠️ Database not configured - using memory mode');
  }
}

// Root route
app.get('/', (req, res) => {
  const stats = aiProcessor.getStats();
  res.json({
    message: '🤖 AI-Powered Real-time Dashboard',
    status: 'operational',
    timestamp: new Date().toISOString(),
    features: {
      ai: 'OpenAI & Claude analysis',
      notion: 'Task management integration',
      webhooks: 'Multi-service monitoring',
      realtime: 'Live event processing',
      database: 'Supabase persistence'
    },
    stats,
    endpoints: {
      health: '/health',
      tasks: '/api/tasks',
      events: '/api/events',
      notion: '/api/notion',
      'ai-test': '/api/ai-test'
    }
  });
});

app.get('/health', async (req, res) => {
  const stats = await aiProcessor.getStats();
  res.json({ 
    status: 'healthy', 
    timestamp: new Date().toISOString(),
    message: 'AI-powered analysis active!',
    stats
  });
});

// API Routes
app.get('/api/tasks', async (req, res) => {
  const stats = await aiProcessor.getStats();
  res.json({
    tasks: aiProcessor.getTopTasks(20),
    stats,
    timestamp: new Date()
  });
});

app.get('/api/events', async (req, res) => {
  const events = await aiProcessor.getRecentEvents(30);
  const stats = await aiProcessor.getStats();
  res.json({
    events,
    stats,
    timestamp: new Date()
  });
});

app.put('/api/tasks/:taskId/status', async (req, res) => {
  const { status } = req.body;
  const task = await aiProcessor.updateTaskStatus(req.params.taskId, status);
  
  if (task) {
    // Emit real-time update
    io.emit('task_updated', task);
    
    // Update stats
    const stats = await aiProcessor.getStats();
    io.emit('stats_update', stats);
    
    res.json({ success: true, task });
  } else {
    res.status(404).json({ error: 'Task not found' });
  }
});

// Notion integration routes
app.get('/api/notion/pages', async (req, res) => {
  try {
    const pages = await notionService.getRecentPages(10);
    res.json({ pages });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

app.get('/api/notion/databases', async (req, res) => {
  try {
    const databases = await notionService.getTaskDatabases();
    res.json({ databases });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

app.post('/api/notion/task', async (req, res) => {
  try {
    const { title, properties } = req.body;
    const result = await notionService.createTask(title, properties);
    res.json(result);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// AI Test endpoint
app.post('/api/ai-test', async (req, res) => {
  try {
    const { message, source = 'test' } = req.body;
    
    const testEvent = {
      source,
      type: 'manual_test',
      data: { message },
      timestamp: new Date(),
      priority: 3
    };

    console.log('🧪 Testing AI with manual event...');
    const result = await aiProcessor.processEvent(testEvent);
    
    // Emit real-time updates if new tasks were created
    if (result.newTasks.length > 0) {
      result.newTasks.forEach(task => {
        io.emit('new_task', task);
      });
      
      // Update stats
      const stats = await aiProcessor.getStats();
      io.emit('stats_update', stats);
    }
    
    // Emit the event to activity feed
    io.emit('new_event', result.event);
    
    res.json({
      success: true,
      message: 'AI analysis complete!',
      result
    });
  } catch (error) {
    console.error('AI test error:', error);
    res.status(500).json({ 
      error: error.message,
      suggestion: 'Check your OpenAI/Claude API keys in .env file'
    });
  }
});