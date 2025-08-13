// backend/src/ai/unifiedAIService.js
// Unified AI service with ENHANCED CONTEXT MEMORY for conversation continuity

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
    
    // ENHANCED: Conversation memory with larger context window
    this.conversationHistory = [];
    this.maxHistoryLength = 20; // Keep last 20 messages for context
    this.shortTermMemory = {}; // Store important context from recent messages
    this.pendingTasks = []; // Track tasks mentioned but not yet created
    this.lastActionContext = null; // Remember last action for follow-ups
    
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

IMPORTANT: Remember context from previous messages. If user says "yes" or "set it for tomorrow" after mentioning a task, CREATE THE TASK with the remembered details.

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

CRITICAL: You MUST remember context from previous messages in the conversation. When user says "yes", "set it", or confirms something, check what they're referring to from earlier messages and EXECUTE the action.

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

  // ENHANCED: Extract and store important context from messages
  extractAndStoreContext(message) {
    const lowerMessage = message.toLowerCase();
    
    // Extract task-related information
    if (lowerMessage.includes('task') || lowerMessage.includes('todo')) {
      // Store the full context about the task
      this.pendingTasks.push({
        raw: message,
        timestamp: new Date(),
        mentioned: true
      });
    }
    
    // Extract names and assignees
    const namePatterns = [
      /for\s+(\w+)/i,
      /assign(?:ed)?\s+to\s+(\w+)/i,
      /(\w+)'s\s+task/i,
      /alec|leo|steph|pablo|alexa|anthony|dany|mathieu/gi
    ];
    
    for (const pattern of namePatterns) {
      const match = message.match(pattern);
      if (match) {
        const name = match[1] || match[0];
        this.shortTermMemory.lastMentionedPerson = name.charAt(0).toUpperCase() + name.slice(1).toLowerCase();
        this.shortTermMemory.lastMentionedPersonTime = new Date();
      }
    }
    
    // Extract dates
    const datePatterns = [
      /tomorrow/i,
      /today/i,
      /next\s+\w+/i,
      /due\s+(?:on|by|for)?\s*([^,.\s]+)/i
    ];
    
    for (const pattern of datePatterns) {
      const match = message.match(pattern);
      if (match) {
        this.shortTermMemory.lastMentionedDate = match[0];
        this.shortTermMemory.lastMentionedDateTime = new Date();
      }
    }
    
    // Extract task details if message contains them
    if (lowerMessage.includes('-') || lowerMessage.includes(':')) {
      const parts = message.split(/[-:]/);
      if (parts.length > 1) {
        this.shortTermMemory.lastTaskDescription = parts[1].trim();
      }
    }
    
    // Remember if user is confirming something
    if (lowerMessage === 'yes' || 
        lowerMessage === 'yes please' ||
        lowerMessage === 'correct' || 
        lowerMessage === 'right' ||
        lowerMessage.includes('yes set it') ||
        lowerMessage.includes('do it')) {
      this.shortTermMemory.userConfirmed = true;
      this.shortTermMemory.confirmationTime = new Date();
    }
  }

  // ENHANCED: Check if this is a follow-up message
  isFollowUpMessage(message) {
    const lowerMessage = message.toLowerCase();
    
    // Direct confirmations
    if (lowerMessage === 'yes' || 
        lowerMessage === 'yes please' ||
        lowerMessage === 'correct' ||
        lowerMessage === 'right' ||
        lowerMessage === 'do it' ||
        lowerMessage === 'go ahead') {
      return true;
    }
    
    // Contextual confirmations
    if (lowerMessage.includes('yes set it') ||
        lowerMessage.includes('set it for') ||
        lowerMessage.includes('make it') ||
        lowerMessage.includes('add it') ||
        lowerMessage.includes('that task')) {
      return true;
    }
    
    return false;
  }

  // ENHANCED: Build intent from conversation context
  buildIntentFromContext(message) {
    // Check if we have pending task information
    if (this.pendingTasks.length > 0 || this.shortTermMemory.lastTaskDescription) {
      const params = {
        description: message
      };
      
      // Use the last mentioned task description
      if (this.shortTermMemory.lastTaskDescription) {
        params.title = this.shortTermMemory.lastTaskDescription;
      } else if (this.pendingTasks.length > 0) {
        const lastTask = this.pendingTasks[this.pendingTasks.length - 1];
        // Extract title from the task mention - FIXED REGEX
        const taskMatch = lastTask.raw.match(/(?:task|todo)[^.!?\-:]*([\-:]\s*)?(.+)/i);
        if (taskMatch && taskMatch[2]) {
          params.title = taskMatch[2].trim();
        }
      }
      
      // Use remembered person
      if (this.shortTermMemory.lastMentionedPerson) {
        params.assignee = this.shortTermMemory.lastMentionedPerson;
      }
      
      // Parse date from current message or use remembered date
      if (message.toLowerCase().includes('tomorrow')) {
        const tomorrow = new Date();
        tomorrow.setDate(tomorrow.getDate() + 1);
        params.dueDate = tomorrow.toISOString().split('T')[0];
      } else if (this.shortTermMemory.lastMentionedDate) {
        params.dueDate = this.parseDateFromContext(this.shortTermMemory.lastMentionedDate);
      }
      
      return {
        action: 'create_task',
        params: params
      };
    }
    
    return null;
  }

  // Parse date from context
  parseDateFromContext(dateString) {
    const today = new Date();
    const tomorrow = new Date(today);
    tomorrow.setDate(tomorrow.getDate() + 1);
    
    if (dateString.toLowerCase().includes('tomorrow')) {
      return tomorrow.toISOString().split('T')[0];
    } else if (dateString.toLowerCase().includes('today')) {
      return today.toISOString().split('T')[0];
    }
    
    // Try to use action executor's date parser
    return this.actionExecutor.parseDueDate ? 
      this.actionExecutor.parseDueDate(dateString) : 
      null;
  }

  async processMessage(message, options = {}) {
    const mode = options.mode || this.currentMode;
    const modeConfig = this.modes[mode];
    
    // ENHANCED: Store message in conversation history
    this.conversationHistory.push({
      role: 'user',
      content: message,
      timestamp: new Date()
    });
    
    // Keep conversation history manageable
    if (this.conversationHistory.length > this.maxHistoryLength) {
      this.conversationHistory = this.conversationHistory.slice(-this.maxHistoryLength);
    }
    
    // ENHANCED: Extract and store context from message
    this.extractAndStoreContext(message);
    
    // Gather context based on the message
    const fullContext = await this.context.gatherFullContext(message, {
      includeSlack: options.includeSlack || false
    });
    
    // ENHANCED: Add conversation history to context
    fullContext.conversationHistory = this.conversationHistory;
    fullContext.shortTermMemory = this.shortTermMemory;
    fullContext.pendingTasks = this.pendingTasks;
    
    // Build the context prompt
    const contextPrompt = this.buildContextPrompt(fullContext);
    
    // ENHANCED: Check if this is a follow-up and we should execute an action
    let actionResult = null;
    if (modeConfig.canExecuteActions && this.isFollowUpMessage(message)) {
      const contextIntent = this.buildIntentFromContext(message);
      if (contextIntent) {
        console.log('🎯 Executing action from context:', contextIntent);
        actionResult = await this.actionExecutor.executeAction(contextIntent.action, contextIntent.params);
        
        // Store successful action
        if (actionResult && actionResult.success) {
          this.lastActionContext = {
            action: contextIntent.action,
            params: contextIntent.params,
            result: actionResult,
            timestamp: new Date()
          };
          
          // Clear pending tasks after successful execution
          this.pendingTasks = [];
          this.shortTermMemory.lastTaskDescription = null;
        }
      }
    }
    
    // Add action capabilities and conversation context to system prompt
    const actionPrompt = modeConfig.canExecuteActions ? 
      `\n\nIMPORTANT: You have the ability to EXECUTE ACTIONS directly. When the user asks you to do something, actually do it using the available commands, don't just describe what they should do.
      
CRITICAL: Remember the conversation context. The user just said: "${message}"
Previous messages: ${this.conversationHistory.slice(-3).map(m => `${m.role}: ${m.content}`).join('\n')}
${this.shortTermMemory.lastMentionedPerson ? `Last mentioned person: ${this.shortTermMemory.lastMentionedPerson}` : ''}
${this.shortTermMemory.lastTaskDescription ? `Last task mentioned: ${this.shortTermMemory.lastTaskDescription}` : ''}` : '';
    
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
      response = this.generateFallbackResponse(message, mode, actionResult);
      usedModel = 'Fallback';
    }
    
    // Check if we should execute an action (if not already done)
    if (!actionResult && modeConfig.canExecuteActions && !options.skipActions) {
      actionResult = await this.actionExecutor.parseAndExecute(message, response);
      
      // Store successful action
      if (actionResult && actionResult.success) {
        this.lastActionContext = {
          action: actionResult.action,
          result: actionResult,
          timestamp: new Date()
        };
      }
    }
    
    // Enhance response with action result
    if (actionResult && actionResult.success) {
      response = this.enhanceResponseWithAction(response, actionResult);
    }
    
    // ENHANCED: Store AI response in conversation history
    this.conversationHistory.push({
      role: 'assistant',
      content: response,
      timestamp: new Date()
    });
    
    // Log the interaction for learning
    const entities = this.memory.extractEntities(message);
    if (entities.clients.length > 0) {
      await this.memory.logInteraction('client', entities.clients[0].name, mode, message, response);
    } else if (entities.team.length > 0) {
      await this.memory.logInteraction('team', entities.team[0].name, mode, message, response);
    }
    
    // Clean up old pending tasks (older than 5 minutes)
    const fiveMinutesAgo = new Date(Date.now() - 5 * 60 * 1000);
    this.pendingTasks = this.pendingTasks.filter(task => 
      task.timestamp > fiveMinutesAgo
    );
    
    return {
      response,
      mode: modeConfig.name,
      model: usedModel,
      context: fullContext,
      actionResult: actionResult,
      timestamp: new Date().toISOString(),
      conversationLength: this.conversationHistory.length
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
    
    // ENHANCED: Add conversation history
    if (context.conversationHistory && context.conversationHistory.length > 1) {
      prompt.push('Recent Conversation:');
      const recentMessages = context.conversationHistory.slice(-5);
      recentMessages.forEach(msg => {
        if (msg.role !== 'system') {
          prompt.push(`${msg.role}: ${msg.content}`);
        }
      });
      prompt.push('');
    }
    
    // Add short-term memory
    if (context.shortTermMemory && Object.keys(context.shortTermMemory).length > 0) {
      prompt.push('Remembered Context:');
      for (const [key, value] of Object.entries(context.shortTermMemory)) {
        if (!(value instanceof Date) && key !== 'confirmationTime' && key !== 'lastMentionedDateTime') {
          prompt.push(`- ${key}: ${value}`);
        }
      }
      prompt.push('');
    }
    
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

  // ENHANCED: Generate fallback response with context awareness
  generateFallbackResponse(message, mode, actionResult) {
    // If action was executed, confirm it
    if (actionResult && actionResult.success) {
      return `I'll add that task for ${actionResult.task?.assignee || 'the team'}. 

**Task Added:**
- **Title:** ${actionResult.task?.title || 'New Task'}
- **Assigned To:** ${actionResult.task?.assignee || 'Team'}
- **Due Date:** ${actionResult.task?.dueDate || 'Not set'}

Is there anything else you'd like to add to this task or another task you need help with?`;
    }
    
    // Check if this is a follow-up
    if (this.isFollowUpMessage(message) && this.pendingTasks.length > 0) {
      return "I understand you want to confirm the previous task. Let me process that for you.";
    }
    
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
      totalActions: Object.keys(this.actionExecutor.actions).length,
      conversationHistory: this.conversationHistory.length,
      shortTermMemory: Object.keys(this.shortTermMemory).length,
      pendingTasks: this.pendingTasks.length
    };
  }
}

module.exports = UnifiedAIService;