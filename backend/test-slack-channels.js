// backend/test-slack-channels.js
// Debug script to see what channels the Slack bot can access

require('dotenv').config();
const { WebClient } = require('@slack/web-api');

async function debugSlackChannels() {
  console.log('🔍 Slack Channel Debug Tool\n');
  console.log('=====================================\n');
  
  if (!process.env.SLACK_BOT_TOKEN) {
    console.log('❌ SLACK_BOT_TOKEN is not configured');
    return;
  }
  
  try {
    const slack = new WebClient(process.env.SLACK_BOT_TOKEN);
    
    // Test authentication first
    console.log('📡 Testing Slack authentication...');
    const authTest = await slack.auth.test();
    console.log('✅ Connected as:', authTest.user);
    console.log('✅ Workspace:', authTest.team);
    console.log('✅ Bot User ID:', authTest.user_id);
    console.log('\n');
    
    // Get ALL channels (public)
    console.log('📋 Fetching ALL public channels...');
    const publicChannels = await slack.conversations.list({
      exclude_archived: true,
      types: 'public_channel',
      limit: 200
    });
    
    console.log(`Found ${publicChannels.channels.length} public channels:\n`);
    
    // List all public channels and show which ones the bot is in
    const publicMemberChannels = [];
    const publicNonMemberChannels = [];
    
    publicChannels.channels.forEach(channel => {
      if (channel.is_member) {
        publicMemberChannels.push(channel);
      } else {
        publicNonMemberChannels.push(channel);
      }
    });
    
    console.log(`📌 Public channels BOT IS IN (${publicMemberChannels.length}):`);
    publicMemberChannels.forEach(channel => {
      console.log(`   ✅ #${channel.name} (ID: ${channel.id})`);
    });
    
    if (publicMemberChannels.length === 0) {
      console.log('   ❌ Bot is not in any public channels!');
    }
    
    console.log(`\n📌 Public channels BOT IS NOT IN (${publicNonMemberChannels.length}):`);
    publicNonMemberChannels.slice(0, 20).forEach(channel => {
      console.log(`   ⭕ #${channel.name}`);
    });
    
    if (publicNonMemberChannels.length > 20) {
      console.log(`   ... and ${publicNonMemberChannels.length - 20} more`);
    }
    
    // Check for private channels
    console.log('\n📋 Fetching private channels (bot must be member)...');
    const privateChannels = await slack.conversations.list({
      exclude_archived: true,
      types: 'private_channel',
      limit: 200
    });
    
    if (privateChannels.channels.length > 0) {
      console.log(`\n📌 Private channels BOT IS IN (${privateChannels.channels.length}):`);
      privateChannels.channels.forEach(channel => {
        console.log(`   🔒 #${channel.name} (ID: ${channel.id})`);
      });
    } else {
      console.log('   ℹ️  Bot is not in any private channels');
    }
    
    // Look for channels with "fireflies" in the name
    console.log('\n🔍 Searching for channels with "fireflies" in the name...');
    const allChannels = [...publicChannels.channels, ...privateChannels.channels];
    const firefliesRelated = allChannels.filter(c => 
      c.name.toLowerCase().includes('fireflies') || 
      c.name.toLowerCase().includes('firefly') ||
      c.name.toLowerCase().includes('meeting') ||
      c.name.toLowerCase().includes('transcript')
    );
    
    if (firefliesRelated.length > 0) {
      console.log('Found potentially related channels:');
      firefliesRelated.forEach(channel => {
        const status = channel.is_member ? '✅ BOT IS MEMBER' : '❌ BOT NOT MEMBER';
        const type = channel.is_private ? '🔒 Private' : '📢 Public';
        console.log(`   ${type} #${channel.name} - ${status}`);
      });
    } else {
      console.log('   No channels found with fireflies/meeting/transcript in the name');
    }
    
    // Provide next steps
    console.log('\n=====================================');
    console.log('💡 NEXT STEPS:\n');
    
    const firefliesChannel = allChannels.find(c => c.name === 'fireflies-ai');
    
    if (!firefliesChannel) {
      console.log('1. Create the channel in Slack:');
      console.log('   - Create a new channel called exactly: fireflies-ai');
      console.log('   - Make it public (recommended) or private');
      console.log('\n2. Add the bot to the channel:');
      console.log('   - In the channel, type: /invite @' + authTest.user);
      console.log('\n3. Configure Fireflies:');
      console.log('   - In Fireflies settings, set up Slack integration');
      console.log('   - Choose to post summaries to #fireflies-ai');
    } else if (!firefliesChannel.is_member) {
      console.log('✅ Channel #fireflies-ai exists!');
      console.log('\n1. Add the bot to the channel:');
      console.log('   - Go to #fireflies-ai in Slack');
      console.log('   - Type: /invite @' + authTest.user);
      console.log('\n2. Then test again with this script');
    } else {
      console.log('✅ Everything looks good!');
      console.log('   - Channel exists: #fireflies-ai');
      console.log('   - Bot is a member of the channel');
      console.log('\nNow just wait for Fireflies to post meeting summaries!');
    }
    
    // Test permissions
    console.log('\n📋 Checking bot permissions (OAuth Scopes)...');
    console.log('Required scopes for this integration:');
    console.log('   - channels:read (to list channels)');
    console.log('   - channels:history (to read messages)');
    console.log('   - groups:read (for private channels)');
    console.log('   - groups:history (for private channel messages)');
    console.log('\nIf the bot can\'t see channels, you may need to add these scopes');
    console.log('in your Slack App settings at api.slack.com/apps');
    
  } catch (error) {
    console.log('❌ Error:', error.message);
    
    if (error.data && error.data.error === 'invalid_auth') {
      console.log('\n⚠️  The Slack token is invalid or expired');
      console.log('Please check your SLACK_BOT_TOKEN in .env');
    } else if (error.data && error.data.error === 'missing_scope') {
      console.log('\n⚠️  Missing required permissions');
      console.log('Add these OAuth scopes in your Slack app:');
      console.log('- channels:read');
      console.log('- channels:history');
      console.log('- groups:read (for private channels)');
    } else {
      console.log('\nFull error:', error);
    }
  }
}

// Run the debug tool
debugSlackChannels().catch(console.error);
