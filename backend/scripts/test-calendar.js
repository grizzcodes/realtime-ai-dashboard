// backend/scripts/test-calendar.js
require('dotenv').config();
const CalendarService = require('../src/services/calendarService');

async function testCalendarSetup() {
  console.log('🔍 Testing Google Calendar API Setup...\n');
  
  // Check environment variables
  console.log('📋 Environment Check:');
  console.log(`GOOGLE_CLIENT_ID: ${process.env.GOOGLE_CLIENT_ID ? '✅ Set' : '❌ Missing'}`);
  console.log(`GOOGLE_CLIENT_SECRET: ${process.env.GOOGLE_CLIENT_SECRET ? '✅ Set' : '❌ Missing'}`);
  console.log(`GOOGLE_REFRESH_TOKEN: ${process.env.GOOGLE_REFRESH_TOKEN ? '✅ Set' : '❌ Missing'}\n`);
  
  if (!process.env.GOOGLE_CLIENT_ID || !process.env.GOOGLE_CLIENT_SECRET) {
    console.log('❌ Missing Google OAuth credentials!');
    console.log('🔧 Setup Guide:');
    console.log('1. Go to: https://console.developers.google.com/');
    console.log('2. Create a new project or select existing');
    console.log('3. Enable Calendar API and Gmail API');
    console.log('4. Create OAuth 2.0 credentials');
    console.log('5. Add redirect URI: http://localhost:3002/auth/google/callback');
    console.log('6. Add client ID and secret to your .env file\n');
    return;
  }
  
  if (!process.env.GOOGLE_REFRESH_TOKEN) {
    console.log('❌ Missing refresh token!');
    console.log('🔧 Get refresh token by visiting: http://localhost:3002/auth/google');
    console.log('   (Make sure your server is running first)\n');
    return;
  }
  
  // Test calendar connection
  console.log('🧪 Testing Calendar Connection...');
  const calendarService = new CalendarService();
  
  try {
    const result = await calendarService.testConnection();
    
    if (result.success) {
      console.log('✅ Calendar connection successful!');
      console.log(`📅 Message: ${result.message}`);
      if (result.details) {
        console.log(`📊 Details: ${JSON.stringify(result.details, null, 2)}`);
      }
      
      // Test getting events
      console.log('\n📋 Testing event retrieval...');
      const eventsResult = await calendarService.getUpcomingEvents(5);
      
      if (eventsResult.success) {
        console.log(`✅ Found ${eventsResult.events.length} upcoming events`);
        eventsResult.events.forEach((event, index) => {
          console.log(`   ${index + 1}. ${event.summary} - ${event.start}`);
        });
      } else {
        console.log(`❌ Failed to get events: ${eventsResult.error}`);
      }
      
    } else {
      console.log('❌ Calendar connection failed!');
      console.log(`💬 Error: ${result.error}`);
      
      if (result.needsAuth) {
        console.log('🔧 Solution: Re-authenticate by visiting: http://localhost:3002/auth/google');
      }
    }
    
  } catch (error) {
    console.log('❌ Test failed with exception:');
    console.log(`💬 Error: ${error.message}`);
    console.log(`📍 Stack: ${error.stack}`);
  }
  
  console.log('\n✨ Test complete!');
}

// Run the test
testCalendarSetup().catch(console.error);