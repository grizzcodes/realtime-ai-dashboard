// backend/src/routes/authRoutes.js
// Google OAuth routes for Gmail authentication

const { google } = require('googleapis');

module.exports = (app) => {
  const oauth2Client = new google.auth.OAuth2(
    process.env.GOOGLE_CLIENT_ID,
    process.env.GOOGLE_CLIENT_SECRET,
    'http://localhost:3001/auth/google/callback'
  );

  // Start OAuth flow
  app.get('/auth/google', (req, res) => {
    console.log('🔐 Starting Google OAuth flow...');
    
    if (!process.env.GOOGLE_CLIENT_ID || !process.env.GOOGLE_CLIENT_SECRET) {
      return res.status(400).send(`
        <h1>Google OAuth Not Configured</h1>
        <p>Please add to your .env file:</p>
        <pre>
GOOGLE_CLIENT_ID=your-client-id
GOOGLE_CLIENT_SECRET=your-client-secret
        </pre>
        <p>Get these from <a href="https://console.cloud.google.com/apis/credentials">Google Cloud Console</a></p>
      `);
    }

    const scopes = [
      'https://www.googleapis.com/auth/gmail.modify',
      'https://www.googleapis.com/auth/gmail.readonly',
      'https://www.googleapis.com/auth/calendar.readonly',
      'https://www.googleapis.com/auth/userinfo.email'
    ];

    const authUrl = oauth2Client.generateAuthUrl({
      access_type: 'offline',
      scope: scopes,
      prompt: 'consent'
    });

    res.redirect(authUrl);
  });

  // OAuth callback
  app.get('/auth/google/callback', async (req, res) => {
    const { code } = req.query;
    
    if (!code) {
      return res.status(400).send('Authorization code missing');
    }

    try {
      console.log('🔐 Processing OAuth callback...');
      
      const { tokens } = await oauth2Client.getToken(code);
      oauth2Client.setCredentials(tokens);
      
      // Get user info
      const oauth2 = google.oauth2({ version: 'v2', auth: oauth2Client });
      const { data } = await oauth2.userinfo.get();
      
      console.log('✅ OAuth successful for:', data.email);
      console.log('🔑 Refresh token:', tokens.refresh_token ? 'Received' : 'Not received (user already authorized)');
      
      // Display the refresh token for manual .env setup
      res.send(`
        <!DOCTYPE html>
        <html>
        <head>
          <title>Gmail OAuth Success</title>
          <style>
            body {
              font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
              max-width: 800px;
              margin: 50px auto;
              padding: 20px;
              background: #f5f5f5;
            }
            .container {
              background: white;
              padding: 30px;
              border-radius: 10px;
              box-shadow: 0 2px 10px rgba(0,0,0,0.1);
            }
            h1 { color: #4CAF50; }
            .token-box {
              background: #f0f0f0;
              padding: 15px;
              border-radius: 5px;
              margin: 20px 0;
              word-break: break-all;
              font-family: monospace;
            }
            .warning {
              background: #fff3cd;
              border-left: 4px solid #ffc107;
              padding: 10px;
              margin: 20px 0;
            }
            .success {
              background: #d4edda;
              border-left: 4px solid #28a745;
              padding: 10px;
              margin: 20px 0;
            }
            button {
              background: #4CAF50;
              color: white;
              border: none;
              padding: 10px 20px;
              border-radius: 5px;
              cursor: pointer;
            }
            button:hover {
              background: #45a049;
            }
          </style>
        </head>
        <body>
          <div class="container">
            <h1>✅ Gmail OAuth Successful!</h1>
            <div class="success">
              <strong>Authenticated as:</strong> ${data.email}
            </div>
            
            ${tokens.refresh_token ? `
              <h2>⚠️ Important: Save Your Refresh Token</h2>
              <div class="warning">
                <strong>Add this to your backend/.env file:</strong>
              </div>
              <div class="token-box">
                GOOGLE_REFRESH_TOKEN=${tokens.refresh_token}
              </div>
              <p>This token allows the app to access Gmail without repeated logins.</p>
            ` : `
              <div class="warning">
                <strong>Note:</strong> No new refresh token received (you've already authorized this app).
                If you need a new refresh token, revoke access at 
                <a href="https://myaccount.google.com/permissions">Google Account Permissions</a>
                and try again.
              </div>
            `}
            
            <h3>Next Steps:</h3>
            <ol>
              <li>Copy the refresh token above</li>
              <li>Add it to your <code>backend/.env</code> file</li>
              <li>Restart your backend server</li>
              <li>Go back to your dashboard</li>
            </ol>
            
            <button onclick="window.close()">Close Window</button>
            
            <script>
              // Automatically copy to clipboard if available
              ${tokens.refresh_token ? `
                navigator.clipboard.writeText('GOOGLE_REFRESH_TOKEN=${tokens.refresh_token}')
                  .then(() => {
                    alert('Refresh token copied to clipboard! Paste it in your .env file.');
                  })
                  .catch(() => {
                    console.log('Could not copy to clipboard');
                  });
              ` : ''}
            </script>
          </div>
        </body>
        </html>
      `);
      
    } catch (error) {
      console.error('❌ OAuth callback error:', error);
      res.status(500).send(`
        <h1>OAuth Error</h1>
        <p>${error.message}</p>
        <p>Please check your Google Cloud Console settings and try again.</p>
      `);
    }
  });

  // Revoke access endpoint
  app.get('/auth/google/revoke', async (req, res) => {
    try {
      if (process.env.GOOGLE_REFRESH_TOKEN) {
        oauth2Client.setCredentials({
          refresh_token: process.env.GOOGLE_REFRESH_TOKEN
        });
        
        await oauth2Client.revokeCredentials();
        
        res.send(`
          <h1>Access Revoked</h1>
          <p>Google access has been revoked. Remove GOOGLE_REFRESH_TOKEN from .env and re-authenticate.</p>
        `);
      } else {
        res.send(`
          <h1>No Token Found</h1>
          <p>No refresh token found. Visit <a href="/auth/google">/auth/google</a> to authenticate.</p>
        `);
      }
    } catch (error) {
      res.status(500).send(`Error: ${error.message}`);
    }
  });

  console.log('🔐 Google OAuth routes loaded');
};