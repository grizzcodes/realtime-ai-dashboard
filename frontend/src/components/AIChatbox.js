import React, { useState, useRef, useEffect } from 'react';
import { Send, Bot, User, Sparkles, RefreshCw, Database, Users } from 'lucide-react';

export default function AIChatbox() {
  const [messages, setMessages] = useState([
    { 
      role: 'assistant', 
      content: 'Hello! I\'m your AI assistant with access to the DGenz company database. I can help you with information about people, clients, leads, projects, and more. What would you like to know?' 
    }
  ]);
  const [input, setInput] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [contextEnabled, setContextEnabled] = useState(true);
  const [companyStats, setCompanyStats] = useState(null);
  const messagesEndRef = useRef(null);

  useEffect(() => {
    scrollToBottom();
    loadCompanyStats();
  }, [messages]);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  const loadCompanyStats = async () => {
    try {
      const response = await fetch('http://localhost:3001/api/ai/company-context');
      const data = await response.json();
      
      if (data.success && data.context) {
        setCompanyStats({
          people: data.context.people.total,
          clients: data.context.clients.total,
          leads: data.context.leads.total,
          projects: data.context.projects.total
        });
      }
    } catch (error) {
      console.error('Failed to load company stats:', error);
    }
  };

  const handleSend = async () => {
    if (!input.trim() || isLoading) return;

    const userMessage = { role: 'user', content: input };
    setMessages(prev => [...prev, userMessage]);
    setInput('');
    setIsLoading(true);

    try {
      // Use enhanced endpoint with context
      const response = await fetch('http://localhost:3001/api/ai/chat-enhanced', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          message: input,
          model: 'gpt-4',
          includeContext: contextEnabled
        })
      });

      const data = await response.json();

      if (data.success) {
        setMessages(prev => [...prev, {
          role: 'assistant',
          content: data.response,
          contextIncluded: data.contextIncluded
        }]);
      } else {
        // Fallback to standard endpoint if enhanced fails
        const fallbackResponse = await fetch('http://localhost:3001/api/ai/chat', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json'
          },
          body: JSON.stringify({
            message: input,
            model: 'gpt-4'
          })
        });

        const fallbackData = await fallbackResponse.json();
        
        if (fallbackData.success) {
          setMessages(prev => [...prev, {
            role: 'assistant',
            content: fallbackData.response
          }]);
        } else {
          setMessages(prev => [...prev, {
            role: 'assistant',
            content: 'I apologize, but I\'m having trouble connecting right now. Please try again later.'
          }]);
        }
      }
    } catch (error) {
      console.error('Chat error:', error);
      setMessages(prev => [...prev, {
        role: 'assistant',
        content: 'I encountered an error. Please check your connection and try again.'
      }]);
    } finally {
      setIsLoading(false);
    }
  };

  const handleKeyPress = (e) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  };

  const refreshContext = async () => {
    try {
      const response = await fetch('http://localhost:3001/api/ai/refresh-context', {
        method: 'POST'
      });
      const data = await response.json();
      
      if (data.success) {
        setCompanyStats(data.stats);
        setMessages(prev => [...prev, {
          role: 'assistant',
          content: `✅ Context refreshed! I now have updated information about ${data.stats.people} people, ${data.stats.clients} clients, ${data.stats.leads} leads, and ${data.stats.projects} projects.`
        }]);
      }
    } catch (error) {
      console.error('Failed to refresh context:', error);
    }
  };

  return (
    <div className="card-glass h-full flex flex-col">
      {/* Header with context status */}
      <div className="p-4 border-b border-gray-700">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Bot className="text-blue-400" size={20} />
            <h3 className="font-bold">AI Assistant</h3>
            <Sparkles className="text-yellow-400" size={16} />
          </div>
          <div className="flex items-center gap-2">
            {/* Context toggle */}
            <button
              onClick={() => setContextEnabled(!contextEnabled)}
              className={`px-3 py-1 rounded-lg text-xs flex items-center gap-1 transition-all ${
                contextEnabled 
                  ? 'bg-green-500 bg-opacity-20 text-green-400' 
                  : 'bg-gray-500 bg-opacity-20 text-gray-400'
              }`}
              title="Toggle company database context"
            >
              <Database size={12} />
              {contextEnabled ? 'Context ON' : 'Context OFF'}
            </button>
            
            {/* Refresh context */}
            <button
              onClick={refreshContext}
              className="p-1 hover:bg-white hover:bg-opacity-10 rounded"
              title="Refresh company data"
            >
              <RefreshCw size={16} />
            </button>
          </div>
        </div>
        
        {/* Company stats bar */}
        {companyStats && contextEnabled && (
          <div className="mt-2 flex gap-3 text-xs opacity-60">
            <span className="flex items-center gap-1">
              <Users size={10} />
              {companyStats.people} people
            </span>
            <span>•</span>
            <span>{companyStats.clients} clients</span>
            <span>•</span>
            <span>{companyStats.leads} leads</span>
            <span>•</span>
            <span>{companyStats.projects} projects</span>
          </div>
        )}
      </div>

      {/* Messages */}
      <div className="flex-1 overflow-y-auto p-4 space-y-4">
        {messages.map((message, index) => (
          <div
            key={index}
            className={`flex ${message.role === 'user' ? 'justify-end' : 'justify-start'}`}
          >
            <div
              className={`max-w-[80%] p-3 rounded-lg ${
                message.role === 'user'
                  ? 'bg-blue-600 bg-opacity-20 text-blue-100'
                  : 'bg-gray-700 bg-opacity-50'
              }`}
            >
              <div className="flex items-start gap-2">
                {message.role === 'assistant' ? (
                  <Bot size={16} className="text-blue-400 mt-1" />
                ) : (
                  <User size={16} className="text-blue-400 mt-1" />
                )}
                <div className="flex-1">
                  <p className="text-sm whitespace-pre-wrap">{message.content}</p>
                  {message.contextIncluded && (
                    <p className="text-xs opacity-50 mt-1">
                      <Database size={10} className="inline mr-1" />
                      Used company context
                    </p>
                  )}
                </div>
              </div>
            </div>
          </div>
        ))}
        {isLoading && (
          <div className="flex justify-start">
            <div className="bg-gray-700 bg-opacity-50 p-3 rounded-lg">
              <div className="flex items-center gap-2">
                <Bot size={16} className="text-blue-400" />
                <div className="flex gap-1">
                  <div className="w-2 h-2 bg-blue-400 rounded-full animate-bounce" />
                  <div className="w-2 h-2 bg-blue-400 rounded-full animate-bounce delay-100" />
                  <div className="w-2 h-2 bg-blue-400 rounded-full animate-bounce delay-200" />
                </div>
              </div>
            </div>
          </div>
        )}
        <div ref={messagesEndRef} />
      </div>

      {/* Input */}
      <div className="p-4 border-t border-gray-700">
        <div className="flex gap-2">
          <input
            type="text"
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyPress={handleKeyPress}
            placeholder={contextEnabled 
              ? "Ask about people, clients, projects..." 
              : "Ask me anything..."
            }
            className="flex-1 px-3 py-2 bg-gray-800 bg-opacity-50 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 text-sm"
            disabled={isLoading}
          />
          <button
            onClick={handleSend}
            disabled={isLoading || !input.trim()}
            className="px-4 py-2 bg-blue-600 rounded-lg hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed transition-all"
          >
            <Send size={16} />
          </button>
        </div>
        
        {/* Example queries */}
        <div className="mt-2 flex flex-wrap gap-2">
          <span className="text-xs opacity-50">Try:</span>
          <button
            onClick={() => setInput("Who are the people in the company?")}
            className="text-xs px-2 py-1 bg-gray-700 bg-opacity-50 rounded hover:bg-opacity-70"
          >
            List people
          </button>
          <button
            onClick={() => setInput("What are our active projects?")}
            className="text-xs px-2 py-1 bg-gray-700 bg-opacity-50 rounded hover:bg-opacity-70"
          >
            Active projects
          </button>
          <button
            onClick={() => setInput("Show me our hot leads")}
            className="text-xs px-2 py-1 bg-gray-700 bg-opacity-50 rounded hover:bg-opacity-70"
          >
            Hot leads
          </button>
        </div>
      </div>
    </div>
  );
}