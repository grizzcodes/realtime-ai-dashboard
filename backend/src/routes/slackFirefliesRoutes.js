// backend/src/routes/slackFirefliesRoutes.js
const express = require('express');
const router = express.Router();
const SlackFirefliesService = require('../services/slackFirefliesService');

// Initialize service
const slackService = new SlackFirefliesService();

// Test connection
router.get('/test', async (req, res) => {
  try {
    const result = await slackService.testConnection();
    res.json(result);
  } catch (error) {
    res.status(500).json({ 
      success: false, 
      error: error.message 
    });
  }
});

// Check channel
router.get('/channel', async (req, res) => {
  try {
    const result = await slackService.initialize();
    res.json({
      success: result.success,
      initialized: slackService.initialized,
      channelId: slackService.channelId,
      channelName: slackService.channelName,
      error: result.error
    });
  } catch (error) {
    res.status(500).json({ 
      success: false, 
      error: error.message 
    });
  }
});

// Get debug info - shows raw messages
router.get('/debug', async (req, res) => {
  try {
    const result = await slackService.getDebugInfo();
    res.json(result);
  } catch (error) {
    res.status(500).json({ 
      success: false, 
      error: error.message 
    });
  }
});

// Get Fireflies meetings from Slack
router.get('/meetings', async (req, res) => {
  try {
    const limit = parseInt(req.query.limit) || 50;
    const result = await slackService.getFirefliesMessages(limit);
    
    // Always return success true with meetings array
    res.json({
      success: true,
      meetings: result.meetings || [],
      count: result.count || 0,
      message: result.message,
      source: 'slack'
    });
  } catch (error) {
    console.error('Error in /meetings route:', error);
    res.json({ 
      success: true,
      meetings: [],
      count: 0,
      error: error.message,
      source: 'slack'
    });
  }
});

module.exports = router;
