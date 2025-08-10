// backend/test-slack-fireflies.js
// Test script to verify Slack-Fireflies integration

require('dotenv').config();
const { WebClient } = require('@slack/web-api');

async function testSlackFirefliesConnection() {
  console.log('🔍 Testing Slack-Fireflies Integration\n');
  console.log('=====================================\n');
  
  // Check if Slack token is configured
  if (!process.env.SLACK_BOT_TOKEN) {
    console.log('❌ SLACK_BOT_TOKEN is not configured in .env file');
    return;
  }
  
  console.log('✅ SLACK_BOT_TOKEN found in environment\n');
  
  try {
    // Initialize Slack client
    const slack = new WebClient(process.env.SLACK_BOT_TOKEN);
    
    // Test authentication
    console.log('📡 Testing Slack authentication...');
    const authTest = await slack.auth.test();
    console.log('✅ Connected to Slack workspace:', authTest.team);
    console.log('✅ Bot user:', authTest.user);
    console.log('✅ Bot ID:', authTest.user_id);
    console.log('\n');
    
    // Get list of channels
    console.log('📋 Fetching channel list...');
    const channelsResult = await slack.conversations.list({
      exclude_archived: true,
      types: 'public_channel,private_channel',
      limit: 100
    });
    
    // Look for fireflies-ai channel
    const firefliesChannel = channelsResult.channels.find(c => c.name === 'fireflies-ai');
    
    if (!firefliesChannel) {
      console.log('⚠️  Channel "fireflies-ai" not found');
      console.log('\n📌 Available channels where bot is a member:');
      const memberChannels = channelsResult.channels.filter(c => c.is_member);
      memberChannels.forEach(channel => {
        console.log(`   - #${channel.name}${channel.is_private ? ' (private)' : ''}`);
      });
      
      console.log('\n💡 Next steps:');
      console.log('   1. Create a channel called "fireflies-ai" in Slack');
      console.log('   2. Invite the bot to the channel: /invite @[bot-name]');
      console.log('   3. Configure Fireflies to send summaries to this channel');
      return;
    }
    
    console.log('✅ Found #fireflies-ai channel');
    console.log('   Channel ID:', firefliesChannel.id);
    console.log('   Is Member:', firefliesChannel.is_member ? 'Yes' : 'No');
    console.log('   Is Private:', firefliesChannel.is_private ? 'Yes' : 'No');
    
    if (!firefliesChannel.is_member) {
      console.log('\n⚠️  Bot is not a member of #fireflies-ai');
      console.log('💡 Please invite the bot to the channel: /invite @[bot-name]');
      return;
    }
    
    // Get recent messages from the channel
    console.log('\n📨 Fetching recent messages from #fireflies-ai...');
    const messagesResult = await slack.conversations.history({
      channel: firefliesChannel.id,
      limit: 10
    });
    
    if (!messagesResult.messages || messagesResult.messages.length === 0) {
      console.log('📭 No messages found in #fireflies-ai');
      console.log('\n💡 To receive Fireflies summaries:');
      console.log('   1. Configure Fireflies Slack integration');
      console.log('   2. Set it to post to #fireflies-ai channel');
      console.log('   3. Attend a meeting with Fireflies bot');
      return;
    }
    
    console.log(`✅ Found ${messagesResult.messages.length} recent messages\n`);
    
    // Look for Fireflies bot messages
    const firefliesMessages = messagesResult.messages.filter(msg => msg.bot_id);
    
    if (firefliesMessages.length === 0) {
      console.log('📭 No bot messages found (Fireflies summaries would appear as bot messages)');
      console.log('\n💡 Waiting for Fireflies to post meeting summaries...');
    } else {
      console.log(`🎙️ Found ${firefliesMessages.length} bot messages (potential Fireflies summaries)\n`);
      
      // Display sample of recent Fireflies messages
      console.log('📝 Recent message samples:');
      firefliesMessages.slice(0, 3).forEach((msg, index) => {
        const timestamp = new Date(parseFloat(msg.ts) * 1000);
        const preview = msg.text ? msg.text.substring(0, 100) + '...' : 'No text';
        console.log(`\n   Message ${index + 1}:`);
        console.log(`   Time: ${timestamp.toLocaleString()}`);
        console.log(`   Preview: ${preview}`);
        
        // Check if it looks like a Fireflies summary
        if (msg.text && (msg.text.includes('Meeting') || msg.text.includes('Summary') || msg.text.includes('Action'))) {
          console.log('   ✅ Appears to be a meeting summary');
        }
      });
    }
    
    console.log('\n=====================================');
    console.log('✅ Slack-Fireflies integration test complete!');
    
    // Test the actual endpoint
    console.log('\n🌐 Testing API endpoint...');
    const fetch = require('node-fetch');
    const response = await fetch('http://localhost:3001/api/slack-fireflies/meetings');
    const data = await response.json();
    
    if (data.success) {
      console.log(`✅ API endpoint working! Found ${data.count} meetings`);
      if (data.meetings && data.meetings.length > 0) {
        console.log('\n📊 Meeting summaries available:');
        data.meetings.forEach((meeting, index) => {
          console.log(`   ${index + 1}. ${meeting.title} - ${new Date(meeting.date).toLocaleDateString()}`);
        });
      }
    } else {
      console.log(`⚠️  API endpoint returned error: ${data.error}`);
    }
    
  } catch (error) {
    console.log('❌ Error testing Slack connection:', error.message);
    
    if (error.data && error.data.error === 'invalid_auth') {
      console.log('\n💡 The Slack token appears to be invalid or expired.');
      console.log('   Please check your SLACK_BOT_TOKEN in the .env file');
    } else if (error.data && error.data.error === 'missing_scope') {
      console.log('\n💡 The bot is missing required permissions.');
      console.log('   Required scopes: channels:read, channels:history, groups:read, groups:history');
    }
  }
}

// Run the test
testSlackFirefliesConnection().catch(console.error);
