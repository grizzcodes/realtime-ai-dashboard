// frontend/src/components/FirefliesMeetings.js
import React, { useState, useEffect } from 'react';
import './FirefliesMeetings.css';

const FirefliesMeetings = () => {
  const [meetings, setMeetings] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [expandedMeeting, setExpandedMeeting] = useState(null);
  const [hoveredMeeting, setHoveredMeeting] = useState(null);

  useEffect(() => {
    fetchMeetings();
  }, []);

  const fetchMeetings = async () => {
    try {
      // Try Slack Fireflies first
      const response = await fetch('http://localhost:3001/api/slack-fireflies/meetings');
      const data = await response.json();
      
      if (data.success && data.meetings && data.meetings.length > 0) {
        const parsedMeetings = data.meetings.map(meeting => parseMeeting(meeting));
        setMeetings(parsedMeetings);
      } else {
        // Fallback to regular Fireflies API
        const fallbackResponse = await fetch('http://localhost:3001/api/fireflies/meetings');
        const fallbackData = await fallbackResponse.json();
        if (fallbackData.success) {
          setMeetings(fallbackData.meetings);
        }
      }
    } catch (err) {
      setError('Failed to load meetings');
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const parseMeeting = (meeting) => {
    // Parse the raw meeting data from Slack
    const parsed = { ...meeting };
    
    // Clean up title
    if (parsed.title) {
      parsed.title = parsed.title.replace(/&lt;/g, '<').replace(/&gt;/g, '>').replace(/&amp;/g, '&');
    }

    // Parse action items to extract assignees
    if (parsed.actionItems && Array.isArray(parsed.actionItems)) {
      parsed.parsedActionItems = [];
      
      parsed.actionItems.forEach(item => {
        // Check if item contains assignee pattern "Name: Task"
        const assigneeMatch = item.match(/^([A-Z][a-z]+(?: [A-Z][a-z]+)*?):\s*(.+)$/);
        
        if (assigneeMatch) {
          parsed.parsedActionItems.push({
            assignee: assigneeMatch[1],
            task: assigneeMatch[2],
            fullText: item
          });
        } else if (typeof item === 'string' && item.length > 10) {
          // If no assignee pattern, treat as general action item
          parsed.parsedActionItems.push({
            assignee: 'Team',
            task: item,
            fullText: item
          });
        }
      });
    }

    // Extract key topics from overview
    if (parsed.overview) {
      const topics = [];
      // Look for key phrases
      const topicPatterns = [
        /budget[^,.]*/gi,
        /timeline[^,.]*/gi,
        /deliverable[^,.]*/gi,
        /project[^,.]*/gi,
        /meeting[^,.]*/gi
      ];
      
      topicPatterns.forEach(pattern => {
        const matches = parsed.overview.match(pattern);
        if (matches) {
          topics.push(...matches);
        }
      });
      
      parsed.topics = [...new Set(topics)].slice(0, 3);
    }

    return parsed;
  };

  const addToNotion = async (actionItem, meeting) => {
    // Prepare data for Notion
    const notionTask = {
      title: actionItem.task,
      assignee: actionItem.assignee,
      source: `Fireflies: ${meeting.title}`,
      meetingDate: meeting.date,
      dueDate: null, // Can be set based on urgency
      priority: detectPriority(actionItem.task),
      meetingUrl: meeting.meetingUrl || meeting.firefliesUrl
    };

    // Show confirmation dialog
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
    if (duration.includes('min')) return duration;
    if (duration.includes('m')) return duration;
    return duration;
  };

  if (loading) {
    return (
      <div className="fireflies-container">
        <div className="fireflies-header">
          <h2>🎙️ Meeting Recaps</h2>
        </div>
        <div className="loading">Loading meetings...</div>
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
        <button onClick={fetchMeetings} className="refresh-btn">
          🔄 Refresh
        </button>
      </div>

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
              <span className="meeting-date">📅 {meeting.dateFormatted}</span>
              <span className="meeting-duration">⏱️ {formatDuration(meeting.duration)}</span>
              <span className="meeting-attendees">👥 {meeting.attendees || meeting.participants?.length || 0}</span>
            </div>

            {/* Quick Preview (always visible) */}
            <div className="meeting-preview">
              {meeting.gist || meeting.overview ? (
                <p className="meeting-gist">{(meeting.gist || meeting.overview).substring(0, 100)}...</p>
              ) : null}
              
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
                <div className="participants-section">
                  <strong>Participants:</strong>
                  <div className="participants-list">
                    {meeting.participants?.map((p, idx) => (
                      <span key={idx} className="participant">{p.split('@')[0]}</span>
                    ))}
                  </div>
                </div>
                
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
                    <h4>Action Items</h4>
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
    </div>
  );
};

export default FirefliesMeetings;
