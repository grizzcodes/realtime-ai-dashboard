// backend/src/ai/unifiedAIService.js
// Unified AI service that handles both OpenAI and Claude with different modes and action execution

const OpenAI = require('openai');
const Anthropic = require('@anthropic-ai/sdk');
const ActionExecutor = require('./actionExecutor');

class UnifiedAIService {
  constructor(memoryManager, contextManager, integrationService) {
    this.memory = memoryManager;
    this.context = contextManager;
    this.integrations = integrationService;
    
    // Initialize action executor
    this.actionExecutor = new ActionExecutor(integrationService, memoryManager);
    
    // Initialize OpenAI if available
    if (process.env.OPENAI_API_KEY) {
      this.openai = new OpenAI({
        apiKey: process.env.OPENAI_API_KEY
      });
      console.log('✅ OpenAI initialized');
    }
    
    // Initialize Claude if available
    if (process.env.ANTHROPIC_API_KEY) {
      this.anthropic = new Anthropic({
        apiKey: process.env.ANTHROPIC_API_KEY
      });
      console.log('✅ Claude initialized');
    }
    
    // Define AI modes with specific system prompts - now with action capabilities
    this.modes = {
      emailResponder: {
        name: 'Email Responder',
        systemPrompt: `You are an professional email assistant for DGenz with FULL EMAIL ACCESS. You can:
- Archive, delete, and manage emails directly
- Draft and send responses
- Mark emails as read/unread
- Star important emails

Your responses should be professional yet friendly. When asked to perform email actions, confirm what you're doing.
Available commands: archive_email, delete_email, draft_reply, send_email, mark_as_read, star_email`,
        model: 'gpt-4',
        canExecuteActions: true
      },
      
      creativeIdeas: {
        name: 'Creative Ideas Generator',
        systemPrompt: `You are a creative strategist for DGenz. Your role is to:
- Generate innovative ideas and solutions
- Think outside the box
- Connect disparate concepts
- Propose unique approaches to problems
- Consider market trends and opportunities
Be bold, creative, and push boundaries while remaining practical.`,
        model: 'gpt-4',
        canExecuteActions: false
      },
      
      taskManager: {
        name: 'Task Manager',
        systemPrompt: `You are a productivity assistant with FULL TASK MANAGEMENT ACCESS. You can:
- Create, update, and complete tasks in Notion
- Assign tasks to team members
- Set priorities and due dates
- Push action items from meetings to Notion

When asked to manage tasks, confirm the action you're taking.
Available commands: create_task, update_task, complete_task, assign_task, push_to_notion`,
        model: 'gpt-4',
        canExecuteActions: true
      },
      
      analyst: {
        name: 'Data Analyst',
        systemPrompt: `You are a data analyst with FULL SYSTEM ACCESS. You can:
- Analyze email patterns and response times
- Review task completion rates
- Generate comprehensive reports
- Identify trends and anomalies

Available commands: analyze_emails, analyze_tasks, generate_report`,
        model: 'gpt-4',
        canExecuteActions: true
      },
      
      assistant: {
        name: 'General Assistant',
        systemPrompt: `You are a helpful AI assistant for DGenz with FULL SYSTEM ACCESS. You can:
- Perform ANY action across integrated systems
- Archive/delete emails
- Create/manage tasks
- Schedule meetings
- Send Slack messages
- Remember information about clients and team

When asked to perform an action, confirm what you're doing and execute it.
Available commands: ALL (email, task, calendar, slack, analysis, memory operations)`,
        model: 'gpt-4',
        canExecuteActions: true
      }
    };
    
    this.currentMode = 'assistant';
  }

  setMode(modeName) {
    if (this.modes[modeName]) {
      this.currentMode = modeName;
      console.log(`🎭 AI mode set to: ${this.modes[modeName].name}`);
      return true;
    }
    return false;
  }

  async processMessage(message, options = {}) {
    const mode = options.mode || this.currentMode;
    const modeConfig = this.modes[mode];
    
    // Gather context based on the message
    const fullContext = await this.context.gatherFullContext(message, {
      includeSlack: options.includeSlack || false
    });
    
    // Build the context prompt
    const contextPrompt = this.buildContextPrompt(fullContext);
    
    // Add action capabilities to system prompt
    const actionPrompt = modeConfig.canExecuteActions ? 
      `\n\nIMPORTANT: You have the ability to EXECUTE ACTIONS directly. When the user asks you to do something, actually do it using the available commands, don't just describe what they should do.` : '';
    
    // Combine system prompt with context
    const systemPrompt = `${modeConfig.systemPrompt}${actionPrompt}\n\nCurrent Context:\n${contextPrompt}`;
    
    // Try to get response from AI
    let response = null;
    let usedModel = null;
    
    // Try OpenAI first if available
    if (this.openai && !options.preferClaude) {
      try {
        response = await this.callOpenAI(message, systemPrompt, options);
        usedModel = 'OpenAI';
      } catch (error) {
        console.error('OpenAI failed:', error.message);
      }
    }
    
    // Try Claude if OpenAI failed or if preferred
    if (!response && this.anthropic) {
      try {
        response = await this.callClaude(message, systemPrompt, options);
        usedModel = 'Claude';
      } catch (error) {
        console.error('Claude failed:', error.message);
      }
    }
    
    // Fallback response if both fail
    if (!response) {
      response = this.generateFallbackResponse(message, mode);
      usedModel = 'Fallback';
    }
    
    // Check if we should execute an action
    let actionResult = null;
    if (modeConfig.canExecuteActions && !options.skipActions) {
      actionResult = await this.actionExecutor.parseAndExecute(message, response);
      
      // If action was successful, enhance the response
      if (actionResult && actionResult.success) {
        response = this.enhanceResponseWithAction(response, actionResult);
      }
    }
    
    // Log the interaction for learning
    const entities = this.memory.extractEntities(message);
    if (entities.clients.length > 0) {
      await this.memory.logInteraction('client', entities.clients[0].name, mode, message, response);
    } else if (entities.team.length > 0) {
      await this.memory.logInteraction('team', entities.team[0].name, mode, message, response);
    }
    
    return {
      response,
      mode: modeConfig.name,
      model: usedModel,
      context: fullContext,
      actionResult: actionResult,
      timestamp: new Date().toISOString()
    };
  }

  enhanceResponseWithAction(aiResponse, actionResult) {
    // Add confirmation of the action to the AI response
    const actionConfirmation = `\n\n✅ **Action Completed**: ${actionResult.message}`;
    
    // If the response doesn't already mention the action, add it
    if (!aiResponse.toLowerCase().includes(actionResult.action.replace('_', ' '))) {
      return aiResponse + actionConfirmation;
    }
    
    return aiResponse;
  }

  async callOpenAI(message, systemPrompt, options = {}) {
    const completion = await this.openai.chat.completions.create({
      model: options.model || 'gpt-4-turbo-preview',
      messages: [
        { role: 'system', content: systemPrompt },
        { role: 'user', content: message }
      ],
      temperature: options.temperature || 0.7,
      max_tokens: options.maxTokens || 1000
    });
    
    return completion.choices[0].message.content;
  }

  async callClaude(message, systemPrompt, options = {}) {
    const response = await this.anthropic.messages.create({
      model: options.model || 'claude-3-opus-20240229',
      system: systemPrompt,
      messages: [
        { role: 'user', content: message }
      ],
      max_tokens: options.maxTokens || 1000,
      temperature: options.temperature || 0.7
    });
    
    return response.content[0].text;
  }

  buildContextPrompt(context) {
    let prompt = [];
    
    // Add memory context
    if (context.memories) {
      if (context.memories.clients?.length > 0) {
        prompt.push('Known Clients:');
        context.memories.clients.forEach(client => {
          prompt.push(`- ${client.name}: ${client.company || 'N/A'}, ${client.notes || 'No notes'}`);
        });
      }
      
      if (context.memories.team?.length > 0) {
        prompt.push('\nTeam Members:');
        context.memories.team.forEach(member => {
          prompt.push(`- ${member.name}: ${member.role || 'N/A'}, Current projects: ${member.current_projects?.join(', ') || 'None'}`);
        });
      }
    }
    
    // Add current tasks
    if (context.currentData?.tasks?.length > 0) {
      const urgentTasks = context.currentData.tasks
        .filter(t => t.priority === 'High' || t.priority === 'Urgent')
        .slice(0, 5);
      
      if (urgentTasks.length > 0) {
        prompt.push('\nUrgent Tasks:');
        urgentTasks.forEach(task => {
          prompt.push(`- ${task.title} (${task.assignee}) - Due: ${task.dueDate || 'No deadline'}`);
        });
      }
    }
    
    // Add upcoming events
    if (context.currentData?.upcomingEvents?.length > 0) {
      prompt.push('\nUpcoming Events:');
      context.currentData.upcomingEvents.slice(0, 3).forEach(event => {
        prompt.push(`- ${event.title} at ${new Date(event.startTime).toLocaleString()}`);
      });
    }
    
    // Add recent emails summary
    if (context.currentData?.recentEmails?.length > 0) {
      prompt.push('\nRecent Emails:');
      context.currentData.recentEmails.slice(0, 3).forEach(email => {
        prompt.push(`- From ${email.from}: ${email.subject}`);
      });
    }
    
    return prompt.join('\n');
  }

  generateFallbackResponse(message, mode) {
    const responses = {
      emailResponder: "I'll help you draft a response. Based on the context, I suggest acknowledging the message and providing a clear next step.",
      creativeIdeas: "Here's a creative approach: Consider exploring unconventional solutions that combine existing resources in new ways.",
      taskManager: "Let me help organize this. I recommend prioritizing based on urgency and dependencies.",
      analyst: "Based on the available data, I can see patterns that suggest focusing on key metrics.",
      assistant: "I understand your request. Let me help you with that based on the information available."
    };
    
    return responses[mode] || "I'm here to help. Could you provide more details about what you need?";
  }

  // Direct action methods for explicit commands
  async executeDirectAction(action, params) {
    return await this.actionExecutor.executeAction(action, params);
  }

  // Special function for email responses
  async generateEmailResponse(emailContext, tone = 'professional') {
    this.setMode('emailResponder');
    
    const prompt = `
Email from: ${emailContext.email.from}
Subject: ${emailContext.email.subject}
Content: ${emailContext.email.snippet}

Sender context: ${emailContext.sender ? JSON.stringify(emailContext.sender) : 'Unknown sender'}
Previous interactions: ${emailContext.previousEmails.length} emails

Generate a ${tone} response that:
1. Acknowledges their message
2. Addresses their concerns/questions
3. Provides clear next steps
4. Maintains appropriate relationship tone
`;
    
    return await this.processMessage(prompt, { mode: 'emailResponder' });
  }

  // Special function for task creation
  async analyzeForTask(content, source) {
    this.setMode('taskManager');
    
    const prompt = `
Analyze this content and create a task:
Source: ${source}
Content: ${content}

Extract:
1. Task title (clear and actionable)
2. Priority (Urgent/High/Medium/Low)
3. Suggested assignee based on context
4. Due date recommendation
5. Any subtasks or dependencies
`;
    
    return await this.processMessage(prompt, { mode: 'taskManager' });
  }

  // Special function for creative brainstorming
  async brainstorm(topic, constraints = []) {
    this.setMode('creativeIdeas');
    
    const prompt = `
Brainstorm creative ideas for: ${topic}

Constraints:
${constraints.join('\n')}

Generate:
1. 5 innovative ideas
2. Pros and cons for each
3. Implementation approach
4. Potential challenges
5. Success metrics
`;
    
    return await this.processMessage(prompt, { mode: 'creativeIdeas' });
  }

  // Special function for data analysis
  async analyzeData(dataType, timeframe = '7days') {
    this.setMode('analyst');
    
    const prompt = `
Analyze ${dataType} data for the past ${timeframe}.

Provide:
1. Key trends and patterns
2. Anomalies or concerns
3. Performance metrics
4. Recommendations
5. Predicted outcomes
`;
    
    return await this.processMessage(prompt, { mode: 'analyst' });
  }

  // Get available actions for current mode
  getAvailableActions() {
    const modeConfig = this.modes[this.currentMode];
    if (!modeConfig.canExecuteActions) {
      return [];
    }
    
    const modeActions = {
      emailResponder: ['archive_email', 'delete_email', 'draft_reply', 'send_email', 'mark_as_read', 'star_email'],
      taskManager: ['create_task', 'update_task', 'complete_task', 'assign_task', 'push_to_notion'],
      analyst: ['analyze_emails', 'analyze_tasks', 'generate_report'],
      assistant: Object.keys(this.actionExecutor.actions) // All actions
    };
    
    return modeActions[this.currentMode] || [];
  }

  // Get available modes
  getAvailableModes() {
    return Object.keys(this.modes).map(key => ({
      id: key,
      name: this.modes[key].name,
      description: this.modes[key].systemPrompt.split('\n')[0],
      canExecuteActions: this.modes[key].canExecuteActions,
      availableActions: this.modes[key].canExecuteActions ? this.getAvailableActions() : []
    }));
  }

  // Check which AI services are available
  getStatus() {
    return {
      openai: !!this.openai,
      claude: !!this.anthropic,
      currentMode: this.currentMode,
      availableModes: this.getAvailableModes(),
      actionExecutor: true,
      totalActions: Object.keys(this.actionExecutor.actions).length
    };
  }
}

module.exports = UnifiedAIService;