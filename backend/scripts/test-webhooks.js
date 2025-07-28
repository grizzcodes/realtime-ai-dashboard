#!/usr/bin/env node
// backend/scripts/test-webhooks.js - Test script for webhook endpoints

const axios = require('axios');

const BASE_URL = 'http://localhost:3002';

async function testWebhooks() {
  console.log('🧪 Testing Real-time AI Dashboard Webhooks...\n');

  try {
    // Test health endpoint
    console.log('1. Testing health endpoint...');
    const health = await axios.get(`${BASE_URL}/health`);
    console.log('✅ Health check:', health.data.message);

    // Test webhook endpoint
    console.log('\n2. Testing webhook endpoint...');
    const webhook = await axios.post(`${BASE_URL}/webhooks/test`, {
      source: 'slack',
      type: 'message',
      data: {
        text: 'Test message from webhook test script',
        user: 'test-user',
        channel: 'test-channel'
      }
    });
    console.log('✅ Webhook test:', webhook.data.message);

    console.log('\n🎉 All tests passed! Day 1 foundation is working.');
    console.log('📋 Next steps:');
    console.log('   - Add real webhook handlers');
    console.log('   - Integrate AI processing');
    console.log('   - Add WebSocket support');
    
  } catch (error) {
    console.error('❌ Test failed:', error.message);
    console.log('💡 Make sure the server is running: npm start');
  }
}

// Run tests
testWebhooks();