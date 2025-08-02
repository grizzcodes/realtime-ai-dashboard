// backend/src/services/notionService.js
const { Client } = require('@notionhq/client');

class NotionService {
  constructor() {
    this.notion = process.env.NOTION_API_KEY ? new Client({
      auth: process.env.NOTION_API_KEY,
    }) : null;
    this.databaseId = process.env.NOTION_DATABASE_ID || null;
    this.statusOptions = [];
  }

  async testConnection() {
    if (!this.notion) {
      return { 
        success: false, 
        error: 'Notion not configured. Add NOTION_API_KEY to .env',
        needsAuth: true
      };
    }

    try {
      const response = await this.notion.users.me();
      return { 
        success: true, 
        message: `Connected: ${response.name}`,
        user: response 
      };
    } catch (error) {
      return { 
        success: false, 
        error: `Notion failed: ${error.message}`
      };
    }
  }

  async getFilteredTasks(person, status) {
    try {
      const result = await this.getTasks();
      
      if (!result.success) {
        return result;
      }

      let filteredTasks = result.tasks;

      // Filter by person if specified
      if (person && person !== 'all') {
        filteredTasks = filteredTasks.filter(task => 
          task.keyPeople.some(p => p.toLowerCase().includes(person.toLowerCase()))
        );
      }

      // Filter by status if specified
      if (status && status !== 'all') {
        filteredTasks = filteredTasks.filter(task => task.status === status);
      }

      // Extract unique people and status options
      const people = [...new Set(result.tasks.flatMap(task => task.keyPeople))];
      const statusOptionsFromTasks = [...new Set(result.tasks.map(task => task.status))];

      return {
        success: true,
        tasks: filteredTasks,
        people: people.sort(),
        statusOptions: statusOptionsFromTasks.sort(),
        filters: { person, status },
        summary: {
          total: filteredTasks.length,
          filtered: person || status ? true : false
        }
      };
    } catch (error) {
      console.error('❌ Failed to get filtered tasks:', error);
      return {
        success: false,
        error: error.message,
        tasks: []
      };
    }
  }

  async getStatusOptions() {
    if (!this.notion || !this.databaseId) {
      return [];
    }

    try {
      const dbInfo = await this.notion.databases.retrieve({
        database_id: this.databaseId
      });

      const statusProperty = dbInfo.properties['Status'];
      if (statusProperty && statusProperty.type === 'status') {
        this.statusOptions = statusProperty.status.options.map(option => ({
          name: option.name,
          color: option.color,
          id: option.id
        }));
        return this.statusOptions;
      }
      return [];
    } catch (error) {
      console.error('Failed to get status options:', error);
      return [];
    }
  }

  async getTasks() {
    if (!this.notion) {
      return { success: false, error: 'Notion not configured - add NOTION_API_KEY to .env' };
    }

    if (!this.databaseId) {
      return { success: false, error: 'Database ID not set - add NOTION_DATABASE_ID=4edf1722-ef48-4cbc-988d-ed770d281f9b to .env' };
    }

    try {
      console.log(`📝 Querying Notion database: ${this.databaseId}`);
      
      // Get database info and status options
      let dbInfo;
      try {
        dbInfo = await this.notion.databases.retrieve({
          database_id: this.databaseId
        });
        console.log(`✅ Database found: "${dbInfo.title[0]?.plain_text || 'Untitled'}"`);
        
        // Get status options
        const statusProperty = dbInfo.properties['Status'];
        if (statusProperty && statusProperty.type === 'status') {
          this.statusOptions = statusProperty.status.options.map(option => ({
            name: option.name,
            color: option.color,
            id: option.id
          }));
        }
        
      } catch (dbError) {
        console.error('❌ Database access error:', dbError.message);
        if (dbError.code === 'object_not_found') {
          return { 
            success: false, 
            error: `Database not found! Steps to fix: 1) Check Database ID: ${this.databaseId} 2) Share database with integration at https://www.notion.so/my-integrations 3) Click "Add connections" in your database`
          };
        }
        throw dbError;
      }
      
      // Fetch NOT DONE tasks with filters matching your Notion setup
      console.log('📋 Fetching NOT DONE tasks with filters...');
      const notDoneResponse = await this.notion.databases.query({
        database_id: this.databaseId,
        filter: {
          property: 'Status',
          status: {
            does_not_equal: 'Done'
          }
        },
        sorts: [
          {
            property: 'Assigned', // Person Assigned filter (prioritize assigned tasks)
            direction: 'ascending'
          },
          {
            property: 'Due', // Due Date descending
            direction: 'descending'
          },
          {
            property: 'Priority',
            direction: 'ascending'
          }
        ],
        page_size: 100
      });

      // Fetch COMPLETED tasks (last 10)
      console.log('📋 Fetching last 10 DONE tasks...');
      const doneResponse = await this.notion.databases.query({
        database_id: this.databaseId,
        filter: {
          property: 'Status',
          status: {
            equals: 'Done'
          }
        },
        sorts: [
          {
            property: 'Due', // Most recently completed first
            direction: 'descending'
          }
        ],
        page_size: 10 // Only last 10 done tasks
      });

      const notDoneTasks = notDoneResponse.results || [];
      const doneTasks = doneResponse.results.slice(0, 10) || []; // Ensure max 10

      console.log(`📊 Found ${notDoneTasks.length} not done tasks, ${doneTasks.length} recent done tasks`);
      
      // Combine tasks: NOT DONE first, then 10 most recent DONE
      const allTasks = [...notDoneTasks, ...doneTasks];
      
      if (allTasks.length === 0) {
        return { 
          success: true, 
          tasks: [], 
          statusOptions: this.statusOptions,
          message: 'Database is empty - add some tasks to your Notion database!'
        };
      }

      // Parse tasks
      const parsedTasks = allTasks.map(page => this.parseNotionPage(page, dbInfo.properties));
      
      // Apply final sorting: NOT DONE first (by person assigned, then due date), then DONE
      const sortedTasks = parsedTasks.sort((a, b) => {
        // First: NOT DONE tasks come before DONE tasks
        const aIsDone = a.rawStatus?.toLowerCase() === 'done';
        const bIsDone = b.rawStatus?.toLowerCase() === 'done';
        
        if (!aIsDone && bIsDone) return -1; // a (not done) comes first
        if (aIsDone && !bIsDone) return 1;  // b (not done) comes first
        
        // Within same completion status
        if (!aIsDone && !bIsDone) {
          // Both not done: sort by assigned (assigned tasks first), then due date
          const aAssigned = a.assignee !== 'Unassigned';
          const bAssigned = b.assignee !== 'Unassigned';
          
          if (aAssigned && !bAssigned) return -1;
          if (!aAssigned && bAssigned) return 1;
          
          // Then by due date (descending - most urgent first)
          if (a.deadline && b.deadline) {
            return new Date(b.deadline) - new Date(a.deadline);
          }
          if (a.deadline && !b.deadline) return -1;
          if (!a.deadline && b.deadline) return 1;
        }
        
        // Done tasks already sorted by due date from query
        return 0;
      });
      
      console.log(`✅ Returning ${sortedTasks.length} tasks (${notDoneTasks.length} not done + ${doneTasks.length} recent done)`);
      
      return { 
        success: true, 
        tasks: sortedTasks, 
        statusOptions: this.statusOptions,
        databaseId: this.databaseId,
        summary: {
          notDone: notDoneTasks.length,
          recentDone: doneTasks.length,
          total: sortedTasks.length
        }
      };
    } catch (error) {
      console.error('❌ Notion API error:', error);
      return { 
        success: false, 
        error: `Failed to sync Notion: ${error.message}`
      };
    }
  }

  parseNotionPage(page, properties = {}) {
    const pageProps = page.properties;
    
    const getPropertyValue = (prop) => {
      if (!prop) return null;
      
      switch (prop.type) {
        case 'title':
          return prop.title?.[0]?.plain_text || '';
        case 'rich_text':
          return prop.rich_text?.[0]?.plain_text || '';
        case 'select':
          return prop.select?.name || null;
        case 'multi_select':
          return prop.multi_select?.map(item => item.name) || [];
        case 'date':
          return prop.date?.start || null;
        case 'people':
          return prop.people?.map(person => ({
            id: person.id,
            name: person.name || 'Unknown User',
            avatar_url: person.avatar_url || null
          })) || [];
        case 'number':
          return prop.number || null;
        case 'checkbox':
          return prop.checkbox || false;
        case 'url':
          return prop.url || null;
        case 'formula':
          return prop.formula?.string || prop.formula?.number || null;
        case 'rollup':
          return prop.rollup?.array || prop.rollup?.number || null;
        case 'status':
          if (prop.status) {
            const statusOption = this.statusOptions.find(opt => opt.name === prop.status.name);
            return {
              name: prop.status.name,
              color: statusOption?.color || 'default',
              id: statusOption?.id || null
            };
          }
          return null;
        default:
          return null;
      }
    };

    // Map your actual Notion properties
    const taskName = getPropertyValue(pageProps['Task name']) || 
                     getPropertyValue(pageProps['Name']) || 
                     getPropertyValue(pageProps['Title']) || 
                     'Untitled Task';
    
    const statusObject = getPropertyValue(pageProps['Status']) || { name: 'Not Done Yet', color: 'red' };
    const assigned = getPropertyValue(pageProps['Assigned']) || [];
    const dueDate = getPropertyValue(pageProps['Due']);
    const priority = getPropertyValue(pageProps['Priority']);
    const brandProject = getPropertyValue(pageProps['Brand/Projects']) || 
                        getPropertyValue(pageProps['Project']) || [];
    const type = getPropertyValue(pageProps['Type']);
    const links = getPropertyValue(pageProps['Links']);

    // Extract assignee info
    const assignedUsers = Array.isArray(assigned) ? assigned : [];
    const primaryAssignee = assignedUsers.length > 0 ? assignedUsers[0].name : 'Unassigned';
    const allAssignees = assignedUsers.map(user => user.name);

    return {
      id: `notion-${page.id}`,
      notionId: page.id,
      title: taskName,
      name: taskName, // Alias for frontend compatibility
      status: this.mapNotionStatusToOurs(statusObject.name),
      rawStatus: statusObject.name,
      statusColor: statusObject.color,
      assignee: primaryAssignee,
      assignedUsers: assignedUsers,
      keyPeople: allAssignees,
      project: Array.isArray(brandProject) ? brandProject.join(', ') : (brandProject || 'General'),
      priority: priority,
      urgency: this.mapNotionPriorityToUrgency(priority),
      deadline: dueDate ? new Date(dueDate) : null,
      type: type || 'Task',
      links: links,
      tags: [
        'notion',
        ...(Array.isArray(brandProject) ? brandProject : (brandProject ? [brandProject] : [])),
        ...(type ? [type] : [])
      ],
      created: new Date(page.created_time),
      updated: new Date(page.last_edited_time),
      source: 'notion',
      notionUrl: page.url,
      aiGenerated: false,
      category: 'task'
    };
  }

  mapNotionStatusToOurs(notionStatus) {
    if (!notionStatus) return 'pending';
    
    switch (notionStatus.toLowerCase()) {
      case 'done':
        return 'completed';
      case 'in progress':
        return 'in_progress';
      case 'daily task':
        return 'daily';
      case 'not done yet':
      default:
        return 'pending';
    }
  }

  mapNotionPriorityToUrgency(priority) {
    if (!priority) return 3;
    
    switch (priority.toLowerCase()) {
      case 'urgent':
      case 'critical':
      case 'high':
      case '5':
      case '4':
        return 5;
      case 'medium':
      case '3':
        return 3;
      case 'low':
      case '2':
      case '1':
        return 2;
      default:
        return 3;
    }
  }

  async updateTaskStatus(taskId, status) {
    if (!this.notion) {
      return { success: false, error: 'Notion not configured' };
    }

    try {
      // Extract clean page ID - handle both formats
      let cleanPageId = taskId;
      if (taskId.startsWith('notion-')) {
        cleanPageId = taskId.replace('notion-', '');
      }
      
      // Remove any extra quotes or formatting
      cleanPageId = cleanPageId.replace(/['\"]/g, '');
      
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

  mapOurStatusToNotion(status) {
    switch (status) {
      case 'completed':
        return 'Done';
      case 'in_progress':
        return 'In progress';
      case 'daily':
        return 'Daily Task';
      case 'pending':
      default:
        return 'Not done yet';
    }
  }
}

module.exports = NotionService;
