// backend/src/services/claudeService.js
class ClaudeService {
  constructor() {
    this.apiKey = process.env.ANTHROPIC_API_KEY;
    this.baseUrl = 'https://api.anthropic.com/v1';
  }

  async testConnection() {
    try {
      if (!this.apiKey) {
        return {
          success: false,
          error: 'Add ANTHROPIC_API_KEY to .env',
          needsAuth: true
        };
      }

      // Test with a simple message request
      const response = await fetch(`${this.baseUrl}/messages`, {
        method: 'POST',
        headers: {
          'x-api-key': this.apiKey,
          'anthropic-version': '2023-06-01',
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          model: 'claude-3-sonnet-20240229',
          max_tokens: 10,
          messages: [
            { role: 'user', content: 'Test' }
          ]
        })
      });

      if (!response.ok) {
        const error = await response.json();
        return {
          success: false,
          error: `Claude error: ${error.error?.message || response.statusText}`
        };
      }

      return {
        success: true,
        message: 'Claude connection successful'
      };
    } catch (error) {
      return {
        success: false,
        error: `Claude failed: ${error.message}`
      };
    }
  }

  async chat(message, context = {}) {
    try {
      if (!this.apiKey) {
        return {
          success: false,
          error: 'Claude API key not configured'
        };
      }

      const systemPrompt = this.buildSystemPrompt(context);
      
      const response = await fetch(`${this.baseUrl}/messages`, {
        method: 'POST',
        headers: {
          'x-api-key': this.apiKey,
          'anthropic-version': '2023-06-01',
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          model: 'claude-3-sonnet-20240229',
          max_tokens: 500,
          system: systemPrompt,
          messages: [
            { role: 'user', content: message }
          ]
        })
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error?.message || 'Claude API error');
      }

      const data = await response.json();
      
      return {
        success: true,
        response: data.content[0].text
      };
    } catch (error) {
      console.error('Claude chat error:', error);
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
}

Respond with ONLY the JSON, no other text.`;

      const response = await fetch(`${this.baseUrl}/messages`, {
        method: 'POST',
        headers: {
          'x-api-key': this.apiKey,
          'anthropic-version': '2023-06-01',
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          model: 'claude-3-sonnet-20240229',
          max_tokens: 300,
          system: 'You are a task management AI. Always respond with valid JSON only.',
          messages: [
            { role: 'user', content: prompt }
          ]
        })
      });

      const data = await response.json();
      let responseText = data.content[0].text.trim();
      
      // Clean up response to extract JSON
      if (responseText.includes('```json')) {
        responseText = responseText.replace(/```json\n?/g, '').replace(/```\n?/g, '');
      }
      
      const taskData = JSON.parse(responseText);
      
      const task = {
        id: `task-${Date.now()}`,
        ...taskData,
        source: context.source || 'claude',
        created: new Date(),
        status: 'pending',
        aiGenerated: true
      };

      return {
        success: true,
        task
      };
    } catch (error) {
      console.error('Claude task generation error:', error);
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

module.exports = ClaudeService;
