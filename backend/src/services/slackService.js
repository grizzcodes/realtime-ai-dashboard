// backend/src/services/slackService.js
const { WebClient } = require('@slack/web-api');

class SlackService {
  constructor() {
    this.slack = null;
    this.initialized = false;
  }

  async initialize() {
    try {
      if (!process.env.SLACK_BOT_TOKEN) {
        console.log('⚠️ Slack not configured - missing bot token');
        return { success: false, error: 'Missing Slack bot token' };
      }

      this.slack = new WebClient(process.env.SLACK_BOT_TOKEN);
      this.initialized = true;

      console.log('✅ Slack service initialized');
      return { success: true };
    } catch (error) {
      console.error('❌ Slack initialization failed:', error.message);
      return { success: false, error: error.message };
    }
  }

  async testConnection() {
    if (!this.initialized) {
      await this.initialize();
    }

    if (!this.initialized) {
      return { success: false, error: 'Slack not initialized' };
    }

    try {
      const response = await this.slack.auth.test();
      return { 
        success: true, 
        user: response.user,
        team: response.team 
      };
    } catch (error) {
      console.error('Slack connection test failed:', error.message);
      return { 
        success: false, 
        error: error.message 
      };
    }
  }

  async getRecentMessages(channel = 'general', limit = 10) {
    if (!this.initialized) {
      await this.initialize();
    }

    try {
      const response = await this.slack.conversations.history({
        channel,
        limit
      });

      return { 
        success: true, 
        messages: response.messages 
      };
    } catch (error) {
      console.error('Failed to get recent messages:', error.message);
      return { 
        success: false, 
        error: error.message 
      };
    }
  }

  async sendMessage(channel, text) {
    if (!this.initialized) {
      await this.initialize();
    }

    try {
      const response = await this.slack.chat.postMessage({
        channel,
        text
      });

      return { 
        success: true, 
        message: response 
      };
    } catch (error) {
      console.error('Failed to send message:', error.message);
      return { 
        success: false, 
        error: error.message 
      };
    }
  }
}

module.exports = SlackService;