// backend/src/ai/memoryManager.js
// Manages contextual memories for different entity types

const fs = require('fs').promises;
const path = require('path');

class MemoryManager {
  constructor(supabaseClient = null) {
    this.supabase = supabaseClient;
    this.memoryDir = path.join(__dirname, '../../data/memories');
    this.memories = {
      clients: new Map(),
      leads: new Map(),
      team: new Map(),
      projects: new Map(),
      interactions: []
    };
    
    this.initializeMemoryStore();
  }

  async initializeMemoryStore() {
    // Create memory directory if it doesn't exist
    try {
      await fs.mkdir(this.memoryDir, { recursive: true });
      await this.loadMemories();
    } catch (error) {
      console.error('Failed to initialize memory store:', error);
    }

    // If Supabase is available, sync with database
    if (this.supabase) {
      await this.syncWithDatabase();
    }
  }

  async loadMemories() {
    try {
      // Load clients memory
      const clientsPath = path.join(this.memoryDir, 'clients.json');
      if (await this.fileExists(clientsPath)) {
        const data = await fs.readFile(clientsPath, 'utf8');
        const clients = JSON.parse(data);
        this.memories.clients = new Map(Object.entries(clients));
      }

      // Load leads memory
      const leadsPath = path.join(this.memoryDir, 'leads.json');
      if (await this.fileExists(leadsPath)) {
        const data = await fs.readFile(leadsPath, 'utf8');
        const leads = JSON.parse(data);
        this.memories.leads = new Map(Object.entries(leads));
      }

      // Load team memory
      const teamPath = path.join(this.memoryDir, 'team.json');
      if (await this.fileExists(teamPath)) {
        const data = await fs.readFile(teamPath, 'utf8');
        const team = JSON.parse(data);
        this.memories.team = new Map(Object.entries(team));
      }

      console.log('✅ Loaded memories:', {
        clients: this.memories.clients.size,
        leads: this.memories.leads.size,
        team: this.memories.team.size
      });
    } catch (error) {
      console.error('Failed to load memories:', error);
    }
  }

  async saveMemories() {
    try {
      // Save clients
      await fs.writeFile(
        path.join(this.memoryDir, 'clients.json'),
        JSON.stringify(Object.fromEntries(this.memories.clients), null, 2)
      );

      // Save leads
      await fs.writeFile(
        path.join(this.memoryDir, 'leads.json'),
        JSON.stringify(Object.fromEntries(this.memories.leads), null, 2)
      );

      // Save team
      await fs.writeFile(
        path.join(this.memoryDir, 'team.json'),
        JSON.stringify(Object.fromEntries(this.memories.team), null, 2)
      );

      console.log('💾 Memories saved to disk');
    } catch (error) {
      console.error('Failed to save memories:', error);
    }
  }

  async syncWithDatabase() {
    if (!this.supabase) return;

    try {
      // Create tables if they don't exist
      await this.createMemoryTables();

      // Sync clients
      const { data: clients } = await this.supabase
        .from('ai_memories_clients')
        .select('*');
      
      if (clients) {
        clients.forEach(client => {
          this.memories.clients.set(client.name, client);
        });
      }

      // Sync team members
      const { data: team } = await this.supabase
        .from('ai_memories_team')
        .select('*');
      
      if (team) {
        team.forEach(member => {
          this.memories.team.set(member.name, member);
        });
      }

      console.log('✅ Synced with Supabase database');
    } catch (error) {
      console.error('Database sync failed:', error);
    }
  }

  async createMemoryTables() {
    // This would be run once to set up the database
    const tables = `
      -- Clients memory table
      CREATE TABLE IF NOT EXISTS ai_memories_clients (
        id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
        name TEXT UNIQUE NOT NULL,
        company TEXT,
        industry TEXT,
        preferences JSONB,
        communication_style TEXT,
        important_dates JSONB,
        notes TEXT,
        last_interaction TIMESTAMP,
        created_at TIMESTAMP DEFAULT NOW(),
        updated_at TIMESTAMP DEFAULT NOW()
      );

      -- Leads memory table
      CREATE TABLE IF NOT EXISTS ai_memories_leads (
        id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
        name TEXT UNIQUE NOT NULL,
        company TEXT,
        source TEXT,
        status TEXT,
        interests JSONB,
        pain_points JSONB,
        budget_range TEXT,
        timeline TEXT,
        notes TEXT,
        created_at TIMESTAMP DEFAULT NOW(),
        updated_at TIMESTAMP DEFAULT NOW()
      );

      -- Team memory table
      CREATE TABLE IF NOT EXISTS ai_memories_team (
        id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
        name TEXT UNIQUE NOT NULL,
        role TEXT,
        email TEXT,
        skills JSONB,
        current_projects JSONB,
        preferences JSONB,
        working_hours TEXT,
        notes TEXT,
        created_at TIMESTAMP DEFAULT NOW(),
        updated_at TIMESTAMP DEFAULT NOW()
      );

      -- Interaction logs
      CREATE TABLE IF NOT EXISTS ai_interaction_logs (
        id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
        entity_type TEXT,
        entity_name TEXT,
        interaction_type TEXT,
        content TEXT,
        context JSONB,
        ai_response TEXT,
        timestamp TIMESTAMP DEFAULT NOW()
      );
    `;
    
    // Note: Run this SQL in Supabase SQL editor
    console.log('Memory tables SQL generated (run in Supabase)');
  }

  // Add or update a client memory
  async rememberClient(name, details) {
    const existing = this.memories.clients.get(name) || {};
    const updated = {
      ...existing,
      ...details,
      name,
      lastUpdated: new Date().toISOString()
    };
    
    this.memories.clients.set(name, updated);
    
    // Save to database if available
    if (this.supabase) {
      await this.supabase
        .from('ai_memories_clients')
        .upsert(updated, { onConflict: 'name' });
    }
    
    await this.saveMemories();
    return updated;
  }

  // Add or update a lead memory
  async rememberLead(name, details) {
    const existing = this.memories.leads.get(name) || {};
    const updated = {
      ...existing,
      ...details,
      name,
      lastUpdated: new Date().toISOString()
    };
    
    this.memories.leads.set(name, updated);
    
    if (this.supabase) {
      await this.supabase
        .from('ai_memories_leads')
        .upsert(updated, { onConflict: 'name' });
    }
    
    await this.saveMemories();
    return updated;
  }

  // Add or update a team member memory
  async rememberTeamMember(name, details) {
    const existing = this.memories.team.get(name) || {};
    const updated = {
      ...existing,
      ...details,
      name,
      lastUpdated: new Date().toISOString()
    };
    
    this.memories.team.set(name, updated);
    
    if (this.supabase) {
      await this.supabase
        .from('ai_memories_team')
        .upsert(updated, { onConflict: 'name' });
    }
    
    await this.saveMemories();
    return updated;
  }

  // Get context about a specific entity
  async getContext(entityName, entityType = null) {
    // Search across all memories if type not specified
    if (!entityType) {
      const clientMemory = this.memories.clients.get(entityName);
      if (clientMemory) return { type: 'client', data: clientMemory };
      
      const leadMemory = this.memories.leads.get(entityName);
      if (leadMemory) return { type: 'lead', data: leadMemory };
      
      const teamMemory = this.memories.team.get(entityName);
      if (teamMemory) return { type: 'team', data: teamMemory };
      
      return null;
    }
    
    // Get specific type
    switch(entityType) {
      case 'client':
        return this.memories.clients.get(entityName);
      case 'lead':
        return this.memories.leads.get(entityName);
      case 'team':
        return this.memories.team.get(entityName);
      default:
        return null;
    }
  }

  // Extract entities from text using basic pattern matching
  extractEntities(text) {
    const entities = {
      clients: [],
      leads: [],
      team: []
    };
    
    // Check for client names
    this.memories.clients.forEach((client, name) => {
      if (text.toLowerCase().includes(name.toLowerCase())) {
        entities.clients.push(client);
      }
    });
    
    // Check for lead names
    this.memories.leads.forEach((lead, name) => {
      if (text.toLowerCase().includes(name.toLowerCase())) {
        entities.leads.push(lead);
      }
    });
    
    // Check for team member names
    this.memories.team.forEach((member, name) => {
      if (text.toLowerCase().includes(name.toLowerCase())) {
        entities.team.push(member);
      }
    });
    
    return entities;
  }

  // Log an interaction for learning
  async logInteraction(entityType, entityName, interactionType, content, aiResponse) {
    const log = {
      entityType,
      entityName,
      interactionType,
      content,
      aiResponse,
      timestamp: new Date().toISOString()
    };
    
    this.memories.interactions.push(log);
    
    // Keep only last 1000 interactions in memory
    if (this.memories.interactions.length > 1000) {
      this.memories.interactions = this.memories.interactions.slice(-1000);
    }
    
    // Save to database if available
    if (this.supabase) {
      await this.supabase
        .from('ai_interaction_logs')
        .insert(log);
    }
    
    return log;
  }

  // Get recent interactions for context
  getRecentInteractions(limit = 10, entityName = null) {
    let interactions = this.memories.interactions;
    
    if (entityName) {
      interactions = interactions.filter(i => i.entityName === entityName);
    }
    
    return interactions.slice(-limit);
  }

  // Helper function
  async fileExists(filePath) {
    try {
      await fs.access(filePath);
      return true;
    } catch {
      return false;
    }
  }

  // Get summary of all memories
  getMemorySummary() {
    return {
      clients: Array.from(this.memories.clients.keys()),
      leads: Array.from(this.memories.leads.keys()),
      team: Array.from(this.memories.team.keys()),
      stats: {
        totalClients: this.memories.clients.size,
        totalLeads: this.memories.leads.size,
        totalTeam: this.memories.team.size,
        recentInteractions: this.memories.interactions.length
      }
    };
  }
}

module.exports = MemoryManager;