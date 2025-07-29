// AI Chat endpoint with context awareness
app.post('/api/ai-chat', async (req, res) => {
  try {
    const { message, model = 'openai', context = {} } = req.body;
    
    // Build context-aware prompt
    const contextPrompt = `
You are an intelligent assistant for the Ultimate AI Organizer. You have access to the user's current data:

CURRENT TASKS (${context.tasks?.length || 0} total):
${context.tasks?.slice(0, 10).map(t => `- ${t.title} (${t.source}, urgency: ${t.urgency}/5)`).join('\n') || 'No tasks'}

RECENT EVENTS (${context.events?.length || 0} total):
${context.events?.slice(0, 5).map(e => `- ${e.source}: ${e.type}`).join('\n') || 'No recent events'}

STATS:
- Pending tasks: ${context.tasks?.filter(t => t.status === 'pending').length || 0}
- Completed tasks: ${context.tasks?.filter(t => t.status === 'completed').length || 0}

Based on this context, answer the user's question: "${message}"

Be helpful, concise, and actionable. If the user asks about creating tasks, deadlines, or managing their work, use the context above to provide relevant insights.
    `;

    // Create test event for AI processing
    const chatEvent = {
      source: 'chat',
      type: 'user_query',
      data: { message: contextPrompt },
      timestamp: new Date(),
      priority: 2
    };

    console.log(`💬 Processing chat with ${model}: ${message.substring(0, 50)}...`);
    
    // Use existing AI processor
    const result = await aiProcessor.processEvent(chatEvent);
    
    // Extract response from AI analysis
    let response = result.analysis?.summary || "I'm here to help with your tasks and organization!";
    
    // If AI created action items, mention them
    if (result.analysis?.actionItems?.length > 0) {
      response += "\n\nI can help you with:\n" + 
        result.analysis.actionItems.slice(0, 3).map(item => `• ${item}`).join('\n');
    }

    res.json({
      success: true,
      response,
      model,
      timestamp: new Date(),
      contextUsed: {
        tasksCount: context.tasks?.length || 0,
        eventsCount: context.events?.length || 0
      }
    });

  } catch (error) {
    console.error('AI chat error:', error);
    res.status(500).json({
      success: false,
      error: error.message,
      response: "I'm experiencing some difficulties right now. Please try again in a moment."
    });
  }
});

// Enhanced health endpoint with API status
app.get('/health', async (req, res) => {
  const stats = await aiProcessor.getStats();
  const aiContext = contextManager.getAIContext();
  
  // Test all API connections
  const apiConnections = {
    notion: await notionService.testConnection(),
    gmail: await gmailService.testConnection(),
    slack: await slackService.testConnection(),
    fireflies: await firefliesService.testConnection()
  };

  res.json({ 
    status: 'healthy', 
    timestamp: new Date().toISOString(),
    message: 'AI-powered analysis active!',
    stats,
    aiContext,
    apiConnections
  });
});