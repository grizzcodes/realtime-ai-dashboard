// backend/server.js
require('dotenv').config();
const express = require('express');
const http = require('http');
const socketIo = require('socket.io');
const cors = require('cors');
const path = require('path');

// Initialize Express app
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
app.use(express.static('public'));

// Import services
const notionService = require('./src/notion-service');
const aiProcessor = require('./src/ai-processor');

console.log('🚀 Starting Realtime AI Dashboard Backend...');
console.log('📝 Notion API Key present:', !!process.env.NOTION_API_KEY);
console.log('🆔 Database ID:', process.env.NOTION_DATABASE_ID);

// Socket connection handling
io.on('connection', (socket) => {
  console.log('👤 User connected:', socket.id);
  
  socket.on('disconnect', () => {
    console.log('👋 User disconnected:', socket.id);
  });
  
  // Handle task analysis requests
  socket.on('analyzeTask', async (taskData) => {
    try {
      console.log('🧠 Analyzing task:', taskData.title);
      const analysis = await aiProcessor.analyzeTask(taskData);
      socket.emit('taskAnalysis', analysis);
    } catch (error) {
      console.error('❌ Task analysis failed:', error);
      socket.emit('analysisError', { error: error.message });
    }
  });
});

// Health check endpoint
app.get('/api/health', (req, res) => {
  res.json({ 
    status: 'healthy', 
    timestamp: new Date().toISOString(),
    notion: {
      configured: !!process.env.NOTION_API_KEY && !!process.env.NOTION_DATABASE_ID
    }
  });
});

// Notion sync endpoint
app.post('/api/notion/sync', async (req, res) => {
  try {
    console.log('📝 Notion sync requested...');
    console.log('🔑 API Key present:', !!process.env.NOTION_API_KEY);
    console.log('🆔 Database ID:', process.env.NOTION_DATABASE_ID);
    
    const notionResult = await notionService.getTasks();
    console.log('📋 Notion result:', notionResult);
    
    if (!notionResult.success) {
      console.error('❌ Notion sync failed:', notionResult.error);
      return res.status(400).json({
        success: false,
        error: notionResult.error,
        debug: {
          hasApiKey: !!process.env.NOTION_API_KEY,
          databaseId: process.env.NOTION_DATABASE_ID
        }
      });
    }

    // Add Notion tasks to AI processor
    let importedCount = 0;
    for (const task of notionResult.tasks) {
      aiProcessor.tasks.set(task.id, task);
      importedCount++;
    }

    console.log(`📋 Imported ${importedCount} tasks from Notion`);
    
    // Emit to all connected clients
    io.emit('notionSync', { 
      tasksImported: importedCount,
      tasks: notionResult.tasks 
    });

    res.json({
      success: true,
      message: 'Notion sync completed',
      tasksImported: importedCount,
      tasks: notionResult.tasks
    });
  } catch (error) {
    console.error('❌ Notion sync failed:', error);
    res.status(500).json({
      success: false,
      error: error.message,
      stack: error.stack
    });
  }
});

// Start server
const PORT = process.env.PORT || 3001;
server.listen(PORT, () => {
  console.log(`🌐 Server running on port ${PORT}`);
  console.log(`📊 Dashboard available at http://localhost:${PORT}`);
});

// Export for testing
module.exports = { app, server, io };
