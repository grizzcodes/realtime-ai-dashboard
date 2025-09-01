// backend/src/services/googleAuthManager.js
// Centralized Google Auth Manager with automatic token refresh and persistence

const { google } = require('googleapis');
const fs = require('fs').promises;
const path = require('path');

class GoogleAuthManager {
  constructor() {
    this.oauth2Client = null;
    this.tokenPath = path.join(__dirname, '../../.google-tokens.json');
    this.isRefreshing = false;
    this.refreshPromise = null;
    this.lastRefreshAttempt = null;
    this.init();
  }

  async init() {
    // Create OAuth2 client
    this.oauth2Client = new google.auth.OAuth2(
      process.env.GOOGLE_CLIENT_ID,
      process.env.GOOGLE_CLIENT_SECRET,
      'http://localhost:3001/auth/google/callback'
    );

    // Load saved tokens if they exist
    await this.loadSavedTokens();

    // Set up automatic token refresh
    this.setupAutoRefresh();
  }

  async loadSavedTokens() {
    try {
      const tokenData = await fs.readFile(this.tokenPath, 'utf8');
      const tokens = JSON.parse(tokenData);
      
      if (tokens.refresh_token) {
        this.oauth2Client.setCredentials(tokens);
        console.log('✅ Loaded saved Google tokens');
        
        // Immediately try to refresh to ensure they're valid
        await this.refreshAccessToken();
      }
    } catch (error) {
      console.log('📝 No saved tokens found, need to authenticate');
    }
  }

  async saveTokens(tokens) {
    try {
      // Always save the refresh token if we have it
      const existingTokens = await this.loadTokensFromFile();
      const tokensToSave = {
        ...existingTokens,
        ...tokens,
        // Preserve refresh token if not in new tokens
        refresh_token: tokens.refresh_token || existingTokens?.refresh_token,
        saved_at: new Date().toISOString()
      };

      await fs.writeFile(this.tokenPath, JSON.stringify(tokensToSave, null, 2));
      console.log('💾 Saved Google tokens to file');
      
      // Also update environment variable
      if (tokensToSave.refresh_token) {
        process.env.GOOGLE_REFRESH_TOKEN = tokensToSave.refresh_token;
      }
      if (tokensToSave.access_token) {
        process.env.GOOGLE_ACCESS_TOKEN = tokensToSave.access_token;
      }
    } catch (error) {
      console.error('Failed to save tokens:', error);
    }
  }

  async loadTokensFromFile() {
    try {
      const tokenData = await fs.readFile(this.tokenPath, 'utf8');
      return JSON.parse(tokenData);
    } catch (error) {
      return null;
    }
  }

  async refreshAccessToken() {
    // Prevent multiple simultaneous refresh attempts
    if (this.isRefreshing) {
      return this.refreshPromise;
    }

    // Rate limit refresh attempts (max once per 30 seconds)
    if (this.lastRefreshAttempt && Date.now() - this.lastRefreshAttempt < 30000) {
      console.log('⏳ Skipping refresh - too soon since last attempt');
      return this.oauth2Client.credentials;
    }

    this.isRefreshing = true;
    this.lastRefreshAttempt = Date.now();

    this.refreshPromise = (async () => {
      try {
        console.log('🔄 Refreshing Google access token...');
        
        // Get current credentials
        const currentTokens = this.oauth2Client.credentials;
        
        // If we don't have a refresh token, try to load from file
        if (!currentTokens.refresh_token) {
          const savedTokens = await this.loadTokensFromFile();
          if (savedTokens?.refresh_token) {
            this.oauth2Client.setCredentials({
              refresh_token: savedTokens.refresh_token
            });
          } else {
            throw new Error('No refresh token available');
          }
        }

        // Attempt to refresh
        const { credentials } = await this.oauth2Client.refreshAccessToken();
        
        // Set the new credentials
        this.oauth2Client.setCredentials(credentials);
        
        // Save the new tokens
        await this.saveTokens(credentials);
        
        console.log('✅ Access token refreshed successfully');
        console.log(`   Expires at: ${new Date(credentials.expiry_date).toISOString()}`);
        
        return credentials;
      } catch (error) {
        console.error('❌ Failed to refresh access token:', error.message);
        
        // If refresh fails, try to use saved tokens one more time
        if (error.message.includes('invalid_grant')) {
          console.log('🔄 Refresh token invalid, trying backup...');
          
          // Check if we have a backup refresh token in env
          if (process.env.GOOGLE_REFRESH_TOKEN_BACKUP) {
            this.oauth2Client.setCredentials({
              refresh_token: process.env.GOOGLE_REFRESH_TOKEN_BACKUP
            });
            
            try {
              const { credentials } = await this.oauth2Client.refreshAccessToken();
              this.oauth2Client.setCredentials(credentials);
              await this.saveTokens(credentials);
              console.log('✅ Backup refresh token worked!');
              return credentials;
            } catch (backupError) {
              console.error('❌ Backup token also failed');
            }
          }
          
          // All refresh attempts failed
          throw new Error('Authentication required - please visit /auth/google');
        }
        
        throw error;
      } finally {
        this.isRefreshing = false;
        this.refreshPromise = null;
      }
    })();

    return this.refreshPromise;
  }

  setupAutoRefresh() {
    // Check token expiry every 5 minutes
    setInterval(async () => {
      try {
        const credentials = this.oauth2Client.credentials;
        
        if (!credentials.access_token) {
          console.log('📝 No access token, attempting refresh...');
          await this.refreshAccessToken();
          return;
        }

        // Check if token will expire in next 10 minutes
        const expiryDate = credentials.expiry_date;
        const now = Date.now();
        const tenMinutes = 10 * 60 * 1000;

        if (expiryDate && expiryDate - now < tenMinutes) {
          console.log('⏰ Token expiring soon, refreshing proactively...');
          await this.refreshAccessToken();
        }
      } catch (error) {
        console.error('Auto-refresh check failed:', error.message);
      }
    }, 5 * 60 * 1000); // Every 5 minutes
  }

  async getAuthClient() {
    try {
      // Ensure we have valid credentials
      const credentials = this.oauth2Client.credentials;
      
      // Check if we need to refresh
      if (!credentials.access_token || 
          (credentials.expiry_date && Date.now() >= credentials.expiry_date - 60000)) {
        await this.refreshAccessToken();
      }
      
      return this.oauth2Client;
    } catch (error) {
      console.error('Failed to get auth client:', error);
      
      // Return the client anyway, but it might not be authenticated
      return this.oauth2Client;
    }
  }

  async setTokens(tokens) {
    this.oauth2Client.setCredentials(tokens);
    await this.saveTokens(tokens);
    
    // Update global references
    if (global.integrationService) {
      global.integrationService.googleAuth = this.oauth2Client;
    }
    global.fixedOAuthClient = this.oauth2Client;
  }

  async testConnection() {
    try {
      const auth = await this.getAuthClient();
      const oauth2 = google.oauth2({ version: 'v2', auth });
      const { data } = await oauth2.userinfo.get();
      
      return {
        success: true,
        email: data.email,
        name: data.name
      };
    } catch (error) {
      return {
        success: false,
        error: error.message
      };
    }
  }

  isAuthenticated() {
    const credentials = this.oauth2Client.credentials;
    return !!(credentials.refresh_token || credentials.access_token);
  }

  async clearTokens() {
    try {
      await fs.unlink(this.tokenPath);
      console.log('🗑️ Cleared saved tokens');
    } catch (error) {
      // File might not exist
    }
    
    this.oauth2Client.setCredentials({});
    delete process.env.GOOGLE_REFRESH_TOKEN;
    delete process.env.GOOGLE_ACCESS_TOKEN;
  }
}

// Singleton instance
let authManager = null;

function getAuthManager() {
  if (!authManager) {
    authManager = new GoogleAuthManager();
  }
  return authManager;
}

module.exports = { getAuthManager, GoogleAuthManager };