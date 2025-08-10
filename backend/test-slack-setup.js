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
    
    // 3. List all channels the bot can see (including private)
    console.log('📋 Listing all accessible channels (public and private)...');
    
    // Get public channels
    const publicChannelsResult = await slack.conversations.list({
      exclude_archived: true,
      types: 'public_channel',
      limit: 200
    });
    
    // Get private channels the bot is a member of
    const privateChannelsResult = await slack.conversations.list({
      exclude_archived: true,
      types: 'private_channel',
      limit: 200
    });
    
    const allChannels = [...publicChannelsResult.channels, ...privateChannelsResult.channels];
    
    console.log(`Found ${publicChannelsResult.channels.length} public channels`);
    console.log(`Found ${privateChannelsResult.channels.length} private channels bot is member of\n`);
    
    // Look for fireflies-related channels
    const firefliesChannels = allChannels.filter(c => 
      c.name.toLowerCase().includes('fireflies') || 
      c.name.toLowerCase().includes('meeting') ||
      c.name.toLowerCase().includes('ai')
    );
    
    if (firefliesChannels.length > 0) {
      console.log('🔥 AI/Fireflies/Meeting-related channels found:');
      firefliesChannels.forEach(c => {
        const type = c.is_private ? '🔒 Private' : '📢 Public';
        const member = c.is_member ? '✅ Member' : '❌ Not Member';
        console.log(`  ${type} #${c.name} - ${member} (ID: ${c.id})`);
      });
    } else {
      console.log('⚠️  No channels with "fireflies", "meeting", or "ai" in the name found');
    }
    
    // 4. Check if specific fireflies-ai channel exists
    console.log('\n🎯 Looking for #fireflies-ai channel...');
    const targetChannel = allChannels.find(c => c.name === 'fireflies-ai');
    
    if (targetChannel) {
      console.log(`✅ Channel #fireflies-ai exists (ID: ${targetChannel.id})`);
      console.log(`   Type: ${targetChannel.is_private ? '🔒 Private' : '📢 Public'}`);
      
      if (targetChannel.is_member) {
        console.log('✅ Bot IS a member of #fireflies-ai');
        
        // Try to get a message from the channel
        try {
          const testMessages = await slack.conversations.history({
            channel: targetChannel.id,
            limit: 1
          });
          console.log('✅ Bot can read messages from #fireflies-ai');
        } catch (msgError) {
          console.log('❌ Bot cannot read messages from #fireflies-ai');
          console.log('   Error:', msgError.data?.error || msgError.message);
        }
      } else {
        console.log('❌ Bot is NOT a member of #fireflies-ai');
        console.log('   Action: Invite the bot to the channel');
      }
    } else {
      console.log('❌ Channel #fireflies-ai does not exist or bot cannot see it');
      console.log('\n📝 Suggested actions:');
      console.log('   1. If #fireflies-ai is a PRIVATE channel:');
      console.log('      - Go to the #fireflies-ai channel in Slack');
      console.log('      - Type: /invite @' + auth.user);
      console.log('      - Or add the bot as a member in channel settings');
      console.log('   2. If #fireflies-ai doesn\'t exist:');
      console.log('      - Create a channel named "fireflies-ai" in Slack');
      console.log('      - Make it private if needed');
      console.log('      - Invite the bot to the channel');
      console.log('   3. Configure Fireflies to send notifications to this channel');
    }
    
    // 5. List all channels for reference
    console.log('\n📊 All channels visible to bot:');
    console.log('\nPUBLIC CHANNELS:');
    publicChannelsResult.channels.forEach(c => {
      const memberStatus = c.is_member ? '✅ Member' : '❌ Not Member';
      console.log(`  ${memberStatus} #${c.name} (${c.num_members || 0} members)`);
    });
    
    if (privateChannelsResult.channels.length > 0) {
      console.log('\nPRIVATE CHANNELS (bot is member):');
      privateChannelsResult.channels.forEach(c => {
        console.log(`  ✅ Member 🔒 #${c.name} (${c.num_members || 0} members)`);
      });
    } else {
      console.log('\n⚠️  Bot is not a member of any private channels');
    }
    
    // 6. Check bot permissions/scopes
    console.log('\n🔐 Required OAuth Scopes for full functionality:');
    const requiredScopes = {
      'channels:history': 'Read public channel messages',
      'channels:read': 'View public channels',
      'groups:history': 'Read private channel messages',
      'groups:read': 'View private channels bot is in',
      'chat:write': 'Send messages',
      'users:read': 'View user information'
    };
    
    for (const [scope, description] of Object.entries(requiredScopes)) {
      console.log(`  - ${scope}: ${description}`);
    }
    
    console.log('\n💡 If bot cannot see private channels:');
    console.log('   1. Add "groups:read" and "groups:history" scopes in Slack App settings');
    console.log('   2. Reinstall the app to workspace after adding scopes');
    console.log('   3. Invite the bot to private channels manually');
    
  } catch (error) {
    console.error('\n❌ Error testing Slack:', error.message);
    
    if (error.data && error.data.error === 'invalid_auth') {
      console.log('\n⚠️  Invalid authentication token');
      console.log('   1. Check if SLACK_BOT_TOKEN in .env is correct');
      console.log('   2. Make sure the token starts with "xoxb-"');
      console.log('   3. Regenerate the token in Slack App settings if needed');
    } else if (error.data && error.data.error === 'missing_scope') {
      console.log('\n⚠️  Bot is missing required permissions');
      console.log('   1. Go to your Slack App settings');
      console.log('   2. Add the required OAuth scopes listed above');
      console.log('   3. Reinstall the app to your workspace');
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
