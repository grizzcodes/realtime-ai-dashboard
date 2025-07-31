// backend/src/services/supabaseService.js
const { createClient } = require('@supabase/supabase-js');
const { v4: uuidv4 } = require('uuid');

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

  // Helper function to clean task ID for UUID format
  cleanTaskId(taskId) {
    if (!taskId) return uuidv4();
    
    // If it's already a valid UUID, return it
    const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
    if (uuidRegex.test(taskId)) {
      return taskId;
    }
    
    // If it starts with "notion-", extract the UUID part
    if (taskId.startsWith('notion-')) {
      const uuidPart = taskId.replace('notion-', '');
      // Check if the remaining part is a valid UUID
      if (uuidRegex.test(uuidPart)) {
        return uuidPart;
      }
    }
    
    // If we can't extract a valid UUID, generate a new one
    return uuidv4();
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
      // Clean the task ID to ensure it's a valid UUID
      const cleanId = this.cleanTaskId(task.id);
      
      const { data, error } = await this.supabase
        .from('tasks')
        .upsert({
          id: cleanId,
          title: task.title || 'Untitled Task',
          source: task.source || 'notion',
          urgency: task.urgency || 3,
          status: task.status || 'pending',
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