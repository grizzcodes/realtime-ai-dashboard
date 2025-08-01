// Add the missing AI chat endpoint

app.post('/api/ai-chat', async (req, res) => {
  try {
    console.log('💬 AI Chat request received...');
    const { message, model, isAdmin, conversationHistory } = req.body;
    
    let aiResponse = null;
    let aiService = 'none';
    
    // Use the specified model or fallback
    if (model === 'claude' && process.env.ANTHROPIC_API_KEY) {
      try {
        const claudeResult = await claudeService.processMessage(message, conversationHistory);
        if (claudeResult.success) {
          aiResponse = claudeResult;
          aiService = 'claude';
        }
      } catch (error) {
        console.log('⚠️ Claude failed, trying OpenAI:', error.message);
      }
    }
    
    // Try OpenAI if Claude failed or was not requested
    if (!aiResponse && process.env.OPENAI_API_KEY) {
      try {
        const openAIResult = await openAIService.processMessage(message, conversationHistory);
        if (openAIResult.success) {
          aiResponse = openAIResult;
          aiService = 'openai';
        }
      } catch (error) {
        console.log('⚠️ OpenAI failed:', error.message);
      }
    }
    
    if (aiResponse) {
      // Emit real-time chat update
      io.emit('aiChatUpdate', {
        type: 'ai_chat_response',
        service: aiService,
        message: aiResponse.content || aiResponse.response,
        timestamp: new Date().toISOString()
      });
      
      res.json({
        success: true,
        response: aiResponse.content || aiResponse.response || 'AI response received',
        service: aiService,
        actions: aiResponse.actions || []
      });
    } else {
      res.status(400).json({
        success: false,
        error: 'No AI service available. Please configure OPENAI_API_KEY or ANTHROPIC_API_KEY'
      });
    }
  } catch (error) {
    console.error('❌ AI chat failed:', error);
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});