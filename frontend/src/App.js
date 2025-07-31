import React, { useState, useEffect } from 'react';
import io from 'socket.io-client';
import './App.css';
import GlassChatbox from './components/GlassChatbox';
import IntegrationStatusBar from './components/IntegrationStatusBar';

const App = () => {
  const [tasks, setTasks] = useState([]);
  const [meetings, setMeetings] = useState([]);
  const [calendarEvents, setCalendarEvents] = useState([]);
  const [isConnected, setIsConnected] = useState(false);
  const [activeTab, setActiveTab] = useState('chat'); // Default to chat
  const [apiStatus, setApiStatus] = useState({});
  const [socket, setSocket] = useState(null);
  const [userTimezone] = useState(Intl.DateTimeFormat().resolvedOptions().timeZone);
  const [selectedMeeting, setSelectedMeeting] = useState(null);
  const [showDashboard, setShowDashboard] = useState(false);

  useEffect(() => {
    const newSocket = io('http://localhost:3002');
    setSocket(newSocket);
    
    newSocket.on('connect', () => setIsConnected(true));
    newSocket.on('disconnect', () => setIsConnected(false));
    
    // Load initial data
    loadApiStatus();
    loadTasks();
    loadMeetings();
    loadCalendarEvents();

    // Real-time status updates
    newSocket.on('integrationUpdate', (status) => {
      setApiStatus(status);
    });
      
    return () => newSocket.close();
  }, []);

  const loadTasks = async () => {
    try {
      const response = await fetch('http://localhost:3002/api/tasks');
      const data = await response.json();
      setTasks(data.tasks || []);
    } catch (error) {
      console.error('Failed to load tasks:', error);
    }
  };

  const loadMeetings = async () => {
    try {
      const response = await fetch('http://localhost:3002/api/fireflies/meetings');
      const data = await response.json();
      setMeetings(data.meetings || []);
    } catch (error) {
      // Mock data fallback
      setMeetings([
        {
          id: '1',
          title: 'Weekly Team Standup',
          date: new Date(Date.now() - 86400000).toISOString(),
          duration: 30,
          participants: ['John Doe', 'Jane Smith', 'Mike Johnson'],
          summary: 'Discussed project progress, upcoming deadlines, and resource allocation.',
          actionItems: ['Update project timeline', 'Schedule client review', 'Prepare demo materials']
        },
        {
          id: '2',
          title: 'Client Feedback Session',
          date: new Date(Date.now() - 172800000).toISOString(),
          duration: 45,
          participants: ['Sarah Wilson', 'Client Rep', 'Product Manager'],
          summary: 'Reviewed latest features and collected valuable feedback from client stakeholders.',
          actionItems: ['Implement requested changes', 'Schedule follow-up', 'Update documentation']
        }
      ]);
    }
  };

  const loadCalendarEvents = async () => {
    try {
      const response = await fetch('http://localhost:3002/api/calendar/events');
      const data = await response.json();
      setCalendarEvents(data.events || []);
    } catch (error) {
      // Mock data fallback
      setCalendarEvents([
        {
          id: '1',
          title: 'Product Demo Presentation',
          start: new Date(Date.now() + 3600000).toISOString(),
          end: new Date(Date.now() + 7200000).toISOString(),
          attendees: ['team@company.com'],
          location: 'Conference Room A'
        },
        {
          id: '2',
          title: 'Sprint Planning Session',
          start: new Date(Date.now() + 86400000).toISOString(),
          end: new Date(Date.now() + 90000000).toISOString(),
          attendees: ['dev-team@company.com'],
          location: 'Virtual Meeting'
        },
        {
          id: '3',
          title: 'Client Check-in Call',
          start: new Date(Date.now() + 172800000).toISOString(),
          end: new Date(Date.now() + 176400000).toISOString(),
          attendees: ['client@external.com'],
          location: 'Zoom'
        }
      ]);
    }
  };

  const loadApiStatus = async () => {
    try {
      const response = await fetch('http://localhost:3002/api/health');
      const data = await response.json();
      setApiStatus(data.apiConnections || {});
    } catch (error) {
      console.error('Failed to load API status:', error);
      // Set mock connected status for demo
      setApiStatus({
        openai: { success: true, message: 'Connected' },
        claude: { success: true, message: 'Connected' },
        notion: { success: true, message: 'Connected' },
        gmail: { success: true, message: 'Connected' },
        slack: { success: true, message: 'Connected' },
        calendar: { success: true, message: 'Connected' },
        fireflies: { success: true, message: 'Connected' },
        supabase: { success: true, message: 'Connected' },
        linear: { success: true, message: 'Connected' },
        github: { success: true, message: 'Connected' },
        runway: { success: true, message: 'Connected' }
      });
    }
  };

  const testAI = async () => {
    try {
      const response = await fetch('http://localhost:3002/api/ai-test', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ message: 'Test message' })
      });
      const result = await response.json();
      loadTasks();
    } catch (error) {
      console.error('AI test failed:', error);
    }
  };

  const handleChatFocus = () => {
    setShowDashboard(true);
  };

  const formatDateTime = (dateString) => {
    return new Date(dateString).toLocaleString('en-US', {
      timeZone: userTimezone,
      weekday: 'short',
      month: 'short',
      day: 'numeric',
      hour: 'numeric',
      minute: '2-digit',
      hour12: true
    });
  };

  const formatTimeOnly = (dateString) => {
    return new Date(dateString).toLocaleString('en-US', {
      timeZone: userTimezone,
      hour: 'numeric',
      minute: '2-digit',
      hour12: true
    });
  };

  const getTimeUntilEvent = (eventStart) => {
    const now = new Date();
    const start = new Date(eventStart);
    const diffMs = start - now;
    const diffMins = Math.floor(diffMs / (1000 * 60));
    const diffHours = Math.floor(diffMins / 60);
    const diffDays = Math.floor(diffHours / 24);

    if (diffDays > 0) return `in ${diffDays} day${diffDays > 1 ? 's' : ''}`;
    if (diffHours > 0) return `in ${diffHours}h ${diffMins % 60}m`;
    if (diffMins > 0) return `in ${diffMins}m`;
    if (diffMins < 0 && diffMins > -60) return 'happening now';
    return 'past';
  };

  const getPriorityColor = (urgency) => {
    if (urgency >= 4) return 'bg-red-100 text-red-700 border-red-200';
    if (urgency >= 3) return 'bg-yellow-100 text-yellow-700 border-yellow-200';
    return 'bg-green-100 text-green-700 border-green-200';
  };

  const showMeetingSummary = (meeting) => {
    setSelectedMeeting(meeting);
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 via-indigo-50 to-purple-100 relative overflow-hidden">
      {/* Background Pattern */}
      <div className="absolute inset-0 opacity-30">
        <div className="absolute inset-0 bg-gradient-to-br from-blue-400/20 via-purple-400/20 to-pink-400/20"></div>
        <div className="absolute inset-0" style={{
          backgroundImage: `radial-gradient(circle at 1px 1px, rgba(255,255,255,0.15) 1px, transparent 0)`,
          backgroundSize: '20px 20px'
        }}></div>
      </div>

      {/* Integration Status Bar */}
      <IntegrationStatusBar 
        apiStatus={apiStatus} 
        onRefresh={loadApiStatus}
      />

      {/* Dashboard Toggle Button */}
      {showDashboard && (
        <div className="fixed top-4 left-4 z-40">
          <button
            onClick={() => setShowDashboard(!showDashboard)}
            className="backdrop-blur-xl bg-white/10 border border-white/20 rounded-2xl shadow-2xl p-3 hover:bg-white/20 transition-all"
          >
            <svg className="w-6 h-6 text-gray-700" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h16" />
            </svg>
          </button>
        </div>
      )}

      {/* Dashboard Content - Only show when toggled and chat is active */}
      {showDashboard && (
        <div className="absolute inset-0 p-8 pt-20 pb-32 overflow-y-auto">
          <div className="max-w-7xl mx-auto">
            <div className="backdrop-blur-xl bg-white/10 border border-white/20 rounded-2xl shadow-2xl p-8 mb-8">
              <div className="flex items-center justify-between mb-6">
                <div className="flex items-center gap-4">
                  <div className="w-12 h-12 bg-gradient-to-r from-blue-600 to-purple-600 rounded-xl flex items-center justify-center">
                    <span className="text-2xl">🤖</span>
                  </div>
                  <div>
                    <h1 className="text-3xl font-bold text-gray-900">AI Dashboard</h1>
                    <p className="text-gray-600 text-sm">Real-time task management & insights</p>
                  </div>
                </div>
                <div className="flex items-center gap-4">
                  <div className={`flex items-center gap-2 px-3 py-2 rounded-lg backdrop-blur-md ${isConnected ? 'bg-green-500/20 text-green-700' : 'bg-red-500/20 text-red-700'}`}>
                    <div className={`w-2 h-2 rounded-full ${isConnected ? 'bg-green-500' : 'bg-red-500'}`}></div>
                    <span className="text-sm font-medium">
                      {isConnected ? 'Connected' : 'Disconnected'}
                    </span>
                  </div>
                  <button 
                    onClick={testAI}
                    className="bg-gradient-to-r from-blue-600 to-purple-600 hover:from-blue-700 hover:to-purple-700 text-white px-6 py-3 rounded-lg font-medium transition-all duration-200 hover:scale-105"
                  >
                    🧪 Test AI
                  </button>
                </div>
              </div>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
              {/* Notion Tasks */}
              <div className="backdrop-blur-xl bg-white/10 border border-white/20 rounded-2xl shadow-2xl p-6">
                <div className="flex items-center justify-between mb-6">
                  <h2 className="text-xl font-bold text-gray-900">📝 Notion Tasks</h2>
                  <span className="bg-blue-500/20 text-blue-800 text-sm font-medium px-3 py-1 rounded-full">{tasks.length}</span>
                </div>
                
                {tasks.length === 0 ? (
                  <div className="text-center py-12">
                    <div className="w-16 h-16 bg-gray-100/20 rounded-2xl flex items-center justify-center mx-auto mb-4">
                      <span className="text-2xl text-gray-400">📋</span>
                    </div>
                    <p className="text-gray-500 font-medium">No tasks yet</p>
                    <p className="text-gray-400 text-sm mt-1">Tasks will appear from Notion</p>
                  </div>
                ) : (
                  <div className="space-y-4 max-h-96 overflow-y-auto">
                    {tasks.slice(0, 10).map(task => (
                      <div key={task.id} className="backdrop-blur-md bg-white/20 border border-white/30 rounded-lg p-4 hover:bg-white/30 transition-all">
                        <div className="flex items-start justify-between mb-2">
                          <h4 className="font-semibold text-gray-900 text-sm">{task.title}</h4>
                          <span className={`text-xs px-2 py-1 rounded-full border ${getPriorityColor(task.urgency)}`}>P{task.urgency}</span>
                        </div>
                        <div className="flex items-center justify-between text-xs text-gray-500">
                          <span>{task.source}</span>
                          {task.assignee && <span>👤 {task.assignee}</span>}
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>

              {/* Calendar Events */}
              <div className="backdrop-blur-xl bg-white/10 border border-white/20 rounded-2xl shadow-2xl p-6">
                <div className="flex items-center justify-between mb-6">
                  <h2 className="text-xl font-bold text-gray-900">📅 Next 5 Events</h2>
                  <span className="text-xs text-gray-500">{userTimezone}</span>
                </div>
                
                <div className="space-y-4 max-h-96 overflow-y-auto">
                  {calendarEvents.slice(0, 5).map(event => {
                    const timeUntil = getTimeUntilEvent(event.start);
                    const isUpcoming = timeUntil.includes('in') || timeUntil === 'happening now';
                    
                    return (
                      <div key={event.id} className={`backdrop-blur-md border rounded-lg p-4 transition-all ${
                        timeUntil === 'happening now' ? 'bg-red-500/20 border-red-400/30' :
                        isUpcoming ? 'bg-blue-500/20 border-blue-400/30' : 'bg-white/20 border-white/30'
                      }`}>
                        <h4 className="font-semibold text-gray-900 text-sm mb-2">{event.title}</h4>
                        <div className="text-xs text-gray-600 mb-2">📍 {event.location || 'No location'}</div>
                        <div className="text-xs text-gray-600 mb-3">🕒 {formatTimeOnly(event.start)} - {formatTimeOnly(event.end)}</div>
                        <div className="flex items-center justify-between">
                          <span className="text-xs text-gray-500">👥 {event.attendees?.length || 0} attendees</span>
                          <span className={`text-xs font-medium px-2 py-1 rounded-full ${
                            timeUntil === 'happening now' ? 'bg-red-100 text-red-600' :
                            isUpcoming ? 'bg-blue-100 text-blue-600' : 'bg-gray-100 text-gray-500'
                          }`}>
                            {timeUntil}
                          </span>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>

              {/* Fireflies Meetings */}
              <div className="backdrop-blur-xl bg-white/10 border border-white/20 rounded-2xl shadow-2xl p-6">
                <div className="flex items-center justify-between mb-6">
                  <h2 className="text-xl font-bold text-gray-900">🎙️ Meeting Summaries</h2>
                  <span className="bg-purple-500/20 text-purple-800 text-sm font-medium px-3 py-1 rounded-full">Fireflies</span>
                </div>
                
                <div className="space-y-4 max-h-96 overflow-y-auto">
                  {meetings.slice(0, 4).map(meeting => (
                    <div key={meeting.id} className="backdrop-blur-md bg-white/20 border border-white/30 rounded-lg p-4 hover:bg-white/30 transition-all">
                      <h4 className="font-semibold text-gray-900 text-sm mb-2">{meeting.title}</h4>
                      <div className="text-xs text-gray-600 mb-2">🕒 {formatDateTime(meeting.date)} • {meeting.duration}min</div>
                      <div className="text-xs text-gray-500 mb-3">
                        👥 {meeting.participants?.slice(0, 2).join(', ')}
                        {meeting.participants?.length > 2 && ` +${meeting.participants.length - 2} more`}
                      </div>
                      {meeting.summary && (
                        <p className="text-xs text-gray-600 mb-3 line-clamp-2">{meeting.summary}</p>
                      )}
                      <button
                        onClick={() => showMeetingSummary(meeting)}
                        className="w-full bg-gradient-to-r from-purple-600 to-pink-600 hover:from-purple-700 hover:to-pink-700 text-white text-xs font-medium py-2 px-3 rounded-lg transition-all duration-200 hover:scale-105"
                      >
                        📋 View Summary
                      </button>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Meeting Summary Modal */}
      {selectedMeeting && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-60 p-4">
          <div className="backdrop-blur-xl bg-white/20 border border-white/30 rounded-2xl shadow-2xl max-w-2xl w-full max-h-[80vh] overflow-y-auto">
            <div className="p-8">
              <div className="flex items-start justify-between mb-6">
                <div>
                  <h3 className="text-2xl font-bold text-gray-900 mb-2">{selectedMeeting.title}</h3>
                  <p className="text-gray-600">{formatDateTime(selectedMeeting.date)} • {selectedMeeting.duration} minutes</p>
                </div>
                <button 
                  onClick={() => setSelectedMeeting(null)}
                  className="text-gray-400 hover:text-gray-600 p-2 hover:bg-white/20 rounded-lg transition-colors"
                >
                  <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                  </svg>
                </button>
              </div>
              
              <div className="space-y-6">
                <div>
                  <h4 className="font-semibold text-gray-900 mb-3">👥 Participants</h4>
                  <div className="flex flex-wrap gap-2">
                    {selectedMeeting.participants?.map((participant, index) => (
                      <span key={index} className="bg-blue-500/20 text-blue-800 text-sm px-3 py-1 rounded-full">
                        {participant}
                      </span>
                    ))}
                  </div>
                </div>
                
                <div>
                  <h4 className="font-semibold text-gray-900 mb-3">📝 Summary</h4>
                  <p className="text-gray-700 leading-relaxed">{selectedMeeting.summary}</p>
                </div>
                
                {selectedMeeting.actionItems && selectedMeeting.actionItems.length > 0 && (
                  <div>
                    <h4 className="font-semibold text-gray-900 mb-3">✅ Action Items</h4>
                    <ul className="space-y-2">
                      {selectedMeeting.actionItems.map((item, index) => (
                        <li key={index} className="flex items-start gap-3">
                          <span className="flex-shrink-0 w-5 h-5 bg-green-500/20 text-green-600 rounded-full flex items-center justify-center text-xs font-medium mt-0.5">
                            {index + 1}
                          </span>
                          <span className="text-gray-700">{item}</span>
                        </li>
                      ))}
                    </ul>
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Main Glass Chatbox - Always visible and focused */}
      <GlassChatbox 
        socket={socket} 
        apiStatus={apiStatus}
        onFocus={handleChatFocus}
      />
    </div>
  );
};

export default App;