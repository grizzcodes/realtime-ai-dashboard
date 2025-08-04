// backend/src/ai/magicInboxProcessor.js - AI-powered inbox intelligence
const axios = require('axios');

class MagicInboxProcessor {
  constructor(services) {
    this.services = services; // { gmail, notion, fireflies, supabase }
    this.aiProcessor = services.aiProcessor;
  }

  async generateMagicInbox() {
    console.log('🔮 AI analyzing your digital life for actionable items...');
    
    try {
      // Gather all data sources
      const [emails, tasks, meetings] = await Promise.all([
        this.getRecentEmails(),
        this.getRecentTasks(),
        this.getRecentMeetings()
      ]);

      // AI analysis for each section
      const [replySuggestions, quickWins, upcomingTasks, waitingOn] = await Promise.all([
        this.analyzeReplySuggestions(emails),
        this.analyzeQuickWins(tasks, emails),
        this.analyzeUpcomingTasks(tasks, meetings),
        this.analyzeWaitingOn(emails)
      ]);

      return {
        success: true,
        data: {
          replySuggestions,
          quickWins,
          upcomingTasks,
          waitingOn
        },
        metadata: {
          totalEmails: emails.length,
          totalTasks: tasks.length,
          totalMeetings: meetings.length,
          lastUpdated: new Date()
        }
      };
    } catch (error) {
      console.error('Magic Inbox processing failed:', error);
      return {
        success: false,
        error: error.message,
        data: {
          replySuggestions: [],
          quickWins: [],
          upcomingTasks: [],
          waitingOn: []
        }
      };
    }
  }

  async getRecentEmails() {
    if (!this.services.gmail) return [];
    
    try {
      const result = await this.services.gmail.getRecentEmails(20);
      return result.success ? result.emails : [];
    } catch (error) {
      console.error('Failed to get emails:', error);
      return [];
    }
  }

  async getRecentTasks() {
    if (!this.services.notion) return [];
    
    try {
      const result = await this.services.notion.getRecentPages(15);
      return result || [];
    } catch (error) {
      console.error('Failed to get tasks:', error);
      return [];
    }
  }

  async getRecentMeetings() {
    if (!this.services.fireflies) return [];
    
    try {
      const result = await this.services.fireflies.getRecentTranscripts(10);
      return result.success ? result.transcripts : [];
    } catch (error) {
      console.error('Failed to get meetings:', error);
      return [];
    }
  }

  async analyzeReplySuggestions(emails) {
    if (!emails.length) return [];

    const unreadEmails = emails.filter(email => 
      email.snippet && !email.snippet.toLowerCase().includes('thank you')
    ).slice(0, 8);

    if (!unreadEmails.length) return [];

    try {
      const prompt = `Analyze these emails and identify which ones need replies. Focus on emails that:
- Ask questions or request information
- Need decisions or approvals
- Are from important contacts
- Have been waiting for responses

Emails:
${unreadEmails.map(email => `
Subject: ${email.subject}
From: ${email.from}
Snippet: ${email.snippet}
`).join('\n')}

Return a JSON array of strings describing each email that needs a reply, like:
["Sarah from Marketing: Campaign approval needed by Friday", "Client inquiry about project timeline"]

Limit to 5 most important replies needed.`;

      const response = await this.callAI(prompt);
      return this.parseAIResponse(response) || [];
    } catch (error) {
      console.error('Reply analysis failed:', error);
      return unreadEmails.slice(0, 3).map(email => 
        `${email.from?.split('<')[0]?.trim() || 'Someone'}: ${email.subject}`
      );
    }
  }

  async analyzeQuickWins(tasks, emails) {
    const allItems = [
      ...tasks.slice(0, 10).map(task => ({ type: 'task', ...task })),
      ...emails.slice(0, 5).map(email => ({ type: 'email', ...email }))
    ];

    if (!allItems.length) return [];

    try {
      const prompt = `Identify quick wins - tasks or actions that can be completed in under 2 minutes:

Items:
${allItems.map(item => {
  if (item.type === 'task') {
    return `Task: ${item.title} - Status: ${item.status || 'pending'}`;
  } else {
    return `Email: ${item.subject} - From: ${item.from}`;
  }
}).join('\n')}

Return a JSON array of quick win descriptions like:
["Approve vacation request (30 sec)", "Reply 'thanks' to completed deliverable", "Mark task as done"]

Focus on items that require minimal effort but provide value.`;

      const response = await this.callAI(prompt);
      return this.parseAIResponse(response) || [];
    } catch (error) {
      console.error('Quick wins analysis failed:', error);
      return [
        "Review and approve pending requests",
        "Send quick confirmation replies",
        "Update task statuses"
      ];
    }
  }

  async analyzeUpcomingTasks(tasks, meetings) {
    const now = new Date();
    const tomorrow = new Date(now.getTime() + 24 * 60 * 60 * 1000);
    
    const upcomingMeetings = meetings.filter(meeting => {
      const meetingDate = new Date(meeting.date);
      return meetingDate > now && meetingDate < tomorrow;
    });

    const pendingTasks = tasks.filter(task => 
      task.status !== 'completed' && task.status !== 'done'
    );

    if (!upcomingMeetings.length && !pendingTasks.length) return [];

    try {
      const prompt = `Identify tasks that need to be done before upcoming meetings or are time-sensitive:

Upcoming Meetings:
${upcomingMeetings.map(meeting => `${meeting.title} - ${meeting.date}`).join('\n')}

Pending Tasks:
${pendingTasks.slice(0, 10).map(task => `${task.title} - ${task.status || 'pending'}`).join('\n')}

Return a JSON array of urgent/upcoming items like:
["Prepare slides for 3PM meeting", "Review contract before client call", "Update project status for standup"]`;

      const response = await this.callAI(prompt);
      return this.parseAIResponse(response) || [];
    } catch (error) {
      console.error('Upcoming tasks analysis failed:', error);
      return pendingTasks.slice(0, 3).map(task => task.title);
    }
  }

  async analyzeWaitingOn(emails) {
    if (!emails.length) return [];

    // Look for sent emails that might be waiting for replies
    const potentialWaitingEmails = emails.filter(email => 
      email.snippet && (
        email.snippet.toLowerCase().includes('let me know') ||
        email.snippet.toLowerCase().includes('please confirm') ||
        email.snippet.toLowerCase().includes('waiting for') ||
        email.snippet.toLowerCase().includes('following up')
      )
    ).slice(0, 5);

    if (!potentialWaitingEmails.length) {
      return [
        "Check on project approval from last week",
        "Follow up on pending vendor responses",
        "Review outstanding client confirmations"
      ];
    }

    try {
      const prompt = `Identify what you might be waiting on based on these email patterns:

Emails:
${potentialWaitingEmails.map(email => `
Subject: ${email.subject}
Snippet: ${email.snippet}
`).join('\n')}

Return a JSON array of what you're likely waiting for responses on:
["Legal review from 3 days ago", "Budget approval sent Monday", "Meeting confirmation from vendor"]`;

      const response = await this.callAI(prompt);
      return this.parseAIResponse(response) || [];
    } catch (error) {
      console.error('Waiting analysis failed:', error);
      return potentialWaitingEmails.slice(0, 3).map(email => 
        `Response on: ${email.subject}`
      );
    }
  }

  async callAI(prompt) {
    if (!this.services.openaiKey && !this.services.claudeKey) {
      throw new Error('No AI service available');
    }

    try {
      if (this.services.openaiKey) {
        const response = await axios.post('https://api.openai.com/v1/chat/completions', {
          model: 'gpt-4',
          messages: [
            {
              role: 'system',
              content: 'You are an intelligent productivity assistant. Always respond with valid JSON arrays only. Be concise and actionable.'
            },
            {
              role: 'user',
              content: prompt
            }
          ],
          temperature: 0.3,
          max_tokens: 500
        }, {
          headers: {
            'Authorization': `Bearer ${this.services.openaiKey}`,
            'Content-Type': 'application/json'
          }
        });

        return response.data.choices[0].message.content;
      }
    } catch (error) {
      console.error('AI call failed:', error);
      throw error;
    }
  }

  parseAIResponse(response) {
    try {
      // Clean up response and parse JSON
      const cleanResponse = response.replace(/```json\n?/g, '').replace(/```\n?/g, '').trim();
      const parsed = JSON.parse(cleanResponse);
      
      if (Array.isArray(parsed)) {
        return parsed.slice(0, 6); // Limit to 6 items per section
      }
      
      return [];
    } catch (error) {
      console.error('Failed to parse AI response:', error);
      return [];
    }
  }

  // Get cached results to avoid rate limits
  async getCachedMagicInbox() {
    if (!this.services.supabase) {
      return await this.generateMagicInbox();
    }

    try {
      // Check if we have recent cached results (within 10 minutes)
      const { data, error } = await this.services.supabase.client
        .from('magic_inbox_cache')
        .select('*')
        .order('created_at', { ascending: false })
        .limit(1);

      if (error) throw error;

      if (data && data.length > 0) {
        const lastUpdate = new Date(data[0].created_at);
        const tenMinutesAgo = new Date(Date.now() - 10 * 60 * 1000);
        
        if (lastUpdate > tenMinutesAgo) {
          console.log('✅ Using cached Magic Inbox results');
          return {
            success: true,
            data: data[0].inbox_data,
            cached: true,
            lastUpdated: lastUpdate
          };
        }
      }

      // Generate fresh results and cache them
      const freshResults = await this.generateMagicInbox();
      
      if (freshResults.success) {
        // Cache the results
        await this.services.supabase.client
          .from('magic_inbox_cache')
          .insert([{
            inbox_data: freshResults.data,
            metadata: freshResults.metadata
          }]);
      }

      return freshResults;
    } catch (error) {
      console.error('Cache operation failed:', error);
      return await this.generateMagicInbox();
    }
  }
}

module.exports = MagicInboxProcessor;
