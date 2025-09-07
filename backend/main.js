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

// Enhanced Gmail Service Integration
const fs = require('fs');
const path = require('path');
if (fs.existsSync(path.join(__dirname, 'src/services/gmailServiceEnhanced.js'))) {
  const GmailServiceEnhanced = require('./src/services/gmailServiceEnhanced');
  if (integrationService.gmailService) {
    const gmailServiceEnhanced = new GmailServiceEnhanced(integrationService.gmailService);
    
    // Add enhanced methods to existing service
    Object.assign(integrationService.gmailService, {
      trashEmail: gmailServiceEnhanced.trashEmail.bind(gmailServiceEnhanced),
      deleteEmail: gmailServiceEnhanced.deleteEmail.bind(gmailServiceEnhanced),
      sendReply: gmailServiceEnhanced.sendReply.bind(gmailServiceEnhanced),
      getFullEmail: gmailServiceEnhanced.getFullEmail.bind(gmailServiceEnhanced),
      getLabels: gmailServiceEnhanced.getLabels.bind(gmailServiceEnhanced),
      applyLabel: gmailServiceEnhanced.applyLabel.bind(gmailServiceEnhanced),
      removeLabel: gmailServiceEnhanced.removeLabel.bind(gmailServiceEnhanced)
    });
    
    console.log('📧 Enhanced Gmail Service integrated - delete, thread, reply features added');
  }
}

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

// Load Enhanced Gmail Routes
if (fs.existsSync(path.join(__dirname, 'src/routes/gmailEnhancedRoutes.js'))) {
  require('./src/routes/gmailEnhancedRoutes')(app, integrationService.gmailService);
  console.log('✨ Enhanced Gmail routes loaded - smart reply, delete, thread support');
}

// Load Enhanced Magic Inbox routes (NEW)
if (fs.existsSync(path.join(__dirname, 'enhanced-magic-inbox-routes.js'))) {
  const setupEnhancedMagicInbox = require('./enhanced-magic-inbox-routes');
  setupEnhancedMagicInbox(app, io, integrationService);
  console.log('✨ Enhanced Magic Inbox routes loaded - with smart filtering and checkable items');
}

// Check if Auth routes exist and load them
if (fs.existsSync(path.join(__dirname, 'src/routes/authRoutes.js'))) {
  require('./src/routes/authRoutes')(app);
  console.log('🔐 Google OAuth routes loaded - visit /auth/google to authenticate');
}

// Load Token Refresh Route (IMPORTANT - Fixes permission issues)
if (fs.existsSync(path.join(__dirname, 'src/routes/tokenRefreshRoute.js'))) {
  require('./src/routes/tokenRefreshRoute')(app);
  console.log('🔧 Token refresh route loaded - /api/auth/force-refresh-tokens');
}

// Load Token Reset Route (COMPLETE RESET)
if (fs.existsSync(path.join(__dirname, 'src/routes/tokenResetRoute.js'))) {
  require('./src/routes/tokenResetRoute')(app);
  console.log('🔧 Token RESET route loaded - /api/auth/reset-and-fix');
}

// Load Calendar Fix Route (EMERGENCY FIX)
if (fs.existsSync(path.join(__dirname, 'src/routes/calendarFixRoute.js'))) {
  require('./src/routes/calendarFixRoute')(app);
  console.log('🚨 CALENDAR FIX loaded - /api/calendar/fix-and-test');
}

// Load enhanced AI routes with company context
if (fs.existsSync(path.join(__dirname, 'src/routes/ai-enhanced.js'))) {
  require('./src/routes/ai-enhanced');
  console.log('🤖 Enhanced AI routes with company context loaded');
}

// Load Google Drive routes
if (fs.existsSync(path.join(__dirname, 'src/services/googleDriveService.js'))) {
  // If service exists but routes don't, create basic routes inline
  const GoogleDriveService = require('./src/services/googleDriveService');
  const driveService = new GoogleDriveService();
  
  // Basic Drive routes
  app.get('/api/drive/status', async (req, res) => {
    const result = await driveService.testConnection();
    res.json(result);
  });
  
  app.get('/api/drive/folders', async (req, res) => {
    const result = await driveService.listAllFolders();
    res.json(result);
  });
  
  app.get('/api/drive/folder/:folderId', async (req, res) => {
    const { folderId } = req.params;
    const { shared } = req.query;
    const result = await driveService.getFolderContents(folderId, shared === 'true');
    res.json(result);
  });
  
  app.get('/api/drive/search', async (req, res) => {
    const { q, mimeType, limit } = req.query;
    const result = await driveService.searchFiles(q, { mimeType, limit: limit ? parseInt(limit) : 50 });
    res.json(result);
  });
  
  app.post('/api/drive/sync', async (req, res) => {
    const { folderId, brandName, isSharedDrive } = req.body;
    if (!folderId || !brandName) {
      return res.status(400).json({ success: false, error: 'folderId and brandName are required' });
    }
    const result = await driveService.syncFolderToDatabase({ id: folderId, name: brandName, source: isSharedDrive ? 'shared' : 'mydrive' });
    res.json(result);
  });
  
  console.log('📁 Google Drive routes loaded (inline)');
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
  console.log('🤖 AI services ready with memory, modes, and company context');
  console.log('📧 Enhanced Gmail features available');
  
  // Show OAuth setup reminder if not configured
  if (!process.env.GOOGLE_REFRESH_TOKEN) {
    console.log('');
    console.log('⚠️  Gmail/Drive/Calendar Not Working? Fix it:');
    console.log(`   1. Re-authenticate: http://localhost:${PORT}/auth/google`);
    console.log(`   2. Then refresh tokens: http://localhost:${PORT}/api/auth/force-refresh-tokens`);
    console.log('');
  } else {
    console.log('');
    console.log('📅 Calendar still not working? Try these fixes:');
    console.log(`   1. Complete reset: http://localhost:${PORT}/api/auth/reset-and-fix`);
    console.log(`   2. Emergency fix: http://localhost:${PORT}/api/calendar/fix-and-test`);
    console.log('');
  }
  
  // Show OpenAI setup reminder for smart replies
  if (!process.env.OPENAI_API_KEY) {
    console.log('⚠️  Smart replies disabled - Add OPENAI_API_KEY to .env for AI-powered email responses');
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
