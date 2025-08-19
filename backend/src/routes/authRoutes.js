// backend/src/routes/authRoutes.js
// Google OAuth and user authentication routes

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
    const scopes = [
      'https://www.googleapis.com/auth/userinfo.email',
      'https://www.googleapis.com/auth/userinfo.profile',
      'https://www.googleapis.com/auth/gmail.readonly',
      'https://www.googleapis.com/auth/gmail.modify',
      'https://www.googleapis.com/auth/calendar',
      'https://www.googleapis.com/auth/drive.readonly'
    ];

    const url = oauth2Client.generateAuthUrl({
      access_type: 'offline',
      scope: scopes,
      prompt: 'consent'
    });

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
      }

      // Redirect to dashboard with success message
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
                height: 100vh;
                margin: 0;
                background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
                color: white;
              }
              .container {
                text-align: center;
                padding: 2rem;
                background: rgba(255, 255, 255, 0.1);
                border-radius: 12px;
                backdrop-filter: blur(10px);
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
            </style>
          </head>
          <body>
            <div class="container">
              <h1>✅ Authentication Successful!</h1>
              <p>You are now logged in as:</p>
              <div class="email">${userProfile.email}</div>
              <p>All integrations have been connected.</p>
              <a href="http://localhost:3000" class="button">Go to Dashboard</a>
            </div>
            <script>
              // Store email in localStorage for the frontend
              localStorage.setItem('userEmail', '${userProfile.email}');
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
      res.status(500).send('Authentication failed. Please try again.');
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

  console.log('🔐 Auth routes configured');
  console.log('   Visit http://localhost:3001/auth/google to authenticate');
};