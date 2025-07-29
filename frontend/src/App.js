import React, { useState, useEffect } from 'react';
import io from 'socket.io-client';
import './App.css';

const App = () => {
  const [tasks, setTasks] = useState([]);
  const [events, setEvents] = useState([]);
  const [isConnected, setIsConnected] = useState(false);
  const [activeTab, setActiveTab] = useState('dashboard');

  useEffect(() => {
    const socket = io('http://localhost:3002');
    socket.on('connect', () => setIsConnected(true));
    socket.on('disconnect', () => setIsConnected(false));
    
    // Load data
    fetch('http://localhost:3002/api/tasks')
      .then(res => res.json())
      .then(data => setTasks(data.tasks || []))
      .catch(console.error);
      
    return () => socket.close();
  }, []);

  const testAI = () => {
    fetch('http://localhost:3002/api/ai-test', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ message: 'Test message' })
    }).then(res => res.json()).then(console.log);
  };

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
          {['dashboard', 'chat', 'integrations'].map(tab => (
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
        )}
        
        {activeTab === 'chat' && (
          <div className="bg-white rounded-lg shadow p-6">
            <h2 className="text-xl font-bold mb-4">💬 AI Chat</h2>
            <p className="text-gray-500">Chat interface coming soon...</p>
          </div>
        )}
        
        {activeTab === 'integrations' && (
          <div className="bg-white rounded-lg shadow p-6">
            <h2 className="text-xl font-bold mb-4">🔗 Integrations</h2>
            <p className="text-gray-500">Integration setup coming soon...</p>
          </div>
        )}
      </div>
    </div>
  );
};

export default App;