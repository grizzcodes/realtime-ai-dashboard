// backend/notion-task-mapping-fix.js
// Add this to your backend to fix the Notion task mapping

// In your Notion service or API endpoint that returns tasks, ensure proper field mapping
app.get('/api/notion/tasks', async (req, res) => {
  try {
    const result = await notionService.getTasks();
    
    if (result.success) {
      // Map the backend fields to frontend expected fields
      const mappedTasks = result.tasks.map(task => ({
        ...task,
        // Map 'assignee' to 'assignedTo' for frontend compatibility
        assignedTo: task.assignee || task.keyPeople?.[0] || 'Unassigned',
        // Keep the original assignee field too
        assignee: task.assignee,
        // Map deadline to dueDate
        dueDate: task.deadline || task.dueDate,
        // Ensure other fields are properly mapped
        title: task.title || task.name,
        priority: task.priority,
        status: task.status,
        project: task.project,
        id: task.id,
        notionId: task.notionId
      }));
      
      res.json({
        success: true,
        tasks: mappedTasks,
        statusOptions: result.statusOptions,
        databaseId: result.databaseId,
        summary: result.summary
      });
    } else {
      res.json(result);
    }
  } catch (error) {
    console.error('Error fetching Notion tasks:', error);
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

console.log('✅ Notion task mapping fix applied');
