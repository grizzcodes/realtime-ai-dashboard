  async getFilteredTasks(person = null, status = null) {
    if (!this.notion) {
      return { success: false, error: 'Notion not configured - add NOTION_API_KEY to .env' };
    }

    if (!this.databaseId) {
      return { success: false, error: 'Database ID not set - add NOTION_DATABASE_ID to .env' };
    }

    try {
      console.log(`📋 Fetching filtered tasks (person: ${person}, status: ${status})...`);
      
      // Build filter
      let filter = {};
      
      if (status === 'todo') {
        filter = {
          property: 'Status',
          status: { does_not_equal: 'Done' }
        };
      } else if (status === 'done') {
        filter = {
          property: 'Status', 
          status: { equals: 'Done' }
        };
      }
      
      if (person) {
        const personFilter = {
          property: 'Assigned',
          people: { contains: person }
        };
        
        if (Object.keys(filter).length > 0) {
          filter = {
            and: [filter, personFilter]
          };
        } else {
          filter = personFilter;
        }
      }
      
      const response = await this.notion.databases.query({
        database_id: this.databaseId,
        filter: Object.keys(filter).length > 0 ? filter : undefined,
        sorts: [
          { property: 'Due', direction: 'ascending' },
          { property: 'Priority', direction: 'ascending' }
        ],
        page_size: 100
      });

      // Get database info for parsing
      const dbInfo = await this.notion.databases.retrieve({
        database_id: this.databaseId
      });
      
      const tasks = response.results.map(page => this.parseNotionPage(page, dbInfo.properties));
      
      // Get all unique people for filter dropdown
      const allPeople = new Set();
      tasks.forEach(task => {
        task.assignedUsers?.forEach(user => allPeople.add(user.name));
      });
      
      return {
        success: true,
        tasks,
        people: Array.from(allPeople),
        statusOptions: this.statusOptions || [],
        count: tasks.length
      };
      
    } catch (error) {
      console.error('❌ Failed to get filtered tasks:', error);
      return { success: false, error: error.message };
    }
  }