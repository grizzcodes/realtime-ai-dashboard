// backend/main.js - Enhanced AI-Powered Real-time Dashboard Server
require('dotenv').config();

const express = require('express');
const http = require('http');
const socketIo = require('socket.io');
const cors = require('cors');
const RealTimeMonitor = require('./src/webhooks/webhookHandler');
const IntelligentProcessor = require('./src/ai/intelligentProcessor');
const NotionService = require('./src/services/notionService');
const GmailService = require('./src/services/gmailService');

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
const gmailService = new GmailService();

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

  const gmailTest = await gmailService.testConnection();
  if (gmailTest.success) {
    console.log('✅ Gmail API connected');
  } else {
    console.log('❌ Gmail API failed:', gmailTest.error);
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
      gmail: 'Email monitoring',
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
      gmail: '/api/gmail',
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

// Gmail integration routes
app.get('/api/gmail/emails', async (req, res) => {
  try {
    const result = await gmailService.getRecentEmails(10);
    res.json(result);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

app.get('/api/gmail/email/:id', async (req, res) => {
  try {
    const result = await gmailService.getEmailContent(req.params.id);
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

// Enhanced event processing with real-time updates
const eventTypes = ['slack:message', 'gmail:new_email', 'notion:change', 'fireflies:transcript'];

eventTypes.forEach(eventType => {
  webhookMonitor.on(eventType, async (event) => {
    console.log(`📨 Processing: ${eventType}`);
    
    try {
      // For Gmail events, get full email content
      if (eventType === 'gmail:new_email' && event.data.messageId) {
        const emailResult = await gmailService.getEmailContent(event.data.messageId);
        if (emailResult.success) {
          event.data.emailContent = emailResult.email;
        }
      }

      // AI analysis
      const result = await aiProcessor.processEvent(event);
      
      // Emit real-time updates
      io.emit('new_event', result.event);
      
      if (result.newTasks.length > 0) {
        result.newTasks.forEach(task => {
          io.emit('new_task', task);
          console.log(`📡 Broadcasting new task: ${task.title}`);
        });
        
        // Update stats
        const stats = await aiProcessor.getStats();
        io.emit('stats_update', stats);
      }
      
      // Optionally sync high-priority tasks to Notion
      if (result.newTasks.length > 0) {
        for (const task of result.newTasks) {
          if (task.urgency >= 4) { // High priority tasks
            console.log(`📝 Syncing high-priority task to Notion: ${task.title}`);
            await notionService.createTask(task.title, {
              Status: { select: { name: 'Todo' } },
              Priority: { select: { name: 'High' } },
              Source: { rich_text: [{ text: { content: task.source } }] }
            });
          }
        }
      }
      
      console.log(`✅ Event processed: ${result.newTasks.length} tasks, urgency ${result.analysis.urgency}/5`);
    } catch (error) {
      console.error('❌ Processing error:', error.message);
    }
  });
});

// Mount webhook routes
app.use('/webhooks', webhookMonitor.app);

const PORT = process.env.PORT || 3002;
const WEBHOOK_PORT = 3001;

// Start servers
server.listen(PORT, async () => {
  console.log(`✅ AI Dashboard server running on port ${PORT}`);
  console.log(`📊 Dashboard: http://localhost:${PORT}`);
  console.log(`🔗 WebSocket server active for real-time updates`);
  console.log(`🧪 Test AI: POST http://localhost:${PORT}/api/ai-test`);
  
  await initializeServices();
});

webhookMonitor.start(WEBHOOK_PORT);

console.log('🎯 Ready for action! Try these:');
console.log('1. Visit http://localhost:3002 to see the dashboard');
console.log('2. Start frontend: cd frontend && npm start');
console.log('3. Test AI with curl command or dashboard button');
console.log('4. Check tasks: http://localhost:3002/api/tasks');
console.log('5. View Notion pages: http://localhost:3002/api/notion/pages');
console.log('6. View Gmail emails: http://localhost:3002/api/gmail/emails');

// Handle graceful shutdown
process.on('SIGINT', () => {
  console.log('🛑 Shutting down gracefully...');
  webhookMonitor.stop();
  server.close(() => {
    console.log('✅ Server stopped');
    process.exit(0);
  });
});