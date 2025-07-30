import React, { useState, useEffect } from 'react';
import io from 'socket.io-client';
import './App.css';

const App = () => {
  const [tasks, setTasks] = useState([]);
  const [filteredTasks, setFilteredTasks] = useState([]);
  const [events, setEvents] = useState([]);
  const [isConnected, setIsConnected] = useState(false);
  const [activeTab, setActiveTab] = useState('dashboard');
  const [apiStatus, setApiStatus] = useState({});
  const [currentUser, setCurrentUser] = useState('');
  
  // Task filters
  const [filters, setFilters] = useState({
    assignee: '',
    project: '',
    urgency: '',
    status: 'all',
    dateFrom: '',
    dateTo: ''
  });

  useEffect(() => {
    const socket = io('http://localhost:3001');
    socket.on('connect', () => setIsConnected(true));
    socket.on('disconnect', () => setIsConnected(false));
    
    // Listen for real-time task updates
    socket.on('newTask', (result) => {
      if (result.newTasks) {
        setTasks(prev => [...prev, ...result.newTasks]);
      }
    });
    
    loadTasks();
    loadApiStatus();
      
    return () => socket.close();
  }, []);

  // Apply filters whenever tasks or filters change
  useEffect(() => {
    applyFilters();
  }, [tasks, filters]);

  const loadTasks = async () => {
    try {
      const response = await fetch('http://localhost:3001/api/tasks');
      const data = await response.json();
      setTasks(data.tasks || []);
    } catch (error) {
      console.error('Failed to load tasks:', error);
    }
  };

  const loadApiStatus = async () => {
    try {
      const response = await fetch('http://localhost:3001/api/health');
      const data = await response.json();
      setApiStatus(data.apiConnections || {});
      setCurrentUser(data.user || 'unknown');
    } catch (error) {
      console.error('Failed to load API status:', error);
    }
  };

  const applyFilters = () => {
    let filtered = [...tasks];

    if (filters.assignee) {
      filtered = filtered.filter(task => 
        task.assignee?.toLowerCase().includes(filters.assignee.toLowerCase()) ||
        task.keyPeople?.some(person => person.toLowerCase().includes(filters.assignee.toLowerCase()))
      );
    }

    if (filters.project) {
      filtered = filtered.filter(task => 
        task.project?.toLowerCase().includes(filters.project.toLowerCase()) ||
        task.title?.toLowerCase().includes(filters.project.toLowerCase())
      );
    }

    if (filters.urgency) {
      filtered = filtered.filter(task => task.urgency === parseInt(filters.urgency));
    }

    if (filters.status !== 'all') {
      filtered = filtered.filter(task => task.status === filters.status);
    }

    if (filters.dateFrom) {
      filtered = filtered.filter(task => 
        new Date(task.created) >= new Date(filters.dateFrom)
      );
    }

    if (filters.dateTo) {
      filtered = filtered.filter(task => 
        new Date(task.created) <= new Date(filters.dateTo)
      );
    }

    setFilteredTasks(filtered);
  };

  const clearFilters = () => {
    setFilters({
      assignee: '',
      project: '',
      urgency: '',
      status: 'all',
      dateFrom: '',
      dateTo: ''
    });
  };

  const testAI = async () => {
    try {
      const response = await fetch('http://localhost:3001/api/ai-test', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ message: 'Test message' })
      });
      const result = await response.json();
      console.log('AI Test Result:', result);
      if (result.success) {
        alert(`✅ AI test successful! Created ${result.tasksCreated} tasks.`);
        loadTasks();
      } else {
        alert(`❌ AI test failed: ${result.error}`);
      }
    } catch (error) {
      console.error('AI test failed:', error);
      alert(`❌ AI test failed: ${error.message}`);
    }
  };

  const testIntegration = async (name) => {
    try {
      const response = await fetch(`http://localhost:3001/api/test/${name.toLowerCase()}`);
      const data = await response.json();
      
      if (data.success) {
        alert(`✅ ${name}: ${data.message || 'Connection successful!'}`);
      } else {
        alert(`❌ ${name}: ${data.error}`);
      }
      
      loadApiStatus();
    } catch (error) {
      alert(`❌ ${name} test failed: ${error.message}`);
    }
  };

  const syncWithNotion = async () => {
    try {
      const response = await fetch('http://localhost:3001/api/notion/sync', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' }
      });
      const data = await response.json();
      
      if (data.success) {
        alert(`✅ Notion sync complete! Found ${data.tasksImported} tasks.`);
        loadTasks();
      } else {
        alert(`❌ Notion sync failed: ${data.error}`);
      }
    } catch (error) {
      alert(`❌ Notion sync failed: ${error.message}`);
    }
  };

  const markTaskComplete = async (taskId) => {
    try {
      const response = await fetch(`http://localhost:3001/api/tasks/${taskId}/status`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status: 'completed' })
      });
      
      if (response.ok) {
        loadTasks();
      }
    } catch (error) {
      console.error('Failed to update task:', error);
    }
  };

  const getUrgencyColor = (urgency) => {
    switch (urgency) {
      case 5: return 'bg-red-500';
      case 4: return 'bg-orange-500';
      case 3: return 'bg-yellow-500';
      case 2: return 'bg-blue-500';
      default: return 'bg-gray-500';
    }
  };

  const getUrgencyText = (urgency) => {
    switch (urgency) {
      case 5: return 'Critical';
      case 4: return 'High';
      case 3: return 'Medium';
      case 2: return 'Low';
      default: return 'Normal';
    }
  };

  const integrations = [
    { 
      name: 'OpenAI', 
      icon: '🤖', 
      description: 'GPT-4 AI processing', 
      status: apiStatus.openai?.success ? 'connected' : 'error',
      category: 'ai',
      priority: 1
    },
    { 
      name: 'Claude', 
      icon: '🧠', 
      description: 'Anthropic AI assistant', 
      status: apiStatus.claude?.success ? 'connected' : 'error',
      category: 'ai',
      priority: 1
    },
    { 
      name: 'Notion', 
      icon: '📝', 
      description: 'Task management', 
      status: apiStatus.notion?.success ? 'connected' : 'error',
      category: 'productivity',
      priority: 2
    },
    { 
      name: 'Gmail', 
      icon: '📧', 
      description: 'Email monitoring', 
      status: apiStatus.gmail?.success ? 'connected' : 'error',
      category: 'communication',
      priority: 2
    },
    { 
      name: 'Slack', 
      icon: '💬', 
      description: 'Team communication', 
      status: apiStatus.slack?.success ? 'connected' : 'error',
      category: 'communication',
      priority: 2
    },
    { 
      name: 'Calendar', 
      icon: '📅', 
      description: 'Schedule management', 
      status: apiStatus.calendar?.success ? 'connected' : 'error',
      category: 'productivity',
      priority: 2
    },
    { 
      name: 'Fireflies', 
      icon: '🎙️', 
      description: 'Meeting transcripts', 
      status: apiStatus.fireflies?.success ? 'connected' : 'error',
      category: 'meetings',
      priority: 3
    },
    { 
      name: 'Linear', 
      icon: '📊', 
      description: 'Issue tracking', 
      status: apiStatus.linear?.success ? 'connected' : 'error',
      category: 'development',
      priority: 3
    },
    { 
      name: 'GitHub', 
      icon: '⚡', 
      description: 'Code repository', 
      status: apiStatus.github?.success ? 'connected' : 'error',
      category: 'development',
      priority: 3
    }
  ];

  const sortedIntegrations = integrations.sort((a, b) => {
    if (a.priority !== b.priority) return a.priority - b.priority;
    if (a.status === 'connected' && b.status !== 'connected') return -1;
    if (a.status !== 'connected' && b.status === 'connected') return 1;
    return 0;
  });

  const getStatusColor = (status) => {
    switch (status) {
      case 'connected': return 'bg-green-500';
      case 'warning': return 'bg-yellow-500';
      default: return 'bg-red-500';
    }
  };

  const getStatusText = (status) => {
    switch (status) {
      case 'connected': return '✅ Connected';
      case 'warning': return '⚠️ Warning';
      default: return '❌ Not Connected';
    }
  };

  return (
    <div className="min-h-screen bg-gray-100">
      <div className="bg-white shadow p-4">
        <div className="flex justify-between items-center">
          <h1 className="text-3xl font-bold">🤖 Ultimate AI Organizer</h1>
          <div className="flex gap-4 items-center">
            <span className="text-sm text-gray-600">@{currentUser}</span>
            <span className={isConnected ? 'text-green-600' : 'text-red-600'}>
              {isConnected ? '🔗 Connected' : '❌ Disconnected'}
            </span>
            <button onClick={testAI} className="bg-blue-500 text-white px-4 py-2 rounded hover:bg-blue-600">
              🧪 Test AI
            </button>
          </div>
        </div>
        
        <div className="flex gap-2 mt-4">
          {['dashboard', 'integrations'].map(tab => (
            <button
              key={tab}
              onClick={() => setActiveTab(tab)}
              className={`px-4 py-2 rounded ${activeTab === tab ? 'bg-blue-500 text-white' : 'bg-gray-200 hover:bg-gray-300'}`}
            >
              {tab.charAt(0).toUpperCase() + tab.slice(1)}
            </button>
          ))}
        </div>
      </div>

      <div className="p-6">
        {activeTab === 'dashboard' && (
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            {/* Tasks Section - Takes up 2 columns */}
            <div className="lg:col-span-2 bg-white rounded-lg shadow p-6">
              <div className="flex justify-between items-center mb-4">
                <h2 className="text-xl font-bold">📋 Tasks ({filteredTasks.length})</h2>
                <div className="flex gap-2">
                  {apiStatus.notion?.success && (
                    <button 
                      onClick={syncWithNotion}
                      className="bg-gray-800 text-white px-3 py-1 rounded text-sm hover:bg-gray-700"
                    >
                      📝 Sync Notion
                    </button>
                  )}
                  <button 
                    onClick={clearFilters}
                    className="bg-gray-500 text-white px-3 py-1 rounded text-sm hover:bg-gray-600"
                  >
                    Clear Filters
                  </button>
                </div>
              </div>

              {/* Filters */}
              <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-3 mb-4 p-3 bg-gray-50 rounded">
                <input
                  type="text"
                  placeholder="Assignee"
                  value={filters.assignee}
                  onChange={(e) => setFilters({...filters, assignee: e.target.value})}
                  className="px-2 py-1 border rounded text-sm"
                />
                <input
                  type="text"
                  placeholder="Project"
                  value={filters.project}
                  onChange={(e) => setFilters({...filters, project: e.target.value})}
                  className="px-2 py-1 border rounded text-sm"
                />
                <select
                  value={filters.urgency}
                  onChange={(e) => setFilters({...filters, urgency: e.target.value})}
                  className="px-2 py-1 border rounded text-sm"
                >
                  <option value="">All Urgency</option>
                  <option value="5">Critical</option>
                  <option value="4">High</option>
                  <option value="3">Medium</option>
                  <option value="2">Low</option>
                  <option value="1">Normal</option>
                </select>
                <select
                  value={filters.status}
                  onChange={(e) => setFilters({...filters, status: e.target.value})}
                  className="px-2 py-1 border rounded text-sm"
                >
                  <option value="all">All Status</option>
                  <option value="pending">Pending</option>
                  <option value="completed">Completed</option>
                  <option value="in_progress">In Progress</option>
                </select>
                <input
                  type="date"
                  value={filters.dateFrom}
                  onChange={(e) => setFilters({...filters, dateFrom: e.target.value})}
                  className="px-2 py-1 border rounded text-sm"
                />
                <input
                  type="date"
                  value={filters.dateTo}
                  onChange={(e) => setFilters({...filters, dateTo: e.target.value})}
                  className="px-2 py-1 border rounded text-sm"
                />
              </div>

              {/* Tasks List */}
              {filteredTasks.length === 0 ? (
                <p className="text-gray-500">No tasks match your filters. Click Test AI to generate some!</p>
              ) : (
                <div className="space-y-3 max-h-96 overflow-y-auto">
                  {filteredTasks.map(task => (
                    <div key={task.id} className="border rounded-lg p-4 hover:shadow-md transition-shadow">
                      <div className="flex justify-between items-start mb-2">
                        <h4 className="font-medium text-lg">{task.title}</h4>
                        <div className="flex items-center gap-2">
                          <span className={`text-xs px-2 py-1 rounded text-white ${getUrgencyColor(task.urgency)}`}>
                            {getUrgencyText(task.urgency)}
                          </span>
                          {task.status === 'pending' && (
                            <button
                              onClick={() => markTaskComplete(task.id)}
                              className="text-green-600 hover:bg-green-100 p-1 rounded"
                              title="Mark Complete"
                            >
                              ✓
                            </button>
                          )}
                        </div>
                      </div>
                      
                      <div className="text-sm text-gray-600 space-y-1">
                        <div className="flex gap-4">
                          <span className="font-medium">Source:</span>
                          <span className="capitalize">{task.source}</span>
                        </div>
                        {task.keyPeople && task.keyPeople.length > 0 && (
                          <div className="flex gap-4">
                            <span className="font-medium">People:</span>
                            <span>{task.keyPeople.join(', ')}</span>
                          </div>
                        )}
                        {task.deadline && (
                          <div className="flex gap-4">
                            <span className="font-medium">Deadline:</span>
                            <span>{new Date(task.deadline).toLocaleDateString()}</span>
                          </div>
                        )}
                        {task.tags && task.tags.length > 0 && (
                          <div className="flex gap-4">
                            <span className="font-medium">Tags:</span>
                            <div className="flex gap-1">
                              {task.tags.map(tag => (
                                <span key={tag} className="bg-blue-100 text-blue-800 px-2 py-1 rounded text-xs">
                                  {tag}
                                </span>
                              ))}
                            </div>
                          </div>
                        )}
                        <div className="flex gap-4 text-xs text-gray-500">
                          <span>Created: {new Date(task.created).toLocaleDateString()}</span>
                          {task.confidence && (
                            <span>AI Confidence: {Math.round(task.confidence * 100)}%</span>
                          )}
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* Integration Status - Takes up 1 column */}
            <div className="bg-white rounded-lg shadow p-6">
              <h2 className="text-xl font-bold mb-4">📊 Integration Status</h2>
              <div className="space-y-3">
                {sortedIntegrations.slice(0, 6).map(integration => (
                  <div key={integration.name} className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <span>{integration.icon}</span>
                      <span className="font-medium">{integration.name}</span>
                      {integration.category === 'ai' && (
                        <span className="text-xs bg-blue-100 text-blue-800 px-2 py-1 rounded">AI</span>
                      )}
                    </div>
                    <div className={`w-3 h-3 rounded-full ${getStatusColor(integration.status)}`}></div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        )}
        
        {activeTab === 'integrations' && (
          <div className="space-y-6">
            <div>
              <h2 className="text-2xl font-bold mb-4 flex items-center gap-2">
                <span>🤖</span>
                AI Services
              </h2>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                {sortedIntegrations.filter(i => i.category === 'ai').map(integration => (
                  <div key={integration.name} className="bg-white rounded-lg shadow-lg p-6 border-l-4 border-blue-500">
                    <div className="flex items-center gap-3 mb-4">
                      <span className="text-3xl">{integration.icon}</span>
                      <div className="flex-1">
                        <h3 className="font-bold text-lg">{integration.name}</h3>
                        <p className="text-sm text-gray-600">{integration.description}</p>
                      </div>
                      <div className={`w-4 h-4 rounded-full ${getStatusColor(integration.status)}`}></div>
                    </div>
                    
                    <div className={`text-sm mb-3 font-medium ${
                      integration.status === 'connected' ? 'text-green-600' : 'text-red-600'
                    }`}>
                      {getStatusText(integration.status)}
                    </div>
                    
                    <div className="space-y-2">
                      <button 
                        onClick={() => testIntegration(integration.name)}
                        className="w-full bg-blue-500 text-white py-2 px-4 rounded hover:bg-blue-600 transition-colors"
                      >
                        Test Connection
                      </button>
                      
                      {integration.name === 'OpenAI' && !apiStatus.openai?.success && (
                        <div className="text-xs text-gray-500 bg-gray-50 p-2 rounded">
                          Add OPENAI_API_KEY to your .env file
                        </div>
                      )}
                      
                      {integration.name === 'Claude' && !apiStatus.claude?.success && (
                        <div className="text-xs text-gray-500 bg-gray-50 p-2 rounded">
                          Add ANTHROPIC_API_KEY to your .env file
                        </div>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            </div>

            <div>
              <h2 className="text-2xl font-bold mb-4 flex items-center gap-2">
                <span>🔗</span>
                Service Integrations
              </h2>
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                {sortedIntegrations.filter(i => i.category !== 'ai').map(integration => (
                  <div key={integration.name} className="bg-white rounded-lg shadow p-6">
                    <div className="flex items-center gap-3 mb-4">
                      <span className="text-2xl">{integration.icon}</span>
                      <div className="flex-1">
                        <h3 className="font-bold">{integration.name}</h3>
                        <p className="text-sm text-gray-600">{integration.description}</p>
                      </div>
                      <div className={`w-3 h-3 rounded-full ${getStatusColor(integration.status)}`}></div>
                    </div>
                    
                    <div className={`text-sm mb-3 ${
                      integration.status === 'connected' ? 'text-green-600' : 'text-red-600'
                    }`}>
                      {getStatusText(integration.status)}
                    </div>
                    
                    <div className="space-y-2">
                      <button 
                        onClick={() => testIntegration(integration.name)}
                        className="w-full bg-blue-500 text-white py-2 px-4 rounded hover:bg-blue-600"
                      >
                        Test Connection
                      </button>
                      
                      {integration.name === 'Notion' && apiStatus.notion?.success && (
                        <button 
                          onClick={syncWithNotion}
                          className="w-full bg-gray-800 text-white py-2 px-4 rounded hover:bg-gray-700"
                        >
                          📝 Sync Tasks
                        </button>
                      )}
                      
                      {integration.name === 'Gmail' && (
                        <a 
                          href="http://localhost:3001/auth/google" 
                          target="_blank" 
                          rel="noopener noreferrer"
                          className="block w-full bg-green-500 text-white py-2 px-4 rounded text-center hover:bg-green-600"
                        >
                          Setup OAuth
                        </a>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default App;
