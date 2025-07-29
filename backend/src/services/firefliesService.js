// backend/src/services/firefliesService.js
class FirefliesService {
  constructor() {
    this.apiKey = process.env.FIREFLIES_API_KEY;
    this.baseUrl = 'https://api.fireflies.ai/graphql';
    this.initialized = false;
  }

  async initialize() {
    try {
      if (!this.apiKey) {
        console.log('⚠️ Fireflies not configured - missing API key');
        return { success: false, error: 'Missing Fireflies API key' };
      }

      this.initialized = true;
      console.log('✅ Fireflies service initialized');
      return { success: true };
    } catch (error) {
      console.error('❌ Fireflies initialization failed:', error.message);
      return { success: false, error: error.message };
    }
  }

  async testConnection() {
    if (!this.initialized) {
      await this.initialize();
    }

    if (!this.initialized) {
      return { success: false, error: 'Fireflies not initialized' };
    }

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
      return { 
        success: true, 
        user: response.data.user 
      };
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
        transcripts: response.data.transcripts 
      };
    } catch (error) {
      console.error('Failed to get recent transcripts:', error.message);
      return { 
        success: false, 
        error: error.message 
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

  async makeGraphQLRequest(query, variables = {}) {
    const response = await fetch(this.baseUrl, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${this.apiKey}`
      },
      body: JSON.stringify({
        query,
        variables
      })
    });

    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status}`);
    }

    const data = await response.json();
    
    if (data.errors) {
      throw new Error(`GraphQL error: ${data.errors[0].message}`);
    }

    return data;
  }

  // Helper to extract actionable content from transcript
  extractActionableContent(transcript) {
    const actionItems = transcript.summary?.action_items || [];
    const keywords = transcript.summary?.keywords || [];
    const overview = transcript.summary?.overview || '';

    // Find urgent/deadline mentions in transcript
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
}

module.exports = FirefliesService;