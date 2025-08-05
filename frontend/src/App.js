import React, { useState, useEffect } from 'react';
import './App.css';
import SupaDashboard from './components/SupaDashboard';
import FloatingChatbox from './components/FloatingChatbox';
import IntegrationStatusBar from './components/IntegrationStatusBar';
import MagicInbox from './components/MagicInbox';
import { MessageCircle, Send, Settings } from 'lucide-react';

const App = () => {
  const [showDashboard, setShowDashboard] = useState(true);
  const [showIntegrations, setShowIntegrations] = useState(false);
  const [showChat, setShowChat] = useState(false);
  const [chatMessages, setChatMessages] = useState([]);
  const [chatInput, setChatInput] = useState('');
  const [isAITyping, setIsAITyping] = useState(false);
  
  // API Status for IntegrationStatusBar
  const [apiStatus, setApiStatus] = useState({
    openai: { success: true },
    claude: { success: true },
    notion: { success: true },
    gmail: { success: true },
    slack: { success: false },
    calendar: { success: false },
    fireflies: { success: false },
    supabase: { success: true },
    linear: { success: false },
    github: { success: true },
    runway: { success: false }
  });
  
  const [integrations, setIntegrations] = useState([
    { name: 'Gmail', status: 'connected', icon: '📧' },
    { name: 'Notion', status: 'connected', icon: '📝' },
    { name: 'Slack', status: 'disconnected', icon: '💬' },
    { name: 'Fireflies', status: 'disconnected', icon: '🔥' },
    { name: 'OpenAI', status: 'connected', icon: '🤖' },
    { name: 'Claude', status: 'connected', icon: '🧠' }
  ]);

  const refreshApiStatus = async () => {
    // Add logic to refresh API status from backend
    console.log('Refreshing API status...');
    // You can add actual API calls here to check status
  };

  const testIntegration = async (name) => {
    console.log(`Testing ${name} integration...`);
    // Add integration test logic here
  };

  const sendChatMessage = async () => {
    if (!chatInput.trim()) return;
    
    const userMessage = {
      id: Date.now(),
      type: 'user',
      content: chatInput
    };
    
    setChatMessages(prev => [...prev, userMessage]);
    setChatInput('');
    setIsAITyping(true);
    
    try {
      const response = await fetch('http://localhost:3001/api/ai/chat', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ message: chatInput })
      });
      
      const data = await response.json();
      
      const aiMessage = {
        id: Date.now() + 1,
        type: 'assistant',
        content: data.message || 'I understand your request. Let me help you with that.'
      };
      
      setChatMessages(prev => [...prev, aiMessage]);
    } catch (error) {
      console.error('Error sending message:', error);
      const errorMessage = {
        id: Date.now() + 1,
        type: 'assistant',
        content: 'Sorry, I encountered an error. Please try again.'
      };
      setChatMessages(prev => [...prev, errorMessage]);
    } finally {
      setIsAITyping(false);
    }
  };

  return (
    <div className="App min-h-screen bg-gradient-to-br from-gray-900 via-blue-900 to-purple-900">
      {/* Header */}
      <header className="p-4 glass border-b border-white border-opacity-10">
        <div className="max-w-7xl mx-auto flex justify-between items-center">
          <h1 className="text-2xl font-bold text-glow">AI Hub Dashboard</h1>
          <button 
            onClick={() => setShowIntegrations(!showIntegrations)}
            className="btn-glass p-2 rounded-lg"
          >
            <Settings size={20} />
          </button>
        </div>
      </header>

      {/* Integration Status Bar - Fixed props */}
      <IntegrationStatusBar apiStatus={apiStatus} onRefresh={refreshApiStatus} />

      {/* Main Content */}
      <main className="p-4">
        {showDashboard && <SupaDashboard />}
        <MagicInbox />
      </main>

      {/* Floating Chat */}
      <FloatingChatbox />

      {/* Integrations Panel */}
      <div className={`fixed top-0 right-0 h-full w-80 glass transform transition-transform ${
        showIntegrations ? 'translate-x-0' : 'translate-x-full'
      } z-50`}>
        <div className="p-6">
          <div className="flex justify-between items-center mb-6">
            <h2 className="text-xl font-bold">Integrations</h2>
            <button 
              onClick={() => setShowIntegrations(false)}
              className="btn-glass p-2 rounded-lg"
            >
              ✕
            </button>
          </div>
          
          <div className="space-y-4">
            {integrations.map((integration) => (
              <div key={integration.name} className="card-glass p-4">
                <div className="flex items-center gap-3 mb-2">
                  <span className="text-2xl">{integration.icon}</span>
                  <h3 className="font-semibold">{integration.name}</h3>
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
        </div>
      </div>

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

      <div className="ai-chat-container">
        <div className="ai-chat-box">
          {chatMessages.length > 0 && (
            <button
              onClick={() => setShowChat(!showChat)}
              className="btn-glass p-2 rounded-full"
            >
              <MessageCircle size={16} />
            </button>
          )}
          
          <input
            type="text"
            value={chatInput}
            onChange={(e) => setChatInput(e.target.value)}
            onKeyPress={(e) => e.key === 'Enter' && sendChatMessage()}
            placeholder="Ask AI to manage tasks, analyze meetings, or help with productivity..."
            className="ai-chat-input"
            disabled={isAITyping}
          />
          
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