// backend/test-fireflies-parsing.js
// Debug script to test Fireflies message parsing

require('dotenv').config();
const { WebClient } = require('@slack/web-api');

// Helper function to extract meeting title from Fireflies URL or text
function extractMeetingTitle(message) {
  const text = message.text || '';
  
  console.log('\n=== Parsing Message ===');
  console.log('Raw text (first 200 chars):', text.substring(0, 200));
  
  // Try to find "Your meeting recap - [title]" pattern (from your screenshot)
  const recapMatch = text.match(/Your meeting recap[:\s-]+(.+?)(?:\n|$)/i);
  if (recapMatch) {
    console.log('Found recap pattern:', recapMatch[1]);
    return recapMatch[1].trim();
  }
  
  // Try to extract from first line if it looks like a title
  const lines = text.split('\n').filter(line => line.trim());
  if (lines.length > 0) {
    const firstLine = lines[0];
    console.log('First line:', firstLine);
    
    // If first line contains "meeting recap", extract the meeting ID
    if (firstLine.toLowerCase().includes('meeting recap')) {
      const parts = firstLine.split('-').map(p => p.trim());
      if (parts.length > 1) {
        const title = parts[parts.length - 1]; // Get last part after dash
        console.log('Extracted from first line:', title);
        return title;
      }
    }
    
    // If first line doesn't contain URLs and is reasonable length
    if (!firstLine.includes('http') && firstLine.length < 100) {
      console.log('Using first line as title:', firstLine);
      return firstLine;
    }
  }
  
  // Look for meeting code in URL
  const urlMatch = text.match(/(?:fireflies\.ai\/view|app\.fireflies\.ai\/view)\/([a-z]+-[a-z]+-[a-z]+)/i);
  if (urlMatch) {
    const meetingCode = urlMatch[1];
    console.log('Found meeting code:', meetingCode);
    return `Meeting ${meetingCode}`;
  }
  
  console.log('No title found, using default');
  return 'Meeting Summary';
}

async function testFirefliesParsing() {
  console.log('🔍 Testing Fireflies Message Parsing\n');
  console.log('=====================================\n');
  
  if (!process.env.SLACK_BOT_TOKEN) {
    console.log('❌ SLACK_BOT_TOKEN is not configured');
    return;
  }
  
  try {
    const slack = new WebClient(process.env.SLACK_BOT_TOKEN);
    
    // Get the fireflies-ai channel
    const privateChannels = await slack.conversations.list({
      exclude_archived: true,
      types: 'private_channel',
      limit: 200
    });
    
    const channel = privateChannels.channels.find(c => c.name === 'fireflies-ai');
    
    if (!channel) {
      console.log('❌ Channel #fireflies-ai not found');
      return;
    }
    
    console.log('✅ Found channel: #fireflies-ai\n');
    
    // Get messages
    const messagesResult = await slack.conversations.history({
      channel: channel.id,
      limit: 10
    });
    
    console.log(`📬 Found ${messagesResult.messages.length} messages\n`);
    
    // Parse each message
    const meetings = [];
    for (const message of messagesResult.messages || []) {
      if (message.bot_id || message.subtype === 'bot_message') {
        console.log('\n------- Bot Message -------');
        console.log('Timestamp:', new Date(parseFloat(message.ts) * 1000).toLocaleString());
        
        // Show first 300 chars of message
        console.log('Message preview:', message.text?.substring(0, 300));
        
        // Extract title
        const title = extractMeetingTitle(message);
        console.log('📌 Extracted Title:', title);
        
        // Check if it's a Fireflies message
        const isFireflies = message.text && (
          message.text.includes('fireflies') ||
          message.text.includes('meeting recap') ||
          message.text.includes('Meeting Summary')
        );
        
        if (isFireflies) {
          meetings.push({
            id: message.ts,
            title: title,
            rawText: message.text?.substring(0, 100)
          });
        }
      }
    }
    
    console.log('\n=====================================');
    console.log(`📊 Found ${meetings.length} Fireflies meetings:\n`);
    
    meetings.forEach((meeting, index) => {
      console.log(`${index + 1}. Title: "${meeting.title}"`);
      console.log(`   Raw: ${meeting.rawText}...`);
      console.log('');
    });
    
    // Test the actual API endpoint
    console.log('🌐 Testing API Endpoint...\n');
    const fetch = require('node-fetch');
    try {
      const response = await fetch('http://localhost:3001/api/slack-fireflies/meetings');
      const data = await response.json();
      
      if (data.success) {
        console.log('✅ API Response:');
        console.log(`   Meetings: ${data.count}`);
        if (data.meetings) {
          data.meetings.forEach((m, i) => {
            console.log(`   ${i + 1}. "${m.title}"`);
          });
        }
      } else {
        console.log(`❌ API Error: ${data.error}`);
      }
    } catch (error) {
      console.log('⚠️  Could not test API (server may be down)');
    }
    
  } catch (error) {
    console.log('❌ Error:', error.message);
  }
}

// Run the test
testFirefliesParsing().catch(console.error);
