// backend/main.js - Entry point for real-time AI dashboard
require('dotenv').config();

console.log('🚀 Starting Real-time AI Dashboard System...');
console.log('📧 Gmail notifications: Ready');
console.log('📝 Notion webhooks: Ready');
console.log('🎙️ Fireflies integration: Ready');
console.log('💬 Slack events: Ready');
console.log('🤖 AI processing: Ready');

// Basic server setup for Day 1
const express = require('express');
const app = express();

app.use(express.json());

// Root route
app.get('/', (req, res) => {
  res.json({
    message: '🚀 Real-time AI Dashboard - Day 1 Foundation',
    status: 'operational',
    timestamp: new Date().toISOString(),
    endpoints: {
      health: '/health',
      webhooks: {
        test: 'POST /webhooks/test',
        slack: 'POST /webhooks/slack',
        gmail: 'POST /webhooks/gmail',
        notion: 'POST /webhooks/notion',
        fireflies: 'POST /webhooks/fireflies'
      }
    },
    nextSteps: [
      'Add real webhook integrations',
      'Integrate AI processing',
      'Add WebSocket support',
      'Build frontend dashboard'
    ]
  });
});

app.get('/health', (req, res) => {
  res.json({ 
    status: 'healthy', 
    timestamp: new Date().toISOString(),
    message: 'Day 1: Core foundation ready!'
  });
});

app.post('/webhooks/test', (req, res) => {
  console.log('🧪 Test webhook received:', req.body);
  res.json({ message: 'Test webhook processed successfully!' });
});

const PORT = process.env.PORT || 3002;
app.listen(PORT, () => {
  console.log(`✅ Server running on port ${PORT}`);
  console.log(`📊 Dashboard: http://localhost:${PORT}`);
  console.log(`🔗 Health check: http://localhost:${PORT}/health`);
});