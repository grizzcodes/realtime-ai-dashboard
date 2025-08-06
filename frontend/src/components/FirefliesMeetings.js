// frontend/src/components/FirefliesMeetings.js
import React, { useState, useEffect } from 'react';
import './FirefliesMeetings.css';

const FirefliesMeetings = () => {
  const [meetings, setMeetings] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [expandedMeeting, setExpandedMeeting] = useState(null);
  const [hoveredMeeting, setHoveredMeeting] = useState(null);
  const [dataSource, setDataSource] = useState('');

  useEffect(() => {
    fetchMeetings();
  }, []);

  const fetchMeetings = async () => {
    try {
      console.log('🔍 Fetching meetings from Slack Fireflies...');
      
      // Try Slack Fireflies first (your real meetings)
      const slackResponse = await fetch('http://localhost:3001/api/slack-fireflies/meetings');
      const slackData = await slackResponse.json();
      
      console.log('📨 Slack Fireflies response:', slackData);
      
      if (slackData.success && slackData.meetings && slackData.meetings.length > 0) {
        // Check if this is demo data or real data
        const isDemo = slackData.source === 'demo' || slackData.meetings[0]?.id?.includes('demo');
        
        if (!isDemo) {
          console.log('✅ Got REAL meetings from Slack:', slackData.meetings.length);
          const parsedMeetings = slackData.meetings.map(meeting => parseMeeting(meeting));
          setMeetings(parsedMeetings);
          setDataSource('Slack Fireflies');
        } else {
          console.log('⚠️ Got demo data, trying direct Fireflies API...');
          // Try direct Fireflies API as fallback
          await tryDirectFireflies();
        }
      } else {
        console.log('⚠️ No meetings from Slack, trying direct Fireflies API...');
        await tryDirectFireflies();
      }
    } catch (err) {
      console.error('❌ Error fetching meetings:', err);
      setError('Failed to load meetings');
    } finally {
      setLoading(false);
    }
  };

  const tryDirectFireflies = async () => {
    try {
      const firefliesResponse = await fetch('http://localhost:3001/api/fireflies/meetings');
      const firefliesData = await firefliesResponse.json();
      
      console.log('📨 Direct Fireflies response:', firefliesData);
      
      if (firefliesData.success && firefliesData.meetings) {
        const parsedMeetings = firefliesData.meetings.map(meeting => parseMeeting(meeting));
        setMeetings(parsedMeetings);
        setDataSource(firefliesData.source === 'demo' ? 'Demo Data' : 'Fireflies API');
      }
    } catch (err) {
      console.error('❌ Direct Fireflies API failed:', err);
    }
  };

  const parseMeeting = (meeting) => {
    // Parse the raw meeting data
    const parsed = { ...meeting };
    
    // Clean up title
    if (parsed.title) {
      parsed.title = parsed.title.replace(/&lt;/g, '<').replace(/&gt;/g, '>').replace(/&amp;/g, '&');
    }

    // Initialize parsed action items array
    parsed.parsedActionItems = [];

    // Parse action items to extract assignees
    if (parsed.actionItems && Array.isArray(parsed.actionItems)) {
      parsed.actionItems.forEach(item => {
        if (typeof item === 'string') {
          // Check for various patterns of assignee:task
          const patterns = [
            /^([A-Z][a-z]+(?: [A-Z][a-z]+)*?):\s*(.+)$/,  // "Name: task"
            /^\*\*([^:*]+):\*\*\s*(.+)$/,                  // "**Name:** task"
            /^([A-Z][a-z]+(?:\s+[A-Z][a-z]+)*)\s*-\s*(.+)$/ // "Name - task"
          ];
          
          let matched = false;
          for (const pattern of patterns) {
            const match = item.match(pattern);
            if (match) {
              parsed.parsedActionItems.push({
                assignee: match[1].trim(),
                task: match[2].trim(),
                fullText: item
              });
              matched = true;
              break;
            }
          }
          
          // If no assignee pattern found, check if it's a task description
          if (!matched && item.length > 10 && !item.startsWith('Date') && !item.startsWith('Time')) {
            // Try to extract assignee from context
            const nameMatch = item.match(/\b([A-Z][a-z]+(?:\s+[A-Z][a-z]+)?)\b/);
            if (nameMatch && ['Mathieu', 'Leo', 'Alec', 'Pablo', 'Steph', 'Anthony', 'Dany'].includes(nameMatch[1])) {
              parsed.parsedActionItems.push({
                assignee: nameMatch[1],
                task: item,
                fullText: item
              });
            } else {
              parsed.parsedActionItems.push({
                assignee: 'Team',
                task: item,
                fullText: item
              });
            }
          }
        }
      });
    }

    // Extract key topics from overview or gist
    const textToAnalyze = parsed.overview || parsed.gist || '';
    if (textToAnalyze) {
      const topics = [];
      const topicPatterns = [
        /budget[^,.]*/gi,
        /project\s+\w+/gi,
        /\b(?:AI|3D|CGI|animation)\b/gi,
        /meeting\s+with\s+\w+/gi,
        /\$[\d,]+k?/gi
      ];
      
      topicPatterns.forEach(pattern => {
        const matches = textToAnalyze.match(pattern);
        if (matches) {
          topics.push(...matches.map(m => m.trim()));
        }
      });
      
      parsed.topics = [...new Set(topics)].slice(0, 3);
    }

    // Ensure we have valid date
    if (!parsed.date) {
      parsed.date = new Date().toISOString();
    }

    return parsed;
  };

  const addToNotion = async (actionItem, meeting) => {
    const notionTask = {
      title: actionItem.task,
      assignee: actionItem.assignee,
      source: `Fireflies: ${meeting.title}`,
      meetingDate: meeting.date,
      dueDate: null,
      priority: detectPriority(actionItem.task),
      meetingUrl: meeting.meetingUrl || meeting.firefliesUrl || '#'
    };

    if (window.confirm(`Add to Notion?\n\nTask: ${actionItem.task}\nAssignee: ${actionItem.assignee}\nPriority: ${notionTask.priority}`)) {
      try {
        const response = await fetch('http://localhost:3001/api/notion/tasks', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json'
          },
          body: JSON.stringify(notionTask)
        });

        if (response.ok) {
          alert('✅ Task added to Notion!');
        } else {
          alert('❌ Failed to add to Notion. Please check your integration.');
        }
      } catch (error) {
        console.error('Error adding to Notion:', error);
        alert('❌ Error connecting to Notion');
      }
    }
  };

  const detectPriority = (task) => {
    const urgentKeywords = ['urgent', 'asap', 'immediately', 'critical', 'today', 'tomorrow'];
    const highKeywords = ['important', 'priority', 'deadline', 'soon', 'this week'];
    
    const taskLower = task.toLowerCase();
    
    if (urgentKeywords.some(keyword => taskLower.includes(keyword))) {
      return 'Urgent';
    }
    if (highKeywords.some(keyword => taskLower.includes(keyword))) {
      return 'High';
    }
    return 'Medium';
  };

  const formatDuration = (duration) => {
    if (!duration) return 'N/A';
    if (typeof duration === 'string') return duration;
    return `${duration}m`;
  };

  if (loading) {
    return (
      <div className="fireflies-container">
        <div className="fireflies-header">
          <h2>🎙️ Meeting Recaps</h2>
          <span className="data-source">Loading...</span>
        </div>
        <div className="loading">Fetching meetings from Slack...</div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="fireflies-container">
        <div className="fireflies-header">
          <h2>🎙️ Meeting Recaps</h2>
        </div>
        <div className="error">{error}</div>
      </div>
    );
  }

  return (
    <div className="fireflies-container">
      <div className="fireflies-header">
        <h2>🎙️ Meeting Recaps ({meetings.length})</h2>
        <div className="header-actions">
          <span className="data-source">Source: {dataSource}</span>
          <button onClick={fetchMeetings} className="refresh-btn">
            🔄 Refresh
          </button>
        </div>
      </div>

      {meetings.length === 0 ? (
        <div className="no-meetings">
          <p>No meetings found. Make sure:</p>
          <ul>
            <li>Slack bot is invited to #fireflies-ai channel</li>
            <li>There are Fireflies summaries in the channel</li>
            <li>Bot has proper permissions (groups:read, groups:history)</li>
          </ul>
        </div>
      ) : (
        <div className="meetings-grid">
          {meetings.map((meeting) => (
            <div 
              key={meeting.id} 
              className={`meeting-card ${expandedMeeting === meeting.id ? 'expanded' : ''}`}
              onMouseEnter={() => setHoveredMeeting(meeting.id)}
              onMouseLeave={() => setHoveredMeeting(null)}
            >
              {/* Meeting Header */}
              <div className="meeting-header">
                <h3 className="meeting-title">{meeting.title}</h3>
                <button 
                  className="expand-btn"
                  onClick={() => setExpandedMeeting(expandedMeeting === meeting.id ? null : meeting.id)}
                >
                  {expandedMeeting === meeting.id ? '➖' : '➕'}
                </button>
              </div>

              {/* Meeting Meta */}
              <div className="meeting-meta">
                <span className="meeting-date">📅 {meeting.dateFormatted || new Date(meeting.date).toLocaleDateString()}</span>
                <span className="meeting-duration">⏱️ {formatDuration(meeting.duration)}</span>
                <span className="meeting-attendees">👥 {meeting.attendees || meeting.participants?.length || 0}</span>
              </div>

              {/* Quick Preview */}
              <div className="meeting-preview">
                {(meeting.gist || meeting.overview) && (
                  <p className="meeting-gist">
                    {(meeting.gist || meeting.overview).substring(0, 150)}...
                  </p>
                )}
                
                {meeting.topics && meeting.topics.length > 0 && (
                  <div className="meeting-topics">
                    {meeting.topics.map((topic, idx) => (
                      <span key={idx} className="topic-tag">{topic}</span>
                    ))}
                  </div>
                )}
              </div>

              {/* Hover Details */}
              {hoveredMeeting === meeting.id && !expandedMeeting && (
                <div className="hover-details">
                  {meeting.participants && meeting.participants.length > 0 && (
                    <div className="participants-section">
                      <strong>Participants:</strong>
                      <div className="participants-list">
                        {meeting.participants.slice(0, 5).map((p, idx) => (
                          <span key={idx} className="participant">{p.split('@')[0]}</span>
                        ))}
                        {meeting.participants.length > 5 && (
                          <span className="participant">+{meeting.participants.length - 5} more</span>
                        )}
                      </div>
                    </div>
                  )}
                  
                  {meeting.parsedActionItems && meeting.parsedActionItems.length > 0 && (
                    <div className="preview-actions">
                      <strong>Action Items: {meeting.parsedActionItems.length}</strong>
                    </div>
                  )}

                  <div className="hover-hint">Click + to see full details</div>
                </div>
              )}

              {/* Expanded Details */}
              {expandedMeeting === meeting.id && (
                <div className="expanded-details">
                  {/* Participants */}
                  {meeting.participants && meeting.participants.length > 0 && (
                    <div className="detail-section">
                      <h4>Participants</h4>
                      <div className="participants-grid">
                        {meeting.participants.map((participant, idx) => (
                          <div key={idx} className="participant-chip">
                            {participant.split('@')[0]}
                          </div>
                        ))}
                      </div>
                    </div>
                  )}

                  {/* Action Items with Assignees */}
                  {meeting.parsedActionItems && meeting.parsedActionItems.length > 0 && (
                    <div className="detail-section">
                      <h4>Action Items ({meeting.parsedActionItems.length})</h4>
                      <div className="action-items-list">
                        {meeting.parsedActionItems.map((item, idx) => (
                          <div key={idx} className="action-item">
                            <div className="action-assignee">
                              <span className="assignee-badge">{item.assignee}</span>
                            </div>
                            <div className="action-content">
                              <p className="action-task">{item.task}</p>
                              <button 
                                className="notion-add-btn"
                                onClick={() => addToNotion(item, meeting)}
                                title="Add to Notion"
                              >
                                ➕ Notion
                              </button>
                            </div>
                          </div>
                        ))}
                      </div>
                      
                      {meeting.parsedActionItems.length > 1 && (
                        <button 
                          className="add-all-notion-btn"
                          onClick={() => {
                            if (window.confirm(`Add all ${meeting.parsedActionItems.length} action items to Notion?`)) {
                              meeting.parsedActionItems.forEach(item => addToNotion(item, meeting));
                            }
                          }}
                        >
                          📝 Add All to Notion
                        </button>
                      )}
                    </div>
                  )}

                  {/* Full Overview */}
                  {meeting.overview && (
                    <div className="detail-section">
                      <h4>Overview</h4>
                      <p className="overview-text">{meeting.overview}</p>
                    </div>
                  )}

                  {/* Meeting Link */}
                  {(meeting.firefliesUrl || meeting.meetingUrl) && meeting.firefliesUrl !== '#' && (
                    <div className="detail-section">
                      <a 
                        href={meeting.firefliesUrl || meeting.meetingUrl} 
                        target="_blank" 
                        rel="noopener noreferrer"
                        className="fireflies-link"
                      >
                        🔗 View Full Transcript in Fireflies
                      </a>
                    </div>
                  )}
                </div>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  );
};

export default FirefliesMeetings;
