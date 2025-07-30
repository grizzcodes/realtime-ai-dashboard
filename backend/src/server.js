// backend/src/server.js
const express = require('express');
const cors = require('cors');
const http = require('http');
const socketIo = require('socket.io');
require('dotenv').config();

const app = express();
const server = http.createServer(app);
const io = socketIo(server, {
  cors: {
    origin: "http://localhost:3000",
    methods: ["GET", "POST"]
  }
});

// Middleware
app.use(cors());
app.use(express.json());

// Services
const OpenAIService = require('./services/openAIService');
const ClaudeService = require('./services/claudeService');
const NotionService = require('./services/notionService');
const TaskManager = require('./services/taskManager');

// Import routes
const aiChatRoute = require('./routes/aiChat');

// Initialize services
const openAIService = new OpenAIService();
const claudeService = new ClaudeService();
const notionService = new NotionService();
const taskManager = new TaskManager();

// Use routes
app.use('/api', aiChatRoute);

// Test endpoint to check API connections
app.get('/api/health', async (req, res) => {
  const apiConnections = {
    openai: await openAIService.testConnection(),
    claude: await claudeService.testConnection(),
    notion: await notionService.testConnection(),
    github: {
      success: !!process.env.GITHUB_TOKEN,
      message: process.env.GITHUB_TOKEN ? 'GitHub token configured' : 'No GITHUB_TOKEN in .env'
    },
    gmail: { success: false, message: 'Not implemented yet' },
    slack: { success: false, message: 'Not implemented yet' },
    calendar: { success: false, message: 'Not implemented yet' },
    fireflies: { success: false, message: 'Not implemented yet' },
    linear: { success: false, message: 'Not implemented yet' }
  };

  res.json({ 
    status: 'healthy', 
    apiConnections,
    user: process.env.USER || 'unknown',
    timestamp: new Date().toISOString()
  });
});

// Test specific integration
app.get('/api/test/:service', async (req, res) => {
  const { service } = req.params;
  
  try {
    let result;
    
    switch (service.toLowerCase()) {
      case 'openai':
        result = await openAIService.testConnection();
        break;
      case 'claude':
        result = await claudeService.testConnection();
        break;
      case 'notion':
        result = await notionService.testConnection();
        break;
      case 'github':
        result = {
          success: !!process.env.GITHUB_TOKEN,
          message: process.env.GITHUB_TOKEN ? 'GitHub token configured and ready' : 'Add GITHUB_TOKEN to .env file'
        };
        break;
      default:
        result = { success: false, error: `Service ${service} not implemented yet` };
    }
    
    res.json(result);
  } catch (error) {
    res.json({ success: false, error: error.message });
  }
});

// Get all tasks
app.get('/api/tasks', async (req, res) => {
  try {
    const tasks = taskManager.getAllTasks();
    const statusOptions = await notionService.getStatusOptions();
    
    res.json({ 
      success: true, 
      tasks, 
      statusOptions,
      count: tasks.length 
    });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

// Update task status
app.put('/api/tasks/:id/status', async (req, res) => {
  try {
    const { id } = req.params;
    const { status } = req.body;
    
    const task = taskManager.getTaskById(id);
    if (!task) {
      return res.status(404).json({ success: false, error: 'Task not found' });
    }
    
    // Update in Notion if it's a Notion task
    if (task.source === 'notion' && task.notionId) {
      await notionService.updateTaskStatus(task.notionId, status);
    }
    
    // Update locally
    taskManager.updateTask(id, { status });
    
    // Emit update to all connected clients
    io.emit('taskUpdated', { taskId: id, status });
    
    res.json({ success: true, message: 'Task status updated' });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

// Sync with Notion
app.post('/api/notion/sync', async (req, res) => {
  try {
    console.log('🔄 Starting Notion sync...');
    const result = await notionService.getTasks();
    
    if (result.success) {
      // Clear existing Notion tasks and add new ones
      taskManager.clearTasksBySource('notion');
      result.tasks.forEach(task => {
        taskManager.addTask(task);
      });
      
      // Emit to all connected clients
      io.emit('notionSync', {
        tasks: result.tasks,
        statusOptions: result.statusOptions,
        tasksImported: result.tasks.length
      });
      
      res.json({
        success: true,
        tasksImported: result.tasks.length,
        tasks: result.tasks,
        statusOptions: result.statusOptions,
        message: `Successfully synced ${result.tasks.length} tasks from Notion`
      });
    } else {
      res.status(400).json(result);
    }
  } catch (error) {
    console.error('❌ Notion sync error:', error);
    res.status(500).json({ success: false, error: error.message });
  }
});

// AI test endpoint
app.post('/api/ai-test', async (req, res) => {
  try {
    const { message } = req.body;
    
    // Test with OpenAI first, then Claude
    let result;
    let tasksCreated = 0;
    
    try {
      result = await openAIService.generateTasksFromText(message || 'Create a sample task for testing the AI system');
      if (result.success && result.tasks) {
        result.tasks.forEach(task => {
          task.source = 'ai-test';
          taskManager.addTask(task);
          tasksCreated++;
        });
        
        // Emit to all connected clients
        io.emit('newTask', { newTasks: result.tasks });
      }
    } catch (openAIError) {
      console.log('OpenAI failed, trying Claude...');
      try {
        result = await claudeService.generateTasksFromText(message || 'Create a sample task for testing the AI system');
        if (result.success && result.tasks) {
          result.tasks.forEach(task => {
            task.source = 'ai-test';
            taskManager.addTask(task);
            tasksCreated++;
          });
          
          // Emit to all connected clients
          io.emit('newTask', { newTasks: result.tasks });
        }
      } catch (claudeError) {
        throw new Error('Both OpenAI and Claude failed: ' + claudeError.message);
      }
    }
    
    res.json({
      success: true,
      message: 'AI test completed',
      tasksCreated,
      result
    });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

// Socket.io connection handling
io.on('connection', (socket) => {
  console.log('🔗 Client connected:', socket.id);
  
  socket.on('disconnect', () => {
    console.log('❌ Client disconnected:', socket.id);
  });
  
  // Handle real-time events
  socket.on('requestTaskUpdate', () => {
    const tasks = taskManager.getAllTasks();
    socket.emit('tasksUpdated', tasks);
  });
});

const PORT = process.env.PORT || 3001;

server.listen(PORT, () => {
  console.log(`🚀 Server running on port ${PORT}`);
  console.log('🔧 Environment variables loaded:');
  console.log(`   OPENAI_API_KEY: ${process.env.OPENAI_API_KEY ? '✅ Set' : '❌ Missing'}`);
  console.log(`   ANTHROPIC_API_KEY: ${process.env.ANTHROPIC_API_KEY ? '✅ Set' : '❌ Missing'}`);
  console.log(`   NOTION_API_KEY: ${process.env.NOTION_API_KEY ? '✅ Set' : '❌ Missing'}`);
  console.log(`   NOTION_DATABASE_ID: ${process.env.NOTION_DATABASE_ID ? '✅ Set' : '❌ Missing'}`);
  console.log(`   GITHUB_TOKEN: ${process.env.GITHUB_TOKEN ? '✅ Set' : '❌ Missing'}`);
});
