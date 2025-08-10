// backend/test-fireflies-parser.js
require('dotenv').config();
const FirefliesParser = require('./services/fireflies-parser');

async function testParser() {
  console.log('🔍 Testing Fireflies Parser with Slack Blocks...\n');
  
  const parser = new FirefliesParser(process.env.SLACK_BOT_TOKEN);
  
  try {
    // Fetch recent meetings
    console.log('📨 Fetching recent Fireflies meetings...\n');
    const meetings = await parser.fetchRecentMeetings('fireflies-ai', 20);
    
    if (meetings.length === 0) {
      console.log('❌ No meetings found with Fireflies data');
      return;
    }
    
    console.log(`✅ Found ${meetings.length} meetings with Fireflies data\n`);
    console.log('=' .repeat(80));
    
    // Display first 3 meetings in detail
    meetings.slice(0, 3).forEach((meeting, index) => {
      console.log(`\nMEETING ${index + 1}:`);
      console.log('-'.repeat(40));
      
      console.log(`📅 Title: ${meeting.title || 'Untitled'}`);
      console.log(`📆 Date: ${meeting.date || 'Unknown'}`);
      console.log(`👥 Participants: ${meeting.participants?.join(', ') || 'None listed'}`);
      
      if (meeting.gist) {
        console.log(`\n📝 Gist:\n   ${meeting.gist}`);
      }
      
      if (meeting.overview && meeting.overview.length > 0) {
        console.log(`\n📊 Overview:`);
        meeting.overview.forEach(item => {
          console.log(`   • ${item}`);
        });
      }
      
      if (meeting.actionItems && meeting.actionItems.length > 0) {
        console.log(`\n🎯 Action Items:`);
        meeting.actionItems.forEach(item => {
          console.log(`   ${item.assignee}:`);
          item.tasks.forEach(task => {
            console.log(`     ✓ ${task}`);
          });
        });
      }
      
      if (meeting.url) {
        console.log(`\n🔗 Fireflies URL: ${meeting.url}`);
      }
      
      console.log('\n' + '=' .repeat(80));
    });
    
    // Summary of all meetings
    console.log('\n📊 SUMMARY OF ALL MEETINGS:');
    console.log('-'.repeat(40));
    meetings.forEach((meeting, index) => {
      const actionCount = meeting.actionItems?.reduce((sum, item) => sum + item.tasks.length, 0) || 0;
      console.log(`${index + 1}. ${meeting.title || 'Untitled'} - ${actionCount} action items`);
    });
    
  } catch (error) {
    console.error('❌ Error:', error.message);
    if (error.stack) {
      console.error('\nStack trace:', error.stack);
    }
  }
}

// Run the test
testParser().then(() => {
  console.log('\n✨ Parser test complete');
});
