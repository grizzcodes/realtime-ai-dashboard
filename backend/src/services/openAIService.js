const OpenAI = require('openai');

class OpenAIService {
  constructor() {
    this.client = process.env.OPENAI_API_KEY ? new OpenAI({
      apiKey: process.env.OPENAI_API_KEY,
    }) : null;
  }

  async testConnection() {
    if (!this.client) {
      return { success: false, error: 'OpenAI API key not configured' };
    }

    try {
      const response = await this.client.models.list();
      return { success: true, message: 'OpenAI connection successful' };
    } catch (error) {
      return { success: false, error: error.message };
    }
  }

  async processMessage(message, conversationHistory = []) {
    if (!this.client) {
      return { success: false, error: 'OpenAI not configured' };
    }

    try {
      const completion = await this.client.chat.completions.create({
        model: 'gpt-4',
        messages: [{ role: 'user', content: message }],
        max_tokens: 1000,
      });

      return { 
        success: true, 
        content: completion.choices[0].message.content,
        response: completion.choices[0].message.content 
      };
    } catch (error) {
      return { success: false, error: error.message };
    }
  }

  async generateTasksFromText(text) {
    if (!this.client) {
      return { success: false, error: 'OpenAI not configured' };
    }

    try {
      const completion = await this.client.chat.completions.create({
        model: 'gpt-4',
        messages: [
          {
            role: 'system',
            content: 'Extract tasks from the given text and return as JSON array with title, description, urgency (1-5), and assignee fields.'
          },
          {
            role: 'user',
            content: text
          }
        ],
        max_tokens: 500,
      });

      const tasks = [{
        id: `openai-${Date.now()}`,
        title: 'AI Generated Task',
        description: text,
        urgency: 3,
        assignee: 'AI Assistant',
        status: 'pending',
        created: new Date(),
        source: 'openai'
      }];

      return { success: true, tasks };
    } catch (error) {
      return { success: false, error: error.message };
    }
  }
}

module.exports = OpenAIService;