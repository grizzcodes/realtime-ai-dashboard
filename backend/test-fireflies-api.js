// backend/test-fireflies-api.js
// Test script to verify Fireflies API endpoint is working

const axios = require('axios');

const API_URL = 'http://localhost:3001/api/fireflies';

async function testFirefliesAPI() {
  console.log('🔍 Testing Fireflies API endpoint...\n');
  
  try {
    // Test meetings endpoint
    console.log('📡 Testing GET /api/fireflies/meetings...');
    const meetingsResponse = await axios.get(`${API_URL}/meetings?limit=5`);
    
    if (meetingsResponse.data.success) {
      console.log(`✅ Meetings endpoint working!`);
      console.log(`   Found ${meetingsResponse.data.meetings.length} meetings`);
      console.log(`   Total action items: ${meetingsResponse.data.totalActionItems || 0}\n`);
      
      // Display first meeting
      if (meetingsResponse.data.meetings.length > 0) {
        const meeting = meetingsResponse.data.meetings[0];
        console.log('📅 First meeting:');
        console.log(`   Title: ${meeting.title}`);
        console.log(`   Date: ${meeting.date}`);
        console.log(`   Participants: ${meeting.attendees} people`);
        if (meeting.actionItems && meeting.actionItems.length > 0) {
          console.log(`   Action items: ${meeting.actionItems.length} assignees`);
        }
      }
    } else {
      console.log('❌ Meetings endpoint returned an error');
    }
    
    console.log('\n📡 Testing GET /api/fireflies/action-items...');
    const actionItemsResponse = await axios.get(`${API_URL}/action-items`);
    
    if (actionItemsResponse.data.success) {
      console.log(`✅ Action items endpoint working!`);
      console.log(`   Total tasks: ${actionItemsResponse.data.totalTasks || 0}`);
      
      const assignees = Object.keys(actionItemsResponse.data.actionItems || {});
      if (assignees.length > 0) {
        console.log(`   Assignees: ${assignees.join(', ')}`);
      }
    } else {
      console.log('❌ Action items endpoint returned an error');
    }
    
  } catch (error) {
    console.error('❌ Error testing API:', error.message);
    if (error.response) {
      console.error('   Response:', error.response.data);
    }
    console.log('\n💡 Make sure:');
    console.log('   1. The backend server is running (npm start in backend folder)');
    console.log('   2. SLACK_BOT_TOKEN is configured in .env');
    console.log('   3. The bot has access to #fireflies-ai channel');
  }
}

// Run the test
testFirefliesAPI().then(() => {
  console.log('\n✨ API test complete');
  process.exit(0);
});
