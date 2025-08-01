import React, { useState, useEffect } from 'react';
import io from 'socket.io-client';
import './App.css';

const App = () => {
  const [tasks, setTasks] = useState([]);
  const [notionTasks, setNotionTasks] = useState([]);
  const [emails, setEmails] = useState([]);
  const [events, setEvents] = useState([]);
  const [isConnected, setIsConnected] = useState(false);
  const [activeTab, setActiveTab] = useState('dashboard');
  const [apiStatus, setApiStatus] = useState({});
  const [showIntegrations, setShowIntegrations] = useState(false);
  const [darkMode, setDarkMode] = useState(false);
  const [chatMessages, setChatMessages] = useState([]);
  const [chatInput, setChatInput] = useState('');
  const [isAITyping, setIsAITyping] = useState(false);
  const [showChat, setShowChat] = useState(false);

  useEffect(() => {
    const socket = io('http://localhost:3001');
    socket.on('connect', () => setIsConnected(true));
    socket.on('disconnect', () => setIsConnected(false));
    
    // Listen for real-time updates
    socket.on('taskUpdate', (data) => {
      console.log('Task update received:', data);
      loadTasks();
      loadNotionTasks();
    });

    socket.on('emailUpdate', (data) => {
      console.log('Email update received:', data);
      loadEmails();
    });
    
    // Load initial data
    loadTasks();
    loadNotionTasks();
    loadEmails();
    loadApiStatus();
    
    // Check for saved dark mode preference
    const savedDarkMode = localStorage.getItem('darkMode') === 'true';
    setDarkMode(savedDarkMode);
    
    return () => socket.close();
  }, []);

  // Apply dark mode to document
  useEffect(() => {
    if (darkMode) {
      document.documentElement.classList.add('dark');
    } else {
      document.documentElement.classList.remove('dark');
    }
    localStorage.setItem('darkMode', darkMode);
  }, [darkMode]);

  const loadTasks = async () => {
    try {
      const response = await fetch('http://localhost:3001/api/tasks');
      const data = await response.json();
      setTasks(data.tasks || []);
    } catch (error) {
      console.error('Failed to load tasks:', error);
    }
  };

  const loadNotionTasks = async () => {
    try {
      const response = await fetch('http://localhost:3001/api/notion/tasks');
      const data = await response.json();
      setNotionTasks(data.tasks || []);
    } catch (error) {
      console.error('Failed to load Notion tasks:', error);
    }
  };

  const loadEmails = async () => {
    try {
      const response = await fetch('http://localhost:3001/api/gmail/latest?limit=10');
      const data = await response.json();
      setEmails(data.emails || []);
    } catch (error) {
      console.error('Failed to load emails:', error);
    }
  };

  const loadApiStatus = async () => {
    try {
      const response = await fetch('http://localhost:3001/api/integrations/status');
      const data = await response.json();
      setApiStatus(data.integrations || {});
    } catch (error) {
      console.error('Failed to load API status:', error);
    }
  };

  const sendChatMessage = async () => {
    if (!chatInput.trim()) return;

    const userMessage = {
      id: Date.now(),
      type: 'user',
      content: chatInput,
      timestamp: new Date()
    };

    setChatMessages(prev => [...prev, userMessage]);
    setChatInput('');
    setIsAITyping(true);

    try {
      const response = await fetch('http://localhost:3001/api/ai/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ 
          message: chatInput,
          context: {
            tasks: notionTasks.slice(0, 5),
            emails: emails.slice(0, 3)
          }
        })
      });
      
      const result = await response.json();
      
      const aiMessage = {
        id: Date.now() + 1,
        type: 'ai',
        content: result.response || 'Sorry, I encountered an error.',
        timestamp: new Date()
      };

      setChatMessages(prev => [...prev, aiMessage]);
    } catch (error) {
      console.error('AI chat failed:', error);
      const errorMessage = {
        id: Date.now() + 1,
        type: 'ai',
        content: 'Sorry, I\'m having trouble connecting right now.',
        timestamp: new Date()
      };
      setChatMessages(prev => [...prev, errorMessage]);
    } finally {
      setIsAITyping(false);
    }
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
      loadTasks();
      loadNotionTasks();
    } catch (error) {
      console.error('AI test failed:', error);
    }
  };

  const completeTask = async (taskId) => {
    try {
      const response = await fetch(`http://localhost:3001/api/tasks/${taskId}/complete`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' }
      });
      const result = await response.json();
      if (result.success) {
        loadTasks();
        loadNotionTasks();
      }
    } catch (error) {
      console.error('Failed to complete task:', error);
    }
  };

  const archiveEmail = async (emailId) => {
    try {
      const response = await fetch(`http://localhost:3001/api/gmail/archive/${emailId}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' }
      });
      const result = await response.json();
      if (result.success) {
        loadEmails();
      }
    } catch (error) {
      console.error('Failed to archive email:', error);
    }
  };

  const testIntegration = async (name) => {
    try {
      const response = await fetch(`http://localhost:3001/api/test/${name.toLowerCase()}`);
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

  const integrations = [
    { name: 'Notion', icon: '📝', description: 'Task management', status: apiStatus.notion?.success ? 'connected' : 'error' },
    { name: 'Gmail', icon: '📧', description: 'Email monitoring', status: apiStatus.gmail?.success ? 'connected' : 'error' },
    { name: 'Slack', icon: '💬', description: 'Team communication', status: apiStatus.slack?.success ? 'connected' : 'error' },
    { name: 'Fireflies', icon: '🎙️', description: 'Meeting transcripts', status: apiStatus.fireflies?.success ? 'connected' : 'error' },
    { name: 'Calendar', icon: '📅', description: 'Schedule management', status: apiStatus.calendar?.success ? 'connected' : 'error' },
    { name: 'Supabase', icon: '🗄️', description: 'Database', status: apiStatus.supabase?.success ? 'connected' : 'error' },
    { name: 'OpenAI', icon: '🤖', description: 'AI Processing', status: apiStatus.openai?.success ? 'connected' : 'error' }
  ];

  const connectedCount = integrations.filter(i => i.status === 'connected').length;

  return (
    <div className={`min-h-screen transition-colors duration-300 ${
      darkMode ? 'bg-gray-900 text-white' : 'bg-gray-100 text-gray-900'
    }`}>
      {/* Header */}
      <div className={`shadow p-4 transition-colors duration-300 ${
        darkMode ? 'bg-gray-800' : 'bg-white'
      }`}>
        <div className="flex justify-between items-center">
          <h1 className="text-3xl font-bold">🤖 Ultimate AI Organizer</h1>
          <div className="flex gap-4 items-center">
            {/* Dark Mode Toggle */}
            <button
              onClick={() => setDarkMode(!darkMode)}
              className={`p-2 rounded-lg transition-colors ${
                darkMode ? 'bg-gray-700 hover:bg-gray-600' : 'bg-gray-200 hover:bg-gray-300'
              }`}
            >
              {darkMode ? '☀️' : '🌙'}
            </button>
            
            {/* Connection Status */}
            <span className={isConnected ? 'text-green-600' : 'text-red-600'}>
              {isConnected ? '🔗 Connected' : '❌ Disconnected'}
            </span>
            
            {/* Integration Status Button */}
            <button
              onClick={() => setShowIntegrations(!showIntegrations)}
              className={`px-3 py-2 rounded-lg flex items-center gap-2 transition-colors ${
                darkMode ? 'bg-gray-700 hover:bg-gray-600' : 'bg-gray-200 hover:bg-gray-300'
              }`}
            >
              <span className="text-sm">
                🔗 {connectedCount}/{integrations.length}
              </span>
            </button>
            
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
              className={`px-4 py-2 rounded transition-colors ${
                activeTab === tab 
                  ? 'bg-blue-500 text-white' 
                  : darkMode 
                    ? 'bg-gray-700 hover:bg-gray-600' 
                    : 'bg-gray-200 hover:bg-gray-300'
              }`}
            >
              {tab.charAt(0).toUpperCase() + tab.slice(1)}
            </button>
          ))}
        </div>
      </div>

      {/* Floating Integration Status */}
      {showIntegrations && (
        <div className="fixed top-20 right-4 z-50 w-80">
          <div className={`rounded-lg shadow-lg p-4 transition-colors ${
            darkMode ? 'bg-gray-800 border border-gray-700' : 'bg-white border border-gray-200'
          }`}>
            <div className="flex justify-between items-center mb-3">
              <h3 className="font-bold">Integration Status</h3>
              <button
                onClick={() => setShowIntegrations(false)}
                className={`text-sm px-2 py-1 rounded ${
                  darkMode ? 'hover:bg-gray-700' : 'hover:bg-gray-100'
                }`}
              >
                ✕
              </button>
            </div>
            <div className="space-y-2">
              {integrations.map(integration => (
                <div key={integration.name} className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <span>{integration.icon}</span>
                    <span className="text-sm">{integration.name}</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <div className={`w-2 h-2 rounded-full ${
                      integration.status === 'connected' ? 'bg-green-500' : 'bg-red-500'
                    }`}></div>
                    <button
                      onClick={() => testIntegration(integration.name)}
                      className="text-xs px-2 py-1 bg-blue-500 text-white rounded hover:bg-blue-600"
                    >
                      Test
                    </button>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      <div className="p-6">
        {activeTab === 'dashboard' && (
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            {/* Left Column - Notion Tasks */}
            <div className={`rounded-lg shadow p-6 transition-colors ${
              darkMode ? 'bg-gray-800' : 'bg-white'
            }`}>
              <div className="flex justify-between items-center mb-4">
                <h2 className="text-xl font-bold">📝 Notion Tasks ({notionTasks.length})</h2>
                <button
                  onClick={loadNotionTasks}
                  className={`text-sm px-3 py-1 rounded transition-colors ${
                    darkMode ? 'bg-gray-700 hover:bg-gray-600' : 'bg-gray-200 hover:bg-gray-300'
                  }`}
                >
                  🔄
                </button>
              </div>
              {notionTasks.length === 0 ? (
                <p className={darkMode ? 'text-gray-400' : 'text-gray-500'}>
                  No Notion tasks found. Check your Notion integration.
                </p>
              ) : (
                <div className="space-y-3 max-h-96 overflow-y-auto">
                  {notionTasks.map(task => (
                    <div key={task.id} className={`border rounded p-3 transition-colors ${
                      darkMode ? 'border-gray-700 bg-gray-700' : 'border-gray-200 bg-gray-50'
                    }`}>
                      <div className="flex justify-between items-start">
                        <div className="flex-1">
                          <h4 className="font-medium">{task.title || task.name}</h4>
                          <p className={`text-sm ${darkMode ? 'text-gray-400' : 'text-gray-600'}`}>
                            {task.status || 'No status'}
                          </p>
                          {task.priority && (
                            <span className={`inline-block mt-1 px-2 py-1 text-xs rounded ${
                              task.priority === 'High' ? 'bg-red-100 text-red-800' :
                              task.priority === 'Medium' ? 'bg-yellow-100 text-yellow-800' :
                              'bg-green-100 text-green-800'
                            }`}>
                              {task.priority}
                            </span>
                          )}
                        </div>
                        <button
                          onClick={() => completeTask(task.id)}
                          className="bg-green-500 text-white px-2 py-1 rounded text-sm hover:bg-green-600"
                        >
                          ✓
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* Middle Column - AI Tasks */}
            <div className={`rounded-lg shadow p-6 transition-colors ${
              darkMode ? 'bg-gray-800' : 'bg-white'
            }`}>
              <h2 className="text-xl font-bold mb-4">🤖 AI Tasks ({tasks.length})</h2>
              {tasks.length === 0 ? (
                <p className={darkMode ? 'text-gray-400' : 'text-gray-500'}>
                  No AI tasks yet. Click Test AI to generate some!
                </p>
              ) : (
                <div className="space-y-3 max-h-96 overflow-y-auto">
                  {tasks.map(task => (
                    <div key={task.id} className={`border rounded p-3 transition-colors ${
                      darkMode ? 'border-gray-700 bg-gray-700' : 'border-gray-200 bg-gray-50'
                    }`}>
                      <div className="flex justify-between items-start">
                        <div className="flex-1">
                          <h4 className="font-medium">{task.title}</h4>
                          <span className={`text-xs ${darkMode ? 'text-gray-400' : 'text-gray-500'}`}>
                            {task.source}
                          </span>
                          {task.urgency && (
                            <span className={`ml-2 px-2 py-1 text-xs rounded ${
                              task.urgency >= 4 ? 'bg-red-100 text-red-800' : 
                              task.urgency >= 3 ? 'bg-yellow-100 text-yellow-800' : 
                              'bg-green-100 text-green-800'
                            }`}>
                              Priority {task.urgency}
                            </span>
                          )}
                        </div>
                        <button
                          onClick={() => completeTask(task.id)}
                          className="bg-green-500 text-white px-2 py-1 rounded text-sm hover:bg-green-600"
                        >
                          ✓
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* Right Column - Emails */}
            <div className={`rounded-lg shadow p-6 transition-colors ${
              darkMode ? 'bg-gray-800' : 'bg-white'
            }`}>
              <div className="flex justify-between items-center mb-4">
                <h2 className="text-xl font-bold">📧 Gmail ({emails.length})</h2>
                <button
                  onClick={loadEmails}
                  className={`text-sm px-3 py-1 rounded transition-colors ${
                    darkMode ? 'bg-gray-700 hover:bg-gray-600' : 'bg-gray-200 hover:bg-gray-300'
                  }`}
                >
                  🔄
                </button>
              </div>
              {emails.length === 0 ? (
                <p className={darkMode ? 'text-gray-400' : 'text-gray-500'}>
                  No emails found. Check your Gmail integration.
                </p>
              ) : (
                <div className="space-y-3 max-h-96 overflow-y-auto">
                  {emails.map(email => (
                    <div key={email.id} className={`border rounded p-3 transition-colors ${
                      darkMode ? 'border-gray-700 bg-gray-700' : 'border-gray-200 bg-gray-50'
                    }`}>
                      <div className="flex justify-between items-start">
                        <div className="flex-1">
                          <h4 className="font-medium text-sm line-clamp-1">{email.subject}</h4>
                          <p className={`text-xs ${darkMode ? 'text-gray-400' : 'text-gray-600'} line-clamp-1`}>
                            {email.from}
                          </p>
                          <p className={`text-xs ${darkMode ? 'text-gray-500' : 'text-gray-500'} line-clamp-2 mt-1`}>
                            {email.snippet}
                          </p>
                        </div>
                        <button
                          onClick={() => archiveEmail(email.id)}
                          className={`ml-2 px-2 py-1 rounded text-xs transition-colors ${
                            darkMode ? 'bg-gray-600 hover:bg-gray-500' : 'bg-gray-500 hover:bg-gray-600'
                          } text-white`}
                        >
                          📁
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        )}

        {activeTab === 'integrations' && (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {integrations.map(integration => (
              <div key={integration.name} className={`rounded-lg shadow p-6 transition-colors ${
                darkMode ? 'bg-gray-800' : 'bg-white'
              }`}>
                <div className="flex items-center gap-3 mb-4">
                  <span className="text-2xl">{integration.icon}</span>
                  <div>
                    <h3 className="font-bold">{integration.name}</h3>
                    <p className={`text-sm ${darkMode ? 'text-gray-400' : 'text-gray-600'}`}>
                      {integration.description}
                    </p>
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
        )}
      </div>

      {/* AI Chat Box */}
      <div className="fixed bottom-4 left-1/2 transform -translate-x-1/2 w-96 z-40">
        {!showChat ? (
          <button
            onClick={() => setShowChat(true)}
            className={`w-full py-3 px-4 rounded-lg shadow-lg transition-all hover:scale-105 ${
              darkMode ? 'bg-blue-600 hover:bg-blue-700' : 'bg-blue-500 hover:bg-blue-600'
            } text-white font-medium`}
          >
            🤖 Ask AI Assistant
          </button>
        ) : (
          <div className={`rounded-lg shadow-xl transition-colors ${
            darkMode ? 'bg-gray-800 border border-gray-700' : 'bg-white border border-gray-200'
          }`}>
            {/* Chat Header */}
            <div className={`p-3 border-b flex justify-between items-center ${
              darkMode ? 'border-gray-700' : 'border-gray-200'
            }`}>
              <h3 className="font-medium">🤖 AI Assistant</h3>
              <button
                onClick={() => setShowChat(false)}
                className={`text-sm px-2 py-1 rounded ${
                  darkMode ? 'hover:bg-gray-700' : 'hover:bg-gray-100'
                }`}
              >
                ✕
              </button>
            </div>

            {/* Chat Messages */}
            <div className="h-64 overflow-y-auto p-3 space-y-3">
              {chatMessages.length === 0 && (
                <div className={`text-center text-sm ${darkMode ? 'text-gray-400' : 'text-gray-500'}`}>
                  Ask me anything about your tasks, emails, or productivity!
                </div>
              )}
              {chatMessages.map(message => (
                <div key={message.id} className={`flex ${message.type === 'user' ? 'justify-end' : 'justify-start'}`}>
                  <div className={`max-w-xs px-3 py-2 rounded-lg text-sm ${
                    message.type === 'user' 
                      ? 'bg-blue-500 text-white' 
                      : darkMode 
                        ? 'bg-gray-700 text-gray-100' 
                        : 'bg-gray-100 text-gray-900'
                  }`}>
                    {message.content}
                  </div>
                </div>
              ))}
              {isAITyping && (
                <div className="flex justify-start">
                  <div className={`px-3 py-2 rounded-lg text-sm ${
                    darkMode ? 'bg-gray-700 text-gray-100' : 'bg-gray-100 text-gray-900'
                  }`}>
                    <div className="flex space-x-1">
                      <div className="w-2 h-2 bg-blue-500 rounded-full animate-bounce"></div>
                      <div className="w-2 h-2 bg-blue-500 rounded-full animate-bounce" style={{animationDelay: '0.1s'}}></div>
                      <div className="w-2 h-2 bg-blue-500 rounded-full animate-bounce" style={{animationDelay: '0.2s'}}></div>
                    </div>
                  </div>
                </div>
              )}
            </div>

            {/* Chat Input */}
            <div className={`p-3 border-t ${darkMode ? 'border-gray-700' : 'border-gray-200'}`}>
              <div className="flex gap-2">
                <input
                  type="text"
                  value={chatInput}
                  onChange={(e) => setChatInput(e.target.value)}
                  onKeyPress={(e) => e.key === 'Enter' && sendChatMessage()}
                  placeholder="Type your message..."
                  className={`flex-1 px-3 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 transition-colors ${
                    darkMode 
                      ? 'bg-gray-700 border-gray-600 text-white placeholder-gray-400' 
                      : 'bg-white border-gray-300 text-gray-900 placeholder-gray-500'
                  }`}
                />
                <button
                  onClick={sendChatMessage}
                  disabled={!chatInput.trim() || isAITyping}
                  className="bg-blue-500 text-white px-4 py-2 rounded-lg hover:bg-blue-600 disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  ➤
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default App;
