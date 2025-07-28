// backend/src/ai/intelligentProcessor.js - Real AI with OpenAI & Claude
const axios = require('axios');

class IntelligentEventProcessor {
  constructor() {
    this.events = [];
    this.tasks = new Map();
    this.openaiKey = process.env.OPENAI_API_KEY;
    this.claudeKey = process.env.ANTHROPIC_API_KEY;
    
    console.log('🤖 AI Processor initialized with:');
    console.log(`   OpenAI: ${this.openaiKey ? '✅' : '❌'}`);
    console.log(`   Claude: ${this.claudeKey ? '✅' : '❌'}`);
  }

  async processEvent(event) {
    console.log(`🧠 AI analyzing: ${event.source} - ${event.type}`);
    
    // Store event
    this.events.push({
      ...event,
      id: `event-${Date.now()}`,
      processed: new Date()
    });

    try {
      // Get AI analysis
      const analysis = await this.getAIAnalysis(event);
      
      // Create tasks if needed
      const tasks = await this.createTasksFromAnalysis(event, analysis);
      
      console.log(`✅ AI Analysis complete: ${analysis.urgency}/5 urgency, ${tasks.length} tasks created`);
      
      return {
        event,
        analysis,
        newTasks: tasks,
        allTasks: this.getTopTasks()
      };
      
    } catch (error) {
      console.error('❌ AI processing failed:', error.message);
      return this.fallbackProcessing(event);
    }
  }

  async getAIAnalysis(event) {
    const prompt = this.buildAnalysisPrompt(event);
    
    // Try OpenAI first, fallback to Claude
    if (this.openaiKey) {
      return await this.callOpenAI(prompt);
    } else if (this.claudeKey) {
      return await this.callClaude(prompt);
    } else {
      throw new Error('No AI API keys configured');
    }
  }

  buildAnalysisPrompt(event) {
    return `Analyze this workplace event and provide actionable insights:

EVENT:
Source: ${event.source}
Type: ${event.type}
Data: ${JSON.stringify(event.data, null, 2)}
Timestamp: ${event.timestamp}

Please analyze and respond with JSON in this format:
{
  "urgency": 1-5,
  "actionable": true/false,
  "summary": "Brief description",
  "actionItems": ["specific action 1", "specific action 2"],
  "keyPeople": ["person1", "person2"],
  "deadline": "ISO date or null",
  "category": "email|meeting|task|notification|update",
  "tags": ["tag1", "tag2"],
  "confidence": 0.1-1.0
}

Focus on:
1. What actions need to be taken?
2. How urgent is this (1=low, 5=critical)?
3. Who needs to be involved?
4. Are there deadlines?
5. What category best fits this event?

Be specific and actionable.`;
  }

  async callOpenAI(prompt) {
    try {
      const response = await axios.post('https://api.openai.com/v1/chat/completions', {
        model: 'gpt-4',
        messages: [
          {
            role: 'system',
            content: 'You are an intelligent workplace assistant. Always respond with valid JSON only.'
          },
          {
            role: 'user',
            content: prompt
          }
        ],
        temperature: 0.3,
        max_tokens: 800
      }, {
        headers: {
          'Authorization': `Bearer ${this.openaiKey}`,
          'Content-Type': 'application/json'
        }
      });

      const content = response.data.choices[0].message.content;
      return JSON.parse(content);
      
    } catch (error) {
      console.error('OpenAI API error:', error.response?.data || error.message);
      throw error;
    }
  }

  async callClaude(prompt) {
    try {
      const response = await axios.post('https://api.anthropic.com/v1/messages', {
        model: 'claude-3-sonnet-20240229',
        max_tokens: 800,
        messages: [
          {
            role: 'user',
            content: prompt
          }
        ]
      }, {
        headers: {
          'x-api-key': this.claudeKey,
          'anthropic-version': '2023-06-01',
          'Content-Type': 'application/json'
        }
      });

      const content = response.data.content[0].text;
      return JSON.parse(content);
      
    } catch (error) {
      console.error('Claude API error:', error.response?.data || error.message);
      throw error;
    }
  }

  async createTasksFromAnalysis(event, analysis) {
    const tasks = [];
    
    if (analysis.actionable && analysis.actionItems) {
      for (const actionItem of analysis.actionItems) {
        const task = {
          id: `task-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
          title: actionItem,
          source: event.source,
          urgency: analysis.urgency,
          category: analysis.category,
          summary: analysis.summary,
          keyPeople: analysis.keyPeople || [],
          tags: analysis.tags || [],
          deadline: analysis.deadline ? new Date(analysis.deadline) : null,
          confidence: analysis.confidence,
          created: new Date(),
          status: 'pending',
          relatedEventId: event.id || `event-${Date.now()}`,
          aiGenerated: true
        };
        
        this.tasks.set(task.id, task);
        tasks.push(task);
        
        console.log(`📋 Task created: "${task.title}" (urgency: ${task.urgency})`);
      }
    }
    
    return tasks;
  }

  fallbackProcessing(event) {
    console.log('🔄 Using fallback processing...');
    
    const task = {
      id: `task-${Date.now()}`,
      title: `Review ${event.source} activity`,
      source: event.source,
      urgency: 2,
      category: 'notification',
      summary: `Manual review needed for ${event.source} event`,
      created: new Date(),
      status: 'pending',
      aiGenerated: false
    };
    
    this.tasks.set(task.id, task);
    
    return {
      event,
      analysis: {
        urgency: 2,
        actionable: true,
        summary: task.summary,
        confidence: 0.5
      },
      newTasks: [task],
      allTasks: this.getTopTasks()
    };
  }

  getTopTasks(limit = 10) {
    return Array.from(this.tasks.values())
      .filter(task => task.status === 'pending')
      .sort((a, b) => {
        // Sort by urgency first, then by creation date
        if (b.urgency !== a.urgency) {
          return b.urgency - a.urgency;
        }
        return new Date(b.created) - new Date(a.created);
      })
      .slice(0, limit);
  }

  getTaskById(taskId) {
    return this.tasks.get(taskId);
  }

  updateTaskStatus(taskId, status) {
    const task = this.tasks.get(taskId);
    if (task) {
      task.status = status;
      task.updated = new Date();
      if (status === 'completed') {
        task.completed = new Date();
      }
      this.tasks.set(taskId, task);
      return task;
    }
    return null;
  }

  getStats() {
    const allTasks = Array.from(this.tasks.values());
    return {
      totalEvents: this.events.length,
      totalTasks: allTasks.length,
      pendingTasks: allTasks.filter(t => t.status === 'pending').length,
      completedTasks: allTasks.filter(t => t.status === 'completed').length,
      highUrgencyTasks: allTasks.filter(t => t.urgency >= 4 && t.status === 'pending').length,
      aiGeneratedTasks: allTasks.filter(t => t.aiGenerated).length,
      lastEventTime: this.events.length > 0 ? this.events[this.events.length - 1].timestamp : null
    };
  }

  getRecentEvents(limit = 20) {
    return this.events.slice(-limit).reverse();
  }
}

module.exports = IntelligentEventProcessor;