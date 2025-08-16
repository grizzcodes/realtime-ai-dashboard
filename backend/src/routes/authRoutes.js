// backend/src/routes/authRoutes.js
module.exports = function(app) {
  // Google OAuth routes with Drive scopes
  app.get('/auth/google', (req, res) => {
    const scopes = [
      // Gmail access
      'https://www.googleapis.com/auth/gmail.readonly',
      'https://www.googleapis.com/auth/gmail.modify',
      // Calendar access
      'https://www.googleapis.com/auth/calendar',
      'https://www.googleapis.com/auth/calendar.events',
      // User info
      'https://www.googleapis.com/auth/userinfo.email',
      'https://www.googleapis.com/auth/userinfo.profile',
      // GOOGLE DRIVE SCOPES - FULL ACCESS
      'https://www.googleapis.com/auth/drive',
      'https://www.googleapis.com/auth/drive.file',
      'https://www.googleapis.com/auth/drive.readonly',
      'https://www.googleapis.com/auth/drive.metadata.readonly',
      'https://www.googleapis.com/auth/drive.appdata',
      'https://www.googleapis.com/auth/drive.photos.readonly'
    ];

    const authUrl = `https://accounts.google.com/o/oauth2/v2/auth?` +
      `client_id=${process.env.GOOGLE_CLIENT_ID}&` +
      `redirect_uri=${encodeURIComponent('http://localhost:3001/auth/google/callback')}&` +
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
          redirect_uri: 'http://localhost:3001/auth/google/callback'
        })
      });

      const tokens = await response.json();
      
      if (tokens.error) {
        return res.send(`❌ Token exchange failed: ${tokens.error_description}`);
      }

      // Get user info to display authenticated email
      let userEmail = 'Unknown';
      if (tokens.access_token) {
        try {
          const userResponse = await fetch('https://www.googleapis.com/oauth2/v2/userinfo', {
            headers: { 'Authorization': `Bearer ${tokens.access_token}` }
          });
          const userData = await userResponse.json();
          userEmail = userData.email || 'Unknown';
        } catch (error) {
          console.error('Failed to get user info:', error);
        }
      }

      res.send(`
        <!DOCTYPE html>
        <html>
        <head>
          <title>Google OAuth Success</title>
          <style>
            body {
              font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif;
              background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
              min-height: 100vh;
              display: flex;
              align-items: center;
              justify-content: center;
              margin: 0;
              padding: 20px;
            }
            .container {
              background: white;
              border-radius: 20px;
              padding: 40px;
              max-width: 600px;
              box-shadow: 0 20px 60px rgba(0,0,0,0.3);
            }
            h2 {
              color: #2d3748;
              display: flex;
              align-items: center;
              gap: 10px;
            }
            .success-icon {
              color: #48bb78;
              font-size: 1.5em;
            }
            .auth-info {
              background: #e6fffa;
              border-left: 4px solid #38b2ac;
              padding: 15px;
              margin: 20px 0;
              border-radius: 5px;
            }
            .token-box {
              background: #f7fafc;
              border: 1px solid #cbd5e0;
              border-radius: 10px;
              padding: 20px;
              margin: 20px 0;
            }
            textarea {
              width: 100%;
              padding: 10px;
              border: 1px solid #cbd5e0;
              border-radius: 5px;
              font-family: 'Courier New', monospace;
              font-size: 12px;
              resize: vertical;
            }
            .warning {
              background: #fffaf0;
              border-left: 4px solid #ed8936;
              padding: 15px;
              margin: 20px 0;
              border-radius: 5px;
            }
            ol {
              line-height: 1.8;
            }
            code {
              background: #edf2f7;
              padding: 2px 6px;
              border-radius: 3px;
              font-family: 'Courier New', monospace;
            }
            .btn {
              display: inline-block;
              background: #667eea;
              color: white;
              padding: 12px 24px;
              border-radius: 8px;
              text-decoration: none;
              transition: background 0.3s;
            }
            .btn:hover {
              background: #5a67d8;
            }
            .permissions {
              background: #f0fff4;
              border: 1px solid #9ae6b4;
              border-radius: 8px;
              padding: 15px;
              margin: 20px 0;
            }
            .permissions h4 {
              color: #22543d;
              margin-top: 0;
            }
            .permissions ul {
              margin: 10px 0;
              padding-left: 20px;
            }
            .permissions li {
              color: #2f855a;
              margin: 5px 0;
            }
          </style>
        </head>
        <body>
          <div class="container">
            <h2>
              <span class="success-icon">✅</span>
              Google OAuth Successful!
            </h2>
            
            <div class="auth-info">
              <strong>Authenticated as:</strong> ${userEmail}
            </div>

            <div class="permissions">
              <h4>✨ Permissions Granted:</h4>
              <ul>
                <li>📧 Gmail - Read and modify emails</li>
                <li>📅 Calendar - Manage events</li>
                <li>📁 Google Drive - Full access to files and folders</li>
                <li>👥 Shared Drives - Access team drives</li>
                <li>🖼️ Photos - Read photo library</li>
              </ul>
            </div>

            <div class="warning">
              <strong>⚠️ Important: Save Your Refresh Token</strong>
            </div>
            
            <div class="token-box">
              <p><strong>Add this to your backend/.env file:</strong></p>
              <textarea rows="3" readonly onclick="this.select()">GOOGLE_REFRESH_TOKEN=${tokens.refresh_token}</textarea>
            </div>
            
            <p>This token allows the app to access Google services without repeated logins.</p>
            
            <h3>Next Steps:</h3>
            <ol>
              <li>Copy the refresh token above</li>
              <li>Add it to your <code>backend/.env</code> file</li>
              <li>Restart your backend server</li>
              <li>Go back to your dashboard - Drive access will work!</li>
            </ol>
            
            <div style="text-align: center; margin-top: 30px;">
              <a href="http://localhost:3000" class="btn">← Back to Dashboard</a>
            </div>
          </div>
        </body>
        </html>
      `);

    } catch (error) {
      console.error('OAuth error:', error);
      res.send(`❌ OAuth failed: ${error.message}`);
    }
  });

  console.log('🔐 Google OAuth routes configured with Drive access');
};