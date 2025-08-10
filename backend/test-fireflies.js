// backend/test-fireflies.js - Test script to debug Fireflies parsing
const { WebClient } = require('@slack/web-api');
require('dotenv').config();

const slack = new WebClient(process.env.SLACK_BOT_TOKEN);

async function testFirefliesParsing() {
  try {
    console.log('🔍 Testing Fireflies message parsing...\n');
    
    // Get the fireflies-ai channel
    const channelsResult = await slack.conversations.list({
      exclude_archived: true,
      types: 'public_channel,private_channel',
      limit: 200
    });
    
    const channel = channelsResult.channels.find(c => c.name === 'fireflies-ai');
    
    if (!channel) {
      console.log('❌ Channel fireflies-ai not found');
      return;
    }
    
    console.log(`✅ Found channel: #fireflies-ai\n`);
    
    // Get recent messages
    const messagesResult = await slack.conversations.history({
      channel: channel.id,
      limit: 5
    });
    
    console.log(`📨 Found ${messagesResult.messages.length} messages\n`);
    
    // Analyze first Fireflies message
    for (const message of messagesResult.messages) {
      if (message.bot_id && message.text) {
        console.log('=' .repeat(80));
        console.log('MESSAGE ANALYSIS:');
        console.log('=' .repeat(80));
        
        const text = message.text;
        
        // Check what sections exist
        console.log('\n📋 SECTIONS FOUND:');
        if (text.includes('**Title:')) console.log('  ✓ Title');
        if (text.includes('**Date and Time:')) console.log('  ✓ Date and Time');
        if (text.includes('**Participants:')) console.log('  ✓ Participants');
        if (text.includes('**Gist:')) console.log('  ✓ Gist');
        if (text.includes('**Overview:')) console.log('  ✓ Overview');
        if (text.includes('**Notes:')) console.log('  ✓ Notes');
        if (text.includes('**Action Items:')) console.log('  ✓ Action Items');
        
        // Extract and display each section
        console.log('\n📝 EXTRACTED CONTENT:');
        
        // Title
        const titleMatch = text.match(/\*\*Title:\*\*\s*(.+?)(?:\n|$)/);
        if (titleMatch) {
          console.log(`\nTitle: "${titleMatch[1].trim()}"`);
        }
        
        // Gist
        const gistMatch = text.match(/\*\*Gist:\*\*\s*([\s\S]+?)(?=\*\*[A-Z]|$)/);
        if (gistMatch) {
          const gist = gistMatch[1].trim();
          console.log(`\nGist (${gist.length} chars):`);
          console.log(gist.substring(0, 200) + (gist.length > 200 ? '...' : ''));
        }
        
        // Overview
        const overviewMatch = text.match(/\*\*Overview:\*\*\s*([\s\S]+?)(?=\*\*[A-Z]|$)/);
        if (overviewMatch) {
          const overview = overviewMatch[1].trim();
          console.log(`\nOverview (${overview.length} chars):`);
          console.log(overview.substring(0, 200) + (overview.length > 200 ? '...' : ''));
        }
        
        // Action Items
        console.log('\n🎯 ACTION ITEMS:');
        const actionMatch = text.match(/\*\*Action Items:\*\*(.+?)$/s);
        if (actionMatch) {
          const actionText = actionMatch[1];
          console.log('Raw action text (first 500 chars):');
          console.log(actionText.substring(0, 500));
          
          // Try to parse structured format
          const lines = actionText.split('\n');
          let currentPerson = null;
          let actionCount = 0;
          
          for (const line of lines) {
            const trimmedLine = line.trim();
            
            // Check if this is a person header
            const personMatch = trimmedLine.match(/^\*\*([^:*]+):\*\*$/);
            if (personMatch) {
              currentPerson = personMatch[1].trim();
              console.log(`\n  Person: ${currentPerson}`);
            } else if (currentPerson && trimmedLine && !trimmedLine.includes('👤')) {
              actionCount++;
              console.log(`    - ${trimmedLine.substring(0, 100)}`);
            }
          }
          
          console.log(`\n  Total actions parsed: ${actionCount}`);
        }
        
        // Show Fireflies URL
        const urlMatch = text.match(/https?:\/\/app\.fireflies\.ai\/view\/[^\s<>]+/i);
        if (urlMatch) {
          console.log(`\n🔗 Fireflies URL: ${urlMatch[0]}`);
        }
        
        console.log('\n' + '=' .repeat(80));
        
        // Only analyze first message for now
        break;
      }
    }
    
  } catch (error) {
    console.error('Error:', error);
  }
}

// Run the test
testFirefliesParsing();