// backend/src/routes/ai-enhanced.js
// Enhanced AI routes with company context awareness

const AIContextService = require('../services/aiContextService');
const OpenAIService = require('../services/openAIService');
const ClaudeService = require('../services/claudeService');

// Initialize services
const aiContext = new AIContextService();
const openai = new OpenAIService();
const claude = new ClaudeService();

// Helper function to inject context into AI prompts
async function enhancePromptWithContext(userPrompt, searchQuery = null) {
  const context = await aiContext.getAIContext(searchQuery);
  
  // Extract potential search terms from user prompt
  const searchTerms = ['people', 'person', 'team', 'client', 'lead', 'project', 'who', 'contact'];
  let needsContext = searchTerms.some(term => userPrompt.toLowerCase().includes(term));
  
  if (needsContext || searchQuery) {
    return `${context}\n\nUser Question: ${userPrompt}`;
  }
  
  return userPrompt;
}

// Enhanced chat endpoint with context
app.post('/api/ai/chat-enhanced', async (req, res) => {
  try {
    const { message, model = 'gpt-4', includeContext = true } = req.body;
    
    console.log('🤖 Enhanced AI chat request:', { message: message.substring(0, 50), model });
    
    // Enhance prompt with company context if needed
    let enhancedPrompt = message;
    if (includeContext) {
      enhancedPrompt = await enhancePromptWithContext(message);
    }
    
    let response;
    
    if (model === 'claude') {
      response = await claude.generateResponse(enhancedPrompt);
    } else {
      response = await openai.generateResponse(enhancedPrompt, {
        model: model === 'gpt-4' ? 'gpt-4' : 'gpt-3.5-turbo',
        temperature: 0.7,
        max_tokens: 1000
      });
    }
    
    res.json({
      success: true,
      response: response,
      model: model,
      contextIncluded: includeContext
    });
    
  } catch (error) {
    console.error('Enhanced AI chat error:', error);
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

// Get company context endpoint
app.get('/api/ai/company-context', async (req, res) => {
  try {
    const { search } = req.query;
    
    console.log('📊 Fetching company context', search ? `with search: ${search}` : '');
    
    const context = await aiContext.buildCompanyContext();
    
    // If search query provided, also get search results
    let searchResults = null;
    if (search) {
      searchResults = await aiContext.searchAll(search);
    }
    
    res.json({
      success: true,
      context: context,
      searchResults: searchResults,
      timestamp: new Date().toISOString()
    });
    
  } catch (error) {
    console.error('Failed to get company context:', error);
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

// Search people endpoint
app.get('/api/ai/search-people', async (req, res) => {
  try {
    const { query } = req.query;
    
    if (!query) {
      return res.status(400).json({
        success: false,
        error: 'Search query required'
      });
    }
    
    console.log('🔍 Searching for people:', query);
    
    const results = await aiContext.searchAll(query);
    
    res.json({
      success: true,
      results: results,
      count: {
        people: results.people.length,
        clients: results.clients.length,
        leads: results.leads.length,
        projects: results.projects.length
      }
    });
    
  } catch (error) {
    console.error('Search failed:', error);
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

// Get specific person endpoint
app.get('/api/ai/person/:identifier', async (req, res) => {
  try {
    const { identifier } = req.params;
    
    console.log('👤 Getting person:', identifier);
    
    const person = await aiContext.getPerson(identifier);
    
    if (!person) {
      return res.status(404).json({
        success: false,
        error: 'Person not found'
      });
    }
    
    res.json({
      success: true,
      person: person
    });
    
  } catch (error) {
    console.error('Failed to get person:', error);
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

// Refresh context cache endpoint
app.post('/api/ai/refresh-context', async (req, res) => {
  try {
    console.log('🔄 Refreshing AI context cache');
    
    aiContext.clearCache();
    const newContext = await aiContext.buildCompanyContext();
    
    res.json({
      success: true,
      message: 'Context cache refreshed',
      stats: {
        people: newContext.people.total,
        clients: newContext.clients.total,
        leads: newContext.leads.total,
        projects: newContext.projects.total
      }
    });
    
  } catch (error) {
    console.error('Failed to refresh context:', error);
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

console.log('🤖 Enhanced AI routes with company context loaded');