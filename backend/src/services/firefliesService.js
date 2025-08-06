// backend/src/services/firefliesService.js
const fetch = require('node-fetch');

class FirefliesService {
  constructor() {
    this.apiKey = process.env.FIREFLIES_API_KEY || '3a4ccfdb-d221-493c-bb75-36447b54c4dd';
    this.baseUrl = 'https://api.fireflies.ai/graphql';
    this.initialized = false;
  }

  async initialize() {
    try {
      if (!this.apiKey) {
        console.log('⚠️ Fireflies not configured - missing API key');
        return { success: false, error: 'Missing Fireflies API key' };
      }

      const testResult = await this.testConnection();
      if (testResult.success) {
        this.initialized = true;
        console.log('✅ Fireflies service initialized');
        return { success: true };
      } else {
        console.error('❌ Fireflies initialization failed:', testResult.error);
        return testResult;
      }
    } catch (error) {
      console.error('❌ Fireflies initialization failed:', error.message);
      return { success: false, error: error.message };
    }
  }

  async makeGraphQLRequest(query, variables = {}) {
    try {
      console.log('📡 Making GraphQL request with variables:', variables);
      
      const response = await fetch(this.baseUrl, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${this.apiKey}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({ 
          query,
          variables 
        })
      });

      const data = await response.json();
      
      if (data.errors) {
        console.error('❌ GraphQL errors:', data.errors);
        throw new Error(data.errors[0].message);
      }

      return data;
    } catch (error) {
      console.error('GraphQL request failed:', error.message);
      throw error;
    }
  }

  async testConnection() {
    try {
      const query = `
        query {
          user {
            user_id
            name
            email
          }
        }
      `;

      const response = await this.makeGraphQLRequest(query);
      
      if (response.data && response.data.user) {
        return { 
          success: true, 
          message: `Connected: ${response.data.user.name}`,
          user: response.data.user 
        };
      } else {
        return { 
          success: false, 
          error: 'No user data received'
        };
      }
    } catch (error) {
      console.error('Fireflies connection test failed:', error.message);
      return { 
        success: false, 
        error: error.message 
      };
    }
  }

  async getRecentTranscripts(limit = 10, skip = 0) {
    if (!this.initialized) {
      await this.initialize();
    }

    try {
      // Use simpler query first to see what we get
      const query = `
        query GetTranscripts($limit: Int, $skip: Int) {
          transcripts(limit: $limit, skip: $skip) {
            id
            title
            date
            duration
            meeting_url
            host_email
            organizer_email
            participants
            fireflies_users
            summary {
              keywords
              action_items
              outline
              shorthand_bullet
              overview
            }
          }
        }
      `;

      console.log('🎙️ Fetching transcripts with limit:', limit, 'skip:', skip);
      const response = await this.makeGraphQLRequest(query, { limit, skip });
      
      console.log('📊 Transcripts response:', {
        hasData: !!response.data,
        transcriptsCount: response.data?.transcripts?.length || 0,
        firstTranscript: response.data?.transcripts?.[0]?.title || 'none'
      });
      
      return { 
        success: true, 
        transcripts: response.data?.transcripts || []
      };
    } catch (error) {
      console.error('Failed to get recent transcripts:', error.message);
      return { 
        success: false, 
        error: error.message,
        transcripts: []
      };
    }
  }

  async getTranscriptById(transcriptId) {
    if (!this.initialized) {
      await this.initialize();
    }

    try {
      // Simpler query to start
      const query = `
        query GetTranscript($transcriptId: String!) {
          transcript(id: $transcriptId) {
            id
            title
            date
            duration
            meeting_url
            host_email
            organizer_email
            participants
            fireflies_users
            summary {
              overview
              keywords
              action_items
              outline
              shorthand_bullet
            }
          }
        }
      `;

      console.log('📜 Fetching transcript with ID:', transcriptId);
      const response = await this.makeGraphQLRequest(query, { transcriptId });
      
      console.log('📊 Transcript response:', {
        hasData: !!response.data,
        hasTranscript: !!response.data?.transcript,
        title: response.data?.transcript?.title || 'none'
      });
      
      return { 
        success: true, 
        transcript: response.data?.transcript 
      };
    } catch (error) {
      console.error('Failed to get transcript:', error.message);
      return { 
        success: false, 
        error: error.message 
      };
    }
  }

  async getMeetings() {
    if (!this.initialized) {
      await this.initialize();
    }

    try {
      // Try multiple approaches to get meetings
      console.log('🎯 Attempting to fetch meetings...');
      
      // First try with no parameters
      let result = await this.getRecentTranscripts(20, 0);
      
      // If no transcripts, try with different parameters
      if (!result.transcripts || result.transcripts.length === 0) {
        console.log('⚠️ No transcripts with default query, trying user-specific query...');
        
        // Try getting user's recent transcript directly
        const userResult = await this.getUserRecentMeeting();
        if (userResult.success && userResult.user?.recent_transcript) {
          const transcriptResult = await this.getTranscriptById(userResult.user.recent_transcript);
          if (transcriptResult.success && transcriptResult.transcript) {
            result.transcripts = [transcriptResult.transcript];
          }
        }
      }
      
      console.log('🎙️ getMeetings final result:', {
        success: result.success,
        transcriptsCount: result.transcripts?.length || 0
      });
      
      if (result.success && result.transcripts && result.transcripts.length > 0) {
        const meetings = result.transcripts.map(t => {
          // Parse the date properly
          const meetingDate = t.date ? new Date(parseInt(t.date)) : new Date();
          
          return {
            id: t.id,
            title: t.title || 'Untitled Meeting',
            date: meetingDate.toISOString(),
            dateFormatted: meetingDate.toLocaleDateString(),
            duration: t.duration ? `${Math.round(t.duration / 60)}m` : 'N/A',
            attendees: Array.isArray(t.participants) ? t.participants.length : 0,
            participants: t.participants || [],
            actionItems: t.summary?.action_items || [],
            overview: t.summary?.overview || t.summary?.shorthand_bullet || '',
            keywords: t.summary?.keywords || [],
            host: t.host_email || t.organizer_email || 'Unknown',
            meetingUrl: t.meeting_url || '#'
          };
        });

        return {
          success: true,
          meetings
        };
      } else {
        return {
          success: false,
          error: result.error || 'No transcripts found',
          meetings: []
        };
      }
    } catch (error) {
      console.error('Failed to get meetings:', error);
      return {
        success: false,
        error: error.message,
        meetings: []
      };
    }
  }

  async getUserRecentMeeting() {
    try {
      const query = `
        query {
          user {
            user_id
            email
            name
            recent_transcript
            recent_meeting
            num_transcripts
            minutes_consumed
          }
        }
      `;

      const response = await this.makeGraphQLRequest(query);
      
      if (response.data?.user) {
        console.log('👤 User data:', {
          name: response.data.user.name,
          transcripts: response.data.user.num_transcripts,
          recentMeeting: response.data.user.recent_meeting,
          recentTranscript: response.data.user.recent_transcript
        });
        
        return {
          success: true,
          user: response.data.user
        };
      }
      
      return {
        success: false,
        error: 'No user data found'
      };
    } catch (error) {
      console.error('Failed to get user data:', error);
      return {
        success: false,
        error: error.message
      };
    }
  }

  // Alternative method using user_id filter
  async getUserTranscripts(userId, limit = 10) {
    try {
      const query = `
        query GetUserTranscripts($userId: String, $limit: Int) {
          transcripts(user_id: $userId, limit: $limit) {
            id
            title
            date
            duration
            meeting_url
            participants
            summary {
              action_items
              overview
              keywords
            }
          }
        }
      `;

      console.log('🔍 Fetching transcripts for user:', userId);
      const response = await this.makeGraphQLRequest(query, { userId, limit });
      
      return {
        success: true,
        transcripts: response.data?.transcripts || []
      };
    } catch (error) {
      console.error('Failed to get user transcripts:', error);
      return {
        success: false,
        error: error.message,
        transcripts: []
      };
    }
  }
}

module.exports = FirefliesService;
