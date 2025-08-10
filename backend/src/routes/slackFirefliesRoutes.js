// backend/src/routes/slackFirefliesRoutes.js - Enhanced Fireflies integration via Slack
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
  const recapMatch = text.match(/Your meeting recap[\s-]+([a-z]+-[a-z]+-[a-z]+)/i);
  if (recapMatch) {
    const meetingCode = recapMatch[1].toUpperCase();
    console.log('Found meeting code:', meetingCode);
    return `Meeting: ${meetingCode}`;
  }
  
  // Pattern 2: Look for **Title:** format
  const titleMatch = text.match(/\*\*Title:\*\*\s*(.+?)(?:\n|$)/);
  if (titleMatch) {
    return titleMatch[1].trim();
  }
  
  // Pattern 3: If the first line is just a URL, try to extract meeting code from it
  const lines = text.split('\n').map(l => l.trim()).filter(l => l);
  if (lines[0] && lines[0].startsWith('http')) {
    const urlMatch = lines[0].match(/\/([a-z]+-[a-z]+-[a-z]+)/i);
    if (urlMatch) {
      const meetingCode = urlMatch[1].toUpperCase();
      console.log('Extracted from URL:', meetingCode);
      return `Meeting: ${meetingCode}`;
    }
  }
  
  // Default fallback
  console.log('No title found, using default');
  return 'Meeting Summary';
}

// Parse action items from the specific Fireflies format
function parseActionItems(text) {
  const actionItems = [];
  
  // Look for **Action Items:** section
  const actionMatch = text.match(/\*\*Action Items:\*\*(.+?)(?:\*\*|$)/s);
  if (!actionMatch) {
    console.log('No action items section found');
    return actionItems;
  }
  
  const actionText = actionMatch[1];
  console.log('Found action items section:', actionText.substring(0, 500));
  
  // Split by person headers (e.g., "**Alec CHAPADOS:**")
  const personPattern = /\*\*([^:*]+):\*\*/g;
  let matches = [];
  let match;
  
  // Find all person headers and their positions
  while ((match = personPattern.exec(actionText)) !== null) {
    matches.push({
      person: match[1].trim(),
      index: match.index,
      endIndex: match.index + match[0].length
    });
  }
  
  // Process each person's tasks
  for (let i = 0; i < matches.length; i++) {
    const person = matches[i].person;
    const startIndex = matches[i].endIndex;
    const endIndex = (i < matches.length - 1) ? matches[i + 1].index : actionText.length;
    
    const tasksText = actionText.substring(startIndex, endIndex);
    console.log(`Tasks for ${person}:`, tasksText);
    
    // Split tasks by newlines or bullet points
    const tasks = tasksText
      .split(/[\n•]/)
      .map(t => t.trim())
      .filter(t => t && t.length > 2);
    
    for (const task of tasks) {
      // Clean up the task text
      const cleanTask = task
        .replace(/^[-*]\s*/, '')
        .replace(/^\d+\.\s*/, '')
        .replace(/\.$/, '')
        .trim();
      
      if (cleanTask && !cleanTask.includes('👤')) {
        actionItems.push({
          task: cleanTask,
          assignee: person,
          source: 'fireflies'
        });
      }
    }
  }
  
  // If no structured format found, try to parse line by line
  if (actionItems.length === 0) {
    console.log('Trying alternative parsing...');
    const lines = actionText.split('\n').filter(l => l.trim());
    
    let currentAssignee = 'Team';
    for (const line of lines) {
      // Check if this is a person header
      if (line.includes(':') && !line.includes('http')) {
        const possibleAssignee = line.split(':')[0].replace(/[*•\-]/g, '').trim();
        if (possibleAssignee && possibleAssignee.length < 50) {
          currentAssignee = possibleAssignee;
          const taskPart = line.split(':')[1];
          if (taskPart && taskPart.trim()) {
            actionItems.push({
              task: taskPart.trim(),
              assignee: currentAssignee,
              source: 'fireflies'
            });
          }
        }
      } else {
        // This is a task line
        const cleanTask = line
          .replace(/^[•\-*]\s*/, '')
          .replace(/^\d+\.\s*/, '')
          .trim();
        
        if (cleanTask && cleanTask.length > 2) {
          actionItems.push({
            task: cleanTask,
            assignee: currentAssignee,
            source: 'fireflies'
          });
        }
      }
    }
  }
  
  console.log(`Parsed ${actionItems.length} action items`);
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
          message.text.match(/https?:\/\/[^\s]*fireflies[^\s]*/i) ||
          message.text.includes('**Title:') ||
          message.text.includes('**Gist:') ||
          message.text.includes('**Overview:') ||
          message.text.includes('**Action Items:');
        
        if (isFirefliesMessage) {
          const text = message.text;
          
          // Extract meeting title
          let title = extractMeetingTitle(message);
          
          // Parse structured fields
          const dateMatch = text.match(/\*\*Date and Time:\*\*\s*(.+?)(?:\n|$)/);
          const participantsMatch = text.match(/\*\*Participants:\*\*\s*(.+?)(?:\n|$)/);
          const gistMatch = text.match(/\*\*Gist:\*\*\s*(.+?)(?:\n|\*\*|$)/s);
          const overviewMatch = text.match(/\*\*Overview:\*\*\s*(.+?)(?:\*\*Notes:|\*\*Action|$)/s);
          const notesMatch = text.match(/\*\*Notes:\*\*\s*(.+?)(?:\*\*Action|$)/s);
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
            summary: null,
            actionItems: parseActionItems(text),
            source: 'slack-fireflies'
          };
          
          // If no overview/gist but there's a summary pattern
          if (!meeting.overview && !meeting.gist) {
            const summaryMatch = text.match(/\*\*Summary:\*\*\s*(.+?)(?:\*\*|$)/s);
            if (summaryMatch) {
              meeting.summary = summaryMatch[1].trim();
            }
          }

          // Extract Fireflies URL if present (for "View" button)
          const urlMatch = text.match(/https?:\/\/[^\s]+fireflies[^\s]+/i);
          if (urlMatch) {
            meeting.firefliesUrl = urlMatch[0];
          }

          meetings.push(meeting);
          console.log(`Added meeting: "${meeting.title}" with ${meeting.actionItems.length} action items`);
          
          // Log first few action items for debugging
          if (meeting.actionItems.length > 0) {
            console.log('Sample action items:', meeting.actionItems.slice(0, 3));
          }
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