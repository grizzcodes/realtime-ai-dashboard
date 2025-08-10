// backend/services/fireflies-parser.js
const { WebClient } = require('@slack/web-api');

class FirefliesParser {
  constructor(slackToken) {
    this.slack = new WebClient(slackToken);
  }

  /**
   * Parse Fireflies meeting summary from Slack blocks
   */
  parseMeetingFromBlocks(message) {
    if (!message.blocks || !Array.isArray(message.blocks)) {
      return null;
    }

    const meeting = {
      title: null,
      date: null,
      participants: [],
      gist: null,
      overview: null,
      notes: [],
      actionItems: [],
      url: null,
      timestamp: new Date(message.ts * 1000).toISOString()
    };

    let currentActionPerson = null;
    let isInActionSection = false;

    // Parse each block
    message.blocks.forEach((block, index) => {
      if (block.type === 'section' && block.text) {
        const text = block.text.text || '';
        
        // Title (usually in first block with URL)
        if (text.includes('*Title:') && text.includes('https://app.fireflies.ai/view/')) {
          // Extract URL from the title
          const urlMatch = text.match(/https:\/\/app\.fireflies\.ai\/view\/[^|>]+/);
          if (urlMatch) {
            meeting.url = urlMatch[0];
          }
          // Extract title from link text
          const titleMatch = text.match(/\|([^>]+)>/);
          if (titleMatch) {
            meeting.title = titleMatch[1].replace(/&lt;/g, '<').replace(/&gt;/g, '>').replace(/&amp;/g, '&');
          }
        }
        
        // Date and Time
        if (text.includes('*Date and Time:*') || text.includes('Date and Time:')) {
          const dateMatch = text.match(/(?:Date and Time:\*?\s*)([^*\n]+)/);
          if (dateMatch) {
            meeting.date = dateMatch[1].trim();
          }
        }
        
        // Participants
        if (text.includes('*Participants:*') || text.includes('Participants:')) {
          const participantsText = text.replace(/\*Participants:\*?\s*/, '');
          // Extract emails from mailto links or plain text
          const emailMatches = participantsText.match(/[\w.-]+@[\w.-]+\.\w+/g);
          if (emailMatches) {
            meeting.participants = emailMatches;
          }
        }
        
        // Gist
        if (text.includes('*Gist:*')) {
          const gistMatch = text.match(/\*Gist:\*\s*([^*]+)/);
          if (gistMatch) {
            meeting.gist = gistMatch[1].trim();
          }
        }
        
        // Overview
        if (text.includes('*Overview:*')) {
          const overviewText = text.replace(/\*Overview:\*\s*/, '');
          // Split by bullet points
          const bullets = overviewText.split(/\n[-•]/).filter(b => b.trim());
          meeting.overview = bullets.map(b => b.trim());
        }
        
        // Notes
        if (text.includes('*Notes:*')) {
          const notesText = text.replace(/\*Notes:\*\s*/, '');
          // Parse structured notes with emojis and sections
          const sections = notesText.split(/\n(?=:[a-z_]+:)/);
          sections.forEach(section => {
            if (section.trim()) {
              // Extract section title and content
              const sectionMatch = section.match(/:[\w_]+:\s*\*([^*]+)\*([^]*)/);
              if (sectionMatch) {
                const sectionTitle = sectionMatch[1].trim();
                const sectionContent = sectionMatch[2] || '';
                const bullets = sectionContent.split(/\n[•]/).filter(b => b.trim());
                meeting.notes.push({
                  title: sectionTitle,
                  items: bullets.map(b => b.trim())
                });
              }
            }
          });
        }
        
        // Check if we're entering the action items section
        if (text.includes('*Action Items:*')) {
          isInActionSection = true;
        }
        
        // Parse person names in action items section
        if (isInActionSection) {
          // Check if this block contains a person's name (format: *Name:*)
          const personMatch = text.match(/^\*([^:*]+):\*$/);
          if (personMatch) {
            currentActionPerson = personMatch[1].trim();
          }
        }
      }
      
      // Parse action items from actions blocks (checkboxes)
      if (block.type === 'actions' && isInActionSection && currentActionPerson) {
        const tasks = [];
        
        // Extract tasks from elements
        block.elements?.forEach(element => {
          // Fireflies uses checkboxes for action items
          if (element.type === 'checkboxes' && element.options) {
            element.options.forEach(option => {
              let taskText = '';
              
              // Extract text from option
              if (option.text) {
                if (typeof option.text === 'string') {
                  taskText = option.text;
                } else if (option.text.text) {
                  taskText = option.text.text;
                }
              }
              
              // Clean up the task text
              if (taskText && taskText.trim()) {
                tasks.push(taskText.trim());
              }
            });
          }
          
          // Also handle buttons (in case format varies)
          else if (element.type === 'button' && element.text?.text) {
            const taskText = element.text.text.trim();
            if (taskText) {
              tasks.push(taskText);
            }
          }
        });
        
        // Add to action items if we have tasks
        if (tasks.length > 0) {
          meeting.actionItems.push({
            assignee: currentActionPerson,
            tasks: tasks
          });
        }
        
        // Reset current person after processing their actions
        currentActionPerson = null;
      }
      
      // Stop parsing action items after a divider following action section
      if (block.type === 'divider' && isInActionSection) {
        isInActionSection = false;
        currentActionPerson = null;
      }
    });

    // If no blocks parsing worked for URL, try plain text
    if (!meeting.url && message.text) {
      const urlMatch = message.text.match(/https:\/\/app\.fireflies\.ai\/view\/[^\s<>]+/);
      if (urlMatch) {
        meeting.url = urlMatch[0];
      }
    }

    return meeting;
  }

  /**
   * Fetch and parse recent Fireflies meetings from Slack
   */
  async fetchRecentMeetings(channelName = 'fireflies-ai', limit = 10) {
    try {
      // Get both public and private channels
      const [publicChannels, privateChannels] = await Promise.all([
        this.slack.conversations.list({
          exclude_archived: true,
          types: 'public_channel',
          limit: 200
        }),
        this.slack.conversations.list({
          exclude_archived: true,
          types: 'private_channel',
          limit: 200
        })
      ]);
      
      const allChannels = [...publicChannels.channels, ...privateChannels.channels];
      const channel = allChannels.find(c => c.name === channelName);
      
      if (!channel) {
        throw new Error(`Channel ${channelName} not found or bot doesn't have access`);
      }
      
      console.log(`📍 Found channel: #${channelName} (${channel.is_private ? 'Private' : 'Public'})`);
      
      // Get recent messages
      const messagesResult = await this.slack.conversations.history({
        channel: channel.id,
        limit: limit
      });
      
      console.log(`📬 Retrieved ${messagesResult.messages.length} messages from channel`);
      
      // Parse Fireflies messages
      const meetings = [];
      let skippedCount = 0;
      
      for (const message of messagesResult.messages) {
        // Only process bot messages with blocks
        if (message.bot_id && message.blocks) {
          const meeting = this.parseMeetingFromBlocks(message);
          if (meeting && meeting.url) {
            meetings.push(meeting);
          } else {
            skippedCount++;
          }
        }
      }
      
      if (skippedCount > 0) {
        console.log(`⚠️  Skipped ${skippedCount} messages without Fireflies data`);
      }
      
      return meetings;
    } catch (error) {
      console.error('Error fetching Fireflies meetings:', error);
      throw error;
    }
  }

  /**
   * Format meeting for display
   */
  formatMeeting(meeting) {
    const output = [];
    
    output.push(`📅 **${meeting.title || 'Untitled Meeting'}**`);
    if (meeting.date) output.push(`   Date: ${meeting.date}`);
    if (meeting.participants?.length) {
      output.push(`   Participants: ${meeting.participants.length} people`);
    }
    
    if (meeting.gist) {
      output.push(`\n📝 Summary: ${meeting.gist}`);
    }
    
    if (meeting.actionItems?.length > 0) {
      output.push(`\n🎯 Action Items:`);
      meeting.actionItems.forEach(item => {
        output.push(`   **${item.assignee}:**`);
        item.tasks.forEach(task => {
          output.push(`   • ${task}`);
        });
      });
    }
    
    if (meeting.url) {
      output.push(`\n🔗 [View in Fireflies](${meeting.url})`);
    }
    
    return output.join('\n');
  }

  /**
   * Get total action items count across all meetings
   */
  getTotalActionItems(meetings) {
    return meetings.reduce((total, meeting) => {
      const meetingActions = meeting.actionItems?.reduce((sum, item) => sum + item.tasks.length, 0) || 0;
      return total + meetingActions;
    }, 0);
  }

  /**
   * Get action items by assignee across all meetings
   */
  getActionItemsByAssignee(meetings) {
    const assigneeMap = {};
    
    meetings.forEach(meeting => {
      meeting.actionItems?.forEach(item => {
        if (!assigneeMap[item.assignee]) {
          assigneeMap[item.assignee] = {
            name: item.assignee,
            tasks: [],
            meetings: []
          };
        }
        
        item.tasks.forEach(task => {
          assigneeMap[item.assignee].tasks.push({
            task: task,
            meeting: meeting.title || 'Untitled',
            date: meeting.date
          });
        });
        
        if (!assigneeMap[item.assignee].meetings.includes(meeting.title)) {
          assigneeMap[item.assignee].meetings.push(meeting.title || 'Untitled');
        }
      });
    });
    
    return assigneeMap;
  }
}

module.exports = FirefliesParser;
