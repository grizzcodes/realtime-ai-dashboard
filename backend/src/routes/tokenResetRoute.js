// backend/src/routes/tokenResetRoute.js
// Complete token reset to fix permission issues

module.exports = function(app) {
  const { google } = require('googleapis');
  const fs = require('fs');
  const path = require('path');
  
  // Complete token reset and re-authentication
  app.get('/api/auth/reset-and-fix', async (req, res) => {
    console.log('🔧 COMPLETE TOKEN RESET INITIATED...');
    
    try {
      // Step 1: Clear ALL existing tokens and auth
      console.log('Step 1: Clearing all existing tokens...');
      delete process.env.GOOGLE_REFRESH_TOKEN;
      delete process.env.GOOGLE_ACCESS_TOKEN;
      
      // Clear all global auth references
      if (global.integrationService) {
        global.integrationService.googleAuth = null;
      }
      global.fixedOAuthClient = null;
      global.calendarServiceFixed = null;
      global.calendarServiceAuth = null;
      
      console.log('✅ All tokens and auth cleared');
      
      // Step 2: Create completely fresh OAuth client
      console.log('Step 2: Creating fresh OAuth client...');
      const freshOAuth = new google.auth.OAuth2(
        process.env.GOOGLE_CLIENT_ID,
        process.env.GOOGLE_CLIENT_SECRET,
        'http://localhost:3001/auth/google/callback'
      );
      
      // Step 3: Generate auth URL with ALL scopes
      const scopes = [
        'https://www.googleapis.com/auth/userinfo.email',
        'https://www.googleapis.com/auth/userinfo.profile',
        'https://www.googleapis.com/auth/gmail.readonly',
        'https://www.googleapis.com/auth/gmail.modify',
        'https://www.googleapis.com/auth/gmail.send',
        'https://www.googleapis.com/auth/gmail.compose',
        'https://www.googleapis.com/auth/calendar',
        'https://www.googleapis.com/auth/calendar.events',
        'https://www.googleapis.com/auth/calendar.readonly',
        'https://www.googleapis.com/auth/drive',
        'https://www.googleapis.com/auth/drive.file',
        'https://www.googleapis.com/auth/drive.readonly'
      ];
      
      const authUrl = freshOAuth.generateAuthUrl({
        access_type: 'offline',
        scope: scopes,
        prompt: 'consent', // Force consent
        include_granted_scopes: false // Don't include old scopes
      });
      
      // Return instructions
      res.send(`
        <!DOCTYPE html>
        <html>
          <head>
            <title>Token Reset</title>
            <style>
              body {
                font-family: -apple-system, system-ui, sans-serif;
                max-width: 800px;
                margin: 50px auto;
                padding: 20px;
                background: #1a1a1a;
                color: white;
              }
              .container {
                background: rgba(255, 255, 255, 0.05);
                border: 1px solid rgba(255, 255, 255, 0.1);
                border-radius: 12px;
                padding: 30px;
              }
              h1 { color: #ef4444; }
              .step {
                margin: 20px 0;
                padding: 15px;
                background: rgba(255, 255, 255, 0.05);
                border-left: 4px solid #3b82f6;
                border-radius: 4px;
              }
              .button {
                display: inline-block;
                margin: 20px 0;
                padding: 12px 24px;
                background: #3b82f6;
                color: white;
                text-decoration: none;
                border-radius: 6px;
                font-weight: 600;
              }
              .button:hover {
                background: #2563eb;
              }
              .warning {
                background: rgba(239, 68, 68, 0.1);
                border: 1px solid rgba(239, 68, 68, 0.3);
                padding: 15px;
                border-radius: 8px;
                margin: 20px 0;
              }
              code {
                background: rgba(0, 0, 0, 0.3);
                padding: 2px 6px;
                border-radius: 3px;
                font-family: monospace;
              }
            </style>
          </head>
          <body>
            <div class="container">
              <h1>🔧 Complete Token Reset</h1>
              
              <div class="warning">
                <strong>⚠️ All tokens have been cleared!</strong><br>
                You must re-authenticate to restore access.
              </div>
              
              <h2>Follow these steps carefully:</h2>
              
              <div class="step">
                <strong>Step 1: Revoke Old Permissions</strong><br>
                Go to <a href="https://myaccount.google.com/permissions" target="_blank" style="color: #3b82f6;">Google Account Permissions</a><br>
                Find "localhost" or your app and click "Remove Access"
              </div>
              
              <div class="step">
                <strong>Step 2: Clear Browser Data</strong><br>
                Clear cookies and cache for localhost:3001<br>
                <code>Chrome: DevTools → Application → Storage → Clear site data</code>
              </div>
              
              <div class="step">
                <strong>Step 3: Re-authenticate with Fresh Permissions</strong><br>
                Click the button below to authenticate with ALL permissions
              </div>
              
              <a href="${authUrl}" class="button">🔐 Authenticate with Full Permissions</a>
              
              <div class="step">
                <strong>Step 4: Verify ALL Permissions</strong><br>
                When Google shows the consent screen, make sure you see:<br>
                ✅ View and edit events on all your calendars<br>
                ✅ See, edit, share, and permanently delete all the calendars<br>
                ✅ Gmail access<br>
                ✅ Drive access
              </div>
              
              <div class="step">
                <strong>Step 5: After Authentication</strong><br>
                Visit: <code>http://localhost:3001/api/calendar/fix-and-test</code><br>
                This should now work!
              </div>
            </div>
          </body>
        </html>
      `);
      
    } catch (error) {
      console.error('❌ Token reset failed:', error);
      res.status(500).json({
        success: false,
        error: error.message
      });
    }
  });
  
  // Direct token injection for testing (use with caution)
  app.post('/api/auth/inject-token', async (req, res) => {
    const { refreshToken, accessToken } = req.body;
    
    if (!refreshToken) {
      return res.status(400).json({
        success: false,
        error: 'Refresh token required'
      });
    }
    
    try {
      console.log('💉 Injecting tokens directly...');
      
      // Set tokens
      process.env.GOOGLE_REFRESH_TOKEN = refreshToken;
      if (accessToken) {
        process.env.GOOGLE_ACCESS_TOKEN = accessToken;
      }
      
      // Create OAuth client with tokens
      const oauth2Client = new google.auth.OAuth2(
        process.env.GOOGLE_CLIENT_ID,
        process.env.GOOGLE_CLIENT_SECRET,
        'http://localhost:3001/auth/google/callback'
      );
      
      oauth2Client.setCredentials({
        refresh_token: refreshToken,
        access_token: accessToken
      });
      
      // Test calendar access
      const calendar = google.calendar({ version: 'v3', auth: oauth2Client });
      const testResult = await calendar.calendarList.list({ maxResults: 1 });
      
      // If successful, update all services
      global.fixedOAuthClient = oauth2Client;
      global.calendarServiceFixed = calendar;
      
      if (global.integrationService) {
        global.integrationService.googleAuth = oauth2Client;
        global.integrationService.updateGoogleAuth(oauth2Client);
      }
      
      console.log('✅ Tokens injected and verified');
      
      res.json({
        success: true,
        message: 'Tokens injected successfully',
        calendarAccess: true
      });
      
    } catch (error) {
      console.error('❌ Token injection failed:', error);
      res.status(500).json({
        success: false,
        error: error.message
      });
    }
  });
  
  console.log('🔧 Token reset route configured');
  console.log('   Visit http://localhost:3001/api/auth/reset-and-fix for complete reset');
};