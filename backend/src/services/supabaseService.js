// backend/src/services/supabaseService.js
const { createClient } = require('@supabase/supabase-js');

class SupabaseService {
  constructor() {
    if (process.env.SUPABASE_URL && process.env.SUPABASE_ANON_KEY) {
      this.supabase = createClient(
        process.env.SUPABASE_URL,
        process.env.SUPABASE_ANON_KEY
      );
    } else {
      this.supabase = null;
    }
  }

  async testConnection() {
    if (!this.supabase) {
      return { success: false, error: 'Supabase not configured' };
    }

    try {
      const { data, error } = await this.supabase
        .from('tasks')
        .select('count(*)')
        .limit(1);

      if (error) throw error;

      return { success: true, message: 'Supabase connected successfully' };
    } catch (error) {
      return { success: false, error: error.message };
    }
  }

  // Store chat history for AI context
  async saveChatHistory(message, response, provider, context = {}) {
    if (!this.supabase) return { success: false, error: 'Supabase not configured' };

    try {
      const { data, error } = await this.supabase
        .from('chat_history')
        .insert({
          message,
          response,
          provider,
          context
        });

      if (error) throw error;
      return { success: true, data };
    } catch (error) {
      console.error('Failed to save chat history:', error);
      return { success: false, error: error.message };
    }
  }

  // Get recent chat history for AI context
  async getChatHistory(limit = 10) {
    if (!this.supabase) return { success: false, error: 'Supabase not configured' };

    try {
      const { data, error } = await this.supabase
        .from('chat_history')
        .select('*')
        .order('created_at', { ascending: false })
        .limit(limit);

      if (error) throw error;
      return { success: true, data: data.reverse() }; // Reverse to chronological order
    } catch (error) {
      return { success: false, error: error.message };
    }
  }

  // Store events for AI analysis
  async logEvent(source, type, data) {
    if (!this.supabase) return { success: false, error: 'Supabase not configured' };

    try {
      const { data: result, error } = await this.supabase
        .from('events')
        .insert({
          source,
          type,
          data
        });

      if (error) throw error;
      return { success: true, data: result };
    } catch (error) {
      console.error('Failed to log event:', error);
      return { success: false, error: error.message };
    }
  }

  // Get recent events for AI context
  async getRecentEvents(limit = 20) {
    if (!this.supabase) return { success: false, error: 'Supabase not configured' };

    try {
      const { data, error } = await this.supabase
        .from('events')
        .select('*')
        .order('processed_at', { ascending: false })
        .limit(limit);

      if (error) throw error;
      return { success: true, data };
    } catch (error) {
      return { success: false, error: error.message };
    }
  }

  // Store tasks for AI tracking
  async syncTask(task) {
    if (!this.supabase) return { success: false, error: 'Supabase not configured' };

    try {
      const { data, error } = await this.supabase
        .from('tasks')
        .upsert({
          id: task.id,
          title: task.title,
          source: task.source,
          urgency: task.urgency || 3,
          status: task.status,
          assignee: task.assignee,
          project: task.project,
          deadline: task.deadline,
          ai_confidence: task.aiGenerated ? 0.8 : 1.0
        }, { onConflict: 'id' });

      if (error) throw error;
      return { success: true, data };
    } catch (error) {
      console.error('Failed to sync task:', error);
      return { success: false, error: error.message };
    }
  }

  // Get AI context: recent tasks, events, and chat history
  async getAIContext() {
    if (!this.supabase) return { success: false, error: 'Supabase not configured' };

    try {
      const [tasks, events, chatHistory] = await Promise.all([
        this.supabase
          .from('tasks')
          .select('*')
          .order('updated_at', { ascending: false })
          .limit(10),
        this.supabase
          .from('events')
          .select('*')
          .order('processed_at', { ascending: false })
          .limit(10),
        this.supabase
          .from('chat_history')
          .select('*')
          .order('created_at', { ascending: false })
          .limit(5)
      ]);

      return {
        success: true,
        context: {
          recentTasks: tasks.data || [],
          recentEvents: events.data || [],
          chatHistory: (chatHistory.data || []).reverse(),
          timestamp: new Date().toISOString()
        }
      };
    } catch (error) {
      return { success: false, error: error.message };
    }
  }
}

module.exports = SupabaseService;