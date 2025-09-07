// backend/src/routes/gmailEnhancedRoutes.js
const OpenAI = require('openai');

module.exports = function(app, gmailService) {
  // Initialize OpenAI if available
  let openai = null;
  if (process.env.OPENAI_API_KEY) {
    openai = new OpenAI({
      apiKey: process.env.OPENAI_API_KEY
    });
  }

  // Smart auto-reply generation endpoint
  app.post('/api/gmail/smart-reply', async (req, res) => {
    try {
      const { emailId, subject, from, snippet, threadId, body } = req.body;
      
      console.log(`🤖 Generating smart reply for email: ${emailId}`);
      
      // Get thread context if available
      let threadContext = '';
      if (threadId && gmailService) {
        try {
          const thread = await gmailService.getEmailThread?.(threadId);
          if (thread?.success && thread.messages) {
            threadContext = thread.messages.map(msg => 
              `From: ${msg.from}\nDate: ${msg.date}\n${msg.snippet}\n---`
            ).join('\n');
          }
        } catch (err) {
          console.error('Failed to get thread context:', err);
        }
      }

      // Generate smart reply using AI
      let replyDraft = '';
      
      if (openai) {
        try {
          const prompt = `Generate a professional email reply based on:
          
Email Thread History:
${threadContext || 'No previous thread'}

Current Email:
From: ${from}
Subject: ${subject}
Content: ${body || snippet}

Instructions:
- Be professional and friendly
- Address the sender's specific points
- Keep it concise but thorough
- Use appropriate greeting and closing
- Match the tone of the original email

Generate only the reply body text:`;

          const completion = await openai.chat.completions.create({
            model: "gpt-3.5-turbo",
            messages: [
              {
                role: "system",
                content: "You are a professional email assistant. Generate contextual, helpful email replies."
              },
              {
                role: "user",
                content: prompt
              }
            ],
            temperature: 0.7,
            max_tokens: 500
          });

          replyDraft = completion.choices[0].message.content;
        } catch (aiError) {
          console.error('OpenAI generation failed:', aiError);
          replyDraft = generateTemplateReply(subject, from, snippet);
        }
      } else {
        // Use template-based reply if no AI available
        replyDraft = generateTemplateReply(subject, from, snippet);
      }

      res.json({
        success: true,
        emailId,
        draft: replyDraft,
        subject: subject.startsWith('Re:') ? subject : `Re: ${subject}`,
        to: from,
        threadId
      });

    } catch (error) {
      console.error('Failed to generate smart reply:', error);
      res.status(500).json({
        success: false,
        error: error.message,
        draft: generateTemplateReply(req.body.subject, req.body.from, req.body.snippet)
      });
    }
  });

  // Delete/trash email endpoint
  app.delete('/api/gmail/trash/:emailId', async (req, res) => {
    try {
      const { emailId } = req.params;
      
      console.log(`🗑️ Moving email to trash: ${emailId}`);
      
      if (!gmailService) {
        return res.status(400).json({
          success: false,
          error: 'Gmail not configured'
        });
      }

      const result = await gmailService.trashEmail(emailId);
      
      if (result.success) {
        // Emit socket event for real-time updates
        if (global.io) {
          global.io.emit('emailDeleted', {
            emailId,
            timestamp: new Date().toISOString()
          });
        }
      }
      
      res.json(result);
      
    } catch (error) {
      console.error('Failed to trash email:', error);
      res.status(500).json({
        success: false,
        error: error.message
      });
    }
  });

  // Send reply endpoint with thread support
  app.post('/api/gmail/send-reply', async (req, res) => {
    try {
      const { to, subject, body, threadId, inReplyTo, references } = req.body;
      
      console.log(`📤 Sending reply in thread: ${threadId}`);
      
      if (!gmailService) {
        return res.status(400).json({
          success: false,
          error: 'Gmail not configured'
        });
      }

      // Send email with threading headers
      const result = await gmailService.sendReply({
        to,
        subject,
        body,
        threadId,
        inReplyTo,
        references
      });
      
      if (result.success && global.io) {
        global.io.emit('emailSent', {
          messageId: result.messageId,
          threadId,
          timestamp: new Date().toISOString()
        });
      }
      
      res.json(result);
      
    } catch (error) {
      console.error('Failed to send reply:', error);
      res.status(500).json({
        success: false,
        error: error.message
      });
    }
  });

  // Get full email details with thread
  app.get('/api/gmail/email/:emailId', async (req, res) => {
    try {
      const { emailId } = req.params;
      const { includeThread } = req.query;
      
      console.log(`📧 Fetching full email details: ${emailId}`);
      
      if (!gmailService) {
        return res.status(400).json({
          success: false,
          error: 'Gmail not configured'
        });
      }

      const emailDetails = await gmailService.getFullEmail(emailId);
      
      if (includeThread === 'true' && emailDetails.email?.threadId) {
        const thread = await gmailService.getEmailThread?.(emailDetails.email.threadId);
        emailDetails.email.thread = thread?.messages || [];
      }
      
      res.json(emailDetails);
      
    } catch (error) {
      console.error('Failed to get email details:', error);
      res.status(500).json({
        success: false,
        error: error.message
      });
    }
  });

  console.log('✨ Enhanced Gmail routes loaded - smart reply, delete, thread support');
};

// Template-based reply generation
function generateTemplateReply(subject, from, snippet) {
  const lowerSnippet = (snippet || '').toLowerCase();
  const lowerSubject = (subject || '').toLowerCase();
  
  // Meeting request template
  if (lowerSubject.includes('meeting') || lowerSnippet.includes('meet') || lowerSnippet.includes('schedule')) {
    return `Hi there,

Thank you for reaching out about scheduling a meeting.

I'd be happy to discuss this further. My availability this week is:
- Tuesday: 2:00 PM - 4:00 PM
- Wednesday: 10:00 AM - 12:00 PM  
- Thursday: 3:00 PM - 5:00 PM

Please let me know which time works best for you, or feel free to suggest an alternative.

Looking forward to our discussion.

Best regards`;
  }
  
  // Proposal/document template
  if (lowerSubject.includes('proposal') || lowerSnippet.includes('document') || lowerSnippet.includes('review')) {
    return `Hi,

Thank you for sharing this with me.

I've received your message and will review the materials you've sent. I should be able to provide detailed feedback within the next 1-2 business days.

If there are any specific areas you'd like me to focus on, please let me know.

Best regards`;
  }
  
  // Question/inquiry template
  if (lowerSnippet.includes('?') || lowerSubject.includes('question') || lowerSubject.includes('inquiry')) {
    return `Hi,

Thank you for your inquiry.

I appreciate you reaching out with your question. Let me look into this and get back to you with a comprehensive response shortly.

If you need any immediate assistance or have additional questions, please don't hesitate to let me know.

Best regards`;
  }
  
  // Urgent template
  if (lowerSubject.includes('urgent') || lowerSubject.includes('asap') || lowerSubject.includes('immediate')) {
    return `Hi,

Thank you for flagging this as urgent.

I understand the time-sensitive nature of your request and will prioritize this accordingly. I'm looking into this immediately and will get back to you as soon as possible.

If there's anything specific you need in the meantime, please let me know.

Best regards`;
  }
  
  // Default professional template
  return `Hi,

Thank you for your email.

I've received your message and will review it carefully. I'll get back to you as soon as possible with a thoughtful response.

Please let me know if there's anything urgent that requires immediate attention.

Best regards`;
}
