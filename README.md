# Real-time AI Dashboard 🚀

**Week-long sprint to build an AI assistant that monitors Gmail, Notion, Slack, Fireflies and intelligently prioritizes tasks.**

## Quick Start

```bash
git clone https://github.com/grizzcodes/realtime-ai-dashboard.git
cd realtime-ai-dashboard/backend
npm install
cp .env.example .env
# Fill in your API keys
npm start
```

## Day 1 Progress ✅

- [x] Project structure
- [x] Webhook handler foundation  
- [x] AI event processor
- [x] WebSocket server
- [ ] Test integrations

## Architecture

**Data Sources** → **AI Processing** → **Real-time Dashboard**

- Webhooks collect events from all services
- AI analyzes and prioritizes automatically  
- Dashboard updates in real-time via WebSockets