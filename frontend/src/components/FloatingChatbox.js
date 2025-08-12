import React, { useState, useRef, useEffect } from 'react';

const FloatingChatbox = ({ isAdmin = false }) => {
  const [isOpen, setIsOpen] = useState(false);
  const [messages, setMessages] = useState([]);
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
      // Changed from /api/ai-chat to /api/ai/chat and from port 3002 to 3001
      const response = await fetch('http://localhost:3001/api/ai/chat', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          message: inputValue,
          model: selectedModel === 'gpt4' ? 'assistant' : 'assistant', // Map to AI mode
          mode: 'assistant', // Use assistant mode for full capabilities
          executeActions: true, // Enable action execution
          conversationHistory: messages
        })
      });

      const data = await response.json();
      
      if (data.success) {
        const assistantMessage = {
          role: 'assistant',
          content: data.response,
          timestamp: new Date(),
          actionResult: data.actionResult // Include action results
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

  return (
    <div className="fixed bottom-6 left-1/2 transform -translate-x-1/2 z-50">
      {!isOpen ? (
        <div className="backdrop-blur-lg bg-white/10 border border-white/20 rounded-full px-6 py-3 shadow-xl">
          <input
            type="text"
            value={inputValue}
            onChange={(e) => setInputValue(e.target.value)}
            onKeyPress={(e) => {
              if (e.key === 'Enter') {
                e.preventDefault();
                setIsOpen(true);
                sendMessage();
              }
            }}
            onFocus={() => setIsOpen(true)}
            placeholder="Ask AI to manage tasks, analyze meetings, or help with projects..."
            className="bg-transparent text-white placeholder-gray-300 outline-none w-96"
          />
        </div>
      ) : (
        <div className="backdrop-blur-xl bg-white/10 border border-white/20 rounded-2xl shadow-2xl w-96 max-h-96">
          {/* Header */}
          <div className="flex items-center justify-between p-4 border-b border-white/20">
            <div className="flex items-center gap-2">
              <span className="text-lg">🤖</span>
              <div className="text-white font-medium">AI Assistant</div>
            </div>
            <div className="flex items-center gap-2">
              <select
                value={selectedModel}
                onChange={(e) => setSelectedModel(e.target.value)}
                className="bg-white/20 text-white text-xs px-2 py-1 rounded border border-white/30"
              >
                <option value="gpt4" className="text-black">GPT-4</option>
                <option value="claude" className="text-black">Claude</option>
              </select>
              <button
                onClick={() => setIsOpen(false)}
                className="text-white/70 hover:text-white"
              >
                ✕
              </button>
            </div>
          </div>

          {/* Messages */}
          <div className="p-4 h-64 overflow-y-auto">
            {messages.length === 0 && (
              <div className="text-center text-white/70 text-sm">
                Try: "Add a task for John - Review proposal, due tomorrow"
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
                  className={`inline-block max-w-[80%] p-3 rounded-lg text-sm ${
                    message.role === 'user'
                      ? 'bg-blue-500/30 text-white border border-blue-400/30'
                      : message.role === 'system'
                      ? 'bg-green-500/20 text-green-300 border border-green-400/30'
                      : 'bg-white/20 text-white border border-white/30'
                  }`}
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
                    <div className="w-2 h-2 bg-white/70 rounded-full animate-pulse delay-100"></div>
                    <div className="w-2 h-2 bg-white/70 rounded-full animate-pulse delay-200"></div>
                  </div>
                </div>
              </div>
            )}
            <div ref={messagesEndRef} />
          </div>

          {/* Input */}
          <div className="p-4 border-t border-white/20">
            <div className="flex gap-2">
              <input
                type="text"
                value={inputValue}
                onChange={(e) => setInputValue(e.target.value)}
                onKeyPress={handleKeyPress}
                placeholder="Type your message..."
                className="flex-1 px-3 py-2 bg-white/20 border border-white/30 rounded-lg text-white placeholder-white/50 outline-none focus:ring-2 focus:ring-blue-400/50"
                disabled={isLoading}
              />
              <button
                onClick={sendMessage}
                disabled={isLoading || !inputValue.trim()}
                className="px-4 py-2 bg-blue-500/30 text-white rounded-lg hover:bg-blue-500/50 disabled:opacity-50 disabled:cursor-not-allowed border border-blue-400/30 transition-colors"
              >
                {isLoading ? '⏳' : '📤'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default FloatingChatbox;