// backend/src/routes/fireflies.js
const express = require('express');
const router = express.Router();
const FirefliesService = require('../services/firefliesService');

const firefliesService = new FirefliesService();
firefliesService.initialize();

// Get recent meetings
router.get('/meetings', async (req, res) => {
  try {
    console.log('🎙️ Fetching Fireflies meetings...');
    
    // First check if service is initialized
    if (!firefliesService.initialized) {
      console.log('⚠️ Fireflies service not initialized, initializing now...');
      await firefliesService.initialize();
    }
    
    const result = await firefliesService.getMeetings();
    
    console.log('📊 Fireflies result:', {
      success: result.success,
      meetingsCount: result.meetings?.length || 0,
      error: result.error
    });
    
    if (result.success && result.meetings && result.meetings.length > 0) {
      res.json({
        success: true,
        meetings: result.meetings,
        count: result.meetings.length,
        source: 'fireflies'
      });
    } else {
      // Log why we're using demo data
      console.log('⚠️ Using demo data because:', result.error || 'No meetings found');
      
      // Return demo data on failure or no meetings
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
          },
          {
            id: 'demo-3',
            title: 'Product Strategy Meeting',
            date: new Date(Date.now() - 2*24*60*60*1000).toISOString(),
            duration: '60m',
            attendees: 8,
            actionItems: ['Finalize Q1 roadmap', 'Research competitor features', 'Update pricing model']
          }
        ],
        count: 3,
        message: result.error || 'No meetings found in Fireflies account',
        source: 'demo'
      });
    }
  } catch (error) {
    console.error('❌ Failed to get Fireflies meetings:', error);
    res.status(500).json({
      success: false,
      error: error.message,
      meetings: []
    });
  }
});

// Get recent transcripts with better logging
router.get('/transcripts', async (req, res) => {
  try {
    console.log('📜 Fetching Fireflies transcripts...');
    
    const limit = parseInt(req.query.limit) || 10;
    const result = await firefliesService.getRecentTranscripts(limit);
    
    console.log('📊 Transcripts result:', {
      success: result.success,
      count: result.transcripts?.length || 0,
      error: result.error
    });
    
    if (result.transcripts && result.transcripts.length > 0) {
      console.log('✅ Found transcripts:', result.transcripts.map(t => ({
        id: t.id,
        title: t.title,
        date: t.date
      })));
    }
    
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

// Test connection with detailed info
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
      
      // If user has a recent transcript, fetch it
      if (result.user.recent_transcript) {
        const transcriptResult = await firefliesService.getTranscriptById(result.user.recent_transcript);
        
        res.json({
          success: true,
          user: result.user,
          recentTranscript: transcriptResult.transcript || null
        });
      } else {
        res.json({
          success: true,
          user: result.user,
          message: 'No recent transcripts found'
        });
      }
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

// Debug endpoint to check raw transcripts
router.get('/debug', async (req, res) => {
  try {
    console.log('🔍 Debug: Fetching raw transcripts...');
    
    // Initialize if needed
    if (!firefliesService.initialized) {
      await firefliesService.initialize();
    }
    
    // Get user info first
    const userResult = await firefliesService.getUserRecentMeeting();
    
    // Get raw transcripts
    const result = await firefliesService.getRecentTranscripts(5);
    
    res.json({
      initialized: firefliesService.initialized,
      apiKey: firefliesService.apiKey ? `${firefliesService.apiKey.slice(0, 8)}...` : 'MISSING',
      user: userResult.user || null,
      success: result.success,
      error: result.error,
      transcriptsCount: result.transcripts?.length || 0,
      rawData: result.transcripts || [],
      message: result.transcripts?.length === 0 ? 
        'No transcripts found. Make sure you have recorded meetings in Fireflies.' : 
        'Transcripts found successfully'
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
