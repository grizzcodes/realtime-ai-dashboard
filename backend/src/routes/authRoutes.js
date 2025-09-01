// backend/src/routes/authRoutes.js
// Google OAuth and user authentication routes using GoogleAuthManager

const { getAuthManager } = require('../services/googleAuthManager');

module.exports = function(app) {
  const { google } = require('googleapis');
  const authManager = getAuthManager();
  
  // Store user profile in memory (in production, use a database)
  let userProfile = null;

  // Google OAuth initiation
  app.get('/auth/google', async (req, res) => {
    const oauth2Client = await authManager.getAuthClient();
    
    // COMPREHENSIVE SCOPES - all necessary permissions
    const scopes = [
      // User info
      'https://www.googleapis.com/auth/userinfo.email',
      'https://www.googleapis.com/auth/userinfo.profile',
      
      // Gmail - Full access
      'https://www.googleapis.com/auth/gmail.readonly',
      'https://www.googleapis.com/auth/gmail.modify',
      'https://www.googleapis.com/auth/gmail.send',
      'https://www.googleapis.com/auth/gmail.compose',
      
      // Calendar - FULL access for creating events
      'https://www.googleapis.com/auth/calendar',
      'https://www.googleapis.com/auth/calendar.events',
      'https://www.googleapis.com/auth/calendar.readonly',
      
      // Drive - FULL access for reading files
      'https://www.googleapis.com/auth/drive',
      'https://www.googleapis.com/auth/drive.file',
      'https://www.googleapis.com/auth/drive.readonly'
    ];

    const url = oauth2Client.generateAuthUrl({
      access_type: 'offline',
      scope: scopes,
      prompt: 'consent', // Force consent to ensure all scopes are granted
      include_granted_scopes: true
    });

    console.log('🔐 Requesting OAuth scopes:', scopes.length, 'permissions');
    res.redirect(url);
  });

  // Google OAuth callback
  app.get('/auth/google/callback', async (req, res) => {
    const { code } = req.query;
    
    if (!code) {
      return res.status(400).send('Authorization code missing');
    }

    try {
      const oauth2Client = await authManager.getAuthClient();
      const { tokens } = await oauth2Client.getToken(code);
      
      // Save tokens using AuthManager
      await authManager.setTokens(tokens);
      
      // Get user profile
      const oauth2 = google.oauth2({ version: 'v2', auth: oauth2Client });
      const { data } = await oauth2.userinfo.get();
      
      userProfile = {
        id: data.id,
        email: data.email,
        name: data.name,
        picture: data.picture,
        verified: data.verified_email
      };

      console.log('✅ Google OAuth successful!');
      console.log(`👤 Logged in as: ${userProfile.email}`);
      console.log('📅 Calendar access: GRANTED');
      console.log('📁 Drive access: GRANTED');
      console.log('📧 Gmail access: GRANTED');
      console.log('💾 Tokens saved to file for persistence');

      // Success page
      res.send(`
        <html>
          <head>
            <title>Authentication Successful</title>
            <style>
              body {
                font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
                display: flex;
                justify-content: center;
                align-items: center;
                min-height: 100vh;
                margin: 0;
                background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
                color: white;
                padding: 20px;
              }
              .container {
                text-align: center;
                padding: 2rem;
                background: rgba(255, 255, 255, 0.1);
                border-radius: 12px;
                backdrop-filter: blur(10px);
                max-width: 600px;
              }
              h1 { margin-bottom: 1rem; }
              .email { 
                font-size: 1.2rem; 
                margin: 1rem 0;
                padding: 0.5rem 1rem;
                background: rgba(255, 255, 255, 0.2);
                border-radius: 8px;
                display: inline-block;
              }
              .permissions {
                text-align: left;
                background: rgba(255, 255, 255, 0.1);
                padding: 1rem;
                border-radius: 8px;
                margin: 1.5rem 0;
              }
              .permission-item {
                padding: 0.5rem 0;
                border-bottom: 1px solid rgba(255, 255, 255, 0.1);
              }
              .permission-item:last-child {
                border-bottom: none;
              }
              .button {
                display: inline-block;
                margin: 1rem 0.5rem;
                padding: 12px 24px;
                background: white;
                color: #764ba2;
                text-decoration: none;
                border-radius: 6px;
                font-weight: 600;
                transition: transform 0.2s;
              }
              .button:hover {
                transform: translateY(-2px);
              }
              .success {
                background: rgba(16, 185, 129, 0.2);
                padding: 1rem;
                border-radius: 8px;
                margin-top: 1rem;
                border: 1px solid rgba(16, 185, 129, 0.4);
              }
            </style>
          </head>
          <body>
            <div class="container">
              <h1>✅ Authentication Successful!</h1>
              <p>You are now logged in as:</p>
              <div class="email">${userProfile.email}</div>
              
              <div class="permissions">
                <h3>🔓 Permissions Granted:</h3>
                <div class="permission-item">📧 Gmail - Read, Send, Modify emails</div>
                <div class="permission-item">📅 Calendar - Create and manage events</div>
                <div class="permission-item">📁 Drive - Access and read files</div>
                <div class="permission-item">👤 Profile - Basic user information</div>
              </div>
              
              <div class="success">
                ✅ Tokens saved and will auto-refresh<br>
                🔄 No more manual re-authentication needed!
              </div>
              
              <a href="http://localhost:3000" class="button">Go to Dashboard</a>
            </div>
            <script>
              // Store email in localStorage for the frontend
              localStorage.setItem('userEmail', '${userProfile.email}');
              localStorage.setItem('authComplete', 'true');
              // Auto-redirect after 3 seconds
              setTimeout(() => {
                window.location.href = 'http://localhost:3000';
              }, 3000);
            </script>
          </body>
        </html>
      `);
    } catch (error) {
      console.error('OAuth callback error:', error);
      res.status(500).send(`
        <html>
          <head>
            <title>Authentication Failed</title>
            <style>
              body {
                font-family: system-ui, -apple-system, sans-serif;
                display: flex;
                justify-content: center;
                align-items: center;
                height: 100vh;
                margin: 0;
                background: #1a1a1a;
                color: white;
              }
              .error-container {
                text-align: center;
                padding: 2rem;
                background: rgba(239, 68, 68, 0.1);
                border: 1px solid rgba(239, 68, 68, 0.5);
                border-radius: 12px;
              }
              .retry-btn {
                display: inline-block;
                margin-top: 1rem;
                padding: 10px 20px;
                background: #ef4444;
                color: white;
                text-decoration: none;
                border-radius: 6px;
              }
            </style>
          </head>
          <body>
            <div class="error-container">
              <h1>❌ Authentication Failed</h1>
              <p>Error: ${error.message}</p>
              <a href="/auth/google" class="retry-btn">Try Again</a>
            </div>
          </body>
        </html>
      `);
    }
  });

  // Get user profile endpoint
  app.get('/api/auth/profile', async (req, res) => {
    if (userProfile) {
      res.json({
        success: true,
        profile: userProfile
      });
    } else {
      // Try to get profile using auth manager
      const testResult = await authManager.testConnection();
      if (testResult.success) {
        userProfile = {
          email: testResult.email,
          name: testResult.name
        };
        res.json({
          success: true,
          profile: userProfile
        });
      } else {
        res.json({
          success: false,
          error: 'Not authenticated'
        });
      }
    }
  });

  // Logout endpoint
  app.post('/api/auth/logout', async (req, res) => {
    try {
      // Clear user profile
      userProfile = null;
      
      // Clear tokens using auth manager
      await authManager.clearTokens();
      
      console.log('👋 User logged out successfully');
      
      res.json({
        success: true,
        message: 'Logged out successfully'
      });
    } catch (error) {
      console.error('Logout error:', error);
      res.status(500).json({
        success: false,
        error: error.message
      });
    }
  });

  // Check authentication status
  app.get('/api/auth/status', async (req, res) => {
    const isAuthenticated = authManager.isAuthenticated();
    
    res.json({
      success: true,
      authenticated: isAuthenticated,
      hasProfile: !!userProfile
    });
  });

  // Force re-authentication endpoint
  app.get('/api/auth/reauth', async (req, res) => {
    console.log('🔄 Forcing re-authentication...');
    
    // Clear existing tokens
    await authManager.clearTokens();
    userProfile = null;
    
    // Redirect to OAuth flow
    res.redirect('/auth/google');
  });

  // Auto-fix endpoint for expired tokens
  app.get('/api/auth/auto-fix', async (req, res) => {
    try {
      console.log('🔧 Attempting automatic token refresh...');
      
      // Try to refresh tokens
      await authManager.refreshAccessToken();
      
      // Test if it works
      const testResult = await authManager.testConnection();
      
      if (testResult.success) {
        res.json({
          success: true,
          message: 'Tokens refreshed successfully!',
          user: testResult.email
        });
      } else {
        res.json({
          success: false,
          message: 'Token refresh failed - please re-authenticate',
          authUrl: '/auth/google'
        });
      }
    } catch (error) {
      console.error('Auto-fix failed:', error);
      res.json({
        success: false,
        error: error.message,
        authUrl: '/auth/google'
      });
    }
  });

  console.log('🔐 Auth routes configured with GoogleAuthManager');
  console.log('   - Tokens saved to file for persistence');
  console.log('   - Automatic token refresh enabled');
  console.log('   - Visit http://localhost:3001/auth/google to authenticate');
  console.log('   - Visit http://localhost:3001/api/auth/auto-fix to auto-refresh tokens');
};