// backend/src/routes/aiRoutes.js - Enhanced AI routes with action execution
const OpenAI = require('openai');
const Anthropic = require('@anthropic-ai/sdk');

module.exports = function(app, io, integrationService, supabaseClient) {
  // Initialize AI clients
  const openai = new OpenAI({
    apiKey: process.env.OPENAI_API_KEY
  });

  const anthropic = new Anthropic({
    apiKey: process.env.ANTHROPIC_API_KEY
  });

  // Helper to execute calendar actions
  async function executeCalendarAction(action, params) {
    console.log('📅 Executing calendar action:', action, params);
    
    try {
      switch(action) {
        case 'create_event':
          // Parse the event details
          const { title, date, time, attendees, description } = params;
          
          // Convert natural language date/time to proper format
          const eventDate = parseEventDateTime(date, time);
          
          // Create the calendar event
          const result = await integrationService.calendarService.createEvent({
            summary: title || 'Meeting',
            description: description || '',
            start: {
              dateTime: eventDate.start,
              timeZone: 'America/Los_Angeles'
            },
            end: {
              dateTime: eventDate.end,
              timeZone: 'America/Los_Angeles'
            },
            attendees: attendees ? attendees.map(email => ({ email })) : [],
            reminders: {
              useDefault: false,
              overrides: [
                { method: 'email', minutes: 30 },
                { method: 'popup', minutes: 10 }
              ]
            }
          });
          
          return {
            success: true,
            message: `Calendar event created successfully`,
            eventId: result.data?.id,
            htmlLink: result.data?.htmlLink
          };
          
        case 'list_events':
          const events = await integrationService.calendarService.getUpcomingEvents(params.days || 7);
          return {
            success: true,
            events: events.data || []
          };
          
        default:
          return {
            success: false,
            error: 'Unknown calendar action'
          };
      }
    } catch (error) {
      console.error('Calendar action failed:', error);
      return {
        success: false,
        error: error.message
      };
    }
  }

  // Helper to parse natural language dates
  function parseEventDateTime(dateStr, timeStr) {
    const now = new Date();
    let eventDate = new Date();
    
    // Parse date
    if (dateStr?.toLowerCase().includes('tomorrow')) {
      eventDate.setDate(now.getDate() + 1);
    } else if (dateStr?.toLowerCase().includes('today')) {
      // Keep today
    } else if (dateStr) {
      // Try to parse the date string
      eventDate = new Date(dateStr);
    }
    
    // Parse time (e.g., "10am", "10:00 AM", "3:30pm")
    if (timeStr) {
      const timeMatch = timeStr.match(/(\d{1,2}):?(\d{2})?\s*(am|pm)?/i);
      if (timeMatch) {
        let hours = parseInt(timeMatch[1]);
        const minutes = parseInt(timeMatch[2] || '0');
        const meridiem = timeMatch[3];
        
        if (meridiem?.toLowerCase() === 'pm' && hours < 12) {
          hours += 12;
        } else if (meridiem?.toLowerCase() === 'am' && hours === 12) {
          hours = 0;
        }
        
        eventDate.setHours(hours, minutes, 0, 0);
      }
    }
    
    // Create end time (1 hour later by default)
    const endDate = new Date(eventDate);
    endDate.setHours(endDate.getHours() + 1);
    
    return {
      start: eventDate.toISOString(),
      end: endDate.toISOString()
    };
  }

  // Helper to detect and extract action intents
  function detectActionIntent(message) {
    const lowerMessage = message.toLowerCase();
    
    // Calendar actions
    if (lowerMessage.includes('calendar') || lowerMessage.includes('meeting') || 
        lowerMessage.includes('schedule') || lowerMessage.includes('invite')) {
      
      // Extract email addresses
      const emailRegex = /[\w.-]+@[\w.-]+\.\w+/g;
      const emails = message.match(emailRegex) || [];
      
      // Extract time
      const timeRegex = /(\d{1,2}):?(\d{2})?\s*(am|pm)|(\d{1,2})\s*(am|pm)/gi;
      const timeMatch = message.match(timeRegex);
      
      // Extract date keywords
      const tomorrow = lowerMessage.includes('tomorrow');
      const today = lowerMessage.includes('today');
      
      return {
        type: 'calendar',
        action: 'create_event',
        params: {
          attendees: emails,
          time: timeMatch ? timeMatch[0] : null,
          date: tomorrow ? 'tomorrow' : (today ? 'today' : null),
          title: extractTitle(message)
        }
      };
    }
    
    return null;
  }

  // Extract meeting title from message
  function extractTitle(message) {
    // Try to extract text between quotes
    const quotedMatch = message.match(/["']([^"']+)["']/);
    if (quotedMatch) return quotedMatch[1];
    
    // Try to extract after "about" or "for"
    const aboutMatch = message.match(/(?:about|for|regarding)\s+(.+?)(?:\s+(?:at|on|with)|$)/i);
    if (aboutMatch) return aboutMatch[1];
    
    // Default title
    return 'Meeting';
  }

  // Main AI chat endpoint with action execution
  app.post('/api/ai/chat', async (req, res) => {
    try {
      const { message, model = 'gpt-4', sessionId } = req.body;
      
      console.log('🤖 AI chat request:', { 
        message: message.substring(0, 100),
        model,
        sessionId 
      });

      // Detect if this requires an action
      const actionIntent = detectActionIntent(message);
      
      // Build context including action capabilities
      let systemPrompt = `You are a helpful AI assistant for DGenz company. 
      You have access to the company calendar and can create events.
      When users ask to schedule meetings or create calendar events, acknowledge that you're creating the event.
      Always be specific about what actions you're taking.`;
      
      // Get AI response
      let aiResponse = '';
      let actionResult = null;
      
      if (model === 'claude') {
        const response = await anthropic.messages.create({
          model: 'claude-3-sonnet-20241022',
          max_tokens: 1000,
          system: systemPrompt,
          messages: [{ role: 'user', content: message }]
        });
        aiResponse = response.content[0].text;
      } else {
        const completion = await openai.chat.completions.create({
          model: model === 'gpt-4' ? 'gpt-4' : 'gpt-3.5-turbo',
          messages: [
            { role: 'system', content: systemPrompt },
            { role: 'user', content: message }
          ],
          temperature: 0.7,
          max_tokens: 1000
        });
        aiResponse = completion.choices[0].message.content;
      }
      
      // Execute the action if detected
      if (actionIntent) {
        console.log('🎯 Action detected:', actionIntent);
        
        if (actionIntent.type === 'calendar') {
          actionResult = await executeCalendarAction(actionIntent.action, actionIntent.params);
          
          // Append action result to response
          if (actionResult.success) {
            aiResponse += `\n\n✅ Action completed: ${actionResult.message}`;
            if (actionResult.htmlLink) {
              aiResponse += `\n📅 View event: ${actionResult.htmlLink}`;
            }
          } else {
            aiResponse += `\n\n⚠️ I tried to create the calendar event but encountered an error: ${actionResult.error}`;
          }
        }
      }
      
      // Send response
      res.json({
        success: true,
        response: aiResponse,
        model: model,
        actionExecuted: actionIntent ? true : false,
        actionResult: actionResult
      });
      
      // Emit to WebSocket for real-time updates
      if (io && actionResult?.success) {
        io.emit('actionCompleted', {
          type: actionIntent.type,
          result: actionResult,
          timestamp: new Date().toISOString()
        });
      }
      
    } catch (error) {
      console.error('AI chat error:', error);
      res.status(500).json({
        success: false,
        error: error.message || 'AI service temporarily unavailable'
      });
    }
  });

  // Get upcoming calendar events
  app.get('/api/ai/calendar/events', async (req, res) => {
    try {
      const { days = 7 } = req.query;
      
      const result = await integrationService.calendarService.getUpcomingEvents(parseInt(days));
      
      res.json({
        success: true,
        events: result.success ? result.events : [],
        count: result.success ? result.events.length : 0
      });
      
    } catch (error) {
      console.error('Failed to get calendar events:', error);
      res.status(500).json({
        success: false,
        error: error.message
      });
    }
  });

  // Create calendar event endpoint
  app.post('/api/ai/calendar/create', async (req, res) => {
    try {
      const { title, date, time, attendees, description } = req.body;
      
      const result = await executeCalendarAction('create_event', {
        title,
        date,
        time,
        attendees,
        description
      });
      
      res.json(result);
      
    } catch (error) {
      console.error('Failed to create calendar event:', error);
      res.status(500).json({
        success: false,
        error: error.message
      });
    }
  });

  console.log('🤖 AI routes loaded with calendar action execution');
};