const Anthropic = require('@anthropic-ai/sdk');

class ClaudeService {
  constructor() {
    this.client = process.env.ANTHROPIC_API_KEY ? new Anthropic({
      apiKey: process.env.ANTHROPIC_API_KEY,
    }) : null;
  }

  async testConnection() {
    if (!this.client) {
      return { success: false, error: 'Anthropic API key not configured' };
    }

    try {
      const response = await this.client.messages.create({
        model: 'claude-3-sonnet-20240229',
        max_tokens: 10,
        messages: [{ role: 'user', content: 'Hello' }]
      });
      return { success: true, message: 'Claude connection successful' };
    } catch (error) {
      return { success: false, error: error.message };
    }
  }

  async generateTasksFromText(text) {
    if (!this.client) {
      return { success: false, error: 'Claude not configured' };
    }

    try {
      const response = await this.client.messages.create({
        model: 'claude-3-sonnet-20240229',
        max_tokens: 500,
        messages: [{
          role: 'user',
          content: `Extract tasks from this text: ${text}`
        }]
      });

      const tasks = [{
        id: `claude-${Date.now()}`,
        title: 'AI Generated Task',
        description: text,
        urgency: 3,
        assignee: 'Claude Assistant',
        status: 'pending',
        created: new Date(),
        source: 'claude'
      }];

      return { success: true, tasks };
    } catch (error) {
      return { success: false, error: error.message };
    }
  }
}

module.exports = ClaudeService;
