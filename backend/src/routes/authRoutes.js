// backend/src/routes/authRoutes.js
// Google OAuth and user authentication routes - FIXED WITH ALL REQUIRED SCOPES

module.exports = function(app) {
  const { google } = require('googleapis');
  
  // OAuth2 client setup
  const oauth2Client = new google.auth.OAuth2(
    process.env.GOOGLE_CLIENT_ID,
    process.env.GOOGLE_CLIENT_SECRET,
    'http://localhost:3001/auth/google/callback'
  );

  // Store user profile in memory (in production, use a database)
  let userProfile = null;

  // Google OAuth initiation
  app.get('/auth/google', (req, res) => {
    // COMPREHENSIVE SCOPES - Fixed to include ALL necessary permissions
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
      
      // Drive - FULL access for reading files
      'https://www.googleapis.com/auth/drive',
      'https://www.googleapis.com/auth/drive.file',
      'https://www.googleapis.com/auth/drive.readonly'
    ];

    const url = oauth2Client.generateAuthUrl({
      access_type: 'offline',
      scope: scopes,
      prompt: 'consent' // Force consent to ensure all scopes are granted
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
      const { tokens } = await oauth2Client.getToken(code);
      oauth2Client.setCredentials(tokens);

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

      // Store refresh token in environment (in production, use secure storage)
      if (tokens.refresh_token) {
        process.env.GOOGLE_REFRESH_TOKEN = tokens.refresh_token;
        console.log('✅ Google OAuth successful! Refresh token saved.');
        console.log(`👤 Logged in as: ${userProfile.email}`);
        console.log('📅 Calendar access: GRANTED');
        console.log('📁 Drive access: GRANTED');
        console.log('📧 Gmail access: GRANTED');
      }

      // Update all services with new OAuth client
      try {
        // Update Integration Service if it exists
        if (global.integrationService) {
          global.integrationService.updateGoogleAuth(oauth2Client);
          console.log('✅ Integration service updated with new auth');
        }
        
        // Update Calendar Service if it exists
        const CalendarService = require('../services/calendarService');
        if (CalendarService) {
          const calendarService = new CalendarService();
          calendarService.oauth2Client = oauth2Client;
          console.log('✅ Calendar service updated with new auth');
        }
      } catch (err) {
        console.log('⚠️ Some services not updated:', err.message);
      }

      // Success page with token info
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
                margin-top: 2rem;
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
              .warning {
                background: rgba(255, 193, 7, 0.2);
                padding: 1rem;
                border-radius: 8px;
                margin-top: 1rem;
                border: 1px solid rgba(255, 193, 7, 0.4);
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
              
              ${tokens.refresh_token ? 
                '<p style="color: #4ade80;">✅ Refresh token saved - You won\'t need to login again!</p>' :
                '<div class="warning">⚠️ No refresh token received. You may need to re-authenticate later.</div>'
              }
              
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
  app.get('/api/auth/profile', (req, res) => {
    if (userProfile) {
      res.json({
        success: true,
        profile: userProfile
      });
    } else if (process.env.GOOGLE_REFRESH_TOKEN) {
      // If we have a refresh token but no profile, try to get profile
      oauth2Client.setCredentials({
        refresh_token: process.env.GOOGLE_REFRESH_TOKEN
      });
      
      const oauth2 = google.oauth2({ version: 'v2', auth: oauth2Client });
      oauth2.userinfo.get()
        .then(({ data }) => {
          userProfile = {
            id: data.id,
            email: data.email,
            name: data.name,
            picture: data.picture,
            verified: data.verified_email
          };
          res.json({
            success: true,
            profile: userProfile
          });
        })
        .catch(error => {
          console.error('Failed to get profile:', error);
          res.json({
            success: false,
            error: 'Not authenticated'
          });
        });
    } else {
      res.json({
        success: false,
        error: 'Not authenticated'
      });
    }
  });

  // Logout endpoint
  app.post('/api/auth/logout', (req, res) => {
    try {
      // Clear user profile
      userProfile = null;
      
      // Clear tokens (in production, also revoke tokens with Google)
      delete process.env.GOOGLE_REFRESH_TOKEN;
      
      // Clear OAuth client credentials
      oauth2Client.setCredentials({});
      
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
  app.get('/api/auth/status', (req, res) => {
    const isAuthenticated = !!process.env.GOOGLE_REFRESH_TOKEN || !!userProfile;
    
    res.json({
      success: true,
      authenticated: isAuthenticated,
      hasProfile: !!userProfile,
      hasToken: !!process.env.GOOGLE_REFRESH_TOKEN
    });
  });

  // Force re-authentication endpoint
  app.get('/api/auth/reauth', (req, res) => {
    console.log('🔄 Forcing re-authentication...');
    
    // Clear existing tokens
    delete process.env.GOOGLE_REFRESH_TOKEN;
    userProfile = null;
    oauth2Client.setCredentials({});
    
    // Redirect to OAuth flow
    res.redirect('/auth/google');
  });

  console.log('🔐 Auth routes configured with FULL permissions');
  console.log('   Visit http://localhost:3001/auth/google to authenticate');
  console.log('   Or http://localhost:3001/api/auth/reauth to force new authentication');
};