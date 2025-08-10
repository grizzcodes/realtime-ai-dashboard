// backend/src/services/notionService.js - Fixed for your database structure
const { Client } = require('@notionhq/client');

class NotionService {
  constructor() {
    this.notion = null;
    this.databaseId = process.env.NOTION_DATABASE_ID || '4edf1722-ef48-4cbc-988d-ed770d281f9b';
    this.statusOptions = [];
    
    if (process.env.NOTION_API_KEY) {
      this.notion = new Client({
        auth: process.env.NOTION_API_KEY,
      });
      console.log('✅ NotionService initialized with API key');
    } else {
      console.log('⚠️ NotionService: No API key found');
    }
  }

  async testConnection() {
    if (!this.notion) {
      return { 
        success: false, 
        error: 'Notion API key not configured' 
      };
    }

    try {
      const response = await this.notion.users.me();
      
      // Also test database access
      const database = await this.notion.databases.retrieve({
        database_id: this.databaseId
      });
      
      return {
        success: true,
        message: `Connected to Notion database: ${database.title[0]?.plain_text || 'Untitled'}`,
        databaseId: this.databaseId
      };
    } catch (error) {
      return {
        success: false,
        error: error.message
      };
    }
  }

  async getTasks() {
    if (!this.notion) {
      return { success: false, error: 'Notion not configured' };
    }

    try {
      console.log(`📝 Querying Notion database: ${this.databaseId}`);
      
      // Query for NOT DONE tasks
      const response = await this.notion.databases.query({
        database_id: this.databaseId,
        filter: {
          property: 'Status',
          status: {
            does_not_equal: 'Done'
          }
        },
        sorts: [
          {
            property: 'Priority',
            direction: 'ascending'
          },
          {
            property: 'Due',
            direction: 'ascending'
          }
        ],
        page_size: 100
      });

      console.log(`Found ${response.results.length} tasks`);
      
      const tasks = response.results.map(page => {
        // Use "Task name" instead of "Name"
        const titleProp = page.properties['Task name'] || page.properties['Name'] || page.properties['Title'];
        const title = titleProp?.title?.[0]?.plain_text || 'Untitled Task';
        
        // Get status
        const status = page.properties.Status?.status?.name || 'No Status';
        
        // Get assignee(s)
        const assignedPeople = page.properties.Assigned?.people || [];
        const assignee = assignedPeople.length > 0 
          ? assignedPeople.map(p => p.name).join(', ')
          : 'Unassigned';
        
        // Get priority
        const priorityProp = page.properties.Priority;
        let priority = 'Medium';
        if (priorityProp?.select) {
          priority = priorityProp.select.name;
        } else if (priorityProp?.multi_select?.[0]) {
          priority = priorityProp.multi_select[0].name;
        }
        
        // Get due date
        const dueDate = page.properties.Due?.date?.start || null;
        
        // Get type if available
        const type = page.properties.Type?.select?.name || null;
        
        // Get brand/project if available
        const brandProject = page.properties['Brand/Projects']?.multi_select?.map(s => s.name).join(', ') || null;
        
        return {
          id: page.id,
          title: title,
          name: title, // Alias for compatibility
          status: status,
          assignee: assignee,
          assignedTo: assignee, // Alias for frontend
          priority: priority,
          dueDate: dueDate,
          deadline: dueDate, // Alias
          type: type,
          brandProject: brandProject,
          url: page.url
        };
      });
      
      // Filter out completed tasks
      const pendingTasks = tasks.filter(task => 
        task.status !== 'Done' && 
        task.status !== 'Completed' &&
        task.status !== 'Cancelled'
      );
      
      return {
        success: true,
        tasks: pendingTasks,
        totalTasks: pendingTasks.length
      };
      
    } catch (error) {
      console.error('❌ Failed to get Notion tasks:', error);
      return {
        success: false,
        error: error.message,
        tasks: []
      };
    }
  }

  async createTask(taskData) {
    if (!this.notion) {
      return { success: false, error: 'Notion not configured' };
    }

    try {
      console.log('📝 Creating task in Notion:', taskData);
      
      // Build properties based on your database structure
      const properties = {
        // Use "Task name" for title
        'Task name': {
          title: [
            {
              text: {
                content: taskData.title || 'New Task'
              }
            }
          ]
        },
        'Status': {
          status: {
            name: taskData.status || 'To-do'
          }
        }
      };
      
      // Add priority if provided
      if (taskData.priority) {
        properties['Priority'] = {
          select: {
            name: taskData.priority
          }
        };
      }
      
      // Add assignee if provided and it's not "Team" or "Unassigned"
      if (taskData.assignee && taskData.assignee !== 'Team' && taskData.assignee !== 'Unassigned') {
        // For people property, we need to search for the user first
        // For now, we'll skip this as it requires user ID
        console.log(`Note: Cannot auto-assign to ${taskData.assignee} - requires user ID`);
      }
      
      // Add due date if provided
      if (taskData.dueDate) {
        properties['Due'] = {
          date: {
            start: taskData.dueDate
          }
        };
      }
      
      // Add type if provided
      if (taskData.type) {
        properties['Type'] = {
          select: {
            name: taskData.type
          }
        };
      }
      
      // Create the page
      const response = await this.notion.pages.create({
        parent: {
          database_id: this.databaseId
        },
        properties: properties
      });
      
      console.log('✅ Task created successfully:', response.id);
      
      return {
        success: true,
        task: {
          id: response.id,
          title: taskData.title,
          url: response.url
        }
      };
      
    } catch (error) {
      console.error('❌ Failed to create task:', error);
      
      // Provide helpful error messages
      if (error.code === 'validation_error') {
        return {
          success: false,
          error: 'Database structure mismatch. Check property names and types.'
        };
      } else if (error.code === 'unauthorized') {
        return {
          success: false,
          error: 'Integration lacks permission to create pages.'
        };
      }
      
      return {
        success: false,
        error: error.message
      };
    }
  }

  async updateTaskStatus(taskId, status) {
    if (!this.notion) {
      return { success: false, error: 'Notion not configured' };
    }

    try {
      await this.notion.pages.update({
        page_id: taskId,
        properties: {
          'Status': {
            status: {
              name: status
            }
          }
        }
      });
      
      return {
        success: true,
        message: `Task status updated to ${status}`
      };
      
    } catch (error) {
      console.error('Failed to update task status:', error);
      return {
        success: false,
        error: error.message
      };
    }
  }

  // Method to get available status options from your database
  async getStatusOptions() {
    if (!this.notion) return [];
    
    try {
      const database = await this.notion.databases.retrieve({
        database_id: this.databaseId
      });
      
      const statusProperty = database.properties['Status'];
      if (statusProperty && statusProperty.status) {
        return statusProperty.status.options.map(opt => opt.name);
      }
      
      return [];
    } catch (error) {
      console.error('Failed to get status options:', error);
      return [];
    }
  }
}

module.exports = NotionService;
