// backend/src/routes/tokenRefreshRoute.js
// Force refresh Google tokens to fix permission issues

module.exports = function(app) {
  const { google } = require('googleapis');
  
  // Force refresh all Google service tokens
  app.get('/api/auth/force-refresh-tokens', async (req, res) => {
    console.log('🔄 Force refreshing all Google tokens...');
    
    if (!process.env.GOOGLE_REFRESH_TOKEN) {
      return res.status(400).json({
        success: false,
        error: 'No refresh token found. Please authenticate first at /auth/google'
      });
    }
    
    try {
      // Create new OAuth client with fresh credentials
      const oauth2Client = new google.auth.OAuth2(
        process.env.GOOGLE_CLIENT_ID,
        process.env.GOOGLE_CLIENT_SECRET,
        'http://localhost:3001/auth/google/callback'
      );
      
      // Set the refresh token
      oauth2Client.setCredentials({
        refresh_token: process.env.GOOGLE_REFRESH_TOKEN
      });
      
      // Force refresh to get new access token
      const { credentials } = await oauth2Client.refreshAccessToken();
      oauth2Client.setCredentials(credentials);
      
      console.log('✅ New access token obtained');
      
      // Update ALL services with the new OAuth client
      if (global.integrationService) {
        // Update the OAuth client in integration service
        global.integrationService.googleAuth = oauth2Client;
        
        // Update Gmail service
        if (global.integrationService.gmailService) {
          global.integrationService.gmailService.auth = oauth2Client;
          global.integrationService.gmailService.gmail = google.gmail({ version: 'v1', auth: oauth2Client });
          console.log('✅ Gmail service updated');
        }
        
        // Update Calendar service
        if (global.integrationService.calendarService) {
          global.integrationService.calendarService.oauth2Client = oauth2Client;
          global.integrationService.calendarService.calendar = google.calendar({ version: 'v3', auth: oauth2Client });
          console.log('✅ Calendar service updated');
        }
        
        // Update Drive service
        if (global.integrationService.driveService) {
          global.integrationService.driveService.auth = oauth2Client;
          global.integrationService.driveService.drive = google.drive({ version: 'v3', auth: oauth2Client });
          console.log('✅ Drive service updated');
        }
      }
      
      // Also update standalone services if they exist
      const CalendarService = require('../services/calendarService');
      const GmailService = require('../services/gmailService');
      const GoogleDriveService = require('../services/googleDriveService');
      
      // Create new instances with updated auth
      const calendarService = new CalendarService();
      calendarService.oauth2Client = oauth2Client;
      
      const gmailService = new GmailService();
      gmailService.auth = oauth2Client;
      
      const driveService = new GoogleDriveService();
      driveService.auth = oauth2Client;
      
      // Test calendar connection to verify it works
      const calendar = google.calendar({ version: 'v3', auth: oauth2Client });
      const calendarList = await calendar.calendarList.list({
        maxResults: 1
      });
      
      console.log('✅ Calendar access verified');
      
      res.json({
        success: true,
        message: 'All tokens refreshed successfully',
        services: {
          gmail: '✅ Updated',
          calendar: '✅ Updated and verified',
          drive: '✅ Updated'
        },
        accessToken: credentials.access_token ? '✅ New token obtained' : '❌ No access token',
        expiryDate: credentials.expiry_date ? new Date(credentials.expiry_date).toISOString() : 'Unknown'
      });
      
    } catch (error) {
      console.error('❌ Token refresh failed:', error);
      
      // If token refresh fails, user needs to re-authenticate
      if (error.message?.includes('invalid_grant') || error.message?.includes('Token has been expired')) {
        return res.status(401).json({
          success: false,
          error: 'Refresh token is invalid or expired. Please re-authenticate.',
          authUrl: '/auth/google',
          details: error.message
        });
      }
      
      res.status(500).json({
        success: false,
        error: error.message,
        stack: error.stack
      });
    }
  });
  
  console.log('🔧 Token refresh route configured');
  console.log('   Visit http://localhost:3001/api/auth/force-refresh-tokens to refresh all tokens');
};