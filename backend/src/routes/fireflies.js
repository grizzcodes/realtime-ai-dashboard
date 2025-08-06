// backend/src/routes/fireflies.js
const express = require('express');
const router = express.Router();
const FirefliesService = require('../services/firefliesService');

const firefliesService = new FirefliesService();
firefliesService.initialize();

// Get recent meetings - REAL DATA
router.get('/meetings', async (req, res) => {
  try {
    console.log('🎙️ Fetching Fireflies meetings...');
    
    // Initialize if needed
    if (!firefliesService.initialized) {
      console.log('⚠️ Fireflies service not initialized, initializing now...');
      await firefliesService.initialize();
    }
    
    // First get user info to know we have transcripts
    const userResult = await firefliesService.getUserRecentMeeting();
    
    if (userResult.success && userResult.user) {
      console.log(`📊 User has ${userResult.user.num_transcripts} transcripts`);
      
      // Try to get transcripts using user_id
      let result;
      if (userResult.user.user_id) {
        result = await firefliesService.getUserTranscripts(userResult.user.user_id, 20);
      } else {
        result = await firefliesService.getMeetings();
      }
      
      console.log('📊 Fireflies meetings result:', {
        success: result.success,
        meetingsCount: result.meetings?.length || result.transcripts?.length || 0,
        error: result.error
      });
      
      // Format transcripts as meetings if we got raw transcripts
      let meetings = result.meetings || [];
      if (result.transcripts && result.transcripts.length > 0) {
        meetings = result.transcripts.map(t => {
          const meetingDate = t.date ? new Date(parseInt(t.date)) : new Date();
          return {
            id: t.id,
            title: t.title || 'Untitled Meeting',
            date: meetingDate.toISOString(),
            dateFormatted: meetingDate.toLocaleDateString(),
            duration: t.duration ? `${Math.round(t.duration / 60)}m` : 'N/A',
            attendees: Array.isArray(t.participants) ? t.participants.length : 0,
            participants: t.participants || [],
            actionItems: t.summary?.action_items || [],
            overview: t.summary?.overview || '',
            keywords: t.summary?.keywords || [],
            host: t.host_email || t.organizer_email || 'Unknown',
            meetingUrl: t.meeting_url || '#'
          };
        });
      }
      
      if (meetings.length > 0) {
        res.json({
          success: true,
          meetings: meetings,
          count: meetings.length,
          source: 'fireflies',
          totalTranscripts: userResult.user.num_transcripts
        });
        return;
      }
    }
    
    // If we still don't have meetings, return demo data with info
    console.log('⚠️ Could not fetch real meetings, returning demo data');
    res.json({
      success: true,
      meetings: [
        {
          id: 'demo-1',
          title: 'Weekly Team Standup',
          date: new Date().toISOString(),
          duration: '30m',
          attendees: 5,
          actionItems: ['Review sprint goals', 'Update client on progress', 'Schedule design review']
        },
        {
          id: 'demo-2',
          title: 'Client Discovery Call - TechCorp',
          date: new Date(Date.now() - 24*60*60*1000).toISOString(),
          duration: '45m',
          attendees: 3,
          actionItems: ['Send proposal draft', 'Schedule technical demo']
        }
      ],
      count: 2,
      message: `You have ${userResult.user?.num_transcripts || 0} transcripts but couldn't fetch them. Check /api/fireflies/debug`,
      source: 'demo',
      totalTranscripts: userResult.user?.num_transcripts || 0
    });
  } catch (error) {
    console.error('❌ Failed to get Fireflies meetings:', error);
    res.status(500).json({
      success: false,
      error: error.message,
      meetings: []
    });
  }
});

// Get raw transcripts
router.get('/transcripts', async (req, res) => {
  try {
    console.log('📜 Fetching Fireflies transcripts...');
    
    const limit = parseInt(req.query.limit) || 20;
    const skip = parseInt(req.query.skip) || 0;
    
    const result = await firefliesService.getRecentTranscripts(limit, skip);
    
    console.log('📊 Transcripts result:', {
      success: result.success,
      count: result.transcripts?.length || 0,
      error: result.error
    });
    
    res.json({
      success: result.success,
      transcripts: result.transcripts || [],
      count: result.transcripts?.length || 0,
      error: result.error
    });
  } catch (error) {
    console.error('❌ Failed to get transcripts:', error);
    res.status(500).json({
      success: false,
      error: error.message,
      transcripts: []
    });
  }
});

// Get transcripts by user
router.get('/user-transcripts', async (req, res) => {
  try {
    console.log('👤 Getting user transcripts...');
    
    // First get user info
    const userResult = await firefliesService.getUserRecentMeeting();
    
    if (userResult.success && userResult.user) {
      const userId = userResult.user.user_id;
      const limit = parseInt(req.query.limit) || 20;
      
      // Get transcripts for this user
      const result = await firefliesService.getUserTranscripts(userId, limit);
      
      res.json({
        success: result.success,
        transcripts: result.transcripts || [],
        count: result.transcripts?.length || 0,
        totalAvailable: userResult.user.num_transcripts,
        user: {
          name: userResult.user.name,
          email: userResult.user.email,
          transcriptsCount: userResult.user.num_transcripts
        }
      });
    } else {
      res.json({
        success: false,
        error: 'Could not get user info'
      });
    }
  } catch (error) {
    console.error('❌ Failed to get user transcripts:', error);
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

// Test connection
router.get('/test', async (req, res) => {
  try {
    console.log('🧪 Testing Fireflies connection...');
    const result = await firefliesService.testConnection();
    console.log('✅ Test result:', result);
    res.json(result);
  } catch (error) {
    console.error('❌ Fireflies test failed:', error);
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

// Get user info including recent meetings
router.get('/user', async (req, res) => {
  try {
    console.log('👤 Getting user info...');
    const result = await firefliesService.getUserRecentMeeting();
    
    if (result.success && result.user) {
      console.log('📊 User has:', {
        transcripts: result.user.num_transcripts,
        recentMeeting: result.user.recent_meeting,
        recentTranscript: result.user.recent_transcript
      });
      
      // Try to fetch the recent transcript
      let recentTranscript = null;
      if (result.user.recent_transcript) {
        const transcriptResult = await firefliesService.getTranscriptById(result.user.recent_transcript);
        recentTranscript = transcriptResult.transcript;
      }
      
      res.json({
        success: true,
        user: result.user,
        recentTranscript: recentTranscript,
        message: recentTranscript ? 'Recent transcript fetched' : 'Could not fetch recent transcript'
      });
    } else {
      res.json({
        success: false,
        error: result.error || 'Failed to get user data'
      });
    }
  } catch (error) {
    console.error('❌ Failed to get user info:', error);
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

// Enhanced debug endpoint
router.get('/debug', async (req, res) => {
  try {
    console.log('🔍 Debug: Running comprehensive Fireflies check...');
    
    // Initialize if needed
    if (!firefliesService.initialized) {
      await firefliesService.initialize();
    }
    
    // Get user info
    const userResult = await firefliesService.getUserRecentMeeting();
    
    // Try different methods to get transcripts
    let transcriptsDefault = { transcripts: [] };
    let transcriptsWithUser = { transcripts: [] };
    let recentTranscript = null;
    
    try {
      // Method 1: Default query
      transcriptsDefault = await firefliesService.getRecentTranscripts(5, 0);
    } catch (e) {
      console.error('Default transcripts failed:', e.message);
    }
    
    try {
      // Method 2: With user ID
      if (userResult.user?.user_id) {
        transcriptsWithUser = await firefliesService.getUserTranscripts(userResult.user.user_id, 5);
      }
    } catch (e) {
      console.error('User transcripts failed:', e.message);
    }
    
    try {
      // Method 3: Get specific transcript
      if (userResult.user?.recent_transcript) {
        const result = await firefliesService.getTranscriptById(userResult.user.recent_transcript);
        recentTranscript = result.transcript;
      }
    } catch (e) {
      console.error('Recent transcript failed:', e.message);
    }
    
    res.json({
      initialized: firefliesService.initialized,
      apiKey: firefliesService.apiKey ? `${firefliesService.apiKey.slice(0, 8)}...` : 'MISSING',
      user: userResult.user || null,
      methods: {
        defaultQuery: {
          success: transcriptsDefault.transcripts?.length > 0,
          count: transcriptsDefault.transcripts?.length || 0,
          firstTitle: transcriptsDefault.transcripts?.[0]?.title || null
        },
        userQuery: {
          success: transcriptsWithUser.transcripts?.length > 0,
          count: transcriptsWithUser.transcripts?.length || 0,
          firstTitle: transcriptsWithUser.transcripts?.[0]?.title || null
        },
        specificTranscript: {
          success: !!recentTranscript,
          title: recentTranscript?.title || null,
          id: recentTranscript?.id || null
        }
      },
      summary: {
        totalTranscripts: userResult.user?.num_transcripts || 0,
        minutesConsumed: userResult.user?.minutes_consumed || 0,
        recentTranscriptId: userResult.user?.recent_transcript || null,
        message: 'Check console logs for detailed debug information'
      }
    });
  } catch (error) {
    console.error('❌ Debug failed:', error);
    res.status(500).json({
      success: false,
      error: error.message,
      stack: error.stack
    });
  }
});

module.exports = router;
