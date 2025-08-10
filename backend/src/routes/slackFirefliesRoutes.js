// backend/src/routes/slackFirefliesRoutes.js - Enhanced Fireflies integration via Slack
const { WebClient } = require('@slack/web-api');

// Initialize Slack client
const slack = new WebClient(process.env.SLACK_BOT_TOKEN);

// Helper function to extract meeting title from Fireflies message
function extractMeetingTitle(message) {
  const text = message.text || '';
  
  // Debug logging
  console.log('Extracting title from message:', text.substring(0, 300));
  
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
  
  // Pattern 4: Look for "Your meeting recap" pattern
  const recapMatch = text.match(/Your meeting recap[\s-]+(.+?)(?:\n|$)/i);
  if (recapMatch && recapMatch[1]) {
    return recapMatch[1].trim();
  }
  
  // Pattern 5: Try to get first meaningful line that's not a URL or label
  const lines = text.split('\n').map(l => l.trim()).filter(l => l);
  for (const line of lines) {
    // Skip URLs, labels, and metadata
    if (!line.startsWith('http') && 
        !line.includes('**Date') && 
        !line.includes('**Participants') &&
        !line.includes('Duration:') &&
        line.length > 5 && 
        line.length < 100) {
      // Remove markdown formatting
      const cleanLine = line.replace(/\*\*/g, '').replace(/^Title:\s*/i, '').trim();
      if (cleanLine) {
        console.log('Using first meaningful line as title:', cleanLine);
        return cleanLine;
      }
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
  const actionMatch = text.match(/\*\*Action Items:\*\*(.+?)(?:\n\n|\*\*[A-Z]|$)/s);
  if (!actionMatch) {
    console.log('No action items section found');
    return actionItems;
  }
  
  const actionText = actionMatch[1];
  console.log('Found action items section, length:', actionText.length);
  
  // Method 1: Parse structured format with person headers
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
  
  if (matches.length > 0) {
    console.log(`Found ${matches.length} people with action items`);
    
    // Process each person's tasks
    for (let i = 0; i < matches.length; i++) {
      const person = matches[i].person;
      const startIndex = matches[i].endIndex;
      const endIndex = (i < matches.length - 1) ? matches[i + 1].index : actionText.length;
      
      const tasksText = actionText.substring(startIndex, endIndex);
      
      // Split tasks by newlines and clean them up
      const tasks = tasksText
        .split('\n')
        .map(t => t.trim())
        .filter(t => t && t.length > 2 && !t.includes('👤'));
      
      for (const task of tasks) {
        // Clean up the task text
        let cleanTask = task
          .replace(/^[•\-*]\s*/, '')
          .replace(/^\d+\.\s*/, '')
          .replace(/\*\*/g, '')
          .trim();
        
        // Remove trailing punctuation if needed
        cleanTask = cleanTask.replace(/[,;]$/, '').trim();
        
        if (cleanTask && cleanTask.length > 5) {
          actionItems.push({
            task: cleanTask,
            assignee: person,
            source: 'fireflies'
          });
          console.log(`Added task for ${person}: ${cleanTask.substring(0, 50)}...`);
        }
      }
    }
  } else {
    // Method 2: Try line-by-line parsing if no structured format
    console.log('No person headers found, trying line-by-line parsing');
    const lines = actionText.split('\n').filter(l => l.trim());
    
    let currentAssignee = 'Team';
    for (const line of lines) {
      const trimmedLine = line.trim();
      
      // Skip empty lines and UI elements
      if (!trimmedLine || trimmedLine === '•' || trimmedLine.includes('👤')) {
        continue;
      }
      
      // Check if this line contains an assignee
      if (trimmedLine.includes(':') && !trimmedLine.includes('http')) {
        const parts = trimmedLine.split(':');
        const possibleAssignee = parts[0].replace(/[*•\-]/g, '').trim();
        
        if (possibleAssignee && possibleAssignee.length < 50 && /[A-Z]/.test(possibleAssignee)) {
          currentAssignee = possibleAssignee;
          // Check if there's a task after the colon
          if (parts[1] && parts[1].trim()) {
            const task = parts[1].trim();
            if (task.length > 5) {
              actionItems.push({
                task: task,
                assignee: currentAssignee,
                source: 'fireflies'
              });
            }
          }
        } else {
          // It's a task with a colon in it
          const cleanTask = trimmedLine
            .replace(/^[•\-*]\s*/, '')
            .replace(/^\d+\.\s*/, '')
            .trim();
          
          if (cleanTask && cleanTask.length > 5) {
            actionItems.push({
              task: cleanTask,
              assignee: currentAssignee,
              source: 'fireflies'
            });
          }
        }
      } else {
        // This is a regular task line
        const cleanTask = trimmedLine
          .replace(/^[•\-*]\s*/, '')
          .replace(/^\d+\.\s*/, '')
          .replace(/\*\*/g, '')
          .trim();
        
        if (cleanTask && cleanTask.length > 5) {
          actionItems.push({
            task: cleanTask,
            assignee: currentAssignee,
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

    // Get recent messages from the channel (increased limit)
    const messagesResult = await slack.conversations.history({
      channel: channel.id,
      limit: 100  // Increased to get more meetings
    });

    console.log(`📨 Retrieved ${messagesResult.messages?.length || 0} messages from Slack`);

    // Parse Fireflies meeting summaries from messages
    const meetings = [];
    
    for (const message of messagesResult.messages || []) {
      // Look for Fireflies bot messages with meeting summaries
      if ((message.bot_id || message.subtype === 'bot_message') && message.text) {
        // Check if it's likely a Fireflies message
        const text = message.text;
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
          text.match(/[a-z]{3}-[a-z]{4}-[a-z]{3}/i); // Meeting code pattern
        
        if (isFirefliesMessage) {
          // Extract meeting title
          const title = extractMeetingTitle(message);
          
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
            source: 'slack-fireflies',
            rawText: text.substring(0, 500) // Store first 500 chars for debugging
          };
          
          // If no overview/gist but there's a summary pattern
          if (!meeting.overview && !meeting.gist) {
            const summaryMatch = text.match(/\*\*Summary:\*\*\s*(.+?)(?:\*\*|$)/s);
            if (summaryMatch) {
              meeting.summary = summaryMatch[1].trim();
            }
          }

          // Extract Fireflies URL if present
          const urlMatch = text.match(/https?:\/\/[^\s]+fireflies[^\s]+/i);
          if (urlMatch) {
            meeting.firefliesUrl = urlMatch[0];
          }

          meetings.push(meeting);
          console.log(`✅ Added meeting: "${meeting.title}" | Duration: ${meeting.duration} | Action Items: ${meeting.actionItems.length}`);
        }
      }
    }

    console.log(`🎯 Found ${meetings.length} Fireflies meetings total`);
    
    // Log sample meeting for debugging
    if (meetings.length > 0) {
      console.log('Sample meeting:', {
        title: meetings[0].title,
        hasGist: !!meetings[0].gist,
        hasOverview: !!meetings[0].overview,
        hasNotes: !!meetings[0].notes,
        actionItemsCount: meetings[0].actionItems.length,
        firstActionItem: meetings[0].actionItems[0]
      });
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