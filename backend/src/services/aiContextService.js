// backend/src/services/aiContextService.js
// Service to provide AI assistants with context about the company database

const SupabaseService = require('./supabaseService');

class AIContextService {
  constructor(supabaseService) {
    this.supabase = supabaseService || new SupabaseService();
    this.contextCache = null;
    this.cacheExpiry = null;
  }

  // Build comprehensive context about the company
  async buildCompanyContext() {
    try {
      // Check cache first (5 minute cache)
      if (this.contextCache && this.cacheExpiry && Date.now() < this.cacheExpiry) {
        return this.contextCache;
      }

      console.log('🧠 Building AI context from SUPA database...');

      // Fetch all relevant data from SUPA
      const [people, clients, leads, projects, tasks] = await Promise.all([
        this.supabase.supabase.from('people').select('*'),
        this.supabase.supabase.from('clients').select('*'),
        this.supabase.supabase.from('leads').select('*'),
        this.supabase.supabase.from('projects').select('*'),
        this.supabase.supabase.from('tasks').select('*')
      ]);

      // Build structured context
      const context = {
        company: {
          name: 'DGenz',
          description: 'AI-powered creative agency and production company',
          focus: 'AI integration, creative production, digital innovation'
        },
        people: {
          total: people.data?.length || 0,
          list: (people.data || []).map(p => ({
            name: p.name,
            role: p.role || p.position,
            email: p.email,
            department: p.department,
            skills: p.skills,
            projects: p.projects,
            status: p.status
          }))
        },
        clients: {
          total: clients.data?.length || 0,
          active: (clients.data || []).filter(c => c.status === 'active').length,
          list: (clients.data || []).map(c => ({
            name: c.name,
            company: c.company,
            industry: c.industry,
            status: c.status,
            value: c.contract_value,
            lastContact: c.last_contact
          }))
        },
        leads: {
          total: leads.data?.length || 0,
          hot: (leads.data || []).filter(l => l.temperature === 'hot').length,
          list: (leads.data || []).map(l => ({
            name: l.name,
            company: l.company,
            status: l.status,
            temperature: l.temperature,
            source: l.source,
            stage: l.stage
          }))
        },
        projects: {
          total: projects.data?.length || 0,
          active: (projects.data || []).filter(p => p.status === 'active').length,
          list: (projects.data || []).map(p => ({
            name: p.name,
            client: p.client,
            status: p.status,
            deadline: p.deadline,
            budget: p.budget,
            team: p.team_members
          }))
        },
        tasks: {
          total: tasks.data?.length || 0,
          pending: (tasks.data || []).filter(t => t.status === 'pending').length,
          overdue: (tasks.data || []).filter(t => {
            if (!t.due_date) return false;
            return new Date(t.due_date) < new Date() && t.status !== 'completed';
          }).length
        },
        capabilities: {
          databases: ['people', 'clients', 'leads', 'projects', 'tasks', 'meetings'],
          services: ['AI integration', 'Creative production', 'Digital strategy', 'Content creation'],
          tools: ['Gmail', 'Slack', 'Notion', 'Calendar', 'Fireflies', 'OpenAI', 'Claude', 'Supabase']
        }
      };

      // Cache the context
      this.contextCache = context;
      this.cacheExpiry = Date.now() + (5 * 60 * 1000); // 5 minute cache

      console.log(`✅ AI context built: ${context.people.total} people, ${context.clients.total} clients, ${context.leads.total} leads`);
      
      return context;
    } catch (error) {
      console.error('Failed to build AI context:', error);
      return {
        error: 'Failed to load company context',
        company: { name: 'DGenz' },
        people: { total: 0, list: [] },
        clients: { total: 0, list: [] },
        leads: { total: 0, list: [] }
      };
    }
  }

  // Get specific person by name or email
  async getPerson(identifier) {
    try {
      // Try by name first
      let result = await this.supabase.supabase
        .from('people')
        .select('*')
        .ilike('name', `%${identifier}%`)
        .single();

      if (!result.data) {
        // Try by email
        result = await this.supabase.supabase
          .from('people')
          .select('*')
          .eq('email', identifier)
          .single();
      }

      return result.data || null;
    } catch (error) {
      return null;
    }
  }

  // Search across all tables
  async searchAll(query) {
    try {
      const searchTerm = `%${query}%`;
      
      const [people, clients, leads, projects] = await Promise.all([
        this.supabase.supabase
          .from('people')
          .select('*')
          .or(`name.ilike.${searchTerm},email.ilike.${searchTerm},role.ilike.${searchTerm}`),
        this.supabase.supabase
          .from('clients')
          .select('*')
          .or(`name.ilike.${searchTerm},company.ilike.${searchTerm},email.ilike.${searchTerm}`),
        this.supabase.supabase
          .from('leads')
          .select('*')
          .or(`name.ilike.${searchTerm},company.ilike.${searchTerm},email.ilike.${searchTerm}`),
        this.supabase.supabase
          .from('projects')
          .select('*')
          .or(`name.ilike.${searchTerm},client.ilike.${searchTerm}`)
      ]);

      return {
        people: people.data || [],
        clients: clients.data || [],
        leads: leads.data || [],
        projects: projects.data || []
      };
    } catch (error) {
      console.error('Search failed:', error);
      return {
        people: [],
        clients: [],
        leads: [],
        projects: []
      };
    }
  }

  // Format context for AI consumption
  async getAIContext(specificQuery = null) {
    const context = await this.buildCompanyContext();
    
    let aiPrompt = `
You have access to DGenz company database with the following information:

COMPANY OVERVIEW:
- Company: ${context.company.name}
- Focus: ${context.company.focus}

PEOPLE IN THE COMPANY (${context.people.total} total):
${context.people.list.map(p => `- ${p.name}${p.role ? ` (${p.role})` : ''}${p.email ? ` - ${p.email}` : ''}`).join('\n')}

CLIENTS (${context.clients.total} total, ${context.clients.active} active):
${context.clients.list.slice(0, 10).map(c => `- ${c.name}${c.company ? ` at ${c.company}` : ''} (${c.status})`).join('\n')}

LEADS (${context.leads.total} total, ${context.leads.hot} hot):
${context.leads.list.slice(0, 10).map(l => `- ${l.name}${l.company ? ` at ${l.company}` : ''} (${l.temperature || l.status})`).join('\n')}

ACTIVE PROJECTS (${context.projects.active} active):
${context.projects.list.filter(p => p.status === 'active').slice(0, 5).map(p => `- ${p.name} for ${p.client}`).join('\n')}

CURRENT STATUS:
- Tasks: ${context.tasks.total} total, ${context.tasks.pending} pending, ${context.tasks.overdue} overdue
- Integrated tools: ${context.capabilities.tools.join(', ')}

You can answer questions about the people, clients, leads, and projects in the company based on this information.
`;

    if (specificQuery) {
      const searchResults = await this.searchAll(specificQuery);
      if (searchResults.people.length > 0 || searchResults.clients.length > 0) {
        aiPrompt += `\n\nSPECIFIC SEARCH RESULTS FOR "${specificQuery}":`;
        
        if (searchResults.people.length > 0) {
          aiPrompt += `\nPeople found:`;
          searchResults.people.forEach(p => {
            aiPrompt += `\n- ${p.name} (${p.role || 'No role specified'}) - ${p.email || 'No email'}`;
          });
        }
        
        if (searchResults.clients.length > 0) {
          aiPrompt += `\nClients found:`;
          searchResults.clients.forEach(c => {
            aiPrompt += `\n- ${c.name} at ${c.company || 'Unknown company'} (${c.status})`;
          });
        }
      }
    }

    return aiPrompt;
  }

  // Clear cache to force refresh
  clearCache() {
    this.contextCache = null;
    this.cacheExpiry = null;
    console.log('🔄 AI context cache cleared');
  }
}

module.exports = AIContextService;