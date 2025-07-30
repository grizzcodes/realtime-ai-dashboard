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
      return { success: false, error: 'Database ID not set - add NOTION_DATABASE_ID=4edf1722-ef48-4cbc-988d-ed170d281f9b to .env' };
    }

    try {
      console.log(`📝 Querying Notion database: ${this.databaseId}`);
      
      // First, verify database access
      try {
        const dbInfo = await this.notion.databases.retrieve({
          database_id: this.databaseId
        });
        console.log(`✅ Database found: "${dbInfo.title[0]?.plain_text || 'Untitled'}"`);
        console.log(`🔗 Properties: ${Object.keys(dbInfo.properties).join(', ')}`);
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
      
      const response = await this.notion.databases.query({
        database_id: this.databaseId
      });

      console.log(`📋 Found ${response.results.length} pages in Notion`);
      
      if (response.results.length === 0) {
        return { 
          success: true, 
          tasks: [], 
          message: 'Database is empty - add some tasks to your Notion database!'
        };
      }

      const tasks = response.results.map(page => this.parseNotionPage(page));
      
      // Filter out completed tasks
      const activeTasks = tasks.filter(task => task.status !== 'completed');
      console.log(`✅ ${activeTasks.length} active tasks after filtering`);
      
      return { success: true, tasks: activeTasks, databaseId: this.databaseId };
    } catch (error) {
      console.error('❌ Notion API error:', error);
      return { 
        success: false, 
        error: `Failed to sync Notion: ${error.message}`
      };
    }
  }

  parseNotionPage(page) {
    const properties = page.properties;
    
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
          return prop.people?.map(person => person.name || person.id) || [];
        case 'number':
          return prop.number || null;
        case 'checkbox':
          return prop.checkbox || false;
        default:
          return null;
      }
    };

    // Map your Notion properties
    const taskName = getPropertyValue(properties['Task']) || 'Untitled Task';
    const status = getPropertyValue(properties['Status']) || 'Not done yet';
    const person = getPropertyValue(properties['Person']) || [];
    const dueDate = getPropertyValue(properties['Due date']);
    const priority = getPropertyValue(properties['Priority']);

    return {
      id: `notion-${page.id}`,
      notionId: page.id,
      title: taskName,
      status: this.mapNotionStatusToOurs(status),
      assignee: Array.isArray(person) ? person[0] : person,
      keyPeople: Array.isArray(person) ? person : (person ? [person] : []),
      project: 'Notion Tasks',
      urgency: this.mapNotionPriorityToUrgency(priority),
      deadline: dueDate ? new Date(dueDate) : null,
      tags: ['notion'],
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
      case 'not done yet':
      case 'daily task':
      default:
        return 'pending';
    }
  }

  mapNotionPriorityToUrgency(priority) {
    if (!priority) return 2;
    
    switch (priority.toLowerCase()) {
      case 'urgent':
      case 'high':
        return 5;
      case 'medium':
        return 3;
      case 'low':
        return 2;
      default:
        return 2;
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
        return 'In progress';
      case 'pending':
      default:
        return 'Not done yet';
    }
  }
}

module.exports = NotionService;
