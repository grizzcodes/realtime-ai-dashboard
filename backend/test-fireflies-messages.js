// backend/test-fireflies-messages.js
// Test script to check messages in the Fireflies channel

require('dotenv').config();
const { WebClient } = require('@slack/web-api');

async function testFirefliesMessages() {
  console.log('🎙️ Testing Fireflies Channel Messages\n');
  console.log('=====================================\n');
  
  if (!process.env.SLACK_BOT_TOKEN) {
    console.log('❌ SLACK_BOT_TOKEN is not configured');
    return;
  }
  
  try {
    const slack = new WebClient(process.env.SLACK_BOT_TOKEN);
    
    // Get the fireflies-ai channel
    console.log('🔍 Looking for #fireflies-ai channel...');
    
    // Check private channels (we know it's private from your test)
    const privateChannels = await slack.conversations.list({
      exclude_archived: true,
      types: 'private_channel',
      limit: 200
    });
    
    const channel = privateChannels.channels.find(c => c.name === 'fireflies-ai');
    
    if (!channel) {
      console.log('❌ Channel not found');
      return;
    }
    
    console.log('✅ Found channel: #fireflies-ai');
    console.log('   Channel ID:', channel.id);
    console.log('   Is Private: Yes');
    console.log('   Bot is Member: Yes\n');
    
    // Get messages from the channel
    console.log('📨 Fetching recent messages...');
    const messagesResult = await slack.conversations.history({
      channel: channel.id,
      limit: 50  // Get last 50 messages
    });
    
    if (!messagesResult.messages || messagesResult.messages.length === 0) {
      console.log('📭 No messages in channel');
      console.log('\n💡 To set up Fireflies:');
      console.log('   1. Go to fireflies.ai dashboard');
      console.log('   2. Settings → Integrations → Slack');
      console.log('   3. Connect Slack workspace');
      console.log('   4. Choose #fireflies-ai as the channel');
      console.log('   5. Enable "Post meeting recaps"');
      return;
    }
    
    console.log(`📬 Found ${messagesResult.messages.length} messages\n`);
    
    // Analyze message types
    const regularMessages = messagesResult.messages.filter(m => !m.bot_id && !m.subtype);
    const botMessages = messagesResult.messages.filter(m => m.bot_id || m.subtype === 'bot_message');
    const appMessages = messagesResult.messages.filter(m => m.app_id);
    
    console.log('📊 Message Analysis:');
    console.log(`   Regular messages: ${regularMessages.length}`);
    console.log(`   Bot messages: ${botMessages.length}`);
    console.log(`   App messages: ${appMessages.length}`);
    console.log('');
    
    // Look for Fireflies-specific content
    console.log('🔍 Searching for Fireflies content...\n');
    
    let firefliesMessages = [];
    
    for (const message of messagesResult.messages) {
      const text = message.text || '';
      const hasFirefliesContent = 
        text.toLowerCase().includes('fireflies') ||
        text.toLowerCase().includes('meeting') ||
        text.toLowerCase().includes('summary') ||
        text.toLowerCase().includes('transcript') ||
        text.toLowerCase().includes('action items') ||
        text.toLowerCase().includes('attendees') ||
        text.includes('fireflies.ai') ||
        (message.bot_profile && message.bot_profile.name && message.bot_profile.name.toLowerCase().includes('fireflies'));
      
      if (hasFirefliesContent || message.bot_id) {
        firefliesMessages.push(message);
      }
    }
    
    if (firefliesMessages.length > 0) {
      console.log(`🎯 Found ${firefliesMessages.length} potential Fireflies messages:\n`);
      
      // Show details of first 3 Fireflies messages
      firefliesMessages.slice(0, 3).forEach((msg, index) => {
        const timestamp = new Date(parseFloat(msg.ts) * 1000);
        console.log(`📝 Message ${index + 1}:`);
        console.log(`   Time: ${timestamp.toLocaleString()}`);
        console.log(`   Type: ${msg.bot_id ? 'Bot Message' : 'Regular Message'}`);
        if (msg.bot_profile) {
          console.log(`   Bot Name: ${msg.bot_profile.name || 'Unknown'}`);
        }
        console.log(`   Preview: ${msg.text ? msg.text.substring(0, 150).replace(/\n/g, ' ') : 'No text'}...`);
        console.log('');
      });
    } else {
      console.log('❌ No Fireflies messages found\n');
      
      // Show sample of any messages to help debug
      if (messagesResult.messages.length > 0) {
        console.log('📋 Sample of recent messages in channel:\n');
        messagesResult.messages.slice(0, 3).forEach((msg, index) => {
          const timestamp = new Date(parseFloat(msg.ts) * 1000);
          console.log(`Message ${index + 1}:`);
          console.log(`   Time: ${timestamp.toLocaleString()}`);
          console.log(`   Is Bot: ${msg.bot_id ? 'Yes' : 'No'}`);
          console.log(`   Text: ${msg.text ? msg.text.substring(0, 100).replace(/\n/g, ' ') : 'No text'}...`);
          console.log('');
        });
      }
    }
    
    // Test the API endpoint
    console.log('=====================================');
    console.log('🌐 Testing API Endpoint...\n');
    
    const fetch = require('node-fetch');
    try {
      const response = await fetch('http://localhost:3001/api/slack-fireflies/meetings');
      const data = await response.json();
      
      if (data.success) {
        console.log(`✅ API Response: Success`);
        console.log(`   Meetings found: ${data.count}`);
        if (data.channelInfo) {
          console.log(`   Channel: ${data.channelInfo.name} (Private: ${data.channelInfo.isPrivate})`);
        }
        
        if (data.meetings && data.meetings.length > 0) {
          console.log('\n📊 Meetings from API:');
          data.meetings.forEach((meeting, index) => {
            console.log(`   ${index + 1}. ${meeting.title}`);
            if (meeting.date) {
              console.log(`      Date: ${new Date(meeting.date).toLocaleDateString()}`);
            }
          });
        }
      } else {
        console.log(`❌ API Response: ${data.error}`);
        if (data.hint) {
          console.log(`   Hint: ${data.hint}`);
        }
      }
    } catch (error) {
      console.log('⚠️  Could not test API endpoint. Make sure server is running:');
      console.log('   cd backend && npm run dev');
    }
    
    console.log('\n=====================================');
    console.log('📌 Summary:\n');
    
    if (firefliesMessages.length > 0) {
      console.log('✅ Fireflies integration appears to be working!');
      console.log(`   Found ${firefliesMessages.length} Fireflies messages`);
    } else {
      console.log('⚠️  No Fireflies messages found yet');
      console.log('\n🔧 Setup checklist:');
      console.log('   ✅ Slack bot connected');
      console.log('   ✅ Bot in #fireflies-ai channel');
      console.log('   ⏳ Waiting for Fireflies to post meeting summaries');
      console.log('\nNext steps:');
      console.log('   1. Ensure Fireflies.ai is connected to your Slack workspace');
      console.log('   2. In Fireflies settings, set it to post to #fireflies-ai');
      console.log('   3. After your next meeting with Fireflies, check back here');
    }
    
  } catch (error) {
    console.log('❌ Error:', error.message);
    console.log('\nFull error:', error);
  }
}

// Run the test
testFirefliesMessages().catch(console.error);
