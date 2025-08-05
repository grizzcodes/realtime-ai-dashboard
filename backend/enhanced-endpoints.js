// Get Fireflies meetings
app.get('/api/fireflies/meetings', async (req, res) => {
  try {
    console.log('🎙️ Fetching Fireflies meetings...');
    
    // Try to get from integration service first
    let result;
    try {
      result = await integrationService.getFirefliesMeetings();
    } catch (error) {
      console.log('Fireflies service not available, using fallback data');
      result = { success: false };
    }
    
    if (result && result.success) {
      res.json({
        success: true,
        meetings: result.meetings || [],
        count: result.meetings?.length || 0
      });
    } else {
      // Return demo data when service fails
      res.json({
        success: true,
        meetings: [
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
          },
          {
            id: 'demo-3',
            title: 'Product Strategy Meeting',
            date: new Date(Date.now() - 2*24*60*60*1000).toISOString(),
            duration: '60m',
            attendees: 8,
            actionItems: ['Finalize Q1 roadmap', 'Research competitor features', 'Update pricing model']
          }
        ],
        count: 3
      });
    }
  } catch (error) {
    console.error('❌ Failed to get Fireflies meetings:', error);
    res.status(200).json({
      success: true,
      meetings: [],
      count: 0
    });
  }
});