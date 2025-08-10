// backend/src/services/integrationService.js - Enhanced with all required methods
const { google } = require('googleapis');
const fetch = require('node-fetch'); // Add this import
const CalendarService = require('./calendarService');
const NotionService = require('./notionService');
const SupabaseService = require('./supabaseService');
const OpenAIService = require('./openAIService');
const ClaudeService = require('./claudeService');

class IntegrationService {
  constructor() {
    this.googleAuth = new google.auth.OAuth2(
      process.env.GOOGLE_CLIENT_ID,
      process.env.GOOGLE_CLIENT_SECRET,
      'http://localhost:3001/auth/google/callback'
    );
    
    if (process.env.GOOGLE_REFRESH_TOKEN) {
      this.googleAuth.setCredentials({
        refresh_token: process.env.GOOGLE_REFRESH_TOKEN
      });
    }

    // Initialize services
    this.calendarService = new CalendarService();
    this.notionService = new NotionService();
    this.supabaseService = new SupabaseService();
    this.openaiService = new OpenAIService();
    this.claudeService = new ClaudeService();
    
    console.log('🔧 IntegrationService initialized with all services');
  }

  // ===== CORE STATUS METHODS =====
  async getAllStatus() {
    try {
      const [gmail, calendar, slack, fireflies, notion, supabase, openai, claude] = await Promise.all([
        this.testGmailConnection(),
        this.testCalendarConnection(),
        this.testSlackConnection(),
        this.testFirefliesConnection(),
        this.testNotionConnection(),
        this.testSupabaseConnection(),
        this.testOpenAIConnection(),
        this.testClaudeConnection()
      ]);

      const integrations = {
        gmail,
        calendar,
        slack,
        fireflies,
        notion,
        supabase,
        openai,
        claude
      };

      const connected = Object.values(integrations).filter(s => s.success).length;

      return {
        ...integrations,
        summary: {
          connected,
          total: Object.keys(integrations).length,
          percentage: Math.round((connected / Object.keys(integrations).length) * 100)
        }
      };
    } catch (error) {
      console.error('❌ Failed to get all status:', error);
      return {
        error: error.message,
        summary: { connected: 0, total: 8, percentage: 0 }
      };
    }
  }

  async testIntegration(name) {
    const methodMap = {
      gmail: () => this.testGmailConnection(),
      calendar: () => this.testCalendarConnection(),
      slack: () => this.testSlackConnection(),
      fireflies: () => this.testFirefliesConnection(),
      notion: () => this.testNotionConnection(),
      supabase: () => this.testSupabaseConnection(),
      openai: () => this.testOpenAIConnection(),
      claude: () => this.testClaudeConnection()
    };

    const method = methodMap[name.toLowerCase()];
    if (!method) {
      return {
        success: false,
        error: `Unknown integration: ${name}`
      };
    }

    return await method();
  }

  // ===== CONNECTION TESTS =====
  async testGmailConnection() {
    try {
      if (!process.env.GOOGLE_REFRESH_TOKEN) {
        return { 
          success: false, 
          error: 'OAuth setup required. Visit /auth/google',
          needsAuth: true
        };
      }

      const { credentials } = await this.googleAuth.refreshAccessToken();
      this.googleAuth.setCredentials(credentials);

      const gmail = google.gmail({ version: 'v1', auth: this.googleAuth });
      const response = await gmail.users.getProfile({ userId: 'me' });
      
      return {
        success: true,
        message: `Connected: ${response.data.emailAddress}`,
        emailAddress: response.data.emailAddress
      };
    } catch (error) {
      return {
        success: false,
        error: `Gmail failed: ${error.message}`,
        needsAuth: error.code === 401 || error.message.includes('invalid_grant')
      };
    }
  }

  async testCalendarConnection() {
    return await this.calendarService.testConnection();
  }

  async testSlackConnection() {
    try {
      if (!process.env.SLACK_BOT_TOKEN) {
        return { 
          success: false, 
          error: 'Add SLACK_BOT_TOKEN to .env',
          needsAuth: true
        };
      }

      const response = await fetch('https://slack.com/api/auth.test', {
        headers: {
          'Authorization': `Bearer ${process.env.SLACK_BOT_TOKEN}`,
          'Content-Type': 'application/json'
        }
      });

      const data = await response.json();
      
      if (!data.ok) {
        return {
          success: false,
          error: `Slack error: ${data.error}`,
          needsAuth: data.error === 'invalid_auth'
        };
      }

      return {
        success: true,
        message: `Connected: ${data.team} (${data.user})`,
        team: data.team,
        user: data.user
      };
    } catch (error) {
      return {
        success: false,
        error: `Slack failed: ${error.message}`
      };
    }
  }

  async testFirefliesConnection() {
    try {
      if (!process.env.FIREFLIES_API_KEY) {
        return { 
          success: false, 
          error: 'Add FIREFLIES_API_KEY to .env',
          needsAuth: true
        };
      }

      const query = `query { user { user_id name email } }`;

      const response = await fetch('https://api.fireflies.ai/graphql', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${process.env.FIREFLIES_API_KEY}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({ query })
      });

      const data = await response.json();
      
      if (data.errors) {
        return {
          success: false,
          error: `Fireflies error: ${data.errors[0].message}`
        };
      }

      return {
        success: true,
        message: `Connected: ${data.data.user.name}`,
        user: data.data.user
      };
    } catch (error) {
      return {
        success: false,
        error: `Fireflies failed: ${error.message}`
      };
    }
  }

  async testNotionConnection() {
    return await this.notionService.testConnection();
  }

  async testSupabaseConnection() {
    return await this.supabaseService.testConnection();
  }

  async testOpenAIConnection() {
    return await this.openaiService.testConnection();
  }

  async testClaudeConnection() {
    return await this.claudeService.testConnection();
  }

  // ===== SIMPLIFIED METHODS FOR FRONTEND =====
  async getNotionTasks() {
    try {
      const result = await this.notionService.getTasks();
      return {
        success: true,
        tasks: result.tasks || [],
        count: result.tasks?.length || 0
      };
    } catch (error) {
      return {
        success: false,
        error: error.message,
        tasks: []
      };
    }
  }

  async getFilteredTasks(person, status) {
    try {
      const result = await this.notionService.getFilteredTasks(person, status);
      return result;
    } catch (error) {
      return {
        success: false,
        error: error.message,
        tasks: []
      };
    }
  }

  async getAITasks() {
    try {
      const result = await this.supabaseService.getTasks(20);
      return {
        success: true,
        tasks: result.tasks || [],
        count: result.tasks?.length || 0
      };
    } catch (error) {
      return {
        success: false,
        error: error.message,
        tasks: []
      };
    }
  }

  async chatWithAI(message, context = {}) {
    try {
      let result;
      
      if (process.env.OPENAI_API_KEY) {
        result = await this.openaiService.chat(message, context);
      } else if (process.env.ANTHROPIC_API_KEY) {
        result = await this.claudeService.chat(message, context);
      } else {
        return {
          success: false,
          response: 'No AI service configured. Add API keys to .env'
        };
      }

      return result;
    } catch (error) {
      return {
        success: false,
        response: 'Sorry, I encountered an error.'
      };
    }
  }

  async testAI() {
    try {
      const testMessage = "Create a high priority task: Fix the payment gateway bug by tomorrow";
      
      let result;
      if (process.env.OPENAI_API_KEY) {
        result = await this.openaiService.generateTask(testMessage, { source: 'ai_test' });
      } else if (process.env.ANTHROPIC_API_KEY) {
        result = await this.claudeService.generateTask(testMessage, { source: 'ai_test' });
      } else {
        return {
          success: false,
          error: 'No AI service configured'
        };
      }

      if (result.success && result.task) {
        await this.supabaseService.saveTask(result.task);
      }

      return {
        success: true,
        message: 'AI test completed successfully',
        task: result.task || null
      };
    } catch (error) {
      return {
        success: false,
        error: error.message
      };
    }
  }

  async completeTask(taskId) {
    try {
      let result = await this.supabaseService.updateTaskStatus(taskId, 'completed');
      
      if (!result.success) {
        result = await this.notionService.updateTaskStatus(taskId, 'completed');
      }

      return result;
    } catch (error) {
      return {
        success: false,
        error: error.message
      };
    }
  }

  async getNextMeetings(limit = 5) {
    try {
      const result = await this.calendarService.getUpcomingEvents(limit);
      return {
        success: true,
        meetings: result.events || [],
        count: result.events?.length || 0
      };
    } catch (error) {
      return {
        success: false,
        error: error.message,
        meetings: []
      };
    }
  }

  async getLatestEmails(limit = 10) {
    try {
      if (!process.env.GOOGLE_REFRESH_TOKEN) {
        return {
          success: false,
          error: 'Google Gmail not configured. Set up OAuth first.',
          emails: []
        };
      }

      const { credentials } = await this.googleAuth.refreshAccessToken();
      this.googleAuth.setCredentials(credentials);

      const gmail = google.gmail({ version: 'v1', auth: this.googleAuth });
      
      const response = await gmail.users.messages.list({
        userId: 'me',
        maxResults: limit,
        labelIds: ['INBOX'],
        q: '-in:chats'
      });

      const messages = response.data.messages || [];
      
      const emailDetails = await Promise.all(
        messages.slice(0, limit).map(async (message) => {
          try {
            const details = await gmail.users.messages.get({
              userId: 'me',
              id: message.id
            });
            
            const headers = details.data.payload.headers;
            const getHeader = (name) => {
              const header = headers.find(h => h.name.toLowerCase() === name.toLowerCase());
              return header ? header.value : '';
            };
            
            const fromHeader = getHeader('From');
            const senderName = fromHeader.includes('<') ? 
              fromHeader.split('<')[0].trim().replace(/\"/g, '') : 
              fromHeader;
            
            return {
              id: message.id,
              subject: getHeader('Subject') || 'No Subject',
              from: senderName || 'Unknown Sender',
              date: getHeader('Date'),
              snippet: details.data.snippet || '',
              isUnread: details.data.labelIds?.includes('UNREAD') || false,
              threadId: details.data.threadId
            };
          } catch (error) {
            return {
              id: message.id,
              subject: 'Failed to load',
              from: 'Unknown',
              date: '',
              snippet: 'Error loading email details',
              isUnread: false
            };
          }
        })
      );

      return {
        success: true,
        emails: emailDetails,
        count: emailDetails.length
      };
      
    } catch (error) {
      return {
        success: false,
        error: error.message,
        emails: []
      };
    }
  }

  async archiveEmail(emailId) {
    try {
      if (!process.env.GOOGLE_REFRESH_TOKEN) {
        return {
          success: false,
          error: 'Google Gmail not configured. Set up OAuth first.'
        };
      }

      const { credentials } = await this.googleAuth.refreshAccessToken();
      this.googleAuth.setCredentials(credentials);

      const gmail = google.gmail({ version: 'v1', auth: this.googleAuth });
      
      await gmail.users.messages.modify({
        userId: 'me',
        id: emailId,
        resource: {
          removeLabelIds: ['INBOX']
        }
      });

      return {
        success: true,
        message: 'Email archived successfully',
        emailId: emailId
      };
      
    } catch (error) {
      return {
        success: false,
        error: error.message
      };
    }
  }

  async getFirefliesMeetings(limit = 10) {
    try {
      if (!process.env.FIREFLIES_API_KEY) {
        return {
          success: false,
          error: 'Fireflies API key not configured',
          meetings: []
        };
      }

      const query = `
        query {
          transcripts(limit: ${limit}) {
            id
            title
            date
            duration
            transcript_url
            attendees {
              name
              email
            }
            summary {
              gist
              action_items
              keywords
            }
          }
        }
      `;

      const response = await fetch('https://api.fireflies.ai/graphql', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${process.env.FIREFLIES_API_KEY}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({ query })
      });

      const data = await response.json();
      
      if (data.errors) {
        return {
          success: false,
          error: data.errors[0].message,
          meetings: []
        };
      }

      const meetings = (data.data?.transcripts || []).map(transcript => ({
        id: transcript.id,
        title: transcript.title || 'Untitled Meeting',
        date: transcript.date,
        duration: transcript.duration ? `${Math.round(transcript.duration / 60)}m` : 'N/A',
        attendees: transcript.attendees?.length || 0,
        actionItems: transcript.summary?.action_items || [],
        summary: transcript.summary?.gist || '',
        keywords: transcript.summary?.keywords || [],
        firefliesUrl: transcript.transcript_url || '#'
      }));

      return {
        success: true,
        meetings: meetings,
        count: meetings.length
      };
      
    } catch (error) {
      return {
        success: false,
        error: error.message,
        meetings: []
      };
    }
  }
}

module.exports = IntegrationService;
