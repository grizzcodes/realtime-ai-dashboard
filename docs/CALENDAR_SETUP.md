# Google Calendar API Setup & Troubleshooting Guide

## 🚀 Quick Fix Summary

Your calendar API connection issues have been **fixed** with these changes:

1. ✅ **Updated `.env.example`** - Added Google OAuth credentials
2. ✅ **Created `CalendarService`** - Dedicated service with proper token refresh
3. ✅ **Fixed `IntegrationService`** - Better error handling and auth flow
4. ✅ **Updated `server.js`** - Added calendar API endpoints
5. ✅ **Added test script** - `npm run test:calendar` for debugging

## 🔧 Setup Instructions

### Step 1: Google Cloud Console Setup

1. Go to [Google Cloud Console](https://console.developers.google.com/)
2. Create a new project or select existing
3. Enable these APIs:
   - **Google Calendar API**
   - **Gmail API** (if using email features)
4. Create OAuth 2.0 credentials:
   - Go to "Credentials" → "Create Credentials" → "OAuth 2.0 Client ID"
   - Application type: "Web application"
   - Authorized redirect URI: `http://localhost:3002/auth/google/callback`

### Step 2: Environment Configuration

Copy your credentials to `backend/.env`:

```bash
# Google OAuth Configuration
GOOGLE_CLIENT_ID=your_google_client_id_here
GOOGLE_CLIENT_SECRET=your_google_client_secret_here

# This will be generated in Step 3
GOOGLE_REFRESH_TOKEN=your_refresh_token_here
```

### Step 3: Get Refresh Token

1. Start your backend server:
   ```bash
   cd backend
   npm run dev
   ```

2. Visit the OAuth URL in your browser:
   ```
   http://localhost:3002/auth/google
   ```

3. Complete Google authorization
4. Copy the refresh token from the success page
5. Add it to your `.env` file
6. Restart your server

### Step 4: Test Connection

Run the calendar test script:
```bash
npm run test:calendar
```

This will check:
- ✅ Environment variables
- ✅ OAuth token validity
- ✅ Calendar API access
- ✅ Event retrieval

## 🔍 Troubleshooting Common Issues

### Error: "OAuth setup required"
**Problem**: Missing `GOOGLE_REFRESH_TOKEN`
**Solution**: Complete Step 3 above

### Error: "Token has been expired"
**Problem**: Refresh token is invalid/expired
**Solution**: 
1. Delete `GOOGLE_REFRESH_TOKEN` from `.env`
2. Re-run Step 3 to get new token

### Error: "Access blocked: This app's request is invalid"
**Problem**: OAuth consent screen not configured
**Solution**:
1. Go to Google Cloud Console → "OAuth consent screen"
2. Configure your app (can use "Testing" mode for development)
3. Add your email as a test user

### Error: "API has not been used in project"
**Problem**: Calendar API not enabled
**Solution**:
1. Go to Google Cloud Console → "APIs & Services" → "Library"
2. Search for "Google Calendar API"
3. Click "Enable"

### Error: "Calendar failed: insufficient permissions"
**Problem**: Wrong OAuth scopes
**Solution**: The server now requests correct scopes automatically. Re-authorize via `/auth/google`

## 📋 Available Calendar Endpoints

Once setup is complete, these endpoints will work:

- **Test Connection**: `GET /api/test/calendar`
- **Get Events**: `GET /api/calendar/events?maxResults=10`
- **Today's Events**: `GET /api/calendar/today`
- **Create Event**: `POST /api/calendar/events`

## 🧪 Testing Commands

```bash
# Test calendar connection
npm run test:calendar

# Test all integrations
npm run test:integrations

# Start development server
npm run dev
```

## 🔐 Security Notes

- Keep your `GOOGLE_CLIENT_SECRET` secure
- Don't commit `.env` files to git
- Refresh tokens are long-lived but can be revoked
- Use HTTPS in production

## 📞 Still Having Issues?

1. Check the test script output: `npm run test:calendar`
2. Verify all environment variables are set correctly
3. Ensure your Google Cloud project has billing enabled (for production)
4. Check server logs for specific error messages

The calendar integration should now work correctly! 🎉