// backend/main.js - Enhanced server with webhook processing
require('dotenv').config();

const express = require('express');
const RealTimeMonitor = require('./src/webhooks/webhookHandler');
const AIEventProcessor = require('./src/ai/eventProcessor');

console.log('🚀 Starting Real-time AI Dashboard System...');

const app = express();
app.use(express.json());

// Initialize components
const webhookMonitor = new RealTimeMonitor();
const aiProcessor = new AIEventProcessor();

// Root route
app.get('/', (req, res) => {
  res.json({
    message: '🚀 Real-time AI Dashboard - Day 2: Service Integration',
    status: 'operational',
    timestamp: new Date().toISOString(),
    features: {
      webhooks: 'Multi-service webhook handling',
      ai: 'Event processing and task creation',
      realtime: 'Live event monitoring'
    },
    endpoints: {
      health: '/health',
      tasks: '/api/tasks',
      events: '/api/events',
      webhooks: {
        slack: 'POST /webhooks/slack',
        gmail: 'POST /webhooks/gmail', 
        notion: 'POST /webhooks/notion',
        fireflies: 'POST /webhooks/fireflies'
      }
    }
  });
});

app.get('/health', (req, res) => {
  res.json({ 
    status: 'healthy', 
    timestamp: new Date().toISOString(),
    message: 'Day 2: Service integrations active!',
    stats: {
      events: aiProcessor.events.length,
      tasks: aiProcessor.tasks.size
    }
  });
});

// API routes
app.get('/api/tasks', (req, res) => {
  res.json({
    tasks: aiProcessor.getTasks(),
    total: aiProcessor.tasks.size,
    timestamp: new Date()
  });
});

app.get('/api/events', (req, res) => {
  res.json({
    events: aiProcessor.events.slice(-20), // Last 20 events
    total: aiProcessor.events.length,
    timestamp: new Date()
  });
});

// Set up event processing
const eventTypes = ['slack:message', 'gmail:new_email', 'notion:change', 'fireflies:transcript'];

eventTypes.forEach(eventType => {
  webhookMonitor.on(eventType, async (event) => {
    console.log(`📨 Event received: ${eventType}`);
    
    try {
      const result = await aiProcessor.processEvent(event);
      console.log(`✅ Event processed. Tasks: ${result.tasks.length}`);
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
app.listen(PORT, () => {
  console.log(`✅ Main server running on port ${PORT}`);
  console.log(`📊 Dashboard: http://localhost:${PORT}`);
});

webhookMonitor.start(WEBHOOK_PORT);

console.log('📧 Gmail notifications: Ready');
console.log('📝 Notion webhooks: Ready'); 
console.log('🎙️ Fireflies integration: Ready');
console.log('💬 Slack events: Ready');
console.log('🤖 AI processing: Active');
console.log('\n🎯 Next: Configure your Slack app webhook URL to:');
console.log(`   http://localhost:${WEBHOOK_PORT}/webhooks/slack`);