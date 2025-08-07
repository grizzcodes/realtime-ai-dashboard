// backend/slack-fireflies-endpoints.js - Slack Fireflies integration endpoints

const SlackFirefliesService = require('./src/services/slackFirefliesService');

// Initialize service
const slackFirefliesService = new SlackFirefliesService();

// Initialize the service on startup
(async () => {
  const initResult = await slackFirefliesService.initialize();
  if (initResult.success) {
    console.log('✅ Slack Fireflies service ready');
  } else {
    console.log('⚠️ Slack Fireflies service not initialized:', initResult.error);
  }
})();

// Get Fireflies meetings from Slack
app.get('/api/slack-fireflies/meetings', async (req, res) => {
  try {
    console.log('🎙️ Fetching Fireflies meetings from Slack...');
    
    const result = await slackFirefliesService.getFirefliesMessages();
    
    if (result.success) {
      console.log(`✅ Found ${result.meetings.length} meetings from Slack`);
      res.json({
        success: true,
        meetings: result.meetings || [],
        count: result.meetings?.length || 0,
        source: 'slack'
      });
    } else {
      console.error('❌ Failed to get Slack meetings:', result.error);
      res.status(400).json({
        success: false,
        error: result.error,
        meetings: [],
        source: 'slack'
      });
    }
  } catch (error) {
    console.error('❌ Slack Fireflies endpoint error:', error);
    res.status(500).json({
      success: false,
      error: error.message,
      meetings: [],
      source: 'slack'
    });
  }
});

// Test Slack connection
app.get('/api/slack-fireflies/test', async (req, res) => {
  try {
    const result = await slackFirefliesService.testConnection();
    res.json(result);
  } catch (error) {
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

// Debug endpoint to see raw Slack messages
app.get('/api/slack-fireflies/debug', async (req, res) => {
  try {
    const result = await slackFirefliesService.getDebugInfo();
    res.json(result);
  } catch (error) {
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

console.log('🔧 Slack Fireflies endpoints loaded');
