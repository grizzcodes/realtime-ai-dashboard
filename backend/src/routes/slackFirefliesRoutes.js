// backend/src/routes/slackFirefliesRoutes.js - Fireflies integration via Slack
const { WebClient } = require('@slack/web-api');

// Initialize Slack client
const slack = new WebClient(process.env.SLACK_BOT_TOKEN);

// Helper function to extract meeting title from Fireflies URL or text
function extractMeetingTitle(message) {
  const text = message.text || '';
  
  // Try multiple patterns to find the meeting title
  // Pattern 1: Look for "Meeting: [title]" or "Title: [title]"
  let titleMatch = text.match(/(?:Meeting|Title|Subject):\s*(.+?)(?:\n|$)/i);
  if (titleMatch) return titleMatch[1].trim();
  
  // Pattern 2: Look for meeting name in URL (mtm-jsvm-pqk format)
  const urlMatch = text.match(/(?:fireflies\.ai\/view|app\.fireflies\.ai\/view)\/([a-z]+-[a-z]+-[a-z]+)/i);
  if (urlMatch) {
    // Convert URL slug to readable format: mtm-jsvm-pqk -> Mtm Jsvm Pqk
    const meetingCode = urlMatch[1];
    
    // Check if there's a cleaner title nearby in the text
    const lines = text.split('\n');
    for (const line of lines) {
      // Skip lines that are URLs or look like metadata
      if (!line.includes('http') && !line.includes('fireflies') && line.length > 5 && line.length < 100) {
        // This might be the title
        if (!line.includes(':') || line.startsWith('Meeting:') || line.startsWith('Title:')) {
          const cleanTitle = line.replace(/^(Meeting|Title|Subject):\s*/i, '').trim();
          if (cleanTitle) return cleanTitle;
        }
      }
    }
    
    // If no clean title found, use the meeting code
    return `Meeting ${meetingCode}`;
  }
  
  // Pattern 3: First non-empty line that's not a URL
  const lines = text.split('\n').filter(line => line.trim());
  for (const line of lines) {
    if (!line.includes('http') && !line.includes('fireflies') && line.length > 5) {
      return line.trim();
    }
  }
  
  // Pattern 4: Look for "Your meeting recap" subject pattern
  const recapMatch = text.match(/Your meeting recap[:\s-]+(.+?)(?:\n|$)/i);
  if (recapMatch) return recapMatch[1].trim();
  
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
      
      // Provide helpful debug info
      const allChannelsResult = await slack.conversations.list({
        exclude_archived: true,
        types: 'public_channel,private_channel',
        limit: 200
      });
      
      const memberChannels = allChannelsResult.channels.filter(c => c.is_member);
      console.log(`Bot is member of ${memberChannels.length} channels`);
      
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
      // Fireflies messages typically come from a bot or have specific formatting
      if ((message.bot_id || message.subtype === 'bot_message') && message.text) {
        // Extract meeting title intelligently
        const title = extractMeetingTitle(message);
        
        // Parse meeting information from various Fireflies formats
        const durationMatch = message.text.match(/Duration:\s*(\d+)\s*(?:min|minutes)/i);
        const dateMatch = message.text.match(/(?:Date|When):\s*(.+?)(?:\n|$)/i);
        const attendeesMatch = message.text.match(/(?:Attendees|Participants):\s*(.+?)(?:\n|$)/i);
        const summaryMatch = message.text.match(/(?:Summary|Overview|Notes):\s*(.+?)(?:\n\n|Action|$)/si);
        const actionItemsMatch = message.text.match(/(?:Action Items?|Tasks?|Follow-ups?):\s*(.+?)(?:\n\n|$)/si);
        
        // Also check for Fireflies-specific formatting
        const isFirefliesMessage = 
          message.text.includes('Fireflies') ||
          message.text.includes('fireflies.ai') ||
          message.text.includes('Meeting Summary') ||
          message.text.includes('meeting recap') ||
          message.text.includes('Transcript') ||
          (summaryMatch || actionItemsMatch);
        
        if (isFirefliesMessage) {
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

          // Extract Fireflies URL if present
          const urlMatch = message.text.match(/https?:\/\/[^\s]+fireflies[^\s]+/i);
          if (urlMatch) {
            meeting.firefliesUrl = urlMatch[0];
          }

          meetings.push(meeting);
        }
      }
    }

    console.log(`Found ${meetings.length} Fireflies meetings in Slack`);
    
    // If no meetings found, provide helpful context
    if (meetings.length === 0) {
      console.log('📭 No Fireflies messages found. Checking for any bot messages...');
      const botMessages = messagesResult.messages.filter(m => m.bot_id || m.subtype === 'bot_message');
      console.log(`Found ${botMessages.length} bot messages total in the channel`);
      
      if (botMessages.length > 0) {
        console.log('Sample bot message:', botMessages[0].text?.substring(0, 100));
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
    
    // Provide specific error messages
    let errorMessage = error.message;
    let hint = '';
    
    if (error.data && error.data.error === 'invalid_auth') {
      errorMessage = 'Slack authentication failed';
      hint = 'Check your SLACK_BOT_TOKEN in .env file';
    } else if (error.data && error.data.error === 'missing_scope') {
      errorMessage = 'Bot missing required permissions';
      hint = 'Add groups:read and groups:history scopes for private channels';
    } else if (error.data && error.data.error === 'channel_not_found') {
      errorMessage = 'Channel not accessible';
      hint = 'Invite the bot to #fireflies-ai private channel';
    }
    
    res.status(500).json({
      success: false,
      error: errorMessage,
      hint: hint,
      meetings: []
    });
  }
}

// Export route handler
module.exports = (app) => {
  app.get('/api/slack-fireflies/meetings', getSlackFirefliesMeetings);
  console.log('🎙️ Slack-Fireflies routes loaded');
};
