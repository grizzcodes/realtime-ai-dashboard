#!/usr/bin/env node
// Test Slack connection and channel access
require('dotenv').config();

const SLACK_TOKEN = process.env.SLACK_BOT_TOKEN;

if (!SLACK_TOKEN) {
  console.error('❌ Missing SLACK_BOT_TOKEN in .env file');
  console.log('\nAdd to backend/.env:');
  console.log('SLACK_BOT_TOKEN=xoxb-your-token-here');
  process.exit(1);
}

console.log('🔍 Testing Slack Connection...');
console.log('Token:', SLACK_TOKEN.slice(0, 20) + '...');

async function testSlack() {
  try {
    // Test 1: Auth test
    console.log('\n📝 Test 1: Checking authentication...');
    const authResponse = await fetch('https://slack.com/api/auth.test', {
      headers: {
        'Authorization': `Bearer ${SLACK_TOKEN}`,
        'Content-Type': 'application/json'
      }
    });
    
    const authData = await authResponse.json();
    
    if (authData.ok) {
      console.log('✅ Connected to Slack!');
      console.log('Team:', authData.team);
      console.log('Bot User:', authData.user);
      console.log('Bot ID:', authData.user_id);
    } else {
      console.error('❌ Auth failed:', authData.error);
      return;
    }
    
    // Test 2: List channels
    console.log('\n📝 Test 2: Listing channels...');
    const channelsResponse = await fetch('https://slack.com/api/conversations.list?limit=100', {
      headers: {
        'Authorization': `Bearer ${SLACK_TOKEN}`,
        'Content-Type': 'application/json'
      }
    });
    
    const channelsData = await channelsResponse.json();
    
    if (channelsData.ok) {
      console.log(`✅ Found ${channelsData.channels.length} channels`);
      
      // Look for fireflies channel
      const firefliesChannel = channelsData.channels.find(ch => 
        ch.name.includes('fireflies') || 
        ch.name.includes('firefly') ||
        ch.name === 'fireflies-ai'
      );
      
      if (firefliesChannel) {
        console.log(`\n🎯 Found Fireflies channel: #${firefliesChannel.name}`);
        console.log('Channel ID:', firefliesChannel.id);
        console.log('Is member?:', firefliesChannel.is_member ? 'Yes ✅' : 'No ❌ - Bot needs to be invited!');
        
        if (firefliesChannel.is_member) {
          // Test 3: Read messages from channel
          console.log('\n📝 Test 3: Reading recent messages...');
          const messagesResponse = await fetch(
            `https://slack.com/api/conversations.history?channel=${firefliesChannel.id}&limit=10`,
            {
              headers: {
                'Authorization': `Bearer ${SLACK_TOKEN}`,
                'Content-Type': 'application/json'
              }
            }
          );
          
          const messagesData = await messagesResponse.json();
          
          if (messagesData.ok) {
            console.log(`✅ Found ${messagesData.messages.length} messages`);
            
            // Check for Fireflies content
            const firefliesMessages = messagesData.messages.filter(msg => {
              const text = msg.text || '';
              return text.includes('Action Items') || 
                     text.includes('Project Overview') ||
                     text.includes('Meeting Summary') ||
                     text.includes('**');
            });
            
            console.log(`📊 Found ${firefliesMessages.length} potential Fireflies summaries`);
            
            if (firefliesMessages.length > 0) {
              console.log('\nSample message preview:');
              console.log(firefliesMessages[0].text.substring(0, 200) + '...');
            }
          } else {
            console.error('❌ Could not read messages:', messagesData.error);
            if (messagesData.error === 'not_in_channel') {
              console.log('\n⚠️ Bot is not in the channel! Please invite it:');
              console.log(`1. Go to #${firefliesChannel.name} in Slack`);
              console.log('2. Type: /invite @your-bot-name');
            }
          }
        } else {
          console.log('\n⚠️ Bot is not a member of the channel!');
          console.log('To fix this:');
          console.log(`1. Go to #${firefliesChannel.name} in Slack`);
          console.log('2. Type: /invite @your-bot-name');
          console.log('3. Or click channel settings → Integrations → Add apps');
        }
      } else {
        console.log('\n⚠️ No Fireflies channel found');
        console.log('Available channels:');
        channelsData.channels.slice(0, 10).forEach(ch => {
          console.log(`  - #${ch.name} (member: ${ch.is_member})`);
        });
      }
    } else {
      console.error('❌ Could not list channels:', channelsData.error);
      if (channelsData.error === 'missing_scope') {
        console.log('\n⚠️ Missing required scopes. Add these in your Slack app:');
        console.log('  - channels:read');
        console.log('  - channels:history');
        console.log('  - groups:read (for private channels)');
        console.log('  - groups:history (for private channels)');
      }
    }
    
  } catch (error) {
    console.error('❌ Test failed:', error.message);
  }
}

testSlack();
