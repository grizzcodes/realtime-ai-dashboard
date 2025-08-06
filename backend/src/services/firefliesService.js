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

  async makeGraphQLRequest(query) {
    try {
      const response = await fetch(this.baseUrl, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${this.apiKey}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({ query })
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
      const query = `
        query {
          transcripts(limit: ${limit}) {
            id
            title
            date
            duration
            meeting_url
            summary {
              overview
              keywords
              action_items
              outline
            }
            sentences(limit: 50) {
              text
              speaker_name
              start_time
            }
          }
        }
      `;

      const response = await this.makeGraphQLRequest(query);
      return { 
        success: true, 
        transcripts: response.data.transcripts || []
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
        query {
          transcript(id: "${transcriptId}") {
            id
            title
            date
            duration
            meeting_url
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
            participants {
              name
              email
            }
          }
        }
      `;

      const response = await this.makeGraphQLRequest(query);
      return { 
        success: true, 
        transcript: response.data.transcript 
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
      s.text.toLowerCase().includes('urgent') ||
      s.text.toLowerCase().includes('deadline') ||
      s.text.toLowerCase().includes('asap') ||
      s.text.toLowerCase().includes('priority')
    );

    return {
      title: transcript.title,
      actionItems,
      keywords,
      overview,
      urgentSentences,
      participants: transcript.participants?.map(p => p.name) || [],
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
      
      if (result.success) {
        const meetings = result.transcripts.map(t => ({
          id: t.id,
          title: t.title,
          date: t.date,
          duration: `${Math.round(t.duration / 60)}m`,
          attendees: t.participants ? t.participants.length : 0,
          actionItems: t.summary?.action_items || []
        }));

        return {
          success: true,
          meetings
        };
      } else {
        return {
          success: false,
          error: result.error,
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
}

module.exports = FirefliesService;
