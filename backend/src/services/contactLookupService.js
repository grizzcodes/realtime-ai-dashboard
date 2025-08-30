// backend/src/services/contactLookupService.js
// Service to lookup contacts from Supabase with priority: People > Clients > Leads

class ContactLookupService {
  constructor(supabaseClient) {
    this.supabase = supabaseClient;
    this.contactCache = new Map(); // Cache to avoid repeated lookups
    this.cacheTimeout = 5 * 60 * 1000; // 5 minutes cache
  }

  /**
   * Clear the contact cache
   */
  clearCache() {
    this.contactCache.clear();
    console.log('📋 Contact cache cleared');
  }

  /**
   * Find contact by name with priority: People > Clients > Leads
   * @param {string} name - Name to search for
   * @returns {object|null} Contact info with email and details
   */
  async findContactByName(name) {
    if (!name) return null;
    
    const searchName = name.toLowerCase().trim();
    
    // Check cache first
    const cacheKey = `name:${searchName}`;
    if (this.contactCache.has(cacheKey)) {
      const cached = this.contactCache.get(cacheKey);
      if (Date.now() - cached.timestamp < this.cacheTimeout) {
        console.log(`📋 Found ${searchName} in cache:`, cached.data);
        return cached.data;
      }
    }

    console.log(`🔍 Looking up contact: ${name}`);

    try {
      // 1. First check People table (highest priority)
      const { data: peopleData, error: peopleError } = await this.supabase
        .from('people')
        .select('*')
        .or(`name.ilike.%${searchName}%,first_name.ilike.%${searchName}%,last_name.ilike.%${searchName}%`)
        .limit(1)
        .single();

      if (peopleData && !peopleError) {
        const contact = {
          email: peopleData.email,
          name: peopleData.name || `${peopleData.first_name || ''} ${peopleData.last_name || ''}`.trim(),
          type: 'people',
          company: peopleData.company,
          role: peopleData.role,
          source: 'People',
          data: peopleData
        };
        
        // Cache the result
        this.contactCache.set(cacheKey, {
          data: contact,
          timestamp: Date.now()
        });
        
        console.log(`✅ Found in People table:`, contact);
        return contact;
      }

      // 2. Check Clients table (second priority)
      const { data: clientsData, error: clientsError } = await this.supabase
        .from('clients')
        .select('*')
        .or(`name.ilike.%${searchName}%,contact_name.ilike.%${searchName}%,company.ilike.%${searchName}%`)
        .limit(1)
        .single();

      if (clientsData && !clientsError) {
        const contact = {
          email: clientsData.email || clientsData.contact_email,
          name: clientsData.contact_name || clientsData.name,
          type: 'client',
          company: clientsData.company || clientsData.name,
          source: 'Clients',
          data: clientsData
        };
        
        // Cache the result
        this.contactCache.set(cacheKey, {
          data: contact,
          timestamp: Date.now()
        });
        
        console.log(`✅ Found in Clients table:`, contact);
        return contact;
      }

      // 3. Check Leads table (third priority)
      const { data: leadsData, error: leadsError } = await this.supabase
        .from('leads')
        .select('*')
        .or(`name.ilike.%${searchName}%,company.ilike.%${searchName}%,notes.ilike.%${searchName}%`)
        .limit(1)
        .single();

      if (leadsData && !leadsError) {
        // Extract email from notes if present (e.g., "Agency - John (john@example.com)")
        let email = leadsData.email;
        if (!email && leadsData.notes) {
          const emailMatch = leadsData.notes.match(/\(([^)]+@[^)]+)\)/);
          if (emailMatch) {
            email = emailMatch[1];
          }
        }

        // Extract name from notes if not in name field
        let contactName = leadsData.name || leadsData.company;
        if (leadsData.notes) {
          const nameMatch = leadsData.notes.match(/^[^-]+ - ([^(]+)/);
          if (nameMatch) {
            contactName = nameMatch[1].trim();
          }
        }

        const contact = {
          email: email,
          name: contactName,
          type: 'lead',
          company: leadsData.company || leadsData.name,
          stage: leadsData.stage,
          source: 'Leads',
          data: leadsData
        };
        
        // Cache the result
        this.contactCache.set(cacheKey, {
          data: contact,
          timestamp: Date.now()
        });
        
        console.log(`✅ Found in Leads table:`, contact);
        return contact;
      }

      console.log(`❌ No contact found for: ${name}`);
      return null;

    } catch (error) {
      console.error('Error looking up contact:', error);
      return null;
    }
  }

  /**
   * Find multiple contacts by names
   * @param {string[]} names - Array of names to search
   * @returns {object[]} Array of contact info
   */
  async findContactsByNames(names) {
    if (!names || !Array.isArray(names)) return [];
    
    const contacts = [];
    for (const name of names) {
      const contact = await this.findContactByName(name);
      if (contact && contact.email) {
        contacts.push(contact);
      }
    }
    
    return contacts;
  }

  /**
   * Extract names from a message
   * @param {string} message - Message to extract names from
   * @returns {string[]} Array of potential names
   */
  extractNamesFromMessage(message) {
    const names = [];
    const lowerMessage = message.toLowerCase();
    
    // Common name patterns to look for
    const commonNames = ['leo', 'andy', 'alec', 'pascal', 'evan', 'christine', 'cole', 'james', 'sai'];
    
    for (const name of commonNames) {
      if (lowerMessage.includes(name)) {
        names.push(name);
      }
    }
    
    // Also look for capitalized words that might be names
    const words = message.split(/\s+/);
    for (const word of words) {
      if (word.length > 2 && /^[A-Z][a-z]+/.test(word)) {
        const cleanWord = word.replace(/[^a-zA-Z]/g, '').toLowerCase();
        if (!names.includes(cleanWord) && !['meeting', 'call', 'setup', 'create', 'schedule'].includes(cleanWord)) {
          names.push(cleanWord);
        }
      }
    }
    
    return [...new Set(names)]; // Remove duplicates
  }

  /**
   * Get all contacts from all tables (for reference)
   */
  async getAllContacts() {
    try {
      const [people, clients, leads] = await Promise.all([
        this.supabase.from('people').select('*'),
        this.supabase.from('clients').select('*'),
        this.supabase.from('leads').select('*')
      ]);

      return {
        people: people.data || [],
        clients: clients.data || [],
        leads: leads.data || []
      };
    } catch (error) {
      console.error('Error fetching all contacts:', error);
      return { people: [], clients: [], leads: [] };
    }
  }
}

module.exports = ContactLookupService;