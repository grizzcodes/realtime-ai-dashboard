  const testIntegration = async (integrationName) => {
    try {
      let endpoint = '';
      switch (integrationName) {
        case 'Gmail':
          endpoint = '/api/gmail/emails';
          break;
        case 'Slack':
          endpoint = '/api/slack/messages';
          break;
        case 'Fireflies':
          endpoint = '/api/fireflies/transcripts';
          break;
        case 'Notion':
          endpoint = '/api/notion/pages';
          break;
        default:
          console.log(`No test endpoint for ${integrationName}`);
          return;
      }

      const response = await fetch(`http://localhost:3002${endpoint}`);
      const data = await response.json();
      
      if (data.success !== false && response.ok) {
        alert(`✅ ${integrationName} connection successful!`);
      } else {
        alert(`❌ ${integrationName} connection failed: ${data.error || 'Unknown error'}`);
      }
    } catch (error) {
      alert(`❌ ${integrationName} connection failed: ${error.message}`);
    }
    
    // Refresh API status
    loadApiStatus();
  };