// backend/enhanced-magic-inbox-routes.js - New enhanced endpoints
// This file adds the enhanced magic inbox without breaking existing functionality

const EnhancedMagicInboxProcessor = require('./src/ai/enhancedMagicInboxProcessor');

// Initialize processor outside of route handlers
let enhancedProcessor = null;

function setupEnhancedMagicInboxRoutes(app, io, integrationService) {
  console.log('🎯 Setting up Enhanced Magic Inbox routes...');

  // Get enhanced magic inbox
  app.get('/api/ai/enhanced-magic-inbox', async (req, res) => {
    try {
      console.log('✨ Generating Enhanced Magic Inbox...');
      
      if (!enhancedProcessor) {
        enhancedProcessor = new EnhancedMagicInboxProcessor({
          gmail: integrationService.gmailService,
          notion: integrationService.notionService,
          fireflies: integrationService.firefliesService,
          openaiKey: process.env.OPENAI_API_KEY,
          claudeKey: process.env.ANTHROPIC_API_KEY
        });
      }
      
      const result = await enhancedProcessor.getCachedMagicInbox();
      res.json(result);
      
    } catch (error) {
      console.error('❌ Enhanced Magic Inbox failed:', error);
      res.status(500).json({
        success: false,
        error: error.message,
        data: { replySuggestions: [], quickWins: [], upcomingTasks: [], dailyGoals: [] }
      });
    }
  });

  // Add personal goal
  app.post('/api/ai/enhanced-magic-inbox/goals', async (req, res) => {
    try {
      const { goalText, category, reminderTime } = req.body;
      
      if (!goalText) {
        return res.status(400).json({ success: false, error: 'Goal text required' });
      }
      
      if (!enhancedProcessor) {
        enhancedProcessor = new EnhancedMagicInboxProcessor({
          gmail: integrationService.gmailService,
          notion: integrationService.notionService,
          fireflies: integrationService.firefliesService,
          openaiKey: process.env.OPENAI_API_KEY,
          claudeKey: process.env.ANTHROPIC_API_KEY
        });
      }
      
      const newGoal = await enhancedProcessor.addPersonalGoal(goalText, category, reminderTime);
      
      io.emit('goalAdded', { goal: newGoal, timestamp: new Date().toISOString() });
      
      res.json({ success: true, goal: newGoal });
      
    } catch (error) {
      console.error('❌ Failed to add goal:', error);
      res.status(500).json({ success: false, error: error.message });
    }
  });

  // Toggle quick win
  app.post('/api/ai/enhanced-magic-inbox/quick-wins/:winId/toggle', async (req, res) => {
    try {
      const { winId } = req.params;
      
      if (!enhancedProcessor) {
        return res.status(400).json({ success: false, error: 'Not initialized' });
      }
      
      const completed = await enhancedProcessor.toggleQuickWin(winId);
      
      io.emit('quickWinToggled', { winId, completed, timestamp: new Date().toISOString() });
      
      res.json({ success: true, winId, completed });
      
    } catch (error) {
      console.error('❌ Toggle failed:', error);
      res.status(500).json({ success: false, error: error.message });
    }
  });

  // Force refresh
  app.post('/api/ai/enhanced-magic-inbox/refresh', async (req, res) => {
    try {
      console.log('🔄 Force refreshing Enhanced Magic Inbox...');
      
      if (enhancedProcessor) {
        enhancedProcessor.cache = null; // Clear cache
      }
      
      const result = await enhancedProcessor.getCachedMagicInbox();
      
      io.emit('enhancedMagicInboxRefreshed', { data: result.data, timestamp: new Date().toISOString() });
      
      res.json(result);
      
    } catch (error) {
      console.error('❌ Refresh failed:', error);
      res.status(500).json({ success: false, error: error.message });
    }
  });

  console.log('✨ Enhanced Magic Inbox routes ready!');
}

module.exports = setupEnhancedMagicInboxRoutes;