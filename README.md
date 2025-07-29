# 🤖 AI-Powered Real-time Dashboard

**Intelligent task management that automatically analyzes emails, Slack messages, Notion changes, and meeting transcripts to create actionable tasks in real-time.**

![Dashboard Preview](https://img.shields.io/badge/Status-Active-green) ![AI Powered](https://img.shields.io/badge/AI-OpenAI%20%7C%20Claude-blue) ![Real-time](https://img.shields.io/badge/Updates-Real--time-orange)

## 🎯 What It Does

This dashboard uses AI to automatically:
- **Monitor** your Slack, Gmail, Notion, and Fireflies
- **Analyze** incoming events with OpenAI/Claude
- **Create** actionable tasks from important messages
- **Prioritize** everything by urgency automatically
- **Update** your dashboard in real-time via WebSockets

## ⚡ Quick Start

### 1. Clone & Install
```bash
git clone https://github.com/grizzcodes/realtime-ai-dashboard.git
cd realtime-ai-dashboard

# Install backend dependencies
cd backend && npm install

# Install frontend dependencies  
cd ../frontend && npm install
```

### 2. Environment Setup
```bash
# Copy environment template
cp backend/.env.example backend/.env
```

Edit `backend/.env` with your API keys:
```bash
# Required: Database
SUPABASE_URL=your_supabase_project_url
SUPABASE_ANON_KEY=your_supabase_anon_key

# Required: AI (choose one or both)
OPENAI_API_KEY=sk-your_openai_key
# OR
ANTHROPIC_API_KEY=your_claude_key

# Optional: Integrations
NOTION_API_KEY=secret_your_notion_token
SLACK_BOT_TOKEN=xoxb-your_slack_token
```

### 3. Database Setup
1. Create account at [supabase.com](https://supabase.com)
2. Create new project: `realtime-ai-dashboard`
3. Go to SQL Editor and run this schema:

```sql
-- Tasks table
CREATE TABLE tasks (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  title TEXT NOT NULL,
  source TEXT NOT NULL,
  urgency INTEGER NOT NULL DEFAULT 1,
  status TEXT DEFAULT 'pending',
  ai_confidence REAL DEFAULT 0,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Events table  
CREATE TABLE events (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  source TEXT NOT NULL,
  type TEXT NOT NULL,
  data JSONB NOT NULL,
  processed_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Indexes for performance
CREATE INDEX idx_tasks_status ON tasks(status);
CREATE INDEX idx_tasks_urgency ON tasks(urgency DESC);
CREATE INDEX idx_events_source ON events(source);
```

### 4. Start the Application
```bash
# Terminal 1: Backend server
cd backend
npm run dev

# Terminal 2: Frontend dashboard  
cd frontend
npm start
```

### 5. Test It Out
1. Open http://localhost:3000 
2. Click "Test AI" button
3. Watch AI create tasks in real-time! 🎉

## 🏗️ Architecture

```
┌─────────────────┐    ┌──────────────────┐    ┌─────────────────┐
│   Integrations  │───▶│   AI Processor   │───▶│   Dashboard     │
├─────────────────┤    ├──────────────────┤    ├─────────────────┤
│ • Slack         │    │ • OpenAI/Claude  │    │ • React Frontend│
│ • Gmail         │    │ • Event Analysis │    │ • Real-time UI  │
│ • Notion        │    │ • Task Creation  │    │ • WebSockets    │
│ • Fireflies     │    │ • Urgency Rating │    │ • Tailwind CSS  │
└─────────────────┘    └──────────────────┘    └─────────────────┘
        │                       │                       │
        └───────────────────────┼───────────────────────┘
                                │
                    ┌──────────────────┐
                    │   Supabase DB    │
                    │ • Tasks Storage  │
                    │ • Events Log     │
                    │ • Real-time Sync │
                    └──────────────────┘
```

## 🔥 Features

### ✅ Core Features
- **🧠 AI Analysis**: OpenAI GPT-4 or Claude analyzes all incoming events
- **⚡ Real-time Updates**: WebSocket connections for instant task updates  
- **🎯 Smart Prioritization**: AI automatically rates urgency (1-5 scale)
- **📊 Live Dashboard**: Beautiful, responsive interface with live stats
- **💾 Persistence**: All data stored in Supabase with real-time sync
- **🔗 Multi-platform**: Slack, Gmail, Notion, Fireflies webhooks

### 🚀 Advanced Features
- **Auto Notion Sync**: High-priority tasks automatically created in Notion
- **Intelligent Filtering**: Pending vs completed task views
- **Activity Feed**: Real-time stream of all processed events
- **Health Monitoring**: Built-in API health checks and error handling
- **Graceful Scaling**: Memory fallback if database unavailable

## 📱 Using the Dashboard

### Task Management
- **View Tasks**: Automatically organized by urgency (Critical → Low)
- **Complete Tasks**: Single-click to mark tasks as done ✅
- **AI Insights**: See confidence levels and analysis reasoning
- **Real-time**: New tasks appear instantly as events are processed

### Testing AI Processing
1. Click the **"Test AI"** button in the dashboard
2. AI will process a sample message: "Urgent: Fix the payment gateway bug by tomorrow"
3. Watch as the AI creates a high-priority task in real-time
4. Check the activity feed to see the event processing

### Live Activity Feed  
- Real-time stream of all processed events
- See AI analysis results and confidence scores
- Monitor webhook processing and task creation
- Debug integration issues

## 🔧 API Endpoints

| Endpoint | Method | Description |
|----------|--------|-------------|
| `/` | GET | Dashboard overview and stats |
| `/health` | GET | System health check |
| `/api/tasks` | GET | Get all tasks with stats |
| `/api/tasks/:id/status` | PUT | Update task status |
| `/api/events` | GET | Recent events feed |
| `/api/ai-test` | POST | Test AI processing |
| `/api/notion/pages` | GET | Notion integration |
| `/webhooks/*` | POST | Webhook endpoints |

## 🔗 Setting Up Integrations

### Slack Integration
1. Create app at [api.slack.com/apps](https://api.slack.com/apps)
2. Add webhook URL: `http://your-domain:3001/webhooks/slack`
3. Add bot token to `.env` as `SLACK_BOT_TOKEN`

### Gmail Integration  
1. Set up Google Cloud Pub/Sub
2. Configure webhook: `http://your-domain:3001/webhooks/gmail`
3. Add credentials to `.env`

### Notion Integration
1. Create integration at [notion.so/my-integrations](https://www.notion.so/my-integrations)
2. Add API key to `.env` as `NOTION_API_KEY`
3. Share databases with your integration

### For Local Development
Use [ngrok](https://ngrok.com) to expose your local server:
```bash
# Install ngrok, then:
ngrok http 3001

# Use the https URL for webhook endpoints
```

## 🛠️ Development

### Project Structure
```
realtime-ai-dashboard/
├── backend/
│   ├── main.js                           # Main server with WebSocket
│   ├── src/
│   │   ├── ai/intelligentProcessor.js    # AI event processing
│   │   ├── database/supabaseClient.js    # Database client
│   │   ├── services/notionService.js     # Notion API integration
│   │   └── webhooks/webhookHandler.js    # Multi-service webhooks
│   └── package.json
├── frontend/
│   ├── src/
│   │   ├── App.js                        # Main dashboard
│   │   ├── components/
│   │   │   ├── TaskBoard.js             # Task management UI
│   │   │   ├── ActivityFeed.js          # Real-time events
│   │   │   └── StatsPanel.js            # Dashboard stats
│   │   └── App.css                      # Styling
│   └── package.json
└── README.md
```

### Available Scripts

**Backend:**
```bash
npm run dev     # Development with nodemon
npm start       # Production server
npm test        # Run webhook tests
```

**Frontend:**
```bash
npm start       # Development server
npm run build   # Production build
npm test        # Run React tests
```

## 🚨 Troubleshooting

### Common Issues

**"AI processing failed"**
```bash
# Check your API keys
cat backend/.env | grep API_KEY

# Test API connection
curl -X POST http://localhost:3002/api/ai-test \
  -H "Content-Type: application/json" \
  -d '{"message": "test message"}'
```

**"Database connection failed"**
```bash
# Verify Supabase credentials
cat backend/.env | grep SUPABASE

# Check if tables exist in Supabase dashboard
# SQL Editor > Run the schema from step 3 above
```

**"WebSocket not connecting"**
- Check if ports 3000 (frontend) and 3002 (backend) are available
- Verify CORS settings in `backend/main.js`
- Check browser console for WebSocket errors

**"Webhooks not working"**
- For local development, use ngrok: `ngrok http 3001`
- Check webhook URLs in service settings
- Verify authentication tokens

### Debug Mode
```bash
# Enable detailed logging
LOG_LEVEL=debug npm run dev

# Monitor real-time events
# Open browser dev tools → Network → WebSocket to see live events
```

## 🚀 Deployment

### Using Docker
```bash
# Build images
docker-compose build

# Start services
docker-compose up -d
```

### Manual Deployment
1. Build frontend: `cd frontend && npm run build`
2. Upload backend to your server
3. Set environment variables
4. Start with PM2: `pm2 start backend/main.js`

### Environment Variables for Production
```bash
NODE_ENV=production
PORT=3002
WEBHOOK_PORT=3001
# Add your production API keys...
```

## 📈 Monitoring & Analytics

- **Health Endpoint**: `GET /health` for uptime monitoring
- **Real-time Stats**: Built into dashboard UI
- **Database Metrics**: View in Supabase dashboard  
- **Logs**: Console output shows all processing details

## 🎯 Roadmap

- [ ] **Authentication**: User accounts and permissions
- [ ] **Mobile App**: React Native companion app
- [ ] **Advanced AI**: Custom prompts and fine-tuned models
- [ ] **Team Features**: Multi-user workspaces
- [ ] **Integrations**: Microsoft Teams, Discord, Linear
- [ ] **Analytics**: Task completion insights and trends

## 🤝 Contributing

1. Fork the repository
2. Create your feature branch: `git checkout -b feature/amazing-feature`
3. Make your changes and test thoroughly
4. Commit: `git commit -m 'Add amazing feature'`
5. Push: `git push origin feature/amazing-feature`
6. Open a Pull Request

## 📄 License

MIT License - see [LICENSE](LICENSE) file for details.

## 🙋‍♂️ Support

- **Issues**: Open a GitHub issue
- **Questions**: Start a discussion
- **Documentation**: Check `/docs` folder

---

**Built with**: React • Node.js • Supabase • OpenAI • Claude • WebSockets • Tailwind CSS

⭐ **Star this repo** if it helps you stay organized!