// backend/src/services/notionService.js - Fixed for your database structure
const { Client } = require('@notionhq/client');

class NotionService {
  constructor() {
    this.notion = null;
    this.databaseId = process.env.NOTION_DATABASE_ID || '4edf1722-ef48-4cbc-988d-ed770d281f9b';
    this.statusOptions = [];
    this.validStatuses = null; // Cache valid status options
    this.workspaceUsers = null; // Cache workspace users
    
    if (process.env.NOTION_API_KEY) {
      this.notion = new Client({
        auth: process.env.NOTION_API_KEY,
      });
      console.log('✅ NotionService initialized with API key');
      // Get valid status options on initialization
      this.getValidStatusOptions();
      // Get workspace users on initialization
      this.getWorkspaceUsers();
    } else {
      console.log('⚠️ NotionService: No API key found');
    }
  }

  async getWorkspaceUsers() {
    if (!this.notion) return {};
    
    try {
      const response = await this.notion.users.list();
      this.workspaceUsers = {};
      
      response.results.forEach(user => {
        if (user.type === 'person' && user.name) {
          // Store multiple variations of the name for matching
          const firstName = user.name.split(' ')[0].toLowerCase();
          const fullName = user.name.toLowerCase();
          
          this.workspaceUsers[firstName] = user.id;
          this.workspaceUsers[fullName] = user.id;
          
          // Also store the original case
          this.workspaceUsers[user.name] = user.id;
          
          console.log(`👤 Found Notion user: ${user.name} (${user.id})`);
        }
      });
      
      // Also add any hardcoded mappings from environment variables
      if (process.env.NOTION_USER_MAPPINGS) {
        try {
          const mappings = JSON.parse(process.env.NOTION_USER_MAPPINGS);
          Object.assign(this.workspaceUsers, mappings);
        } catch (e) {
          console.log('Could not parse NOTION_USER_MAPPINGS');
        }
      }
      
      console.log('📋 Workspace users loaded:', Object.keys(this.workspaceUsers));
      return this.workspaceUsers;
    } catch (error) {
      console.error('Failed to get workspace users:', error);
      return {};
    }
  }

  getUserIdFromName(name) {
    if (!name || !this.workspaceUsers) return null;
    
    // Try different variations of the name
    const nameLower = name.toLowerCase();
    const nameCapitalized = name.charAt(0).toUpperCase() + name.slice(1).toLowerCase();
    
    return this.workspaceUsers[nameLower] || 
           this.workspaceUsers[name] || 
           this.workspaceUsers[nameCapitalized] || 
           null;
  }

  async getValidStatusOptions() {
    if (!this.notion || !this.databaseId) return [];
    
    try {
      const database = await this.notion.databases.retrieve({
        database_id: this.databaseId
      });
      
      const statusProperty = database.properties['Status'];
      if (statusProperty && statusProperty.status) {
        this.validStatuses = statusProperty.status.options.map(opt => opt.name);
        console.log('📋 Valid Notion status options:', this.validStatuses);
        return this.validStatuses;
      }
      
      return [];
    } catch (error) {
      console.error('Failed to get status options:', error);
      return [];
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
      
      // Get workspace users
      await this.getWorkspaceUsers();
      
      return {
        success: true,
        message: `Connected to Notion database: ${database.title[0]?.plain_text || 'Untitled'}`,
        databaseId: this.databaseId,
        workspaceUsers: Object.keys(this.workspaceUsers || {})
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
      // Ensure we have valid status options
      if (!this.validStatuses) {
        await this.getValidStatusOptions();
      }
      
      // Ensure we have workspace users
      if (!this.workspaceUsers) {
        await this.getWorkspaceUsers();
      }
      
      // Determine the correct status to use
      let statusToUse = taskData.status || 'Not started';
      
      // Map common status names to what might exist in the database
      const statusMappings = {
        'To-do': ['To Do', 'To do', 'TODO', 'Todo', 'Not started', 'Backlog', 'New'],
        'Not started': ['Not started', 'Not Started', 'Backlog', 'To Do', 'To do', 'TODO', 'New'],
        'In Progress': ['In Progress', 'In progress', 'Working on it', 'Doing'],
        'Done': ['Done', 'Complete', 'Completed', 'Finished']
      };
      
      // Try to find a matching status from the valid options
      if (this.validStatuses && this.validStatuses.length > 0) {
        const mappingOptions = statusMappings[statusToUse] || [statusToUse];
        
        for (const option of mappingOptions) {
          if (this.validStatuses.includes(option)) {
            statusToUse = option;
            break;
          }
        }
        
        // If no match found, use the first available status
        if (!this.validStatuses.includes(statusToUse)) {
          statusToUse = this.validStatuses[0];
          console.log(`⚠️ Using default status: ${statusToUse}`);
        }
      }
      
      console.log('📝 Creating task in Notion:', { ...taskData, status: statusToUse });
      
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
            name: statusToUse
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
      
      // Add assignee if provided and we can find their user ID
      if (taskData.assignee && taskData.assignee !== 'Team' && taskData.assignee !== 'Unassigned') {
        const userId = this.getUserIdFromName(taskData.assignee);
        
        if (userId) {
          properties['Assigned'] = {
            people: [{ id: userId }]
          };
          console.log(`✅ Assigning task to ${taskData.assignee} (${userId})`);
        } else {
          console.log(`⚠️ Could not find user ID for ${taskData.assignee}`);
          // Create a note in the task description about the assignee
          const descriptionText = `Assigned to: ${taskData.assignee}\n${taskData.description || ''}`;
          properties['Description'] = {
            rich_text: [
              {
                text: {
                  content: descriptionText
                }
              }
            ]
          };
        }
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
          url: response.url,
          assignee: taskData.assignee
        }
      };
      
    } catch (error) {
      console.error('❌ Failed to create task:', error);
      
      // Provide helpful error messages
      if (error.code === 'validation_error') {
        return {
          success: false,
          error: `Database validation error: ${error.message}. Valid statuses: ${this.validStatuses?.join(', ') || 'unknown'}`
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

  // Get list of workspace users with their IDs
  async listWorkspaceUsers() {
    if (!this.workspaceUsers) {
      await this.getWorkspaceUsers();
    }
    return this.workspaceUsers;
  }
}

module.exports = NotionService;
