import React, { useState, useEffect } from 'react';
import io from 'socket.io-client';
import './App.css';
import AIChatbox from './components/AIChatbox';

const App = () => {
  const [tasks, setTasks] = useState([]);
  const [meetings, setMeetings] = useState([]);
  const [calendarEvents, setCalendarEvents] = useState([]);
  const [isConnected, setIsConnected] = useState(false);
  const [activeTab, setActiveTab] = useState('dashboard');
  const [apiStatus, setApiStatus] = useState({});
  const [socket, setSocket] = useState(null);
  const [userTimezone] = useState(Intl.DateTimeFormat().resolvedOptions().timeZone);
  const [selectedMeeting, setSelectedMeeting] = useState(null);

  useEffect(() => {
    const newSocket = io('http://localhost:3002');
    setSocket(newSocket);
    
    newSocket.on('connect', () => setIsConnected(true));
    newSocket.on('disconnect', () => setIsConnected(false));
    
    loadTasks();
    loadMeetings();
    loadCalendarEvents();
    loadApiStatus();
      
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
        },
        {
          id: '4',
          title: 'Team Retrospective',
          start: new Date(Date.now() + 259200000).toISOString(),
          end: new Date(Date.now() + 262800000).toISOString(),
          attendees: ['team@company.com'],
          location: 'Conference Room B'
        },
        {
          id: '5',
          title: 'Quarterly Business Review',
          start: new Date(Date.now() + 345600000).toISOString(),
          end: new Date(Date.now() + 352800000).toISOString(),
          attendees: ['executives@company.com'],
          location: 'Main Conference Room'
        }
      ]);
    }
  };

  const loadApiStatus = async () => {
    try {
      const response = await fetch('http://localhost:3002/health');
      const data = await response.json();
      setApiStatus(data.apiConnections || {});
    } catch (error) {
      console.error('Failed to load API status:', error);
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

  const testIntegration = async (name) => {
    try {
      const response = await fetch(`http://localhost:3002/api/test/${name.toLowerCase()}`);
      const data = await response.json();
      
      if (data.success) {
        alert(`✅ ${name} connection successful!`);
      } else {
        alert(`❌ ${name} failed: ${data.error}`);
      }
      
      loadApiStatus();
    } catch (error) {
      alert(`❌ ${name} connection failed: ${error.message}`);
    }
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

  const getIntegrationStatusColor = (status) => {
    return status === 'connected' ? 'bg-green-500' : 'bg-red-500';
  };

  const getPriorityColor = (urgency) => {
    if (urgency >= 4) return 'bg-red-100 text-red-700 border-red-200';
    if (urgency >= 3) return 'bg-yellow-100 text-yellow-700 border-yellow-200';
    return 'bg-green-100 text-green-700 border-green-200';
  };

  const showMeetingSummary = (meeting) => {
    setSelectedMeeting(meeting);
  };

  const integrations = [
    { name: 'OpenAI', icon: '🤖', description: 'AI assistant', status: apiStatus.openai?.success ? 'connected' : 'error', category: 'ai' },
    { name: 'Claude', icon: '🧠', description: 'Claude AI', status: apiStatus.claude?.success ? 'connected' : 'error', category: 'ai' },
    { name: 'Runway', icon: '🎬', description: 'AI video', status: apiStatus.runway?.success ? 'connected' : 'error', category: 'ai' },
    { name: 'Notion', icon: '📝', description: 'Task management', status: apiStatus.notion?.success ? 'connected' : 'error', category: 'other' },
    { name: 'Gmail', icon: '📧', description: 'Email monitoring', status: apiStatus.gmail?.success ? 'connected' : 'error', category: 'other' },
    { name: 'Slack', icon: '💬', description: 'Team communication', status: apiStatus.slack?.success ? 'connected' : 'error', category: 'other' },
    { name: 'Fireflies', icon: '🎙️', description: 'Meeting transcripts', status: apiStatus.fireflies?.success ? 'connected' : 'error', category: 'other' },
    { name: 'Calendar', icon: '📅', description: 'Schedule management', status: apiStatus.calendar?.success ? 'connected' : 'error', category: 'other' },
    { name: 'Linear', icon: '📊', description: 'Issue tracking', status: apiStatus.linear?.success ? 'connected' : 'error', category: 'other' },
    { name: 'GitHub', icon: '⚡', description: 'Code repository', status: apiStatus.github?.success ? 'connected' : 'error', category: 'other' }
  ];

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-50 to-gray-100">
      {/* Header */}
      <div className="bg-white shadow-lg border-b border-gray-200">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center py-6">
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
              <div className={`flex items-center gap-2 px-3 py-2 rounded-lg ${isConnected ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-700'}`}>
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
          
          <div className="flex space-x-1 pb-4">
            {['dashboard', 'integrations'].map(tab => (
              <button
                key={tab}
                onClick={() => setActiveTab(tab)}
                className={`px-6 py-3 rounded-lg font-medium transition-all duration-200 ${
                  activeTab === tab 
                    ? 'bg-gradient-to-r from-blue-600 to-purple-600 text-white shadow-lg' 
                    : 'text-gray-600 hover:text-gray-800 hover:bg-gray-100'
                }`}
              >
                {tab.charAt(0).toUpperCase() + tab.slice(1)}
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* Main Content */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {activeTab === 'dashboard' && (
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
            {/* Notion Tasks */}
            <div className="bg-white rounded-2xl shadow-lg border p-6">
              <div className="flex items-center justify-between mb-6">
                <h2 className="text-xl font-bold text-gray-900">📝 Notion Tasks</h2>
                <span className="bg-blue-100 text-blue-800 text-sm font-medium px-3 py-1 rounded-full">{tasks.length}</span>
              </div>
              
              {tasks.length === 0 ? (
                <div className="text-center py-12">
                  <div className="w-16 h-16 bg-gray-100 rounded-2xl flex items-center justify-center mx-auto mb-4">
                    <span className="text-2xl text-gray-400">📋</span>
                  </div>
                  <p className="text-gray-500 font-medium">No tasks yet</p>
                  <p className="text-gray-400 text-sm mt-1">Tasks will appear from Notion</p>
                </div>
              ) : (
                <div className="space-y-4 max-h-96 overflow-y-auto">
                  {tasks.slice(0, 10).map(task => (
                    <div key={task.id} className="border rounded-lg p-4 hover:border-blue-300 hover:shadow-md transition-all">
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
            <div className="bg-white rounded-2xl shadow-lg border p-6">
              <div className="flex items-center justify-between mb-6">
                <h2 className="text-xl font-bold text-gray-900">📅 Next 5 Events</h2>
                <span className="text-xs text-gray-500">{userTimezone}</span>
              </div>
              
              <div className="space-y-4 max-h-96 overflow-y-auto">
                {calendarEvents.slice(0, 5).map(event => {
                  const timeUntil = getTimeUntilEvent(event.start);
                  const isUpcoming = timeUntil.includes('in') || timeUntil === 'happening now';
                  
                  return (
                    <div key={event.id} className={`border rounded-lg p-4 transition-all hover:shadow-md ${
                      timeUntil === 'happening now' ? 'bg-red-50 border-red-200' :
                      isUpcoming ? 'bg-blue-50 border-blue-200' : 'border-gray-200'
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
            <div className="bg-white rounded-2xl shadow-lg border p-6">
              <div className="flex items-center justify-between mb-6">
                <h2 className="text-xl font-bold text-gray-900">🎙️ Meeting Summaries</h2>
                <span className="bg-purple-100 text-purple-800 text-sm font-medium px-3 py-1 rounded-full">Fireflies</span>
              </div>
              
              <div className="space-y-4 max-h-96 overflow-y-auto">
                {meetings.slice(0, 4).map(meeting => (
                  <div key={meeting.id} className="border rounded-lg p-4 hover:border-purple-300 hover:shadow-md transition-all">
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
        )}
        
        {activeTab === 'integrations' && (
          <div className="space-y-8">
            {/* AI Services */}
            <div className="bg-white rounded-2xl shadow-lg border p-8">
              <h2 className="text-2xl font-bold mb-8">🤖 AI Services</h2>
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                {integrations.filter(i => i.category === 'ai').map(integration => (
                  <div key={integration.name} className="border rounded-xl p-6 hover:border-blue-300 hover:shadow-lg transition-all">
                    <div className="flex items-center gap-4 mb-4">
                      <div className="w-12 h-12 bg-gradient-to-r from-blue-100 to-purple-100 rounded-xl flex items-center justify-center">
                        <span className="text-2xl">{integration.icon}</span>
                      </div>
                      <div className="flex-1">
                        <h3 className="font-bold text-gray-900">{integration.name}</h3>
                        <p className="text-sm text-gray-600">{integration.description}</p>
                      </div>
                      <div className={`w-3 h-3 rounded-full ${getIntegrationStatusColor(integration.status)}`}></div>
                    </div>
                    
                    <div className={`text-sm mb-4 font-medium px-3 py-1 rounded-full ${
                      integration.status === 'connected' ? 'text-green-600 bg-green-50' : 'text-red-600 bg-red-50'
                    }`}>
                      {integration.status === 'connected' ? '✅ Connected' : '❌ Not Connected'}
                    </div>
                    
                    <button 
                      onClick={() => testIntegration(integration.name)}
                      className="w-full bg-gradient-to-r from-blue-600 to-purple-600 hover:from-blue-700 hover:to-purple-700 text-white py-3 px-4 rounded-lg font-medium transition-all hover:scale-105"
                    >
                      Test Connection
                    </button>
                  </div>
                ))}
              </div>
            </div>

            {/* Other Services */}
            <div className="bg-white rounded-2xl shadow-lg border p-8">
              <h2 className="text-2xl font-bold mb-8">🔗 Other Services</h2>
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                {integrations.filter(i => i.category !== 'ai').map(integration => (
                  <div key={integration.name} className="border rounded-xl p-6 hover:border-green-300 hover:shadow-lg transition-all">
                    <div className="flex items-center gap-4 mb-4">
                      <div className="w-12 h-12 bg-gradient-to-r from-green-100 to-blue-100 rounded-xl flex items-center justify-center">
                        <span className="text-2xl">{integration.icon}</span>
                      </div>
                      <div className="flex-1">
                        <h3 className="font-bold text-gray-900">{integration.name}</h3>
                        <p className="text-sm text-gray-600">{integration.description}</p>
                      </div>
                      <div className={`w-3 h-3 rounded-full ${getIntegrationStatusColor(integration.status)}`}></div>
                    </div>
                    
                    <div className={`text-sm mb-4 font-medium px-3 py-1 rounded-full ${
                      integration.status === 'connected' ? 'text-green-600 bg-green-50' : 'text-red-600 bg-red-50'
                    }`}>
                      {integration.status === 'connected' ? '✅ Connected' : '❌ Not Connected'}
                    </div>
                    
                    <div className="space-y-3">
                      <button 
                        onClick={() => testIntegration(integration.name)}
                        className="w-full bg-gradient-to-r from-green-600 to-blue-600 hover:from-green-700 hover:to-blue-700 text-white py-3 px-4 rounded-lg font-medium transition-all hover:scale-105"
                      >
                        Test Connection
                      </button>
                      
                      {(integration.name === 'Gmail' || integration.name === 'Calendar') && (
                        <button 
                          onClick={() => window.open('http://localhost:3002/auth/google', '_blank')}
                          className="w-full bg-gradient-to-r from-orange-500 to-red-500 hover:from-orange-600 hover:to-red-600 text-white py-3 px-4 rounded-lg font-medium transition-all hover:scale-105"
                        >
                          Setup OAuth
                        </button>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Meeting Summary Modal */}
      {selectedMeeting && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl shadow-2xl max-w-2xl w-full max-h-[80vh] overflow-y-auto">
            <div className="p-8">
              <div className="flex items-start justify-between mb-6">
                <div>
                  <h3 className="text-2xl font-bold text-gray-900 mb-2">{selectedMeeting.title}</h3>
                  <p className="text-gray-600">{formatDateTime(selectedMeeting.date)} • {selectedMeeting.duration} minutes</p>
                </div>
                <button 
                  onClick={() => setSelectedMeeting(null)}
                  className="text-gray-400 hover:text-gray-600 p-2 hover:bg-gray-100 rounded-lg transition-colors"
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
                      <span key={index} className="bg-blue-100 text-blue-800 text-sm px-3 py-1 rounded-full">
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
                          <span className="flex-shrink-0 w-5 h-5 bg-green-100 text-green-600 rounded-full flex items-center justify-center text-xs font-medium mt-0.5">
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

      {/* Enhanced AI Chatbox */}
      <AIChatbox socket={socket} apiStatus={apiStatus} />
    </div>
  );
};

export default App;