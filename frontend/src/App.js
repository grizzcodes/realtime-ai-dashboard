  const loadEmails = async () => {
    setIsLoadingEmails(true);
    try {
      const response = await fetch('http://localhost:3001/api/gmail/latest?limit=25');
      const data = await response.json();
      setEmails(data.emails || []);
    } catch (error) {
      console.error('Failed to load emails:', error);
    } finally {
      setIsLoadingEmails(false);
    }
  };

  const loadMeetings = async () => {
    try {
      const response = await fetch('http://localhost:3001/api/fireflies/meetings');
      const data = await response.json();
      setMeetings(data.meetings || []);
    } catch (error) {
      console.error('Failed to load meetings:', error);
      // Add fallback data for testing
      setMeetings([
        {
          id: 'demo-1',
          title: 'Weekly Team Standup',
          date: new Date().toISOString(),
          duration: '30m',
          attendees: 5,
          actionItems: ['Review sprint goals', 'Update client on progress', 'Schedule design review']
        },
        {
          id: 'demo-2', 
          title: 'Client Discovery Call - TechCorp',
          date: new Date(Date.now() - 24*60*60*1000).toISOString(),
          duration: '45m',
          attendees: 3,
          actionItems: ['Send proposal draft', 'Schedule technical demo']
        }
      ]);
    }
  };