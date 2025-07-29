// Google OAuth routes
app.get('/auth/google', (req, res) => {
  const scopes = [
    'https://www.googleapis.com/auth/gmail.readonly',
    'https://www.googleapis.com/auth/calendar',
    'https://www.googleapis.com/auth/userinfo.email'
  ];

  const authUrl = `https://accounts.google.com/o/oauth2/v2/auth?` +
    `client_id=${process.env.GOOGLE_CLIENT_ID}&` +
    `redirect_uri=${encodeURIComponent('http://localhost:3002/auth/google/callback')}&` +
    `response_type=code&` +
    `scope=${encodeURIComponent(scopes.join(' '))}&` +
    `access_type=offline&` +
    `prompt=consent`;

  res.redirect(authUrl);
});

app.get('/auth/google/callback', async (req, res) => {
  const { code } = req.query;
  
  if (!code) {
    return res.send('❌ Authorization failed - no code received');
  }

  try {
    const response = await fetch('https://oauth2.googleapis.com/token', {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body: new URLSearchParams({
        client_id: process.env.GOOGLE_CLIENT_ID,
        client_secret: process.env.GOOGLE_CLIENT_SECRET,
        code,
        grant_type: 'authorization_code',
        redirect_uri: 'http://localhost:3002/auth/google/callback'
      })
    });

    const tokens = await response.json();
    
    if (tokens.error) {
      return res.send(`❌ Token exchange failed: ${tokens.error_description}`);
    }

    res.send(`
      <h2>✅ Google OAuth Success!</h2>
      <p><strong>Refresh Token:</strong></p>
      <textarea style="width:100%;height:60px;">${tokens.refresh_token}</textarea>
      
      <h3>Next Steps:</h3>
      <ol>
        <li>Copy the refresh token above</li>
        <li>Add it to your <code>backend/.env</code> file:
          <pre>GOOGLE_REFRESH_TOKEN=${tokens.refresh_token}</pre>
        </li>
        <li>Restart your backend server</li>
        <li>Test Gmail connection in the dashboard</li>
      </ol>
      
      <a href="http://localhost:3000">← Back to Dashboard</a>
    `);

  } catch (error) {
    console.error('OAuth error:', error);
    res.send(`❌ OAuth failed: ${error.message}`);
  }
});