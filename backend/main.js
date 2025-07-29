// backend/main.js - Enhanced AI-Powered Real-time Dashboard Server
require('dotenv').config();

const express = require('express');
const http = require('http');
const socketIo = require('socket.io');
const cors = require('cors');
const RealTimeMonitor = require('./src/webhooks/webhookHandler');
const IntelligentProcessor = require('./src/ai/intelligentProcessor');
const ActionEngine = require('./src/ai/actionEngine');
const ContextManager = require('./src/ai/contextManager');
const NotionService = require('./src/services/notionService');
const GmailService = require('./src/services/gmailService');
const SlackService = require('./src/services/slackService');
const FirefliesService = require('./src/services/firefliesService');

console.log('🚀 Starting AI-Powered Real-time Dashboard...');

const app = express();
const server = http.createServer(app);
const io = socketIo(server, {
  cors: {
    origin: "http://localhost:3000",
    methods: ["GET", "POST"]
  }
});

app.use(express.json());
app.use(cors());

// Initialize services
const webhookMonitor = new RealTimeMonitor();
const aiProcessor = new IntelligentProcessor();
const notionService = new NotionService();
const gmailService = new GmailService();
const slackService = new SlackService();
const firefliesService = new FirefliesService();

// Initialize AI intelligence
const contextManager = new ContextManager();
const actionEngine = new ActionEngine({
  notion: notionService,
  gmail: gmailService,
  slack: slackService,
  fireflies: firefliesService,
  aiProcessor: aiProcessor
});

// Socket.io connection handling
io.on('connection', (socket) => {
  console.log('🔗 Client connected to dashboard');
  
  socket.on('disconnect', () => {
    console.log('❌ Client disconnected');
  });
});

// Test API connections on startup
async function initializeServices() {
  console.log('🔌 Testing API connections...');
  
  const notionTest = await notionService.testConnection();
  if (notionTest.success) {
    console.log('✅ Notion API connected');
  } else {
    console.log('❌ Notion API failed:', notionTest.error);
  }

  const gmailTest = await gmailService.testConnection();
  if (gmailTest.success) {
    console.log('✅ Gmail API connected');
  } else {
    console.log('❌ Gmail API failed:', gmailTest.error);
  }

  const slackTest = await slackService.testConnection();
  if (slackTest.success) {
    console.log('✅ Slack API connected');
  } else {
    console.log('❌ Slack API failed:', slackTest.error);
  }

  const firefliesTest = await firefliesService.testConnection();
  if (firefliesTest.success) {
    console.log('✅ Fireflies AI connected');
  } else {
    console.log('❌ Fireflies AI failed:', firefliesTest.error);
  }
  
  // Test database connection
  const db = aiProcessor.getDatabase();
  const dbTest = await db.testConnection();
  if (dbTest.success) {
    console.log('✅ Database connected');
  } else {
    console.log('⚠️ Database not configured - using memory mode');
  }

  console.log('🧠 AI Intelligence systems initialized');
}

// Root route
app.get('/', (req, res) => {
  const stats = aiProcessor.getStats();
  const smartSuggestions = contextManager.generateSmartSuggestions();
  
  res.json({
    message: '🤖 AI-Powered Real-time Dashboard',
    status: 'operational',
    timestamp: new Date().toISOString(),
    features: {
      ai: 'OpenAI & Claude analysis',
      intelligence: 'Context-aware action suggestions',
      notion: 'Task management integration',
      gmail: 'Email monitoring & drafting',
      slack: 'Team communication',
      fireflies: 'Meeting transcript analysis',
      webhooks: 'Multi-service monitoring',
      realtime: 'Live event processing',
      database: 'Supabase persistence'
    },
    stats,
    smartSuggestions: smartSuggestions.slice(0, 3),
    endpoints: {
      health: '/health',
      tasks: '/api/tasks',
      events: '/api/events',
      suggestions: '/api/suggestions',
      actions: '/api/actions',
      chat: '/api/ai-chat',
      notion: '/api/notion',
      gmail: '/api/gmail',
      slack: '/api/slack',
      fireflies: '/api/fireflies',
      'ai-test': '/api/ai-test'
    }
  });
});

// Enhanced health endpoint with API status
app.get('/health', async (req, res) => {
  const stats = await aiProcessor.getStats();
  const aiContext = contextManager.getAIContext();
  
  // Test all API connections
  const apiConnections = {
    notion: await notionService.testConnection(),
    gmail: await gmailService.testConnection(),
    slack: await slackService.testConnection(),
    fireflies: await firefliesService.testConnection()
  };

  res.json({ 
    status: 'healthy', 
    timestamp: new Date().toISOString(),
    message: 'AI-powered analysis active!',
    stats,
    aiContext,
    apiConnections
  });
});

// AI Chat endpoint with context awareness
app.post('/api/ai-chat', async (req, res) => {
  try {
    const { message, model = 'openai', context = {} } = req.body;
    
    // Build context-aware prompt
    const contextPrompt = `
You are an intelligent assistant for the Ultimate AI Organizer. You have access to the user's current data:

CURRENT TASKS (${context.tasks?.length || 0} total):
${context.tasks?.slice(0, 10).map(t => `- ${t.title} (${t.source}, urgency: ${t.urgency}/5)`).join('\n') || 'No tasks'}

RECENT EVENTS (${context.events?.length || 0} total):
${context.events?.slice(0, 5).map(e => `- ${e.source}: ${e.type}`).join('\n') || 'No recent events'}

STATS:
- Pending tasks: ${context.tasks?.filter(t => t.status === 'pending').length || 0}
- Completed tasks: ${context.tasks?.filter(t => t.status === 'completed').length || 0}

Based on this context, answer the user's question: "${message}"

Be helpful, concise, and actionable. If the user asks about creating tasks, deadlines, or managing their work, use the context above to provide relevant insights.
    `;

    // Create test event for AI processing
    const chatEvent = {
      source: 'chat',
      type: 'user_query',
      data: { message: contextPrompt },
      timestamp: new Date(),
      priority: 2
    };

    console.log(`💬 Processing chat with ${model}: ${message.substring(0, 50)}...`);
    
    // Use existing AI processor
    const result = await aiProcessor.processEvent(chatEvent);
    
    // Extract response from AI analysis
    let response = result.analysis?.summary || "I'm here to help with your tasks and organization!";
    
    // If AI created action items, mention them
    if (result.analysis?.actionItems?.length > 0) {
      response += "\n\nI can help you with:\n" + 
        result.analysis.actionItems.slice(0, 3).map(item => `• ${item}`).join('\n');
    }

    res.json({
      success: true,
      response,
      model,
      timestamp: new Date(),
      contextUsed: {
        tasksCount: context.tasks?.length || 0,
        eventsCount: context.events?.length || 0
      }
    });

  } catch (error) {
    console.error('AI chat error:', error);
    res.status(500).json({
      success: false,
      error: error.message,
      response: "I'm experiencing some difficulties right now. Please try again in a moment."
    });
  }
});

// API Routes
app.get('/api/tasks', async (req, res) => {
  const stats = await aiProcessor.getStats();
  res.json({
    tasks: aiProcessor.getTopTasks(20),
    stats,
    timestamp: new Date()
  });
});

app.get('/api/events', async (req, res) => {
  const events = await aiProcessor.getRecentEvents(30);
  const stats = await aiProcessor.getStats();
  res.json({
    events,
    stats,
    timestamp: new Date()
  });
});

// New intelligent endpoints
app.get('/api/suggestions', async (req, res) => {
  try {
    const suggestions = contextManager.generateSmartSuggestions();
    res.json({
      success: true,
      suggestions,
      context: contextManager.getAIContext(),
      timestamp: new Date()
    });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

app.post('/api/actions/execute', async (req, res) => {
  try {
    const { actionId, action } = req.body;
    const result = await actionEngine.executeAction(action);
    
    // Broadcast action execution to connected clients
    io.emit('action_executed', { actionId, result });
    
    res.json({
      success: true,
      result,
      timestamp: new Date()
    });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

app.put('/api/tasks/:taskId/status', async (req, res) => {
  const { status } = req.body;
  const task = await aiProcessor.updateTaskStatus(req.params.taskId, status);
  
  if (task) {
    // Emit real-time update
    io.emit('task_updated', task);
    
    // Update context with task completion
    if (status === 'completed') {
      contextManager.addContext({ source: 'manual', type: 'task_completion' }, [task]);
    }
    
    // Update stats
    const stats = await aiProcessor.getStats();
    io.emit('stats_update', stats);
    
    res.json({ success: true, task });
  } else {
    res.status(404).json({ error: 'Task not found' });
  }
});

// Enhanced AI Test endpoint
app.post('/api/ai-test', async (req, res) => {
  try {
    const { message, source = 'test' } = req.body;
    
    const testScenarios = {
      meeting: "Meeting transcript: John said 'We need to fix the database performance issue before the client demo on Thursday. Sarah, can you handle the optimization? Also, we should schedule a follow-up with the marketing team about the Q4 campaign launch.'",
      email: "Email from client: Budget approval needed for Q4 marketing campaign by Friday",
      slack: "Slack message: @channel The production server is down! Need immediate assistance. Customer support is getting complaints.",
      gmail: "Email from client: Budget approval needed for Q4 marketing campaign by Friday. Meeting with stakeholders needed ASAP.",
      default: message
    };

    const testMessage = testScenarios[source] || testScenarios.default;
    
    const testEvent = {
      source,
      type: 'manual_test',
      data: { message: testMessage },
      timestamp: new Date(),
      priority: 3
    };

    console.log(`🧪 Testing AI with ${source} scenario...`);
    const result = await aiProcessor.processEvent(testEvent);
    
    // Add context to context manager
    contextManager.addContext(testEvent, result.newTasks);
    
    // Generate intelligent actions for new tasks
    const intelligentActions = [];
    for (const task of result.newTasks) {
      const taskContext = contextManager.getContextForTask(task);
      const actions = await actionEngine.processIntelligentActions(task, {
        emailContent: source === 'gmail' ? { 
          subject: 'Budget Approval Request',
          from: 'client@example.com',
          body: testMessage 
        } : null,
        ...taskContext
      });
      intelligentActions.push(...actions);
    }
    
    // Emit real-time updates
    if (result.newTasks.length > 0) {
      result.newTasks.forEach(task => {
        io.emit('new_task', task);
      });
      
      const stats = await aiProcessor.getStats();
      io.emit('stats_update', stats);
    }
    
    if (intelligentActions.length > 0) {
      io.emit('intelligent_actions', intelligentActions);
    }
    
    io.emit('new_event', result.event);
    
    res.json({
      success: true,
      message: 'AI analysis complete!',
      result,
      intelligentActions,
      suggestions: contextManager.generateSmartSuggestions().slice(0, 3),
      scenario: source
    });
  } catch (error) {
    console.error('AI test error:', error);
    res.status(500).json({ 
      error: error.message,
      suggestion: 'Check your OpenAI/Claude API keys in .env file'
    });
  }
});

// Mount webhook routes
app.use('/webhooks', webhookMonitor.app);

const PORT = process.env.PORT || 3002;
const WEBHOOK_PORT = 3001;

// Start servers
server.listen(PORT, async () => {
  console.log(`✅ AI Dashboard server running on port ${PORT}`);
  console.log(`📊 Dashboard: http://localhost:${PORT}`);
  console.log(`🔗 WebSocket server active for real-time updates`);
  console.log(`💬 AI Chat available at: POST ${PORT}/api/ai-chat`);
  
  await initializeServices();
});

webhookMonitor.start(WEBHOOK_PORT);

console.log('🎯 Ready for action! Try these:');
console.log('1. Visit http://localhost:3000 for the enhanced dashboard');
console.log('2. Try the AI Chat tab for context-aware conversations');
console.log('3. Check Integrations tab for API status');
console.log('4. View Suggestions tab for smart recommendations');

// Handle graceful shutdown
process.on('SIGINT', () => {
  console.log('🛑 Shutting down gracefully...');
  webhookMonitor.stop();
  server.close(() => {
    console.log('✅ Server stopped');
    process.exit(0);
  });
});