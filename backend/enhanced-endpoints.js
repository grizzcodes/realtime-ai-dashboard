// Additional API endpoints for enhanced dashboard functionality

// Enhanced Notion tasks with people filter
app.get('/api/notion/tasks-filtered', async (req, res) => {
  try {
    const { person, status } = req.query;
    console.log(`📋 Fetching filtered tasks (person: ${person}, status: ${status})...`);
    
    const notionResult = await notionService.getFilteredTasks(person, status);
    
    if (notionResult.success) {
      res.json({
        success: true,
        tasks: notionResult.tasks || [],
        people: notionResult.people || [],
        statusOptions: notionResult.statusOptions || [],
        filters: { person, status }
      });
    } else {
      res.status(400).json({
        success: false,
        error: notionResult.error,
        tasks: []
      });
    }
  } catch (error) {
    console.error('❌ Failed to get filtered tasks:', error);
    res.status(500).json({
      success: false,
      error: error.message,
      tasks: []
    });
  }
});

// Calendar next meetings endpoint
app.get('/api/calendar/next-meetings', async (req, res) => {
  try {
    const limit = parseInt(req.query.limit) || 5;
    console.log(`📅 Fetching next ${limit} meetings...`);
    
    const calendarResult = await integrationService.getNextMeetings(limit);
    
    if (calendarResult.success) {
      res.json({
        success: true,
        meetings: calendarResult.meetings || [],
        count: calendarResult.meetings?.length || 0
      });
    } else {
      res.status(400).json({
        success: false,
        error: calendarResult.error,
        meetings: []
      });
    }
  } catch (error) {
    console.error('❌ Failed to get next meetings:', error);
    res.status(500).json({
      success: false,
      error: error.message,
      meetings: []
    });
  }
});