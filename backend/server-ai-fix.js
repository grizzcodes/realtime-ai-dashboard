// AI Response Handler
async function getAIResponse(message, provider) {
  const systemPrompt = `You are an AI assistant for the Realtime AI Dashboard. You can help users manage integrations, understand platform features, and provide real-time assistance. Be concise and helpful.`;
  
  if (provider === 'openai' && process.env.OPENAI_API_KEY) {
    try {
      const response = await fetch('https://api.openai.com/v1/chat/completions', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${process.env.OPENAI_API_KEY}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          model: 'gpt-4',
          messages: [
            { role: 'system', content: systemPrompt },
            { role: 'user', content: message }
          ],
          max_tokens: 500
        })
      });
      const data = await response.json();
      return data.choices?.[0]?.message?.content || 'OpenAI response error';
    } catch (error) {
      return `OpenAI error: ${error.message}`;
    }
  }
  
  if (provider === 'claude' && process.env.ANTHROPIC_API_KEY) {
    try {
      const response = await fetch('https://api.anthropic.com/v1/messages', {
        method: 'POST',
        headers: {
          'x-api-key': process.env.ANTHROPIC_API_KEY,
          'Content-Type': 'application/json',
          'anthropic-version': '2023-06-01'
        },
        body: JSON.stringify({
          model: 'claude-3-sonnet-20240229',
          max_tokens: 500,
          messages: [{ role: 'user', content: `${systemPrompt}\n\nUser: ${message}` }]
        })
      });
      const data = await response.json();
      return data.content?.[0]?.text || 'Claude response error';
    } catch (error) {
      return `Claude error: ${error.message}`;
    }
  }
  
  return "AI service not configured. Please add API keys to use the chatbot.";
}