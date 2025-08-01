  const loadEmails = async () => {
    try {
      console.log('📧 Loading latest 10 emails...');
      const response = await fetch('http://localhost:3002/api/gmail/latest?limit=10');
      const data = await response.json();
      
      if (data.success) {
        setEmails(data.emails || []);
        console.log(`✅ Loaded ${data.emails?.length || 0} emails`);
      } else {
        console.log('⚠️ Gmail not configured:', data.error);
        setEmails([]);
      }
    } catch (error) {
      console.error('❌ Failed to load emails:', error);
      setEmails([]);
    }
  };