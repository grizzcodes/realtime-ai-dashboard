// backend/src/services/notionService.js
const { Client } = require('@notionhq/client');

class NotionService {
  constructor() {
    this.notion = process.env.NOTION_API_KEY ? new Client({
      auth: process.env.NOTION_API_KEY,
    }) : null;
    this.databaseId = process.env.NOTION_DATABASE_ID || null;
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

  async getTasks() {
    if (!this.notion) {
      return { success: false, error: 'Notion not configured - add NOTION_API_KEY to .env' };
    }

    if (!this.databaseId) {
      return { success: false, error: 'Database ID not set - add NOTION_DATABASE_ID=4edf1722-ef48-4cbc-988d-ed770d281f9b to .env' };
    }

    try {
      console.log(`📝 Querying Notion database: ${this.databaseId}`);
      
      // First, get database info to understand property types
      let dbInfo;
      try {
        dbInfo = await this.notion.databases.retrieve({
          database_id: this.databaseId
        });
        console.log(`✅ Database found: "${dbInfo.title[0]?.plain_text || 'Untitled'}"`);
        console.log(`🔗 Properties: ${Object.keys(dbInfo.properties).join(', ')}`);
        
        // Log property types for debugging
        console.log('📋 Property types:');
        Object.entries(dbInfo.properties).forEach(([name, prop]) => {
          console.log(`  - ${name}: ${prop.type}`);
        });
        
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
      
      // Query without filters first to get all data, then filter in code
      console.log('📋 Querying all tasks (will filter after)...');
      const response = await this.notion.databases.query({
        database_id: this.databaseId,
        sorts: [
          {
            property: 'Priority',
            direction: 'ascending'
          }
        ]
      });

      console.log(`📋 Found ${response.results.length} total pages in Notion`);
      
      if (response.results.length === 0) {
        return { 
          success: true, 
          tasks: [], 
          message: 'Database is empty - add some tasks to your Notion database!'
        };
      }

      // Parse all tasks first
      const allTasks = response.results.map(page => this.parseNotionPage(page, dbInfo.properties));
      
      // Filter for active tasks in code
      const activeTasks = allTasks.filter(task => {
        const status = task.rawStatus?.toLowerCase() || '';
        return status === 'not done yet' || status === 'in progress' || status === 'todo' || status === 'pending';
      });
      
      console.log(`✅ ${activeTasks.length} active tasks after filtering (from ${allTasks.length} total)`);
      console.log('📊 Task statuses found:', [...new Set(allTasks.map(t => t.rawStatus))].join(', '));
      
      return { success: true, tasks: activeTasks, databaseId: this.databaseId };
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
    
    const status = getPropertyValue(pageProps['Status']) || 'Not Done Yet';
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
      status: this.mapNotionStatusToOurs(status),
      rawStatus: status, // Keep original for filtering
      assignee: primaryAssignee,
      assignedUsers: assignedUsers, // Full user objects with IDs
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
      case 'completed':
      case 'complete':
        return 'completed';
      case 'in progress':
      case 'in-progress':
      case 'doing':
      case 'working':
        return 'in_progress';
      case 'not done yet':
      case 'not started':
      case 'todo':
      case 'pending':
      case 'new':
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
            select: {
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
        return 'In Progress';
      case 'pending':
      default:
        return 'Not Done Yet';
    }
  }
}

module.exports = NotionService;
