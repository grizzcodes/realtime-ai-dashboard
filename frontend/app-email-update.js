  const [emails, setEmails] = useState([]);

  useEffect(() => {
    // Initialize WebSocket connection
    const socketConnection = io('http://localhost:3002');
    setSocket(socketConnection);
    
    socketConnection.on('connect', () => {
      console.log('✅ Connected to backend');
      setIsConnected(true);
    });
    
    socketConnection.on('disconnect', () => {
      console.log('❌ Disconnected from backend');
      setIsConnected(false);
    });

    socketConnection.on('taskUpdate', (data) => {
      console.log('📋 Task update received:', data);
      loadTasks();
    });

    socketConnection.on('notionUpdate', (data) => {
      console.log('📝 Notion update received:', data);
      loadTasks();
    });

    socketConnection.on('firefliesUpdate', (data) => {
      console.log('🎙️ Fireflies update received:', data);
      loadMeetings();
    });
    
    // Load initial data
    loadTasks();
    loadApiStatus();
    loadMeetings();
    loadEmails();
      
    return () => {
      if (socketConnection) {
        socketConnection.close();
      }
    };
  }, []);

  const loadEmails = async () => {
    try {
      console.log('📧 Loading latest emails...');
      const response = await fetch('http://localhost:3002/api/gmail/latest');
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