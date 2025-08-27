import React, { useState, useRef, useEffect } from 'react';

const FloatingChatbox = ({ isAdmin = false }) => {
  const [isOpen, setIsOpen] = useState(false);
  const [messages, setMessages] = useState([]);
  const [inputValue, setInputValue] = useState('');
  const [selectedModel, setSelectedModel] = useState('gpt4');
  const [isLoading, setIsLoading] = useState(false);
  const messagesEndRef = useRef(null);
  const inputRef = useRef(null);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  // Auto-focus input when chat opens
  useEffect(() => {
    if (isOpen && inputRef.current) {
      inputRef.current.focus();
    }
  }, [isOpen]);

  const sendMessage = async () => {
    if (!inputValue.trim()) return;

    const userMessage = {
      role: 'user',
      content: inputValue,
      timestamp: new Date()
    };

    // Immediately show user message
    setMessages(prev => [...prev, userMessage]);
    const currentInput = inputValue;
    setInputValue('');
    setIsLoading(true);

    try {
      const response = await fetch('http://localhost:3001/api/ai/chat', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          message: currentInput,
          model: selectedModel === 'gpt4' ? 'assistant' : 'assistant',
          mode: 'assistant',
          executeActions: true,
          conversationHistory: messages
        })
      });

      const data = await response.json();
      
      if (data.success) {
        const assistantMessage = {
          role: 'assistant',
          content: data.response,
          timestamp: new Date(),
          actionResult: data.actionResult
        };
        
        setMessages(prev => [...prev, assistantMessage]);
        
        // Show action result if present
        if (data.actionResult && data.actionResult.success) {
          const actionMessage = {
            role: 'system',
            content: `✅ Action completed: ${data.actionResult.message}`,
            timestamp: new Date()
          };
          setMessages(prev => [...prev, actionMessage]);
          
          // Refresh page if task was created
          if (data.actionResult.action === 'task_created' || 
              data.actionResult.action === 'task_pushed_to_notion') {
            setTimeout(() => {
              window.location.reload();
            }, 2000);
          }
        }
      } else {
        throw new Error(data.error || 'Failed to get response');
      }
    } catch (error) {
      console.error('Chat error:', error);
      const errorMessage = {
        role: 'assistant',
        content: `Sorry, I encountered an error: ${error.message}. Make sure the backend is running on port 3001.`,
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

  const handleInputFocus = () => {
    if (!isOpen) {
      setIsOpen(true);
    }
  };

  return (
    <div className="fixed bottom-6 left-1/2 transform -translate-x-1/2 z-50">
      {!isOpen ? (
        <div className="backdrop-blur-lg bg-white/10 border border-white/20 rounded-full px-6 py-3 shadow-xl hover:shadow-2xl transition-shadow">
          <input
            type="text"
            value={inputValue}
            onChange={(e) => setInputValue(e.target.value)}
            onKeyPress={(e) => {
              if (e.key === 'Enter') {
                e.preventDefault();
                setIsOpen(true);
                setTimeout(() => sendMessage(), 100);
              }
            }}
            onFocus={handleInputFocus}
            placeholder="Ask AI to manage tasks, analyze meetings, or help with projects..."
            className="bg-transparent text-white placeholder-gray-300 outline-none w-[500px]"
          />
        </div>
      ) : (
        <div className="backdrop-blur-xl bg-white/10 border border-white/20 rounded-2xl shadow-2xl" 
             style={{ width: '600px', height: '500px' }}>
          {/* Header */}
          <div className="flex items-center justify-between p-4 border-b border-white/20">
            <div className="flex items-center gap-2">
              <span className="text-lg">🤖</span>
              <div className="text-white font-medium">AI Assistant</div>
              {isAdmin && <span className="text-xs bg-purple-500/30 text-purple-300 px-2 py-1 rounded">Admin Mode</span>}
            </div>
            <div className="flex items-center gap-2">
              <select
                value={selectedModel}
                onChange={(e) => setSelectedModel(e.target.value)}
                className="bg-white/20 text-white text-xs px-2 py-1 rounded border border-white/30 outline-none"
              >
                <option value="gpt4" className="text-black">GPT-4</option>
                <option value="claude" className="text-black">Claude</option>
              </select>
              <button
                onClick={() => {
                  setIsOpen(false);
                  setInputValue('');
                }}
                className="text-white/70 hover:text-white text-xl"
              >
                ✕
              </button>
            </div>
          </div>

          {/* Messages - Bigger area */}
          <div className="p-4 overflow-y-auto" style={{ height: 'calc(100% - 140px)' }}>
            {messages.length === 0 && (
              <div className="text-center text-white/70 text-sm space-y-2">
                <div>👋 Hi! I can help you with:</div>
                <div className="text-xs space-y-1">
                  <div>• "Add a task for John - Review proposal, due tomorrow"</div>
                  <div>• "Show me high priority tasks"</div>
                  <div>• "Summarize my recent meetings"</div>
                  <div>• "What should I focus on today?"</div>
                </div>
              </div>
            )}
            {messages.map((message, index) => (
              <div
                key={index}
                className={`mb-3 ${
                  message.role === 'user' ? 'text-right' : 
                  message.role === 'system' ? 'text-center' : 'text-left'
                }`}
              >
                <div
                  className={`inline-block max-w-[85%] p-3 rounded-lg text-sm ${
                    message.role === 'user'
                      ? 'bg-blue-500/30 text-white border border-blue-400/30'
                      : message.role === 'system'
                      ? 'bg-green-500/20 text-green-300 border border-green-400/30 text-xs'
                      : 'bg-white/20 text-white border border-white/30'
                  }`}
                  style={{ wordBreak: 'break-word' }}
                >
                  {message.content}
                </div>
                <div className="text-xs text-white/50 mt-1">
                  {message.timestamp.toLocaleTimeString()}
                </div>
              </div>
            ))}
            {isLoading && (
              <div className="text-left">
                <div className="inline-block bg-white/20 text-white p-3 rounded-lg text-sm border border-white/30">
                  <div className="flex items-center gap-2">
                    <div className="w-2 h-2 bg-white/70 rounded-full animate-pulse"></div>
                    <div className="w-2 h-2 bg-white/70 rounded-full animate-pulse" style={{ animationDelay: '0.2s' }}></div>
                    <div className="w-2 h-2 bg-white/70 rounded-full animate-pulse" style={{ animationDelay: '0.4s' }}></div>
                  </div>
                </div>
              </div>
            )}
            <div ref={messagesEndRef} />
          </div>

          {/* Input - Better positioned */}
          <div className="p-4 border-t border-white/20">
            <div className="flex gap-2">
              <input
                ref={inputRef}
                type="text"
                value={inputValue}
                onChange={(e) => setInputValue(e.target.value)}
                onKeyPress={handleKeyPress}
                placeholder="Type your message..."
                className="flex-1 px-3 py-2 bg-white/20 border border-white/30 rounded-lg text-white placeholder-white/50 outline-none focus:ring-2 focus:ring-blue-400/50 focus:bg-white/25 transition-colors"
                disabled={isLoading}
                autoFocus
              />
              <button
                onClick={sendMessage}
                disabled={isLoading || !inputValue.trim()}
                className="px-4 py-2 bg-blue-500/30 text-white rounded-lg hover:bg-blue-500/50 disabled:opacity-50 disabled:cursor-not-allowed border border-blue-400/30 transition-all hover:scale-105"
              >
                {isLoading ? '⏳' : '📤'}
              </button>
            </div>
            {isAdmin && (
              <div className="text-xs text-purple-300/70 mt-2">
                Admin mode: Can modify platform in real-time
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
};

export default FloatingChatbox;