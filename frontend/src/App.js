import React, { useState, useEffect } from 'react';
import io from 'socket.io-client';
import './App.css';

const Dashboard = () => {
  const [tasks, setTasks] = useState([]);
  const [events, setEvents] = useState([]);
  const [stats, setStats] = useState({});
  const [socket, setSocket] = useState(null);
  const [isConnected, setIsConnected] = useState(false);
  const [activeTab, setActiveTab] = useState('dashboard');
  
  // API Status
  const [apiStatus, setApiStatus] = useState({});
  const [suggestions, setSuggestions] = useState([]);
  const [intelligentActions, setIntelligentActions] = useState([]);
  
  // AI Chat
  const [chatMessages, setChatMessages] = useState([]);
  const [chatInput, setChatInput] = useState('');
  const [isAiTyping, setIsAiTyping] = useState(false);
  const [selectedAiModel, setSelectedAiModel] = useState('openai');

  useEffect(() => {
    // Connect to WebSocket
    const newSocket = io('http://localhost:3002');
    setSocket(newSocket);

    newSocket.on('connect', () => {
      setIsConnected(true);
      console.log('Connected to server');
    });

    newSocket.on('disconnect', () => {
      setIsConnected(false);
      console.log('Disconnected from server');
    });

    // Listen for real-time updates
    newSocket.on('new_task', (task) => {
      setTasks(prev => [task, ...prev]);
    });

    newSocket.on('task_updated', (updatedTask) => {
      setTasks(prev => prev.map(t => t.id === updatedTask.id ? updatedTask : t));
    });

    newSocket.on('new_event', (event) => {
      setEvents(prev => [event, ...prev.slice(0, 29)]);
    });

    newSocket.on('stats_update', (newStats) => {
      setStats(newStats);
    });

    newSocket.on('intelligent_actions', (actions) => {
      setIntelligentActions(prev => [...actions, ...prev.slice(0, 19)]);
    });

    // Load initial data
    loadTasks();
    loadEvents();
    loadApiStatus();
    loadSuggestions();

    return () => newSocket.close();
  }, []);

  const loadTasks = async () => {
    try {
      const response = await fetch('http://localhost:3002/api/tasks');
      const data = await response.json();
      setTasks(data.tasks || []);
      setStats(data.stats || {});
    } catch (error) {
      console.error('Failed to load tasks:', error);
    }
  };

  const loadEvents = async () => {
    try {
      const response = await fetch('http://localhost:3002/api/events');
      const data = await response.json();
      setEvents(data.events || []);
    } catch (error) {
      console.error('Failed to load events:', error);
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

  const loadSuggestions = async () => {
    try {
      const response = await fetch('http://localhost:3002/api/suggestions');
      const data = await response.json();
      setSuggestions(data.suggestions || []);
    } catch (error) {
      console.error('Failed to load suggestions:', error);
    }
  };

  const testAI = async () => {
    try {
      const response = await fetch('http://localhost:3002/api/ai-test', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ message: 'Fix the payment gateway bug by tomorrow' })
      });
      const result = await response.json();
      console.log('AI Test Result:', result);
    } catch (error) {
      console.error('AI test failed:', error);
    }
  };

  const completeTask = async (taskId) => {
    try {
      await fetch(`http://localhost:3002/api/tasks/${taskId}/status`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status: 'completed' })
      });
    } catch (error) {
      console.error('Failed to complete task:', error);
    }
  };

  const sendChatMessage = async () => {
    if (!chatInput.trim()) return;

    const userMessage = {
      id: Date.now(),
      role: 'user',
      content: chatInput,
      timestamp: new Date()
    };

    setChatMessages(prev => [...prev, userMessage]);
    setChatInput('');
    setIsAiTyping(true);

    try {
      const response = await fetch('http://localhost:3002/api/ai-chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ 
          message: chatInput,
          model: selectedAiModel,
          context: { tasks, events, stats }
        })
      });

      const data = await response.json();
      
      const aiMessage = {
        id: Date.now() + 1,
        role: 'assistant',
        content: data.response || 'Sorry, I encountered an error.',
        timestamp: new Date(),
        model: selectedAiModel
      };

      setChatMessages(prev => [...prev, aiMessage]);
    } catch (error) {
      console.error('Chat error:', error);
      const errorMessage = {
        id: Date.now() + 1,
        role: 'assistant',
        content: 'Sorry, I encountered an error. Please try again.',
        timestamp: new Date(),
        error: true
      };
      setChatMessages(prev => [...prev, errorMessage]);
    } finally {
      setIsAiTyping(false);
    }
  };

  const pendingTasks = tasks.filter(t => t.status === 'pending');
  const completedTasks = tasks.filter(t => t.status === 'completed');

  return (
    <div className="min-h-screen bg-gray-100">
      {/* Header */}
      <div className="bg-white shadow-sm border-b p-4">
        <div className="flex justify-between items-center">
          <h1 className="text-3xl font-bold text-gray-900">
            🤖 Ultimate AI Organizer
          </h1>
          <div className="flex items-center gap-4">
            <div className={`px-3 py-1 rounded-full text-sm font-medium ${
              isConnected ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'
            }`}>
              {isConnected ? '🔗 Connected' : '❌ Disconnected'}
            </div>
            <button 
              onClick={testAI}
              className="bg-blue-500 hover:bg-blue-600 text-white px-4 py-2 rounded-lg font-medium transition-colors"
            >
              🧪 Test AI
            </button>
          </div>
        </div>

        {/* Navigation Tabs */}
        <div className="flex gap-1 mt-4">
          {[
            { id: 'dashboard', label: '📊 Dashboard', icon: '📊' },
            { id: 'chat', label: '💬 AI Chat', icon: '💬' },
            { id: 'integrations', label: '🔗 Integrations', icon: '🔗' },
            { id: 'suggestions', label: '💡 Suggestions', icon: '💡' }
          ].map(tab => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              className={`px-4 py-2 rounded-lg font-medium transition-colors ${
                activeTab === tab.id
                  ? 'bg-blue-500 text-white'
                  : 'bg-gray-200 text-gray-700 hover:bg-gray-300'
              }`}
            >
              {tab.label}
            </button>
          ))}
        </div>
      </div>

      <div className="p-6">
        {/* Dashboard Tab */}
        {activeTab === 'dashboard' && (
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            {/* Stats Panel */}
            <div className="lg:col-span-1">
              <div className="bg-white rounded-lg shadow-lg p-6">
                <h2 className="text-xl font-bold mb-4">📊 Stats</h2>
                <div className="space-y-3">
                  <div className="flex justify-between">
                    <span>Total Tasks:</span>
                    <span className="font-bold">{tasks.length}</span>
                  </div>
                  <div className="flex justify-between">
                    <span>Pending:</span>
                    <span className="font-bold text-orange-600">{pendingTasks.length}</span>
                  </div>
                  <div className="flex justify-between">
                    <span>Completed:</span>
                    <span className="font-bold text-green-600">{completedTasks.length}</span>
                  </div>
                  <div className="flex justify-between">
                    <span>Events:</span>
                    <span className="font-bold">{events.length}</span>
                  </div>
                </div>
              </div>

              {/* Activity Feed */}
              <div className="bg-white rounded-lg shadow-lg p-6 mt-6">
                <h2 className="text-xl font-bold mb-4">📡 Live Activity</h2>
                <div className="space-y-3 max-h-96 overflow-y-auto">
                  {events.map((event, i) => (
                    <div key={i} className="border-l-4 border-blue-500 pl-3 py-2">
                      <div className="text-sm text-gray-600">
                        {new Date(event.timestamp || event.processed_at).toLocaleTimeString()}
                      </div>
                      <div className="font-medium">{event.source}</div>
                      <div className="text-sm text-gray-700">{event.type}</div>
                    </div>
                  ))}
                </div>
              </div>
            </div>

            {/* Task Board */}
            <div className="lg:col-span-2">
              <div className="bg-white rounded-lg shadow-lg p-6">
                <h2 className="text-xl font-bold mb-4">📋 Task Board</h2>
                
                {/* Pending Tasks */}
                <div className="mb-6">
                  <h3 className="text-lg font-semibold mb-3 text-orange-600">
                    ⏳ Pending ({pendingTasks.length})
                  </h3>
                  <div className="space-y-3">
                    {pendingTasks.map(task => (
                      <div key={task.id} className="border border-orange-200 rounded-lg p-4 bg-orange-50">
                        <div className="flex justify-between items-start">
                          <div className="flex-1">
                            <h4 className="font-medium text-gray-900">{task.title}</h4>
                            <div className="flex items-center gap-2 mt-1">
                              <span className={`px-2 py-1 rounded text-xs font-medium ${
                                task.urgency >= 4 ? 'bg-red-100 text-red-800' :
                                task.urgency >= 3 ? 'bg-yellow-100 text-yellow-800' :
                                'bg-gray-100 text-gray-800'
                              }`}>
                                Urgency: {task.urgency}/5
                              </span>
                              <span className="text-xs text-gray-500">{task.source}</span>
                              {task.aiGenerated && (
                                <span className="text-xs bg-purple-100 text-purple-800 px-2 py-1 rounded">
                                  🤖 AI
                                </span>
                              )}
                            </div>
                            {task.deadline && (
                              <div className="text-xs text-gray-600 mt-1">
                                Due: {new Date(task.deadline).toLocaleDateString()}
                              </div>
                            )}
                          </div>
                          <button 
                            onClick={() => completeTask(task.id)}
                            className="bg-green-500 hover:bg-green-600 text-white px-3 py-1 rounded text-sm transition-colors"
                          >
                            ✓ Complete
                          </button>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>

                {/* Completed Tasks */}
                <div>
                  <h3 className="text-lg font-semibold mb-3 text-green-600">
                    ✅ Completed ({completedTasks.length})
                  </h3>
                  <div className="space-y-3">
                    {completedTasks.map(task => (
                      <div key={task.id} className="border border-green-200 rounded-lg p-4 bg-green-50">
                        <h4 className="font-medium text-gray-700 line-through">{task.title}</h4>
                        <div className="flex items-center gap-2 mt-1">
                          <span className="text-xs text-gray-500">{task.source}</span>
                          <span className="text-xs text-green-600">Completed</span>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* AI Chat Tab */}
        {activeTab === 'chat' && (
          <div className="max-w-4xl mx-auto">
            <div className="bg-white rounded-lg shadow-lg">
              {/* Chat Header */}
              <div className="border-b p-4">
                <div className="flex justify-between items-center">
                  <h2 className="text-xl font-bold">💬 AI Assistant</h2>
                  <select 
                    value={selectedAiModel}
                    onChange={(e) => setSelectedAiModel(e.target.value)}
                    className="border rounded px-3 py-1"
                  >
                    <option value="openai">🤖 OpenAI GPT-4</option>
                    <option value="claude">🧠 Claude</option>
                  </select>
                </div>
                <p className="text-sm text-gray-600 mt-1">
                  Context-aware AI trained on your tasks, events, and patterns
                </p>
              </div>

              {/* Chat Messages */}
              <div className="h-96 overflow-y-auto p-4 space-y-4">
                {chatMessages.length === 0 && (
                  <div className="text-center text-gray-500 mt-8">
                    <div className="text-4xl mb-2">🤖</div>
                    <p>Start a conversation with your AI assistant!</p>
                    <p className="text-sm mt-2">Try asking about your tasks, deadlines, or any questions.</p>
                  </div>
                )}
                
                {chatMessages.map(message => (
                  <div key={message.id} className={`flex ${message.role === 'user' ? 'justify-end' : 'justify-start'}`}>
                    <div className={`max-w-xs lg:max-w-md px-4 py-2 rounded-lg ${
                      message.role === 'user' 
                        ? 'bg-blue-500 text-white' 
                        : message.error 
                          ? 'bg-red-100 text-red-800' 
                          : 'bg-gray-100 text-gray-800'
                    }`}>
                      <div className="text-sm">{message.content}</div>
                      <div className="text-xs opacity-70 mt-1">
                        {message.timestamp.toLocaleTimeString()}
                        {message.model && ` • ${message.model}`}
                      </div>
                    </div>
                  </div>
                ))}
                
                {isAiTyping && (
                  <div className="flex justify-start">
                    <div className="bg-gray-100 text-gray-800 px-4 py-2 rounded-lg">
                      <div className="flex items-center gap-1">
                        <div className="animate-bounce">●</div>
                        <div className="animate-bounce delay-100">●</div>
                        <div className="animate-bounce delay-200">●</div>
                      </div>
                    </div>
                  </div>
                )}
              </div>

              {/* Chat Input */}
              <div className="border-t p-4">
                <div className="flex gap-2">
                  <input
                    type="text"
                    value={chatInput}
                    onChange={(e) => setChatInput(e.target.value)}
                    onKeyPress={(e) => e.key === 'Enter' && sendChatMessage()}
                    placeholder="Ask me about your tasks, deadlines, or anything..."
                    className="flex-1 border rounded-lg px-4 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500"
                    disabled={isAiTyping}
                  />
                  <button
                    onClick={sendChatMessage}
                    disabled={isAiTyping || !chatInput.trim()}
                    className="bg-blue-500 hover:bg-blue-600 disabled:bg-gray-300 text-white px-6 py-2 rounded-lg transition-colors"
                  >
                    Send
                  </button>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Integrations Tab */}
        {activeTab === 'integrations' && (
          <div className="max-w-6xl mx-auto">
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {[
                { name: 'OpenAI', status: 'connected', icon: '🤖', description: 'GPT-4 AI processing' },
                { name: 'Claude', status: 'connected', icon: '🧠', description: 'Anthropic Claude AI' },
                { name: 'Notion', status: 'connected', icon: '📝', description: 'Task management' },
                { name: 'Gmail', status: 'error', icon: '📧', description: 'Email monitoring' },
                { name: 'Slack', status: 'error', icon: '💬', description: 'Team communication' },
                { name: 'Fireflies', status: 'error', icon: '🎙️', description: 'Meeting transcripts' },
                { name: 'Calendar', status: 'disconnected', icon: '📅', description: 'Schedule management' },
                { name: 'Linear', status: 'disconnected', icon: '📊', description: 'Issue tracking' },
                { name: 'GitHub', status: 'disconnected', icon: '⚡', description: 'Code repository' }
              ].map(integration => (
                <div key={integration.name} className="bg-white rounded-lg shadow-lg p-6">
                  <div className="flex items-center justify-between mb-4">
                    <div className="flex items-center gap-3">
                      <span className="text-2xl">{integration.icon}</span>
                      <div>
                        <h3 className="font-bold">{integration.name}</h3>
                        <p className="text-sm text-gray-600">{integration.description}</p>
                      </div>
                    </div>
                    <div className={`w-3 h-3 rounded-full ${
                      integration.status === 'connected' ? 'bg-green-500' :
                      integration.status === 'error' ? 'bg-red-500' : 'bg-gray-300'
                    }`}></div>
                  </div>
                  
                  <div className={`text-sm font-medium mb-3 ${
                    integration.status === 'connected' ? 'text-green-600' :
                    integration.status === 'error' ? 'text-red-600' : 'text-gray-500'
                  }`}>
                    {integration.status === 'connected' ? '✅ Connected' :
                     integration.status === 'error' ? '❌ Connection Error' : '⚪ Not Connected'}
                  </div>
                  
                  <button className={`w-full py-2 px-4 rounded-lg font-medium transition-colors ${
                    integration.status === 'connected' 
                      ? 'bg-green-100 text-green-800 hover:bg-green-200'
                      : 'bg-blue-500 text-white hover:bg-blue-600'
                  }`}>
                    {integration.status === 'connected' ? 'Configure' : 'Connect'}
                  </button>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Suggestions Tab */}
        {activeTab === 'suggestions' && (
          <div className="max-w-4xl mx-auto">
            <div className="bg-white rounded-lg shadow-lg p-6">
              <h2 className="text-xl font-bold mb-4">💡 Smart Suggestions</h2>
              
              <div className="space-y-4">
                {suggestions.map((suggestion, i) => (
                  <div key={i} className={`border-l-4 p-4 rounded-lg ${
                    suggestion.priority === 'high' ? 'border-red-500 bg-red-50' :
                    suggestion.priority === 'medium' ? 'border-yellow-500 bg-yellow-50' :
                    'border-blue-500 bg-blue-50'
                  }`}>
                    <div className="flex justify-between items-start">
                      <div>
                        <h3 className="font-medium">{suggestion.message}</h3>
                        <p className="text-sm text-gray-600 mt-1">{suggestion.type}</p>
                      </div>
                      <span className={`px-2 py-1 rounded text-xs font-medium ${
                        suggestion.priority === 'high' ? 'bg-red-100 text-red-800' :
                        suggestion.priority === 'medium' ? 'bg-yellow-100 text-yellow-800' :
                        'bg-blue-100 text-blue-800'
                      }`}>
                        {suggestion.priority}
                      </span>
                    </div>
                  </div>
                ))}
                
                {suggestions.length === 0 && (
                  <div className="text-center text-gray-500 py-8">
                    <div className="text-4xl mb-2">✨</div>
                    <p>No suggestions at the moment.</p>
                    <p className="text-sm mt-2">Your AI assistant will provide smart recommendations as you work.</p>
                  </div>
                )}
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default Dashboard;