// backend/src/routes/slackFirefliesRoutes.js - Fireflies integration via Slack
const { WebClient } = require('@slack/web-api');

// Initialize Slack client
const slack = new WebClient(process.env.SLACK_BOT_TOKEN);

// Helper function to extract meeting title from Fireflies URL or text
function extractMeetingTitle(message) {
  const text = message.text || '';
  
  // Debug logging
  console.log('Extracting title from message:', text.substring(0, 200));
  
  // Pattern 1: Look for "Your meeting recap - [meeting-code]" and convert to readable format
  // Example: "Your meeting recap - mtm-jsvm-pqk" -> "Meeting Recap: MTM-JSVM-PQK"
  const recapMatch = text.match(/Your meeting recap[:\s-]+([a-z]+-[a-z]+-[a-z]+)/i);
  if (recapMatch) {
    const meetingCode = recapMatch[1].toUpperCase();
    console.log('Found meeting code:', meetingCode);
    return `Meeting: ${meetingCode}`;
  }
  
  // Pattern 2: If the first line is just a URL, try to extract meeting code from it
  const lines = text.split('\n').map(l => l.trim()).filter(l => l);
  if (lines[0] && lines[0].startsWith('http')) {
    const urlMatch = lines[0].match(/\/([a-z]+-[a-z]+-[a-z]+)/i);
    if (urlMatch) {
      const meetingCode = urlMatch[1].toUpperCase();
      console.log('Extracted from URL:', meetingCode);
      return `Meeting: ${meetingCode}`;
    }
  }
  
  // Pattern 3: If the URL is somewhere in the text (not first line)
  const urlInTextMatch = text.match(/https?:\/\/[^\s]*fireflies[^\s]*\/view\/([a-z]+-[a-z]+-[a-z]+)/i);
  if (urlInTextMatch) {
    const meetingCode = urlInTextMatch[1].toUpperCase();
    console.log('Found meeting in URL:', meetingCode);
    
    // Try to find a better title in the message
    // Look for patterns like "Meeting with X", "Call with Y", "1:1", etc.
    const meetingPatterns = [
      /(?:Meeting|Call|Sync|Discussion|Chat|1:1|One-on-one|Stand-?up|Review|Demo|Interview) (?:with |about |for |on |re: |re |regarding )(.+?)(?:\n|$)/i,
      /Subject:\s*(.+?)(?:\n|$)/i,
      /Title:\s*(.+?)(?:\n|$)/i,
      /Topic:\s*(.+?)(?:\n|$)/i
    ];
    
    for (const pattern of meetingPatterns) {
      const match = text.match(pattern);
      if (match && match[1]) {
        const title = match[1].trim();
        if (title && !title.includes('http')) {
          console.log('Found better title:', title);
          return title;
        }
      }
    }
    
    return `Meeting: ${meetingCode}`;
  }
  
  // Pattern 4: Clean up if first line is the Fireflies URL
  if (lines[0] && lines[0].includes('fireflies.ai')) {
    // Skip the URL line and look for a title in subsequent lines
    for (let i = 1; i < Math.min(lines.length, 5); i++) {
      const line = lines[i];
      // Skip empty lines and lines that look like metadata
      if (line && !line.startsWith('http') && !line.includes('Duration:') && !line.includes('Attendees:')) {
        if (line.length < 100) {
          console.log('Using line as title:', line);
          return line;
        }
      }
    }
  }
  
  // Pattern 5: If message starts with a URL but has other content
  const textWithoutUrl = text.replace(/https?:\/\/[^\s]+/g, '').trim();
  if (textWithoutUrl) {
    const firstMeaningfulLine = textWithoutUrl.split('\n')[0].trim();
    if (firstMeaningfulLine && firstMeaningfulLine.length < 100) {
      console.log('Using first line without URL:', firstMeaningfulLine);
      return firstMeaningfulLine;
    }
  }
  
  // Default fallback
  console.log('No title found, using default');
  return 'Meeting Summary';
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
    
    // Check if bot is a member
    if (!channel.is_member) {
      console.log(`⚠️ Bot is not a member of #${channelName}`);
      return res.json({
        success: false,
        error: `Bot found the channel but is not a member. Please invite the bot to #${channelName}`,
        hint: 'In Slack, go to #fireflies-ai and type: /invite @[bot-name]',
        meetings: []
      });
    }

    console.log(`✅ Found channel: #${channelName} (ID: ${channel.id}, Private: ${channel.is_private})`);

    // Get recent messages from the channel
    const messagesResult = await slack.conversations.history({
      channel: channel.id,
      limit: 50  // Increased limit to find more meetings
    });

    // Parse Fireflies meeting summaries from messages
    const meetings = [];
    
    for (const message of messagesResult.messages || []) {
      // Look for Fireflies bot messages with meeting summaries
      if ((message.bot_id || message.subtype === 'bot_message') && message.text) {
        // Check if it's likely a Fireflies message
        const isFirefliesMessage = 
          message.text.includes('fireflies') ||
          message.text.includes('Fireflies') ||
          message.text.includes('meeting recap') ||
          message.text.includes('Meeting Summary') ||
          message.text.includes('app.fireflies.ai') ||
          message.text.match(/https?:\/\/[^\s]*fireflies[^\s]*/i);
        
        if (isFirefliesMessage) {
          // Extract meeting title intelligently
          const title = extractMeetingTitle(message);
          
          // Parse other meeting information
          const durationMatch = message.text.match(/Duration:\s*(\d+)\s*(?:min|minutes)/i);
          const dateMatch = message.text.match(/(?:Date|When):\s*(.+?)(?:\n|$)/i);
          const attendeesMatch = message.text.match(/(?:Attendees|Participants):\s*(.+?)(?:\n|$)/i);
          const summaryMatch = message.text.match(/(?:Summary|Overview|Notes):\s*(.+?)(?:\n\n|Action|$)/si);
          const actionItemsMatch = message.text.match(/(?:Action Items?|Tasks?|Follow-ups?):\s*(.+?)(?:\n\n|$)/si);
          
          const meeting = {
            id: message.ts,
            title: title, // Use the intelligently extracted title
            date: dateMatch ? dateMatch[1].trim() : new Date(parseFloat(message.ts) * 1000).toISOString(),
            duration: durationMatch ? `${durationMatch[1]}m` : 'N/A',
            attendees: 0,
            summary: summaryMatch ? summaryMatch[1].trim() : '',
            actionItems: [],
            source: 'slack-fireflies'
          };

          // Parse attendees
          if (attendeesMatch) {
            const attendeesList = attendeesMatch[1].split(/[,;]/).map(a => a.trim());
            meeting.attendees = attendeesList.length;
            meeting.attendeeNames = attendeesList;
          }

          // Parse action items with better formatting support
          if (actionItemsMatch) {
            const actionItemsText = actionItemsMatch[1].trim();
            // Support multiple formats: bullets, numbers, dashes, newlines
            const items = actionItemsText.split(/[\n•\-\*]|(?:\d+\.)\s*/).filter(item => item.trim());
            
            meeting.actionItems = items.map(item => {
              const cleanItem = item.trim();
              
              // Try to detect assignee from the action item text
              let assignee = null;
              
              // Check if any attendee name is mentioned
              if (meeting.attendeeNames) {
                for (const attendeeName of meeting.attendeeNames) {
                  const firstName = attendeeName.split(' ')[0];
                  if (cleanItem.toLowerCase().includes(firstName.toLowerCase())) {
                    assignee = firstName;
                    break;
                  }
                }
              }
              
              // Check for assignment patterns
              const assignmentMatch = cleanItem.match(/\(([^)]+)\)|@(\w+)|assigned to:?\s*(\w+)/i);
              if (assignmentMatch) {
                assignee = assignmentMatch[1] || assignmentMatch[2] || assignmentMatch[3];
              }
              
              return {
                task: cleanItem.replace(/\([^)]+\)|@\w+|assigned to:?\s*\w+/gi, '').trim(),
                assignee: assignee || 'Team'
              };
            });
          }

          // Extract Fireflies URL if present (for "View" button)
          const urlMatch = message.text.match(/https?:\/\/[^\s]+fireflies[^\s]+/i);
          if (urlMatch) {
            meeting.firefliesUrl = urlMatch[0];
          }

          meetings.push(meeting);
          console.log(`Added meeting: "${meeting.title}"`);
        }
      }
    }

    console.log(`Found ${meetings.length} Fireflies meetings in Slack`);
    
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
