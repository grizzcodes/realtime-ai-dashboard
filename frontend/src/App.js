import React, { useState, useEffect } from 'react';
import io from 'socket.io-client';
import './App.css';

const Dashboard = () => {
  const [tasks, setTasks] = useState([]);
  const [events, setEvents] = useState([]);
  const [stats, setStats] = useState({});
  const [socket, setSocket] = useState(null);
  const [isConnected, setIsConnected] = useState(false);

  useEffect(() => {
    // Connect to WebSocket
    const newSocket = io('http://localhost:3002');
    setSocket(newSocket);

    newSocket.on('connect', () => {
      setIsConnected(true);
      console.log('Connected to server');
    });

    newSocket.on('disconnect', () => {
      setIsConnected(false);
      console.log('Disconnected from server');
    });

    // Listen for real-time updates
    newSocket.on('new_task', (task) => {
      setTasks(prev => [task, ...prev]);
    });

    newSocket.on('task_updated', (updatedTask) => {
      setTasks(prev => prev.map(t => t.id === updatedTask.id ? updatedTask : t));
    });

    newSocket.on('new_event', (event) => {
      setEvents(prev => [event, ...prev.slice(0, 29)]);
    });

    newSocket.on('stats_update', (newStats) => {
      setStats(newStats);
    });

    // Load initial data
    loadTasks();
    loadEvents();

    return () => newSocket.close();
  }, []);

  const loadTasks = async () => {
    try {
      const response = await fetch('http://localhost:3002/api/tasks');
      const data = await response.json();
      setTasks(data.tasks || []);
      setStats(data.stats || {});
    } catch (error) {
      console.error('Failed to load tasks:', error);
    }
  };

  const loadEvents = async () => {
    try {
      const response = await fetch('http://localhost:3002/api/events');
      const data = await response.json();
      setEvents(data.events || []);
    } catch (error) {
      console.error('Failed to load events:', error);
    }
  };

  const testAI = async () => {
    try {
      const response = await fetch('http://localhost:3002/api/ai-test', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ message: 'Fix the payment gateway bug by tomorrow' })
      });
      const result = await response.json();
      console.log('AI Test Result:', result);
    } catch (error) {
      console.error('AI test failed:', error);
    }
  };

  const completeTask = async (taskId) => {
    try {
      await fetch(`http://localhost:3002/api/tasks/${taskId}/status`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status: 'completed' })
      });
    } catch (error) {
      console.error('Failed to complete task:', error);
    }
  };

  const pendingTasks = tasks.filter(t => t.status === 'pending');
  const completedTasks = tasks.filter(t => t.status === 'completed');

  return (
    <div className="min-h-screen bg-gray-100 p-8">
      {/* Header */}
      <div className="mb-8">
        <h1 className="text-4xl font-bold text-gray-900 mb-2">
          🤖 AI-Powered Dashboard
        </h1>
        <div className="flex items-center gap-4">
          <div className={`px-3 py-1 rounded-full text-sm font-medium ${
            isConnected ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'
          }`}>
            {isConnected ? '🔗 Connected' : '❌ Disconnected'}
          </div>
          <button 
            onClick={testAI}
            className="bg-blue-500 hover:bg-blue-600 text-white px-4 py-2 rounded-lg font-medium transition-colors"
          >
            🧪 Test AI
          </button>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        {/* Stats Panel */}
        <div className="lg:col-span-1">
          <div className="bg-white rounded-lg shadow-lg p-6">
            <h2 className="text-xl font-bold mb-4">📊 Stats</h2>
            <div className="space-y-3">
              <div className="flex justify-between">
                <span>Total Tasks:</span>
                <span className="font-bold">{tasks.length}</span>
              </div>
              <div className="flex justify-between">
                <span>Pending:</span>
                <span className="font-bold text-orange-600">{pendingTasks.length}</span>
              </div>
              <div className="flex justify-between">
                <span>Completed:</span>
                <span className="font-bold text-green-600">{completedTasks.length}</span>
              </div>
              <div className="flex justify-between">
                <span>Events:</span>
                <span className="font-bold">{events.length}</span>
              </div>
            </div>
          </div>

          {/* Activity Feed */}
          <div className="bg-white rounded-lg shadow-lg p-6 mt-6">
            <h2 className="text-xl font-bold mb-4">📡 Live Activity</h2>
            <div className="space-y-3 max-h-96 overflow-y-auto">
              {events.map((event, i) => (
                <div key={i} className="border-l-4 border-blue-500 pl-3 py-2">
                  <div className="text-sm text-gray-600">
                    {new Date(event.timestamp || event.processed_at).toLocaleTimeString()}
                  </div>
                  <div className="font-medium">{event.source}</div>
                  <div className="text-sm text-gray-700">{event.type}</div>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* Task Board */}
        <div className="lg:col-span-2">
          <div className="bg-white rounded-lg shadow-lg p-6">
            <h2 className="text-xl font-bold mb-4">📋 Task Board</h2>
            
            {/* Pending Tasks */}
            <div className="mb-6">
              <h3 className="text-lg font-semibold mb-3 text-orange-600">
                ⏳ Pending ({pendingTasks.length})
              </h3>
              <div className="space-y-3">
                {pendingTasks.map(task => (
                  <div key={task.id} className="border border-orange-200 rounded-lg p-4 bg-orange-50">
                    <div className="flex justify-between items-start">
                      <div className="flex-1">
                        <h4 className="font-medium text-gray-900">{task.title}</h4>
                        <div className="flex items-center gap-2 mt-1">
                          <span className={`px-2 py-1 rounded text-xs font-medium ${
                            task.urgency >= 4 ? 'bg-red-100 text-red-800' :
                            task.urgency >= 3 ? 'bg-yellow-100 text-yellow-800' :
                            'bg-gray-100 text-gray-800'
                          }`}>
                            Urgency: {task.urgency}/5
                          </span>
                          <span className="text-xs text-gray-500">{task.source}</span>
                        </div>
                        {task.deadline && (
                          <div className="text-xs text-gray-600 mt-1">
                            Due: {new Date(task.deadline).toLocaleDateString()}
                          </div>
                        )}
                      </div>
                      <button 
                        onClick={() => completeTask(task.id)}
                        className="bg-green-500 hover:bg-green-600 text-white px-3 py-1 rounded text-sm transition-colors"
                      >
                        ✓ Complete
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* Completed Tasks */}
            <div>
              <h3 className="text-lg font-semibold mb-3 text-green-600">
                ✅ Completed ({completedTasks.length})
              </h3>
              <div className="space-y-3">
                {completedTasks.map(task => (
                  <div key={task.id} className="border border-green-200 rounded-lg p-4 bg-green-50">
                    <h4 className="font-medium text-gray-700 line-through">{task.title}</h4>
                    <div className="flex items-center gap-2 mt-1">
                      <span className="text-xs text-gray-500">{task.source}</span>
                      <span className="text-xs text-green-600">Completed</span>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Dashboard;