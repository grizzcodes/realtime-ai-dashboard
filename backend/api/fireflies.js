// backend/api/fireflies.js
const express = require('express');
const router = express.Router();
const FirefliesParser = require('../services/fireflies-parser');

// Initialize parser with Slack token
const firefliesParser = new FirefliesParser(process.env.SLACK_BOT_TOKEN);

/**
 * GET /api/fireflies/meetings
 * Fetch recent Fireflies meetings from Slack
 */
router.get('/meetings', async (req, res) => {
  try {
    const limit = parseInt(req.query.limit) || 20;
    const meetings = await firefliesParser.fetchRecentMeetings('fireflies-ai', limit);
    
    // Transform meetings for frontend consumption
    const transformedMeetings = meetings.map(meeting => ({
      id: meeting.url ? meeting.url.split('/').pop() : Date.now().toString(),
      title: meeting.title || 'Untitled Meeting',
      date: meeting.date,
      meetingDateTime: meeting.date,
      participants: Array.isArray(meeting.participants) 
        ? meeting.participants.join(', ') 
        : meeting.participants,
      attendees: meeting.participants?.length || 1,
      duration: extractDuration(meeting.date),
      gist: meeting.gist,
      overview: Array.isArray(meeting.overview) 
        ? meeting.overview.join('\n• ') 
        : meeting.overview,
      notes: Array.isArray(meeting.notes) 
        ? formatNotes(meeting.notes) 
        : meeting.notes,
      actionItems: meeting.actionItems,
      firefliesUrl: meeting.url,
      timestamp: meeting.timestamp
    }));
    
    // Calculate total action items correctly
    const totalActionItems = transformedMeetings.reduce((total, meeting) => {
      if (meeting.actionItems && Array.isArray(meeting.actionItems)) {
        return total + meeting.actionItems.reduce((sum, item) => {
          return sum + (item.tasks ? item.tasks.length : 0);
        }, 0);
      }
      return total;
    }, 0);
    
    res.json({
      success: true,
      meetings: transformedMeetings,
      total: transformedMeetings.length,
      totalActionItems: totalActionItems
    });
  } catch (error) {
    console.error('Error fetching Fireflies meetings:', error);
    res.status(500).json({
      success: false,
      error: error.message,
      meetings: []
    });
  }
});

/**
 * GET /api/fireflies/action-items
 * Get all action items grouped by assignee
 */
router.get('/action-items', async (req, res) => {
  try {
    const meetings = await firefliesParser.fetchRecentMeetings('fireflies-ai', 20);
    const actionItemsByAssignee = firefliesParser.getActionItemsByAssignee(meetings);
    
    res.json({
      success: true,
      actionItems: actionItemsByAssignee,
      totalTasks: Object.values(actionItemsByAssignee).reduce(
        (sum, assignee) => sum + assignee.tasks.length, 0
      )
    });
  } catch (error) {
    console.error('Error fetching action items:', error);
    res.status(500).json({
      success: false,
      error: error.message,
      actionItems: {}
    });
  }
});

/**
 * Helper function to extract duration from date string
 */
function extractDuration(dateStr) {
  if (!dateStr) return 'N/A';
  // Try to extract duration from strings like "Fri, Aug 8th - 12:00 PM PDT (25 mins)"
  const durationMatch = dateStr.match(/\((\d+\s*mins?)\)/);
  return durationMatch ? durationMatch[1] : 'N/A';
}

/**
 * Helper function to format notes sections
 */
function formatNotes(notes) {
  if (!Array.isArray(notes)) return notes;
  
  return notes.map(section => {
    const title = section.title ? `📌 ${section.title}:\n` : '';
    const items = section.items ? section.items.map(item => `  • ${item}`).join('\n') : '';
    return title + items;
  }).join('\n\n');
}

module.exports = router;
