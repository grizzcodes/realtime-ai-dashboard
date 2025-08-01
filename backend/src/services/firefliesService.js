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