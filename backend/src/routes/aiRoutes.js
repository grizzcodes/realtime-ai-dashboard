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

  // Helper to lookup contacts from Supabase with priority
  async function lookupContactEmail(name) {
    if (!supabaseClient) {
      console.log('⚠️ Supabase not configured, cannot lookup contacts');
      return null;
    }

    const searchName = name.toLowerCase().trim();
    console.log(`🔍 Looking up contact: "${searchName}"`);

    try {
      // Priority 1: Check People table (team members)
      const { data: people, error: peopleError } = await supabaseClient
        .from('people')
        .select('name, email')
        .or(`name.ilike.%${searchName}%,email.ilike.%${searchName}%`)
        .limit(1);

      if (!peopleError && people && people.length > 0) {
        console.log(`✅ Found in People: ${people[0].name} -> ${people[0].email}`);
        return {
          email: people[0].email,
          name: people[0].name,
          type: 'team'
        };
      }

      // Priority 2: Check Clients table
      const { data: clients, error: clientsError } = await supabaseClient
        .from('clients')
        .select('name, email, company')
        .or(`name.ilike.%${searchName}%,email.ilike.%${searchName}%,company.ilike.%${searchName}%`)
        .limit(1);

      if (!clientsError && clients && clients.length > 0) {
        console.log(`✅ Found in Clients: ${clients[0].name} -> ${clients[0].email}`);
        return {
          email: clients[0].email,
          name: clients[0].name,
          company: clients[0].company,
          type: 'client'
        };
      }

      // Priority 3: Check Leads table
      const { data: leads, error: leadsError } = await supabaseClient
        .from('leads')
        .select('name, email, company')
        .or(`name.ilike.%${searchName}%,email.ilike.%${searchName}%,company.ilike.%${searchName}%`)
        .limit(1);

      if (!leadsError && leads && leads.length > 0) {
        console.log(`✅ Found in Leads: ${leads[0].name} -> ${leads[0].email}`);
        return {
          email: leads[0].email,
          name: leads[0].name,
          company: leads[0].company,
          type: 'lead'
        };
      }

      console.log(`❌ Contact "${searchName}" not found in database`);
      return null;

    } catch (error) {
      console.error('Error looking up contact:', error);
      return null;
    }
  }

  // Helper to extract and resolve all attendees from message
  async function resolveAttendees(message) {
    const attendees = [];
    const emailRegex = /[\w.-]+@[\w.-]+\.\w+/g;
    
    // First, collect any explicit email addresses
    const explicitEmails = message.match(emailRegex) || [];
    explicitEmails.forEach(email => {
      attendees.push({ email, type: 'explicit' });
    });

    // Common name patterns to look for
    const namePatterns = [
      /(?:with|invite|include|add)\s+([A-Z][a-z]+(?:\s+[A-Z][a-z]+)?)/g,
      /([A-Z][a-z]+)\s+and\s+(?:I|me)/gi,
      /(?:I|me)\s+and\s+([A-Z][a-z]+)/gi,
      /for\s+([A-Z][a-z]+(?:\s+[A-Z][a-z]+)?)\s+and/gi
    ];

    const foundNames = new Set();
    
    // Extract names from message
    for (const pattern of namePatterns) {
      const matches = [...message.matchAll(pattern)];
      for (const match of matches) {
        if (match[1] && !match[1].toLowerCase().includes('meeting')) {
          foundNames.add(match[1].trim());
        }
      }
    }

    // Also check for standalone capitalized names
    const words = message.split(/\s+/);
    for (const word of words) {
      // Check if it's a capitalized word (likely a name)
      if (/^[A-Z][a-z]+$/.test(word) && word.length > 2) {
        // Skip common words
        const skipWords = ['Meeting', 'Call', 'Event', 'Calendar', 'Schedule', 'Tomorrow', 'Today'];
        if (!skipWords.includes(word)) {
          foundNames.add(word);
        }
      }
    }

    // Look up each name in the database
    for (const name of foundNames) {
      const contact = await lookupContactEmail(name);
      if (contact) {
        // Check if we already have this email
        const exists = attendees.some(a => a.email === contact.email);
        if (!exists) {
          attendees.push(contact);
          console.log(`📧 Added attendee: ${contact.name} (${contact.type}) - ${contact.email}`);
        }
      }
    }

    return attendees;
  }

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
            attendees: attendees.map(a => a.email || a)
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
              attendees.map(a => ({ email: a.email || a })) : [],
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
            htmlLink: result.data?.htmlLink,
            attendees: attendees
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
  async function detectActionIntent(message) {
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
      
      // Resolve attendees from database
      const attendees = await resolveAttendees(message);
      
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
      
      // Extract title
      let title = extractTitle(message);
      
      console.log('🎯 Calendar intent detected:', {
        time,
        date: tomorrow ? 'tomorrow' : (today ? 'today' : null),
        title,
        attendees: attendees.map(a => `${a.name || a.email} (${a.type})`),
        timezone
      });
      
      return {
        type: 'calendar',
        action: 'create_event',
        params: {
          attendees: attendees,
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
      const actionIntent = await detectActionIntent(message);
      
      // Build context including action capabilities
      let systemPrompt = `You are a helpful AI assistant for DGenz company. 
      You have access to the company calendar and can create events.
      You also have access to a database of People (team members), Clients, and Leads.
      When users ask to schedule meetings, you automatically look up attendees in the database.
      Always be specific about what actions you're taking.`;
      
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
      let actionContext = '';
      if (actionResult?.success) {
        const attendeeList = actionResult.attendees?.map(a => 
          `${a.name || a.email} (${a.type || 'email'})`
        ).join(', ') || 'none';
        actionContext = `\n[System: Calendar event "${actionIntent?.params?.title}" was successfully created with attendees: ${attendeeList}]`;
      } else if (actionResult?.error) {
        actionContext = `\n[System: Failed to create calendar event: ${actionResult.error}]`;
      }
      
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
        if (actionResult.attendees && actionResult.attendees.length > 0) {
          aiResponse += `\n👥 Attendees: ${actionResult.attendees.map(a => 
            `${a.name || a.email}`
          ).join(', ')}`;
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

  console.log('🤖 AI routes loaded with DATABASE-POWERED calendar integration');
  console.log('   - Looks up contacts in priority: People → Clients → Leads');
  console.log('   - Automatically resolves names to emails from Supabase');
  console.log('   - Handles timezones: EST, PST, CST');
  console.log('   - Smart title extraction');
};