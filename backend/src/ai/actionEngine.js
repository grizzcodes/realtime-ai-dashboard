// backend/src/ai/actionEngine.js
class ActionEngine {
  constructor(services) {
    this.services = services; // { notion, gmail, slack, fireflies }
    this.aiProcessor = services.aiProcessor;
  }

  async processIntelligentActions(task, context = {}) {
    console.log(`🤖 Processing intelligent actions for: ${task.title}`);
    
    const actions = [];
    
    // Email-related actions (skip for now to avoid errors)
    // if (task.source === 'gmail' && task.urgency >= 4) {
    //   const emailAction = await this.suggestEmailResponse(task, context);
    //   if (emailAction) actions.push(emailAction);
    // }

    // Meeting-related actions
    if (task.category === 'meeting' || task.tags.includes('meeting')) {
      const meetingActions = await this.suggestMeetingActions(task, context);
      actions.push(...meetingActions);
    }

    // Notion sync actions
    if (task.urgency >= 4) {
      const notionAction = await this.suggestNotionUpdates(task, context);
      if (notionAction) actions.push(notionAction);
    }

    // Follow-up actions
    const followUpAction = await this.suggestFollowUps(task, context);
    if (followUpAction) actions.push(followUpAction);

    return actions;
  }

  async suggestMeetingActions(task, context) {
    const actions = [];

    // Extract meeting participants from task
    const participants = task.keyPeople || [];
    
    if (participants.length > 1) {
      actions.push({
        type: 'calendar_event',
        priority: 'medium',
        description: `Schedule meeting: ${task.title}`,
        action: 'create_meeting',
        data: {
          title: task.title,
          participants: participants,
          duration: 30, // Default 30 min
          suggestedTimes: this.suggestMeetingTimes(),
          agenda: this.generateMeetingAgenda(task, context)
        },
        autoExecute: false
      });
    }

    // If deadline approaching, suggest preparation
    const daysUntilDeadline = this.getDaysUntilDeadline(task.deadline);
    if (daysUntilDeadline <= 2) {
      actions.push({
        type: 'preparation_reminder',
        priority: 'high',
        description: 'Prepare for upcoming deadline',
        action: 'create_prep_checklist',
        data: {
          taskId: task.id,
          deadline: task.deadline,
          checklist: this.generatePrepChecklist(task)
        },
        autoExecute: true
      });
    }

    return actions;
  }

  async suggestNotionUpdates(task, context) {
    // Auto-sync high priority tasks to Notion with rich context
    return {
      type: 'notion_sync',
      priority: 'medium',
      description: 'Sync to Notion with context',
      action: 'update_notion',
      data: {
        taskId: task.id,
        properties: {
          'Task name': { title: [{ text: { content: task.title } }] },
          'Status': { select: { name: 'Todo' } },
          'Priority': { 
            select: { 
              name: task.urgency >= 5 ? 'Critical' : 
                    task.urgency >= 4 ? 'High' : 
                    task.urgency >= 3 ? 'Medium' : 'Low' 
            } 
          },
          'Source': { rich_text: [{ text: { content: task.source } }] },
          'AI Confidence': { number: task.confidence },
          'Due Date': task.deadline ? { date: { start: task.deadline } } : null,
          'Context': { 
            rich_text: [{ 
              text: { 
                content: this.generateContextSummary(task, context) 
              } 
            }] 
          }
        }
      },
      autoExecute: true // Auto-execute for high priority
    };
  }

  async suggestFollowUps(task, context) {
    // Smart follow-up suggestions based on task type and context
    const followUpDays = this.calculateFollowUpInterval(task);
    
    if (followUpDays > 0) {
      return {
        type: 'follow_up',
        priority: 'low',
        description: `Follow up on: ${task.title}`,
        action: 'schedule_follow_up',
        data: {
          taskId: task.id,
          followUpDate: new Date(Date.now() + followUpDays * 24 * 60 * 60 * 1000),
          reminderText: `Check progress on: ${task.title}`,
          suggestedActions: this.generateFollowUpActions(task)
        },
        autoExecute: true
      };
    }

    return null;
  }

  generateMeetingAgenda(task, context) {
    return [
      `Discussion: ${task.title}`,
      'Current status and blockers',
      'Next steps and assignments',
      'Timeline and deadlines',
      'Questions and decisions needed'
    ];
  }

  generatePrepChecklist(task) {
    return [
      'Review task requirements',
      'Gather necessary documents',
      'Identify potential blockers',
      'Prepare status update',
      'List questions for stakeholders'
    ];
  }

  generateContextSummary(task, context) {
    let summary = `AI-generated task: ${task.summary}`;
    
    if (context.emailContent) {
      summary += `\n\nFrom email: ${context.emailContent.subject}`;
      summary += `\nSender: ${context.emailContent.from}`;
    }
    
    if (context.meetingTranscript) {
      summary += `\n\nFrom meeting: ${context.meetingTranscript.title}`;
      summary += `\nParticipants: ${context.meetingTranscript.participants?.join(', ')}`;
    }
    
    summary += `\n\nTags: ${task.tags?.join(', ')}`;
    summary += `\nUrgency: ${task.urgency}/5`;
    summary += `\nDeadline: ${task.deadline || 'Not specified'}`;
    
    return summary;
  }

  suggestMeetingTimes() {
    // Suggest next few business days, 9 AM - 5 PM
    const times = [];
    const now = new Date();
    
    for (let i = 1; i <= 3; i++) {
      const day = new Date(now);
      day.setDate(now.getDate() + i);
      
      // Skip weekends
      if (day.getDay() === 0 || day.getDay() === 6) continue;
      
      times.push({
        date: day.toISOString().split('T')[0],
        time: '10:00',
        duration: 30
      });
    }
    
    return times;
  }

  getDaysUntilDeadline(deadline) {
    if (!deadline) return Infinity;
    const deadlineDate = new Date(deadline);
    const now = new Date();
    return Math.ceil((deadlineDate - now) / (1000 * 60 * 60 * 24));
  }

  calculateFollowUpInterval(task) {
    // Dynamic follow-up based on urgency and type
    if (task.urgency >= 5) return 1; // Next day for critical
    if (task.urgency >= 4) return 3; // 3 days for high
    if (task.urgency >= 3) return 7; // 1 week for medium
    return 14; // 2 weeks for low priority
  }

  generateFollowUpActions(task) {
    return [
      'Check task completion status',
      'Review any blockers or issues',
      'Update stakeholders if needed',
      'Adjust timeline if necessary'
    ];
  }

  // Execute approved actions
  async executeAction(action) {
    console.log(`🎯 Executing action: ${action.type}`);
    
    try {
      switch (action.type) {
        case 'calendar_event':
          return await this.executeCreateMeeting(action.data);
        
        case 'notion_sync':
          return await this.executeNotionSync(action.data);
        
        case 'follow_up':
          return await this.executeFollowUp(action.data);
        
        default:
          console.log(`✅ Action logged: ${action.type}`);
          return { success: true, message: `Action ${action.type} logged` };
      }
    } catch (error) {
      console.error(`Action execution failed:`, error);
      return { success: false, error: error.message };
    }
  }

  async executeCreateMeeting(data) {
    // Create calendar event (requires Google Calendar API)
    console.log(`📅 Meeting suggested: ${data.title}`);
    console.log(`Participants: ${data.participants.join(', ')}`);
    console.log(`Agenda: ${data.agenda.join(', ')}`);
    return { success: true, message: 'Meeting suggestion created' };
  }

  async executeNotionSync(data) {
    // Sync to Notion with rich context
    if (this.services.notion) {
      try {
        const result = await this.services.notion.createTask(
          data.properties['Task name'].title[0].text.content,
          data.properties
        );
        console.log(`📝 Synced to Notion: ${data.properties['Task name'].title[0].text.content}`);
        return { success: true, message: 'Synced to Notion', notionId: result.id };
      } catch (error) {
        return { success: false, error: error.message };
      }
    }
    return { success: false, error: 'Notion service not available' };
  }

  async executeFollowUp(data) {
    // Create follow-up reminder
    console.log(`⏰ Follow-up scheduled for: ${data.followUpDate}`);
    console.log(`Reminder: ${data.reminderText}`);
    return { success: true, message: 'Follow-up scheduled' };
  }
}

module.exports = ActionEngine;