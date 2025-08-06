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

      console.log(`🔍 Processing ${messages.length} Slack messages...`);
      
      // Parse Fireflies meeting summaries
      const meetings = [];
      
      for (const message of messages) {
        const text = message.text || '';
        
        // Check if this is a Fireflies message
        if (this.isFirefliesSummary(text)) {
          console.log('📝 Found Fireflies message, parsing...');
          
          try {
            const meeting = this.parseFirefliesMeeting(message);
            if (meeting) {
              meetings.push(meeting);
              console.log(`✅ Parsed meeting: ${meeting.title}`);
            } else {
              console.log('⚠️ Could not parse meeting from message');
            }
          } catch (error) {
            console.error('❌ Error parsing meeting:', error);
          }
        }
      }
      
      console.log(`📊 Successfully parsed ${meetings.length} meetings`);
      
      return {
        success: true,
        meetings,
        count: meetings.length,
        message: `Found ${meetings.length} Fireflies meetings from ${messages.length} Slack messages`,
        source: 'slack'
      };
    } catch (error) {
      console.error('Failed to get Fireflies messages:', error);
      return {
        success: false,
        error: error.message,
        meetings: [],
        source: 'slack'
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

  isFirefliesSummary(text) {
    // Check for Fireflies patterns
    const patterns = [
      'fireflies.ai/view/',
      '*Title:',
      '*Date and Time:*',
      '<https://app.fireflies.ai'
    ];
    
    return patterns.some(pattern => text.includes(pattern));
  }

  parseFirefliesMeeting(message) {
    const text = message.text || '';
    const timestamp = message.ts ? new Date(parseFloat(message.ts) * 1000) : new Date();
    
    console.log('Parsing message text:', text.substring(0, 100));
    
    // Extract title from Slack formatted link
    let title = 'Meeting';
    // Pattern: <https://app.fireflies.ai/view/MEETING_ID|Meeting Title>
    const titleMatch = text.match(/<https:\/\/app\.fireflies\.ai\/view\/[^|]+\|([^>]+)>/);
    if (titleMatch) {
      title = titleMatch[1]
        .replace(/&lt;/g, '<')
        .replace(/&gt;/g, '>')
        .replace(/&amp;/g, '&')
        .trim();
      console.log('Extracted title:', title);
    }
    
    // Extract meeting URL
    let meetingUrl = '#';
    const urlMatch = text.match(/https:\/\/app\.fireflies\.ai\/view\/[^|>]+/);
    if (urlMatch) {
      meetingUrl = urlMatch[0];
    }
    
    // Extract date, time, and duration
    let meetingDate = timestamp;
    let meetingTime = '';
    let duration = '';
    
    // Pattern: *Date and Time:*\nDay, Month Date - Time (duration)
    const dateTimeMatch = text.match(/\*Date and Time:\*\s*\n?([^-]+)\s*-\s*([^(]+)\s*\(([^)]+)\)/);
    if (dateTimeMatch) {
      const dateStr = dateTimeMatch[1].trim(); // "Tue, Aug 5th"
      meetingTime = dateTimeMatch[2].trim();   // "12:30 PM PDT"
      duration = dateTimeMatch[3].trim();      // "18 mins"
      
      console.log('Date parts:', { dateStr, meetingTime, duration });
      
      // Parse the date
      try {
        // Remove ordinal suffixes (st, nd, rd, th)
        const cleanDateStr = dateStr.replace(/(\d+)(st|nd|rd|th)/, '$1');
        const year = new Date().getFullYear();
        const fullDateStr = `${cleanDateStr}, ${year} ${meetingTime}`;
        const parsedDate = new Date(fullDateStr);
        
        if (!isNaN(parsedDate.getTime())) {
          meetingDate = parsedDate;
        }
      } catch (e) {
        console.log('Could not parse date:', e);
      }
    }
    
    // Extract participants
    let participants = [];
    const participantsMatch = text.match(/\*Participants:\*\s*\n?([^\n*]+)/);
    if (participantsMatch) {
      const participantsList = participantsMatch[1].trim();
      // Handle truncated participants list (ends with "...")
      if (participantsList) {
        participants = participantsList
          .split(',')
          .map(p => p.trim())
          .filter(p => p && !p.includes('...'));
      }
      console.log('Found participants:', participants.length);
    }
    
    // Extract gist
    let gist = '';
    const gistMatch = text.match(/\*Gist:\*\s*\n?([^\n*]+)/);
    if (gistMatch) {
      gist = gistMatch[1].trim();
    }
    
    // Extract overview
    let overview = '';
    let actionItems = [];
    const overviewMatch = text.match(/\*Overview:\*\s*\n?([\s\S]*?)(?:\*|$)/);
    if (overviewMatch) {
      overview = overviewMatch[1].trim();
      
      // Extract bullet points as action items
      const lines = overview.split('\n');
      for (const line of lines) {
        const cleaned = line.trim();
        if (cleaned.startsWith('-') || cleaned.startsWith('•')) {
          const item = cleaned.replace(/^[-•]\s*/, '').trim();
          if (item.length > 10) {
            actionItems.push(item);
          }
        }
      }
    }
    
    // Use gist as overview if no overview found
    if (!overview && gist) {
      overview = gist;
    }
    
    // If still no overview, use portion of the text
    if (!overview) {
      // Try to extract meaningful content after participants
      const afterParticipants = text.split('*Participants:*')[1];
      if (afterParticipants) {
        const contentMatch = afterParticipants.match(/[^*\n]+\s+([^*]+)/);
        if (contentMatch) {
          overview = contentMatch[1].substring(0, 200) + '...';
        }
      }
    }
    
    const meeting = {
      id: message.ts || `slack-${Date.now()}`,
      title: title,
      date: meetingDate.toISOString(),
      dateFormatted: meetingDate.toLocaleDateString(),
      timeFormatted: meetingTime || meetingDate.toLocaleTimeString(),
      duration: duration || 'N/A',
      attendees: participants.length,
      participants: participants,
      actionItems: actionItems,
      overview: overview || 'No overview available',
      gist: gist,
      source: 'slack-fireflies',
      meetingUrl: meetingUrl,
      firefliesUrl: meetingUrl,
      slackTimestamp: message.ts
    };
    
    console.log('Created meeting object:', { 
      title: meeting.title, 
      date: meeting.dateFormatted,
      attendees: meeting.attendees 
    });
    
    return meeting;
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

  // Debug endpoint to see raw messages
  async getDebugInfo() {
    if (!this.initialized) {
      await this.initialize();
    }

    const messages = await this.getChannelMessages(this.channelId, 10);
    
    return {
      success: true,
      channelId: this.channelId,
      messagesFound: messages.length,
      messages: messages.map(msg => ({
        text: msg.text?.substring(0, 200),
        timestamp: new Date(parseFloat(msg.ts) * 1000).toISOString(),
        user: msg.user,
        isFireflies: this.isFirefliesSummary(msg.text || '')
      }))
    };
  }
}

module.exports = SlackFirefliesService;
