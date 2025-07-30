import React, { useState, useRef, useEffect } from 'react';

const FloatingChatbox = ({ isAdmin = false }) => {
  const [isOpen, setIsOpen] = useState(false);
  const [isMinimized, setIsMinimized] = useState(false);
  const [messages, setMessages] = useState([
    {
      role: 'assistant',
      content: 'Hello! I\'m your AI platform overseer. I can help you manage tasks, analyze data, and even modify the webapp in real-time if you have admin access. How can I assist you?',
      timestamp: new Date()
    }
  ]);
  const [inputValue, setInputValue] = useState('');
  const [selectedModel, setSelectedModel] = useState('gpt4');
  const [isLoading, setIsLoading] = useState(false);
  const messagesEndRef = useRef(null);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  const sendMessage = async () => {
    if (!inputValue.trim()) return;

    const userMessage = {
      role: 'user',
      content: inputValue,
      timestamp: new Date()
    };

    setMessages(prev => [...prev, userMessage]);
    setInputValue('');
    setIsLoading(true);

    try {
      const response = await fetch('http://localhost:3001/api/ai-chat', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          message: inputValue,
          model: selectedModel,
          isAdmin: isAdmin,
          conversationHistory: messages
        })
      });

      const data = await response.json();
      
      if (data.success) {
        const assistantMessage = {
          role: 'assistant',
          content: data.response,
          timestamp: new Date(),
          actions: data.actions || [] // Any platform actions performed
        };
        
        setMessages(prev => [...prev, assistantMessage]);
        
        // If admin actions were performed, refresh the page
        if (data.actions && data.actions.length > 0) {
          setTimeout(() => {
            window.location.reload();
          }, 2000);
        }
      } else {
        throw new Error(data.error);
      }
    } catch (error) {
      const errorMessage = {
        role: 'assistant',
        content: `Sorry, I encountered an error: ${error.message}`,
        timestamp: new Date()
      };
      setMessages(prev => [...prev, errorMessage]);
    } finally {
      setIsLoading(false);
    }
  };

  const handleKeyPress = (e) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      sendMessage();
    }
  };

  if (!isOpen) {
    return (
      <div className="fixed bottom-6 right-6 z-50">
        <button
          onClick={() => setIsOpen(true)}
          className="bg-blue-600 hover:bg-blue-700 text-white rounded-full p-4 shadow-lg transition-all duration-300 hover:scale-110"
        >
          <div className="flex items-center gap-2">
            <span className="text-xl">🤖</span>
            <span className="hidden sm:block font-medium">AI Assistant</span>
          </div>
        </button>
      </div>
    );
  }

  return (
    <div className={`fixed bottom-6 right-6 z-50 bg-white rounded-lg shadow-2xl border transition-all duration-300 ${
      isMinimized ? 'h-16 w-80' : 'h-96 w-80'
    }`}>
      {/* Header */}
      <div className="flex items-center justify-between p-4 border-b bg-blue-600 text-white rounded-t-lg">
        <div className="flex items-center gap-2">
          <span className="text-lg">🤖</span>
          <div>
            <div className="font-medium">AI Platform Overseer</div>
            {isAdmin && (
              <div className="text-xs text-blue-200">Admin Mode Active</div>
            )}
          </div>
        </div>
        <div className="flex items-center gap-2">
          <select
            value={selectedModel}
            onChange={(e) => setSelectedModel(e.target.value)}
            className="text-black text-xs px-2 py-1 rounded"
          >
            <option value="gpt4">GPT-4</option>
            <option value="claude">Claude</option>
          </select>
          <button
            onClick={() => setIsMinimized(!isMinimized)}
            className="text-white hover:text-gray-200"
          >
            {isMinimized ? '🔼' : '🔽'}
          </button>
          <button
            onClick={() => setIsOpen(false)}
            className="text-white hover:text-gray-200"
          >
            ✕
          </button>
        </div>
      </div>

      {!isMinimized && (
        <>
          {/* Messages */}
          <div className="flex-1 p-4 h-64 overflow-y-auto">
            {messages.map((message, index) => (
              <div
                key={index}
                className={`mb-3 ${
                  message.role === 'user' ? 'text-right' : 'text-left'
                }`}
              >
                <div
                  className={`inline-block max-w-[80%] p-2 rounded-lg text-sm ${
                    message.role === 'user'
                      ? 'bg-blue-600 text-white'
                      : 'bg-gray-100 text-gray-800'
                  }`}
                >
                  {message.content}
                </div>
                {message.actions && message.actions.length > 0 && (
                  <div className="mt-1 text-xs text-gray-500">
                    Actions performed: {message.actions.join(', ')}
                  </div>
                )}
                <div className="text-xs text-gray-400 mt-1">
                  {message.timestamp.toLocaleTimeString()}
                </div>
              </div>
            ))}
            {isLoading && (
              <div className="text-left">
                <div className="inline-block bg-gray-100 text-gray-800 p-2 rounded-lg text-sm">
                  <div className="flex items-center gap-2">
                    <div className="w-2 h-2 bg-gray-400 rounded-full animate-pulse"></div>
                    <div className="w-2 h-2 bg-gray-400 rounded-full animate-pulse delay-100"></div>
                    <div className="w-2 h-2 bg-gray-400 rounded-full animate-pulse delay-200"></div>
                  </div>
                </div>
              </div>
            )}
            <div ref={messagesEndRef} />
          </div>

          {/* Input */}
          <div className="p-4 border-t">
            <div className="flex gap-2">
              <textarea
                value={inputValue}
                onChange={(e) => setInputValue(e.target.value)}
                onKeyPress={handleKeyPress}
                placeholder={isAdmin ? "Admin command or question..." : "Ask me anything..."}
                className="flex-1 px-3 py-2 border rounded-lg resize-none text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                rows={1}
                disabled={isLoading}
              />
              <button
                onClick={sendMessage}
                disabled={isLoading || !inputValue.trim()}
                className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {isLoading ? '⏳' : '📤'}
              </button>
            </div>
            {isAdmin && (
              <div className="text-xs text-gray-500 mt-2">
                💡 Try: "Add a new filter", "Change task colors", "Update the layout"
              </div>
            )}
          </div>
        </>
      )}
    </div>
  );
};

export default FloatingChatbox;
