  async updateTaskStatus(notionPageId, status) {
    if (!this.notion) {
      return { success: false, error: 'Notion not configured' };
    }

    try {
      // Extract just the page ID without the 'notion-' prefix
      const cleanPageId = notionPageId.replace('notion-', '');
      
      console.log(`📝 Updating Notion task ${cleanPageId} to status: ${status}`);
      
      // Map our status to Notion status
      const notionStatus = status === 'completed' ? 'Done' : 'Not done yet';
      
      const response = await this.notion.pages.update({
        page_id: cleanPageId,
        properties: {
          'Status': {
            status: {
              name: notionStatus
            }
          }
        }
      });

      console.log(`✅ Task ${cleanPageId} updated to: ${notionStatus}`);
      
      return { 
        success: true, 
        page: response,
        newStatus: notionStatus
      };
    } catch (error) {
      console.error('❌ Failed to update Notion task:', error);
      return { 
        success: false, 
        error: `Failed to update task: ${error.message}` 
      };
    }
  }