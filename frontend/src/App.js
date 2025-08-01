import React, { useState, useEffect } from 'react';
import io from 'socket.io-client';
import './App.css';
import IntegrationStatusBar from './components/IntegrationStatusBar';
import FloatingChatbox from './components/FloatingChatbox';

function App() {
  const [tasks, setTasks] = useState([]);
  const [events, setEvents] = useState([]);
  const [meetings, setMeetings] = useState([]);
  const [isConnected, setIsConnected] = useState(false);
  const [activeTab, setActiveTab] = useState('dashboard');
  const [apiStatus, setApiStatus] = useState({});
  const [loading, setLoading] = useState(true);
  const [socket, setSocket] = useState(null);

  useEffect(() => {
    // Initialize WebSocket connection
    const socketConnection = io('http://localhost:3002');
    setSocket(socketConnection);
    
    socketConnection.on('connect', () => {
      console.log('✅ Connected to backend');
      setIsConnected(true);
    });
    
    socketConnection.on('disconnect', () => {
      console.log('❌ Disconnected from backend');
      setIsConnected(false);
    });

    socketConnection.on('taskUpdate', (data) => {
      console.log('📋 Task update received:', data);
      loadTasks();
    });

    socketConnection.on('notionUpdate', (data) => {
      console.log('📝 Notion update received:', data);
      loadTasks();
    });

    socketConnection.on('firefliesUpdate', (data) => {
      console.log('🎙️ Fireflies update received:', data);
      loadMeetings();
    });
    
    // Load initial data
    loadTasks();
    loadApiStatus();
    loadMeetings();
      
    return () => {
      if (socketConnection) {
        socketConnection.close();
      }
    };
  }, []);

  const loadTasks = async () => {
    try {
      console.log('📋 Loading tasks...');
      const response = await fetch('http://localhost:3002/api/tasks');
      const data = await response.json();
      
      if (data.success) {
        setTasks(data.tasks || []);
        console.log(`✅ Loaded ${data.tasks?.length || 0} tasks`);
      } else {
        console.error('❌ Failed to load tasks:', data.error);
        setTasks([]);
      }
    } catch (error) {
      console.error('❌ Failed to load tasks:', error);
      setTasks([]);
    }
  };

  const loadApiStatus = async () => {
    try {
      console.log('🔍 Checking API status...');
      const response = await fetch('http://localhost:3002/api/health');
      const data = await response.json();
      setApiStatus(data.apiConnections || {});
      setLoading(false);
      console.log('✅ API status loaded:', data.apiConnections);
    } catch (error) {
      console.error('❌ Failed to load API status:', error);
      setLoading(false);
    }
  };

  const loadMeetings = async () => {
    try {
      console.log('📞 Loading meetings...');
      const response = await fetch('http://localhost:3002/api/fireflies/meetings');
      const data = await response.json();
      
      if (data.success) {
        setMeetings(data.meetings || []);
        console.log(`✅ Loaded ${data.meetings?.length || 0} meetings`);
      }
    } catch (error) {
      console.error('❌ Failed to load meetings:', error);
    }
  };

  const completeTask = async (taskId, currentlyCompleted) => {
    try {
      console.log(`📝 ${!currentlyCompleted ? 'Completing' : 'Uncompleting'} task: ${taskId}`);
      
      const response = await fetch(`http://localhost:3002/api/notion/task/${taskId}/complete`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ completed: !currentlyCompleted })
      });
      
      const result = await response.json();
      
      if (result.success) {
        console.log('✅ Task updated in Notion');
        loadTasks(); // Refresh tasks list
      } else {
        console.error('❌ Failed to update task:', result.error);
        alert('Failed to update task: ' + result.error);
      }
    } catch (error) {
      console.error('❌ Error updating task:', error);
      alert('Error updating task: ' + error.message);
    }
  };

  const testAI = async () => {
    try {
      console.log('🤖 Testing AI integration...');
      const response = await fetch('http://localhost:3002/api/ai-test', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ message: 'Test AI processing' })
      });
      
      if (response.ok) {
        const result = await response.json();
        console.log('✅ AI Test Result:', result);
        alert('✅ AI test successful! Check console for details.');
        loadTasks();
      } else {
        const error = await response.text();
        console.error('❌ AI test failed:', error);
        alert('❌ AI test failed. Check console for details.');
      }
    } catch (error) {
      console.error('❌ AI test failed:', error);
      alert('❌ AI test failed. Check console for details.');
    }
  };

  const testIntegration = async (name) => {
    try {
      console.log(`🧪 Testing ${name} integration...`);
      const response = await fetch(`http://localhost:3002/api/test/${name.toLowerCase()}`);
      const data = await response.json();
      
      if (data.success) {
        alert(`✅ ${name} connection successful!`);
      } else {
        alert(`❌ ${name} failed: ${data.error}`);
      }
      
      loadApiStatus();
    } catch (error) {
      console.error(`❌ ${name} test failed:`, error);
      alert(`❌ ${name} connection failed: ${error.message}`);
    }
  };

  const getStatusColor = (status) => {
    if (!status) return 'bg-gray-400';
    return status.success ? 'bg-green-500' : 'bg-red-500';
  };

  const getStatusIcon = (status) => {
    if (!status) return '❓';
    return status.success ? '✅' : '❌';
  };

  const integrations = [
    { name: 'Notion', icon: '📝', description: 'Task management', status: apiStatus.notion },
    { name: 'Fireflies', icon: '🎙️', description: 'Meeting transcripts', status: apiStatus.fireflies },
    { name: 'Gmail', icon: '📧', description: 'Email monitoring', status: apiStatus.gmail },
    { name: 'Calendar', icon: '📅', description: 'Schedule management', status: apiStatus.calendar },
    { name: 'OpenAI', icon: '🤖', description: 'AI processing', status: apiStatus.openai },
    { name: 'Claude', icon: '🧠', description: 'AI analysis', status: apiStatus.claude },
  ];

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-900 via-purple-900 to-slate-900 flex items-center justify-center">
        <div className="text-white text-center">
          <div className="animate-spin w-8 h-8 border-4 border-purple-500 border-t-transparent rounded-full mx-auto mb-4"></div>
          <p>Loading AI Dashboard...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 via-purple-900 to-slate-900">
      {/* Header */}
      <header className="bg-black/20 backdrop-blur-lg border-b border-white/10">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center py-4">
            <div className="flex items-center space-x-3">
              <div className="w-8 h-8 bg-gradient-to-r from-purple-500 to-blue-500 rounded-lg"></div>
              <h1 className="text-xl font-bold text-white">AI Dashboard</h1>
              <div className={`w-3 h-3 rounded-full ${isConnected ? 'bg-green-500' : 'bg-red-500'}`}></div>
            </div>
            
            <div className="flex items-center space-x-4">
              <button
                onClick={testAI}
                className="px-4 py-2 bg-purple-600 hover:bg-purple-700 text-white rounded-lg transition-colors"
              >
                Test AI
              </button>
              <button
                onClick={loadApiStatus}
                className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg transition-colors"
              >
                Refresh Status
              </button>
            </div>
          </div>
        </div>
      </header>

      {/* Integration Status Bar */}
      <IntegrationStatusBar apiStatus={apiStatus} onTest={testIntegration} />

      {/* Main Content */}
      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Navigation Tabs */}
        <div className="flex space-x-1 bg-black/20 backdrop-blur-lg rounded-lg p-1 mb-8">
          {['dashboard', 'tasks', 'meetings', 'integrations'].map((tab) => (
            <button
              key={tab}
              onClick={() => setActiveTab(tab)}
              className={`flex-1 py-2 px-4 rounded-md transition-colors capitalize ${
                activeTab === tab
                  ? 'bg-purple-600 text-white'
                  : 'text-gray-300 hover:text-white hover:bg-white/10'
              }`}
            >
              {tab}
            </button>
          ))}
        </div>

        {/* Tab Content */}
        {activeTab === 'dashboard' && (
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            {/* Tasks Summary */}
            <div className="bg-black/20 backdrop-blur-lg rounded-xl p-6 border border-white/10">
              <h3 className="text-lg font-semibold text-white mb-4">📋 Tasks Overview</h3>
              <div className="space-y-2">
                <div className="flex justify-between text-sm">
                  <span className="text-gray-300">Total Tasks:</span>
                  <span className="text-white font-medium">{tasks.length}</span>
                </div>
                <div className="flex justify-between text-sm">
                  <span className="text-gray-300">Completed:</span>
                  <span className="text-green-400 font-medium">
                    {tasks.filter(t => t.status === 'Completed').length}
                  </span>
                </div>
                <div className="flex justify-between text-sm">
                  <span className="text-gray-300">In Progress:</span>
                  <span className="text-yellow-400 font-medium">
                    {tasks.filter(t => t.status === 'In progress').length}
                  </span>
                </div>
              </div>
            </div>

            {/* Meetings Summary */}
            <div className="bg-black/20 backdrop-blur-lg rounded-xl p-6 border border-white/10">
              <h3 className="text-lg font-semibold text-white mb-4">🎙️ Recent Meetings</h3>
              <div className="space-y-2">
                <div className="flex justify-between text-sm">
                  <span className="text-gray-300">Total Meetings:</span>
                  <span className="text-white font-medium">{meetings.length}</span>
                </div>
                <div className="flex justify-between text-sm">
                  <span className="text-gray-300">Action Items:</span>
                  <span className="text-orange-400 font-medium">
                    {meetings.reduce((acc, m) => acc + (m.actionItems?.length || 0), 0)}
                  </span>
                </div>
              </div>
            </div>

            {/* Connection Status */}
            <div className="bg-black/20 backdrop-blur-lg rounded-xl p-6 border border-white/10">
              <h3 className="text-lg font-semibold text-white mb-4">🔗 Connection Status</h3>
              <div className="space-y-2">
                <div className="flex justify-between text-sm">
                  <span className="text-gray-300">WebSocket:</span>
                  <span className={`font-medium ${isConnected ? 'text-green-400' : 'text-red-400'}`}>
                    {isConnected ? 'Connected' : 'Disconnected'}
                  </span>
                </div>
                <div className="flex justify-between text-sm">
                  <span className="text-gray-300">API Services:</span>
                  <span className="text-blue-400 font-medium">
                    {Object.values(apiStatus).filter(s => s?.success).length} / {Object.keys(apiStatus).length}
                  </span>
                </div>
              </div>
            </div>
          </div>
        )}

        {activeTab === 'tasks' && (
          <div className="bg-black/20 backdrop-blur-lg rounded-xl p-6 border border-white/10">
            <div className="flex justify-between items-center mb-6">
              <h2 className="text-xl font-semibold text-white">📋 Tasks</h2>
              <button
                onClick={loadTasks}
                className="px-4 py-2 bg-purple-600 hover:bg-purple-700 text-white rounded-lg transition-colors"
              >
                Refresh Tasks
              </button>
            </div>
            
            {tasks.length === 0 ? (
              <div className="text-center py-8">
                <p className="text-gray-400">No tasks found. Check your Notion integration.</p>
              </div>
            ) : (
              <div className="space-y-4">
                {tasks.map((task, index) => (
                  <div key={task.id || index} className="bg-white/5 rounded-lg p-4 border border-white/10">
                    <div className="flex items-start gap-3">
                      {/* Checkbox for task completion */}
                      <input 
                        type="checkbox" 
                        checked={task.status === 'completed' || task.rawStatus === 'Done'}
                        onChange={() => completeTask(task.id, task.status === 'completed' || task.rawStatus === 'Done')}
                        className="mt-1 w-4 h-4 text-green-600 bg-transparent border-gray-300 rounded focus:ring-green-500 focus:ring-2"
                      />
                      
                      <div className="flex-1">
                        <div className="flex justify-between items-start mb-2">
                          <h3 className={`font-medium ${
                            task.status === 'completed' || task.rawStatus === 'Done' 
                              ? 'text-gray-400 line-through' 
                              : 'text-white'
                          }`}>
                            {task.title || task.name}
                          </h3>
                          <span className={`px-2 py-1 rounded text-xs font-medium ${
                            task.status === 'Completed' || task.rawStatus === 'Done' ? 'bg-green-500/20 text-green-400' :
                            task.status === 'In progress' ? 'bg-yellow-500/20 text-yellow-400' :
                            'bg-gray-500/20 text-gray-400'
                          }`}>
                            {task.rawStatus || task.status || 'Not started'}
                          </span>
                        </div>
                        
                        {task.summary && (
                          <p className="text-gray-300 text-sm mb-2">{task.summary}</p>
                        )}
                        
                        {task.assignee && task.assignee !== 'Unassigned' && (
                          <p className="text-blue-300 text-sm mb-2">👤 {task.assignee}</p>
                        )}
                        
                        <div className="flex justify-between items-center text-xs text-gray-400">
                          <span>Source: {task.source || 'Unknown'}</span>
                          {task.urgency && (
                            <span className="flex items-center">
                              Priority: {task.urgency}/5
                              <div className="ml-1 flex">
                                {[...Array(5)].map((_, i) => (
                                  <div
                                    key={i}
                                    className={`w-1 h-3 mx-0.5 rounded ${
                                      i < (task.urgency || 1) ? 'bg-red-500' : 'bg-gray-600'
                                    }`}
                                  />
                                ))}
                              </div>
                            </span>
                          )}
                        </div>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {activeTab === 'meetings' && (
          <div className="bg-black/20 backdrop-blur-lg rounded-xl p-6 border border-white/10">
            <div className="flex justify-between items-center mb-6">
              <h2 className="text-xl font-semibold text-white">🎙️ Recent Meetings</h2>
              <button
                onClick={loadMeetings}
                className="px-4 py-2 bg-purple-600 hover:bg-purple-700 text-white rounded-lg transition-colors"
              >
                Refresh Meetings
              </button>
            </div>
            
            {meetings.length === 0 ? (
              <div className="text-center py-8">
                <p className="text-gray-400">No meetings found. Check your Fireflies integration.</p>
              </div>
            ) : (
              <div className="space-y-4">
                {meetings.map((meeting, index) => (
                  <div key={meeting.id || index} className="bg-white/5 rounded-lg p-4 border border-white/10">
                    <div className="flex justify-between items-start mb-2">
                      <h3 className="text-white font-medium">{meeting.title}</h3>
                      <span className="text-gray-400 text-sm">
                        {new Date(meeting.date).toLocaleDateString()}
                      </span>
                    </div>
                    
                    <div className="text-gray-300 text-sm mb-2">
                      <p><strong>Participants:</strong> {meeting.participants?.join(', ') || 'Unknown'}</p>
                      <p><strong>Duration:</strong> {meeting.duration} minutes</p>
                    </div>
                    
                    {meeting.summary && (
                      <p className="text-gray-300 text-sm mb-2">{meeting.summary}</p>
                    )}
                    
                    {meeting.actionItems && meeting.actionItems.length > 0 && (
                      <div className="mt-2">
                        <p className="text-white text-sm font-medium mb-1">Action Items:</p>
                        <ul className="text-gray-300 text-sm space-y-1">
                          {meeting.actionItems.map((item, i) => (
                            <li key={i} className="flex items-start">
                              <span className="mr-2">•</span>
                              <span>{item}</span>
                            </li>
                          ))}
                        </ul>
                      </div>
                    )}
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {activeTab === 'integrations' && (
          <div className="bg-black/20 backdrop-blur-lg rounded-xl p-6 border border-white/10">
            <h2 className="text-xl font-semibold text-white mb-6">🔗 Integrations</h2>
            
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {integrations.map((integration) => (
                <div key={integration.name} className="bg-white/5 rounded-lg p-4 border border-white/10">
                  <div className="flex items-center justify-between mb-2">
                    <div className="flex items-center space-x-2">
                      <span className="text-lg">{integration.icon}</span>
                      <span className="text-white font-medium">{integration.name}</span>
                    </div>
                    <span className="text-lg">{getStatusIcon(integration.status)}</span>
                  </div>
                  
                  <p className="text-gray-400 text-sm mb-3">{integration.description}</p>
                  
                  <div className="flex justify-between items-center">
                    <span className={`text-xs px-2 py-1 rounded ${
                      integration.status?.success ? 'bg-green-500/20 text-green-400' : 'bg-red-500/20 text-red-400'
                    }`}>
                      {integration.status?.success ? 'Connected' : 'Not Connected'}
                    </span>
                    
                    <button
                      onClick={() => testIntegration(integration.name)}
                      className="px-3 py-1 bg-blue-600 hover:bg-blue-700 text-white text-xs rounded transition-colors"
                    >
                      Test
                    </button>
                  </div>
                  
                  {integration.status?.error && (
                    <p className="text-red-400 text-xs mt-2 truncate" title={integration.status.error}>
                      {integration.status.error}
                    </p>
                  )}
                </div>
              ))}
            </div>
          </div>
        )}
      </main>

      {/* Floating AI Chatbox */}
      <FloatingChatbox />
    </div>
  );
}

export default App;