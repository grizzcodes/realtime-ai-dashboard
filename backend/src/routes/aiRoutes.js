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

  // Known contacts mapping (you should move this to a database)
  const KNOWN_CONTACTS = {
    'leo': 'leo@dgenz.world', // Update with Leo's actual email
    'andy': 'andy@dgenz.world',
    'alec': 'alec@dgenz.world'
  };

  // Helper to execute calendar actions
  async function executeCalendarAction(action, params) {
    console.log('📅 Executing calendar action:', action, params);
    
    try {
      // Use the fixed calendar service if available
      const calendarService = global.calendarServiceFixed || integrationService.calendarService;
      
      if (!calendarService) {
        console.error('❌ No calendar service available');
        return {
          success: false,
          error: 'Calendar service not initialized'
        };
      }
      
      switch(action) {
        case 'create_event':
          // Parse the event details
          const { title, date, time, attendees, description, timezone } = params;
          
          // Convert natural language date/time to proper format with timezone
          const eventDate = parseEventDateTime(date, time, timezone);
          
          console.log('📅 Creating event with details:', {
            title: title || 'Meeting',
            start: eventDate.start,
            end: eventDate.end,
            timezone: eventDate.timezone,
            attendees
          });
          
          // Create the calendar event
          const result = await calendarService.createEvent({
            summary: title || 'Meeting',
            description: description || '',
            start: {
              dateTime: eventDate.start,
              timeZone: eventDate.timezone
            },
            end: {
              dateTime: eventDate.end,
              timeZone: eventDate.timezone
            },
            attendees: attendees && attendees.length > 0 ? 
              attendees.map(email => ({ email })) : [],
            reminders: {
              useDefault: false,
              overrides: [
                { method: 'email', minutes: 30 },
                { method: 'popup', minutes: 10 }
              ]
            }
          });
          
          console.log('✅ Calendar event created:', result);
          
          return {
            success: true,
            message: `Calendar event "${title || 'Meeting'}" created successfully`,
            eventId: result.data?.id,
            htmlLink: result.data?.htmlLink
          };
          
        case 'list_events':
          const events = await calendarService.getUpcomingEvents(params.days || 7);
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
      console.error('❌ Calendar action failed:', error);
      return {
        success: false,
        error: error.message
      };
    }
  }

  // Helper to parse natural language dates with proper timezone handling
  function parseEventDateTime(dateStr, timeStr, timezone = 'America/New_York') {
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
    
    // Parse time - FIXED to handle EST/EDT properly
    if (timeStr) {
      // Enhanced regex to catch more time formats
      const timeMatch = timeStr.match(/(\d{1,2}):?(\d{2})?\s*(am|pm|AM|PM)?/i);
      if (timeMatch) {
        let hours = parseInt(timeMatch[1]);
        const minutes = parseInt(timeMatch[2] || '0');
        const meridiem = timeMatch[3];
        
        // Handle 12-hour format
        if (meridiem?.toLowerCase() === 'pm' && hours !== 12) {
          hours += 12;
        } else if (meridiem?.toLowerCase() === 'am' && hours === 12) {
          hours = 0;
        }
        
        // Set the time
        eventDate.setHours(hours, minutes, 0, 0);
      }
    }
    
    // Create end time (1 hour later by default)
    const endDate = new Date(eventDate);
    endDate.setHours(endDate.getHours() + 1);
    
    // Determine actual timezone
    let actualTimezone = timezone;
    if (timeStr?.toLowerCase().includes('est') || timeStr?.toLowerCase().includes('et')) {
      actualTimezone = 'America/New_York';
    } else if (timeStr?.toLowerCase().includes('pst') || timeStr?.toLowerCase().includes('pt')) {
      actualTimezone = 'America/Los_Angeles';
    } else if (timeStr?.toLowerCase().includes('cst') || timeStr?.toLowerCase().includes('ct')) {
      actualTimezone = 'America/Chicago';
    }
    
    return {
      start: eventDate.toISOString(),
      end: endDate.toISOString(),
      timezone: actualTimezone
    };
  }

  // Helper to detect and extract action intents - ENHANCED
  function detectActionIntent(message) {
    const lowerMessage = message.toLowerCase();
    
    // ENHANCED: Calendar actions - more trigger words
    if (lowerMessage.includes('calendar') || 
        lowerMessage.includes('meeting') || 
        lowerMessage.includes('schedule') || 
        lowerMessage.includes('invite') ||
        lowerMessage.includes('call') ||
        lowerMessage.includes('setup') ||
        lowerMessage.includes('create') ||
        lowerMessage.includes('book') ||
        lowerMessage.includes('appointment')) {
      
      // Extract email addresses
      const emailRegex = /[\w.-]+@[\w.-]+\.\w+/g;
      let emails = message.match(emailRegex) || [];
      
      // Extract names and map to emails
      const attendeeNames = [];
      for (const [name, email] of Object.entries(KNOWN_CONTACTS)) {
        if (lowerMessage.includes(name)) {
          attendeeNames.push(email);
          console.log(`📋 Found attendee: ${name} -> ${email}`);
        }
      }
      
      // Combine found emails with mapped names
      emails = [...new Set([...emails, ...attendeeNames])];
      
      // Enhanced time extraction - handle "12pm est" format
      const timeRegex = /(\d{1,2}):?(\d{2})?\s*(am|pm|AM|PM)\s*(est|edt|pst|pdt|cst|cdt|et|pt|ct)?/gi;
      const timeMatches = message.match(timeRegex);
      const time = timeMatches ? timeMatches[0] : null;
      
      // Extract timezone
      let timezone = 'America/New_York'; // Default to EST
      if (lowerMessage.includes('pst') || lowerMessage.includes('pt') || lowerMessage.includes('pacific')) {
        timezone = 'America/Los_Angeles';
      } else if (lowerMessage.includes('cst') || lowerMessage.includes('ct') || lowerMessage.includes('central')) {
        timezone = 'America/Chicago';
      }
      
      // Extract date keywords
      const tomorrow = lowerMessage.includes('tomorrow');
      const today = lowerMessage.includes('today');
      const nextWeek = lowerMessage.includes('next week');
      
      // Extract title - enhanced to handle various patterns
      let title = extractTitle(message);
      
      console.log('🎯 Calendar intent detected:', {
        time,
        date: tomorrow ? 'tomorrow' : (today ? 'today' : null),
        title,
        attendees: emails,
        timezone
      });
      
      return {
        type: 'calendar',
        action: 'create_event',
        params: {
          attendees: emails,
          time: time,
          date: tomorrow ? 'tomorrow' : (today ? 'today' : nextWeek ? 'next week' : null),
          title: title,
          timezone: timezone
        }
      };
    }
    
    return null;
  }

  // Extract meeting title from message - ENHANCED
  function extractTitle(message) {
    // Try to extract text after "named" or "called" or "titled"
    const namedMatch = message.match(/(?:named|called|titled)\s+['"]?([^'"]+?)['"]?(?:\s+at|\s+on|\s+with|\s+for|$)/i);
    if (namedMatch) return namedMatch[1].trim();
    
    // Try to extract text between quotes
    const quotedMatch = message.match(/["']([^"']+)["']/);
    if (quotedMatch) return quotedMatch[1];
    
    // Try to extract after "about" or "for" or "regarding"
    const aboutMatch = message.match(/(?:about|for|regarding)\s+(.+?)(?:\s+(?:at|on|with|tomorrow|today)|$)/i);
    if (aboutMatch && !aboutMatch[1].includes('and')) {
      return aboutMatch[1].trim();
    }
    
    // If message contains specific project/topic keywords
    if (message.toLowerCase().includes('cgi')) {
      // Extract the full phrase containing CGI
      const cgiMatch = message.match(/\b(cgi[^,.\s]*(?:\s+[^,.\s]+)?)\b/i);
      if (cgiMatch) return cgiMatch[1].trim();
    }
    
    // Default title
    return 'Meeting';
  }

  // Main AI chat endpoint with action execution
  app.post('/api/ai/chat', async (req, res) => {
    try {
      const { message, model = 'gpt-4', sessionId } = req.body;
      
      console.log('🤖 AI chat request:', { 
        message,
        model,
        sessionId 
      });

      // Detect if this requires an action
      const actionIntent = detectActionIntent(message);
      
      // Build context including action capabilities
      let systemPrompt = `You are a helpful AI assistant for DGenz company. 
      You have access to the company calendar and can create events.
      When users ask to schedule meetings or create calendar events, acknowledge that you're creating the event.
      Always be specific about what actions you're taking.
      
      Known team members:
      - Leo (leo@dgenz.world)
      - Andy (andy@dgenz.world)
      - Alec (alec@dgenz.world)
      
      When someone mentions a team member by name, use their email for calendar invites.`;
      
      // Get AI response
      let aiResponse = '';
      let actionResult = null;
      
      // Execute the action FIRST if detected
      if (actionIntent) {
        console.log('🎯 Action detected:', actionIntent);
        
        if (actionIntent.type === 'calendar') {
          actionResult = await executeCalendarAction(actionIntent.action, actionIntent.params);
          console.log('📅 Action result:', actionResult);
        }
      }
      
      // Now get AI response with context about what was done
      const actionContext = actionResult?.success ? 
        `\n[System: Calendar event "${actionIntent?.params?.title}" was successfully created with attendees: ${actionIntent?.params?.attendees?.join(', ') || 'none'}]` : 
        actionResult?.error ? 
        `\n[System: Failed to create calendar event: ${actionResult.error}]` : '';
      
      if (model === 'claude') {
        const response = await anthropic.messages.create({
          model: 'claude-3-sonnet-20241022',
          max_tokens: 1000,
          system: systemPrompt + actionContext,
          messages: [{ role: 'user', content: message }]
        });
        aiResponse = response.content[0].text;
      } else {
        const completion = await openai.chat.completions.create({
          model: model === 'gpt-4' ? 'gpt-4' : 'gpt-3.5-turbo',
          messages: [
            { role: 'system', content: systemPrompt + actionContext },
            { role: 'user', content: message }
          ],
          temperature: 0.7,
          max_tokens: 1000
        });
        aiResponse = completion.choices[0].message.content;
      }
      
      // Append action result to response
      if (actionResult?.success) {
        aiResponse += `\n\n✅ **Event created successfully!**`;
        if (actionResult.htmlLink) {
          aiResponse += `\n📅 [View in Google Calendar](${actionResult.htmlLink})`;
        }
      } else if (actionResult?.error) {
        aiResponse += `\n\n⚠️ I tried to create the calendar event but encountered an error: ${actionResult.error}`;
        aiResponse += `\n\nPlease make sure calendar permissions are properly configured.`;
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
      
      const calendarService = global.calendarServiceFixed || integrationService.calendarService;
      const result = await calendarService.getUpcomingEvents(parseInt(days));
      
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

  console.log('🤖 AI routes loaded with ENHANCED calendar action execution');
  console.log('   - Detects: call, setup, meeting, schedule, book, appointment');
  console.log('   - Maps names to emails: Leo, Andy, Alec');
  console.log('   - Handles timezones: EST, PST, CST');
  console.log('   - Better title extraction for "named/called/titled" patterns');
};