# 🤖 Ultimate AI Organizer - Floating AI Assistant

A powerful floating AI chatbox that can oversee and modify your platform in real-time! Choose between GPT-4 and Claude, with admin capabilities for live webapp modifications.

## ✨ Features

### 🎯 **Floating AI Chatbox**
- **Model Selection**: Choose between GPT-4 and Claude
- **Admin Mode**: Real-time webapp modifications 
- **Conversation History**: Maintains context across messages
- **Minimizable Interface**: Stays out of your way
- **Real-time Responses**: Powered by Socket.io

### 👑 **Admin Capabilities**
- **Live Code Updates**: Modify React components via GitHub API
- **Platform Management**: Update filters, styling, and layouts
- **Task Analysis**: AI insights on your productivity data
- **Bug Fixes**: Real-time debugging and fixes
- **Feature Additions**: Add new functionality on the fly

### 🔗 **Integrations Status**
- ✅ **Notion** - Task management and sync
- ✅ **GitHub** - Code repository and live updates
- ✅ **OpenAI** - GPT-4 AI processing  
- ✅ **Claude** - Anthropic AI assistant
- ❌ **Gmail** - Email monitoring (setup needed)
- ❌ **Slack** - Team communication (setup needed)
- ❌ **Calendar** - Schedule management (setup needed)
- ❌ **Fireflies** - Meeting transcripts (setup needed)
- ❌ **Linear** - Issue tracking (setup needed)

## 🚀 **Quick Setup**

### 1. **Backend Setup**
```bash
cd backend
npm install
```

### 2. **Environment Variables**
Create `backend/.env`:
```env
# AI Services
OPENAI_API_KEY=sk-your-openai-key
ANTHROPIC_API_KEY=sk-ant-your-claude-key

# Notion Integration  
NOTION_API_KEY=secret_your-notion-key
NOTION_DATABASE_ID=your-database-id

# GitHub Integration (for admin features)
GITHUB_TOKEN=ghp_your-github-token

# Optional
PORT=3001
USER=your-username
```

### 3. **Start Backend**
```bash
cd backend
npm run dev
```

### 4. **Frontend Setup** 
```bash
cd frontend
npm install
npm start
```

## 🎮 **How to Use**

### **For Regular Users:**
1. Click the **🤖 AI Assistant** button (bottom right)
2. Choose your preferred AI model (GPT-4 or Claude)
3. Ask questions about your tasks, productivity, or platform features
4. Get personalized insights and recommendations

### **For Admins:**
1. Click the **"User"** button in the header to toggle **"👑 Admin"** mode
2. Open the AI chatbox - you'll see **"Admin Mode Active"**
3. Use admin commands like:
   - "Add a new filter for priority"
   - "Change the task card colors to blue"
   - "Fix the sorting bug in the task list"
   - "Add a dark mode toggle"

### **Sample Admin Commands:**
```
🔧 "Add a new urgency filter"
🎨 "Change task cards to have rounded corners"
🐛 "Debug the Notion sync issue"
✨ "Add a search bar to the tasks"
🌙 "Create a dark mode theme"
```

## 🛠 **GitHub Integration Setup**

### **Create GitHub Token:**
1. Go to [GitHub Settings > Personal Access Tokens](https://github.com/settings/tokens)
2. Click "Generate new token (classic)"
3. Select these scopes:
   - `repo` (Full control of private repositories)
   - `workflow` (Update GitHub Action workflows)
4. Copy the token and add to your `.env` as `GITHUB_TOKEN`

### **Admin Features:**
- **Live code updates** via GitHub API
- **Real-time bug fixes**
- **Feature additions without deployment**
- **Automatic page refresh** after changes

## 📋 **Integration Setup Guide**

### **✅ Notion (Working)**
1. Create a Notion integration at [notion.so/my-integrations](https://www.notion.so/my-integrations)
2. Get your API key and database ID
3. Share your database with the integration
4. Add credentials to `.env`

### **❌ Gmail (Setup Needed)**
1. Set up Google OAuth credentials
2. Configure Gmail API access
3. Add webhook endpoints for real-time email monitoring

### **❌ Slack (Setup Needed)**  
1. Create a Slack app
2. Add bot token scopes
3. Install to workspace
4. Configure event subscriptions

### **❌ Calendar (Setup Needed)**
1. Enable Google Calendar API
2. Set up OAuth for calendar access
3. Configure event webhooks

### **❌ Fireflies (Setup Needed)**
1. Get Fireflies API access
2. Configure meeting transcript webhooks
3. Set up real-time processing

### **❌ Linear (Setup Needed)**
1. Generate Linear API key
2. Configure team access
3. Set up issue tracking webhooks

## 🔒 **Security Notes**

- **Admin mode** can modify live code - use carefully!
- **GitHub token** has repository write access
- **AI commands** are logged for security
- **Auto-refresh** occurs after admin modifications

## 🎯 **Example Use Cases**

### **Productivity Assistant:**
- "Show me my overdue tasks"
- "What's my workload this week?"
- "Suggest ways to optimize my task workflow"

### **Platform Admin:**
- "Add a calendar view for tasks"
- "Create a team performance dashboard" 
- "Fix the mobile responsiveness issues"
- "Add export functionality for tasks"

### **Real-time Modifications:**
- "Change the primary color to purple"
- "Add a quick-add task button"
- "Implement drag-and-drop sorting"
- "Create a notification system"

## 🚀 **Advanced Features**

- **Multi-model AI**: Switch between GPT-4 and Claude seamlessly
- **Context Awareness**: AI knows your entire platform state
- **Live Updates**: Changes reflect immediately via Socket.io
- **Conversation Memory**: Maintains chat history per session
- **Action Tracking**: Logs all admin modifications
- **Safety Checks**: Prevents destructive operations

**The floating AI assistant transforms your platform into a living, evolving workspace that adapts to your needs in real-time! 🌟**
