// backend/src/routes/slackFirefliesRoutes.js - Enhanced Fireflies integration via Slack
const { WebClient } = require('@slack/web-api');

// Initialize Slack client
const slack = new WebClient(process.env.SLACK_BOT_TOKEN);

// Helper function to extract meeting title from Fireflies message
function extractMeetingTitle(message) {
  const text = message.text || '';
  
  // Pattern 1: Look for **Title:** format (most reliable)
  const titleMatch = text.match(/\*\*Title:\*\*\s*(.+?)(?:\n|\*\*|$)/);
  if (titleMatch && titleMatch[1]) {
    const title = titleMatch[1].trim();
    console.log('Found title from **Title:** format:', title);
    return title;
  }
  
  // Pattern 2: Look for meeting code patterns like mtm-jsvm-pqk
  const meetingCodeMatch = text.match(/\b([a-z]{3}-[a-z]{4}-[a-z]{3})\b/i);
  if (meetingCodeMatch) {
    const meetingCode = meetingCodeMatch[1].toUpperCase();
    console.log('Found meeting code:', meetingCode);
    return meetingCode;
  }
  
  // Pattern 3: Look in the URL
  const urlMatch = text.match(/https?:\/\/[^\s]*fireflies[^\s]*\/view\/([^?\s]+)/i);
  if (urlMatch && urlMatch[1]) {
    const pathPart = urlMatch[1];
    // Extract meeting code or title from URL path
    if (pathPart.match(/[a-z]+-[a-z]+-[a-z]+/i)) {
      return pathPart.toUpperCase();
    }
    return pathPart.replace(/[-_]/g, ' ');
  }
  
  // Default fallback
  return 'Meeting Summary';
}

// Parse action items from the specific Fireflies format
function parseActionItems(text) {
  const actionItems = [];
  
  // Look for **Action Items:** section
  const actionMatch = text.match(/\*\*Action Items:\*\*(.+?)$/s);
  if (!actionMatch) {
    console.log('No action items section found');
    return actionItems;
  }
  
  const actionText = actionMatch[1];
  console.log('Found action items section, first 200 chars:', actionText.substring(0, 200));
  
  // Method 1: Parse structured format with person headers
  const lines = actionText.split('\n');
  let currentPerson = null;
  
  for (const line of lines) {
    const trimmedLine = line.trim();
    
    // Skip empty lines
    if (!trimmedLine) continue;
    
    // Check if this is a person header (e.g., "**Alec CHAPADOS:**")
    const personMatch = trimmedLine.match(/^\*\*([^:*]+):\*\*$/);
    if (personMatch) {
      currentPerson = personMatch[1].trim();
      console.log('Found person header:', currentPerson);
      continue;
    }
    
    // This is a task line
    if (currentPerson) {
      const cleanTask = trimmedLine
        .replace(/^[•\-*]\s*/, '')
        .replace(/^\d+\.\s*/, '')
        .replace(/\*\*/g, '')
        .trim();
      
      if (cleanTask && cleanTask.length > 5 && !cleanTask.includes('👤')) {
        actionItems.push({
          task: cleanTask,
          assignee: currentPerson,
          source: 'fireflies'
        });
        console.log(`Added task for ${currentPerson}: ${cleanTask.substring(0, 50)}`);
      }
    }
  }
  
  // If no structured format found, try alternative parsing
  if (actionItems.length === 0) {
    console.log('Trying alternative action items parsing...');
    const altLines = actionText.split(/[•\n]/).filter(l => l.trim());
    
    for (const line of altLines) {
      const cleanLine = line.trim();
      
      // Look for "Person: Task" format
      if (cleanLine.includes(':') && !cleanLine.includes('http')) {
        const colonIndex = cleanLine.indexOf(':');
        const possiblePerson = cleanLine.substring(0, colonIndex).replace(/\*\*/g, '').trim();
        const possibleTask = cleanLine.substring(colonIndex + 1).trim();
        
        if (possiblePerson && possibleTask && possiblePerson.length < 50 && possibleTask.length > 5) {
          actionItems.push({
            task: possibleTask,
            assignee: possiblePerson,
            source: 'fireflies'
          });
        }
      }
    }
  }
  
  console.log(`Parsed ${actionItems.length} total action items`);
  return actionItems;
}

// Get Fireflies meetings from Slack channel
async function getSlackFirefliesMeetings(req, res) {
  try {
    console.log('🎙️ Fetching Fireflies meetings from Slack channel...');
    
    if (!process.env.SLACK_BOT_TOKEN) {
      return res.status(400).json({
        success: false,
        error: 'Slack not configured',
        meetings: []
      });
    }

    // Get messages from fireflies-ai channel
    const channelName = 'fireflies-ai';
    
    // First, get both public AND private channels
    console.log('🔍 Looking for channel:', channelName);
    
    // Try public channels first
    const publicChannelsResult = await slack.conversations.list({
      exclude_archived: true,
      types: 'public_channel',
      limit: 200
    });
    
    let channel = publicChannelsResult.channels.find(c => c.name === channelName);
    
    // If not found in public, check private channels
    if (!channel) {
      console.log('📌 Not in public channels, checking private channels...');
      
      const privateChannelsResult = await slack.conversations.list({
        exclude_archived: true,
        types: 'private_channel',
        limit: 200
      });
      
      channel = privateChannelsResult.channels.find(c => c.name === channelName);
      
      if (channel) {
        console.log('🔒 Found in private channels');
      }
    } else {
      console.log('📢 Found in public channels');
    }
    
    if (!channel) {
      console.log(`❌ Channel ${channelName} not found or bot doesn't have access`);
      
      return res.json({
        success: false,
        error: `Channel ${channelName} not found. Bot needs to be invited to the private channel.`,
        hint: 'In Slack, go to #fireflies-ai and type: /invite @[bot-name]',
        meetings: []
      });
    }

    console.log(`✅ Found channel: #${channelName} (ID: ${channel.id})`);

    // Get recent messages from the channel (increased limit)
    const messagesResult = await slack.conversations.history({
      channel: channel.id,
      limit: 100  // Get more meetings
    });

    console.log(`📨 Retrieved ${messagesResult.messages?.length || 0} messages from Slack`);

    // Parse Fireflies meeting summaries from messages
    const meetings = [];
    let debugFirstMeeting = true;
    
    for (const message of messagesResult.messages || []) {
      // Look for Fireflies bot messages with meeting summaries
      if ((message.bot_id || message.subtype === 'bot_message') && message.text) {
        const text = message.text;
        
        // Check if it's likely a Fireflies message
        const isFirefliesMessage = 
          text.includes('fireflies') ||
          text.includes('Fireflies') ||
          text.includes('app.fireflies.ai') ||
          text.includes('**Title:') ||
          text.includes('**Date and Time:') ||
          text.includes('**Participants:') ||
          text.includes('**Gist:') ||
          text.includes('**Overview:') ||
          text.includes('**Notes:') ||
          text.includes('**Action Items:') ||
          text.match(/[a-z]{3}-[a-z]{4}-[a-z]{3}/i);
        
        if (isFirefliesMessage) {
          // Debug first meeting in detail
          if (debugFirstMeeting) {
            console.log('=== FIRST MEETING DEBUG ===');
            console.log('Message text (first 1000 chars):', text.substring(0, 1000));
            debugFirstMeeting = false;
          }
          
          // Extract meeting title
          const title = extractMeetingTitle(message);
          
          // Parse all structured fields with better regex
          const dateMatch = text.match(/\*\*Date and Time:\*\*\s*([^\n*]+)/);
          const participantsMatch = text.match(/\*\*Participants:\*\*\s*([^\n*]+)/);
          const gistMatch = text.match(/\*\*Gist:\*\*\s*([\s\S]+?)(?=\*\*[A-Z]|\n\n|$)/);
          const overviewMatch = text.match(/\*\*Overview:\*\*\s*([\s\S]+?)(?=\*\*[A-Z]|\n\n|$)/);
          const notesMatch = text.match(/\*\*Notes:\*\*\s*([\s\S]+?)(?=\*\*[A-Z]|\n\n|$)/);
          const summaryMatch = text.match(/\*\*Summary:\*\*\s*([\s\S]+?)(?=\*\*[A-Z]|\n\n|$)/);
          const durationMatch = text.match(/\((\d+)\s*mins?\)/);
          
          const meeting = {
            id: message.ts,
            title: title,
            date: new Date(parseFloat(message.ts) * 1000).toISOString(),
            meetingDateTime: dateMatch ? dateMatch[1].trim() : null,
            duration: durationMatch ? `${durationMatch[1]}m` : 'N/A',
            participants: participantsMatch ? participantsMatch[1].trim() : null,
            attendees: participantsMatch ? participantsMatch[1].split(',').length : 1,
            gist: gistMatch ? gistMatch[1].trim() : null,
            overview: overviewMatch ? overviewMatch[1].trim().replace(/\.\.\.$/, '') : null,
            notes: notesMatch ? notesMatch[1].trim() : null,
            summary: summaryMatch ? summaryMatch[1].trim() : null,
            actionItems: parseActionItems(text),
            source: 'slack-fireflies'
          };
          
          // Extract Fireflies URL - get the clean URL without any text
          const urlMatches = text.match(/https?:\/\/app\.fireflies\.ai\/view\/[^\s<>]+/gi);
          if (urlMatches && urlMatches.length > 0) {
            // Clean the URL - remove any trailing characters
            let cleanUrl = urlMatches[0];
            // Remove common trailing characters
            cleanUrl = cleanUrl.replace(/[>)\]}\s]*$/, '');
            meeting.firefliesUrl = cleanUrl;
            console.log('Found Fireflies URL:', cleanUrl);
          }

          meetings.push(meeting);
          console.log(`✅ Added meeting: "${meeting.title}" | Content: Gist=${!!meeting.gist}, Overview=${!!meeting.overview}, Notes=${!!meeting.notes}, Actions=${meeting.actionItems.length}`);
        }
      }
    }

    console.log(`🎯 Found ${meetings.length} Fireflies meetings total`);
    
    // Log sample meeting for debugging
    if (meetings.length > 0) {
      const sample = meetings[0];
      console.log('Sample meeting details:', {
        title: sample.title,
        hasGist: !!sample.gist,
        gistLength: sample.gist ? sample.gist.length : 0,
        hasOverview: !!sample.overview,
        overviewLength: sample.overview ? sample.overview.length : 0,
        hasNotes: !!sample.notes,
        actionItemsCount: sample.actionItems.length,
        hasUrl: !!sample.firefliesUrl
      });
      
      if (sample.actionItems.length > 0) {
        console.log('First action item:', sample.actionItems[0]);
      }
    }
    
    res.json({
      success: true,
      meetings: meetings,
      count: meetings.length,
      channelInfo: {
        name: channel.name,
        isPrivate: channel.is_private,
        isMember: channel.is_member
      }
    });

  } catch (error) {
    console.error('❌ Failed to get Slack Fireflies meetings:', error);
    
    res.status(500).json({
      success: false,
      error: error.message,
      meetings: []
    });
  }
}

// Export route handler
module.exports = (app) => {
  app.get('/api/slack-fireflies/meetings', getSlackFirefliesMeetings);
  console.log('🎙️ Slack-Fireflies routes loaded');
};