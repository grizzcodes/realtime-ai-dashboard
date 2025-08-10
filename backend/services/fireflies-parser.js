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
        
        // Action Items - Person names
        if (index > 0 && message.blocks[index - 1].text?.text?.includes('*Action Items:*')) {
          // This block contains a person's name for action items
          const personMatch = text.match(/\*([^:*]+):\*/);
          if (personMatch) {
            const personName = personMatch[1].trim();
            // Look ahead to next blocks for this person's actions
            const actionsBlock = message.blocks[index + 1];
            if (actionsBlock && actionsBlock.type === 'actions') {
              // Actions are in the buttons
              const actions = actionsBlock.elements?.map(element => {
                if (element.type === 'button' && element.text) {
                  return element.text.text;
                }
              }).filter(Boolean) || [];
              
              if (actions.length > 0) {
                meeting.actionItems.push({
                  assignee: personName,
                  tasks: actions
                });
              }
            }
          }
        }
      }
    });

    // If no blocks parsing worked, try plain text
    if (!meeting.title && message.text) {
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
      
      // Get recent messages
      const messagesResult = await this.slack.conversations.history({
        channel: channel.id,
        limit: limit
      });
      
      // Parse Fireflies messages
      const meetings = [];
      for (const message of messagesResult.messages) {
        // Only process bot messages with blocks
        if (message.bot_id && message.blocks) {
          const meeting = this.parseMeetingFromBlocks(message);
          if (meeting && meeting.url) {
            meetings.push(meeting);
          }
        }
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
}

module.exports = FirefliesParser;
