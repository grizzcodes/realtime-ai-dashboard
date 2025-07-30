// backend/src/services/notionService.js
const { Client } = require('@notionhq/client');

class NotionService {
  constructor() {
    this.notion = process.env.NOTION_API_KEY ? new Client({
      auth: process.env.NOTION_API_KEY,
    }) : null;
    this.databaseId = process.env.NOTION_DATABASE_ID || null;
    this.statusOptions = []; // Store available status options
  }

  async testConnection() {
    if (!this.notion) {
      return { success: false, error: 'Notion API key not configured' };
    }

    try {
      const response = await this.notion.users.me();
      return { success: true, user: response };
    } catch (error) {
      return { success: false, error: error.message };
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
      
      // First, get database info and status options
      let dbInfo;
      try {
        dbInfo = await this.notion.databases.retrieve({
          database_id: this.databaseId
        });
        console.log(`✅ Database found: "${dbInfo.title[0]?.plain_text || 'Untitled'}"`);
        console.log(`🔗 Properties: ${Object.keys(dbInfo.properties).join(', ')}`);
        
        // Get status options
        const statusProperty = dbInfo.properties['Status'];
        if (statusProperty && statusProperty.type === 'status') {
          this.statusOptions = statusProperty.status.options.map(option => ({
            name: option.name,
            color: option.color,
            id: option.id
          }));
          console.log('📊 Status options found:', this.statusOptions.map(opt => `${opt.name} (${opt.color})`).join(', '));
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
      
      // Query ALL tasks without any filtering - let frontend handle filtering
      console.log('📋 Fetching ALL tasks from Notion (no server-side filtering)...');
      const response = await this.notion.databases.query({
        database_id: this.databaseId,
        page_size: 100, // Notion's max per request
        sorts: [
          {
            property: 'Status',
            direction: 'ascending'
          },
          {
            property: 'Priority',
            direction: 'ascending'
          }
        ]
      });

      let allTasks = [...response.results];
      
      // If there are more pages, fetch them up to 200 total
      let cursor = response.next_cursor;
      let pageCount = 1;
      
      while (cursor && allTasks.length < 200) {
        console.log(`📋 Fetching page ${pageCount + 1}...`);
        const nextPage = await this.notion.databases.query({
          database_id: this.databaseId,
          page_size: Math.min(100, 200 - allTasks.length),
          start_cursor: cursor,
          sorts: [
            {
              property: 'Status',
              direction: 'ascending'
            },
            {
              property: 'Priority',
              direction: 'ascending'
            }
          ]
        });
        
        allTasks = [...allTasks, ...nextPage.results];
        cursor = nextPage.next_cursor;
        pageCount++;
        
        if (!cursor) break;
      }

      console.log(`📋 Found ${allTasks.length} total pages in Notion (fetched ${pageCount} pages)`);
      
      if (allTasks.length === 0) {
        return { 
          success: true, 
          tasks: [], 
          statusOptions: this.statusOptions,
          message: 'Database is empty - add some tasks to your Notion database!'
        };
      }

      // Parse ALL tasks (no backend filtering)
      const parsedTasks = allTasks.map(page => this.parseNotionPage(page, dbInfo.properties));
      
      // Count tasks by status for debugging
      const statusCounts = {};
      parsedTasks.forEach(task => {
        const status = task.rawStatus || 'Unknown';
        statusCounts[status] = (statusCounts[status] || 0) + 1;
      });
      
      console.log('📊 RAW task counts by status (before any filtering):');
      Object.entries(statusCounts).forEach(([status, count]) => {
        console.log(`   ${status}: ${count} tasks`);
      });
      
      // Sort to put "Not Done Yet" first, but return ALL tasks
      const sortedTasks = parsedTasks.sort((a, b) => {
        // First priority: "Not Done Yet" tasks come first
        const aIsNotDone = a.rawStatus?.toLowerCase() === 'not done yet';
        const bIsNotDone = b.rawStatus?.toLowerCase() === 'not done yet';
        
        if (aIsNotDone && !bIsNotDone) return -1;
        if (!aIsNotDone && bIsNotDone) return 1;
        
        // Second priority: Within same status, sort by urgency (higher first)
        if (a.urgency !== b.urgency) {
          return b.urgency - a.urgency;
        }
        
        // Third priority: Then by assignee
        return a.assignee.localeCompare(b.assignee);
      });
      
      console.log(`✅ Returning ALL ${sortedTasks.length} tasks to frontend (no backend filtering)`);
      console.log(`🔥 "Not Done Yet" tasks will appear first, but ALL statuses included`);
      console.log(`💡 Frontend can now filter by status as needed`);
      
      return { 
        success: true, 
        tasks: sortedTasks, 
        statusOptions: this.statusOptions,
        databaseId: this.databaseId 
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
          // Handle the status property type - return both name and color
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
          console.log(`⚠️ Unknown property type: ${prop.type} for property`);
          return null;
      }
    };

    // Map your actual Notion properties with fallbacks
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

    // Debug individual task parsing
    if (Math.random() < 0.01) { // Log 1% of tasks for debugging
      console.log(`🔍 Sample task: "${taskName}" | Status: "${statusObject.name}" | Assigned: ${primaryAssignee}`);
    }

    return {
      id: `notion-${page.id}`,
      notionId: page.id,
      title: taskName,
      status: this.mapNotionStatusToOurs(statusObject.name),
      rawStatus: statusObject.name, // Keep original status name
      statusColor: statusObject.color, // Keep original status color
      assignee: primaryAssignee,
      assignedUsers: assignedUsers,
      keyPeople: allAssignees,
      project: Array.isArray(brandProject) ? brandProject.join(', ') : (brandProject || 'General'),
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
    if (!priority) return 3; // Default to medium
    
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

  async updateTaskStatus(notionId, status) {
    if (!this.notion) {
      return { success: false, error: 'Notion not configured' };
    }

    try {
      const notionStatus = this.mapOurStatusToNotion(status);
      
      const response = await this.notion.pages.update({
        page_id: notionId,
        properties: {
          'Status': {
            status: {
              name: notionStatus
            }
          }
        }
      });

      return { success: true, page: response };
    } catch (error) {
      console.error('❌ Failed to update Notion task:', error);
      return { success: false, error: error.message };
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
