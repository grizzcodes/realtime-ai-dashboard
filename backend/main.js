require('dotenv').config();
const express = require('express');
const http = require('http');
const socketIo = require('socket.io');
const cors = require('cors');

const app = express();
const server = http.createServer(app);
const io = socketIo(server, {
  cors: { origin: "http://localhost:3000", methods: ["GET", "POST"] }
});

app.use(express.json());
app.use(cors());

// Simple mock services for now
const mockService = {
  async testConnection() {
    return { success: false, error: 'Not configured yet' };
  }
};

// Root route
app.get('/', (req, res) => {
  res.json({
    message: '🤖 AI-Powered Real-time Dashboard',
    status: 'operational',
    endpoints: {
      health: '/health',
      tasks: '/api/tasks',
      'ai-test': '/api/ai-test',
      'google-auth': '/auth/google'
    }
  });
});

// Health check
app.get('/health', (req, res) => {
  res.json({ 
    status: 'healthy',
    timestamp: new Date().toISOString(),
    apiConnections: {
      notion: { success: false, error: 'Not configured' },
      gmail: { success: false, error: 'Not configured' },
      slack: { success: false, error: 'Not configured' },
      fireflies: { success: false, error: 'Not configured' }
    }
  });
});

// Tasks endpoint
app.get('/api/tasks', (req, res) => {
  res.json({
    tasks: [],
    stats: { total: 0, pending: 0, completed: 0 },
    timestamp: new Date()
  });
});

// AI Test endpoint
app.post('/api/ai-test', (req, res) => {
  const mockTasks = [
    {
      id: Date.now(),
      title: 'Test AI-generated task',
      source: 'ai-test',
      urgency: 3,
      status: 'pending',
      aiGenerated: true
    }
  ];
  
  // Emit to connected clients
  mockTasks.forEach(task => {
    io.emit('new_task', task);
  });
  
  res.json({
    success: true,
    message: 'AI test completed!',
    result: { newTasks: mockTasks }
  });
});

// Google OAuth routes
app.get('/auth/google', (req, res) => {
  if (!process.env.GOOGLE_CLIENT_ID) {
    return res.send('❌ GOOGLE_CLIENT_ID not found in .env file');
  }
  
  const scopes = [
    'https://www.googleapis.com/auth/gmail.readonly',
    'https://www.googleapis.com/auth/calendar'
  ];

  const authUrl = `https://accounts.google.com/o/oauth2/v2/auth?` +
    `client_id=${process.env.GOOGLE_CLIENT_ID}&` +
    `redirect_uri=${encodeURIComponent('http://localhost:3002/auth/google/callback')}&` +
    `response_type=code&` +
    `scope=${encodeURIComponent(scopes.join(' '))}&` +
    `access_type=offline&` +
    `prompt=consent`;

  res.redirect(authUrl);
});

app.get('/auth/google/callback', async (req, res) => {
  const { code } = req.query;
  
  if (!code) {
    return res.send('❌ Authorization failed - no code received');
  }

  try {
    const response = await fetch('https://oauth2.googleapis.com/token', {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body: new URLSearchParams({
        client_id: process.env.GOOGLE_CLIENT_ID,
        client_secret: process.env.GOOGLE_CLIENT_SECRET,
        code,
        grant_type: 'authorization_code',
        redirect_uri: 'http://localhost:3002/auth/google/callback'
      })
    });

    const tokens = await response.json();
    
    if (tokens.error) {
      return res.send(`❌ Token exchange failed: ${tokens.error_description}`);
    }

    res.send(`
      <h2>✅ Google OAuth Success!</h2>
      <p><strong>Refresh Token:</strong></p>
      <textarea style="width:100%;height:60px;" readonly>${tokens.refresh_token}</textarea>
      
      <h3>📋 Next Steps:</h3>
      <ol>
        <li>Copy the refresh token above</li>
        <li>Add it to your <code>backend/.env</code> file:
          <pre>GOOGLE_REFRESH_TOKEN=${tokens.refresh_token}</pre>
        </li>
        <li>Restart your backend server</li>
        <li>Gmail integration will be ready!</li>
      </ol>
      
      <a href="http://localhost:3000">← Back to Dashboard</a>
    `);

  } catch (error) {
    console.error('OAuth error:', error);
    res.send(`❌ OAuth failed: ${error.message}`);
  }
});

// Socket.io connection
io.on('connection', (socket) => {
  console.log('🔗 Client connected');
  socket.on('disconnect', () => console.log('❌ Client disconnected'));
});

const PORT = process.env.PORT || 3002;

server.listen(PORT, () => {
  console.log(`✅ Server running on port ${PORT}`);
  console.log(`📊 Dashboard: http://localhost:3000`);
  console.log(`🔑 Google OAuth: http://localhost:${PORT}/auth/google`);
});
