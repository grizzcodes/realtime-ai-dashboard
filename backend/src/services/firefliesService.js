// backend/src/services/firefliesService.js
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

      // Test the connection
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

  async getRecentTranscripts(limit = 10) {
    if (!this.initialized) {
      await this.initialize();
    }

    try {
      // Updated query based on Fireflies docs - using proper fields
      const query = `
        query Transcripts($limit: Int) {
          transcripts(limit: $limit) {
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
            user {
              user_id
              email
              name
            }
          }
        }
      `;

      const response = await this.makeGraphQLRequest(query, { limit });
      
      console.log('📊 Transcripts response:', {
        hasData: !!response.data,
        transcriptsCount: response.data?.transcripts?.length || 0
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
      const query = `
        query Transcript($transcriptId: String!) {
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
            sentences {
              text
              speaker_name
              start_time
              end_time
            }
            speakers {
              id
              name
            }
            user {
              user_id
              email
              name
            }
          }
        }
      `;

      const response = await this.makeGraphQLRequest(query, { transcriptId });
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

  extractActionableContent(transcript) {
    const actionItems = transcript.summary?.action_items || [];
    const keywords = transcript.summary?.keywords || [];
    const overview = transcript.summary?.overview || '';

    const sentences = transcript.sentences || [];
    const urgentSentences = sentences.filter(s => 
      s.text?.toLowerCase().includes('urgent') ||
      s.text?.toLowerCase().includes('deadline') ||
      s.text?.toLowerCase().includes('asap') ||
      s.text?.toLowerCase().includes('priority')
    );

    return {
      title: transcript.title,
      actionItems,
      keywords,
      overview,
      urgentSentences,
      participants: transcript.participants || [],
      duration: transcript.duration,
      meetingUrl: transcript.meeting_url
    };
  }

  async getMeetings() {
    if (!this.initialized) {
      await this.initialize();
    }

    try {
      const result = await this.getRecentTranscripts(10);
      
      console.log('🎙️ getMeetings result:', {
        success: result.success,
        transcriptsCount: result.transcripts?.length || 0
      });
      
      if (result.success && result.transcripts && result.transcripts.length > 0) {
        const meetings = result.transcripts.map(t => ({
          id: t.id,
          title: t.title || 'Untitled Meeting',
          date: t.date,
          duration: t.duration ? `${Math.round(t.duration / 60)}m` : 'N/A',
          attendees: t.participants?.length || 0,
          actionItems: t.summary?.action_items || [],
          overview: t.summary?.overview || '',
          keywords: t.summary?.keywords || [],
          host: t.host_email || t.organizer_email || 'Unknown'
        }));

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

  // Get user's recent meeting
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
}

module.exports = FirefliesService;
