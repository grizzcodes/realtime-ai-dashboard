// backend/main.js - AI-Powered Real-time Dashboard Server
require('dotenv').config();

const express = require('express');
const RealTimeMonitor = require('./src/webhooks/webhookHandler');
const IntelligentProcessor = require('./src/ai/intelligentProcessor');
const NotionService = require('./src/services/notionService');

console.log('🚀 Starting AI-Powered Real-time Dashboard...');

const app = express();
app.use(express.json());

// Initialize services
const webhookMonitor = new RealTimeMonitor();
const aiProcessor = new IntelligentProcessor();
const notionService = new NotionService();

// Test API connections on startup
async function initializeServices() {
  console.log('🔌 Testing API connections...');
  
  const notionTest = await notionService.testConnection();
  if (notionTest.success) {
    console.log('✅ Notion API connected');
  } else {
    console.log('❌ Notion API failed:', notionTest.error);
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
      realtime: 'Live event processing'
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

app.get('/health', (req, res) => {
  const stats = aiProcessor.getStats();
  res.json({ 
    status: 'healthy', 
    timestamp: new Date().toISOString(),
    message: 'AI-powered analysis active!',
    stats
  });
});

// API Routes
app.get('/api/tasks', (req, res) => {
  res.json({
    tasks: aiProcessor.getTopTasks(20),
    stats: aiProcessor.getStats(),
    timestamp: new Date()
  });
});

app.get('/api/events', (req, res) => {
  res.json({
    events: aiProcessor.getRecentEvents(30),
    stats: aiProcessor.getStats(),
    timestamp: new Date()
  });
});

app.put('/api/tasks/:taskId/status', (req, res) => {
  const { status } = req.body;
  const task = aiProcessor.updateTaskStatus(req.params.taskId, status);
  
  if (task) {
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

// Enhanced event processing with AI and Notion integration
const eventTypes = ['slack:message', 'gmail:new_email', 'notion:change', 'fireflies:transcript'];

eventTypes.forEach(eventType => {
  webhookMonitor.on(eventType, async (event) => {
    console.log(`📨 Processing: ${eventType}`);
    
    try {
      // AI analysis
      const result = await aiProcessor.processEvent(event);
      
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
app.listen(PORT, async () => {
  console.log(`✅ AI Dashboard server running on port ${PORT}`);
  console.log(`📊 Dashboard: http://localhost:${PORT}`);
  console.log(`🧪 Test AI: POST http://localhost:${PORT}/api/ai-test`);
  
  await initializeServices();
});

webhookMonitor.start(WEBHOOK_PORT);

console.log('\\n🎯 Ready for action! Try these:');
console.log('1. Visit http://localhost:3002 to see the dashboard');
console.log('2. Test AI: curl -X POST http://localhost:3002/api/ai-test -H \"Content-Type: application/json\" -d \\'{\\"message\\": \\"Urgent: Client meeting needs rescheduling!\\"}\\' ');
console.log('3. Check tasks: http://localhost:3002/api/tasks');
console.log('4. View Notion pages: http://localhost:3002/api/notion/pages');