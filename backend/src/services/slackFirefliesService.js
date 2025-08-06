// backend/src/services/slackFirefliesService.js
const fetch = require('node-fetch');

class SlackFirefliesService {
  constructor() {
    this.token = process.env.SLACK_BOT_TOKEN;
    this.channelName = 'fireflies-ai';
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
        ch.name?.includes('fireflies')
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
          return { success: false, error: data.error };
        }

        channel = data.channels?.find(ch => 
          ch.name === this.channelName || 
          ch.name === 'fireflies' || 
          ch.name?.includes('fireflies')
        );
        
        if (channel) {
          console.log(`✅ Found PRIVATE channel: #${channel.name} (${channel.id})`);
        }
      } else {
        console.log(`✅ Found PUBLIC channel: #${channel.name} (${channel.id})`);
      }

      if (channel) {
        if (!channel.is_member) {
          console.log('⚠️ Bot is not a member of the channel!');
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
        return { 
          success: false, 
          error: 'Channel not found.' 
        };
      }
    } catch (error) {
      console.error('Failed to find channel:', error);
      return { success: false, error: error.message };
    }
  }

  async getFirefliesMessages(limit = 50) {
    if (!this.initialized) {
      await this.initialize();
    }

    try {
      let messages = [];
      
      if (this.channelId) {
        console.log(`📨 Fetching messages from channel ${this.channelId}...`);
        messages = await this.getChannelMessages(this.channelId, limit);
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
        return [];
      }

      console.log(`📨 Found ${data.messages?.length || 0} messages in channel`);
      return data.messages || [];
    } catch (error) {
      console.error('Failed to get channel messages:', error);
      return [];
    }
  }

  parseFirefliesMeetings(messages) {
    const meetings = [];
    
    for (const message of messages) {
      const text = message.text || '';
      
      // Check if this is a Fireflies meeting summary
      if (this.isFirefliesSummary(text)) {
        const meeting = this.parseFirefliesMeeting(message);
        if (meeting) {
          meetings.push(meeting);
        }
      }
    }

    console.log(`📊 Parsed ${meetings.length} meetings from Slack messages`);
    return meetings;
  }

  isFirefliesSummary(text) {
    // Check for Fireflies meeting format
    return text.includes('app.fireflies.ai/view/') || 
           (text.includes('*Title:') && text.includes('*Date and Time:*'));
  }

  parseFirefliesMeeting(message) {
    const text = message.text || '';
    const timestamp = message.ts ? new Date(parseFloat(message.ts) * 1000) : new Date();
    
    // Extract meeting title from the link text
    let title = 'Meeting';
    const titleMatch = text.match(/\|([^>]+)>/);
    if (titleMatch) {
      title = titleMatch[1].replace(/&lt;/g, '<').replace(/&gt;/g, '>').replace(/&amp;/g, '&');
    }
    
    // Extract meeting URL
    let meetingUrl = '#';
    const urlMatch = text.match(/https:\/\/app\.fireflies\.ai\/view\/[^|]+/);
    if (urlMatch) {
      meetingUrl = urlMatch[0];
    }
    
    // Extract date and time
    let meetingDate = timestamp;
    let duration = '';
    const dateMatch = text.match(/\*Date and Time:\*\s*\n?([^*\n]+)/);
    if (dateMatch) {
      const dateInfo = dateMatch[1].trim();
      // Parse date like "Tue, Aug 5th - 12:30 PM PDT (18 mins)"
      const durationMatch = dateInfo.match(/\((\d+\s*mins?)\)/);
      if (durationMatch) {
        duration = durationMatch[1];
      }
      
      // Try to parse the date
      const datePartMatch = dateInfo.match(/([A-Z][a-z]{2}, [A-Z][a-z]{2} \d+(?:st|nd|rd|th)?)/);
      if (datePartMatch) {
        const datePart = datePartMatch[1];
        const year = new Date().getFullYear();
        try {
          meetingDate = new Date(`${datePart}, ${year}`);
        } catch (e) {
          // Keep original timestamp if parsing fails
        }
      }
    }
    
    // Extract participants
    let participants = [];
    const participantsMatch = text.match(/\*Participants:\*\s*\n?([^*\n]+)/);
    if (participantsMatch) {
      const participantsList = participantsMatch[1].trim();
      participants = participantsList.split(/,\s*/).map(p => p.trim()).filter(p => p);
    }
    
    // Extract gist/summary
    let overview = '';
    const gistMatch = text.match(/\*Gist:\*\s*\n?([^*\n]+)/);
    if (gistMatch) {
      overview = gistMatch[1].trim();
    }
    
    // Extract overview points if available
    let actionItems = [];
    const overviewMatch = text.match(/\*Overview:\*\s*\n?([\s\S]*?)(?=\*|$)/);
    if (overviewMatch) {
      const overviewText = overviewMatch[1].trim();
      // Each line starting with - is an action item or key point
      const items = overviewText.split('\n').filter(line => line.trim().startsWith('-'));
      actionItems = items.map(item => item.replace(/^-\s*/, '').trim()).filter(item => item);
      
      // If no overview but we have the text, use first part as overview
      if (!overview && overviewText) {
        overview = overviewText.substring(0, 200) + (overviewText.length > 200 ? '...' : '');
      }
    }
    
    return {
      id: message.ts || `slack-${Date.now()}`,
      title: title,
      date: meetingDate.toISOString(),
      dateFormatted: meetingDate.toLocaleDateString(),
      timeFormatted: meetingDate.toLocaleTimeString(),
      duration: duration,
      attendees: participants.length,
      participants: participants,
      actionItems: actionItems.slice(0, 5), // Limit to 5 items for display
      overview: overview,
      source: 'slack-fireflies',
      meetingUrl: meetingUrl,
      slackTimestamp: message.ts
    };
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
