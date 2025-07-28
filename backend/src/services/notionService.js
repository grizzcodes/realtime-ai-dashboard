// backend/src/services/notionService.js - Notion API integration
const { Client } = require('@notionhq/client');

class NotionService {
  constructor() {
    this.notion = new Client({
      auth: process.env.NOTION_API_KEY,
    });
    console.log('📝 Notion service initialized');
  }

  async testConnection() {
    try {
      const response = await this.notion.users.me();
      console.log('✅ Notion connection successful:', response.name);
      return { success: true, user: response };
    } catch (error) {
      console.error('❌ Notion connection failed:', error.message);
      return { success: false, error: error.message };
    }
  }

  async getRecentPages(limit = 10) {
    try {
      const response = await this.notion.search({
        query: '',
        page_size: limit,
        filter: {
          value: 'page',
          property: 'object'
        },
        sort: {
          direction: 'descending',
          timestamp: 'last_edited_time'
        }
      });

      return response.results.map(page => ({
        id: page.id,
        title: this.extractTitle(page),
        lastEdited: page.last_edited_time,
        url: page.url,
        properties: page.properties
      }));
    } catch (error) {
      console.error('Error fetching recent pages:', error);
      return [];
    }
  }

  async getTaskDatabases() {
    try {
      const response = await this.notion.search({
        query: 'tasks',
        filter: {
          value: 'database',
          property: 'object'
        }
      });

      return response.results.map(db => ({
        id: db.id,
        title: this.extractTitle(db),
        url: db.url,
        properties: Object.keys(db.properties)
      }));
    } catch (error) {
      console.error('Error fetching task databases:', error);
      return [];
    }
  }

  async createTask(title, properties = {}) {
    try {
      // Try to find a suitable database first
      const databases = await this.getTaskDatabases();
      let targetDatabase = databases.find(db => 
        db.title.toLowerCase().includes('task') || 
        db.title.toLowerCase().includes('todo')
      );

      if (!targetDatabase && databases.length > 0) {
        targetDatabase = databases[0]; // Use first available database
      }

      if (!targetDatabase) {
        throw new Error('No suitable database found for task creation');
      }

      const taskProperties = {
        Name: {
          title: [
            {
              text: {
                content: title
              }
            }
          ]
        },
        ...properties
      };

      const response = await this.notion.pages.create({
        parent: {
          database_id: targetDatabase.id
        },
        properties: taskProperties
      });

      console.log(`✅ Task created in Notion: "${title}"`);
      return {
        success: true,
        page: response,
        id: response.id,
        url: response.url
      };
    } catch (error) {
      console.error('Error creating task:', error);
      return {
        success: false,
        error: error.message
      };
    }
  }

  async updateTaskStatus(pageId, status) {
    try {
      const response = await this.notion.pages.update({
        page_id: pageId,
        properties: {
          Status: {
            select: {
              name: status
            }
          }
        }
      });

      console.log(`✅ Task status updated: ${status}`);
      return { success: true, page: response };
    } catch (error) {
      console.error('Error updating task status:', error);
      return { success: false, error: error.message };
    }
  }

  extractTitle(page) {
    if (page.properties?.Name?.title?.length > 0) {
      return page.properties.Name.title[0].text.content;
    }
    if (page.properties?.Title?.title?.length > 0) {
      return page.properties.Title.title[0].text.content;
    }
    return 'Untitled';
  }

  async searchPages(query) {
    try {
      const response = await this.notion.search({
        query: query,
        page_size: 20
      });

      return response.results.map(page => ({
        id: page.id,
        title: this.extractTitle(page),
        type: page.object,
        lastEdited: page.last_edited_time,
        url: page.url
      }));
    } catch (error) {
      console.error('Error searching pages:', error);
      return [];
    }
  }

  async getPageContent(pageId) {
    try {
      const page = await this.notion.pages.retrieve({ page_id: pageId });
      const blocks = await this.notion.blocks.children.list({
        block_id: pageId,
        page_size: 50
      });

      return {
        page: {
          id: page.id,
          title: this.extractTitle(page),
          properties: page.properties,
          lastEdited: page.last_edited_time
        },
        content: blocks.results
      };
    } catch (error) {
      console.error('Error getting page content:', error);
      return null;
    }
  }
}

module.exports = NotionService;