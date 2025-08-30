// backend/src/routes/calendarFixRoute.js
// Emergency fix for Calendar permission issues

module.exports = function(app) {
  const { google } = require('googleapis');
  
  // Direct calendar test and fix
  app.get('/api/calendar/fix-and-test', async (req, res) => {
    console.log('🔧 EMERGENCY CALENDAR FIX INITIATED...');
    
    if (!process.env.GOOGLE_REFRESH_TOKEN) {
      return res.status(400).json({
        success: false,
        error: 'No refresh token. Visit /auth/google first'
      });
    }
    
    try {
      // Step 1: Create BRAND NEW OAuth client
      console.log('Step 1: Creating new OAuth client...');
      const newOAuth = new google.auth.OAuth2(
        process.env.GOOGLE_CLIENT_ID,
        process.env.GOOGLE_CLIENT_SECRET,
        'http://localhost:3001/auth/google/callback'
      );
      
      // Step 2: Set refresh token
      console.log('Step 2: Setting refresh token...');
      newOAuth.setCredentials({
        refresh_token: process.env.GOOGLE_REFRESH_TOKEN
      });
      
      // Step 3: Force refresh for new access token
      console.log('Step 3: Getting new access token...');
      const { credentials } = await newOAuth.refreshAccessToken();
      newOAuth.setCredentials(credentials);
      console.log('✅ New access token obtained:', credentials.access_token ? 'Yes' : 'No');
      
      // Step 4: Test calendar access
      console.log('Step 4: Testing calendar access...');
      const calendar = google.calendar({ version: 'v3', auth: newOAuth });
      
      // List calendars to verify access
      const calendarList = await calendar.calendarList.list({
        maxResults: 1
      });
      console.log('✅ Calendar list access: SUCCESS');
      
      // Step 5: Create a test event
      console.log('Step 5: Creating test event...');
      const testEvent = {
        summary: 'Test Event - Delete Me',
        description: 'This is a test event to verify calendar permissions',
        start: {
          dateTime: new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString(),
          timeZone: 'America/Los_Angeles'
        },
        end: {
          dateTime: new Date(Date.now() + 25 * 60 * 60 * 1000).toISOString(),
          timeZone: 'America/Los_Angeles'
        }
      };
      
      const eventResult = await calendar.events.insert({
        calendarId: 'primary',
        requestBody: testEvent
      });
      
      console.log('✅ Test event created:', eventResult.data.id);
      
      // Step 6: Delete the test event
      await calendar.events.delete({
        calendarId: 'primary',
        eventId: eventResult.data.id
      });
      console.log('✅ Test event deleted');
      
      // Step 7: FORCE UPDATE ALL SERVICES
      console.log('Step 7: Force updating all services...');
      
      // Update CalendarService directly
      const CalendarService = require('../services/calendarService');
      CalendarService.prototype.oauth2Client = newOAuth;
      CalendarService.prototype.calendar = calendar;
      
      // Update in integration service
      if (global.integrationService) {
        global.integrationService.googleAuth = newOAuth;
        
        if (global.integrationService.calendarService) {
          global.integrationService.calendarService.oauth2Client = newOAuth;
          global.integrationService.calendarService.calendar = calendar;
        }
        
        // Create new calendar service instance
        global.integrationService.calendarService = new CalendarService();
        global.integrationService.calendarService.oauth2Client = newOAuth;
        global.integrationService.calendarService.calendar = calendar;
      }
      
      // Step 8: Update AI routes calendar reference
      const aiRoutesCalendarService = new CalendarService();
      aiRoutesCalendarService.oauth2Client = newOAuth;
      aiRoutesCalendarService.calendar = calendar;
      
      // Store globally for AI routes to use
      global.calendarServiceFixed = aiRoutesCalendarService;
      global.fixedOAuthClient = newOAuth;
      
      console.log('✅ ALL SERVICES FORCE UPDATED');
      
      res.json({
        success: true,
        message: 'Calendar permissions FIXED and VERIFIED',
        tests: {
          oauthClient: '✅ Created',
          accessToken: '✅ Refreshed',
          calendarList: '✅ Accessible',
          eventCreation: '✅ Working',
          eventDeletion: '✅ Working',
          servicesUpdated: '✅ All force updated'
        },
        instructions: 'Now try creating a calendar event in the chat - it should work!'
      });
      
    } catch (error) {
      console.error('❌ Calendar fix failed:', error);
      
      // Detailed error analysis
      let errorDetails = {
        message: error.message,
        code: error.code,
        status: error.status
      };
      
      if (error.message?.includes('insufficient') || error.message?.includes('Insufficient')) {
        errorDetails.solution = 'You need to re-authenticate with full permissions. Visit /auth/google';
      } else if (error.message?.includes('invalid_grant')) {
        errorDetails.solution = 'Your refresh token is invalid. Visit /auth/google to get a new one';
      }
      
      res.status(500).json({
        success: false,
        error: error.message,
        details: errorDetails,
        nextStep: '/auth/google'
      });
    }
  });
  
  console.log('🔧 Calendar fix route configured');
  console.log('   Visit http://localhost:3001/api/calendar/fix-and-test to fix calendar');
};