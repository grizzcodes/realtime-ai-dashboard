// backend/src/auth/googleOAuth.js
class GoogleOAuth {
  constructor() {
    this.clientId = process.env.GOOGLE_CLIENT_ID;
    this.clientSecret = process.env.GOOGLE_CLIENT_SECRET;
    this.redirectUri = 'http://localhost:3001/auth/google/callback';
  }

  getAuthUrl() {
    const scopes = [
      // Existing scopes
      'https://www.googleapis.com/auth/gmail.readonly',
      'https://www.googleapis.com/auth/calendar',
      'https://www.googleapis.com/auth/userinfo.email',
      
      // NEW: Google Drive scopes for full access
      'https://www.googleapis.com/auth/drive', // Full Drive access
      'https://www.googleapis.com/auth/drive.file', // Files created/opened by app
      'https://www.googleapis.com/auth/drive.readonly', // Read-only access to all files
      'https://www.googleapis.com/auth/drive.metadata.readonly', // Read-only metadata
      'https://www.googleapis.com/auth/drive.appdata', // App configuration data
      'https://www.googleapis.com/auth/drive.photos.readonly' // Photos access
    ];

    const params = new URLSearchParams({
      client_id: this.clientId,
      redirect_uri: this.redirectUri,
      response_type: 'code',
      scope: scopes.join(' '),
      access_type: 'offline',
      prompt: 'consent'
    });

    return `https://accounts.google.com/o/oauth2/v2/auth?${params.toString()}`;
  }

  async exchangeCodeForTokens(code) {
    const response = await fetch('https://oauth2.googleapis.com/token', {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body: new URLSearchParams({
        client_id: this.clientId,
        client_secret: this.clientSecret,
        code,
        grant_type: 'authorization_code',
        redirect_uri: this.redirectUri
      })
    });

    return await response.json();
  }
}

module.exports = GoogleOAuth;