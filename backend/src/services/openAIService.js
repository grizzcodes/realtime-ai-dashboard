// backend/src/services/openAIService.js
const fetch = require('node-fetch');

class OpenAIService {
  constructor() {
    this.apiKey = process.env.OPENAI_API_KEY;
    this.baseUrl = 'https://api.openai.com/v1';
  }

  async testConnection() {
    try {
      if (!this.apiKey) {
        return {
          success: false,
          error: 'Add OPENAI_API_KEY to .env',
          needsAuth: true
        };
      }

      const response = await fetch(`${this.baseUrl}/models`, {
        headers: {
          'Authorization': `Bearer ${this.apiKey}`,
          'Content-Type': 'application/json'
        }
      });

      if (!response.ok) {
        const error = await response.json();
        return {
          success: false,
          error: `OpenAI error: ${error.error?.message || response.statusText}`
        };
      }

      return {
        success: true,
        message: 'OpenAI connection successful'
      };
    } catch (error) {
      return {
        success: false,
        error: `OpenAI failed: ${error.message}`
      };
    }
  }

  async chat(message, context = {}) {
    try {
      if (!this.apiKey) {
        return {
          success: false,
          error: 'OpenAI API key not configured'
        };
      }

      const systemPrompt = this.buildSystemPrompt(context);
      
      const response = await fetch(`${this.baseUrl}/chat/completions`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${this.apiKey}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          model: 'gpt-4',
          messages: [
            { role: 'system', content: systemPrompt },
            { role: 'user', content: message }
          ],
          max_tokens: 500,
          temperature: 0.7
        })
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error?.message || 'OpenAI API error');
      }

      const data = await response.json();
      
      return {
        success: true,
        response: data.choices[0].message.content
      };
    } catch (error) {
      console.error('OpenAI chat error:', error);
      return {
        success: false,
        error: error.message,
        response: 'Sorry, I encountered an error.'
      };
    }
  }

  async generateTask(message, context = {}) {
    try {
      const prompt = `Analyze this message and create a structured task: "${message}"

Return JSON in this format:
{
  "title": "Task title",
  "urgency": 1-5,
  "category": "task|meeting|email|notification",
  "summary": "Brief description",
  "deadline": "ISO date or null",
  "tags": ["tag1", "tag2"]
}`;

      const response = await fetch(`${this.baseUrl}/chat/completions`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${this.apiKey}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          model: 'gpt-4',
          messages: [
            { role: 'system', content: 'You are a task management AI. Always respond with valid JSON only.' },
            { role: 'user', content: prompt }
          ],
          max_tokens: 300,
          temperature: 0.3
        })
      });

      const data = await response.json();
      const taskData = JSON.parse(data.choices[0].message.content);
      
      const task = {
        id: `task-${Date.now()}`,
        ...taskData,
        source: context.source || 'openai',
        created: new Date(),
        status: 'pending',
        aiGenerated: true
      };

      return {
        success: true,
        task
      };
    } catch (error) {
      console.error('OpenAI task generation error:', error);
      return {
        success: false,
        error: error.message
      };
    }
  }

  buildSystemPrompt(context) {
    let prompt = `You are an AI assistant helping with productivity and task management. You have access to the user's current context:`;
    
    if (context.tasks?.length > 0) {
      prompt += `\n\nCurrent tasks: ${context.tasks.map(t => `- ${t.title} (${t.status})`).join('\n')}`;
    }
    
    if (context.emails?.length > 0) {
      prompt += `\n\nRecent emails: ${context.emails.map(e => `- ${e.subject} from ${e.from}`).join('\n')}`;
    }
    
    prompt += `\n\nBe helpful, concise, and actionable. If asked about productivity or tasks, consider the current context.`;
    
    return prompt;
  }
}

module.exports = OpenAIService;
