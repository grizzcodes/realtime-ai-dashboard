// backend/src/ai/eventProcessor.js - Basic AI event processor
class AIEventProcessor {
  constructor() {
    this.events = [];
    this.tasks = new Map();
  }

  async processEvent(event) {
    console.log(`🤖 AI Processing: ${event.source} - ${event.type}`);
    
    // Store event
    this.events.push(event);
    
    // Simple AI-like analysis
    const analysis = this.analyzeEvent(event);
    
    // Create tasks if needed
    if (analysis.actionable) {
      const task = this.createTask(event, analysis);
      this.tasks.set(task.id, task);
      console.log(`📋 New task created: ${task.title}`);
    }

    return {
      event,
      analysis,
      tasks: Array.from(this.tasks.values()).slice(-10) // Last 10 tasks
    };
  }

  analyzeEvent(event) {
    const { source, type, data } = event;
    
    switch (source) {
      case 'slack':
        return this.analyzeSlackEvent(data);
      case 'gmail':
        return this.analyzeEmailEvent(data);
      case 'notion':
        return this.analyzeNotionEvent(data);
      default:
        return { actionable: false, urgency: 1 };
    }
  }

  analyzeSlackEvent(data) {
    const text = data.event?.text || '';
    const isDM = data.event?.channel_type === 'im';
    const hasMention = text.includes('<@');
    
    return {
      actionable: isDM || hasMention,
      urgency: isDM ? 4 : hasMention ? 3 : 1,
      summary: `Slack ${isDM ? 'DM' : 'mention'}: ${text.substring(0, 50)}...`,
      keywords: this.extractKeywords(text)
    };
  }

  analyzeEmailEvent(data) {
    const subject = data.subject || '';
    const isUrgent = subject.toLowerCase().includes('urgent');
    
    return {
      actionable: true,
      urgency: isUrgent ? 5 : 3,
      summary: `Email: ${subject}`,
      keywords: this.extractKeywords(subject)
    };
  }

  analyzeNotionEvent(data) {
    return {
      actionable: data.action === 'updated',
      urgency: 2,
      summary: `Notion ${data.action}: ${data.object}`,
      keywords: []
    };
  }

  extractKeywords(text) {
    const urgent = ['urgent', 'asap', 'emergency', 'critical'];
    const found = urgent.filter(word => 
      text.toLowerCase().includes(word)
    );
    return found;
  }

  createTask(event, analysis) {
    const id = `task-${Date.now()}`;
    return {
      id,
      title: analysis.summary,
      source: event.source,
      urgency: analysis.urgency,
      created: new Date(),
      status: 'pending',
      keywords: analysis.keywords
    };
  }

  getTasks() {
    return Array.from(this.tasks.values())
      .sort((a, b) => b.urgency - a.urgency);
  }
}

module.exports = AIEventProcessor;