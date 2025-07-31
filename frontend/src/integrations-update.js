  const integrations = [
    { 
      name: 'OpenAI', 
      icon: '🤖', 
      description: 'GPT AI processing', 
      status: apiStatus.openai?.success ? 'connected' : 'error',
      category: 'ai'
    },
    { 
      name: 'Claude', 
      icon: '🧠', 
      description: 'Anthropic AI assistant', 
      status: apiStatus.claude?.success ? 'connected' : 'error',
      category: 'ai'
    },
    { 
      name: 'Gmail', 
      icon: '📧', 
      description: 'Email monitoring', 
      status: apiStatus.gmail?.success ? 'connected' : 'error',
      category: 'communication'
    },
    { 
      name: 'Slack', 
      icon: '💬', 
      description: 'Team communication', 
      status: apiStatus.slack?.success ? 'connected' : 'error',
      category: 'communication'
    },
    { 
      name: 'Calendar', 
      icon: '📅', 
      description: 'Schedule management', 
      status: apiStatus.calendar?.success ? 'connected' : 'error',
      category: 'productivity'
    },
    { 
      name: 'Fireflies', 
      icon: '🎙️', 
      description: 'Meeting transcripts', 
      status: apiStatus.fireflies?.success ? 'connected' : 'error',
      category: 'meetings'
    },
    { 
      name: 'Notion', 
      icon: '📝', 
      description: 'Task management', 
      status: apiStatus.notion?.success ? 'connected' : 'error',
      category: 'productivity'
    },
    { 
      name: 'Supabase', 
      icon: '🗄️', 
      description: 'Database & AI context', 
      status: apiStatus.supabase?.success ? 'connected' : 'error',
      category: 'database'
    }
  ];