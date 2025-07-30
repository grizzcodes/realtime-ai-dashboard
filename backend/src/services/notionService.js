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
      return { success: false, error: 'Notion not configured' };
    }

    if (!this.databaseId) {
      return { success: false, error: 'NOTION_DATABASE_ID not set in .env file' };
    }

    try {
      console.log(`📝 Querying Notion database: ${this.databaseId}`);
      
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
      return { success: false, error: error.message };
    }
  }

  parseNotionPage(page) {
    const properties = page.properties;
    
    // Extract properties based on your database structure
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

    // Map your Notion properties to our task structure
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
      project: 'Notion Tasks', // Since this appears to be a general task database
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
      case '🔴':
        return 5;
      case 'medium':
      case '🟡':
        return 3;
      case 'low':
      case '🟢':
        return 2;
      default:
        return 2;
    }
  }

  async createTask(task) {
    if (!this.notion || !this.databaseId) {
      return { success: false, error: 'Notion not properly configured' };
    }

    try {
      const properties = {
        'Task': {
          title: [
            {
              text: {
                content: task.title
              }
            }
          ]
        }
      };

      // Add status
      if (task.status) {
        const notionStatus = this.mapOurStatusToNotion(task.status);
        properties['Status'] = {
          select: {
            name: notionStatus
          }
        };
      }

      // Add person if specified
      if (task.assignee) {
        properties['Person'] = {
          rich_text: [
            {
              text: {
                content: task.assignee
              }
            }
          ]
        };
      }

      // Add due date if specified
      if (task.deadline) {
        properties['Due date'] = {
          date: {
            start: task.deadline instanceof Date ? task.deadline.toISOString().split('T')[0] : task.deadline
          }
        };
      }

      // Add priority based on urgency
      if (task.urgency) {
        const priority = this.mapUrgencyToNotionPriority(task.urgency);
        properties['Priority'] = {
          select: {
            name: priority
          }
        };
      }

      const response = await this.notion.pages.create({
        parent: {
          database_id: this.databaseId
        },
        properties
      });

      return { success: true, page: response };
    } catch (error) {
      console.error('❌ Failed to create Notion task:', error);
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

  mapUrgencyToNotionPriority(urgency) {
    switch (urgency) {
      case 5:
        return 'High';
      case 4:
        return 'High';
      case 3:
        return 'Medium';
      case 2:
      case 1:
      default:
        return 'Low';
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
}

module.exports = NotionService;
