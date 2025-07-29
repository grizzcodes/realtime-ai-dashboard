// backend/src/database/supabaseClient.js - Supabase integration
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
      return { success: false, error: 'Supabase not configured' };
    }

    try {
      const { data, error } = await this.client
        .from('tasks')
        .select('count', { count: 'exact', head: true });
      
      if (error) throw error;
      
      console.log('✅ Supabase connection successful');
      return { success: true, taskCount: data };
    } catch (error) {
      console.error('❌ Supabase connection failed:', error.message);
      return { success: false, error: error.message };
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
          summary: task.summary,
          source: task.source,
          urgency: task.urgency,
          category: task.category || 'task',
          status: task.status || 'pending',
          deadline: task.deadline,
          key_people: task.keyPeople || [],
          tags: task.tags || [],
          confidence: task.confidence || 0.8,
          ai_generated: task.aiGenerated || true,
          related_event_id: task.relatedEventId,
          created_at: task.created,
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

  async getTasks(limit = 20, status = null) {
    if (!this.client) {
      return { success: false, error: 'Supabase not configured' };
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

      return { success: true, tasks: data };
    } catch (error) {
      console.error('Database fetch error:', error);
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
}

module.exports = SupabaseService;