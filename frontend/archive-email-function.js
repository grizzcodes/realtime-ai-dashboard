  const archiveEmail = async (emailId) => {
    try {
      console.log(`📧 Archiving email: ${emailId}`);
      
      const response = await fetch(`http://localhost:3002/api/gmail/archive/${emailId}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' }
      });
      
      const result = await response.json();
      
      if (result.success) {
        console.log('✅ Email archived successfully');
        // Remove email from local state immediately for better UX
        setEmails(prevEmails => prevEmails.filter(email => email.id !== emailId));
        // Also refresh the list to get updated data
        setTimeout(() => loadEmails(), 1000);
      } else {
        console.error('❌ Failed to archive email:', result.error);
        alert('Failed to archive email: ' + result.error);
      }
    } catch (error) {
      console.error('❌ Error archiving email:', error);
      alert('Error archiving email: ' + error.message);
    }
  };

  // Add this to useEffect to listen for email updates
  useEffect(() => {
    // ... existing useEffect code ...
    
    socketConnection.on('emailUpdate', (data) => {
      console.log('📧 Email update received:', data);
      loadEmails();
    });
    
    // ... rest of useEffect
  }, []);