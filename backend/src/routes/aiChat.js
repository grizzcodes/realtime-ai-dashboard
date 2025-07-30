// backend/src/routes/aiChat.js
const express = require('express');
const router = express.Router();
const OpenAI = require('openai');
const Anthropic = require('@anthropic-ai/sdk');

// Initialize AI clients
const openai = process.env.OPENAI_API_KEY ? new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
}) : null;

const anthropic = process.env.ANTHROPIC_API_KEY ? new Anthropic({
  apiKey: process.env.ANTHROPIC_API_KEY,
}) : null;

// GitHub integration for admin actions
const { Octokit } = require('@octokit/rest');
const fs = require('fs').promises;
const path = require('path');

const octokit = process.env.GITHUB_TOKEN ? new Octokit({
  auth: process.env.GITHUB_TOKEN,
}) : null;

const REPO_OWNER = 'grizzcodes';
const REPO_NAME = 'realtime-ai-dashboard';

// Admin system prompt
const ADMIN_SYSTEM_PROMPT = `You are an AI platform overseer with admin capabilities. You can:

1. ANALYZE the current webapp state and suggest improvements
2. MODIFY frontend code in real-time via GitHub API
3. UPDATE task filters, UI components, and styling
4. MANAGE integrations and connections
5. PROVIDE insights about task data and platform usage

When given admin commands, you can:
- Update React components (App.js, FloatingChatbox.js)
- Modify backend routes and services
- Add new features or filters
- Change styling and layout
- Fix bugs and optimize performance

Current platform status:
- Frontend: React with Tailwind CSS
- Backend: Node.js with Express
- Integrations: Notion (working), others need setup
- Database: In-memory task storage
- Real-time: Socket.io for live updates

Always explain what changes you're making and ask for confirmation before major modifications.

For non-admin users, provide helpful information about tasks, platform features, and general assistance.`;

const USER_SYSTEM_PROMPT = `You are a helpful AI assistant for the Ultimate AI Organizer platform. You can:

1. Help users understand their tasks and data
2. Provide insights about productivity and organization  
3. Explain platform features and how to use them
4. Suggest ways to optimize their workflow
5. Answer questions about integrations and setup

You have access to the user's task data and can provide personalized recommendations.
Be friendly, helpful, and focus on productivity and organization advice.`;

router.post('/ai-chat', async (req, res) => {
  try {
    const { message, model, isAdmin, conversationHistory } = req.body;
    
    if (!message) {
      return res.status(400).json({ success: false, error: 'Message is required' });
    }

    let response;
    let actions = [];

    // Choose AI model
    if (model === 'claude' && anthropic) {
      response = await getClaudeResponse(message, isAdmin, conversationHistory);
    } else if (model === 'gpt4' && openai) {
      response = await getGPTResponse(message, isAdmin, conversationHistory);
    } else {
      return res.status(400).json({ 
        success: false, 
        error: `${model} is not configured. Please add API keys to .env file.` 
      });
    }

    // Check for admin commands
    if (isAdmin && response) {
      actions = await handleAdminCommands(message, response);
    }

    res.json({ 
      success: true, 
      response: response,
      actions: actions,
      model: model
    });

  } catch (error) {
    console.error('AI Chat Error:', error);
    res.status(500).json({ 
      success: false, 
      error: error.message 
    });
  }
});

async function getGPTResponse(message, isAdmin, conversationHistory) {
  const systemPrompt = isAdmin ? ADMIN_SYSTEM_PROMPT : USER_SYSTEM_PROMPT;
  
  const messages = [
    { role: 'system', content: systemPrompt },
    ...conversationHistory.map(msg => ({
      role: msg.role,
      content: msg.content
    })),
    { role: 'user', content: message }
  ];

  const completion = await openai.chat.completions.create({
    model: 'gpt-4',
    messages: messages,
    max_tokens: 1000,
    temperature: 0.7,
  });

  return completion.choices[0].message.content;
}

async function getClaudeResponse(message, isAdmin, conversationHistory) {
  const systemPrompt = isAdmin ? ADMIN_SYSTEM_PROMPT : USER_SYSTEM_PROMPT;
  
  const messages = conversationHistory.map(msg => ({
    role: msg.role,
    content: msg.content
  }));
  
  messages.push({ role: 'user', content: message });

  const response = await anthropic.messages.create({
    model: 'claude-3-sonnet-20240229',
    max_tokens: 1000,
    system: systemPrompt,
    messages: messages
  });

  return response.content[0].text;
}

async function handleAdminCommands(userMessage, aiResponse) {
  const actions = [];
  
  // Check if AI suggested code changes
  if (aiResponse.includes('```') && octokit) {
    console.log('🔧 AI suggested code changes, but automatic implementation disabled for safety');
    actions.push('code-suggestion');
  }

  // Check for specific admin commands
  const lowerMessage = userMessage.toLowerCase();
  
  if (lowerMessage.includes('add filter') || lowerMessage.includes('new filter')) {
    actions.push('filter-modification');
  }
  
  if (lowerMessage.includes('change color') || lowerMessage.includes('update styling')) {
    actions.push('styling-update');
  }
  
  if (lowerMessage.includes('fix bug') || lowerMessage.includes('debug')) {
    actions.push('bug-fix');
  }

  return actions;
}

// Helper function to update GitHub files (admin only)
async function updateGitHubFile(filePath, content, commitMessage) {
  if (!octokit) {
    throw new Error('GitHub integration not configured');
  }

  try {
    // Get current file to get SHA
    const { data: currentFile } = await octokit.rest.repos.getContent({
      owner: REPO_OWNER,
      repo: REPO_NAME,
      path: filePath,
    });

    // Update file
    const { data: updatedFile } = await octokit.rest.repos.createOrUpdateFileContents({
      owner: REPO_OWNER,
      repo: REPO_NAME,
      path: filePath,
      message: commitMessage,
      content: Buffer.from(content).toString('base64'),
      sha: currentFile.sha,
    });

    return updatedFile;
  } catch (error) {
    console.error('GitHub update error:', error);
    throw error;
  }
}

module.exports = router;
