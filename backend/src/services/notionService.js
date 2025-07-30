  async getTasks() {
    if (!this.notion) {
      return { success: false, error: 'Notion not configured' };
    }

    if (!this.databaseId) {
      return { success: false, error: 'NOTION_DATABASE_ID not set in .env file' };
    }

    try {
      console.log(`📝 Querying Notion database: ${this.databaseId}`);
      
      // First, let's try to get database info to verify access
      try {
        const dbInfo = await this.notion.databases.retrieve({
          database_id: this.databaseId
        });
        console.log(`✅ Database found: "${dbInfo.title[0]?.plain_text || 'Untitled'}"`);
      } catch (dbError) {
        console.error('❌ Database access error:', dbError.message);
        if (dbError.code === 'object_not_found') {
          return { 
            success: false, 
            error: `Database not found. Please check: 1) Database ID is correct: ${this.databaseId} 2) Database is shared with your integration 3) Integration has read permissions`
          };
        }
        throw dbError;
      }
      
      const response = await this.notion.databases.query({
        database_id: this.databaseId,
        sorts: [
          {
            property: 'Due date',
            direction: 'ascending'
          }
        ]
      });

      console.log(`📋 Found ${response.results.length} pages in Notion`);
      const tasks = response.results.map(page => this.parseNotionPage(page));
      
      // Filter out tasks that are "Done"
      const activeTasks = tasks.filter(task => task.status !== 'Done');
      console.log(`✅ ${activeTasks.length} active tasks after filtering`);
      
      return { success: true, tasks: activeTasks, databaseId: this.databaseId };
    } catch (error) {
      console.error('❌ Notion API error:', error);
      return { 
        success: false, 
        error: `Notion sync failed: ${error.message}. Check that your database is shared with the integration.`
      };
    }
  }