// backend/src/routes/slackFirefliesRoutes.js - Fireflies integration via Slack
const { WebClient } = require('@slack/web-api');

// Initialize Slack client
const slack = new WebClient(process.env.SLACK_BOT_TOKEN);

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
    
    // First, get the channel ID
    const channelsResult = await slack.conversations.list({
      exclude_archived: true,
      types: 'public_channel,private_channel'
    });
    
    const channel = channelsResult.channels.find(c => c.name === channelName);
    
    if (!channel) {
      console.log(`Channel ${channelName} not found`);
      return res.json({
        success: false,
        error: `Channel ${channelName} not found`,
        meetings: []
      });
    }

    // Get recent messages from the channel
    const messagesResult = await slack.conversations.history({
      channel: channel.id,
      limit: 20
    });

    // Parse Fireflies meeting summaries from messages
    const meetings = [];
    
    for (const message of messagesResult.messages || []) {
      // Look for Fireflies bot messages with meeting summaries
      if (message.bot_id && message.text) {
        // Parse meeting information from Fireflies format
        const titleMatch = message.text.match(/Meeting:\s*(.+?)(?:\n|$)/);
        const durationMatch = message.text.match(/Duration:\s*(\d+)\s*min/);
        const attendeesMatch = message.text.match(/Attendees:\s*(.+?)(?:\n|$)/);
        const summaryMatch = message.text.match(/Summary:\s*(.+?)(?:\n\n|$)/s);
        const actionItemsMatch = message.text.match(/Action Items?:\s*(.+?)(?:\n\n|$)/s);
        
        if (titleMatch || summaryMatch) {
          const meeting = {
            id: message.ts,
            title: titleMatch ? titleMatch[1].trim() : 'Meeting Summary',
            date: new Date(parseFloat(message.ts) * 1000).toISOString(),
            duration: durationMatch ? `${durationMatch[1]}m` : 'N/A',
            attendees: 0,
            summary: summaryMatch ? summaryMatch[1].trim() : '',
            actionItems: [],
            source: 'slack-fireflies'
          };

          // Parse attendees
          if (attendeesMatch) {
            const attendeesList = attendeesMatch[1].split(',').map(a => a.trim());
            meeting.attendees = attendeesList.length;
            
            // Extract assignees from action items for better task assignment
            meeting.attendeeNames = attendeesList;
          }

          // Parse action items with assignee detection
          if (actionItemsMatch) {
            const actionItemsText = actionItemsMatch[1].trim();
            const items = actionItemsText.split(/[\n•\-\*]/).filter(item => item.trim());
            
            meeting.actionItems = items.map(item => {
              const cleanItem = item.replace(/^\d+\.\s*/, '').trim();
              
              // Try to detect assignee from the action item text
              let assignee = null;
              
              // Check if any attendee name is mentioned in the action item
              if (meeting.attendeeNames) {
                for (const attendeeName of meeting.attendeeNames) {
                  const firstName = attendeeName.split(' ')[0];
                  if (cleanItem.toLowerCase().includes(firstName.toLowerCase())) {
                    assignee = firstName;
                    break;
                  }
                }
              }
              
              // Also check for common assignment patterns
              const assignmentMatch = cleanItem.match(/\(([^)]+)\)|\[@([^\]]+)\]|assigned to:?\s*(\w+)/i);
              if (assignmentMatch) {
                assignee = assignmentMatch[1] || assignmentMatch[2] || assignmentMatch[3];
              }
              
              return {
                task: cleanItem.replace(/\([^)]+\)|\[@[^\]]+\]|assigned to:?\s*\w+/gi, '').trim(),
                assignee: assignee || 'Team'
              };
            });
          }

          // Extract Fireflies URL if present
          const urlMatch = message.text.match(/https:\/\/[^\s]+fireflies[^\s]+/);
          if (urlMatch) {
            meeting.firefliesUrl = urlMatch[0];
          }

          meetings.push(meeting);
        }
      }
    }

    console.log(`Found ${meetings.length} Fireflies meetings in Slack`);

    res.json({
      success: true,
      meetings: meetings,
      count: meetings.length
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
