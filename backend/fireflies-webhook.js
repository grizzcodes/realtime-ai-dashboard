// backend/fireflies-webhook.js - Fireflies webhook endpoint

const fs = require('fs').promises;
const path = require('path');

// Directory to store webhook data
const WEBHOOK_DATA_DIR = path.join(__dirname, 'data', 'fireflies-webhooks');

// Ensure data directory exists
(async () => {
  try {
    await fs.mkdir(WEBHOOK_DATA_DIR, { recursive: true });
    console.log('📁 Fireflies webhook data directory ready');
  } catch (error) {
    console.error('Failed to create webhook data directory:', error);
  }
})();

// Webhook endpoint to receive Fireflies data
app.post('/api/webhook/fireflies', async (req, res) => {
  try {
    console.log('🎯 Received Fireflies webhook');
    console.log('Headers:', req.headers);
    
    // Log the webhook payload for debugging
    console.log('Webhook payload type:', typeof req.body);
    console.log('Webhook payload keys:', Object.keys(req.body || {}));
    
    // Store the raw webhook data
    const timestamp = new Date().toISOString();
    const webhookId = `fireflies-${Date.now()}`;
    
    const webhookData = {
      id: webhookId,
      timestamp: timestamp,
      headers: req.headers,
      body: req.body,
      source: 'fireflies-webhook'
    };
    
    // Save to file for persistence
    const filename = `${webhookId}.json`;
    const filepath = path.join(WEBHOOK_DATA_DIR, filename);
    
    await fs.writeFile(filepath, JSON.stringify(webhookData, null, 2));
    console.log(`💾 Saved webhook data to ${filename}`);
    
    // Parse the Fireflies data
    const meeting = parseFirefliesWebhook(req.body);
    
    if (meeting) {
      // Emit to connected clients via WebSocket
      io.emit('newMeeting', {
        type: 'fireflies_meeting',
        meeting: meeting,
        timestamp: timestamp
      });
      
      console.log(`✅ Processed Fireflies meeting: ${meeting.title}`);
    }
    
    // Always respond with 200 to acknowledge receipt
    res.status(200).json({
      success: true,
      message: 'Webhook received',
      id: webhookId
    });
    
  } catch (error) {
    console.error('❌ Webhook processing error:', error);
    // Still return 200 to prevent retries
    res.status(200).json({
      success: false,
      error: error.message
    });
  }
});

// Get stored webhook meetings
app.get('/api/webhook/fireflies/meetings', async (req, res) => {
  try {
    console.log('📋 Fetching stored Fireflies webhook meetings...');
    
    // Read all webhook files
    const files = await fs.readdir(WEBHOOK_DATA_DIR);
    const jsonFiles = files.filter(f => f.endsWith('.json'));
    
    const meetings = [];
    
    for (const file of jsonFiles) {
      try {
        const filepath = path.join(WEBHOOK_DATA_DIR, file);
        const content = await fs.readFile(filepath, 'utf-8');
        const webhookData = JSON.parse(content);
        
        const meeting = parseFirefliesWebhook(webhookData.body);
        if (meeting) {
          meetings.push(meeting);
        }
      } catch (error) {
        console.error(`Failed to read webhook file ${file}:`, error);
      }
    }
    
    // Sort by date, newest first
    meetings.sort((a, b) => new Date(b.date) - new Date(a.date));
    
    console.log(`Found ${meetings.length} webhook meetings`);
    
    res.json({
      success: true,
      meetings: meetings,
      count: meetings.length,
      source: 'webhook'
    });
    
  } catch (error) {
    console.error('❌ Failed to get webhook meetings:', error);
    res.status(500).json({
      success: false,
      error: error.message,
      meetings: []
    });
  }
});

// Clear webhook data (for testing)
app.delete('/api/webhook/fireflies/clear', async (req, res) => {
  try {
    const files = await fs.readdir(WEBHOOK_DATA_DIR);
    
    for (const file of files) {
      if (file.endsWith('.json')) {
        await fs.unlink(path.join(WEBHOOK_DATA_DIR, file));
      }
    }
    
    console.log('🗑️ Cleared webhook data');
    res.json({ success: true, message: 'Webhook data cleared' });
    
  } catch (error) {
    console.error('Failed to clear webhook data:', error);
    res.status(500).json({ success: false, error: error.message });
  }
});

// Parse Fireflies webhook data into our meeting format
function parseFirefliesWebhook(data) {
  try {
    if (!data) return null;
    
    // Fireflies webhook format may vary, so we'll handle multiple possibilities
    let meeting = {};
    
    // If it's a transcript object
    if (data.transcript || data.meeting) {
      const transcript = data.transcript || data.meeting;
      
      meeting = {
        id: transcript.id || `webhook-${Date.now()}`,
        title: transcript.title || transcript.name || 'Untitled Meeting',
        date: transcript.date || transcript.start_time || new Date().toISOString(),
        duration: transcript.duration ? `${Math.round(transcript.duration / 60)}m` : 'N/A',
        attendees: transcript.participants?.length || transcript.attendees?.length || 0,
        participants: extractParticipants(transcript),
        actionItems: extractActionItems(transcript),
        summary: transcript.summary?.overview || transcript.summary || transcript.gist || '',
        overview: transcript.summary?.overview || transcript.overview || '',
        gist: transcript.summary?.gist || transcript.gist || '',
        keywords: transcript.summary?.keywords || transcript.keywords || [],
        notes: transcript.summary?.notes || transcript.notes || '',
        meetingUrl: transcript.meeting_url || transcript.url || '#',
        firefliesUrl: transcript.fireflies_url || transcript.view_url || 
                      (transcript.id ? `https://app.fireflies.ai/view/${transcript.id}` : '#'),
        source: 'fireflies-webhook',
        raw: transcript // Keep raw data for debugging
      };
    }
    // If it's a direct meeting format
    else if (data.title || data.name) {
      meeting = {
        id: data.id || `webhook-${Date.now()}`,
        title: data.title || data.name || 'Untitled Meeting',
        date: data.date || data.start_time || new Date().toISOString(),
        duration: data.duration || 'N/A',
        attendees: data.attendees || 0,
        participants: data.participants || [],
        actionItems: extractActionItems(data),
        summary: data.summary || data.gist || '',
        overview: data.overview || '',
        gist: data.gist || '',
        keywords: data.keywords || [],
        notes: data.notes || '',
        meetingUrl: data.meeting_url || '#',
        firefliesUrl: data.fireflies_url || '#',
        source: 'fireflies-webhook',
        raw: data
      };
    }
    
    return meeting.title ? meeting : null;
    
  } catch (error) {
    console.error('Failed to parse Fireflies webhook:', error);
    return null;
  }
}

// Extract participants from various formats
function extractParticipants(data) {
  if (data.participants) {
    return data.participants.map(p => 
      typeof p === 'string' ? p : (p.name || p.email || 'Unknown')
    );
  }
  if (data.attendees) {
    return data.attendees.map(a => 
      typeof a === 'string' ? a : (a.name || a.email || 'Unknown')
    );
  }
  return [];
}

// Extract action items from various formats
function extractActionItems(data) {
  const actionItems = [];
  
  // Check for structured action items
  if (data.action_items || data.actionItems) {
    const items = data.action_items || data.actionItems;
    
    for (const item of items) {
      if (typeof item === 'string') {
        actionItems.push({
          task: item,
          assignee: 'Team',
          isAssigned: false
        });
      } else if (item.text || item.task) {
        actionItems.push({
          task: item.text || item.task,
          assignee: item.assignee || item.assigned_to || 'Team',
          isAssigned: !!item.assignee || !!item.assigned_to
        });
      }
    }
  }
  
  // Check in summary
  if (data.summary?.action_items) {
    for (const item of data.summary.action_items) {
      if (typeof item === 'string') {
        actionItems.push({
          task: item,
          assignee: 'Team',
          isAssigned: false
        });
      } else {
        actionItems.push({
          task: item.text || item.task || item,
          assignee: item.assignee || 'Team',
          isAssigned: !!item.assignee
        });
      }
    }
  }
  
  // Check for action items by assignee (Fireflies sometimes groups them)
  if (data.action_items_by_assignee || data.actionItemsByAssignee) {
    const itemsByAssignee = data.action_items_by_assignee || data.actionItemsByAssignee;
    
    for (const [assignee, tasks] of Object.entries(itemsByAssignee)) {
      if (Array.isArray(tasks)) {
        for (const task of tasks) {
          actionItems.push({
            task: typeof task === 'string' ? task : task.text || task.task,
            assignee: assignee,
            isAssigned: true
          });
        }
      }
    }
  }
  
  return actionItems;
}

console.log('🪝 Fireflies webhook endpoint ready at /api/webhook/fireflies');
console.log('📍 Webhook URL: http://YOUR_DOMAIN:3001/api/webhook/fireflies');
