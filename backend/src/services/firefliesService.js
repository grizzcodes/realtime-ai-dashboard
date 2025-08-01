// backend/src/services/firefliesService.js
const fetch = require('node-fetch');

class FirefliesService {
  constructor() {
    this.apiKey = process.env.FIREFLIES_API_KEY;
    this.baseUrl = 'https://api.fireflies.ai/graphql';
    console.log('🎙️ Fireflies service initialized');
  }

  async testConnection() {
    if (!this.apiKey) {
      return { success: false, error: 'Fireflies API key not configured' };
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

      const response = await fetch(this.baseUrl, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${this.apiKey}`
        },
        body: JSON.stringify({ query })
      });

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }

      const data = await response.json();
      
      if (data.errors) {
        throw new Error(`GraphQL error: ${data.errors[0].message}`);
      }

      console.log('✅ Fireflies connection successful:', data.data.user.name);
      return { 
        success: true, 
        message: `Connected: ${data.data.user.name}`,
        user: data.data.user 
      };
    } catch (error) {
      console.error('❌ Fireflies connection failed:', error.message);
      return { 
        success: false, 
        error: error.message 
      };
    }
  }

  async getRecentTranscripts(limit = 10) {
    if (!this.apiKey) {
      return { success: false, error: 'Fireflies API key not configured' };
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
            participants {
              name
              email
            }
            sentences(limit: 50) {
              text
              speaker_name
              start_time
            }
          }
        }
      `;

      const response = await fetch(this.baseUrl, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${this.apiKey}`
        },
        body: JSON.stringify({ query })
      });

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }

      const data = await response.json();
      
      if (data.errors) {
        throw new Error(`GraphQL error: ${data.errors[0].message}`);
      }

      return { 
        success: true, 
        transcripts: data.data.transcripts 
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
    if (!this.apiKey) {
      return { success: false, error: 'Fireflies API key not configured' };
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

      const response = await fetch(this.baseUrl, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${this.apiKey}`
        },
        body: JSON.stringify({ query })
      });

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }

      const data = await response.json();
      
      if (data.errors) {
        throw new Error(`GraphQL error: ${data.errors[0].message}`);
      }

      return { 
        success: true, 
        transcript: data.data.transcript 
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
}

module.exports = FirefliesService;