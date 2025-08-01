// backend/main.js - Real-time AI Dashboard Backend
require('dotenv').config();
const express = require('express');
const http = require('http');
const { Server } = require('socket.io');
const cors = require('cors');
const helmet = require('helmet');
const morgan = require('morgan');

// Initialize Express app
const app = express();
const server = http.createServer(app);
const io = new Server(server, {
  cors: {
    origin: "http://localhost:3000",
    methods: ["GET", "POST", "PUT", "DELETE"]
  }
});

// Security and middleware
app.use(helmet());
app.use(cors());
app.use(express.json());
app.use(morgan('combined'));

// Global variables for routes
global.app = app;
global.io = io;

// Initialize services
const IntegrationService = require('./src/services/integrationService');
const integrationService = new IntegrationService();
global.integrationService = integrationService;

// Health check endpoint
app.get('/health', (req, res) => {
  res.json({
    status: 'OK',
    message: 'AI Dashboard Backend is running',
    timestamp: new Date().toISOString(),
    uptime: process.uptime()
  });
});

// Load route modules
require('./server.js'); // Gmail routes
require('./enhanced-endpoints.js'); // Additional endpoints

// WebSocket connection handling
io.on('connection', (socket) => {
  console.log('📱 Client connected:', socket.id);
  
  socket.on('disconnect', () => {
    console.log('📱 Client disconnected:', socket.id);
  });
});

// Start server
const PORT = process.env.PORT || 3001;
server.listen(PORT, () => {
  console.log(`🚀 Server running on port ${PORT}`);
  console.log(`📊 Dashboard: http://localhost:${PORT}/health`);
  console.log('🔗 WebSocket server active');
});

// Graceful shutdown
process.on('SIGTERM', () => {
  console.log('🛑 Shutting down gracefully...');
  server.close(() => {
    console.log('✅ Server closed');
    process.exit(0);
  });
});
