// backend/src/services/aiContextService.js
// Service to provide AI assistants with context about the company database

const SupabaseService = require('./supabaseService');

class AIContextService {
  constructor(supabaseService) {
    this.supabase = supabaseService || new SupabaseService();
    this.contextCache = null;
    this.cacheExpiry = null;
    this.emailDirectory = new Map(); // Quick lookup for emails
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

      // Build email directory for quick lookup
      this.emailDirectory.clear();
      
      // Add people emails
      if (people.data) {
        people.data.forEach(p => {
          if (p.email) {
            this.emailDirectory.set(p.name?.toLowerCase(), p.email);
            // Also store by first name only
            const firstName = p.name?.split(' ')[0]?.toLowerCase();
            if (firstName) {
              this.emailDirectory.set(firstName, p.email);
            }
          }
        });
      }
      
      // Add client emails
      if (clients.data) {
        clients.data.forEach(c => {
          if (c.email) {
            this.emailDirectory.set(c.name?.toLowerCase(), c.email);
            const firstName = c.name?.split(' ')[0]?.toLowerCase();
            if (firstName) {
              this.emailDirectory.set(firstName, c.email);
            }
          }
        });
      }

      // Build structured context
      const context = {
        company: {
          name: 'DGenz',
          description: 'AI-powered creative agency and production company',
          focus: 'AI integration, creative production, digital innovation',
          domain: 'dgenz.world'
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
            email: c.email,
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
            email: l.email,
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
      console.log(`📧 Email directory contains ${this.emailDirectory.size} entries`);
      
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

  // Get email for a person by name
  async getEmailForPerson(name) {
    // Ensure context is loaded
    if (!this.contextCache) {
      await this.buildCompanyContext();
    }
    
    // Check email directory
    const nameLower = name?.toLowerCase();
    if (this.emailDirectory.has(nameLower)) {
      return this.emailDirectory.get(nameLower);
    }
    
    // Try first name only
    const firstName = name?.split(' ')[0]?.toLowerCase();
    if (firstName && this.emailDirectory.has(firstName)) {
      return this.emailDirectory.get(firstName);
    }
    
    // If name is "alec" specifically, use the known email
    if (nameLower === 'alec' || nameLower === 'alec chapados') {
      return 'alec@dgenz.world';
    }
    
    // Fallback: construct email from name and company domain
    if (firstName) {
      return `${firstName}@dgenz.world`;
    }
    
    return null;
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
- Domain: @dgenz.world
- Focus: ${context.company.focus}

PEOPLE IN THE COMPANY (${context.people.total} total):
${context.people.list.map(p => `- ${p.name}${p.role ? ` (${p.role})` : ''}${p.email ? ` - ${p.email}` : ''}`).join('\n')}

EMAIL DIRECTORY:
- When someone mentions a person's name, you can find their email in the database
- Default company domain is @dgenz.world
- For example: Alec's email is alec@dgenz.world

CLIENTS (${context.clients.total} total, ${context.clients.active} active):
${context.clients.list.slice(0, 10).map(c => `- ${c.name}${c.company ? ` at ${c.company}` : ''}${c.email ? ` - ${c.email}` : ''} (${c.status})`).join('\n')}

LEADS (${context.leads.total} total, ${context.leads.hot} hot):
${context.leads.list.slice(0, 10).map(l => `- ${l.name}${l.company ? ` at ${l.company}` : ''}${l.email ? ` - ${l.email}` : ''} (${l.temperature || l.status})`).join('\n')}

ACTIVE PROJECTS (${context.projects.active} active):
${context.projects.list.filter(p => p.status === 'active').slice(0, 5).map(p => `- ${p.name} for ${p.client}`).join('\n')}

CURRENT STATUS:
- Tasks: ${context.tasks.total} total, ${context.tasks.pending} pending, ${context.tasks.overdue} overdue
- Integrated tools: ${context.capabilities.tools.join(', ')}

IMPORTANT: When creating calendar invites, always look up the person's email from the database. For example, if someone says "invite Alec", you should use alec@dgenz.world.

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
            aiPrompt += `\n- ${c.name} at ${c.company || 'Unknown company'} - ${c.email || 'No email'} (${c.status})`;
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
    this.emailDirectory.clear();
    console.log('🔄 AI context cache cleared');
  }
}

module.exports = AIContextService;