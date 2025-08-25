// backend/src/ai/enhancedMagicInboxProcessor.js - Enhanced with smart filtering
const OpenAI = require('openai');
const Anthropic = require('@anthropic-ai/sdk');

class EnhancedMagicInboxProcessor {
  constructor(services) {
    this.services = services;
    this.openai = services.openaiKey ? new OpenAI({ apiKey: services.openaiKey }) : null;
    this.anthropic = services.claudeKey ? new Anthropic({ apiKey: services.claudeKey }) : null;
    this.userEmail = process.env.USER_EMAIL || 'alec@dgenz.world';
    this.userDomain = '@dgenz.world';
    this.currentUser = process.env.CURRENT_USER || 'Alec';
    
    // Storage for checkable items
    this.completedQuickWins = new Set();
    this.personalGoals = [];
    this.cache = null;
    this.cacheExpiry = null;
  }

  async getCachedMagicInbox() {
    if (this.cache && this.cacheExpiry && new Date() < this.cacheExpiry) {
      console.log('📦 Returning cached Enhanced Magic Inbox');
      return this.cache;
    }

    const result = await this.generateMagicInbox();
    this.cache = result;
    this.cacheExpiry = new Date(Date.now() + 5 * 60 * 1000);
    return result;
  }

  async generateMagicInbox() {
    console.log(`🔮 Enhanced AI analyzing for ${this.currentUser}...`);
    
    try {
      const [emails, tasks, meetings, goals] = await Promise.all([
        this.getFilteredEmails(),
        this.getPersonalTasks(),
        this.getRecentMeetings(),
        this.getPersonalGoals()
      ]);

      // Smart AI analysis
      const [replySuggestions, quickWins, upcomingTasks, dailyGoals] = await Promise.all([
        this.analyzeReplySuggestionsWithIntent(emails),
        this.analyzePersonalQuickWins(tasks),
        this.analyzeUpcomingPriorities(tasks),
        this.processDailyGoals(goals)
      ]);

      return {
        success: true,
        data: { 
          replySuggestions, 
          quickWins, 
          upcomingTasks, 
          dailyGoals
        },
        metadata: {
          user: this.currentUser,
          totalEmails: emails.length,
          totalTasks: tasks.length,
          totalMeetings: meetings.length,
          personalGoals: goals.length,
          lastUpdated: new Date()
        }
      };
    } catch (error) {
      console.error('Enhanced Magic Inbox failed:', error);
      return this.getFallbackData();
    }
  }

  async getFilteredEmails() {
    try {
      if (!this.services.gmail) return [];
      
      const result = await this.services.gmail.getLatestEmails(30);
      if (!result.emails) return [];
      
      // Smart filtering
      return result.emails.filter(email => {
        // Skip internal replies from dgenz.world
        if (email.from?.includes(this.userDomain)) {
          if (email.subject?.match(/^(RE:|FW:|Fwd:)/i)) {
            return false;
          }
        }
        
        // Skip automated emails
        const fromLower = email.from?.toLowerCase() || '';
        if (fromLower.includes('no-reply') || fromLower.includes('noreply') || 
            fromLower.includes('notification@') || fromLower.includes('newsletter')) {
          return false;
        }
        
        // Skip confirmations and receipts
        const snippetLower = email.snippet?.toLowerCase() || '';
        if (snippetLower.includes('thank you for') || snippetLower.includes('receipt') ||
            snippetLower.includes('confirmed') || snippetLower.includes('successfully')) {
          return false;
        }
        
        return true;
      });
    } catch (error) {
      console.log('📧 Email filtering error:', error.message);
      return [];
    }
  }

  async getPersonalTasks() {
    try {
      if (!this.services.notion) return [];
      
      const result = await this.services.notion.getTasks();
      const allTasks = result.tasks || [];
      
      // Filter for tasks assigned to current user
      return allTasks.filter(task => {
        const assignee = task.assignee || task.assignedTo || '';
        const status = task.status || '';
        
        const isAssignedToMe = assignee.toLowerCase().includes(this.currentUser.toLowerCase()) || 
                               assignee === 'Team' || 
                               assignee === 'Unassigned';
        const isIncomplete = status !== 'Done' && status !== 'Completed';
        
        return isAssignedToMe && isIncomplete;
      });
    } catch (error) {
      console.log('📝 Task filtering error:', error.message);
      return [];
    }
  }

  async analyzeReplySuggestionsWithIntent(emails) {
    if (!emails.length) return [];

    // Filter emails that need action
    const actionableEmails = emails.filter(email => {
      if (!email.isUnread && new Date(email.date) < new Date(Date.now() - 48*60*60*1000)) {
        return false;
      }
      
      const snippet = email.snippet?.toLowerCase() || '';
      const subject = email.subject?.toLowerCase() || '';
      
      const actionPatterns = [
        'please', 'could you', 'can you', 'urgent', 'asap',
        'deadline', 'review', 'approve', 'confirm', 'waiting',
        'let me know', 'thoughts?', 'feedback', 'follow up'
      ];
      
      return actionPatterns.some(pattern => 
        snippet.includes(pattern) || subject.includes(pattern)
      );
    }).slice(0, 5);

    return actionableEmails.map(email => ({
      id: email.id,
      text: `${email.from?.split('<')[0]?.trim()}: ${email.subject}`,
      urgency: email.subject?.toLowerCase().includes('urgent') ? 'high' : 'normal',
      type: 'email'
    }));
  }

  async analyzePersonalQuickWins(tasks) {
    // Get high priority tasks only
    const highPriorityTasks = tasks.filter(task => {
      const priority = task.priority || '';
      return priority === 'High' || priority === 'Urgent' || priority === '🔴';
    }).slice(0, 5);

    if (!highPriorityTasks.length) {
      return this.getDefaultQuickWins();
    }

    return highPriorityTasks.map(task => ({
      id: task.id || `task_${Date.now()}_${Math.random()}`,
      text: `${task.title || task.name}`,
      priority: 'high',
      completed: this.completedQuickWins.has(task.id),
      checkable: true,
      estimatedMinutes: 5
    }));
  }

  async analyzeUpcomingPriorities(tasks) {
    const now = new Date();
    const endOfDay = new Date(now);
    endOfDay.setHours(23, 59, 59);
    
    // Get urgent and overdue tasks
    const urgentTasks = tasks.filter(task => {
      if (!task.dueDate) return false;
      const dueDate = new Date(task.dueDate);
      return dueDate <= endOfDay;
    }).sort((a, b) => new Date(a.dueDate) - new Date(b.dueDate));

    return urgentTasks.slice(0, 3).map(task => {
      const dueDate = new Date(task.dueDate);
      const diffDays = Math.ceil((dueDate - now) / (1000 * 60 * 60 * 24));
      
      let urgencyEmoji = '📅';
      if (diffDays < 0) urgencyEmoji = '⚠️';
      else if (diffDays === 0) urgencyEmoji = '🔴';
      else if (diffDays === 1) urgencyEmoji = '🟡';
      
      const status = diffDays < 0 ? `${Math.abs(diffDays)} days overdue` : 
                     diffDays === 0 ? 'Due TODAY' : 
                     diffDays === 1 ? 'Due TOMORROW' : 
                     `Due in ${diffDays} days`;
      
      return {
        text: `${urgencyEmoji} ${task.title || task.name} (${status})`,
        deadline: task.dueDate,
        priority: diffDays < 0 ? 'overdue' : diffDays === 0 ? 'critical' : 'high'
      };
    });
  }

  async processDailyGoals(goals) {
    return goals.map(goal => ({
      id: goal.id,
      text: goal.text,
      category: goal.category || 'personal',
      completed: goal.completedToday || false,
      streak: goal.streak || 0,
      reminder: goal.reminderTime || '9:00 AM',
      checkable: true
    }));
  }

  async getPersonalGoals() {
    // Default goals if none exist
    if (this.personalGoals.length === 0) {
      this.personalGoals = [
        { id: 'goal_1', text: '💪 Morning workout - 30 minutes', category: 'health', reminderTime: '7:00 AM' },
        { id: 'goal_2', text: '📚 Read industry news - 15 minutes', category: 'learning', reminderTime: '9:00 AM' },
        { id: 'goal_3', text: '🧘 Meditation - 10 minutes', category: 'wellness', reminderTime: '12:00 PM' }
      ];
    }
    return this.personalGoals;
  }

  async addPersonalGoal(goalText, category, reminderTime) {
    const newGoal = {
      id: `goal_${Date.now()}`,
      text: goalText,
      category: category || 'personal',
      reminderTime: reminderTime || '9:00 AM',
      createdAt: new Date()
    };
    
    this.personalGoals.push(newGoal);
    this.cache = null; // Clear cache
    return newGoal;
  }

  async toggleQuickWin(winId) {
    if (this.completedQuickWins.has(winId)) {
      this.completedQuickWins.delete(winId);
    } else {
      this.completedQuickWins.add(winId);
    }
    this.cache = null; // Clear cache
    return !this.completedQuickWins.has(winId);
  }

  async getRecentMeetings() {
    try {
      if (!this.services.fireflies) return [];
      const meetings = await this.services.fireflies.getRecentMeetings(5);
      return meetings.meetings || [];
    } catch (error) {
      console.log('🎙️ Meetings error:', error.message);
      return [];
    }
  }

  getDefaultQuickWins() {
    return [
      { id: 'qw_1', text: '✅ Review and clear inbox (5 min)', priority: 'medium', completed: false, checkable: true, estimatedMinutes: 5 },
      { id: 'qw_2', text: '📋 Update task statuses in Notion (3 min)', priority: 'high', completed: false, checkable: true, estimatedMinutes: 3 }
    ];
  }

  getFallbackData() {
    return {
      success: true,
      data: {
        replySuggestions: [],
        quickWins: this.getDefaultQuickWins(),
        upcomingTasks: [],
        dailyGoals: []
      },
      metadata: {
        user: this.currentUser,
        fallbackMode: true,
        lastUpdated: new Date()
      }
    };
  }
}

module.exports = EnhancedMagicInboxProcessor;