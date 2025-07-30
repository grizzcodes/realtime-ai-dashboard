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

    try {
      // If no specific database ID, try to find a tasks database
      let databaseId = this.databaseId;
      
      if (!databaseId) {
        const databases = await this.notion.search({
          filter: { property: 'object', value: 'database' },
          query: 'tasks'
        });
        
        if (databases.results.length > 0) {
          databaseId = databases.results[0].id;
        } else {
          return { success: false, error: 'No tasks database found. Please set NOTION_DATABASE_ID in .env' };
        }
      }

      const response = await this.notion.databases.query({
        database_id: databaseId,
        filter: {
          and: [
            {
              property: 'Status',
              select: {
                does_not_equal: 'Done'
              }
            }
          ]
        }
      });

      const tasks = response.results.map(page => this.parseNotionPage(page));
      return { success: true, tasks, databaseId };
    } catch (error) {
      return { success: false, error: error.message };
    }
  }

  parseNotionPage(page) {
    const properties = page.properties;
    
    // Extract common properties (adjust based on your Notion setup)
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
        default:
          return null;
      }
    };

    return {
      id: `notion-${page.id}`,
      notionId: page.id,
      title: getPropertyValue(properties.Name) || getPropertyValue(properties.Title) || 'Untitled',
      status: getPropertyValue(properties.Status) || 'pending',
      assignee: getPropertyValue(properties.Assignee) || getPropertyValue(properties.Person),
      project: getPropertyValue(properties.Project) || getPropertyValue(properties.Category),
      urgency: this.mapNotionPriorityToUrgency(getPropertyValue(properties.Priority)),
      keyPeople: getPropertyValue(properties.Assignee) ? [getPropertyValue(properties.Assignee)] : [],
      tags: getPropertyValue(properties.Tags) || [],
      deadline: getPropertyValue(properties.Deadline) || getPropertyValue(properties.Due),
      created: new Date(page.created_time),
      updated: new Date(page.last_edited_time),
      source: 'notion',
      notionUrl: page.url,
      aiGenerated: false
    };
  }

  mapNotionPriorityToUrgency(priority) {
    if (!priority) return 2;
    
    switch (priority.toLowerCase()) {
      case 'urgent':
      case 'high':
      case '🔴':
        return 4;
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
        Name: {
          title: [
            {
              text: {
                content: task.title
              }
            }
          ]
        }
      };

      // Add optional properties if they exist
      if (task.status) {
        properties.Status = {
          select: {
            name: task.status === 'pending' ? 'To Do' : task.status
          }
        };
      }

      if (task.assignee) {
        properties.Assignee = {
          rich_text: [
            {
              text: {
                content: task.assignee
              }
            }
          ]
        };
      }

      if (task.deadline) {
        properties.Deadline = {
          date: {
            start: task.deadline
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
      return { success: false, error: error.message };
    }
  }
}

module.exports = NotionService;
