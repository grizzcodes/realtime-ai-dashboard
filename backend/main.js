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

// Initialize Supabase if configured
let supabaseClient = null;
if (process.env.SUPABASE_URL && process.env.SUPABASE_ANON_KEY) {
  const { createClient } = require('@supabase/supabase-js');
  supabaseClient = createClient(
    process.env.SUPABASE_URL,
    process.env.SUPABASE_ANON_KEY
  );
  console.log('✅ Supabase initialized');
}

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

// Check if Auth routes exist and load them
const fs = require('fs');
const path = require('path');
if (fs.existsSync(path.join(__dirname, 'src/routes/authRoutes.js'))) {
  require('./src/routes/authRoutes')(app);
  console.log('🔐 Google OAuth routes loaded - visit /auth/google to authenticate');
}

// Check if Slack-Fireflies routes exist before requiring
if (fs.existsSync(path.join(__dirname, 'src/routes/slackFirefliesRoutes.js'))) {
  require('./src/routes/slackFirefliesRoutes')(app); // Slack-Fireflies integration
}

// Load Fireflies API routes if available
if (fs.existsSync(path.join(__dirname, 'api/fireflies.js'))) {
  const firefliesRoutes = require('./api/fireflies');
  app.use('/api/fireflies', firefliesRoutes);
  console.log('🔥 Fireflies API routes loaded');
}

// Load AI routes with full integration support
if (fs.existsSync(path.join(__dirname, 'src/routes/aiRoutes.js'))) {
  require('./src/routes/aiRoutes')(app, io, integrationService, supabaseClient);
  console.log('🤖 AI routes loaded with memory and context management');
}

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
  console.log('🤖 AI services ready with memory and modes');
  
  // Show OAuth setup reminder if not configured
  if (!process.env.GOOGLE_REFRESH_TOKEN) {
    console.log('');
    console.log('⚠️  Gmail Archive Not Working? Set up OAuth:');
    console.log(`   Visit: http://localhost:${PORT}/auth/google`);
    console.log('');
  }
});

// Graceful shutdown
process.on('SIGTERM', () => {
  console.log('🛑 Shutting down gracefully...');
  server.close(() => {
    console.log('✅ Server closed');
    process.exit(0);
  });
});
