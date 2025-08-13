// backend/src/ai/magicInboxProcessor.js - AI-powered inbox intelligence PERSONALIZED
const OpenAI = require('openai');
const Anthropic = require('@anthropic-ai/sdk');

class MagicInboxProcessor {
  constructor(services) {
    this.services = services;
    this.openai = services.openaiKey ? new OpenAI({ apiKey: services.openaiKey }) : null;
    this.anthropic = services.claudeKey ? new Anthropic({ apiKey: services.claudeKey }) : null;
    this.cache = null;
    this.cacheExpiry = null;
    
    // Get current user from environment or default to Alec
    this.currentUser = process.env.CURRENT_USER || 'Alec';
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
    console.log(`🔮 Generating personalized Magic AI Inbox for ${this.currentUser}...`);
    
    try {
      // Gather all data sources in parallel
      const [emails, tasks, meetings, calendar] = await Promise.all([
        this.getRecentEmails(),
        this.getMyTasks(), // Changed to get tasks assigned to current user
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
            user: this.currentUser,
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
      // Filter for emails that might be to/from current user
      return emails.emails || [];
    } catch (error) {
      console.log('📧 Gmail not connected:', error.message);
      return [];
    }
  }

  async getMyTasks() {
    try {
      if (!this.services.notion) return [];
      
      // Get ALL tasks from Notion
      const result = await this.services.notion.getTasks();
      const allTasks = result.tasks || [];
      
      // Filter tasks assigned to current user
      const myTasks = allTasks.filter(task => {
        // Check if task is assigned to current user
        const assignee = task.assignee || task.assignedTo || '';
        return assignee.toLowerCase().includes(this.currentUser.toLowerCase()) ||
               assignee === 'Team' || // Include team tasks
               assignee === 'Unassigned'; // Include unassigned tasks
      });
      
      console.log(`📋 Found ${myTasks.length} tasks for ${this.currentUser}`);
      return myTasks;
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
      // Get calendar events if available
      if (!this.services.calendar) return [];
      
      const events = await this.services.calendar.getUpcomingEvents(7);
      return events.events || [];
    } catch (error) {
      console.log('📅 Calendar not connected:', error.message);
      return [];
    }
  }

  async analyzeWithAI(data) {
    const { emails, tasks, meetings, calendar } = data;

    // Build personalized context
    const context = {
      unreadEmails: emails.filter(e => e.isUnread).slice(0, 5),
      myUrgentTasks: tasks.filter(t => 
        (t.priority === 'High' || t.priority === 'Urgent') && 
        t.status !== 'Done' && 
        t.status !== 'Completed'
      ).slice(0, 5),
      myUpcomingTasks: tasks.filter(t => 
        t.dueDate && 
        new Date(t.dueDate) >= new Date() &&
        t.status !== 'Done' && 
        t.status !== 'Completed'
      ).sort((a, b) => new Date(a.dueDate) - new Date(b.dueDate)).slice(0, 5),
      myOverdueTasks: tasks.filter(t => 
        t.dueDate && 
        new Date(t.dueDate) < new Date() &&
        t.status !== 'Done' && 
        t.status !== 'Completed'
      ).slice(0, 5),
      upcomingMeetings: meetings.slice(0, 3)
    };

    // Generate intelligent suggestions based on real data
    const replySuggestions = [];
    const quickWins = [];
    const upcomingTasks = [];
    const waitingOn = [];

    // PERSONALIZED: Process emails that need your attention
    context.unreadEmails.forEach(email => {
      if (email.from && email.subject) {
        // Check if email mentions current user or is high priority
        if (email.snippet?.toLowerCase().includes(this.currentUser.toLowerCase()) ||
            email.subject?.toLowerCase().includes('urgent') ||
            email.subject?.toLowerCase().includes('asap')) {
          replySuggestions.push(`📧 ${email.from.split('<')[0].trim()}: ${email.subject}`);
        }
      }
    });

    // PERSONALIZED: Your quick wins (tasks you can complete quickly)
    tasks.forEach(task => {
      // Quick wins are your low priority or small tasks
      if ((task.priority === 'Low' || task.priority === 'Medium') && 
          task.status !== 'Done' && 
          task.status !== 'Completed') {
        quickWins.push(`✅ ${task.title || task.name}`);
      }
    });

    // PERSONALIZED: Your upcoming deadlines
    context.myUpcomingTasks.forEach(task => {
      const dueDate = new Date(task.dueDate);
      const today = new Date();
      const diffDays = Math.ceil((dueDate - today) / (1000 * 60 * 60 * 24));
      
      let urgencyEmoji = '📅';
      if (diffDays === 0) urgencyEmoji = '🔴';
      else if (diffDays === 1) urgencyEmoji = '🟡';
      else if (diffDays <= 3) urgencyEmoji = '🟠';
      
      upcomingTasks.push(`${urgencyEmoji} ${task.title || task.name} (${diffDays === 0 ? 'Due TODAY' : diffDays === 1 ? 'Due TOMORROW' : `Due in ${diffDays} days`})`);
    });

    // PERSONALIZED: Show overdue tasks first if any
    context.myOverdueTasks.forEach(task => {
      const dueDate = new Date(task.dueDate);
      const today = new Date();
      const diffDays = Math.ceil((today - dueDate) / (1000 * 60 * 60 * 24));
      
      waitingOn.push(`⚠️ OVERDUE: ${task.title || task.name} (${diffDays} days overdue)`);
    });

    // Check for blocked tasks
    tasks.filter(t => t.status === 'Blocked' || t.status === 'Waiting').forEach(task => {
      waitingOn.push(`⏸️ Blocked: ${task.title || task.name}`);
    });

    // Process meetings for YOUR action items
    meetings.forEach(meeting => {
      if (meeting.actionItems && meeting.actionItems.length > 0) {
        meeting.actionItems.slice(0, 2).forEach(item => {
          const actionText = typeof item === 'string' ? item : item.task;
          if (actionText) {
            // Check if action item mentions current user
            if (actionText.toLowerCase().includes(this.currentUser.toLowerCase())) {
              quickWins.push(`📝 From ${meeting.title}: ${actionText}`);
            }
          }
        });
      }
    });

    // If no personalized data, show what needs to be done
    if (replySuggestions.length === 0 && emails.length > 0) {
      replySuggestions.push('📧 Check your recent emails for important messages');
    }
    
    if (quickWins.length === 0 && tasks.length > 0) {
      // Show any tasks assigned to you
      const yourTasks = tasks.slice(0, 3);
      yourTasks.forEach(task => {
        quickWins.push(`📋 ${task.title || task.name}`);
      });
    }
    
    if (upcomingTasks.length === 0 && tasks.length > 0) {
      // Show your most recent tasks
      tasks.slice(0, 3).forEach(task => {
        upcomingTasks.push(`📋 ${task.title || task.name} (${task.status})`);
      });
    }

    // Return personalized analysis
    return {
      replySuggestions: replySuggestions.slice(0, 3),
      quickWins: quickWins.slice(0, 3),
      upcomingTasks: upcomingTasks.slice(0, 3),
      waitingOn: waitingOn.slice(0, 2)
    };
  }

  async getAIAnalysis(context) {
    const prompt = `Analyze this work context for ${this.currentUser} and provide personalized actionable insights:

Unread Emails: ${JSON.stringify(context.unreadEmails, null, 2)}
My Urgent Tasks: ${JSON.stringify(context.myUrgentTasks, null, 2)}
My Upcoming Tasks: ${JSON.stringify(context.myUpcomingTasks, null, 2)}
My Overdue Tasks: ${JSON.stringify(context.myOverdueTasks, null, 2)}
Upcoming Meetings: ${JSON.stringify(context.upcomingMeetings, null, 2)}

Provide a JSON response with personalized recommendations for ${this.currentUser}:
{
  "replySuggestions": ["3 most important emails ${this.currentUser} should reply to"],
  "quickWins": ["3 tasks ${this.currentUser} can complete quickly today"],
  "upcomingTasks": ["3 most urgent deadlines for ${this.currentUser}"],
  "waitingOn": ["2 items ${this.currentUser} is waiting on or overdue"]
}`;

    try {
      if (this.openai) {
        const completion = await this.openai.chat.completions.create({
          model: 'gpt-3.5-turbo',
          messages: [
            { role: 'system', content: `You are a personal productivity assistant for ${this.currentUser}. Analyze their work data and provide personalized actionable insights in JSON format.` },
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
          `📧 No emails requiring ${this.currentUser}'s immediate attention`,
          "💡 Connect Gmail to see important messages",
          "🔔 Enable notifications for priority emails"
        ],
        quickWins: [
          `✅ No quick tasks assigned to ${this.currentUser}`,
          "📝 Create your first task in Notion",
          "🎯 Set up your daily priorities"
        ],
        upcomingTasks: [
          `📅 No upcoming deadlines for ${this.currentUser}`,
          "📋 Add tasks with due dates to track deadlines",
          "⏰ Schedule your weekly review"
        ],
        waitingOn: [
          "⏸️ No blocked items",
          "🔄 Check for pending approvals"
        ]
      },
      metadata: {
        user: this.currentUser,
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