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
  const [statusOptions, setStatusOptions] = useState([]);
  const [availableAssignees, setAvailableAssignees] = useState([]);
  
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
    
    // Listen for Notion sync with status options
    socket.on('notionSync', (result) => {
      if (result.tasks) {
        setTasks(result.tasks);
        extractAvailableAssignees(result.tasks);
      }
      if (result.statusOptions) {
        setStatusOptions(result.statusOptions);
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

  // Extract unique assignees from tasks
  const extractAvailableAssignees = (taskList) => {
    const assigneeSet = new Set();
    taskList.forEach(task => {
      if (task.assignee && task.assignee !== 'Unassigned') {
        assigneeSet.add(task.assignee);
      }
      // Also add all team members
      if (task.keyPeople && task.keyPeople.length > 0) {
        task.keyPeople.forEach(person => {
          if (person && person !== 'Unknown User') {
            assigneeSet.add(person);
          }
        });
      }
    });
    const assignees = Array.from(assigneeSet).sort();
    setAvailableAssignees(assignees);
    console.log('👥 Available assignees:', assignees);
  };

  const loadTasks = async () => {
    try {
      const response = await fetch('http://localhost:3001/api/tasks');
      const data = await response.json();
      setTasks(data.tasks || []);
      setStatusOptions(data.statusOptions || []);
      extractAvailableAssignees(data.tasks || []);
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
      filtered = filtered.filter(task => {
        const assigneeName = task.assignee?.toLowerCase() || '';
        const keyPeople = task.keyPeople || [];
        const teamMembers = keyPeople.map(person => person.toLowerCase());
        
        const searchTerm = filters.assignee.toLowerCase();
        
        return assigneeName.includes(searchTerm) || 
               teamMembers.some(member => member.includes(searchTerm));
      });
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
      filtered = filtered.filter(task => {
        const rawStatus = task.rawStatus?.toLowerCase() || '';
        return rawStatus === filters.status.toLowerCase();
      });
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

  const clearTasks = () => {
    setTasks([]);
    setFilteredTasks([]);
    setStatusOptions([]);
    setAvailableAssignees([]);
    console.log('🗑️ Tasks cleared from frontend');
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
      console.log('🔄 Starting fresh Notion sync...');
      const response = await fetch('http://localhost:3001/api/notion/sync', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' }
      });
      const data = await response.json();
      
      if (data.success) {
        console.log('✅ Fresh sync completed:', data.tasksImported, 'tasks');
        alert(`✅ Notion sync complete! Found ${data.tasksImported} tasks.`);
        setTasks(data.tasks || []);
        setStatusOptions(data.statusOptions || []);
        extractAvailableAssignees(data.tasks || []);
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

  const getStatusColorClass = (statusColor) => {
    // Map Notion colors to Tailwind classes
    switch (statusColor) {
      case 'blue': return 'bg-blue-100 text-blue-800 border-blue-200';
      case 'red': return 'bg-red-100 text-red-800 border-red-200';
      case 'purple': return 'bg-purple-100 text-purple-800 border-purple-200';
      case 'green': return 'bg-green-100 text-green-800 border-green-200';
      case 'yellow': return 'bg-yellow-100 text-yellow-800 border-yellow-200';
      case 'orange': return 'bg-orange-100 text-orange-800 border-orange-200';
      case 'pink': return 'bg-pink-100 text-pink-800 border-pink-200';
      case 'brown': return 'bg-amber-100 text-amber-800 border-amber-200';
      case 'gray': return 'bg-gray-100 text-gray-800 border-gray-200';
      default: return 'bg-gray-100 text-gray-800 border-gray-200';
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
                  <button 
                    onClick={clearTasks}
                    className="bg-red-500 text-white px-3 py-1 rounded text-sm hover:bg-red-600"
                  >
                    🗑️ Clear Tasks
                  </button>
                </div>
              </div>

              {/* Filters */}
              <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-3 mb-4 p-3 bg-gray-50 rounded">
                <select
                  value={filters.assignee}
                  onChange={(e) => setFilters({...filters, assignee: e.target.value})}
                  className="px-2 py-1 border rounded text-sm"
                >
                  <option value="">All Assignees</option>
                  {availableAssignees.map(assignee => (
                    <option key={assignee} value={assignee}>
                      👤 {assignee}
                    </option>
                  ))}
                </select>
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
                  {statusOptions.map(option => (
                    <option key={option.name} value={option.name}>
                      {option.name}
                    </option>
                  ))}
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

              {/* Show current filters */}
              {(filters.assignee || filters.project || filters.status !== 'all') && (
                <div className="mb-4 p-2 bg-blue-50 rounded text-sm">
                  <strong>Active Filters:</strong>
                  {filters.assignee && <span className="ml-2 bg-blue-200 px-2 py-1 rounded">👤 {filters.assignee}</span>}
                  {filters.project && <span className="ml-2 bg-green-200 px-2 py-1 rounded">📁 {filters.project}</span>}
                  {filters.status !== 'all' && <span className="ml-2 bg-purple-200 px-2 py-1 rounded">📊 {filters.status}</span>}
                </div>
              )}

              {/* Tasks List */}
              {filteredTasks.length === 0 ? (
                <div className="text-center py-8">
                  <p className="text-gray-500 mb-4">
                    {tasks.length === 0 
                      ? "No tasks loaded. Click 'Sync Notion' to load your tasks!" 
                      : "No tasks match your filters. Try clearing filters or adjusting your search."}
                  </p>
                  {tasks.length === 0 && apiStatus.notion?.success && (
                    <button 
                      onClick={syncWithNotion}
                      className="bg-blue-500 text-white px-4 py-2 rounded hover:bg-blue-600"
                    >
                      📝 Load Tasks from Notion
                    </button>
                  )}
                </div>
              ) : (
                <div className="space-y-3 max-h-96 overflow-y-auto">
                  {filteredTasks.map(task => (
                    <div key={task.id} className="border rounded-lg p-4 hover:shadow-md transition-shadow">
                      <div className="flex justify-between items-start mb-2">
                        <h4 className="font-medium text-lg">{task.title}</h4>
                      </div>
                      
                      <div className="text-sm text-gray-600 space-y-2">
                        <div className="flex gap-4 items-center">
                          <span className="font-medium">Status:</span>
                          <span className={`px-2 py-1 rounded border text-xs ${getStatusColorClass(task.statusColor)}`}>
                            {task.rawStatus}
                          </span>
                        </div>
                        
                        <div className="flex gap-4 items-center">
                          <span className="font-medium">People:</span>
                          <div className="flex gap-1 flex-wrap">
                            {task.keyPeople && task.keyPeople.length > 0 ? (
                              task.keyPeople.map(person => (
                                <span key={person} className="bg-green-100 text-green-800 px-2 py-1 rounded text-xs">
                                  👤 {person}
                                </span>
                              ))
                            ) : (
                              <span className="bg-gray-100 text-gray-600 px-2 py-1 rounded text-xs">
                                👤 Unassigned
                              </span>
                            )}
                          </div>
                        </div>

                        <div className="flex gap-4">
                          <span className="font-medium">Source:</span>
                          <span className="capitalize">{task.source}</span>
                        </div>
                        
                        {task.deadline && (
                          <div className="flex gap-4">
                            <span className="font-medium">Deadline:</span>
                            <span>{new Date(task.deadline).toLocaleDateString()}</span>
                          </div>
                        )}
                        
                        {task.project && task.project !== 'General' && (
                          <div className="flex gap-4">
                            <span className="font-medium">Project:</span>
                            <span>{task.project}</span>
                          </div>
                        )}
                        
                        {task.tags && task.tags.length > 0 && (
                          <div className="flex gap-4">
                            <span className="font-medium">Tags:</span>
                            <div className="flex gap-1 flex-wrap">
                              {task.tags.map(tag => (
                                <span key={tag} className="bg-blue-100 text-blue-800 px-2 py-1 rounded text-xs">
                                  #{tag}
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
              <div className="space-y-3 mb-6">
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

              {/* Quick Stats */}
              {tasks.length > 0 && (
                <div className="border-t pt-4">
                  <h3 className="font-bold text-sm mb-2">📈 Quick Stats</h3>
                  <div className="space-y-1 text-xs text-gray-600">
                    <div>Total Tasks: {tasks.length}</div>
                    <div>Filtered: {filteredTasks.length}</div>
                    <div>Team Members: {availableAssignees.length}</div>
                  </div>
                </div>
              )}
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
