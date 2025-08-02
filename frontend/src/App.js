import React, { useState, useEffect } from 'react';
import io from 'socket.io-client';
import { Send, MessageCircle } from 'lucide-react';
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
          message: userMessage.content,
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
    <div className="min-h-screen">
      {/* Header with DGenz logo */}
      <div className="header-glass p-4 sticky top-0 z-40">
        <div className="flex justify-between items-center">
          <div className="flex items-center gap-3">
            <div className="dgenz-logo">🍞</div>
            <h1 className="text-3xl font-bold text-glow">DGenz Hub</h1>
          </div>
          <div className="flex gap-4 items-center">
            {/* Dark Mode Toggle */}
            <button
              onClick={() => setDarkMode(!darkMode)}
              className="btn-glass p-2 rounded-lg"
            >
              {darkMode ? '☀️' : '🌙'}
            </button>
            
            {/* Connection Status */}
            <span className={`glass px-3 py-1 rounded-full ${isConnected ? 'text-green-400' : 'text-red-400'}`}>
              <div className={`inline-block w-2 h-2 rounded-full mr-2 ${isConnected ? 'status-connected' : 'status-disconnected'}`}></div>
              {isConnected ? 'Connected' : 'Disconnected'}
            </span>
            
            {/* Integration Status Button */}
            <button
              onClick={() => setShowIntegrations(!showIntegrations)}
              className="btn-glass px-3 py-2 rounded-lg flex items-center gap-2"
            >
              <span className="text-sm">
                🔗 {connectedCount}/{integrations.length}
              </span>
            </button>
            
            <button onClick={testAI} className="btn-glass px-4 py-2 rounded-lg">
              🧪 Test AI
            </button>
          </div>
        </div>
        
        <div className="flex gap-2 mt-4">
          {['dashboard', 'integrations'].map(tab => (
            <button
              key={tab}
              onClick={() => setActiveTab(tab)}
              className={`px-4 py-2 rounded-lg transition-all ${
                activeTab === tab 
                  ? 'bg-blue-500 bg-opacity-80 text-white' 
                  : 'btn-glass'
              }`}
            >
              {tab.charAt(0).toUpperCase() + tab.slice(1)}
            </button>
          ))}
        </div>
      </div>

      {/* Floating Integration Status */}
      {showIntegrations && (
        <div className="fixed top-20 right-4 z-50 w-80 animate-slide-in">
          <div className="integration-panel p-4">
            <div className="flex justify-between items-center mb-3">
              <h3 className="font-bold">Integration Status</h3>
              <button
                onClick={() => setShowIntegrations(false)}
                className="btn-glass text-sm px-2 py-1 rounded"
              >
                ✕
              </button>
            </div>
            <div className="space-y-2">
              {integrations.map(integration => (
                <div key={integration.name} className="flex items-center justify-between card-glass p-3">
                  <div className="flex items-center gap-2">
                    <span>{integration.icon}</span>
                    <span className="text-sm">{integration.name}</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <div className={`w-2 h-2 rounded-full ${
                      integration.status === 'connected' ? 'status-connected' : 'status-disconnected'
                    }`}></div>
                    <button
                      onClick={() => testIntegration(integration.name)}
                      className="text-xs px-2 py-1 btn-glass rounded"
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

      <div className="p-6 pb-32">
        {activeTab === 'dashboard' && (
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            {/* Left Column - Notion Tasks */}
            <div className="card-glass p-6 animate-fade-in">
              <div className="flex justify-between items-center mb-4">
                <h2 className="text-xl font-bold text-glow">📝 Notion Tasks ({notionTasks.length})</h2>
                <button
                  onClick={loadNotionTasks}
                  className="btn-glass text-sm px-3 py-1 rounded"
                >
                  🔄
                </button>
              </div>
              {notionTasks.length === 0 ? (
                <p className="opacity-70">
                  No Notion tasks found. Check your Notion integration.
                </p>
              ) : (
                <div className="space-y-3 max-h-96 overflow-y-auto">
                  {notionTasks.map(task => (
                    <div key={task.id} className="task-card">
                      <div className="flex justify-between items-start">
                        <div className="flex-1">
                          <h4 className="font-medium">{task.title || task.name}</h4>
                          <p className="text-sm opacity-70">
                            {task.status || 'No status'}
                          </p>
                          {task.priority && (
                            <span className={`inline-block mt-1 px-2 py-1 text-xs rounded priority-${
                              task.priority === 'High' ? 'high' :
                              task.priority === 'Medium' ? 'medium' : 'low'
                            }`}>
                              {task.priority}
                            </span>
                          )}
                        </div>
                        <button
                          onClick={() => completeTask(task.id)}
                          className="btn-glass px-2 py-1 text-sm rounded"
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
            <div className="card-glass p-6 animate-fade-in">
              <h2 className="text-xl font-bold mb-4 text-glow">🤖 AI Tasks ({tasks.length})</h2>
              {tasks.length === 0 ? (
                <p className="opacity-70">
                  No AI tasks yet. Click Test AI to generate some!
                </p>
              ) : (
                <div className="space-y-3 max-h-96 overflow-y-auto">
                  {tasks.map(task => (
                    <div key={task.id} className="task-card">
                      <div className="flex justify-between items-start">
                        <div className="flex-1">
                          <h4 className="font-medium">{task.title}</h4>
                          <span className="text-xs opacity-70">
                            {task.source}
                          </span>
                          {task.urgency && (
                            <span className={`ml-2 px-2 py-1 text-xs rounded priority-${
                              task.urgency >= 4 ? 'high' : 
                              task.urgency >= 3 ? 'medium' : 'low'
                            }`}>
                              Priority {task.urgency}
                            </span>
                          )}
                        </div>
                        <button
                          onClick={() => completeTask(task.id)}
                          className="btn-glass px-2 py-1 text-sm rounded"
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
            <div className="card-glass p-6 animate-fade-in">
              <div className="flex justify-between items-center mb-4">
                <h2 className="text-xl font-bold text-glow">📧 Gmail ({emails.length})</h2>
                <button
                  onClick={loadEmails}
                  className="btn-glass text-sm px-3 py-1 rounded"
                >
                  🔄
                </button>
              </div>
              {emails.length === 0 ? (
                <p className="opacity-70">
                  No emails found. Check your Gmail integration.
                </p>
              ) : (
                <div className="space-y-3 max-h-96 overflow-y-auto">
                  {emails.map(email => (
                    <div key={email.id} className="task-card">
                      <div className="flex justify-between items-start">
                        <div className="flex-1">
                          <h4 className="font-medium text-sm line-clamp-1">{email.subject}</h4>
                          <p className="text-xs opacity-70 line-clamp-1">
                            {email.from}
                          </p>
                          <p className="text-xs opacity-60 line-clamp-2 mt-1">
                            {email.snippet}
                          </p>
                        </div>
                        <button className="btn-glass px-2 py-1 text-xs rounded">
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
              <div key={integration.name} className="card-glass p-6">
                <div className="flex items-center gap-3 mb-4">
                  <span className="text-2xl">{integration.icon}</span>
                  <div>
                    <h3 className="font-bold">{integration.name}</h3>
                    <p className="text-sm opacity-70">
                      {integration.description}
                    </p>
                  </div>
                  <div className={`w-3 h-3 rounded-full ml-auto ${
                    integration.status === 'connected' ? 'status-connected' : 'status-disconnected'
                  }`}></div>
                </div>
                
                <div className={`text-sm mb-3 ${
                  integration.status === 'connected' ? 'text-green-400' : 'text-red-400'
                }`}>
                  {integration.status === 'connected' ? '✅ Connected' : '❌ Not Connected'}
                </div>
                
                <div className="space-y-2">
                  <button 
                    onClick={() => testIntegration(integration.name)}
                    className="w-full btn-glass py-2 px-4 rounded"
                  >
                    Test Connection
                  </button>
                  
                  {integration.name === 'Gmail' && (
                    <a 
                      href="http://localhost:3001/auth/google" 
                      target="_blank" 
                      rel="noopener noreferrer"
                      className="block w-full btn-glass py-2 px-4 rounded text-center"
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

      {/* Chat History Panel */}
      {showChat && chatMessages.length > 0 && (
        <div className="fixed bottom-28 left-1/2 transform -translate-x-1/2 w-96 max-w-[90vw] z-40">
          <div className="glass-strong rounded-2xl p-4 max-h-64 overflow-y-auto animate-slide-in">
            <div className="space-y-3">
              {chatMessages.map(message => (
                <div key={message.id} className={`flex ${message.type === 'user' ? 'justify-end' : 'justify-start'}`}>
                  <div className={`max-w-[80%] p-3 rounded-2xl ${
                    message.type === 'user' 
                      ? 'bg-blue-500 bg-opacity-80 text-white' 
                      : 'glass'
                  }`}>
                    <p className="text-sm">{message.content}</p>
                  </div>
                </div>
              ))}
              {isAITyping && (
                <div className="flex justify-start">
                  <div className="glass p-3 rounded-2xl">
                    <div className="flex space-x-1">
                      <div className="w-2 h-2 bg-blue-500 rounded-full animate-bounce"></div>
                      <div className="w-2 h-2 bg-blue-500 rounded-full animate-bounce" style={{animationDelay: '0.1s'}}></div>
                      <div className="w-2 h-2 bg-blue-500 rounded-full animate-bounce" style={{animationDelay: '0.2s'}}></div>
                    </div>
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Enhanced Glassy AI Chat Box */}
      <div className="ai-chat-container">
        <div className="ai-chat-box">
          {/* Chat toggle button */}
          {chatMessages.length > 0 && (
            <button
              onClick={() => setShowChat(!showChat)}
              className="btn-glass p-2 rounded-full"
            >
              <MessageCircle size={16} />
            </button>
          )}
          
          {/* Chat input */}
          <input
            type="text"
            value={chatInput}
            onChange={(e) => setChatInput(e.target.value)}
            onKeyPress={(e) => e.key === 'Enter' && sendChatMessage()}
            placeholder="Ask AI anything about your tasks, emails, or productivity..."
            className="ai-chat-input"
            disabled={isAITyping}
          />
          
          {/* Send button - always visible and ready */}
          <button
            onClick={sendChatMessage}
            disabled={isAITyping || !chatInput.trim()}
            className={`ai-send-button ${isAITyping ? 'opacity-50' : ''} ${chatInput.trim() ? 'animate-pulse-glow' : ''}`}
          >
            {isAITyping ? (
              <div className="loading-spinner border-white"></div>
            ) : (
              <Send size={20} />
            )}
          </button>
        </div>
      </div>
    </div>
  );
};

export default App;
