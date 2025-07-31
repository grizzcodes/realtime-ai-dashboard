import React, { useState, useEffect } from 'react';
import io from 'socket.io-client';
import './App.css';
import FloatingChatbox from './components/FloatingChatbox';

const App = () => {
  const [tasks, setTasks] = useState([]);
  const [meetings, setMeetings] = useState([]);
  const [calendarEvents, setCalendarEvents] = useState([]);
  const [isConnected, setIsConnected] = useState(false);
  const [activeTab, setActiveTab] = useState('dashboard');
  const [apiStatus, setApiStatus] = useState({});
  const [socket, setSocket] = useState(null);
  const [userTimezone] = useState(Intl.DateTimeFormat().resolvedOptions().timeZone);

  useEffect(() => {
    const newSocket = io('http://localhost:3002');
    setSocket(newSocket);
    
    newSocket.on('connect', () => setIsConnected(true));
    newSocket.on('disconnect', () => setIsConnected(false));
    
    // Load data
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
      console.error('Failed to load meetings:', error);
      // Mock data for demo
      setMeetings([
        {
          id: '1',
          title: 'Weekly Team Standup',
          date: new Date(Date.now() - 86400000).toISOString(),
          duration: 30,
          participants: ['John Doe', 'Jane Smith', 'Mike Johnson'],
          summary: 'Discussed project progress and upcoming deadlines'
        },
        {
          id: '2',
          title: 'Client Feedback Session',
          date: new Date(Date.now() - 172800000).toISOString(),
          duration: 45,
          participants: ['Sarah Wilson', 'Client Rep'],
          summary: 'Reviewed latest features and collected feedback'
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
      console.error('Failed to load calendar events:', error);
      // Mock data for demo
      setCalendarEvents([
        {
          id: '1',
          title: 'Product Demo',
          start: new Date(Date.now() + 3600000).toISOString(),
          end: new Date(Date.now() + 7200000).toISOString(),
          attendees: ['team@company.com']
        },
        {
          id: '2',
          title: 'Sprint Planning',
          start: new Date(Date.now() + 86400000).toISOString(),
          end: new Date(Date.now() + 90000000).toISOString(),
          attendees: ['dev-team@company.com']
        },
        {
          id: '3',
          title: 'Client Check-in',
          start: new Date(Date.now() + 172800000).toISOString(),
          end: new Date(Date.now() + 176400000).toISOString(),
          attendees: ['client@external.com']
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
      console.log('AI Test Result:', result);
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
    const date = new Date(dateString);
    return date.toLocaleString('en-US', {
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
    const date = new Date(dateString);
    return date.toLocaleString('en-US', {
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
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <div className="bg-white shadow-sm border-b">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center py-4">
            <h1 className="text-2xl font-bold text-gray-900">🤖 AI Dashboard</h1>
            <div className="flex items-center gap-4">
              <span className={`text-sm ${isConnected ? 'text-green-600' : 'text-red-600'}`}>
                {isConnected ? '🟢 Connected' : '🔴 Disconnected'}
              </span>
              <button 
                onClick={testAI}
                className="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-lg text-sm font-medium transition-colors"
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
                className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
                  activeTab === tab 
                    ? 'bg-blue-100 text-blue-700' 
                    : 'text-gray-500 hover:text-gray-700 hover:bg-gray-100'
                }`}
              >
                {tab.charAt(0).toUpperCase() + tab.slice(1)}
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* Main Content */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
        {activeTab === 'dashboard' && (
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            {/* Left Column - Tasks */}
            <div className="lg:col-span-1">
              <div className="bg-white rounded-xl shadow-sm border p-6">
                <div className="flex items-center justify-between mb-4">
                  <h2 className="text-lg font-semibold text-gray-900">📋 Active Tasks</h2>
                  <span className="bg-blue-100 text-blue-800 text-xs font-medium px-2.5 py-0.5 rounded-full">
                    {tasks.length}
                  </span>
                </div>
                
                {tasks.length === 0 ? (
                  <div className="text-center py-8">
                    <p className="text-gray-500 text-sm">No tasks yet.</p>
                    <p className="text-gray-400 text-xs mt-1">Click "Test AI" to generate some!</p>
                  </div>
                ) : (
                  <div className="space-y-3">
                    {tasks.slice(0, 6).map(task => (
                      <div key={task.id} className="border rounded-lg p-3 hover:bg-gray-50 transition-colors">
                        <h4 className="font-medium text-sm text-gray-900 mb-1">{task.title}</h4>
                        <div className="flex items-center justify-between">
                          <span className="text-xs text-gray-500">{task.source}</span>
                          <span className={`text-xs px-2 py-1 rounded-full ${
                            task.urgency >= 4 ? 'bg-red-100 text-red-700' : 
                            task.urgency >= 3 ? 'bg-yellow-100 text-yellow-700' : 
                            'bg-green-100 text-green-700'
                          }`}>
                            Priority {task.urgency}
                          </span>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>

            {/* Middle Column - Calendar Events */}
            <div className="lg:col-span-1">
              <div className="bg-white rounded-xl shadow-sm border p-6">
                <div className="flex items-center justify-between mb-4">
                  <h2 className="text-lg font-semibold text-gray-900">📅 Upcoming Events</h2>
                  <span className="text-xs text-gray-500">{userTimezone}</span>
                </div>
                
                {calendarEvents.length === 0 ? (
                  <div className="text-center py-8">
                    <p className="text-gray-500 text-sm">No upcoming events</p>
                  </div>
                ) : (
                  <div className="space-y-3">
                    {calendarEvents.slice(0, 5).map(event => {
                      const timeUntil = getTimeUntilEvent(event.start);
                      const isUpcoming = timeUntil.includes('in') || timeUntil === 'happening now';
                      
                      return (
                        <div key={event.id} className={`border rounded-lg p-3 transition-colors ${
                          timeUntil === 'happening now' ? 'bg-red-50 border-red-200' :
                          isUpcoming ? 'bg-blue-50 border-blue-200' : 'hover:bg-gray-50'
                        }`}>
                          <h4 className="font-medium text-sm text-gray-900 mb-1">{event.title}</h4>
                          <div className="text-xs text-gray-600 mb-1">
                            {formatTimeOnly(event.start)} - {formatTimeOnly(event.end)}
                          </div>
                          <div className="flex items-center justify-between">
                            <span className="text-xs text-gray-500">
                              {event.attendees?.length} attendees
                            </span>
                            <span className={`text-xs font-medium ${
                              timeUntil === 'happening now' ? 'text-red-600' :
                              isUpcoming ? 'text-blue-600' : 'text-gray-500'
                            }`}>
                              {timeUntil}
                            </span>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>
            </div>

            {/* Right Column - Fireflies Meetings */}
            <div className="lg:col-span-1">
              <div className="bg-white rounded-xl shadow-sm border p-6">
                <div className="flex items-center justify-between mb-4">
                  <h2 className="text-lg font-semibold text-gray-900">🎙️ Recent Meetings</h2>
                  <span className="bg-purple-100 text-purple-800 text-xs font-medium px-2.5 py-0.5 rounded-full">
                    Fireflies
                  </span>
                </div>
                
                {meetings.length === 0 ? (
                  <div className="text-center py-8">
                    <p className="text-gray-500 text-sm">No recent meetings</p>
                  </div>
                ) : (
                  <div className="space-y-3">
                    {meetings.slice(0, 4).map(meeting => (
                      <div key={meeting.id} className="border rounded-lg p-3 hover:bg-gray-50 transition-colors">
                        <h4 className="font-medium text-sm text-gray-900 mb-1">{meeting.title}</h4>
                        <div className="text-xs text-gray-600 mb-2">
                          {formatDateTime(meeting.date)} • {meeting.duration}min
                        </div>
                        <div className="text-xs text-gray-500 mb-2">
                          {meeting.participants?.slice(0, 3).join(', ')}
                          {meeting.participants?.length > 3 && ` +${meeting.participants.length - 3} more`}
                        </div>
                        {meeting.summary && (
                          <p className="text-xs text-gray-600 line-clamp-2">
                            {meeting.summary}
                          </p>
                        )}
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>

            {/* Bottom Row - Quick Stats */}
            <div className="lg:col-span-3">
              <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                <div className="bg-white rounded-xl shadow-sm border p-4">
                  <div className="flex items-center">
                    <div className="flex-shrink-0">
                      <div className="w-8 h-8 bg-blue-100 rounded-lg flex items-center justify-center">
                        <span className="text-blue-600 text-sm">📋</span>
                      </div>
                    </div>
                    <div className="ml-4">
                      <p className="text-sm font-medium text-gray-900">{tasks.length}</p>
                      <p className="text-xs text-gray-500">Active Tasks</p>
                    </div>
                  </div>
                </div>

                <div className="bg-white rounded-xl shadow-sm border p-4">
                  <div className="flex items-center">
                    <div className="flex-shrink-0">
                      <div className="w-8 h-8 bg-green-100 rounded-lg flex items-center justify-center">
                        <span className="text-green-600 text-sm">📅</span>
                      </div>
                    </div>
                    <div className="ml-4">
                      <p className="text-sm font-medium text-gray-900">{calendarEvents.length}</p>
                      <p className="text-xs text-gray-500">Upcoming Events</p>
                    </div>
                  </div>
                </div>

                <div className="bg-white rounded-xl shadow-sm border p-4">
                  <div className="flex items-center">
                    <div className="flex-shrink-0">
                      <div className="w-8 h-8 bg-purple-100 rounded-lg flex items-center justify-center">
                        <span className="text-purple-600 text-sm">🎙️</span>
                      </div>
                    </div>
                    <div className="ml-4">
                      <p className="text-sm font-medium text-gray-900">{meetings.length}</p>
                      <p className="text-xs text-gray-500">Recent Meetings</p>
                    </div>
                  </div>
                </div>

                <div className="bg-white rounded-xl shadow-sm border p-4">
                  <div className="flex items-center">
                    <div className="flex-shrink-0">
                      <div className="w-8 h-8 bg-yellow-100 rounded-lg flex items-center justify-center">
                        <span className="text-yellow-600 text-sm">🔗</span>
                      </div>
                    </div>
                    <div className="ml-4">
                      <p className="text-sm font-medium text-gray-900">
                        {integrations.filter(i => i.status === 'connected').length}
                      </p>
                      <p className="text-xs text-gray-500">Connected</p>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        )}
        
        {activeTab === 'integrations' && (
          <div className="space-y-6">
            <div className="bg-white rounded-xl shadow-sm border p-6">
              <h2 className="text-xl font-bold mb-6">🤖 AI Services</h2>
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {integrations.filter(i => i.category === 'ai').map(integration => (
                  <div key={integration.name} className="border rounded-lg p-4">
                    <div className="flex items-center gap-3 mb-3">
                      <span className="text-xl">{integration.icon}</span>
                      <div className="flex-1">
                        <h3 className="font-semibold text-sm">{integration.name}</h3>
                        <p className="text-xs text-gray-600">{integration.description}</p>
                      </div>
                      <div className={`w-2 h-2 rounded-full ${getIntegrationStatusColor(integration.status)}`}></div>
                    </div>
                    
                    <div className={`text-xs mb-3 ${
                      integration.status === 'connected' ? 'text-green-600' : 'text-red-600'
                    }`}>
                      {integration.status === 'connected' ? '✅ Connected' : '❌ Not Connected'}
                    </div>
                    
                    <button 
                      onClick={() => testIntegration(integration.name)}
                      className="w-full bg-blue-600 hover:bg-blue-700 text-white py-2 px-3 rounded-lg text-xs font-medium transition-colors"
                    >
                      Test Connection
                    </button>
                  </div>
                ))}
              </div>
            </div>

            <div className="bg-white rounded-xl shadow-sm border p-6">
              <h2 className="text-xl font-bold mb-6">🔗 Other Services</h2>
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {integrations.filter(i => i.category !== 'ai').map(integration => (
                  <div key={integration.name} className="border rounded-lg p-4">
                    <div className="flex items-center gap-3 mb-3">
                      <span className="text-xl">{integration.icon}</span>
                      <div className="flex-1">
                        <h3 className="font-semibold text-sm">{integration.name}</h3>
                        <p className="text-xs text-gray-600">{integration.description}</p>
                      </div>
                      <div className={`w-2 h-2 rounded-full ${getIntegrationStatusColor(integration.status)}`}></div>
                    </div>
                    
                    <div className={`text-xs mb-3 ${
                      integration.status === 'connected' ? 'text-green-600' : 'text-red-600'
                    }`}>
                      {integration.status === 'connected' ? '✅ Connected' : '❌ Not Connected'}
                    </div>
                    
                    <div className="space-y-2">
                      <button 
                        onClick={() => testIntegration(integration.name)}
                        className="w-full bg-blue-600 hover:bg-blue-700 text-white py-2 px-3 rounded-lg text-xs font-medium transition-colors"
                      >
                        Test Connection
                      </button>
                      
                      {(integration.name === 'Gmail' || integration.name === 'Calendar') && (
                        <button 
                          onClick={() => window.open('http://localhost:3002/auth/google', '_blank')}
                          className="w-full bg-green-600 hover:bg-green-700 text-white py-2 px-3 rounded-lg text-xs font-medium transition-colors"
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

      {/* Floating AI Chatbox */}
      <FloatingChatbox isAdmin={true} />
    </div>
  );
};

export default App;