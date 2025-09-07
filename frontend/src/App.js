import React, { useState, useEffect, useCallback, useMemo } from 'react';
import io from 'socket.io-client';
import { Send, MessageCircle, Users, Clock, RotateCcw, ChevronDown, Calendar, Plus, Archive, Mail, CheckCircle, LogOut, User } from 'lucide-react';
import MagicInbox from './components/MagicInbox';
import SupaDashboard from './components/SupaDashboard';
import ProductionTab from './components/ProductionTab';
import ExpandableCard from './components/ExpandableCard';
import GmailBoxEnhanced from './components/GmailBoxEnhanced';  // Changed to Enhanced component
import './App.css';
import './App.enhanced.css';

const App = () => {
  const [tasks, setTasks] = useState([]);
  const [notionTasks, setNotionTasks] = useState([]);
  const [filteredNotionTasks, setFilteredNotionTasks] = useState([]);
  const [meetings, setMeetings] = useState([]);
  const [calendarEvents, setCalendarEvents] = useState([]);
  const [isConnected, setIsConnected] = useState(false);
  const [activeTab, setActiveTab] = useState('dashboard');
  const [apiStatus, setApiStatus] = useState({});
  const [showIntegrations, setShowIntegrations] = useState(false);
  const [darkMode, setDarkMode] = useState(true);
  const [chatMessages, setChatMessages] = useState([]);
  const [chatInput, setChatInput] = useState('');
  const [isAITyping, setIsAITyping] = useState(false);
  const [showChat, setShowChat] = useState(false);
  const [selectedPerson, setSelectedPerson] = useState('All');
  const [showPersonDropdown, setShowPersonDropdown] = useState(false);
  const [isLoadingNotion, setIsLoadingNotion] = useState(false);
  const [isLoadingCalendar, setIsLoadingCalendar] = useState(false);
  const [isLoadingMeetings, setIsLoadingMeetings] = useState(false);
  const [pushingToNotion, setPushingToNotion] = useState({});
  const [availableTeamMembers, setAvailableTeamMembers] = useState(['All']);
  const [userEmail, setUserEmail] = useState(null);
  const [showUserMenu, setShowUserMenu] = useState(false);

  const teamMembers = useMemo(() => ['All', 'Alec', 'Leo', 'Steph', 'Pablo', 'Alexa', 'Anthony', 'Dany', 'Mathieu'], []);

  const loadNotionTasks = useCallback(async () => {
    setIsLoadingNotion(true);
    try {
      const response = await fetch('http://localhost:3001/api/notion/tasks');
      const data = await response.json();
      
      const pendingTasks = (data.tasks || [])
        .filter(task => task.status !== 'completed' && task.status !== 'Done')
        .map(task => ({
          ...task,
          assignedTo: task.assignee || task.assignedTo || 'Unassigned',
          dueDate: task.dueDate || task.deadline || null,
          type: task.type || null,
          brandProject: task.brandProject || null
        }));
      
      const uniqueAssignees = [...new Set(pendingTasks
        .map(t => t.assignedTo)
        .filter(a => a && a !== 'Unassigned')
      )];
      
      setAvailableTeamMembers(['All', ...uniqueAssignees.sort()]);
      setNotionTasks(pendingTasks);
    } catch (error) {
      console.error('Failed to load Notion tasks:', error);
    } finally {
      setIsLoadingNotion(false);
    }
  }, []);

  const loadUserProfile = async () => {
    try {
      const response = await fetch('http://localhost:3001/api/auth/profile');
      const data = await response.json();
      if (data.success && data.profile && data.profile.email) {
        setUserEmail(data.profile.email);
        localStorage.setItem('userEmail', data.profile.email);
      } else {
        const storedEmail = localStorage.getItem('userEmail');
        if (storedEmail) {
          setUserEmail(storedEmail);
        }
      }
    } catch (error) {
      console.error('Failed to load user profile:', error);
      const storedEmail = localStorage.getItem('userEmail');
      if (storedEmail) {
        setUserEmail(storedEmail);
      }
    }
  };

  const handleLogout = async () => {
    if (!window.confirm('Are you sure you want to logout? This will clear all integration tokens.')) {
      return;
    }

    try {
      localStorage.clear();
      sessionStorage.clear();
      
      await fetch('http://localhost:3001/api/auth/logout', {
        method: 'POST',
        credentials: 'include'
      });
      
      setUserEmail(null);
      setApiStatus({});
      setIsConnected(false);
      
      window.location.reload();
    } catch (error) {
      console.error('Logout error:', error);
      localStorage.clear();
      sessionStorage.clear();
      window.location.reload();
    }
  };

  useEffect(() => {
    const socket = io('http://localhost:3001');
    socket.on('connect', () => setIsConnected(true));
    socket.on('disconnect', () => setIsConnected(false));
    
    loadNotionTasks();
    loadMeetings();
    loadCalendarEvents();
    loadApiStatus();
    loadUserProfile();
    
    const savedDarkMode = localStorage.getItem('darkMode');
    setDarkMode(savedDarkMode !== 'false');
    
    return () => socket.close();
  }, [loadNotionTasks]);

  useEffect(() => {
    if (darkMode) {
      document.documentElement.classList.add('dark');
    } else {
      document.documentElement.classList.remove('dark');
    }
    localStorage.setItem('darkMode', darkMode);
  }, [darkMode]);

  useEffect(() => {
    if (selectedPerson === 'All') {
      setFilteredNotionTasks(notionTasks);
    } else {
      setFilteredNotionTasks(notionTasks.filter(task => 
        task.assignedTo && task.assignedTo.includes(selectedPerson)
      ));
    }
  }, [notionTasks, selectedPerson]);

  const loadMeetings = async () => {
    setIsLoadingMeetings(true);
    try {
      const slackResponse = await fetch('http://localhost:3001/api/slack-fireflies/meetings');
      const slackData = await slackResponse.json();
      
      if (slackData.success && slackData.meetings && slackData.meetings.length > 0) {
        setMeetings(slackData.meetings);
        return;
      }
      
      const response = await fetch('http://localhost:3001/api/fireflies/meetings');
      const data = await response.json();
      setMeetings(data.meetings || []);
    } catch (error) {
      console.error('Failed to load meetings:', error);
      setMeetings([]);
    } finally {
      setIsLoadingMeetings(false);
    }
  };

  const loadCalendarEvents = async () => {
    setIsLoadingCalendar(true);
    try {
      const response = await fetch('http://localhost:3001/api/calendar/next-meetings?limit=5');
      const data = await response.json();
      
      if (data.success && data.meetings) {
        const events = data.meetings.map(meeting => ({
          id: meeting.id,
          title: meeting.title,
          startTime: meeting.start,
          endTime: meeting.end,
          attendees: meeting.attendees || [],
          attendeeCount: meeting.attendeeCount || meeting.attendees?.length || 0,
          location: meeting.location,
          meetLink: meeting.meetLink,
          allDay: meeting.allDay,
          description: meeting.description,
          timeUntil: meeting.timeUntil,
          timeUntilStatus: meeting.timeUntilStatus,
          timeUntilDetails: meeting.timeUntilDetails,
          organizer: meeting.organizer
        }));
        
        setCalendarEvents(events);
      } else {
        setCalendarEvents([]);
      }
    } catch (error) {
      console.error('Failed to load calendar events:', error);
      setCalendarEvents([]);
    } finally {
      setIsLoadingCalendar(false);
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

  const pushActionItemToNotion = async (actionItem, assignee, meeting, taskIndex, assigneeIndex) => {
    let taskText = '';
    let taskAssignee = 'Team';
    
    if (typeof actionItem === 'string') {
      taskText = actionItem;
      taskAssignee = assignee || 'Team';
    } else if (typeof actionItem === 'object' && actionItem.task) {
      taskText = actionItem.task;
      taskAssignee = actionItem.assignee || 'Team';
    } else {
      taskText = actionItem;
    }
    
    const editedText = prompt("Edit task before sending to Notion:", taskText);
    if (!editedText) return;
    
    if (taskAssignee === 'Team') {
      teamMembers.slice(1).forEach(member => {
        if (editedText.toLowerCase().includes(member.toLowerCase())) {
          taskAssignee = member;
        }
      });
    }
    
    let priority = "Medium";
    if (editedText.match(/urgent|asap|immediately|critical/i)) {
      priority = "Urgent";
    } else if (editedText.match(/important|priority|soon/i)) {
      priority = "High";
    } else if (editedText.match(/later|eventually|consider/i)) {
      priority = "Low";
    }
    
    const dueDate = new Date();
    if (editedText.match(/today/i)) {
      // Keep today
    } else if (editedText.match(/tomorrow/i)) {
      dueDate.setDate(dueDate.getDate() + 1);
    } else if (editedText.match(/this week/i)) {
      dueDate.setDate(dueDate.getDate() + 7);
    } else {
      dueDate.setDate(dueDate.getDate() + 7);
    }
    
    const loadingKey = `${meeting.id}-${assigneeIndex}-${taskIndex}`;
    setPushingToNotion(prev => ({ ...prev, [loadingKey]: true }));
    
    try {
      const response = await fetch('http://localhost:3001/api/notion/tasks', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          title: editedText,
          assignee: taskAssignee,
          priority: priority,
          dueDate: dueDate.toISOString().split('T')[0],
          source: `Fireflies: ${meeting.title}`,
          meetingUrl: meeting.firefliesUrl || meeting.meetingUrl || '#'
        })
      });
      
      if (response.ok) {
        alert(`✅ Added to Notion!\n\nTask: ${editedText}\nAssigned to: ${taskAssignee}\nPriority: ${priority}`);
        loadNotionTasks();
      } else {
        alert('❌ Failed to add to Notion. Check your integration.');
      }
    } catch (error) {
      console.error('Error pushing to Notion:', error);
      alert('❌ Error connecting to Notion');
    } finally {
      setPushingToNotion(prev => ({ ...prev, [loadingKey]: false }));
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
            meetings: meetings.slice(0, 3)
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

  const completeTask = async (taskId) => {
    try {
      const response = await fetch(`http://localhost:3001/api/tasks/${taskId}/complete`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' }
      });
      const result = await response.json();
      if (result.success) {
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

  const getTimeColor = (status) => {
    switch(status) {
      case 'imminent': return 'text-red-400';
      case 'soon': return 'text-yellow-400';
      case 'ongoing': return 'text-green-400';
      case 'past': return 'text-gray-500';
      default: return 'text-blue-400';
    }
  };

  return (
    <div className="min-h-screen">
      {/* Header */}
      <div className="header-glass p-4 sticky top-0 z-40">
        <div className="flex justify-between items-center">
          <div className="flex items-center gap-3">
            <div className="dgenz-logo">🧭</div>
            <h1 className="text-3xl font-bold text-glow">DGenz Hub</h1>
          </div>
          <div className="flex gap-4 items-center">
            <button
              onClick={() => setDarkMode(!darkMode)}
              className="btn-glass p-2 rounded-lg"
            >
              {darkMode ? '☀️' : '🌙'}
            </button>
            
            <span className={`glass px-3 py-1 rounded-full ${isConnected ? 'text-green-400' : 'text-red-400'}`}>
              <div className={`inline-block w-2 h-2 rounded-full mr-2 ${isConnected ? 'status-connected' : 'status-disconnected'}`}></div>
              {isConnected ? 'Connected' : 'Disconnected'}
            </span>
            
            <button
              onClick={() => setShowIntegrations(!showIntegrations)}
              className="btn-glass px-3 py-2 rounded-lg flex items-center gap-2"
            >
              <span className="text-sm">
                🔗 {connectedCount}/{integrations.length}
              </span>
            </button>
            
            <div className="relative">
              <button
                onClick={() => setShowUserMenu(!showUserMenu)}
                className="btn-glass px-3 py-2 rounded-lg flex items-center gap-2"
              >
                <User size={16} />
                {userEmail ? (
                  <span className="text-sm max-w-[150px] truncate">{userEmail}</span>
                ) : (
                  <span className="text-sm">Not logged in</span>
                )}
                <ChevronDown size={14} className={`transition-transform ${showUserMenu ? 'rotate-180' : ''}`} />
              </button>
              
              {showUserMenu && (
                <div className="absolute top-full right-0 mt-2 w-48 glass rounded-lg overflow-hidden">
                  {userEmail && (
                    <div className="px-4 py-3 border-b border-gray-700">
                      <p className="text-xs opacity-60">Logged in as</p>
                      <p className="text-sm font-medium truncate">{userEmail}</p>
                    </div>
                  )}
                  
                  {!userEmail && (
                    <a
                      href="http://localhost:3001/auth/google"
                      target="_blank"
                      rel="noopener noreferrer"
                      className="block px-4 py-3 hover:bg-white hover:bg-opacity-10 transition-all"
                    >
                      <div className="flex items-center gap-2">
                        <User size={14} />
                        <span className="text-sm">Login with Google</span>
                      </div>
                    </a>
                  )}
                  
                  <button
                    onClick={handleLogout}
                    className="w-full px-4 py-3 hover:bg-white hover:bg-opacity-10 transition-all text-left"
                  >
                    <div className="flex items-center gap-2 text-red-400">
                      <LogOut size={14} />
                      <span className="text-sm">Logout</span>
                    </div>
                  </button>
                </div>
              )}
            </div>
          </div>
        </div>
        
        <div className="flex gap-2 mt-4">
          {['dashboard', 'magic-inbox', 'production', 'supa', 'integrations'].map(tab => (
            <button
              key={tab}
              onClick={() => setActiveTab(tab)}
              className={`px-4 py-2 rounded-lg transition-all ${
                activeTab === tab 
                  ? 'bg-blue-500 bg-opacity-80 text-white' 
                  : 'btn-glass'
              }`}
            >
              {tab === 'magic-inbox' ? '✨ Magic Inbox' : 
               tab === 'production' ? '🎬 Production' :
               tab === 'supa' ? '🗄️ SUPA' :
               tab.charAt(0).toUpperCase() + tab.slice(1)}
            </button>
          ))}
        </div>
      </div>

      {/* Integration Status */}
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
            <ExpandableCard
              title="Notion Tasks"
              icon="📝"
              count={filteredNotionTasks.length}
              onRefresh={loadNotionTasks}
              isLoading={isLoadingNotion}
              className="expandable-hover"
              collapsedHeight="max-h-[600px]"
            >
              <div className="flex items-center gap-3 mb-4">
                <div className="relative">
                  <button
                    onClick={() => setShowPersonDropdown(!showPersonDropdown)}
                    className="btn-glass px-3 py-2 rounded-lg flex items-center gap-2 text-sm"
                  >
                    {selectedPerson}
                    <ChevronDown size={14} className={`transition-transform ${showPersonDropdown ? 'rotate-180' : ''}`} />
                  </button>
                  
                  {showPersonDropdown && (
                    <div className="absolute top-full left-0 mt-1 w-32 glass rounded-lg overflow-hidden z-50">
                      {availableTeamMembers.map(person => (
                        <button
                          key={person}
                          onClick={() => {
                            setSelectedPerson(person);
                            setShowPersonDropdown(false);
                          }}
                          className={`w-full px-3 py-2 text-left text-sm hover:bg-white hover:bg-opacity-10 transition-all ${
                            selectedPerson === person ? 'bg-blue-500 bg-opacity-30' : ''
                          }`}
                        >
                          {person}
                        </button>
                      ))}
                    </div>
                  )}
                </div>
              </div>
              
              {filteredNotionTasks.length === 0 ? (
                <p className="opacity-70 text-center py-8">
                  {selectedPerson === 'All' 
                    ? 'No pending tasks found.'
                    : `No pending tasks for ${selectedPerson}.`
                  }
                </p>
              ) : (
                <div className="space-y-2">
                  {filteredNotionTasks.map(task => (
                    <div key={task.id} className="task-card">
                      <div className="flex justify-between items-start">
                        <div className="flex-1">
                          <h4 className="font-medium text-sm">{task.title || task.name}</h4>
                          <div className="flex items-center gap-2 text-xs opacity-70 mt-1">
                            <span>👤 {task.assignedTo}</span>
                            {task.priority && (
                              <span className={`px-1 py-0.5 rounded text-xs priority-${
                                task.priority === 'High' ? 'high' :
                                task.priority === 'Medium' ? 'medium' : 'low'
                              }`}>
                                {task.priority}
                              </span>
                            )}
                            {task.dueDate && (
                              <span className="text-yellow-400">
                                {new Date(task.dueDate).toLocaleDateString()}
                              </span>
                            )}
                          </div>
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
            </ExpandableCard>

            {/* Middle Column - Calendar + Meetings */}
            <div className="space-y-6">
              <ExpandableCard
                title="Calendar"
                icon={<Calendar size={20} className="text-blue-400" />}
                count={calendarEvents.length}
                onRefresh={loadCalendarEvents}
                isLoading={isLoadingCalendar}
                className="expandable-hover"
              >
                {calendarEvents.length === 0 ? (
                  <p className="opacity-70 text-center py-4">No upcoming events.</p>
                ) : (
                  <div className="space-y-2">
                    {calendarEvents.map(event => (
                      <div key={event.id} className="task-card">
                        <div className="flex justify-between items-start mb-2">
                          <h4 className="font-medium text-sm flex-1">{event.title}</h4>
                          {event.timeUntil && (
                            <span className={`text-xs font-semibold ${getTimeColor(event.timeUntilStatus)}`}>
                              {event.timeUntil}
                            </span>
                          )}
                        </div>
                        <div className="text-xs opacity-70">
                          📅 {new Date(event.startTime).toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'})}
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </ExpandableCard>

              <ExpandableCard
                title="Meetings"
                icon="🎙️"
                count={meetings.length}
                onRefresh={loadMeetings}
                isLoading={isLoadingMeetings}
                className="expandable-hover"
              >
                {meetings.length === 0 ? (
                  <p className="opacity-70 text-center py-4">No meetings found.</p>
                ) : (
                  <div className="space-y-2">
                    {meetings.map(meeting => (
                      <div key={meeting.id} className="task-card">
                        <h4 className="font-medium text-sm">{meeting.title}</h4>
                        <div className="flex items-center gap-4 mt-2 text-xs opacity-70">
                          <span><Users size={12} className="inline" /> {meeting.attendees || 0}</span>
                          <span><Clock size={12} className="inline" /> {meeting.duration || '0m'}</span>
                        </div>
                        {meeting.actionItems && meeting.actionItems.length > 0 && (
                          <div className="mt-2">
                            {meeting.actionItems.map((item, idx) => {
                              if (typeof item === 'object' && item.tasks) {
                                return (
                                  <div key={idx} className="mt-2">
                                    <div className="text-xs opacity-70">👤 {item.assignee}:</div>
                                    {item.tasks.map((task, taskIdx) => (
                                      <div key={taskIdx} className="flex items-center gap-2 ml-3 mt-1">
                                        <span className="text-xs opacity-60">• {task}</span>
                                        <button
                                          onClick={() => pushActionItemToNotion(task, item.assignee, meeting, taskIdx, idx)}
                                          disabled={pushingToNotion[`${meeting.id}-${idx}-${taskIdx}`]}
                                          className="btn-glass px-2 py-0.5 text-xs rounded"
                                        >
                                          {pushingToNotion[`${meeting.id}-${idx}-${taskIdx}`] ? (
                                            <div className="loading-spinner border-white w-3 h-3"></div>
                                          ) : (
                                            <>
                                              <Plus size={10} className="inline" /> Notion
                                            </>
                                          )}
                                        </button>
                                      </div>
                                    ))}
                                  </div>
                                );
                              }
                              return null;
                            })}
                          </div>
                        )}
                      </div>
                    ))}
                  </div>
                )}
              </ExpandableCard>
            </div>

            {/* Right Column - Enhanced Gmail Box Component */}
            <div className="h-[600px]">
              <GmailBoxEnhanced />
            </div>
          </div>
        )}

        {activeTab === 'magic-inbox' && <MagicInbox />}
        {activeTab === 'production' && <ProductionTab />}
        {activeTab === 'supa' && <SupaDashboard />}

        {activeTab === 'integrations' && (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {integrations.map(integration => (
              <div key={integration.name} className="card-glass p-6">
                <div className="flex items-center gap-3 mb-4">
                  <span className="text-2xl">{integration.icon}</span>
                  <div>
                    <h3 className="font-bold">{integration.name}</h3>
                    <p className="text-sm opacity-70">{integration.description}</p>
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

      {/* Chat Interface */}
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
