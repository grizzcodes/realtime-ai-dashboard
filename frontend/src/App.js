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
    { name: 'Notion', icon: '📝', description: 'Task management', status: apiStatus.notion?.success ? 'connected' : 'error' },
    { name: 'Gmail', icon: '📧', description: 'Email monitoring', status: apiStatus.gmail?.success ? 'connected' : 'error' },
    { name: 'Slack', icon: '💬', description: 'Team communication', status: apiStatus.slack?.success ? 'connected' : 'error' },
    { name: 'Fireflies', icon: '🎙️', description: 'Meeting transcripts', status: apiStatus.fireflies?.success ? 'connected' : 'error' },
    { name: 'Calendar', icon: '📅', description: 'Schedule management', status: apiStatus.calendar?.success ? 'connected' : 'error' },
    { name: 'Linear', icon: '📊', description: 'Issue tracking', status: apiStatus.linear?.success ? 'connected' : 'error' },
    { name: 'GitHub', icon: '⚡', description: 'Code repository', status: apiStatus.github?.success ? 'connected' : 'error' }
  ];

  return (
    <div className="min-h-screen bg-gray-100">
      <div className="bg-white shadow p-4">
        <div className="flex justify-between items-center">
          <h1 className="text-3xl font-bold">🤖 Ultimate AI Organizer</h1>
          <div className="flex gap-4">
            <span className={isConnected ? 'text-green-600' : 'text-red-600'}>
              {isConnected ? '🔗 Connected' : '❌ Disconnected'}
            </span>
            <button onClick={testAI} className="bg-blue-500 text-white px-4 py-2 rounded">
              🧪 Test AI
            </button>
          </div>
        </div>
        
        <div className="flex gap-2 mt-4">
          {['dashboard', 'integrations'].map(tab => (
            <button
              key={tab}
              onClick={() => setActiveTab(tab)}
              className={`px-4 py-2 rounded ${activeTab === tab ? 'bg-blue-500 text-white' : 'bg-gray-200'}`}
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
                {integrations.slice(0, 4).map(integration => (
                  <div key={integration.name} className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <span>{integration.icon}</span>
                      <span className="font-medium">{integration.name}</span>
                    </div>
                    <div className={`w-3 h-3 rounded-full ${
                      integration.status === 'connected' ? 'bg-green-500' : 'bg-red-500'
                    }`}></div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        )}
        
        {activeTab === 'integrations' && (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {integrations.map(integration => (
              <div key={integration.name} className="bg-white rounded-lg shadow p-6">
                <div className="flex items-center gap-3 mb-4">
                  <span className="text-2xl">{integration.icon}</span>
                  <div>
                    <h3 className="font-bold">{integration.name}</h3>
                    <p className="text-sm text-gray-600">{integration.description}</p>
                  </div>
                  <div className={`w-3 h-3 rounded-full ml-auto ${
                    integration.status === 'connected' ? 'bg-green-500' : 'bg-red-500'
                  }`}></div>
                </div>
                
                <div className={`text-sm mb-3 ${
                  integration.status === 'connected' ? 'text-green-600' : 'text-red-600'
                }`}>
                  {integration.status === 'connected' ? '✅ Connected' : '❌ Not Connected'}
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
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
};

export default App;