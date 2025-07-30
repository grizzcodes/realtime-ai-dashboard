# 🔧 Integration Setup Guide

## Required Environment Variables

Add these to `backend/.env`:

```bash
# Google Services (Gmail & Calendar)
GOOGLE_CLIENT_ID=your_google_client_id
GOOGLE_CLIENT_SECRET=your_google_client_secret
GOOGLE_REFRESH_TOKEN=your_refresh_token

# Slack
SLACK_BOT_TOKEN=xoxb-your_slack_token

# Fireflies
FIREFLIES_API_KEY=your_fireflies_api_key

# AI Services
OPENAI_API_KEY=sk-your_openai_key
ANTHROPIC_API_KEY=sk-ant-your_claude_key

# Notion
NOTION_API_KEY=secret_your_notion_token
NOTION_DATABASE_ID=your_database_id
```

## Setup Instructions

### 📧 Gmail & 📅 Calendar
1. Go to [Google Cloud Console](https://console.cloud.google.com/)
2. Create project → Enable Gmail & Calendar APIs
3. Create OAuth2 credentials
4. Add to `.env`: `GOOGLE_CLIENT_ID` and `GOOGLE_CLIENT_SECRET`
5. Visit `http://localhost:3002/auth/google`
6. Copy refresh token to `.env` as `GOOGLE_REFRESH_TOKEN`
7. Restart backend

### 💬 Slack
1. Go to [api.slack.com/apps](https://api.slack.com/apps)
2. Create new app for your workspace
3. Go to "OAuth & Permissions"
4. Add scopes: `chat:read`, `users:read`
5. Install app and copy Bot User OAuth Token
6. Add to `.env`: `SLACK_BOT_TOKEN=xoxb-...`

### 🎙️ Fireflies
1. Login to [fireflies.ai](https://fireflies.ai)
2. Go to Settings → API
3. Generate API key
4. Add to `.env`: `FIREFLIES_API_KEY=your_key`

### 📝 Notion
1. Go to [notion.so/my-integrations](https://www.notion.so/my-integrations)
2. Create new integration
3. Copy API key
4. Share your database with the integration
5. Add to `.env`: `NOTION_API_KEY=secret_...`

## Testing

Start backend and visit dashboard:
```bash
cd backend && npm run dev
cd frontend && npm start
```

Test each integration in the dashboard's "Integrations" tab.
