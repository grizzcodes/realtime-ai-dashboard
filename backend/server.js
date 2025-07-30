app.put('/api/tasks/:id/status', async (req, res) => {
  try {
    const { id } = req.params;
    const { status } = req.body;
    
    const updatedTask = await aiProcessor.updateTaskStatus(id, status);
    
    if (updatedTask) {
      // If this is a Notion task, sync the status back to Notion
      if (updatedTask.source === 'notion' && updatedTask.notionId) {
        try {
          await notionService.updateTaskStatus(updatedTask.notionId, status);
          console.log(`📝 Synced status "${status}" back to Notion for task: ${updatedTask.title}`);
        } catch (error) {
          console.error('⚠️ Failed to sync status to Notion:', error.message);
        }
      }
      
      io.emit('taskUpdated', updatedTask);
      res.json({ success: true, task: updatedTask });
    } else {
      res.status(404).json({ success: false, error: 'Task not found' });
    }
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});