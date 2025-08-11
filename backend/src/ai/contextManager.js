// backend/src/ai/contextManager.js
// Manages context from all integrations for AI

class ContextManager {
  constructor(integrationService, memoryManager) {
    this.integrations = integrationService;
    this.memory = memoryManager;
  }

  async gatherFullContext(query, options = {}) {
    const context = {
      query,
      timestamp: new Date().toISOString(),
      memories: {},
      currentData: {},
      relevantHistory: []
    };

    // Extract entities from the query
    const entities = this.memory.extractEntities(query);
    context.memories = entities;

    // Gather current data from integrations
    try {
      // Get recent emails
      if (this.integrations.gmailService) {
        const emails = await this.integrations.gmailService.getLatestEmails(5);
        context.currentData.recentEmails = emails.emails || [];
      }

      // Get current tasks
      if (this.integrations.notionService) {
        const tasks = await this.integrations.notionService.getTasks();
        context.currentData.tasks = tasks.tasks || [];
      }

      // Get recent meetings
      if (this.integrations.getFirefliesMeetings) {
        const meetings = await this.integrations.getFirefliesMeetings(3);
        context.currentData.recentMeetings = meetings.meetings || [];
      }

      // Get upcoming calendar events
      if (this.integrations.calendarService) {
        const events = await this.integrations.calendarService.getUpcomingMeetings(5);
        context.currentData.upcomingEvents = events.meetings || [];
      }

      // Get recent Slack messages if relevant
      if (options.includeSlack && this.integrations.slackService) {
        const messages = await this.integrations.slackService.getRecentMessages('general', 10);
        context.currentData.slackMessages = messages || [];
      }

    } catch (error) {
      console.error('Error gathering context:', error);
    }

    // Get recent interactions
    context.relevantHistory = this.memory.getRecentInteractions(5);

    return context;
  }

  async getEmailContext(emailId) {
    const context = {
      email: null,
      sender: null,
      previousEmails: [],
      relatedTasks: [],
      relatedMeetings: []
    };

    try {
      // Get the specific email
      if (this.integrations.gmailService) {
        context.email = await this.integrations.gmailService.getEmail(emailId);
        
        // Check if sender is a known entity
        const senderName = this.extractNameFromEmail(context.email.from);
        context.sender = await this.memory.getContext(senderName);
        
        // Get previous emails from this sender
        const previousEmails = await this.integrations.gmailService.searchEmails(
          `from:${context.email.from}`,
          5
        );
        context.previousEmails = previousEmails.emails || [];
      }

      // Find related tasks
      if (this.integrations.notionService && context.sender) {
        const tasks = await this.integrations.notionService.getTasks();
        context.relatedTasks = tasks.tasks?.filter(task => 
          task.title?.toLowerCase().includes(context.sender.data?.name?.toLowerCase()) ||
          task.assignee?.includes(context.sender.data?.name)
        ) || [];
      }

      // Find related meetings
      if (this.integrations.getFirefliesMeetings && context.sender) {
        const meetings = await this.integrations.getFirefliesMeetings(10);
        context.relatedMeetings = meetings.meetings?.filter(meeting =>
          meeting.participants?.includes(context.email.from) ||
          meeting.title?.toLowerCase().includes(context.sender.data?.name?.toLowerCase())
        ) || [];
      }

    } catch (error) {
      console.error('Error getting email context:', error);
    }

    return context;
  }

  async getTaskContext(taskId) {
    const context = {
      task: null,
      assignee: null,
      relatedTasks: [],
      relatedEmails: [],
      relatedMeetings: []
    };

    try {
      // Get the task details
      if (this.integrations.notionService) {
        const tasks = await this.integrations.notionService.getTasks();
        context.task = tasks.tasks?.find(t => t.id === taskId);
        
        if (context.task) {
          // Get assignee context
          context.assignee = await this.memory.getContext(context.task.assignee, 'team');
          
          // Get related tasks (same project or assignee)
          context.relatedTasks = tasks.tasks?.filter(t => 
            t.id !== taskId && (
              t.assignee === context.task.assignee ||
              t.project === context.task.project
            )
          ) || [];
        }
      }

      // Find related emails
      if (this.integrations.gmailService && context.task) {
        const searchQuery = context.task.title.split(' ').slice(0, 3).join(' ');
        const emails = await this.integrations.gmailService.searchEmails(searchQuery, 5);
        context.relatedEmails = emails.emails || [];
      }

      // Find related meetings
      if (this.integrations.getFirefliesMeetings && context.task) {
        const meetings = await this.integrations.getFirefliesMeetings(10);
        context.relatedMeetings = meetings.meetings?.filter(meeting =>
          meeting.actionItems?.some(item => 
            item.task?.toLowerCase().includes(context.task.title?.toLowerCase())
          )
        ) || [];
      }

    } catch (error) {
      console.error('Error getting task context:', error);
    }

    return context;
  }

  async getMeetingContext(meetingId) {
    const context = {
      meeting: null,
      participants: [],
      actionItems: [],
      relatedTasks: [],
      followUpEmails: []
    };

    try {
      // Get meeting details
      if (this.integrations.getFirefliesMeetings) {
        const meetings = await this.integrations.getFirefliesMeetings(20);
        context.meeting = meetings.meetings?.find(m => m.id === meetingId);
        
        if (context.meeting) {
          // Get participant contexts
          for (const participant of context.meeting.participants || []) {
            const participantContext = await this.memory.getContext(participant);
            if (participantContext) {
              context.participants.push(participantContext);
            }
          }
          
          context.actionItems = context.meeting.actionItems || [];
        }
      }

      // Find related tasks created from this meeting
      if (this.integrations.notionService && context.meeting) {
        const tasks = await this.integrations.notionService.getTasks();
        context.relatedTasks = tasks.tasks?.filter(task =>
          task.source?.includes(context.meeting.title) ||
          task.meetingUrl === context.meeting.url
        ) || [];
      }

      // Find follow-up emails
      if (this.integrations.gmailService && context.meeting) {
        const searchDate = new Date(context.meeting.date);
        const searchQuery = `after:${searchDate.toISOString().split('T')[0]} ${context.meeting.title.split(' ')[0]}`;
        const emails = await this.integrations.gmailService.searchEmails(searchQuery, 5);
        context.followUpEmails = emails.emails || [];
      }

    } catch (error) {
      console.error('Error getting meeting context:', error);
    }

    return context;
  }

  async getPersonContext(personName) {
    const context = {
      person: null,
      type: null,
      emails: [],
      tasks: [],
      meetings: [],
      interactions: []
    };

    try {
      // Get person from memory
      const personMemory = await this.memory.getContext(personName);
      if (personMemory) {
        context.person = personMemory.data;
        context.type = personMemory.type;
      }

      // Get emails from/to this person
      if (this.integrations.gmailService) {
        const emails = await this.integrations.gmailService.searchEmails(
          `from:${personName} OR to:${personName}`,
          10
        );
        context.emails = emails.emails || [];
      }

      // Get tasks related to this person
      if (this.integrations.notionService) {
        const tasks = await this.integrations.notionService.getTasks();
        context.tasks = tasks.tasks?.filter(task =>
          task.assignee?.includes(personName) ||
          task.title?.toLowerCase().includes(personName.toLowerCase())
        ) || [];
      }

      // Get meetings with this person
      if (this.integrations.getFirefliesMeetings) {
        const meetings = await this.integrations.getFirefliesMeetings(20);
        context.meetings = meetings.meetings?.filter(meeting =>
          meeting.participants?.some(p => p.includes(personName)) ||
          meeting.title?.toLowerCase().includes(personName.toLowerCase())
        ) || [];
      }

      // Get interaction history
      context.interactions = this.memory.getRecentInteractions(10, personName);

    } catch (error) {
      console.error('Error getting person context:', error);
    }

    return context;
  }

  // Helper function to extract name from email
  extractNameFromEmail(emailString) {
    // Extract name from "Name <email@domain.com>" format
    const match = emailString.match(/^([^<]+)\s*</);
    if (match) {
      return match[1].trim();
    }
    // Otherwise return the part before @
    return emailString.split('@')[0];
  }

  // Build a context summary for AI
  buildContextSummary(context) {
    let summary = [];

    // Add memory context
    if (context.memories) {
      if (context.memories.clients?.length > 0) {
        summary.push(`Known clients mentioned: ${context.memories.clients.map(c => c.name).join(', ')}`);
      }
      if (context.memories.leads?.length > 0) {
        summary.push(`Known leads mentioned: ${context.memories.leads.map(l => l.name).join(', ')}`);
      }
      if (context.memories.team?.length > 0) {
        summary.push(`Team members mentioned: ${context.memories.team.map(t => t.name).join(', ')}`);
      }
    }

    // Add current data summary
    if (context.currentData) {
      if (context.currentData.tasks?.length > 0) {
        const urgentTasks = context.currentData.tasks.filter(t => t.priority === 'High' || t.priority === 'Urgent');
        if (urgentTasks.length > 0) {
          summary.push(`${urgentTasks.length} urgent tasks pending`);
        }
      }
      if (context.currentData.upcomingEvents?.length > 0) {
        const nextEvent = context.currentData.upcomingEvents[0];
        summary.push(`Next meeting: ${nextEvent.title} at ${new Date(nextEvent.startTime).toLocaleString()}`);
      }
      if (context.currentData.recentEmails?.length > 0) {
        summary.push(`${context.currentData.recentEmails.length} recent emails to review`);
      }
    }

    return summary.join('\n');
  }
}

module.exports = ContextManager;