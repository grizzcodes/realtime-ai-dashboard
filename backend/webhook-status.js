// backend/webhook-status.js - Webhook status endpoint

// Webhook status endpoint
app.get('/api/webhook/status', (req, res) => {
  const ngrokUrl = process.env.NGROK_URL || null;
  const baseUrl = `http://localhost:${process.env.PORT || 3001}`;
  
  res.json({
    success: true,
    ngrokUrl: ngrokUrl,
    webhookUrl: ngrokUrl ? `${ngrokUrl}/api/webhook/fireflies` : `${baseUrl}/api/webhook/fireflies`,
    localUrl: `${baseUrl}/api/webhook/fireflies`,
    instructions: ngrokUrl 
      ? 'Use the webhookUrl in your Fireflies.ai webhook settings'
      : 'To expose webhook publicly: 1. Install ngrok, 2. Run: ngrok http 3001, 3. Add NGROK_URL to .env',
    configured: !!ngrokUrl
  });
});

console.log('📊 Webhook status endpoint ready at /api/webhook/status');
