// Notion sync endpoint
app.post('/api/notion/sync', async (req, res) => {
  try {
    console.log('📝 Notion sync requested...');
    console.log('🔑 API Key present:', !!process.env.NOTION_API_KEY);
    console.log('🆔 Database ID:', process.env.NOTION_DATABASE_ID);
    
    const notionResult = await notionService.getTasks();
    console.log('📋 Notion result:', notionResult);
    
    if (!notionResult.success) {
      console.error('❌ Notion sync failed:', notionResult.error);
      return res.status(400).json({
        success: false,
        error: notionResult.error,
        debug: {
          hasApiKey: !!process.env.NOTION_API_KEY,
          databaseId: process.env.NOTION_DATABASE_ID
        }
      });
    }

    // Add Notion tasks to AI processor
    let importedCount = 0;
    for (const task of notionResult.tasks) {
      aiProcessor.tasks.set(task.id, task);
      importedCount++;
    }

    console.log(`📋 Imported ${importedCount} tasks from Notion`);
    
    // Emit to all connected clients
    io.emit('notionSync', { 
      tasksImported: importedCount,
      tasks: notionResult.tasks 
    });

    res.json({
      success: true,
      message: 'Notion sync completed',
      tasksImported: importedCount,
      tasks: notionResult.tasks
    });
  } catch (error) {
    console.error('❌ Notion sync failed:', error);
    res.status(500).json({
      success: false,
      error: error.message,
      stack: error.stack
    });
  }
});