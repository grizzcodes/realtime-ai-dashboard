// backend/src/routes/slackFirefliesRoutes.js - Enhanced Fireflies integration via Slack
const FirefliesParser = require('../../services/fireflies-parser');

// Initialize parser with Slack token
const firefliesParser = new FirefliesParser(process.env.SLACK_BOT_TOKEN);

// Get Fireflies meetings from Slack channel using the new parser
async function getSlackFirefliesMeetings(req, res) {
  try {
    console.log('🎙️ Fetching Fireflies meetings from Slack channel...');
    
    if (!process.env.SLACK_BOT_TOKEN) {
      return res.status(400).json({
        success: false,
        error: 'Slack not configured',
        meetings: []
      });
    }

    // Use the new parser to fetch meetings with all content
    const limit = parseInt(req.query.limit) || 20;
    const meetings = await firefliesParser.fetchRecentMeetings('fireflies-ai', limit);
    
    // Transform meetings for frontend consumption
    const transformedMeetings = meetings.map(meeting => ({
      id: meeting.url ? meeting.url.split('/').pop() : Date.now().toString(),
      title: meeting.title || 'Untitled Meeting',
      date: meeting.timestamp,
      meetingDateTime: meeting.date,
      duration: extractDuration(meeting.date),
      participants: Array.isArray(meeting.participants) 
        ? meeting.participants.join(', ') 
        : meeting.participants,
      attendees: meeting.participants?.length || 1,
      gist: meeting.gist,
      overview: Array.isArray(meeting.overview) 
        ? meeting.overview.join('\n• ') 
        : meeting.overview,
      notes: Array.isArray(meeting.notes) 
        ? formatNotes(meeting.notes) 
        : meeting.notes,
      summary: meeting.gist, // Use gist as summary if no separate summary
      actionItems: meeting.actionItems, // This is already in the correct format
      source: 'slack-fireflies',
      firefliesUrl: meeting.url
    }));
    
    // Calculate total action items
    const totalActionItems = transformedMeetings.reduce((total, meeting) => {
      if (meeting.actionItems && Array.isArray(meeting.actionItems)) {
        return total + meeting.actionItems.reduce((sum, item) => {
          return sum + (item.tasks ? item.tasks.length : 0);
        }, 0);
      }
      return total;
    }, 0);
    
    console.log(`🎯 Found ${transformedMeetings.length} Fireflies meetings with ${totalActionItems} total action items`);
    
    res.json({
      success: true,
      meetings: transformedMeetings,
      count: transformedMeetings.length,
      totalActionItems: totalActionItems,
      channelInfo: {
        name: 'fireflies-ai',
        isPrivate: true,
        isMember: true
      }
    });

  } catch (error) {
    console.error('❌ Failed to get Slack Fireflies meetings:', error);
    
    res.status(500).json({
      success: false,
      error: error.message,
      meetings: []
    });
  }
}

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

// Export route handler
module.exports = (app) => {
  app.get('/api/slack-fireflies/meetings', getSlackFirefliesMeetings);
  console.log('🎙️ Slack-Fireflies routes loaded with enhanced parser');
};
