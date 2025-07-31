import React, { useState, useEffect } from 'react';
import io from 'socket.io-client';
import './App.css';
import FloatingChatbox from './components/FloatingChatbox';

const App = () => {
  const [tasks, setTasks] = useState([]);
  const [events, setEvents] = useState([]);
  const [isConnected, setIsConnected] = useState(false);
  const [activeTab, setActiveTab] = useState('dashboard');
  const [apiStatus, setApiStatus] = useState({});
  const [socket, setSocket] = useState(null);

  useEffect(() => {
    const newSocket = io('http://localhost:3002');
    setSocket(newSocket);
    
    newSocket.on('connect', () => setIsConnected(true));
    newSocket.on('disconnect', () => setIsConnected(false));
    
    // Load data
    loadTasks();
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
                {integrations.slice(0, 6).map(integration => (
                  <div key={integration.name} className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <span>{integration.icon}</span>
                      <span className="font-medium">{integration.name}</span>
                    </div>
                    <div className={`w-3 h-3 rounded-full ${getIntegrationStatusColor(integration.status)}`}></div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        )}
        
        {activeTab === 'integrations' && (
          <div className="space-y-6">
            <div className="bg-white rounded-lg shadow p-6">
              <h2 className="text-2xl font-bold mb-4">🤖 AI Services</h2>
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                {integrations.filter(i => i.category === 'ai').map(integration => (
                  <div key={integration.name} className="border rounded-lg p-6">
                    <div className="flex items-center gap-3 mb-4">
                      <span className="text-2xl">{integration.icon}</span>
                      <div className="flex-1">
                        <h3 className="font-bold">{integration.name}</h3>
                        <p className="text-sm text-gray-600">{integration.description}</p>
                      </div>
                      <div className={`w-3 h-3 rounded-full ${getIntegrationStatusColor(integration.status)}`}></div>
                    </div>
                    
                    <div className={`text-sm mb-3 ${
                      integration.status === 'connected' ? 'text-green-600' : 'text-red-600'
                    }`}>
                      {integration.status === 'connected' ? '✅ Connected' : '❌ Not Connected'}
                    </div>
                    
                    <button 
                      onClick={() => testIntegration(integration.name)}
                      className="w-full bg-blue-500 text-white py-2 px-4 rounded hover:bg-blue-600"
                    >
                      Test Connection
                    </button>
                  </div>
                ))}
              </div>
            </div>

            <div className="bg-white rounded-lg shadow p-6">
              <h2 className="text-2xl font-bold mb-4">🔗 Other Services</h2>
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                {integrations.filter(i => i.category !== 'ai').map(integration => (
                  <div key={integration.name} className="border rounded-lg p-6">
                    <div className="flex items-center gap-3 mb-4">
                      <span className="text-2xl">{integration.icon}</span>
                      <div className="flex-1">
                        <h3 className="font-bold">{integration.name}</h3>
                        <p className="text-sm text-gray-600">{integration.description}</p>
                      </div>
                      <div className={`w-3 h-3 rounded-full ${getIntegrationStatusColor(integration.status)}`}></div>
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
                      
                      {(integration.name === 'Gmail' || integration.name === 'Calendar') && (
                        <button 
                          onClick={() => window.open('http://localhost:3002/auth/google', '_blank')}
                          className="w-full bg-green-500 text-white py-2 px-4 rounded hover:bg-green-600"
                        >
                          Setup OAuth
                        </button>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            </div>

            <div className="bg-white rounded-lg shadow p-6">
              <h3 className="text-lg font-bold mb-3">⚙️ Quick Setup Guide</h3>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm">
                <div className="bg-blue-50 p-3 rounded">
                  <h4 className="font-semibold">🤖 AI Services</h4>
                  <p>Add API keys to your .env file</p>
                </div>
                <div className="bg-green-50 p-3 rounded">
                  <h4 className="font-semibold">📧 Gmail/Calendar</h4>
                  <p>Click "Setup OAuth" button above</p>
                </div>
                <div className="bg-purple-50 p-3 rounded">
                  <h4 className="font-semibold">💬 Slack</h4>
                  <p>Get bot token from api.slack.com</p>
                </div>
                <div className="bg-orange-50 p-3 rounded">
                  <h4 className="font-semibold">🎙️ Fireflies</h4>
                  <p>Get API key from fireflies.ai</p>
                </div>
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