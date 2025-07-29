import React, { useState, useEffect } from 'react';
import io from 'socket.io-client';
import './App.css';

const App = () => {
  const [tasks, setTasks] = useState([]);
  const [events, setEvents] = useState([]);
  const [isConnected, setIsConnected] = useState(false);
  const [activeTab, setActiveTab] = useState('dashboard');
  const [apiStatus, setApiStatus] = useState({});

  useEffect(() => {
    const socket = io('http://localhost:3002');
    socket.on('connect', () => setIsConnected(true));
    socket.on('disconnect', () => setIsConnected(false));
    
    // Load data
    loadTasks();
    loadApiStatus();
      
    return () => socket.close();
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
      loadTasks(); // Reload tasks after test
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
      
      loadApiStatus(); // Refresh status
    } catch (error) {
      alert(`❌ ${name} connection failed: ${error.message}`);
    }
  };

  const integrations = [
    // AI Services (Featured at the top)
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
    // Core Integrations
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
    // Extended Integrations
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

  // Sort integrations by priority and status
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

  const getCategoryIcon = (category) => {
    switch (category) {
      case 'ai': return '🤖';
      case 'productivity': return '📋';
      case 'communication': return '💬';
      case 'meetings': return '🎙️';
      case 'development': return '💻';
      default: return '🔧';
    }
  };

  return (
    <div className="min-h-screen bg-gray-100">
      <div className="bg-white shadow p-4">
        <div className="flex justify-between items-center">
          <h1 className="text-3xl font-bold">🤖 Ultimate AI Organizer</h1>
          <div className="flex gap-4">
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
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <div className="bg-white rounded-lg shadow p-6">
              <h2 className="text-xl font-bold mb-4">📋 Tasks ({tasks.length})</h2>
              {tasks.length === 0 ? (
                <p className="text-gray-500">No tasks yet. Click Test AI to generate some!</p>
              ) : (
                tasks.map(task => (
                  <div key={task.id} className="border rounded p-3 mb-2">
                    <h4 className="font-medium">{task.title}</h4>
                    <span className="text-xs text-gray-500">{task.source}</span>
                  </div>
                ))
              )}
            </div>

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
            {/* AI Services Section */}
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

            {/* Other Services */}
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
                      
                      {integration.name === 'Gmail' && (
                        <a 
                          href="http://localhost:3002/auth/google" 
                          target="_blank" 
                          rel="noopener noreferrer"
                          className="block w-full bg-green-500 text-white py-2 px-4 rounded text-center hover:bg-green-600"
                        >
                          Setup OAuth
                        </a>
                      )}

                      {integration.name === 'Notion' && !apiStatus.notion?.success && (
                        <div className="text-xs text-gray-500 bg-gray-50 p-2 rounded">
                          Add NOTION_API_KEY to your .env file
                        </div>
                      )}

                      {integration.name === 'Slack' && !apiStatus.slack?.success && (
                        <div className="text-xs text-gray-500 bg-gray-50 p-2 rounded">
                          Add SLACK_BOT_TOKEN to your .env file
                        </div>
                      )}

                      {integration.name === 'GitHub' && !apiStatus.github?.success && (
                        <div className="text-xs text-gray-500 bg-gray-50 p-2 rounded">
                          Add GITHUB_TOKEN to your .env file
                        </div>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* Quick Setup Guide */}
            <div className="bg-blue-50 border border-blue-200 rounded-lg p-6">
              <h3 className="text-lg font-bold mb-3 text-blue-800">🚀 Quick Setup Guide</h3>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm">
                <div>
                  <h4 className="font-semibold text-blue-700 mb-2">AI Services</h4>
                  <ul className="space-y-1 text-blue-600">
                    <li>• Get OpenAI API key from platform.openai.com</li>
                    <li>• Get Claude API key from console.anthropic.com</li>
                    <li>• Add keys to backend/.env file</li>
                  </ul>
                </div>
                <div>
                  <h4 className="font-semibold text-blue-700 mb-2">Core Integrations</h4>
                  <ul className="space-y-1 text-blue-600">
                    <li>• Create integrations for each service</li>
                    <li>• Add API keys to .env file</li>
                    <li>• Use Test Connection to verify setup</li>
                  </ul>
                </div>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default App;