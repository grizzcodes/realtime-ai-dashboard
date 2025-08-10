// backend/test-slack-setup.js - Diagnostic script for Slack setup
const { WebClient } = require('@slack/web-api');
require('dotenv').config();

const slack = new WebClient(process.env.SLACK_BOT_TOKEN);

async function testSlackSetup() {
  console.log('🔍 Testing Slack Setup...\n');
  
  // 1. Test if bot token is configured
  if (!process.env.SLACK_BOT_TOKEN) {
    console.log('❌ SLACK_BOT_TOKEN is not configured in .env file');
    console.log('   Please add your Slack bot token to the .env file');
    return;
  }
  
  console.log('✅ SLACK_BOT_TOKEN is configured\n');
  
  try {
    // 2. Test bot authentication
    console.log('📡 Testing bot authentication...');
    const auth = await slack.auth.test();
    console.log(`✅ Bot authenticated as: ${auth.user} (Team: ${auth.team})\n`);
    
    // 3. List all channels the bot can see
    console.log('📋 Listing all accessible channels...');
    const channelsResult = await slack.conversations.list({
      exclude_archived: true,
      types: 'public_channel,private_channel',
      limit: 200
    });
    
    console.log(`Found ${channelsResult.channels.length} channels:\n`);
    
    // Look for fireflies-related channels
    const firefliesChannels = channelsResult.channels.filter(c => 
      c.name.toLowerCase().includes('fireflies') || 
      c.name.toLowerCase().includes('meeting')
    );
    
    if (firefliesChannels.length > 0) {
      console.log('🔥 Fireflies-related channels found:');
      firefliesChannels.forEach(c => {
        console.log(`  - #${c.name} (ID: ${c.id}, Members: ${c.num_members || 'N/A'})`);
      });
    } else {
      console.log('⚠️  No channels with "fireflies" or "meeting" in the name found');
    }
    
    // 4. Check if specific fireflies-ai channel exists
    console.log('\n🎯 Looking for #fireflies-ai channel...');
    const targetChannel = channelsResult.channels.find(c => c.name === 'fireflies-ai');
    
    if (targetChannel) {
      console.log(`✅ Channel #fireflies-ai exists (ID: ${targetChannel.id})`);
      
      // Check if bot is a member
      const membership = await slack.conversations.info({
        channel: targetChannel.id
      });
      
      if (membership.channel.is_member) {
        console.log('✅ Bot is a member of #fireflies-ai');
      } else {
        console.log('❌ Bot is NOT a member of #fireflies-ai');
        console.log('   Action: Invite the bot to the channel');
      }
    } else {
      console.log('❌ Channel #fireflies-ai does not exist or bot cannot see it');
      console.log('\n📝 Suggested actions:');
      console.log('   1. Create a channel named "fireflies-ai" in Slack');
      console.log('   2. Invite your bot to the channel');
      console.log('   3. Configure Fireflies to send notifications to this channel');
    }
    
    // 5. List all channels for reference
    console.log('\n📊 All available channels:');
    channelsResult.channels.forEach(c => {
      const memberStatus = c.is_member ? '✅' : '❌';
      console.log(`  ${memberStatus} #${c.name} (${c.num_members || 0} members)`);
    });
    
    // 6. Check bot permissions
    console.log('\n🔐 Checking bot permissions...');
    if (auth.ok) {
      console.log('Bot has the following OAuth scopes:');
      const scopes = process.env.SLACK_BOT_TOKEN.startsWith('xoxb-') 
        ? ['channels:history', 'channels:read', 'chat:write', 'users:read']
        : ['Unknown - check Slack App settings'];
      scopes.forEach(scope => console.log(`  - ${scope}`));
    }
    
  } catch (error) {
    console.error('\n❌ Error testing Slack:', error.message);
    
    if (error.data && error.data.error === 'invalid_auth') {
      console.log('\n⚠️  Invalid authentication token');
      console.log('   1. Check if SLACK_BOT_TOKEN in .env is correct');
      console.log('   2. Make sure the token starts with "xoxb-"');
      console.log('   3. Regenerate the token in Slack App settings if needed');
    } else if (error.data && error.data.error === 'not_in_channel') {
      console.log('\n⚠️  Bot is not in the required channel');
      console.log('   Invite the bot to the channel first');
    } else {
      console.log('\nFull error:', error);
    }
  }
}

// Run the test
testSlackSetup().then(() => {
  console.log('\n✨ Slack setup test complete');
}).catch(error => {
  console.error('Fatal error:', error);
});
