// backend/src/services/slackFirefliesService.js
const fetch = require('node-fetch');

class SlackFirefliesService {
  constructor() {
    this.token = process.env.SLACK_BOT_TOKEN;
    this.channelName = 'fireflies-ai'; // Your Fireflies channel
    this.baseUrl = 'https://slack.com/api';
    this.initialized = false;
    this.channelId = null;
  }

  async initialize() {
    try {
      if (!this.token) {
        console.log('⚠️ Slack not configured - missing SLACK_BOT_TOKEN');
        return { success: false, error: 'Missing Slack token' };
      }

      // Get the channel ID for fireflies-ai (including private channels)
      const channelResult = await this.findChannel();
      if (channelResult.success) {
        this.channelId = channelResult.channelId;
        this.initialized = true;
        console.log('✅ Slack Fireflies service initialized');
        console.log(`📢 Channel: #${channelResult.channelName || this.channelName} (${this.channelId})`);
        return { success: true };
      } else {
        return channelResult;
      }
    } catch (error) {
      console.error('❌ Slack initialization failed:', error.message);
      return { success: false, error: error.message };
    }
  }

  async findChannel() {
    try {
      // First try public channels
      console.log('🔍 Searching public channels...');
      let response = await fetch(`${this.baseUrl}/conversations.list?limit=1000`, {
        method: 'GET',
        headers: {
          'Authorization': `Bearer ${this.token}`,
          'Content-Type': 'application/json'
        }
      });

      let data = await response.json();
      
      if (!data.ok) {
        console.error('❌ Failed to list public channels:', data.error);
        return { success: false, error: data.error };
      }

      // Find the fireflies channel in public channels
      let channel = data.channels?.find(ch => 
        ch.name === this.channelName || 
        ch.name === 'fireflies' || 
        ch.name?.includes('fireflies') ||
        ch.name?.includes('firefly')
      );

      if (!channel) {
        // Try private channels
        console.log('🔍 Searching private channels...');
        response = await fetch(`${this.baseUrl}/conversations.list?types=private_channel&limit=1000`, {
          method: 'GET',
          headers: {
            'Authorization': `Bearer ${this.token}`,
            'Content-Type': 'application/json'
          }
        });

        data = await response.json();
        
        if (!data.ok) {
          console.error('❌ Failed to list private channels:', data.error);
          if (data.error === 'missing_scope') {
            console.error('⚠️ Bot needs groups:read scope for private channels');
          }
          return { success: false, error: data.error };
        }

        // Find in private channels
        channel = data.channels?.find(ch => 
          ch.name === this.channelName || 
          ch.name === 'fireflies' || 
          ch.name?.includes('fireflies') ||
          ch.name?.includes('firefly')
        );
        
        if (channel) {
          console.log(`✅ Found PRIVATE channel: #${channel.name} (${channel.id})`);
        }
      } else {
        console.log(`✅ Found PUBLIC channel: #${channel.name} (${channel.id})`);
      }

      if (channel) {
        // Check if bot is a member
        if (!channel.is_member) {
          console.log('⚠️ Bot is not a member of the channel!');
          console.log('Please invite the bot to #' + channel.name);
          return { 
            success: false, 
            error: `Bot not in channel. Please invite bot to #${channel.name}`,
            channelId: channel.id,
            channelName: channel.name
          };
        }
        
        return { 
          success: true, 
          channelId: channel.id, 
          channelName: channel.name,
          isPrivate: channel.is_private || false
        };
      } else {
        console.log('⚠️ Fireflies channel not found');
        console.log('Available channels bot can see:');
        
        // List all channels bot is member of
        const allChannels = await this.listAllChannels();
        allChannels.forEach(ch => {
          console.log(`  - #${ch.name} (${ch.is_private ? 'private' : 'public'})`);
        });
        
        return { 
          success: false, 
          error: 'Channel not found. Bot may not be invited to the private channel.' 
        };
      }
    } catch (error) {
      console.error('Failed to find channel:', error);
      return { success: false, error: error.message };
    }
  }

  async listAllChannels() {
    const channels = [];
    
    // Get public channels
    let response = await fetch(`${this.baseUrl}/conversations.list?limit=1000`, {
      headers: {
        'Authorization': `Bearer ${this.token}`,
        'Content-Type': 'application/json'
      }
    });
    
    let data = await response.json();
    if (data.ok && data.channels) {
      channels.push(...data.channels.filter(ch => ch.is_member));
    }
    
    // Get private channels
    response = await fetch(`${this.baseUrl}/conversations.list?types=private_channel&limit=1000`, {
      headers: {
        'Authorization': `Bearer ${this.token}`,
        'Content-Type': 'application/json'
      }
    });
    
    data = await response.json();
    if (data.ok && data.channels) {
      channels.push(...data.channels);
    }
    
    return channels;
  }

  async getFirefliesMessages(limit = 50) {
    if (!this.initialized) {
      await this.initialize();
    }

    try {
      let messages = [];
      
      if (this.channelId) {
        // Get messages from specific channel
        console.log(`📨 Fetching messages from channel ${this.channelId}...`);
        messages = await this.getChannelMessages(this.channelId, limit);
      } else {
        // If no specific channel, search all channels for Fireflies messages
        console.log('🔍 Searching all channels for Fireflies messages...');
        messages = await this.searchAllChannels(limit);
      }

      // Parse Fireflies meeting summaries
      const meetings = this.parseFirefliesMeetings(messages);
      
      return {
        success: true,
        meetings,
        rawMessages: messages.length
      };
    } catch (error) {
      console.error('Failed to get Fireflies messages:', error);
      return {
        success: false,
        error: error.message,
        meetings: []
      };
    }
  }

  async getChannelMessages(channelId, limit = 50) {
    try {
      const response = await fetch(`${this.baseUrl}/conversations.history?channel=${channelId}&limit=${limit}`, {
        headers: {
          'Authorization': `Bearer ${this.token}`,
          'Content-Type': 'application/json'
        }
      });

      const data = await response.json();
      
      if (!data.ok) {
        console.error('❌ Failed to get channel history:', data.error);
        if (data.error === 'not_in_channel') {
          console.error('Bot is not in the channel! Please invite it.');
        }
        if (data.error === 'missing_scope') {
          console.error('Bot needs groups:history scope for private channels');
        }
        return [];
      }

      console.log(`📨 Found ${data.messages?.length || 0} messages in channel`);
      return data.messages || [];
    } catch (error) {
      console.error('Failed to get channel messages:', error);
      return [];
    }
  }

  async searchAllChannels(limit = 50) {
    try {
      const messages = [];
      const channels = await this.listAllChannels();
      
      console.log(`🔍 Searching ${channels.length} channels for Fireflies messages...`);
      
      for (const channel of channels) {
        const channelMessages = await this.getChannelMessages(channel.id, 20);
        
        // Filter for Fireflies messages
        const firefliesMessages = channelMessages.filter(msg => 
          this.isFirefliesSummary(msg.text || '')
        );
        
        if (firefliesMessages.length > 0) {
          console.log(`Found ${firefliesMessages.length} Fireflies messages in #${channel.name}`);
          messages.push(...firefliesMessages);
        }
      }
      
      return messages.slice(0, limit);
    } catch (error) {
      console.error('Failed to search channels:', error);
      return [];
    }
  }

  parseFirefliesMeetings(messages) {
    const meetings = [];
    
    for (const message of messages) {
      const text = message.text || '';
      
      // Check if this is a Fireflies meeting summary
      if (this.isFirefliesSummary(text)) {
        const meeting = this.parseMeetingSummary(message);
        if (meeting) {
          meetings.push(meeting);
        }
      }
    }

    console.log(`📊 Parsed ${meetings.length} meetings from Slack messages`);
    return meetings;
  }

  isFirefliesSummary(text) {
    // Check for patterns that indicate a Fireflies meeting summary
    const patterns = [
      'Project Overview',
      'Technical Requirements',
      'Action Items:',
      'Timeline & Next Steps',
      'Scope Clarification',
      'Meeting Summary',
      '**Action Items:**',
      'Budget Discussion',
      'Mathieu',
      'Leo',
      'Alec'
    ];
    
    return patterns.some(pattern => text.includes(pattern));
  }

  parseMeetingSummary(message) {
    const text = message.text || '';
    const timestamp = message.ts ? new Date(parseFloat(message.ts) * 1000) : new Date();
    
    // Extract meeting title (usually the first bold line or header)
    const titleMatch = text.match(/\*\*([^:*]+)(?::|:\*\*)/);
    const title = titleMatch ? titleMatch[1].trim() : 'Meeting Summary';
    
    // Extract action items
    const actionItems = this.extractActionItems(text);
    
    // Extract participants (if mentioned)
    const participants = this.extractParticipants(text);
    
    // Extract key topics
    const topics = this.extractTopics(text);
    
    // Extract overview/summary
    const overview = this.extractOverview(text);
    
    return {
      id: message.ts || `slack-${Date.now()}`,
      title: title,
      date: timestamp.toISOString(),
      dateFormatted: timestamp.toLocaleDateString(),
      timeFormatted: timestamp.toLocaleTimeString(),
      actionItems: actionItems,
      participants: participants,
      topics: topics,
      overview: overview,
      source: 'slack',
      slackUrl: message.permalink || '#',
      rawText: text.substring(0, 500) // First 500 chars for preview
    };
  }

  extractActionItems(text) {
    const actionItems = [];
    
    // Look for action items section
    const actionMatch = text.match(/\*\*Action Items:\*\*([^*]+?)(?:\*\*|$)/s);
    if (actionMatch) {
      const actionText = actionMatch[1];
      
      // Split by person's name (format: **Person Name:**)
      const personSections = actionText.split(/\*\*([^:]+):\*\*/);
      
      for (let i = 1; i < personSections.length; i += 2) {
        const person = personSections[i].trim();
        const items = personSections[i + 1] || '';
        
        // Split items by newline or sentence
        const itemsList = items.split(/\n+/).filter(item => item.trim());
        
        itemsList.forEach(item => {
          const cleanItem = item.replace(/^[-•*]\s*/, '').trim();
          if (cleanItem) {
            actionItems.push(`${person}: ${cleanItem}`);
          }
        });
      }
    }
    
    // Fallback: look for bullet points
    if (actionItems.length === 0) {
      const bullets = text.match(/[•\-\*]\s+([^\n•\-\*]+)/g);
      if (bullets) {
        bullets.forEach(bullet => {
          const cleanBullet = bullet.replace(/^[•\-\*]\s+/, '').trim();
          if (cleanBullet.length > 10) { // Filter out very short items
            actionItems.push(cleanBullet);
          }
        });
      }
    }
    
    return actionItems;
  }

  extractParticipants(text) {
    const participants = new Set();
    
    // Look for names in action items (format: **Name:**)
    const nameMatches = text.match(/\*\*([A-Z][a-z]+(?: [A-Z][a-z]+)*?):\*\*/g);
    if (nameMatches) {
      nameMatches.forEach(match => {
        const name = match.replace(/\*\*/g, '').replace(':', '').trim();
        if (name && name.length > 2) {
          participants.add(name);
        }
      });
    }
    
    return Array.from(participants);
  }

  extractTopics(text) {
    const topics = [];
    
    // Look for section headers (format: **Header:** or **Header**)
    const headerMatches = text.match(/\*\*([^:*]+)(?::\*\*|:\s)/g);
    if (headerMatches) {
      headerMatches.forEach(match => {
        const topic = match.replace(/\*\*/g, '').replace(':', '').trim();
        if (topic && !topic.includes('Action Items')) {
          topics.push(topic);
        }
      });
    }
    
    return topics;
  }

  extractOverview(text) {
    // Get the first paragraph or section that's not action items
    const sections = text.split(/\*\*[^*]+\*\*/);
    for (const section of sections) {
      const cleanSection = section.trim();
      if (cleanSection.length > 50 && !cleanSection.includes('Action Items')) {
        // Return first 200 characters
        return cleanSection.substring(0, 200) + (cleanSection.length > 200 ? '...' : '');
      }
    }
    
    // Fallback: return first 200 chars
    return text.substring(0, 200) + '...';
  }

  async testConnection() {
    try {
      const response = await fetch(`${this.baseUrl}/auth.test`, {
        headers: {
          'Authorization': `Bearer ${this.token}`,
          'Content-Type': 'application/json'
        }
      });

      const data = await response.json();
      
      if (data.ok) {
        return {
          success: true,
          team: data.team,
          user: data.user,
          message: `Connected to Slack: ${data.team}`
        };
      } else {
        return {
          success: false,
          error: data.error
        };
      }
    } catch (error) {
      return {
        success: false,
        error: error.message
      };
    }
  }
}

module.exports = SlackFirefliesService;
