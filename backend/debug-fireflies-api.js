// backend/debug-fireflies-api.js
// Debug script to see what's happening with the API

require('dotenv').config();
const FirefliesParser = require('./services/fireflies-parser');

async function debugAPI() {
  console.log('🔍 Debugging Fireflies API...\n');
  
  // Check environment
  console.log('Environment check:');
  console.log('  SLACK_BOT_TOKEN:', process.env.SLACK_BOT_TOKEN ? '✅ Configured' : '❌ Missing');
  console.log('  PORT:', process.env.PORT || '3001');
  console.log();
  
  if (!process.env.SLACK_BOT_TOKEN) {
    console.log('❌ SLACK_BOT_TOKEN is not configured in .env');
    return;
  }
  
  try {
    // Test the parser directly
    console.log('📡 Testing FirefliesParser directly...');
    const parser = new FirefliesParser(process.env.SLACK_BOT_TOKEN);
    
    console.log('  Fetching meetings...');
    const meetings = await parser.fetchRecentMeetings('fireflies-ai', 5);
    
    console.log(`✅ Parser returned ${meetings.length} meetings\n`);
    
    // Show meeting details
    meetings.forEach((meeting, index) => {
      console.log(`Meeting ${index + 1}:`);
      console.log(`  Title: ${meeting.title || 'Untitled'}`);
      console.log(`  Date: ${meeting.date || 'Unknown'}`);
      console.log(`  URL: ${meeting.url ? 'Yes' : 'No'}`);
      console.log(`  Participants: ${meeting.participants?.length || 0}`);
      console.log(`  Action Items: ${meeting.actionItems?.length || 0} assignees`);
      
      if (meeting.actionItems && meeting.actionItems.length > 0) {
        const totalTasks = meeting.actionItems.reduce((sum, item) => sum + (item.tasks?.length || 0), 0);
        console.log(`  Total Tasks: ${totalTasks}`);
      }
      console.log();
    });
    
    // Test action items
    console.log('📡 Testing action items aggregation...');
    const actionItemsByAssignee = parser.getActionItemsByAssignee(meetings);
    const assignees = Object.keys(actionItemsByAssignee);
    console.log(`✅ Found ${assignees.length} assignees with tasks`);
    
    const totalTasks = Object.values(actionItemsByAssignee).reduce(
      (sum, assignee) => sum + assignee.tasks.length, 0
    );
    console.log(`   Total tasks across all meetings: ${totalTasks}`);
    
  } catch (error) {
    console.error('❌ Error:', error.message);
    console.error('Stack:', error.stack);
  }
}

// Run the debug
debugAPI().then(() => {
  console.log('\n✨ Debug complete');
  process.exit(0);
}).catch(error => {
  console.error('Fatal error:', error);
  process.exit(1);
});
