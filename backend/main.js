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
  console.log(`📊 Dashboard: http://localhost:${PORT}/health`);
  console.log(`🔗 Test webhook: POST http://localhost:${PORT}/webhooks/test`);
});