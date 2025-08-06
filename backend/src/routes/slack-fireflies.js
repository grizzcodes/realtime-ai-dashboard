// backend/src/routes/slack-fireflies.js
const express = require('express');
const router = express.Router();
const SlackFirefliesService = require('../services/slackFirefliesService');

const slackFireflies = new SlackFirefliesService();

// Initialize on startup
slackFireflies.initialize().then(result => {
  if (result.success) {
    console.log('✅ Slack Fireflies service ready');
  } else {
    console.log('⚠️ Slack Fireflies service not available:', result.error);
  }
});

// Get meetings from Slack
router.get('/meetings', async (req, res) => {
  try {
    console.log('💬 Fetching Fireflies meetings from Slack...');
    
    const limit = parseInt(req.query.limit) || 50; // Get more messages to find meetings
    const result = await slackFireflies.getFirefliesMessages(limit);
    
    if (result.success && result.meetings.length > 0) {
      console.log(`✅ Found ${result.meetings.length} meetings in Slack`);
      res.json({
        success: true,
        meetings: result.meetings,
        count: result.meetings.length,
        source: 'slack'
      });
    } else {
      console.log('⚠️ No meetings found in Slack, checking messages...');
      res.json({
        success: true,
        meetings: [],
        count: 0,
        message: `Checked ${result.rawMessages || 0} Slack messages, no Fireflies summaries found`,
        source: 'slack'
      });
    }
  } catch (error) {
    console.error('❌ Failed to get Slack meetings:', error);
    res.status(500).json({
      success: false,
      error: error.message,
      meetings: []
    });
  }
});

// Test Slack connection
router.get('/test', async (req, res) => {
  try {
    console.log('🧪 Testing Slack connection...');
    const result = await slackFireflies.testConnection();
    res.json(result);
  } catch (error) {
    console.error('❌ Slack test failed:', error);
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

// Get channel info
router.get('/channel', async (req, res) => {
  try {
    console.log('📢 Getting Slack channel info...');
    
    if (!slackFireflies.initialized) {
      await slackFireflies.initialize();
    }
    
    res.json({
      success: true,
      initialized: slackFireflies.initialized,
      channelId: slackFireflies.channelId,
      channelName: slackFireflies.channelName
    });
  } catch (error) {
    console.error('❌ Failed to get channel info:', error);
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

// Debug endpoint to see raw messages
router.get('/debug', async (req, res) => {
  try {
    console.log('🔍 Debug: Getting raw Slack messages...');
    
    if (!slackFireflies.initialized) {
      await slackFireflies.initialize();
    }
    
    let messages = [];
    if (slackFireflies.channelId) {
      messages = await slackFireflies.getChannelMessages(slackFireflies.channelId, 10);
    } else {
      messages = await slackFireflies.searchFirefliesMessages(10);
    }
    
    // Sanitize messages for debug output
    const sanitized = messages.map(msg => ({
      text: msg.text?.substring(0, 200) + '...',
      timestamp: new Date(parseFloat(msg.ts) * 1000).toISOString(),
      user: msg.user,
      isFireflies: slackFireflies.isFirefliesSummary(msg.text || '')
    }));
    
    res.json({
      success: true,
      channelId: slackFireflies.channelId,
      messagesFound: messages.length,
      messages: sanitized
    });
  } catch (error) {
    console.error('❌ Debug failed:', error);
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

module.exports = router;
