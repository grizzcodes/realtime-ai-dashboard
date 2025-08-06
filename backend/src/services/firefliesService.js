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
      console.log('📡 Making GraphQL request...');
      
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

  // Use 'mine' parameter to get user's own transcripts
  async getMyTranscripts(limit = 20) {
    if (!this.initialized) {
      await this.initialize();
    }

    try {
      // According to docs, use 'mine: true' to get transcripts for API key owner
      const query = `
        query GetMyTranscripts($limit: Int) {
          transcripts(mine: true, limit: $limit) {
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
              gist
              short_summary
            }
          }
        }
      `;

      console.log('🎙️ Fetching MY transcripts with mine:true');
      const response = await this.makeGraphQLRequest(query, { limit });
      
      console.log('📊 My transcripts response:', {
        hasData: !!response.data,
        transcriptsCount: response.data?.transcripts?.length || 0
      });
      
      return { 
        success: true, 
        transcripts: response.data?.transcripts || []
      };
    } catch (error) {
      console.error('Failed to get my transcripts:', error.message);
      return { 
        success: false, 
        error: error.message,
        transcripts: []
      };
    }
  }

  // Alternative: Use participant_email filter
  async getTranscriptsByEmail(email, limit = 20) {
    if (!this.initialized) {
      await this.initialize();
    }

    try {
      const query = `
        query GetTranscriptsByEmail($email: String, $limit: Int) {
          transcripts(participant_email: $email, limit: $limit) {
            id
            title
            date
            duration
            meeting_url
            host_email
            organizer_email
            participants
            summary {
              keywords
              action_items
              overview
            }
          }
        }
      `;

      console.log(`📧 Fetching transcripts for email: ${email}`);
      const response = await this.makeGraphQLRequest(query, { email, limit });
      
      return { 
        success: true, 
        transcripts: response.data?.transcripts || []
      };
    } catch (error) {
      console.error('Failed to get transcripts by email:', error.message);
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
              gist
              short_summary
            }
            sentences {
              text
              speaker_name
              start_time
            }
          }
        }
      `;

      console.log('📜 Fetching transcript with ID:', transcriptId);
      const response = await this.makeGraphQLRequest(query, { transcriptId });
      
      if (response.data?.transcript) {
        console.log('✅ Got transcript:', response.data.transcript.title);
        return { 
          success: true, 
          transcript: response.data.transcript 
        };
      } else {
        console.log('❌ No transcript data returned');
        return {
          success: false,
          error: 'No transcript data',
          transcript: null
        };
      }
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
      console.log('🎯 Getting meetings using mine:true parameter...');
      
      // Use the mine:true parameter
      const result = await this.getMyTranscripts(20);
      
      // If that doesn't work, try with user's email
      if (!result.transcripts || result.transcripts.length === 0) {
        console.log('⚠️ No transcripts with mine:true, trying with email...');
        
        const userResult = await this.getUserRecentMeeting();
        if (userResult.success && userResult.user?.email) {
          const emailResult = await this.getTranscriptsByEmail(userResult.user.email, 20);
          if (emailResult.success && emailResult.transcripts.length > 0) {
            result.transcripts = emailResult.transcripts;
          }
        }
      }
      
      console.log('🎙️ getMeetings final result:', {
        success: result.success,
        transcriptsCount: result.transcripts?.length || 0
      });
      
      if (result.success && result.transcripts && result.transcripts.length > 0) {
        const meetings = result.transcripts.map(t => {
          // Parse the date properly (Fireflies returns timestamp in milliseconds)
          const meetingDate = t.date ? new Date(parseInt(t.date)) : new Date();
          
          return {
            id: t.id,
            title: t.title || 'Untitled Meeting',
            date: meetingDate.toISOString(),
            dateFormatted: meetingDate.toLocaleDateString(),
            timeFormatted: meetingDate.toLocaleTimeString(),
            duration: t.duration ? `${Math.round(t.duration / 60)}m` : 'N/A',
            attendees: Array.isArray(t.participants) ? t.participants.length : 0,
            participants: t.participants || [],
            actionItems: t.summary?.action_items || [],
            overview: t.summary?.overview || t.summary?.gist || t.summary?.short_summary || '',
            keywords: t.summary?.keywords || [],
            host: t.host_email || t.organizer_email || 'Unknown',
            meetingUrl: t.meeting_url || '#'
          };
        });

        // Sort by date, most recent first
        meetings.sort((a, b) => new Date(b.date) - new Date(a.date));

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
          email: response.data.user.email,
          transcripts: response.data.user.num_transcripts,
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
}

module.exports = FirefliesService;
