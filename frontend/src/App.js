import React, { useState, useEffect } from 'react';
import io from 'socket.io-client';
import './App.css';

// AI Chatbox Component
const AIChatbox = ({ socket, apiStatus }) => {
  const [isOpen, setIsOpen] = useState(false);
  const [messages, setMessages] = useState([]);
  const [input, setInput] = useState('');
  const [provider, setProvider] = useState('openai');
  const [isTyping, setIsTyping] = useState(false);

  useEffect(() => {
    if (socket) {
      socket.on('aiResponse', (data) => {
        setIsTyping(false);
        setMessages(prev => [...prev, { 
          type: 'ai', 
          text: typeof data.response === 'string' ? data.response : data.response.suggestion,
          actions: data.response.actions || []
        }]);
      });

      socket.on('aiError', (data) => {
        setIsTyping(false);
        setMessages(prev => [...prev, { type: 'error', text: data.error }]);
      });
    }
    return () => {
      if (socket) {
        socket.off('aiResponse');
        socket.off('aiError');
      }
    };
  }, [socket]);

  const sendMessage = () => {
    if (!input.trim()) return;
    
    setMessages(prev => [...prev, { type: 'user', text: input }]);
    setIsTyping(true);
    
    const isModification = input.toLowerCase().includes('modify') || 
                          input.toLowerCase().includes('change') || 
                          input.toLowerCase().includes('update') ||
                          input.toLowerCase().includes('admin');
    
    socket.emit('aiChat', {
      message: input,
      provider,
      action: isModification ? 'modify_platform' : 'chat'
    });
    
    setInput('');
  };

  const executeAction = async (action) => {
    try {
      const response = await fetch(`http://localhost:3002/api/admin/${action.type.replace('_', '-')}`, {
        method: 'POST'
      });
      const data = await response.json();
      
      setMessages(prev => [...prev, { 
        type: 'system', 
        text: `✅ ${data.message || 'Action completed'}` 
      }]);
      
      if (action.type === 'refresh_integrations') {
        window.location.reload();
      }
    } catch (error) {
      setMessages(prev => [...prev, { 
        type: 'error', 
        text: `❌ Failed to execute action: ${error.message}` 
      }]);
    }
  };

  if (!isOpen) {
    return (
      <div className="fixed bottom-6 right-6 z-50">
        <button
          onClick={() => setIsOpen(true)}
          className="bg-gradient-to-r from-purple-500 to-blue-500 text-white p-4 rounded-full shadow-lg hover:shadow-xl transition-all duration-300 animate-pulse"
        >
          <span className="text-2xl">🤖</span>
        </button>
      </div>
    );
  }

  return (
    <div className="fixed bottom-6 right-6 w-96 h-96 bg-white rounded-lg shadow-2xl border z-50 flex flex-col">
      <div className="bg-gradient-to-r from-purple-500 to-blue-500 text-white p-4 rounded-t-lg flex justify-between items-center">
        <div>
          <h3 className="font-bold">AI Assistant</h3>
          <div className="flex gap-2 mt-1">
            <button
              onClick={() => setProvider('openai')}
              className={`px-2 py-1 text-xs rounded ${provider === 'openai' ? 'bg-white/20' : 'bg-white/10'}`}
            >
              GPT-4
            </button>
            <button
              onClick={() => setProvider('claude')}
              className={`px-2 py-1 text-xs rounded ${provider === 'claude' ? 'bg-white/20' : 'bg-white/10'}`}
            >
              Claude
            </button>
          </div>
        </div>
        <button
          onClick={() => setIsOpen(false)}
          className="text-white/80 hover:text-white"
        >
          ✕
        </button>
      </div>

      <div className="flex-1 p-4 overflow-y-auto space-y-3">
        {messages.length === 0 && (
          <div className="text-gray-500 text-sm">
            👋 Hi! I'm your AI admin assistant. I can help manage your platform, test integrations, and provide insights.
          </div>
        )}
        
        {messages.map((msg, i) => (
          <div key={i} className={`${msg.type === 'user' ? 'text-right' : 'text-left'}`}>
            <div className={`inline-block max-w-[80%] p-2 rounded-lg text-sm ${
              msg.type === 'user' 
                ? 'bg-blue-500 text-white' 
                : msg.type === 'error'
                ? 'bg-red-100 text-red-800'
                : msg.type === 'system'
                ? 'bg-green-100 text-green-800'
                : 'bg-gray-100 text-gray-800'
            }`}>
              {msg.text}
            </div>
            
            {msg.actions && msg.actions.length > 0 && (
              <div className="mt-2 space-y-1">
                {msg.actions.map((action, j) => (
                  <button
                    key={j}
                    onClick={() => executeAction(action)}
                    className="block w-full text-left px-3 py-1 bg-blue-50 hover:bg-blue-100 text-blue-700 text-xs rounded border"
                  >
                    {action.label}
                  </button>
                ))}
              </div>
            )}
          </div>
        ))}
        
        {isTyping && (
          <div className="text-left">
            <div className="inline-block bg-gray-100 text-gray-800 p-2 rounded-lg text-sm">
              <div className="flex space-x-1">
                <div className="w-2 h-2 bg-gray-400 rounded-full animate-bounce"></div>
                <div className="w-2 h-2 bg-gray-400 rounded-full animate-bounce" style={{animationDelay: '0.1s'}}></div>
                <div className="w-2 h-2 bg-gray-400 rounded-full animate-bounce" style={{animationDelay: '0.2s'}}></div>
              </div>
            </div>
          </div>
        )}
      </div>

      <div className="p-4 border-t">
        <div className="flex gap-2">
          <input
            type="text"
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyPress={(e) => e.key === 'Enter' && sendMessage()}
            placeholder="Ask about integrations, request modifications..."
            className="flex-1 px-3 py-2 border rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-purple-500"
            disabled={!apiStatus.openai?.success && !apiStatus.claude?.success}
          />
          <button
            onClick={sendMessage}
            disabled={!input.trim() || isTyping || (!apiStatus.openai?.success && !apiStatus.claude?.success)}
            className="px-4 py-2 bg-purple-500 text-white rounded-lg hover:bg-purple-600 disabled:opacity-50 disabled:cursor-not-allowed text-sm"
          >
            Send
          </button>
        </div>
        {!apiStatus.openai?.success && !apiStatus.claude?.success && (
          <div className="text-xs text-red-500 mt-1">
            Add AI API keys to enable chatbot
          </div>
        )}
      </div>
    </div>
  );
};

const App = () => {
  const [tasks, setTasks] = useState([]);
  const [isConnected, setIsConnected] = useState(false);
  const [activeTab, setActiveTab] = useState('dashboard');
  const [apiStatus, setApiStatus] = useState({});
  const [socket, setSocket] = useState(null);

  useEffect(() => {
    const newSocket = io('http://localhost:3002');
    setSocket(newSocket);
    
    newSocket.on('connect', () => setIsConnected(true));
    newSocket.on('disconnect', () => setIsConnected(false));
    
    newSocket.on('integrationUpdate', (status) => {
      setApiStatus(status);
    });
    
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
      const response = await fetch('http://localhost:3002/api/health');
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
      alert(`✅ AI test: ${result.message}`);
      loadTasks();
    } catch (error) {
      console.error('AI test failed:', error);
      alert(`❌ AI test failed: ${error.message}`);
    }
  };

  const testIntegration = async (name) => {
    try {
      const response = await fetch(`http://localhost:3002/api/test/${name.toLowerCase()}`);
      const data = await response.json();
      
      if (data.success) {
        alert(`✅ ${name}: ${data.message || 'Connection successful!'}`);
      } else {
        if (data.needsAuth && (name === 'Gmail' || name === 'Calendar')) {
          if (window.confirm(`${name} requires OAuth setup. Click OK to authenticate now.`)) {
            window.open('http://localhost:3002/auth/google', '_blank');
          }
        } else {
          alert(`❌ ${name} failed: ${data.error}`);
        }
      }
      
      setTimeout(loadApiStatus, 2000);
    } catch (error) {
      alert(`❌ ${name} connection failed: ${error.message}`);
    }
  };

  const integrations = [
    { 
      name: 'OpenAI', 
      icon: '🤖', 
      description: 'GPT AI processing', 
      status: apiStatus.openai?.success ? 'connected' : 'error',
      category: 'ai'
    },
    { 
      name: 'Claude', 
      icon: '🧠', 
      description: 'Anthropic AI assistant', 
      status: apiStatus.claude?.success ? 'connected' : 'error',
      category: 'ai'
    },
    { 
      name: 'Gmail', 
      icon: '📧', 
      description: 'Email monitoring', 
      status: apiStatus.gmail?.success ? 'connected' : 'error',
      category: 'communication'
    },
    { 
      name: 'Slack', 
      icon: '💬', 
      description: 'Team communication', 
      status: apiStatus.slack?.success ? 'connected' : 'error',
      category: 'communication'
    },
    { 
      name: 'Calendar', 
      icon: '📅', 
      description: 'Schedule management', 
      status: apiStatus.calendar?.success ? 'connected' : 'error',
      category: 'productivity'
    },
    { 
      name: 'Fireflies', 
      icon: '🎙️', 
      description: 'Meeting transcripts', 
      status: apiStatus.fireflies?.success ? 'connected' : 'error',
      category: 'meetings'
    },
    { 
      name: 'Notion', 
      icon: '📝', 
      description: 'Task management', 
      status: apiStatus.notion?.success ? 'connected' : 'error',
      category: 'productivity'
    }
  ];

  const getStatusColor = (status) => {
    return status === 'connected' ? 'bg-green-500' : 'bg-red-500';
  };

  return (
    <div className="min-h-screen bg-gray-100">
      <div className="bg-white shadow p-4">
        <div className="flex justify-between items-center">
          <h1 className="text-3xl font-bold">🤖 AI Dashboard</h1>
          <div className="flex gap-4 items-center">
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
            <div className="lg:col-span-2 bg-white rounded-lg shadow p-6">
              <h2 className="text-xl font-bold mb-4">📋 Tasks ({tasks.length})</h2>
              {tasks.length === 0 ? (
                <div className="text-center py-8">
                  <p className="text-gray-500 mb-4">No tasks loaded.</p>
                </div>
              ) : (
                <div className="space-y-3">
                  {tasks.slice(0, 5).map(task => (
                    <div key={task.id} className="border rounded-lg p-4">
                      <h4 className="font-medium">{task.title}</h4>
                      <p className="text-sm text-gray-600">Status: {task.status || 'Unknown'}</p>
                    </div>
                  ))}
                </div>
              )}
            </div>

            <div className="bg-white rounded-lg shadow p-6">
              <h2 className="text-xl font-bold mb-4">📊 Integration Status</h2>
              <div className="space-y-3">
                {integrations.map(integration => (
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
            <div className="bg-white rounded-lg shadow p-6">
              <h2 className="text-2xl font-bold mb-4">🤖 AI Services</h2>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                {integrations.filter(i => i.category === 'ai').map(integration => (
                  <div key={integration.name} className="border rounded-lg p-6">
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
                      <div className={`w-3 h-3 rounded-full ${getStatusColor(integration.status)}`}></div>
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

      {/* AI Chatbox */}
      <AIChatbox socket={socket} apiStatus={apiStatus} />
    </div>
  );
};

export default App;
