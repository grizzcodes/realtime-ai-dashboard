// frontend/src/App.js - Updated with expanded view boxes
import React, { useState, useEffect, useCallback } from 'react';
import io from 'socket.io-client';
import './App.css';

// Initialize socket connection
const socket = io('http://localhost:3001');

function App() {
  // State management
  const [emails, setEmails] = useState([]);
  const [notionTasks, setNotionTasks] = useState([]);
  const [filteredNotionTasks, setFilteredNotionTasks] = useState([]);
  const [upcomingMeetings, setUpcomingMeetings] = useState([]);
  const [integrationStatus, setIntegrationStatus] = useState([]);
  const [activeView, setActiveView] = useState('dashboard');
  const [selectedPerson, setSelectedPerson] = useState('All');
  const [teamMembers, setTeamMembers] = useState(['All', 'Alec Chapados', 'Leo Ramlall', 'Steph']);
  const [aiBoxesData, setAiBoxesData] = useState({
    shouldReplyTo: [
      'Sarah from Marketing: Campaign review feedback needed',
      'Client inquiry about project timeline',
      'Team lead waiting on budget approval'
    ],
    quickWins: [
      'Approve vacation request (30 sec)',
      "Reply 'thanks' to completed deliverable",
      'Schedule coffee chat with new hire'
    ],
    upcomingUndone: [
      'Prepare slides for 3PM meeting',
      'Review contract before client call',
      'Update project status for standup'
    ],
    waitingOn: [
      'Legal review from 3 days ago',
      'Budget approval sent Monday'
    ]
  });
  const [isLoadingEmails, setIsLoadingEmails] = useState(false);
  const [isLoadingTasks, setIsLoadingTasks] = useState(false);
  const [isLoadingMeetings, setIsLoadingMeetings] = useState(false);
  const [showAllEmails, setShowAllEmails] = useState(false);
  const [showAllTasks, setShowAllTasks] = useState(false);
  const [firefliesMeetings, setFirefliesMeetings] = useState([]);
  const [selectedMeeting, setSelectedMeeting] = useState(null);
  const [actionItems, setActionItems] = useState([]);
  const [isConnected, setIsConnected] = useState(false);
  const [lastUpdate, setLastUpdate] = useState(null);
  const [darkMode, setDarkMode] = useState(() => {
    const saved = localStorage.getItem('darkMode');
    return saved ? JSON.parse(saved) : true;
  });
  const [isChatOpen, setIsChatOpen] = useState(false);
  const [chatMessage, setChatMessage] = useState('');
  const [chatHistory, setChatHistory] = useState([]);
  const [currentAIMode, setCurrentAIMode] = useState('assistant');
  const [aiModes] = useState([
    { id: 'assistant', name: 'Assistant', icon: '🤖' },
    { id: 'emailResponder', name: 'Email', icon: '📧' },
    { id: 'taskManager', name: 'Tasks', icon: '✅' },
    { id: 'analyst', name: 'Analyst', icon: '📊' },
    { id: 'creativeIdeas', name: 'Creative', icon: '💡' }
  ]);

  // Load Notion tasks with error handling
  const loadNotionTasks = useCallback(async () => {
    setIsLoadingTasks(true);
    try {
      const response = await fetch('http://localhost:3001/api/notion/tasks');
      const data = await response.json();
      
      if (data.success && data.tasks) {
        setNotionTasks(data.tasks);
        setFilteredNotionTasks(data.tasks);
      }
    } catch (error) {
      console.error('Failed to load Notion tasks:', error);
      setNotionTasks([]);
      setFilteredNotionTasks([]);
    } finally {
      setIsLoadingTasks(false);
    }
  }, []);

  // Socket connection and real-time updates
  useEffect(() => {
    const socketConnection = socket;
    
    socketConnection.on('connect', () => {
      console.log('Connected to server');
      setIsConnected(true);
    });
    
    socketConnection.on('disconnect', () => {
      console.log('Disconnected from server');
      setIsConnected(false);
    });
    
    socketConnection.on('taskUpdate', (data) => {
      console.log('Task update received:', data);
      loadNotionTasks();
      setLastUpdate(new Date());
    });
    
    socketConnection.on('emailUpdate', (data) => {
      console.log('Email update received:', data);
      loadEmails();
      setLastUpdate(new Date());
    });
    
    socketConnection.on('meetingUpdate', (data) => {
      console.log('Meeting update received:', data);
      loadMeetings();
      setLastUpdate(new Date());
    });
    
    socketConnection.on('actionExecuted', (data) => {
      console.log('Action executed:', data);
      // Refresh relevant data based on action type
      if (data.action.includes('email')) loadEmails();
      if (data.action.includes('task')) loadNotionTasks();
    });
    
    // Initial data load
    loadEmails();
    loadNotionTasks();
    loadMeetings();
    loadFirefliesMeetings();
    loadIntegrationStatus();
    
    // Auto-refresh every 30 seconds
    const refreshInterval = setInterval(() => {
      loadEmails();
      loadNotionTasks();
      loadMeetings();
      loadIntegrationStatus();
    }, 30000);
    
    return () => {
      clearInterval(refreshInterval);
      socketConnection.off('connect');
      socketConnection.off('disconnect');
      socketConnection.off('taskUpdate');
      socketConnection.off('emailUpdate');
      socketConnection.off('meetingUpdate');
      socketConnection.off('actionExecuted');
    };
  }, [loadNotionTasks]);

  // Dark mode effect
  useEffect(() => {
    if (darkMode) {
      document.documentElement.classList.add('dark');
    } else {
      document.documentElement.classList.remove('dark');
    }
    localStorage.setItem('darkMode', darkMode);
  }, [darkMode]);

  // Filter tasks by person
  useEffect(() => {
    if (selectedPerson === 'All') {
      setFilteredNotionTasks(notionTasks);
    } else {
      setFilteredNotionTasks(notionTasks.filter(task => 
        task.assignedTo && task.assignedTo.includes(selectedPerson)
      ));
    }
  }, [notionTasks, selectedPerson]);

  // API functions
  const loadEmails = async () => {
    setIsLoadingEmails(true);
    try {
      const response = await fetch('http://localhost:3001/api/gmail/latest?limit=25');
      const data = await response.json();
      setEmails(data.emails || []);
    } catch (error) {
      console.error('Failed to load emails:', error);
    } finally {
      setIsLoadingEmails(false);
    }
  };

  const archiveEmail = async (emailId) => {
    try {
      const response = await fetch(`http://localhost:3001/api/gmail/archive/${emailId}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' }
      });
      
      if (response.ok) {
        setEmails(prev => prev.filter(e => e.id !== emailId));
        console.log('Email archived successfully');
      } else {
        console.error('Failed to archive email');
      }
    } catch (error) {
      console.error('Failed to archive email:', error);
    }
  };

  const generateDraftReply = async (email) => {
    try {
      const response = await fetch('http://localhost:3001/api/gmail/draft-reply', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          emailId: email.id,
          subject: email.subject,
          from: email.from,
          snippet: email.snippet
        })
      });
      
      const data = await response.json();
      if (data.success) {
        alert(`Draft Reply:\n\n${data.draftContent}`);
      }
    } catch (error) {
      console.error('Failed to generate draft:', error);
    }
  };

  const loadMeetings = async () => {
    setIsLoadingMeetings(true);
    try {
      const response = await fetch('http://localhost:3001/api/calendar/upcoming');
      const data = await response.json();
      setUpcomingMeetings(data.meetings || []);
    } catch (error) {
      console.error('Failed to load meetings:', error);
    } finally {
      setIsLoadingMeetings(false);
    }
  };

  const loadFirefliesMeetings = async () => {
    try {
      const response = await fetch('http://localhost:3001/api/fireflies/recent-meetings?limit=10');
      const data = await response.json();
      if (data.success) {
        setFirefliesMeetings(data.meetings || []);
      }
    } catch (error) {
      console.error('Failed to load Fireflies meetings:', error);
    }
  };

  const loadIntegrationStatus = async () => {
    try {
      const response = await fetch('http://localhost:3001/api/integrations/status');
      const data = await response.json();
      
      const integrations = [];
      if (data.integrations) {
        Object.entries(data.integrations).forEach(([key, value]) => {
          integrations.push({
            name: key.charAt(0).toUpperCase() + key.slice(1),
            status: value.success ? 'connected' : 'disconnected',
            message: value.message || value.error || ''
          });
        });
      }
      setIntegrationStatus(integrations);
    } catch (error) {
      console.error('Failed to load integration status:', error);
    }
  };

  const selectMeeting = async (meetingId) => {
    try {
      const response = await fetch(`http://localhost:3001/api/fireflies/action-items/${meetingId}`);
      const data = await response.json();
      
      if (data.success) {
        setSelectedMeeting(meetingId);
        setActionItems(data.actionItems || []);
      }
    } catch (error) {
      console.error('Failed to load action items:', error);
    }
  };

  const pushTaskToNotion = async (task, assignee) => {
    try {
      const response = await fetch('http://localhost:3001/api/notion/create-task', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          title: task,
          assignedTo: assignee,
          status: 'To-do',
          priority: 'Medium'
        })
      });
      
      const data = await response.json();
      if (data.success) {
        loadNotionTasks();
        alert('Task added to Notion!');
      }
    } catch (error) {
      console.error('Failed to push task to Notion:', error);
    }
  };

  const sendChatMessage = async () => {
    if (!chatMessage.trim()) return;
    
    const userMessage = { role: 'user', content: chatMessage };
    setChatHistory(prev => [...prev, userMessage]);
    setChatMessage('');
    
    try {
      const response = await fetch('http://localhost:3001/api/ai/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          message: chatMessage,
          mode: currentAIMode
        })
      });
      
      const data = await response.json();
      
      const aiMessage = { 
        role: 'assistant', 
        content: data.response,
        mode: data.mode,
        model: data.model,
        actionResult: data.actionResult
      };
      
      setChatHistory(prev => [...prev, aiMessage]);
      
      // If action was executed, refresh relevant data
      if (data.actionResult?.success) {
        if (data.actionResult.action.includes('email')) loadEmails();
        if (data.actionResult.action.includes('task')) loadNotionTasks();
      }
    } catch (error) {
      console.error('Failed to send message:', error);
    }
  };

  const changeAIMode = async (modeId) => {
    try {
      const response = await fetch('http://localhost:3001/api/ai/mode', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ mode: modeId })
      });
      
      const data = await response.json();
      if (data.success) {
        setCurrentAIMode(modeId);
      }
    } catch (error) {
      console.error('Failed to change AI mode:', error);
    }
  };

  return (
    <div className="min-h-screen bg-gray-900 text-white p-6">
      {/* Header */}
      <header className="flex items-center justify-between mb-8">
        <div className="flex items-center gap-4">
          <span className="text-2xl">🧭</span>
          <h1 className="text-2xl font-bold">DGenz Hub</h1>
        </div>
        
        <div className="flex items-center gap-6">
          <div className="flex items-center gap-2">
            <span className="text-2xl">☀️</span>
          </div>
          
          <div className="flex items-center gap-2">
            <div className={`w-2 h-2 rounded-full ${isConnected ? 'bg-green-500' : 'bg-red-500'}`}></div>
            <span className="text-sm">{isConnected ? 'Connected' : 'Disconnected'}</span>
          </div>
          
          <div className="flex items-center gap-2">
            <span>🔗</span>
            <span>{integrationStatus.filter(i => i.status === 'connected').length}/{integrationStatus.length}</span>
          </div>
          
          <button
            onClick={() => setDarkMode(!darkMode)}
            className="p-2 rounded-lg hover:bg-gray-800 transition-colors"
          >
            {darkMode ? '🌙' : '☀️'}
          </button>
          
          <button className="px-4 py-2 bg-purple-600 rounded-lg hover:bg-purple-700 transition-colors">
            ✏️ Test AI
          </button>
        </div>
      </header>

      {/* Navigation Tabs */}
      <div className="flex gap-4 mb-8">
        <button
          onClick={() => setActiveView('dashboard')}
          className={`px-6 py-3 rounded-lg transition-colors ${
            activeView === 'dashboard' 
              ? 'bg-gray-800 text-white' 
              : 'bg-gray-700/50 text-gray-400 hover:bg-gray-700'
          }`}
        >
          Dashboard
        </button>
        <button
          onClick={() => setActiveView('magicInbox')}
          className={`px-6 py-3 rounded-lg transition-colors flex items-center gap-2 ${
            activeView === 'magicInbox' 
              ? 'bg-blue-600 text-white' 
              : 'bg-gray-700/50 text-gray-400 hover:bg-gray-700'
          }`}
        >
          ✨ Magic Inbox
        </button>
        <button
          onClick={() => setActiveView('supa')}
          className={`px-6 py-3 rounded-lg transition-colors ${
            activeView === 'supa' 
              ? 'bg-gray-800 text-white' 
              : 'bg-gray-700/50 text-gray-400 hover:bg-gray-700'
          }`}
        >
          📊 SUPA
        </button>
        <button
          onClick={() => setActiveView('integrations')}
          className={`px-6 py-3 rounded-lg transition-colors ${
            activeView === 'integrations' 
              ? 'bg-gray-800 text-white' 
              : 'bg-gray-700/50 text-gray-400 hover:bg-gray-700'
          }`}
        >
          Integrations
        </button>
      </div>

      {/* Main Content */}
      <div className="space-y-6">
        {activeView === 'dashboard' && (
          <>
            {/* Email Section - EXPANDED */}
            <div className="bg-gray-800 rounded-xl p-6">
              <div className="flex items-center justify-between mb-4">
                <div className="flex items-center gap-3">
                  <span className="text-2xl">📧</span>
                  <h2 className="text-xl font-semibold">Gmail ({emails.length})</h2>
                </div>
                <div className="flex gap-2">
                  <button
                    onClick={() => setShowAllEmails(!showAllEmails)}
                    className="p-2 rounded-lg bg-gray-700 hover:bg-gray-600 transition-colors"
                  >
                    {showAllEmails ? '➖' : '➕'}
                  </button>
                  <button
                    onClick={loadEmails}
                    className="p-2 rounded-lg bg-gray-700 hover:bg-gray-600 transition-colors"
                  >
                    🔄
                  </button>
                </div>
              </div>

              {isLoadingEmails ? (
                <div className="text-center py-8 text-gray-400">Loading emails...</div>
              ) : (
                <div className="space-y-3 max-h-[600px] overflow-y-auto">
                  {emails.slice(0, showAllEmails ? emails.length : 10).map((email) => (
                    <div
                      key={email.id}
                      className="bg-gray-700/50 rounded-lg p-4 hover:bg-gray-700 transition-colors"
                    >
                      <div className="flex items-center justify-between">
                        <div className="flex-1">
                          <div className="flex items-center gap-2 mb-1">
                            {email.isUnread && (
                              <span className="w-2 h-2 bg-blue-500 rounded-full"></span>
                            )}
                            <h3 className="font-medium">{email.subject || 'No Subject'}</h3>
                          </div>
                          <p className="text-sm text-gray-400 mb-1">{email.from}</p>
                          <p className="text-sm text-gray-500 line-clamp-2">{email.snippet}</p>
                        </div>
                        <div className="flex gap-2 ml-4">
                          <button
                            onClick={() => archiveEmail(email.id)}
                            className="p-2 rounded-lg bg-gray-600 hover:bg-gray-500 transition-colors"
                            title="Archive"
                          >
                            📁
                          </button>
                          <button
                            onClick={() => generateDraftReply(email)}
                            className="p-2 rounded-lg bg-gray-600 hover:bg-gray-500 transition-colors"
                            title="Draft Reply"
                          >
                            ✉️
                          </button>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* Notion Tasks Section - EXPANDED */}
            <div className="bg-gray-800 rounded-xl p-6">
              <div className="flex items-center justify-between mb-4">
                <div className="flex items-center gap-3">
                  <span className="text-2xl">📝</span>
                  <h2 className="text-xl font-semibold">Notion Tasks ({filteredNotionTasks.length})</h2>
                </div>
                <div className="flex items-center gap-2">
                  <select
                    value={selectedPerson}
                    onChange={(e) => setSelectedPerson(e.target.value)}
                    className="px-3 py-2 bg-gray-700 rounded-lg text-sm"
                  >
                    {teamMembers.map(member => (
                      <option key={member} value={member}>{member}</option>
                    ))}
                  </select>
                  <button
                    onClick={() => setShowAllTasks(!showAllTasks)}
                    className="p-2 rounded-lg bg-gray-700 hover:bg-gray-600 transition-colors"
                  >
                    {showAllTasks ? '➖' : '➕'}
                  </button>
                  <button
                    onClick={loadNotionTasks}
                    className="p-2 rounded-lg bg-gray-700 hover:bg-gray-600 transition-colors"
                  >
                    🔄
                  </button>
                </div>
              </div>

              {isLoadingTasks ? (
                <div className="text-center py-8 text-gray-400">Loading tasks...</div>
              ) : (
                <>
                  <div className="space-y-3 max-h-[600px] overflow-y-auto">
                    {filteredNotionTasks.slice(0, showAllTasks ? filteredNotionTasks.length : 10).map((task) => (
                      <div
                        key={task.id}
                        className="bg-gray-700/50 rounded-lg p-4 hover:bg-gray-700 transition-colors"
                      >
                        <div className="flex items-center justify-between">
                          <div>
                            <h3 className="font-medium mb-1">{task.title}</h3>
                            <div className="flex items-center gap-3 text-sm text-gray-400">
                              <span className="flex items-center gap-1">
                                👤 {task.assignedTo || 'Unassigned'}
                              </span>
                              {task.dueDate && (
                                <span>📅 {new Date(task.dueDate).toLocaleDateString()}</span>
                              )}
                              <span className={`px-2 py-1 rounded text-xs ${
                                task.priority === 'High' ? 'bg-red-600/20 text-red-400' :
                                task.priority === 'Medium' ? 'bg-yellow-600/20 text-yellow-400' :
                                'bg-green-600/20 text-green-400'
                              }`}>
                                {task.priority || 'Medium'}
                              </span>
                            </div>
                          </div>
                          <div className={`px-3 py-1 rounded-lg text-sm ${
                            task.status === 'Completed' ? 'bg-green-600/20 text-green-400' :
                            task.status === 'In Progress' ? 'bg-blue-600/20 text-blue-400' :
                            'bg-gray-600/20 text-gray-400'
                          }`}>
                            {task.status || 'To-do'}
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                  {filteredNotionTasks.length > 10 && !showAllTasks && (
                    <div className="text-center mt-4 text-gray-400">
                      +{filteredNotionTasks.length - 10} more tasks
                    </div>
                  )}
                </>
              )}
            </div>

            {/* Calendar Section - EXPANDED */}
            <div className="bg-gray-800 rounded-xl p-6">
              <div className="flex items-center justify-between mb-4">
                <div className="flex items-center gap-3">
                  <span className="text-2xl">📅</span>
                  <h2 className="text-xl font-semibold">Calendar</h2>
                </div>
                <button
                  onClick={loadMeetings}
                  className="p-2 rounded-lg bg-gray-700 hover:bg-gray-600 transition-colors"
                >
                  🔄
                </button>
              </div>

              {isLoadingMeetings ? (
                <div className="text-center py-8 text-gray-400">Loading calendar...</div>
              ) : (
                <div className="space-y-3 max-h-[400px] overflow-y-auto">
                  {upcomingMeetings.length > 0 ? (
                    upcomingMeetings.map((meeting, index) => (
                      <div
                        key={index}
                        className="bg-gray-700/50 rounded-lg p-4 hover:bg-gray-700 transition-colors"
                      >
                        <div className="flex items-center justify-between">
                          <div>
                            <h3 className="font-medium">{meeting.title}</h3>
                            <p className="text-sm text-gray-400">
                              {new Date(meeting.startTime).toLocaleString()}
                            </p>
                            {meeting.attendees && meeting.attendees.length > 0 && (
                              <p className="text-sm text-gray-500 mt-1">
                                👥 {meeting.attendees.join(', ')}
                              </p>
                            )}
                          </div>
                          {meeting.meetLink && (
                            <a
                              href={meeting.meetLink}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="px-3 py-1 bg-blue-600 rounded-lg hover:bg-blue-700 transition-colors text-sm"
                            >
                              Join
                            </a>
                          )}
                        </div>
                      </div>
                    ))
                  ) : (
                    <div className="text-center py-8 text-gray-400">
                      No upcoming meetings
                    </div>
                  )}
                </div>
              )}
            </div>

            {/* Fireflies Meetings Section */}
            {firefliesMeetings.length > 0 && (
              <div className="bg-gray-800 rounded-xl p-6">
                <div className="flex items-center justify-between mb-4">
                  <div className="flex items-center gap-3">
                    <span className="text-2xl">🎙️</span>
                    <h2 className="text-xl font-semibold">Recent Meetings</h2>
                  </div>
                </div>

                <div className="grid md:grid-cols-2 gap-4">
                  <div className="space-y-3">
                    {firefliesMeetings.map((meeting) => (
                      <button
                        key={meeting.id}
                        onClick={() => selectMeeting(meeting.id)}
                        className={`w-full text-left p-4 rounded-lg transition-colors ${
                          selectedMeeting === meeting.id
                            ? 'bg-blue-600/20 border border-blue-500'
                            : 'bg-gray-700/50 hover:bg-gray-700'
                        }`}
                      >
                        <h3 className="font-medium mb-1">{meeting.title}</h3>
                        <p className="text-sm text-gray-400">
                          {new Date(meeting.date).toLocaleDateString()} • {meeting.duration} min
                        </p>
                        <p className="text-sm text-gray-500 mt-1">
                          👥 {meeting.participants?.join(', ') || 'No participants'}
                        </p>
                      </button>
                    ))}
                  </div>

                  {selectedMeeting && actionItems.length > 0 && (
                    <div className="bg-gray-700/30 rounded-lg p-4">
                      <h3 className="font-medium mb-3">Action Items</h3>
                      <div className="space-y-2">
                        {actionItems.map((item, index) => (
                          <div key={index} className="bg-gray-700/50 rounded-lg p-3">
                            <div className="mb-2">
                              <span className="text-sm text-blue-400">
                                👤 {item.assignee || 'Unassigned'}
                              </span>
                            </div>
                            {item.tasks && item.tasks.map((task, taskIndex) => (
                              <div key={taskIndex} className="flex items-center justify-between mt-2">
                                <p className="text-sm flex-1">{task}</p>
                                <button
                                  onClick={() => pushTaskToNotion(task, item.assignee)}
                                  className="px-2 py-1 bg-purple-600 rounded text-xs hover:bg-purple-700 transition-colors ml-2"
                                >
                                  Push to Notion
                                </button>
                              </div>
                            ))}
                          </div>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              </div>
            )}
          </>
        )}

        {activeView === 'magicInbox' && (
          <div className="bg-gray-800 rounded-xl p-6">
            <div className="text-center mb-6">
              <h2 className="text-2xl font-bold mb-2">✨ Magic AI Inbox</h2>
              <p className="text-gray-400">Your AI assistant has analyzed everything. Here's what matters now.</p>
            </div>

            <div className="grid md:grid-cols-2 gap-6">
              <div className="bg-gray-700/30 rounded-lg p-4">
                <h3 className="font-medium mb-3 flex items-center gap-2">
                  <span>📧</span>
                  <span className="text-yellow-400">⚠️</span>
                  You Should Reply To...
                </h3>
                <div className="space-y-2">
                  {aiBoxesData.shouldReplyTo.map((item, index) => (
                    <div key={index} className="bg-gray-700/50 rounded p-3 text-sm">
                      {item}
                    </div>
                  ))}
                </div>
              </div>

              <div className="bg-gray-700/30 rounded-lg p-4">
                <h3 className="font-medium mb-3 flex items-center gap-2">
                  <span>✨</span>
                  <span className="text-green-400">⚡</span>
                  Quick Wins
                </h3>
                <div className="space-y-2">
                  {aiBoxesData.quickWins.map((item, index) => (
                    <div key={index} className="bg-gray-700/50 rounded p-3 text-sm">
                      • {item}
                    </div>
                  ))}
                </div>
              </div>

              <div className="bg-gray-700/30 rounded-lg p-4">
                <h3 className="font-medium mb-3 flex items-center gap-2">
                  <span>📅</span>
                  <span>📝</span>
                  Upcoming + Undone
                </h3>
                <div className="space-y-2">
                  {aiBoxesData.upcomingUndone.map((item, index) => (
                    <div key={index} className="bg-gray-700/50 rounded p-3 text-sm">
                      • {item}
                    </div>
                  ))}
                </div>
              </div>

              <div className="bg-gray-700/30 rounded-lg p-4">
                <h3 className="font-medium mb-3 flex items-center gap-2">
                  <span>⏰</span>
                  <span>👀</span>
                  Waiting On...
                </h3>
                <div className="space-y-2">
                  {aiBoxesData.waitingOn.map((item, index) => (
                    <div key={index} className="bg-gray-700/50 rounded p-3 text-sm">
                      • {item}
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </div>
        )}

        {activeView === 'integrations' && (
          <div className="bg-gray-800 rounded-xl p-6">
            <h2 className="text-xl font-semibold mb-4">Integration Status</h2>
            <div className="grid md:grid-cols-3 gap-4">
              {integrationStatus.map((integration) => (
                <div
                  key={integration.name}
                  className={`p-4 rounded-lg ${
                    integration.status === 'connected'
                      ? 'bg-green-600/20 border border-green-500'
                      : 'bg-red-600/20 border border-red-500'
                  }`}
                >
                  <div className="flex items-center justify-between mb-2">
                    <h3 className="font-medium">{integration.name}</h3>
                    <span className={`w-2 h-2 rounded-full ${
                      integration.status === 'connected' ? 'bg-green-500' : 'bg-red-500'
                    }`}></span>
                  </div>
                  <p className="text-sm text-gray-400">{integration.message}</p>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>

      {/* AI Chat Interface */}
      <div className={`fixed bottom-4 right-4 ${isChatOpen ? 'w-96' : 'w-auto'}`}>
        {isChatOpen ? (
          <div className="bg-gray-800 rounded-xl shadow-2xl border border-gray-700">
            <div className="flex items-center justify-between p-4 border-b border-gray-700">
              <div className="flex items-center gap-2">
                <span className="text-xl">🤖</span>
                <h3 className="font-medium">AI Assistant</h3>
                <select
                  value={currentAIMode}
                  onChange={(e) => changeAIMode(e.target.value)}
                  className="ml-2 px-2 py-1 bg-gray-700 rounded text-sm"
                >
                  {aiModes.map(mode => (
                    <option key={mode.id} value={mode.id}>
                      {mode.icon} {mode.name}
                    </option>
                  ))}
                </select>
              </div>
              <button
                onClick={() => setIsChatOpen(false)}
                className="text-gray-400 hover:text-white"
              >
                ✕
              </button>
            </div>
            
            <div className="h-96 overflow-y-auto p-4 space-y-3">
              {chatHistory.map((msg, index) => (
                <div
                  key={index}
                  className={`${
                    msg.role === 'user'
                      ? 'text-right'
                      : 'text-left'
                  }`}
                >
                  <div
                    className={`inline-block max-w-[80%] p-3 rounded-lg ${
                      msg.role === 'user'
                        ? 'bg-blue-600 text-white'
                        : 'bg-gray-700 text-gray-100'
                    }`}
                  >
                    {msg.content}
                    {msg.actionResult?.success && (
                      <div className="mt-2 text-xs text-green-400">
                        ✅ {msg.actionResult.message}
                      </div>
                    )}
                  </div>
                </div>
              ))}
            </div>
            
            <div className="p-4 border-t border-gray-700">
              <div className="flex gap-2">
                <input
                  type="text"
                  value={chatMessage}
                  onChange={(e) => setChatMessage(e.target.value)}
                  onKeyPress={(e) => e.key === 'Enter' && sendChatMessage()}
                  placeholder="Ask AI to manage tasks, analyze meetings, or help with productivity..."
                  className="flex-1 px-3 py-2 bg-gray-700 rounded-lg text-white placeholder-gray-400"
                />
                <button
                  onClick={sendChatMessage}
                  className="px-4 py-2 bg-purple-600 rounded-lg hover:bg-purple-700 transition-colors"
                >
                  ➤
                </button>
              </div>
            </div>
          </div>
        ) : (
          <button
            onClick={() => setIsChatOpen(true)}
            className="p-4 bg-purple-600 rounded-full hover:bg-purple-700 transition-colors shadow-lg"
          >
            <span className="text-2xl">➤</span>
          </button>
        )}
      </div>
    </div>
  );
}

export default App;