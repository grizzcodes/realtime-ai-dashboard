// backend/src/ai/magicInboxProcessor.js - AI-powered inbox intelligence
const OpenAI = require('openai');
const Anthropic = require('@anthropic-ai/sdk');

class MagicInboxProcessor {
  constructor(services) {
    this.services = services;
    this.openai = services.openaiKey ? new OpenAI({ apiKey: services.openaiKey }) : null;
    this.anthropic = services.claudeKey ? new Anthropic({ apiKey: services.claudeKey }) : null;
    this.cache = null;
    this.cacheExpiry = null;
  }

  async getCachedMagicInbox() {
    // Cache for 5 minutes to avoid excessive API calls
    if (this.cache && this.cacheExpiry && new Date() < this.cacheExpiry) {
      console.log('📦 Returning cached Magic Inbox data');
      return this.cache;
    }

    const result = await this.generateMagicInbox();
    this.cache = result;
    this.cacheExpiry = new Date(Date.now() + 5 * 60 * 1000); // 5 minutes
    return result;
  }

  async generateMagicInbox() {
    console.log('🔮 Generating real-time Magic AI Inbox...');
    
    try {
      // Gather all data sources in parallel
      const [emails, tasks, meetings, calendar] = await Promise.all([
        this.getRecentEmails(),
        this.getRecentTasks(),
        this.getRecentMeetings(),
        this.getUpcomingCalendar()
      ]);

      // If we have real data, analyze it with AI
      if (emails.length > 0 || tasks.length > 0 || meetings.length > 0) {
        const analysis = await this.analyzeWithAI({
          emails,
          tasks, 
          meetings,
          calendar
        });

        return {
          success: true,
          data: analysis,
          metadata: {
            totalEmails: emails.length,
            totalTasks: tasks.length,
            totalMeetings: meetings.length,
            totalEvents: calendar.length,
            lastUpdated: new Date(),
            realTimeData: true
          }
        };
      }

      // Return intelligent defaults if no data
      return this.getIntelligentDefaults();
      
    } catch (error) {
      console.error('❌ Magic Inbox generation failed:', error);
      return this.getIntelligentDefaults();
    }
  }

  async getRecentEmails() {
    try {
      if (!this.services.gmail) return [];
      
      const emails = await this.services.gmail.getLatestEmails(10);
      return emails.emails || [];
    } catch (error) {
      console.log('📧 Gmail not connected:', error.message);
      return [];
    }
  }

  async getRecentTasks() {
    try {
      if (!this.services.notion) return [];
      
      const tasks = await this.services.notion.syncDatabase();
      return tasks.tasks || [];
    } catch (error) {
      console.log('📝 Notion not connected:', error.message);
      return [];
    }
  }

  async getRecentMeetings() {
    try {
      if (!this.services.fireflies) return [];
      
      const meetings = await this.services.fireflies.getRecentMeetings(5);
      return meetings.meetings || [];
    } catch (error) {
      console.log('🎙️ Fireflies not connected:', error.message);
      return [];
    }
  }

  async getUpcomingCalendar() {
    try {
      // Calendar integration would go here
      return [];
    } catch (error) {
      console.log('📅 Calendar not connected:', error.message);
      return [];
    }
  }

  async analyzeWithAI(data) {
    const { emails, tasks, meetings, calendar } = data;

    // Build context for AI
    const context = {
      unreadEmails: emails.filter(e => e.isUnread).slice(0, 5),
      urgentTasks: tasks.filter(t => t.priority === 'High' || t.priority === 'Urgent').slice(0, 5),
      upcomingMeetings: meetings.slice(0, 3),
      overdueTasks: tasks.filter(t => t.dueDate && new Date(t.dueDate) < new Date()).slice(0, 5)
    };

    // Generate intelligent suggestions based on real data
    const replySuggestions = [];
    const quickWins = [];
    const upcomingTasks = [];
    const waitingOn = [];

    // Process emails for reply suggestions
    context.unreadEmails.forEach(email => {
      if (email.from && email.subject) {
        replySuggestions.push(`${email.from.split('<')[0].trim()}: ${email.subject}`);
      }
    });

    // Process tasks for quick wins and upcoming
    tasks.forEach(task => {
      if (task.priority === 'Low' && task.status !== 'Done') {
        quickWins.push(task.title || task.name);
      } else if (task.dueDate && task.status !== 'Done') {
        const dueDate = new Date(task.dueDate);
        const today = new Date();
        const diffDays = Math.ceil((dueDate - today) / (1000 * 60 * 60 * 24));
        
        if (diffDays >= 0 && diffDays <= 7) {
          upcomingTasks.push(`${task.title || task.name} (Due in ${diffDays} days)`);
        }
      }
      
      // Check for tasks waiting on others
      if (task.status === 'Blocked' || task.status === 'Waiting') {
        waitingOn.push(task.title || task.name);
      }
    });

    // Process meetings for action items
    meetings.forEach(meeting => {
      if (meeting.actionItems && meeting.actionItems.length > 0) {
        meeting.actionItems.slice(0, 2).forEach(item => {
          if (typeof item === 'string') {
            quickWins.push(`From ${meeting.title}: ${item}`);
          } else if (item.task) {
            quickWins.push(`From ${meeting.title}: ${item.task}`);
          }
        });
      }
    });

    // Use AI for more intelligent analysis if available
    if (this.openai || this.anthropic) {
      try {
        const aiAnalysis = await this.getAIAnalysis(context);
        if (aiAnalysis) {
          return {
            replySuggestions: aiAnalysis.replySuggestions || replySuggestions.slice(0, 3),
            quickWins: aiAnalysis.quickWins || quickWins.slice(0, 3),
            upcomingTasks: aiAnalysis.upcomingTasks || upcomingTasks.slice(0, 3),
            waitingOn: aiAnalysis.waitingOn || waitingOn.slice(0, 2)
          };
        }
      } catch (error) {
        console.log('🤖 AI analysis skipped:', error.message);
      }
    }

    // Return analyzed data
    return {
      replySuggestions: replySuggestions.slice(0, 3),
      quickWins: quickWins.slice(0, 3),
      upcomingTasks: upcomingTasks.slice(0, 3),
      waitingOn: waitingOn.slice(0, 2)
    };
  }

  async getAIAnalysis(context) {
    const prompt = `Analyze this work context and provide actionable insights:

Unread Emails: ${JSON.stringify(context.unreadEmails, null, 2)}
Urgent Tasks: ${JSON.stringify(context.urgentTasks, null, 2)}
Upcoming Meetings: ${JSON.stringify(context.upcomingMeetings, null, 2)}
Overdue Tasks: ${JSON.stringify(context.overdueTasks, null, 2)}

Provide a JSON response with these exact fields:
{
  "replySuggestions": ["3 most important emails to reply to with sender and topic"],
  "quickWins": ["3 tasks that can be completed in under 5 minutes"],
  "upcomingTasks": ["3 most urgent upcoming deadlines"],
  "waitingOn": ["2 items you're waiting on from others"]
}`;

    try {
      if (this.openai) {
        const completion = await this.openai.chat.completions.create({
          model: 'gpt-3.5-turbo',
          messages: [
            { role: 'system', content: 'You are a productivity assistant. Analyze work data and provide actionable insights in JSON format.' },
            { role: 'user', content: prompt }
          ],
          temperature: 0.7,
          response_format: { type: "json_object" }
        });

        return JSON.parse(completion.choices[0].message.content);
      } else if (this.anthropic) {
        const response = await this.anthropic.messages.create({
          model: 'claude-3-haiku-20240307',
          max_tokens: 500,
          messages: [{ role: 'user', content: prompt }]
        });

        return JSON.parse(response.content[0].text);
      }
    } catch (error) {
      console.error('AI analysis failed:', error);
      return null;
    }
  }

  getIntelligentDefaults() {
    return {
      success: true,
      data: {
        replySuggestions: [
          "Configure Gmail integration to see important emails",
          "Connect Slack to monitor team messages",
          "Set up Calendar for meeting reminders"
        ],
        quickWins: [
          "Test Notion integration with sample tasks",
          "Configure AI settings in .env file",
          "Review integration status in dashboard"
        ],
        upcomingTasks: [
          "Complete integration setup for full functionality",
          "Add team members to Notion workspace",
          "Schedule weekly review meetings"
        ],
        waitingOn: [
          "API keys for remaining integrations",
          "OAuth setup for Google services"
        ]
      },
      metadata: {
        totalEmails: 0,
        totalTasks: 0,
        totalMeetings: 0,
        totalEvents: 0,
        lastUpdated: new Date(),
        setupMode: true
      }
    };
  }
}

module.exports = MagicInboxProcessor;