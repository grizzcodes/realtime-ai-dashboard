// backend/src/routes/fireflies.js
const express = require('express');
const router = express.Router();
const FirefliesService = require('../services/firefliesService');

const firefliesService = new FirefliesService();
firefliesService.initialize();

// Get recent meetings
router.get('/meetings', async (req, res) => {
  try {
    console.log('🎙️ Fetching Fireflies meetings...');
    const result = await firefliesService.getMeetings();
    
    if (result.success) {
      res.json({
        success: true,
        meetings: result.meetings,
        count: result.meetings.length
      });
    } else {
      // Return demo data on failure
      res.json({
        success: true,
        meetings: [
          {
            id: 'demo-1',
            title: 'Weekly Team Standup',
            date: new Date().toISOString(),
            duration: '30m',
            attendees: 5,
            actionItems: ['Review sprint goals', 'Update client on progress']
          },
          {
            id: 'demo-2',
            title: 'Client Discovery Call',
            date: new Date(Date.now() - 24*60*60*1000).toISOString(),
            duration: '45m',
            attendees: 3,
            actionItems: ['Send proposal draft', 'Schedule technical demo']
          }
        ],
        count: 2,
        message: 'Using demo data - check API connection'
      });
    }
  } catch (error) {
    console.error('❌ Failed to get Fireflies meetings:', error);
    res.status(500).json({
      success: false,
      error: error.message,
      meetings: []
    });
  }
});

// Get recent transcripts
router.get('/transcripts', async (req, res) => {
  try {
    const limit = parseInt(req.query.limit) || 10;
    const result = await firefliesService.getRecentTranscripts(limit);
    
    res.json({
      success: result.success,
      transcripts: result.transcripts,
      count: result.transcripts.length
    });
  } catch (error) {
    console.error('❌ Failed to get transcripts:', error);
    res.status(500).json({
      success: false,
      error: error.message,
      transcripts: []
    });
  }
});

// Test connection
router.get('/test', async (req, res) => {
  try {
    const result = await firefliesService.testConnection();
    res.json(result);
  } catch (error) {
    console.error('❌ Fireflies test failed:', error);
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

module.exports = router;
