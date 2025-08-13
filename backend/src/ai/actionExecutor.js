// backend/src/ai/actionExecutor.js
// AI Action Executor - Performs actual tasks across all integrations

class ActionExecutor {
  constructor(integrationService, memoryManager) {
    this.integrations = integrationService;
    this.memory = memoryManager;
    
    // Define available actions
    this.actions = {
      // Email actions
      'archive_email': this.archiveEmail.bind(this),
      'delete_email': this.deleteEmail.bind(this),
      'draft_reply': this.draftEmailReply.bind(this),
      'send_email': this.sendEmail.bind(this),
      'mark_as_read': this.markEmailAsRead.bind(this),
      'star_email': this.starEmail.bind(this),
      
      // Task actions
      'create_task': this.createTask.bind(this),
      'update_task': this.updateTask.bind(this),
      'complete_task': this.completeTask.bind(this),
      'assign_task': this.assignTask.bind(this),
      'push_to_notion': this.pushTaskToNotion.bind(this),
      
      // Calendar actions
      'schedule_meeting': this.scheduleMeeting.bind(this),
      'find_time_slot': this.findAvailableTime.bind(this),
      'add_calendar_event': this.addCalendarEvent.bind(this),
      
      // Slack actions
      'send_slack_message': this.sendSlackMessage.bind(this),
      'create_slack_reminder': this.createSlackReminder.bind(this),
      
      // Analysis actions
      'analyze_emails': this.analyzeEmails.bind(this),
      'analyze_tasks': this.analyzeTasks.bind(this),
      'generate_report': this.generateReport.bind(this),
      
      // Memory actions
      'remember_client': this.rememberClient.bind(this),
      'remember_preference': this.rememberPreference.bind(this),
      'update_context': this.updateContext.bind(this)
    };
    
    console.log('🎯 Action Executor initialized with', Object.keys(this.actions).length, 'actions');
  }

  // Parse intent from AI response to determine which action to take
  async parseAndExecute(userMessage, aiResponse) {
    const intent = this.detectIntent(userMessage.toLowerCase());
    
    if (!intent) {
      return {
        success: false,
        message: 'No actionable intent detected',
        response: aiResponse
      };
    }
    
    console.log(`🎯 Detected intent: ${intent.action} with params:`, intent.params);
    
    // Execute the action
    const result = await this.executeAction(intent.action, intent.params);
    
    // Log the action for learning
    if (result.success) {
      await this.memory.logInteraction(
        'action',
        intent.action,
        'executed',
        userMessage,
        JSON.stringify(result)
      );
    }
    
    return result;
  }

  detectIntent(message) {
    // Email-related intents
    if (message.includes('delete') && message.includes('email')) {
      const isLatest = message.includes('latest') || message.includes('most recent');
      return {
        action: 'delete_email',
        params: { latest: isLatest }
      };
    }
    
    if (message.includes('archive') && message.includes('email')) {
      const isLatest = message.includes('latest') || message.includes('most recent');
      return {
        action: 'archive_email',
        params: { latest: isLatest }
      };
    }
    
    if (message.includes('reply to') || message.includes('draft response')) {
      return {
        action: 'draft_reply',
        params: { message }
      };
    }
    
    // IMPROVED Task-related intents detection
    // Check for various task creation patterns
    if (message.includes('create task') || 
        message.includes('add task') || 
        message.includes('add a task') ||
        message.includes('new task') ||
        message.includes('make a task') ||
        message.includes("let's create a task") ||
        message.includes("lets create a task") ||
        message.includes('make a new task') ||
        (message.includes('task') && (message.includes('add') || message.includes('create') || message.includes('make')))) {
      
      // Extract task details from the message
      const taskDetails = this.extractTaskDetails(message);
      
      return {
        action: 'create_task',
        params: taskDetails
      };
    }
    
    // Check for Notion-specific patterns
    if ((message.includes('notion') && (message.includes('add') || message.includes('create') || message.includes('push'))) ||
        message.includes('push to notion') || 
        message.includes('add to notion') ||
        message.includes('create in notion') ||
        message.includes('add notion task')) {
      
      const taskDetails = this.extractTaskDetails(message);
      
      return {
        action: 'push_to_notion',
        params: taskDetails
      };
    }
    
    if (message.includes('complete task') || message.includes('mark done')) {
      return {
        action: 'complete_task',
        params: { description: message }
      };
    }
    
    // Calendar intents
    if (message.includes('schedule') && (message.includes('meeting') || message.includes('call'))) {
      return {
        action: 'schedule_meeting',
        params: { description: message }
      };
    }
    
    // Slack intents
    if (message.includes('slack') && (message.includes('send') || message.includes('message'))) {
      return {
        action: 'send_slack_message',
        params: { description: message }
      };
    }
    
    // Analysis intents
    if (message.includes('analyze') || message.includes('analysis')) {
      if (message.includes('email')) {
        return { action: 'analyze_emails', params: {} };
      }
      if (message.includes('task')) {
        return { action: 'analyze_tasks', params: {} };
      }
    }
    
    return null;
  }

  // New helper method to extract task details from message
  extractTaskDetails(message) {
    const details = {
      description: message
    };
    
    // Extract assignee (looking for "for [name]" or "assign to [name]")
    const assigneeMatch = message.match(/(?:for|assign to|assigned to)\s+(\w+)/i);
    if (assigneeMatch) {
      details.assignee = assigneeMatch[1];
      // Capitalize first letter
      details.assignee = details.assignee.charAt(0).toUpperCase() + details.assignee.slice(1).toLowerCase();
    }
    
    // IMPROVED: Extract the actual task content after the dash
    let title = message;
    
    // First, check if there's a dash separator - everything after dash is the task
    if (message.includes('-')) {
      const parts = message.split('-');
      if (parts.length >= 2) {
        // Take everything after the first dash as the title
        title = parts.slice(1).join('-').trim();
      }
    } else {
      // If no dash, clean up the prefixes
      title = title.replace(/^(let's|lets|let us|please|can you|could you|would you)\s+/i, '');
      title = title.replace(/^(add|create|make|push|add a|create a|make a)\s+(a\s+)?(new\s+)?(task|notion task|to notion)?\s*/i, '');
      
      // Remove assignee part if found
      if (assigneeMatch) {
        title = title.replace(/(?:for|assign to|assigned to)\s+\w+/i, '');
      }
    }
    
    // Extract due date patterns and remove them from title
    const dueDatePatterns = [
      /\s*,?\s*due\s+(tomorrow|today|monday|tuesday|wednesday|thursday|friday|saturday|sunday)/i,
      /\s*,?\s*due\s+(?:on|by)?\s*(\d{1,2}[/-]\d{1,2}(?:[/-]\d{2,4})?)/i,
      /\s*,?\s*by\s+(tomorrow|today|next week|this week|end of day)/i,
      /\s*,?\s*due\s+for\s+(tomorrow|today)/i
    ];
    
    let dueDate = null;
    for (const pattern of dueDatePatterns) {
      const match = message.match(pattern);
      if (match) {
        dueDate = this.parseDueDate(match[1]);
        // Remove the due date from the title
        title = title.replace(pattern, '');
        break;
      }
    }
    
    // Final cleanup
    title = title.trim();
    // Remove any trailing commas, dashes, or colons
    title = title.replace(/[,\-:\s]+$/, '').trim();
    // Remove any leading commas, dashes, or colons
    title = title.replace(/^[,\-:\s]+/, '').trim();
    
    // Capitalize first letter of the title
    if (title) {
      title = title.charAt(0).toUpperCase() + title.slice(1);
    }
    
    details.title = title || 'New Task';
    
    if (dueDate) {
      details.dueDate = dueDate;
    }
    
    // Extract priority if mentioned
    const priorityMatch = message.match(/\b(urgent|high|medium|low)\s*priority/i);
    if (priorityMatch) {
      details.priority = priorityMatch[1].charAt(0).toUpperCase() + priorityMatch[1].slice(1).toLowerCase();
    }
    
    return details;
  }

  // Helper to parse due dates
  parseDueDate(dateString) {
    const today = new Date();
    const tomorrow = new Date(today);
    tomorrow.setDate(tomorrow.getDate() + 1);
    
    const dateMap = {
      'today': today.toISOString().split('T')[0],
      'tomorrow': tomorrow.toISOString().split('T')[0],
      'monday': this.getNextWeekday(1),
      'tuesday': this.getNextWeekday(2),
      'wednesday': this.getNextWeekday(3),
      'thursday': this.getNextWeekday(4),
      'friday': this.getNextWeekday(5),
      'saturday': this.getNextWeekday(6),
      'sunday': this.getNextWeekday(0),
      'next week': new Date(today.getTime() + 7 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
      'this week': this.getNextWeekday(5), // Default to Friday
      'end of day': today.toISOString().split('T')[0]
    };
    
    const lowerDateString = dateString.toLowerCase();
    if (dateMap[lowerDateString]) {
      return dateMap[lowerDateString];
    }
    
    // Try to parse actual date formats (MM/DD, MM-DD, MM/DD/YYYY, etc.)
    try {
      const parsed = new Date(dateString);
      if (!isNaN(parsed.getTime())) {
        return parsed.toISOString().split('T')[0];
      }
    } catch (e) {
      // Ignore parse errors
    }
    
    return null;
  }

  // Helper to get next occurrence of a weekday
  getNextWeekday(dayIndex) {
    const today = new Date();
    const todayIndex = today.getDay();
    const daysUntil = (dayIndex - todayIndex + 7) % 7 || 7;
    const nextDay = new Date(today);
    nextDay.setDate(today.getDate() + daysUntil);
    return nextDay.toISOString().split('T')[0];
  }

  async executeAction(actionName, params) {
    const action = this.actions[actionName];
    
    if (!action) {
      return {
        success: false,
        error: `Unknown action: ${actionName}`
      };
    }
    
    try {
      return await action(params);
    } catch (error) {
      console.error(`❌ Action ${actionName} failed:`, error);
      return {
        success: false,
        error: error.message
      };
    }
  }

  // ===== EMAIL ACTIONS =====
  async archiveEmail(params) {
    try {
      let emailId;
      
      if (params.latest) {
        // Get the latest email
        const emails = await this.integrations.getLatestEmails(1);
        if (!emails.success || emails.emails.length === 0) {
          return { success: false, error: 'No emails found' };
        }
        emailId = emails.emails[0].id;
      } else {
        emailId = params.emailId;
      }
      
      const result = await this.integrations.archiveEmail(emailId);
      
      if (result.success) {
        return {
          success: true,
          action: 'email_archived',
          message: `Email archived successfully`,
          emailId: emailId
        };
      }
      
      return result;
    } catch (error) {
      return { success: false, error: error.message };
    }
  }

  async deleteEmail(params) {
    try {
      let emailId;
      
      if (params.latest) {
        const emails = await this.integrations.getLatestEmails(1);
        if (!emails.success || emails.emails.length === 0) {
          return { success: false, error: 'No emails found' };
        }
        emailId = emails.emails[0].id;
      } else {
        emailId = params.emailId;
      }
      
      // Gmail doesn't have a direct delete, but we can move to trash
      const result = await this.integrations.gmailService.trashEmail(emailId);
      
      if (result.success) {
        return {
          success: true,
          action: 'email_deleted',
          message: `Email moved to trash`,
          emailId: emailId
        };
      }
      
      return result;
    } catch (error) {
      return { success: false, error: error.message };
    }
  }

  async draftEmailReply(params) {
    try {
      const emails = await this.integrations.getLatestEmails(5);
      
      // Find the email to reply to based on context
      // This is simplified - you'd want more sophisticated matching
      const emailToReply = emails.emails[0];
      
      const draft = {
        to: emailToReply.from,
        subject: `Re: ${emailToReply.subject}`,
        body: params.replyText || 'Thank you for your email. I will review and respond shortly.'
      };
      
      return {
        success: true,
        action: 'draft_created',
        draft: draft,
        message: 'Draft reply created'
      };
    } catch (error) {
      return { success: false, error: error.message };
    }
  }

  async sendEmail(params) {
    try {
      // Implement actual email sending via Gmail API
      const result = await this.integrations.gmailService.sendEmail(params);
      return {
        success: true,
        action: 'email_sent',
        message: `Email sent to ${params.to}`
      };
    } catch (error) {
      return { success: false, error: error.message };
    }
  }

  async markEmailAsRead(params) {
    try {
      const result = await this.integrations.markEmailAsRead(params.emailId);
      return {
        success: result.success,
        action: 'email_marked_read',
        message: result.message
      };
    } catch (error) {
      return { success: false, error: error.message };
    }
  }

  async starEmail(params) {
    try {
      const result = await this.integrations.toggleEmailStar(params.emailId, true);
      return {
        success: result.success,
        action: 'email_starred',
        message: result.message
      };
    } catch (error) {
      return { success: false, error: error.message };
    }
  }

  // ===== TASK ACTIONS =====
  async createTask(params) {
    try {
      const taskData = {
        title: params.title || this.extractTaskTitle(params.description),
        description: params.description,
        priority: params.priority || 'Medium',
        assignee: params.assignee || 'Team',
        dueDate: params.dueDate || null,
        status: 'Not started'  // Will be auto-mapped by NotionService
      };
      
      const result = await this.integrations.notionService.createTask(taskData);
      
      if (result.success) {
        return {
          success: true,
          action: 'task_created',
          task: result.task,
          message: `Task "${taskData.title}" created in Notion`
        };
      }
      
      return result;
    } catch (error) {
      return { success: false, error: error.message };
    }
  }

  async updateTask(params) {
    try {
      const result = await this.integrations.notionService.updateTask(
        params.taskId,
        params.updates
      );
      
      return {
        success: result.success,
        action: 'task_updated',
        message: 'Task updated successfully'
      };
    } catch (error) {
      return { success: false, error: error.message };
    }
  }

  async completeTask(params) {
    try {
      // Find the task by description or ID
      const tasks = await this.integrations.notionService.getTasks();
      const task = tasks.tasks?.find(t => 
        t.id === params.taskId || 
        t.title?.toLowerCase().includes(params.description?.toLowerCase())
      );
      
      if (!task) {
        return { success: false, error: 'Task not found' };
      }
      
      const result = await this.integrations.notionService.updateTask(task.id, {
        status: 'Completed'
      });
      
      return {
        success: result.success,
        action: 'task_completed',
        message: `Task "${task.title}" marked as completed`
      };
    } catch (error) {
      return { success: false, error: error.message };
    }
  }

  async assignTask(params) {
    try {
      const result = await this.integrations.notionService.updateTask(params.taskId, {
        assignee: params.assignee
      });
      
      return {
        success: result.success,
        action: 'task_assigned',
        message: `Task assigned to ${params.assignee}`
      };
    } catch (error) {
      return { success: false, error: error.message };
    }
  }

  async pushTaskToNotion(params) {
    try {
      // This is specifically for pushing action items from meetings
      const taskData = {
        title: params.task || params.title,
        description: params.description || `From meeting: ${params.source}`,
        assignee: params.assignee || 'Team',
        priority: params.priority || 'Medium',
        status: 'Not started',  // Will be auto-mapped by NotionService
        dueDate: params.dueDate || null,
        source: params.source || 'AI Assistant'
      };
      
      const result = await this.integrations.notionService.createTask(taskData);
      
      return {
        success: result.success,
        action: 'task_pushed_to_notion',
        task: result.task,
        message: `Task "${taskData.title}" pushed to Notion successfully`
      };
    } catch (error) {
      return { success: false, error: error.message };
    }
  }

  // ===== CALENDAR ACTIONS =====
  async scheduleMeeting(params) {
    try {
      const eventData = {
        summary: params.title || 'Meeting',
        description: params.description,
        startTime: params.startTime,
        endTime: params.endTime,
        attendees: params.attendees || []
      };
      
      const result = await this.integrations.calendarService.createEvent(eventData);
      
      return {
        success: result.success,
        action: 'meeting_scheduled',
        event: result.event,
        message: 'Meeting scheduled successfully'
      };
    } catch (error) {
      return { success: false, error: error.message };
    }
  }

  async findAvailableTime(params) {
    try {
      const slots = await this.integrations.calendarService.findAvailableSlots(
        params.duration || 60,
        params.startDate,
        params.endDate
      );
      
      return {
        success: true,
        action: 'time_slots_found',
        slots: slots,
        message: `Found ${slots.length} available time slots`
      };
    } catch (error) {
      return { success: false, error: error.message };
    }
  }

  async addCalendarEvent(params) {
    try {
      const result = await this.integrations.calendarService.createEvent(params);
      return {
        success: result.success,
        action: 'calendar_event_added',
        event: result.event,
        message: 'Event added to calendar'
      };
    } catch (error) {
      return { success: false, error: error.message };
    }
  }

  // ===== SLACK ACTIONS =====
  async sendSlackMessage(params) {
    try {
      const result = await this.integrations.slackService.sendMessage(
        params.channel || 'general',
        params.message
      );
      
      return {
        success: result.success,
        action: 'slack_message_sent',
        message: 'Message sent to Slack'
      };
    } catch (error) {
      return { success: false, error: error.message };
    }
  }

  async createSlackReminder(params) {
    try {
      const result = await this.integrations.slackService.createReminder(
        params.text,
        params.time
      );
      
      return {
        success: result.success,
        action: 'slack_reminder_created',
        message: 'Reminder created in Slack'
      };
    } catch (error) {
      return { success: false, error: error.message };
    }
  }

  // ===== ANALYSIS ACTIONS =====
  async analyzeEmails(params) {
    try {
      const emails = await this.integrations.getLatestEmails(20);
      
      const analysis = {
        total: emails.emails.length,
        unread: emails.emails.filter(e => e.isUnread).length,
        requiresResponse: this.identifyEmailsNeedingResponse(emails.emails),
        topSenders: this.getTopSenders(emails.emails),
        timeAnalysis: this.analyzeEmailTiming(emails.emails)
      };
      
      return {
        success: true,
        action: 'emails_analyzed',
        analysis: analysis,
        message: 'Email analysis complete'
      };
    } catch (error) {
      return { success: false, error: error.message };
    }
  }

  async analyzeTasks(params) {
    try {
      const tasks = await this.integrations.notionService.getTasks();
      
      const analysis = {
        total: tasks.tasks?.length || 0,
        byStatus: this.groupTasksByStatus(tasks.tasks),
        byPriority: this.groupTasksByPriority(tasks.tasks),
        overdue: this.findOverdueTasks(tasks.tasks),
        byAssignee: this.groupTasksByAssignee(tasks.tasks)
      };
      
      return {
        success: true,
        action: 'tasks_analyzed',
        analysis: analysis,
        message: 'Task analysis complete'
      };
    } catch (error) {
      return { success: false, error: error.message };
    }
  }

  async generateReport(params) {
    try {
      const [emails, tasks, meetings] = await Promise.all([
        this.integrations.getLatestEmails(10),
        this.integrations.notionService.getTasks(),
        this.integrations.getFirefliesMeetings(5)
      ]);
      
      const report = {
        summary: {
          emails: emails.emails?.length || 0,
          tasks: tasks.tasks?.length || 0,
          meetings: meetings.meetings?.length || 0
        },
        priorities: this.identifyPriorities(emails, tasks, meetings),
        recommendations: this.generateRecommendations(emails, tasks, meetings)
      };
      
      return {
        success: true,
        action: 'report_generated',
        report: report,
        message: 'Report generated successfully'
      };
    } catch (error) {
      return { success: false, error: error.message };
    }
  }

  // ===== MEMORY ACTIONS =====
  async rememberClient(params) {
    try {
      const result = await this.memory.rememberClient(params.name, params.details);
      return {
        success: true,
        action: 'client_remembered',
        message: `Client information for ${params.name} saved`
      };
    } catch (error) {
      return { success: false, error: error.message };
    }
  }

  async rememberPreference(params) {
    try {
      const context = await this.memory.getContext(params.name);
      if (context) {
        const updated = {
          ...context.data,
          preferences: {
            ...context.data.preferences,
            ...params.preferences
          }
        };
        
        await this.memory[`remember${context.type.charAt(0).toUpperCase() + context.type.slice(1)}`](
          params.name,
          updated
        );
        
        return {
          success: true,
          action: 'preference_saved',
          message: `Preferences updated for ${params.name}`
        };
      }
      
      return { success: false, error: 'Person not found in memory' };
    } catch (error) {
      return { success: false, error: error.message };
    }
  }

  async updateContext(params) {
    try {
      // Update any type of context
      const result = await this.memory[`remember${params.type}`](params.name, params.data);
      return {
        success: true,
        action: 'context_updated',
        message: `Context updated for ${params.name}`
      };
    } catch (error) {
      return { success: false, error: error.message };
    }
  }

  // ===== HELPER METHODS =====
  extractTaskTitle(description) {
    // Extract a concise title from a longer description
    const words = description.split(' ').slice(0, 10);
    return words.join(' ') + (description.split(' ').length > 10 ? '...' : '');
  }

  identifyEmailsNeedingResponse(emails) {
    // Simple heuristic - emails with questions or from important senders
    return emails.filter(email => 
      email.snippet?.includes('?') || 
      email.snippet?.toLowerCase().includes('please') ||
      email.snippet?.toLowerCase().includes('can you')
    ).map(e => ({
      from: e.from,
      subject: e.subject
    }));
  }

  getTopSenders(emails) {
    const senderCount = {};
    emails.forEach(email => {
      senderCount[email.from] = (senderCount[email.from] || 0) + 1;
    });
    
    return Object.entries(senderCount)
      .sort((a, b) => b[1] - a[1])
      .slice(0, 5)
      .map(([sender, count]) => ({ sender, count }));
  }

  analyzeEmailTiming(emails) {
    // Analyze when emails are received
    const hourCounts = new Array(24).fill(0);
    emails.forEach(email => {
      if (email.date) {
        const hour = new Date(email.date).getHours();
        hourCounts[hour]++;
      }
    });
    
    const peakHour = hourCounts.indexOf(Math.max(...hourCounts));
    return {
      peakHour,
      distribution: hourCounts
    };
  }

  groupTasksByStatus(tasks) {
    const grouped = {};
    tasks?.forEach(task => {
      grouped[task.status] = (grouped[task.status] || 0) + 1;
    });
    return grouped;
  }

  groupTasksByPriority(tasks) {
    const grouped = {};
    tasks?.forEach(task => {
      grouped[task.priority] = (grouped[task.priority] || 0) + 1;
    });
    return grouped;
  }

  groupTasksByAssignee(tasks) {
    const grouped = {};
    tasks?.forEach(task => {
      grouped[task.assignee || 'Unassigned'] = (grouped[task.assignee] || 0) + 1;
    });
    return grouped;
  }

  findOverdueTasks(tasks) {
    const now = new Date();
    return tasks?.filter(task => 
      task.dueDate && new Date(task.dueDate) < now && task.status !== 'Completed'
    ) || [];
  }

  identifyPriorities(emails, tasks, meetings) {
    const priorities = [];
    
    // Unread important emails
    const unreadEmails = emails.emails?.filter(e => e.isUnread) || [];
    if (unreadEmails.length > 5) {
      priorities.push({
        type: 'email',
        message: `${unreadEmails.length} unread emails need attention`
      });
    }
    
    // Overdue tasks
    const overdue = this.findOverdueTasks(tasks.tasks);
    if (overdue.length > 0) {
      priorities.push({
        type: 'task',
        message: `${overdue.length} tasks are overdue`
      });
    }
    
    // Upcoming meetings
    const upcomingMeetings = meetings.meetings?.filter(m => {
      const meetingDate = new Date(m.date);
      const hoursDiff = (meetingDate - new Date()) / (1000 * 60 * 60);
      return hoursDiff > 0 && hoursDiff < 24;
    }) || [];
    
    if (upcomingMeetings.length > 0) {
      priorities.push({
        type: 'meeting',
        message: `${upcomingMeetings.length} meetings in the next 24 hours`
      });
    }
    
    return priorities;
  }

  generateRecommendations(emails, tasks, meetings) {
    const recommendations = [];
    
    // Check email response time
    const needsResponse = this.identifyEmailsNeedingResponse(emails.emails || []);
    if (needsResponse.length > 3) {
      recommendations.push('Set aside time for email responses');
    }
    
    // Check task distribution
    const tasksByPriority = this.groupTasksByPriority(tasks.tasks);
    if (tasksByPriority['Urgent'] > 2) {
      recommendations.push('Focus on urgent tasks first');
    }
    
    // Check meeting preparation
    const upcomingMeetings = meetings.meetings?.filter(m => {
      const meetingDate = new Date(m.date);
      const hoursDiff = (meetingDate - new Date()) / (1000 * 60 * 60);
      return hoursDiff > 0 && hoursDiff < 48;
    }) || [];
    
    if (upcomingMeetings.length > 0) {
      recommendations.push('Prepare for upcoming meetings');
    }
    
    return recommendations;
  }
}

module.exports = ActionExecutor;