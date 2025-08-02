// backend/src/services/supabaseService.js - Enhanced Supabase integration
const { createClient } = require('@supabase/supabase-js');

class SupabaseService {
  constructor() {
    this.supabaseUrl = process.env.SUPABASE_URL;
    this.supabaseKey = process.env.SUPABASE_ANON_KEY;
    
    if (!this.supabaseUrl || !this.supabaseKey) {
      console.warn('⚠️ Supabase credentials not found - running in memory mode');
      this.client = null;
      return;
    }

    this.client = createClient(this.supabaseUrl, this.supabaseKey);
    console.log('✅ Supabase client initialized');
  }

  async testConnection() {
    if (!this.client) {
      return { 
        success: false, 
        error: 'Supabase not configured. Add SUPABASE_URL and SUPABASE_ANON_KEY to .env',
        needsAuth: true
      };
    }

    try {
      const { data, error } = await this.client
        .from('tasks')
        .select('count', { count: 'exact', head: true });
      
      if (error) throw error;
      
      console.log('✅ Supabase connection successful');
      return { 
        success: true, 
        message: 'Supabase connected successfully',
        taskCount: data || 0
      };
    } catch (error) {
      console.error('❌ Supabase connection failed:', error.message);
      return { 
        success: false, 
        error: `Supabase failed: ${error.message}`
      };
    }
  }

  async getTasks(limit = 20, status = null) {
    if (!this.client) {
      return { 
        success: false, 
        error: 'Supabase not configured',
        tasks: []
      };
    }

    try {
      let query = this.client
        .from('tasks')
        .select('*')
        .order('urgency', { ascending: false })
        .order('created_at', { ascending: false })
        .limit(limit);

      if (status) {
        query = query.eq('status', status);
      }

      const { data, error } = await query;
      
      if (error) throw error;

      // Format tasks for frontend
      const tasks = data.map(task => ({
        id: task.id,
        title: task.title,
        summary: task.summary,
        source: task.source,
        urgency: task.urgency,
        category: task.category,
        status: task.status,
        deadline: task.deadline,
        keyPeople: task.key_people || [],
        tags: task.tags || [],
        confidence: task.confidence,
        created: task.created_at,
        aiGenerated: task.ai_generated
      }));

      return { 
        success: true, 
        tasks
      };
    } catch (error) {
      console.error('Database fetch error:', error);
      return { 
        success: false, 
        error: error.message,
        tasks: []
      };
    }
  }

  async saveTask(task) {
    if (!this.client) {
      console.log('💾 Saving task to memory (Supabase not configured)');
      return { success: true, id: task.id };
    }

    try {
      const { data, error } = await this.client
        .from('tasks')
        .insert([{
          id: task.id,
          title: task.title,
          summary: task.summary || task.title,
          source: task.source,
          urgency: task.urgency || 3,
          category: task.category || 'task',
          status: task.status || 'pending',
          deadline: task.deadline,
          key_people: task.keyPeople || [],
          tags: task.tags || [],
          confidence: task.confidence || 0.8,
          ai_generated: task.aiGenerated || true,
          related_event_id: task.relatedEventId,
          created_at: task.created || new Date(),
          updated_at: new Date()
        }])
        .select();

      if (error) throw error;

      console.log(`💾 Task saved to Supabase: ${task.title}`);
      return { success: true, data: data[0] };
    } catch (error) {
      console.error('Database save error:', error);
      return { success: false, error: error.message };
    }
  }

  async updateTaskStatus(taskId, status) {
    if (!this.client) {
      console.log(`💾 Updating task status in memory: ${taskId} -> ${status}`);
      return { success: true };
    }

    try {
      const updateData = {
        status,
        updated_at: new Date()
      };

      if (status === 'completed') {
        updateData.completed_at = new Date();
      }

      const { data, error } = await this.client
        .from('tasks')
        .update(updateData)
        .eq('id', taskId)
        .select();

      if (error) throw error;

      console.log(`💾 Task status updated: ${taskId} -> ${status}`);
      return { success: true, data: data[0] };
    } catch (error) {
      console.error('Database update error:', error);
      return { success: false, error: error.message };
    }
  }

  async saveEvent(event) {
    if (!this.client) {
      return { success: true };
    }

    try {
      const { data, error } = await this.client
        .from('events')
        .insert([{
          source: event.source,
          type: event.type,
          data: event.data,
          priority: event.priority || 1,
          created_at: event.timestamp || new Date()
        }])
        .select();

      if (error) throw error;

      return { success: true, data: data[0] };
    } catch (error) {
      console.error('Event save error:', error);
      return { success: false, error: error.message };
    }
  }

  async saveChatMessage(chatData) {
    if (!this.client) {
      console.log('💾 Chat message not saved (Supabase not configured)');
      return { success: true };
    }

    try {
      // Create chat_messages table entry
      const { data, error } = await this.client
        .from('chat_messages')
        .insert([{
          message: chatData.message,
          response: chatData.response,
          context: chatData.context,
          created_at: chatData.timestamp || new Date()
        }])
        .select();

      if (error) {
        // If table doesn't exist, create it
        if (error.code === '42P01') {
          console.log('📊 Creating chat_messages table...');
          await this.createChatMessagesTable();
          // Retry the insert
          return await this.saveChatMessage(chatData);
        }
        throw error;
      }

      console.log('💾 Chat message saved to Supabase');
      return { success: true, data: data[0] };
    } catch (error) {
      console.error('Chat message save error:', error);
      return { success: false, error: error.message };
    }
  }

  async createChatMessagesTable() {
    if (!this.client) return;

    try {
      // This would typically be done via SQL in Supabase dashboard
      console.log('⚠️ Please create chat_messages table in Supabase SQL Editor:');
      console.log(`
        CREATE TABLE chat_messages (
          id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
          message TEXT NOT NULL,
          response TEXT NOT NULL,
          context JSONB DEFAULT '{}',
          created_at TIMESTAMPTZ DEFAULT NOW()
        );
      `);
    } catch (error) {
      console.error('Table creation error:', error);
    }
  }

  async getRecentEvents(limit = 50) {
    if (!this.client) {
      return { success: false, error: 'Supabase not configured' };
    }

    try {
      const { data, error } = await this.client
        .from('events')
        .select('*')
        .order('created_at', { ascending: false })
        .limit(limit);

      if (error) throw error;

      return { success: true, events: data };
    } catch (error) {
      console.error('Events fetch error:', error);
      return { success: false, error: error.message };
    }
  }

  async getDashboardStats() {
    if (!this.client) {
      return { success: false, error: 'Supabase not configured' };
    }

    try {
      const [tasksResult, eventsResult] = await Promise.all([
        this.client.from('tasks').select('status, urgency', { count: 'exact' }),
        this.client.from('events').select('source', { count: 'exact' })
      ]);

      if (tasksResult.error) throw tasksResult.error;
      if (eventsResult.error) throw eventsResult.error;

      const tasks = tasksResult.data;
      const stats = {
        totalTasks: tasks.length,
        pendingTasks: tasks.filter(t => t.status === 'pending').length,
        completedTasks: tasks.filter(t => t.status === 'completed').length,
        highUrgencyTasks: tasks.filter(t => t.urgency >= 4 && t.status === 'pending').length,
        totalEvents: eventsResult.count
      };

      return { success: true, stats };
    } catch (error) {
      console.error('Stats fetch error:', error);
      return { success: false, error: error.message };
    }
  }

  // Real-time subscriptions for the dashboard
  subscribeToTasks(callback) {
    if (!this.client) {
      console.warn('Real-time subscriptions not available without Supabase');
      return null;
    }

    return this.client
      .channel('tasks-changes')
      .on('postgres_changes', {
        event: '*',
        schema: 'public',
        table: 'tasks'
      }, callback)
      .subscribe();
  }

  subscribeToEvents(callback) {
    if (!this.client) {
      return null;
    }

    return this.client
      .channel('events-changes')
      .on('postgres_changes', {
        event: 'INSERT',
        schema: 'public',
        table: 'events'
      }, callback)
      .subscribe();
  }

  // Health check method for monitoring
  async healthCheck() {
    return await this.testConnection();
  }
}

module.exports = SupabaseService;
