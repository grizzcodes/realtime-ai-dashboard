// backend/src/routes/aiRoutes.js
// AI endpoints with full integration support and action execution

const MemoryManager = require('../ai/memoryManager');
const ContextManager = require('../ai/contextManager');
const UnifiedAIService = require('../ai/unifiedAIService');

module.exports = (app, io, integrationService, supabaseClient) => {
  // Initialize AI services with integration service for actions
  const memoryManager = new MemoryManager(supabaseClient);
  const contextManager = new ContextManager(integrationService, memoryManager);
  const aiService = new UnifiedAIService(memoryManager, contextManager, integrationService);

  console.log('🤖 AI Services initialized with memory, context, and action execution');

  // Main AI chat endpoint - now with action execution
  app.post('/api/ai/chat', async (req, res) => {
    try {
      const { message, mode, context: userContext, executeActions = true } = req.body;
      
      console.log(`🤖 AI Chat request in mode: ${mode || 'default'}`);
      
      // Set mode if specified
      if (mode) {
        aiService.setMode(mode);
      }
      
      // Process the message with full context and action execution
      const result = await aiService.processMessage(message, {
        mode: mode || 'assistant',
        includeSlack: true,
        skipActions: !executeActions,
        ...userContext
      });
      
      // Emit to WebSocket for real-time updates
      io.emit('aiResponse', {
        type: 'chat_response',
        message: result.response,
        mode: result.mode,
        model: result.model,
        actionResult: result.actionResult,
        timestamp: result.timestamp
      });
      
      // If an action was executed, emit specific event
      if (result.actionResult && result.actionResult.success) {
        io.emit('actionExecuted', {
          type: 'action_executed',
          action: result.actionResult.action,
          message: result.actionResult.message,
          timestamp: new Date().toISOString()
        });
      }
      
      res.json({
        success: true,
        response: result.response,
        mode: result.mode,
        model: result.model,
        actionResult: result.actionResult,
        context: result.context
      });
      
    } catch (error) {
      console.error('❌ AI chat error:', error);
      res.status(500).json({
        success: false,
        error: error.message,
        response: 'I encountered an error processing your request.'
      });
    }
  });

  // Direct action execution endpoint
  app.post('/api/ai/execute-action', async (req, res) => {
    try {
      const { action, params } = req.body;
      
      console.log(`🎯 Executing action: ${action}`);
      
      const result = await aiService.executeDirectAction(action, params);
      
      if (result.success) {
        io.emit('actionExecuted', {
          type: 'action_executed',
          action: result.action,
          message: result.message,
          timestamp: new Date().toISOString()
        });
      }
      
      res.json(result);
      
    } catch (error) {
      console.error('❌ Action execution error:', error);
      res.status(500).json({
        success: false,
        error: error.message
      });
    }
  });

  // Get available actions for current mode
  app.get('/api/ai/actions', (req, res) => {
    try {
      const actions = aiService.getAvailableActions();
      
      res.json({
        success: true,
        actions: actions,
        currentMode: aiService.currentMode
      });
      
    } catch (error) {
      console.error('❌ Actions error:', error);
      res.status(500).json({
        success: false,
        error: error.message
      });
    }
  });

  // Email response generator
  app.post('/api/ai/email-response', async (req, res) => {
    try {
      const { emailId, tone = 'professional' } = req.body;
      
      // Get email context
      const emailContext = await contextManager.getEmailContext(emailId);
      
      // Generate response
      const result = await aiService.generateEmailResponse(emailContext, tone);
      
      res.json({
        success: true,
        response: result.response,
        context: emailContext
      });
      
    } catch (error) {
      console.error('❌ Email response generation error:', error);
      res.status(500).json({
        success: false,
        error: error.message
      });
    }
  });

  // Task analysis and creation
  app.post('/api/ai/analyze-task', async (req, res) => {
    try {
      const { content, source } = req.body;
      
      // Analyze content for task creation
      const result = await aiService.analyzeForTask(content, source);
      
      // Parse the response to extract task details
      const taskDetails = parseTaskFromAIResponse(result.response);
      
      // Create task in Notion if details are valid
      if (taskDetails && integrationService.notionService) {
        const createdTask = await integrationService.notionService.createTask(taskDetails);
        
        if (createdTask.success) {
          io.emit('taskCreated', {
            type: 'ai_created_task',
            task: createdTask.task,
            source: source,
            timestamp: new Date().toISOString()
          });
        }
      }
      
      res.json({
        success: true,
        analysis: result.response,
        taskDetails: taskDetails
      });
      
    } catch (error) {
      console.error('❌ Task analysis error:', error);
      res.status(500).json({
        success: false,
        error: error.message
      });
    }
  });

  // Brainstorming endpoint
  app.post('/api/ai/brainstorm', async (req, res) => {
    try {
      const { topic, constraints = [] } = req.body;
      
      const result = await aiService.brainstorm(topic, constraints);
      
      res.json({
        success: true,
        ideas: result.response,
        mode: result.mode
      });
      
    } catch (error) {
      console.error('❌ Brainstorm error:', error);
      res.status(500).json({
        success: false,
        error: error.message
      });
    }
  });

  // Data analysis endpoint
  app.post('/api/ai/analyze', async (req, res) => {
    try {
      const { dataType, timeframe = '7days' } = req.body;
      
      const result = await aiService.analyzeData(dataType, timeframe);
      
      res.json({
        success: true,
        analysis: result.response,
        mode: result.mode
      });
      
    } catch (error) {
      console.error('❌ Analysis error:', error);
      res.status(500).json({
        success: false,
        error: error.message
      });
    }
  });

  // Memory management endpoints
  app.post('/api/ai/memory/client', async (req, res) => {
    try {
      const { name, details } = req.body;
      
      const memory = await memoryManager.rememberClient(name, details);
      
      res.json({
        success: true,
        memory: memory
      });
      
    } catch (error) {
      console.error('❌ Client memory error:', error);
      res.status(500).json({
        success: false,
        error: error.message
      });
    }
  });

  app.post('/api/ai/memory/lead', async (req, res) => {
    try {
      const { name, details } = req.body;
      
      const memory = await memoryManager.rememberLead(name, details);
      
      res.json({
        success: true,
        memory: memory
      });
      
    } catch (error) {
      console.error('❌ Lead memory error:', error);
      res.status(500).json({
        success: false,
        error: error.message
      });
    }
  });

  app.post('/api/ai/memory/team', async (req, res) => {
    try {
      const { name, details } = req.body;
      
      const memory = await memoryManager.rememberTeamMember(name, details);
      
      res.json({
        success: true,
        memory: memory
      });
      
    } catch (error) {
      console.error('❌ Team memory error:', error);
      res.status(500).json({
        success: false,
        error: error.message
      });
    }
  });

  // Get memory context
  app.get('/api/ai/memory/:entityName', async (req, res) => {
    try {
      const { entityName } = req.params;
      const { type } = req.query;
      
      const context = await memoryManager.getContext(entityName, type);
      
      res.json({
        success: true,
        context: context
      });
      
    } catch (error) {
      console.error('❌ Memory retrieval error:', error);
      res.status(500).json({
        success: false,
        error: error.message
      });
    }
  });

  // Get memory summary
  app.get('/api/ai/memory/summary', async (req, res) => {
    try {
      const summary = memoryManager.getMemorySummary();
      
      res.json({
        success: true,
        summary: summary
      });
      
    } catch (error) {
      console.error('❌ Memory summary error:', error);
      res.status(500).json({
        success: false,
        error: error.message
      });
    }
  });

  // Get person full context
  app.get('/api/ai/context/person/:name', async (req, res) => {
    try {
      const { name } = req.params;
      
      const context = await contextManager.getPersonContext(name);
      
      res.json({
        success: true,
        context: context
      });
      
    } catch (error) {
      console.error('❌ Person context error:', error);
      res.status(500).json({
        success: false,
        error: error.message
      });
    }
  });

  // Get AI modes
  app.get('/api/ai/modes', (req, res) => {
    try {
      const modes = aiService.getAvailableModes();
      
      res.json({
        success: true,
        modes: modes,
        currentMode: aiService.currentMode
      });
      
    } catch (error) {
      console.error('❌ Modes error:', error);
      res.status(500).json({
        success: false,
        error: error.message
      });
    }
  });

  // Set AI mode
  app.post('/api/ai/mode', (req, res) => {
    try {
      const { mode } = req.body;
      
      const success = aiService.setMode(mode);
      
      if (success) {
        io.emit('aiModeChanged', {
          type: 'mode_changed',
          mode: mode,
          timestamp: new Date().toISOString()
        });
      }
      
      res.json({
        success: success,
        currentMode: aiService.currentMode,
        availableActions: aiService.getAvailableActions()
      });
      
    } catch (error) {
      console.error('❌ Mode setting error:', error);
      res.status(500).json({
        success: false,
        error: error.message
      });
    }
  });

  // Get AI status
  app.get('/api/ai/status', (req, res) => {
    try {
      const status = aiService.getStatus();
      
      res.json({
        success: true,
        status: status
      });
      
    } catch (error) {
      console.error('❌ Status error:', error);
      res.status(500).json({
        success: false,
        error: error.message
      });
    }
  });

  // Helper function to parse task details from AI response
  function parseTaskFromAIResponse(aiResponse) {
    try {
      // Basic parsing - you might want to improve this
      const lines = aiResponse.split('\n');
      const taskDetails = {
        title: '',
        priority: 'Medium',
        assignee: 'Team',
        dueDate: null,
        status: 'To-do'
      };
      
      lines.forEach(line => {
        if (line.includes('Task title:') || line.includes('Title:')) {
          taskDetails.title = line.split(':')[1]?.trim() || '';
        }
        if (line.includes('Priority:')) {
          taskDetails.priority = line.split(':')[1]?.trim() || 'Medium';
        }
        if (line.includes('Assignee:')) {
          taskDetails.assignee = line.split(':')[1]?.trim() || 'Team';
        }
        if (line.includes('Due date:') || line.includes('Deadline:')) {
          const dateStr = line.split(':')[1]?.trim();
          if (dateStr && dateStr !== 'None') {
            taskDetails.dueDate = new Date(dateStr).toISOString().split('T')[0];
          }
        }
      });
      
      return taskDetails.title ? taskDetails : null;
    } catch (error) {
      console.error('Failed to parse task from AI response:', error);
      return null;
    }
  }

  console.log('✅ AI routes initialized with full integration support and action execution');
};