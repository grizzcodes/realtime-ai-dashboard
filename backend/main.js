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
      notion: '/api/notion',
      gmail: '/api/gmail',
      slack: '/api/slack',
      fireflies: '/api/fireflies',
      'ai-test': '/api/ai-test'
    }
  });
});

app.get('/health', async (req, res) => {
  const stats = await aiProcessor.getStats();
  const aiContext = contextManager.getAIContext();
  
  res.json({ 
    status: 'healthy', 
    timestamp: new Date().toISOString(),
    message: 'AI-powered analysis active!',
    stats,
    aiContext
  });
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

// Notion integration routes
app.get('/api/notion/pages', async (req, res) => {
  try {
    const pages = await notionService.getRecentPages(10);
    res.json({ pages });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

app.get('/api/notion/databases', async (req, res) => {
  try {
    const databases = await notionService.getTaskDatabases();
    res.json({ databases });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

app.post('/api/notion/task', async (req, res) => {
  try {
    const { title, properties } = req.body;
    const result = await notionService.createTask(title, properties);
    res.json(result);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Gmail integration routes
app.get('/api/gmail/emails', async (req, res) => {
  try {
    const result = await gmailService.getRecentEmails(10);
    res.json(result);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

app.get('/api/gmail/email/:id', async (req, res) => {
  try {
    const result = await gmailService.getEmailContent(req.params.id);
    res.json(result);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Slack integration routes
app.get('/api/slack/messages', async (req, res) => {
  try {
    const { channel = 'general' } = req.query;
    const result = await slackService.getRecentMessages(channel, 10);
    res.json(result);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Fireflies integration routes
app.get('/api/fireflies/transcripts', async (req, res) => {
  try {
    const result = await firefliesService.getRecentTranscripts(10);
    res.json(result);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

app.get('/api/fireflies/transcript/:id', async (req, res) => {
  try {
    const result = await firefliesService.getTranscriptById(req.params.id);
    res.json(result);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Enhanced AI Test endpoint with intelligent actions
app.post('/api/ai-test', async (req, res) => {
  try {
    const { message, source = 'test' } = req.body;
    
    // Enhanced test scenarios
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
    
    // Emit real-time updates if new tasks were created
    if (result.newTasks.length > 0) {
      result.newTasks.forEach(task => {
        io.emit('new_task', task);
      });
      
      // Update stats
      const stats = await aiProcessor.getStats();
      io.emit('stats_update', stats);
    }
    
    // Emit intelligent actions
    if (intelligentActions.length > 0) {
      io.emit('intelligent_actions', intelligentActions);
    }
    
    // Emit the event to activity feed
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

// Enhanced event processing with intelligent actions
const eventTypes = ['slack:message', 'gmail:new_email', 'notion:change', 'fireflies:transcript'];

eventTypes.forEach(eventType => {
  webhookMonitor.on(eventType, async (event) => {
    console.log(`📨 Processing: ${eventType}`);
    
    try {
      // For Gmail events, get full email content
      if (eventType === 'gmail:new_email' && event.data.messageId) {
        const emailResult = await gmailService.getEmailContent(event.data.messageId);
        if (emailResult.success) {
          event.data.emailContent = emailResult.email;
        }
      }

      // For Fireflies events, extract actionable content
      if (eventType === 'fireflies:transcript' && event.data.transcriptId) {
        const transcriptResult = await firefliesService.getTranscriptById(event.data.transcriptId);
        if (transcriptResult.success) {
          event.data.actionableContent = firefliesService.extractActionableContent(transcriptResult.transcript);
        }
      }

      // AI analysis
      const result = await aiProcessor.processEvent(event);
      
      // Add to context manager
      contextManager.addContext(event, result.newTasks);
      
      // Generate intelligent actions
      const intelligentActions = [];
      for (const task of result.newTasks) {
        const taskContext = contextManager.getContextForTask(task);
        const actions = await actionEngine.processIntelligentActions(task, {
          emailContent: event.data.emailContent,
          meetingTranscript: event.data.actionableContent,
          ...taskContext
        });
        intelligentActions.push(...actions);
      }
      
      // Emit real-time updates
      io.emit('new_event', result.event);
      
      if (result.newTasks.length > 0) {
        result.newTasks.forEach(task => {
          io.emit('new_task', task);
          console.log(`📡 Broadcasting new task: ${task.title}`);
        });
        
        // Update stats
        const stats = await aiProcessor.getStats();
        io.emit('stats_update', stats);
      }
      
      // Emit intelligent actions
      if (intelligentActions.length > 0) {
        io.emit('intelligent_actions', intelligentActions);
        console.log(`🧠 Generated ${intelligentActions.length} intelligent actions`);
      }
      
      // Auto-execute approved actions
      for (const action of intelligentActions) {
        if (action.autoExecute) {
          console.log(`🎯 Auto-executing: ${action.description}`);
          const executionResult = await actionEngine.executeAction(action);
          io.emit('action_executed', { action, result: executionResult });
        }
      }
      
      console.log(`✅ Event processed: ${result.newTasks.length} tasks, ${intelligentActions.length} actions, urgency ${result.analysis.urgency}/5`);
    } catch (error) {
      console.error('❌ Processing error:', error.message);
    }
  });
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
  console.log(`🧪 Test AI scenarios: POST http://localhost:${PORT}/api/ai-test`);
  
  await initializeServices();
});

webhookMonitor.start(WEBHOOK_PORT);

console.log('🎯 Ready for action! Try these:');
console.log('1. Visit http://localhost:3002 to see the dashboard');
console.log('2. Start frontend: cd frontend && npm start');
console.log('3. Test AI scenarios: meeting, email, slack, gmail');
console.log('4. Check suggestions: http://localhost:3002/api/suggestions');
console.log('5. View intelligent actions in real-time');

// Handle graceful shutdown
process.on('SIGINT', () => {
  console.log('🛑 Shutting down gracefully...');
  webhookMonitor.stop();
  server.close(() => {
    console.log('✅ Server stopped');
    process.exit(0);
  });
});