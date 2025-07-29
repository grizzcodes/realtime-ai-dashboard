  async suggestEmailResponse(task, context) {
    try {
      if (!context.emailContent) return null;

      // Create a mock event for AI processing
      const mockEvent = {
        source: 'email_draft',
        type: 'draft_request',
        data: {
          message: `Draft a professional response to this email:
          
          Subject: ${context.emailContent.subject}
          From: ${context.emailContent.from}
          Content: ${context.emailContent.body}
          
          Task created: ${task.title}
          
          Please write a concise, professional response that:
          - Acknowledges receipt
          - Addresses the urgency
          - Provides next steps
          - Sets timeline expectations`
        },
        timestamp: new Date(),
        priority: 4
      };

      // Use the AI processor's existing processEvent method to generate draft
      const result = await this.services.aiProcessor.processEvent(mockEvent);
      
      return {
        type: 'email_draft',
        priority: 'high',
        description: 'Draft email response',
        action: 'draft_email',
        data: {
          to: context.emailContent.from,
          subject: `Re: ${context.emailContent.subject}`,
          body: result.analysis.summary || 'Thank you for your email. I will review this and get back to you shortly.',
          originalTaskId: task.id
        },
        autoExecute: false // Requires approval
      };
    } catch (error) {
      console.error('Email draft error:', error);
      
      // Fallback: create simple response template
      return {
        type: 'email_draft',
        priority: 'high',
        description: 'Draft email response (template)',
        action: 'draft_email',
        data: {
          to: context.emailContent?.from || 'client@example.com',
          subject: `Re: ${context.emailContent?.subject || 'Your Request'}`,
          body: `Thank you for your email regarding "${task.title}". I have created a high-priority task to address this and will provide an update by ${new Date(task.deadline).toDateString()}. Please let me know if you have any immediate questions.`,
          originalTaskId: task.id
        },
        autoExecute: false
      };
    }
  }