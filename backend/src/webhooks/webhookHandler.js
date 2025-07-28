// backend/src/webhooks/webhookHandler.js
const express = require('express');
const { EventEmitter } = require('events');

class RealTimeMonitor extends EventEmitter {
  constructor() {
    super();
    this.app = express();
    this.app.use(express.json());
    this.setupWebhooks();
  }

  setupWebhooks() {
    console.log('🔗 Setting up webhook handlers...');

    // Slack webhook
    this.app.post('/webhooks/slack', (req, res) => {
      console.log('💬 Slack event received:', req.body.type || 'message');
      
      if (req.body.type === 'url_verification') {
        return res.send(req.body.challenge);
      }

      this.emit('slack:message', {
        source: 'slack',
        type: 'message',
        data: req.body,
        timestamp: new Date(),
        priority: this.calculateSlackPriority(req.body)
      });

      res.status(200).send('OK');
    });

    // Gmail webhook (Google Pub/Sub)
    this.app.post('/webhooks/gmail', (req, res) => {
      console.log('📧 Gmail event received');
      
      try {
        const message = JSON.parse(Buffer.from(req.body.message.data, 'base64').toString());
        
        this.emit('gmail:new_email', {
          source: 'gmail',
          type: 'new_email',
          data: message,
          timestamp: new Date(),
          priority: this.calculateEmailPriority(message)
        });
      } catch (error) {
        console.error('Gmail webhook error:', error);
      }

      res.status(200).send('OK');
    });

    // Notion webhook
    this.app.post('/webhooks/notion', (req, res) => {
      console.log('📝 Notion event received:', req.body.object);
      
      this.emit('notion:change', {
        source: 'notion',
        type: 'page_update',
        data: req.body,
        timestamp: new Date(),
        priority: this.calculateNotionPriority(req.body)
      });

      res.status(200).send('OK');
    });

    // Fireflies webhook
    this.app.post('/webhooks/fireflies', (req, res) => {
      console.log('🎙️ Fireflies event received');
      
      this.emit('fireflies:transcript', {
        source: 'fireflies',
        type: 'transcript',
        data: req.body,
        timestamp: new Date(),
        priority: 3 // Meetings are generally important
      });

      res.status(200).send('OK');
    });

    console.log('✅ Webhook handlers ready');
  }

  // Simple priority calculation (will enhance with AI later)
  calculateSlackPriority(data) {
    if (data.event?.channel_type === 'im') return 4; // Direct message
    if (data.event?.text?.includes('<@')) return 3; // Mention
    return 2; // Regular message
  }

  calculateEmailPriority(data) {
    const subject = data.subject?.toLowerCase() || '';
    if (subject.includes('urgent') || subject.includes('asap')) return 5;
    return 3; // Default email priority
  }

  calculateNotionPriority(data) {
    if (data.action === 'updated') return 3;
    if (data.action === 'created') return 2;
    return 2;
  }

  start(port = 3001) {
    this.server = this.app.listen(port, () => {
      console.log(`🔗 Webhook server running on port ${port}`);
    });
  }

  stop() {
    if (this.server) {
      this.server.close();
    }
  }
}

module.exports = RealTimeMonitor;