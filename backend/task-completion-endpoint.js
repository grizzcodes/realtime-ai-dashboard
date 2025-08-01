// Add task completion endpoint

app.patch('/api/notion/task/:taskId/complete', async (req, res) => {
  try {
    const { taskId } = req.params;
    const { completed } = req.body;
    
    console.log(`📝 ${completed ? 'Completing' : 'Uncompleting'} task: ${taskId}`);
    
    const result = await notionService.updateTaskStatus(taskId, completed ? 'completed' : 'pending');
    
    if (result.success) {
      // Emit real-time update to all clients
      io.emit('taskUpdate', {
        type: 'task_status_updated',
        taskId: taskId,
        completed: completed,
        timestamp: new Date().toISOString()
      });
      
      res.json({
        success: true,
        message: `Task ${completed ? 'completed' : 'reopened'}`,
        taskId: taskId
      });
    } else {
      res.status(400).json({
        success: false,
        error: result.error
      });
    }
  } catch (error) {
    console.error('❌ Failed to update task:', error);
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});