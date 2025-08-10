// backend/test-fireflies-debug.js - Enhanced Fireflies message debugging
const { WebClient } = require('@slack/web-api');
require('dotenv').config();

const slack = new WebClient(process.env.SLACK_BOT_TOKEN);

async function testFirefliesDebug() {
  try {
    console.log('🔍 Testing Fireflies message parsing...\n');
    
    // Get the fireflies-ai channel
    const channelsResult = await slack.conversations.list({
      exclude_archived: true,
      types: 'private_channel',
      limit: 200
    });
    
    const channel = channelsResult.channels.find(c => c.name === 'fireflies-ai');
    
    if (!channel) {
      console.log('❌ Channel fireflies-ai not found');
      console.log('   Run test-slack-setup.js for diagnostics');
      return;
    }
    
    console.log(`✅ Found channel: #fireflies-ai (ID: ${channel.id})`);
    console.log(`   Members: ${channel.num_members}`);
    console.log(`   Private: ${channel.is_private ? 'Yes' : 'No'}\n`);
    
    // Get recent messages (more than before)
    const messagesResult = await slack.conversations.history({
      channel: channel.id,
      limit: 20  // Get more messages to find Fireflies posts
    });
    
    console.log(`📨 Found ${messagesResult.messages.length} recent messages\n`);
    
    // Find Fireflies bot messages
    const firefliesMessages = messagesResult.messages.filter(msg => 
      msg.bot_id || msg.app_id || (msg.text && msg.text.includes('fireflies'))
    );
    
    if (firefliesMessages.length === 0) {
      console.log('⚠️  No Fireflies bot messages found in recent history');
      console.log('\n📋 All messages summary:');
      messagesResult.messages.forEach((msg, i) => {
        const type = msg.bot_id ? 'Bot' : msg.user ? 'User' : 'Unknown';
        const preview = msg.text ? msg.text.substring(0, 50) : 'No text';
        console.log(`  ${i+1}. [${type}] ${preview}...`);
      });
      return;
    }
    
    console.log(`🤖 Found ${firefliesMessages.length} potential Fireflies messages\n`);
    
    // Analyze each Fireflies message
    firefliesMessages.forEach((message, index) => {
      console.log('=' .repeat(80));
      console.log(`MESSAGE ${index + 1}:`);
      console.log('=' .repeat(80));
      
      // Message metadata
      console.log('\n📊 METADATA:');
      console.log(`  Timestamp: ${new Date(message.ts * 1000).toLocaleString()}`);
      console.log(`  Bot ID: ${message.bot_id || 'N/A'}`);
      console.log(`  App ID: ${message.app_id || 'N/A'}`);
      console.log(`  Has attachments: ${message.attachments ? 'Yes' : 'No'}`);
      console.log(`  Has blocks: ${message.blocks ? 'Yes' : 'No'}`);
      
      const text = message.text || '';
      
      // Check message format
      console.log('\n📋 FORMAT DETECTION:');
      if (text.includes('**')) {
        console.log('  ✓ Uses ** for bold (Markdown style)');
      }
      if (text.includes('*') && !text.includes('**')) {
        console.log('  ✓ Uses * for bold (Slack style)');
      }
      if (text.includes('###')) {
        console.log('  ✓ Uses ### for headers');
      }
      if (text.includes('•')) {
        console.log('  ✓ Uses bullet points (•)');
      }
      if (text.includes('- ')) {
        console.log('  ✓ Uses dash lists (-)');
      }
      
      // Look for key sections
      console.log('\n📝 SECTIONS FOUND:');
      const sections = [
        'Title:', 'Meeting Title:', 'Topic:',
        'Date:', 'Time:', 'Date and Time:',
        'Participants:', 'Attendees:',
        'Summary:', 'Gist:', 'Overview:',
        'Notes:', 'Discussion:',
        'Action Items:', 'Tasks:', 'Next Steps:',
        'Key Points:', 'Highlights:'
      ];
      
      sections.forEach(section => {
        if (text.toLowerCase().includes(section.toLowerCase())) {
          console.log(`  ✓ ${section}`);
        }
      });
      
      // Extract title
      console.log('\n📌 EXTRACTED DATA:');
      const titlePatterns = [
        /\*\*Title:\*\*\s*(.+?)(?:\n|$)/,
        /\*Title:\*\s*(.+?)(?:\n|$)/,
        /Title:\s*(.+?)(?:\n|$)/,
        /Meeting Title:\s*(.+?)(?:\n|$)/
      ];
      
      let title = null;
      for (const pattern of titlePatterns) {
        const match = text.match(pattern);
        if (match) {
          title = match[1].trim();
          console.log(`  Title: "${title}"`);
          break;
        }
      }
      
      // Extract date/time
      const datePatterns = [
        /\*\*Date and Time:\*\*\s*(.+?)(?:\n|$)/,
        /\*Date and Time:\*\s*(.+?)(?:\n|$)/,
        /Date:\s*(.+?)(?:\n|$)/
      ];
      
      for (const pattern of datePatterns) {
        const match = text.match(pattern);
        if (match) {
          console.log(`  Date/Time: "${match[1].trim()}"`);
          break;
        }
      }
      
      // Show Fireflies URL
      const urlMatch = text.match(/https?:\/\/app\.fireflies\.ai\/view\/[^\s<>]+/i);
      if (urlMatch) {
        console.log(`  Fireflies URL: ${urlMatch[0]}`);
      }
      
      // Show first 500 characters of raw text
      console.log('\n📄 RAW TEXT (first 500 chars):');
      console.log(text.substring(0, 500));
      
      // If message has blocks, show block structure
      if (message.blocks && message.blocks.length > 0) {
        console.log('\n🔧 SLACK BLOCKS STRUCTURE:');
        message.blocks.forEach((block, i) => {
          console.log(`  Block ${i}: Type=${block.type}`);
          if (block.text) {
            console.log(`    Text type: ${block.text.type}`);
            const preview = block.text.text ? block.text.text.substring(0, 100) : '';
            console.log(`    Preview: ${preview}...`);
          }
        });
      }
      
      console.log('\n' + '=' .repeat(80) + '\n');
    });
    
    // Show parsing recommendation
    console.log('💡 PARSING RECOMMENDATIONS:');
    console.log('Based on the message format above, update your parsing logic to handle:');
    console.log('  1. The specific markdown format used (** vs *)');
    console.log('  2. The exact section headers used');
    console.log('  3. Whether to parse from text or blocks');
    console.log('  4. The structure of action items');
    
  } catch (error) {
    console.error('Error:', error.message);
    if (error.data) {
      console.error('Error details:', error.data);
    }
  }
}

// Run the test
testFirefliesDebug().then(() => {
  console.log('\n✨ Fireflies debug test complete');
});
