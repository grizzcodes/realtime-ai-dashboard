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
      const meetings = this.parseFirefliesMeetings(messages);
      
      return {
        success: true,
        meetings,
        count: meetings.length,
        message: `Checked ${messages.length} Slack messages, found ${meetings.length} Fireflies summaries`,
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

  parseFirefliesMeetings(messages) {
    const meetings = [];
    
    for (const message of messages) {
      const text = message.text || '';
      
      // More lenient check for Fireflies messages
      if (this.isFirefliesSummary(text)) {
        console.log('📝 Found Fireflies message:', text.substring(0, 100));
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
    // More lenient patterns to catch Fireflies messages
    const patterns = [
      'fireflies.ai/view/',              // Fireflies link
      '*Title:',                          // Title marker
      '*Date and Time:*',                 // Date marker
      '*Participants:*',                  // Participants marker
      '*Gist:*',                          // Gist marker
      '*Overview:*',                      // Overview marker
      '<https://app.fireflies.ai',        // Slack formatted link
    ];
    
    // Check if text contains any of the patterns
    const isFireflies = patterns.some(pattern => text.includes(pattern));
    
    if (!isFireflies && text.length > 50) {
      // Additional check for text that might be formatted differently
      const hasStructuredContent = 
        (text.includes('Meeting') || text.includes('Call')) &&
        (text.includes('PDT') || text.includes('PST') || text.includes('EST')) &&
        (text.includes('@') || text.includes('Participants'));
      
      if (hasStructuredContent) {
        console.log('📋 Found potential meeting content without standard markers');
        return true;
      }
    }
    
    return isFireflies;
  }

  parseFirefliesMeeting(message) {
    const text = message.text || '';
    const timestamp = message.ts ? new Date(parseFloat(message.ts) * 1000) : new Date();
    
    // Extract meeting title from the link text
    let title = 'Meeting';
    const titleMatch = text.match(/\|([^>]+)>/);
    if (titleMatch) {
      title = titleMatch[1]
        .replace(/&lt;/g, '<')
        .replace(/&gt;/g, '>')
        .replace(/&amp;/g, '&')
        .trim();
    } else {
      // Try alternative title extraction
      const altTitleMatch = text.match(/\*Title:\s*([^*\n]+)/);
      if (altTitleMatch) {
        title = altTitleMatch[1].trim();
      }
    }
    
    // Extract meeting URL
    let meetingUrl = '#';
    const urlMatch = text.match(/https:\/\/app\.fireflies\.ai\/view\/[^|\s>]+/);
    if (urlMatch) {
      meetingUrl = urlMatch[0];
    }
    
    // Extract date and time
    let meetingDate = timestamp;
    let duration = '';
    let meetingTime = '';
    
    // Try multiple date formats
    const datePatterns = [
      /\*Date and Time:\*\s*\n?([^*\n]+)/,
      /Date:\s*([^*\n]+)/,
      /([A-Z][a-z]{2}, [A-Z][a-z]{2} \d+(?:st|nd|rd|th)?)\s*[-–]\s*([\d:]+\s*[AP]M\s*[A-Z]{2,3})\s*\((\d+\s*mins?)\)/
    ];
    
    for (const pattern of datePatterns) {
      const match = text.match(pattern);
      if (match) {
        const dateInfo = match[0];
        
        // Extract duration
        const durationMatch = dateInfo.match(/\((\d+\s*mins?)\)/);
        if (durationMatch) {
          duration = durationMatch[1];
        }
        
        // Extract time
        const timeMatch = dateInfo.match(/([\d:]+\s*[AP]M)/);
        if (timeMatch) {
          meetingTime = timeMatch[1];
        }
        
        // Try to parse the date
        const datePartMatch = dateInfo.match(/([A-Z][a-z]{2}, [A-Z][a-z]{2} \d+(?:st|nd|rd|th)?)/);
        if (datePartMatch) {
          const datePart = datePartMatch[1].replace(/(\d+)(st|nd|rd|th)/, '$1');
          const year = new Date().getFullYear();
          try {
            const parsedDate = new Date(`${datePart}, ${year} ${meetingTime}`);
            if (!isNaN(parsedDate.getTime())) {
              meetingDate = parsedDate;
            }
          } catch (e) {
            console.log('Date parsing failed:', e);
          }
        }
        break;
      }
    }
    
    // Extract participants
    let participants = [];
    const participantsPatterns = [
      /\*Participants:\*\s*\n?([^*\n]+)/,
      /Participants:\s*([^*\n]+)/
    ];
    
    for (const pattern of participantsPatterns) {
      const match = text.match(pattern);
      if (match) {
        const participantsList = match[1].trim();
        participants = participantsList
          .split(/[,;]/)
          .map(p => p.trim())
          .filter(p => p && p.length > 2);
        break;
      }
    }
    
    // Extract gist/summary
    let gist = '';
    const gistPatterns = [
      /\*Gist:\*\s*\n?([^*\n]+)/,
      /Gist:\s*([^*\n]+)/,
      /Summary:\s*([^*\n]+)/
    ];
    
    for (const pattern of gistPatterns) {
      const match = text.match(pattern);
      if (match) {
        gist = match[1].trim();
        break;
      }
    }
    
    // Extract overview and action items
    let overview = '';
    let actionItems = [];
    
    const overviewMatch = text.match(/\*Overview:\*\s*\n?([\s\S]*?)(?=\*|$)/);
    if (overviewMatch) {
      const overviewText = overviewMatch[1].trim();
      overview = overviewText;
      
      // Extract bullet points as action items
      const bullets = overviewText.split(/\n/).filter(line => {
        const trimmed = line.trim();
        return trimmed.startsWith('-') || trimmed.startsWith('•') || trimmed.startsWith('*');
      });
      
      actionItems = bullets.map(item => 
        item.replace(/^[-•*]\s*/, '').trim()
      ).filter(item => item.length > 10);
    }
    
    // If no overview but we have gist, use that
    if (!overview && gist) {
      overview = gist;
    }
    
    // If still no overview, use first part of text
    if (!overview && text.length > 100) {
      overview = text.substring(0, 200) + '...';
    }
    
    return {
      id: message.ts || `slack-${Date.now()}`,
      title: title,
      date: meetingDate.toISOString(),
      dateFormatted: meetingDate.toLocaleDateString(),
      timeFormatted: meetingTime || meetingDate.toLocaleTimeString(),
      duration: duration,
      attendees: participants.length,
      participants: participants,
      actionItems: actionItems.slice(0, 10), // Limit to 10 items
      overview: overview.substring(0, 500),
      gist: gist,
      source: 'slack-fireflies',
      meetingUrl: meetingUrl,
      firefliesUrl: meetingUrl,
      slackTimestamp: message.ts,
      rawText: text.substring(0, 200) // For debugging
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
