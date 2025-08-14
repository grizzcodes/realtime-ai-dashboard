import React, { useState, useEffect, useCallback, useMemo } from 'react';
import io from 'socket.io-client';
import { Send, MessageCircle, Users, Clock, RotateCcw, ChevronDown, Calendar, Plus, Archive, Mail, CheckCircle } from 'lucide-react';
import MagicInbox from './components/MagicInbox';
import SupaDashboard from './components/SupaDashboard';
import ProductionTab from './components/ProductionTab';
import ExpandableCard from './components/ExpandableCard';
import './App.css';
import './App.enhanced.css';

const App = () => {
  const [tasks, setTasks] = useState([]);
  const [notionTasks, setNotionTasks] = useState([]);
  const [filteredNotionTasks, setFilteredNotionTasks] = useState([]);
  const [emails, setEmails] = useState([]);
  const [meetings, setMeetings] = useState([]);
  const [calendarEvents, setCalendarEvents] = useState([]);
  const [isConnected, setIsConnected] = useState(false);
  const [activeTab, setActiveTab] = useState('dashboard');
  const [apiStatus, setApiStatus] = useState({});
  const [showIntegrations, setShowIntegrations] = useState(false);
  const [darkMode, setDarkMode] = useState(true); // DEFAULT TO DARK MODE
  const [chatMessages, setChatMessages] = useState([]);
  const [chatInput, setChatInput] = useState('');
  const [isAITyping, setIsAITyping] = useState(false);
  const [showChat, setShowChat] = useState(false);
  const [selectedPerson, setSelectedPerson] = useState('All');
  const [showPersonDropdown, setShowPersonDropdown] = useState(false);
  const [isLoadingNotion, setIsLoadingNotion] = useState(false);
  const [isLoadingEmails, setIsLoadingEmails] = useState(false);
  const [isLoadingCalendar, setIsLoadingCalendar] = useState(false);
  const [isLoadingMeetings, setIsLoadingMeetings] = useState(false);
  const [pushingToNotion, setPushingToNotion] = useState({});
  const [availableTeamMembers, setAvailableTeamMembers] = useState(['All']);
  const [archivingEmails, setArchivingEmails] = useState({});
  const [archivedEmails, setArchivedEmails] = useState({});

  // Use useMemo to prevent recreating on every render
  const teamMembers = useMemo(() => ['All', 'Alec', 'Leo', 'Steph', 'Pablo', 'Alexa', 'Anthony', 'Dany', 'Mathieu'], []);

  const loadNotionTasks = useCallback(async () => {
    setIsLoadingNotion(true);
    try {
      const response = await fetch('http://localhost:3001/api/notion/tasks');
      const data = await response.json();
      
      // Filter out completed tasks and properly map assignee
      const pendingTasks = (data.tasks || [])
        .filter(task => task.status !== 'completed' && task.status !== 'Done')
        .map(task => ({
          ...task,
          // Use assignee from backend (not assignedTo) and DON'T override with random
          assignedTo: task.assignee || task.assignedTo || 'Unassigned',
          dueDate: task.dueDate || task.deadline || null,
          type: task.type || null,  // Add type field
          brandProject: task.brandProject || null  // Add brand/project field
        }));
      
      // Extract unique assignees from actual Notion data
      const uniqueAssignees = [...new Set(pendingTasks
        .map(t => t.assignedTo)
        .filter(a => a && a !== 'Unassigned')
      )];
      
      // Update available team members with actual Notion users
      setAvailableTeamMembers(['All', ...uniqueAssignees.sort()]);
      
      setNotionTasks(pendingTasks);
    } catch (error) {
      console.error('Failed to load Notion tasks:', error);
    } finally {
      setIsLoadingNotion(false);
    }
  }, []);

  useEffect(() => {
    const socket = io('http://localhost:3001');
    socket.on('connect', () => setIsConnected(true));
    socket.on('disconnect', () => setIsConnected(false));
    
    // Listen for email updates
    socket.on('emailUpdate', (data) => {
      console.log('📧 Email update received:', data);
      if (data.type === 'email_archived') {
        loadEmails();
      }
    });
    
    loadNotionTasks();
    loadEmails();
    loadMeetings();
    loadCalendarEvents();
    loadApiStatus();
    
    // Check for saved dark mode preference, default to true
    const savedDarkMode = localStorage.getItem('darkMode');
    setDarkMode(savedDarkMode !== 'false'); // Default to true unless explicitly set to false
    
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
    // Filter Notion tasks when selection changes
    if (selectedPerson === 'All') {
      setFilteredNotionTasks(notionTasks);
    } else {
      setFilteredNotionTasks(notionTasks.filter(task => 
        task.assignedTo && task.assignedTo.includes(selectedPerson)
      ));
    }
  }, [notionTasks, selectedPerson]);

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
    setArchivingEmails(prev => ({ ...prev, [emailId]: true }));
    
    try {
      const response = await fetch(`http://localhost:3001/api/gmail/archive/${emailId}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' }
      });
      
      const result = await response.json();
      
      if (result.success) {
        console.log('✅ Email archived successfully');
        setArchivedEmails(prev => ({ ...prev, [emailId]: true }));
        
        // Remove email after animation
        setTimeout(() => {
          setEmails(prev => prev.filter(e => e.id !== emailId));
          setArchivedEmails(prev => {
            const newState = { ...prev };
            delete newState[emailId];
            return newState;
          });
        }, 1500);
      } else {
        console.error('Failed to archive email');
        alert('Failed to archive email. Please try again.');
      }
    } catch (error) {
      console.error('Failed to archive email:', error);
      alert('Error archiving email. Please try again.');
    } finally {
      setArchivingEmails(prev => {
        const newState = { ...prev };
        delete newState[emailId];
        return newState;
      });
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
        alert(`Draft Reply Generated:\n\n${data.draftContent}`);
      } else {
        console.error('Failed to generate draft');
      }
    } catch (error) {
      console.error('Failed to generate draft:', error);
    }
  };

  const loadMeetings = async () => {
    setIsLoadingMeetings(true);
    try {
      // First try Slack Fireflies (real meetings from Slack)
      const slackResponse = await fetch('http://localhost:3001/api/slack-fireflies/meetings');
      const slackData = await slackResponse.json();
      
      console.log('Slack Fireflies response:', slackData);
      
      if (slackData.success && slackData.meetings && slackData.meetings.length > 0) {
        console.log('Loading REAL meetings from Slack:', slackData.meetings.length);
        setMeetings(slackData.meetings);
        return;
      }
      
      // Fallback to regular Fireflies API
      const response = await fetch('http://localhost:3001/api/fireflies/meetings');
      const data = await response.json();
      console.log('Fireflies API meetings:', data.meetings);
      setMeetings(data.meetings || []);
    } catch (error) {
      console.error('Failed to load meetings:', error);
      // Add fallback data for testing
      setMeetings([
        {
          id: 'demo-1',
          title: 'Weekly Team Standup',
          date: new Date().toISOString(),
          duration: '30m',
          attendees: 5,
          summary: 'Discussed sprint progress, blockers, and upcoming deadlines. Team is on track for release.',
          actionItems: ['Review sprint goals', 'Update client on progress', 'Schedule design review']
        },
        {
          id: 'demo-2', 
          title: 'Client Discovery Call - TechCorp',
          date: new Date(Date.now() - 24*60*60*1000).toISOString(),
          duration: '45m',
          attendees: 3,
          summary: 'Initial discovery call with TechCorp to understand their requirements for the new platform.',
          actionItems: ['Send proposal draft', 'Schedule technical demo']
        }
      ]);
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
        // Transform the calendar data to match our frontend format with enhanced time info
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
          // Enhanced time information
          timeUntil: meeting.timeUntil,
          timeUntilStatus: meeting.timeUntilStatus,
          timeUntilDetails: meeting.timeUntilDetails,
          organizer: meeting.organizer
        }));
        
        // Check if using demo data
        if (data.demo) {
          console.log('📅 Using demo calendar data (configure Google OAuth for real events)');
        } else if (data.needsAuth) {
          console.log('📅 Calendar auth expired - please re-authenticate');
        }
        
        setCalendarEvents(events);
      } else {
        // Use fallback data if the API call fails
        console.log('Calendar API returned no data, using fallback');
        setCalendarEvents([
          {
            id: 'cal-1',
            title: 'Product Launch Review',
            startTime: new Date(Date.now() + 2*60*60*1000).toISOString(),
            endTime: new Date(Date.now() + 3*60*60*1000).toISOString(),
            attendees: ['Alec', 'Leo', 'Steph'],
            timeUntil: '2 hours',
            timeUntilStatus: 'soon'
          },
          {
            id: 'cal-2',
            title: 'Client Onboarding',
            startTime: new Date(Date.now() + 24*60*60*1000).toISOString(),
            endTime: new Date(Date.now() + 25*60*60*1000).toISOString(),
            attendees: ['Pablo', 'Alexa'],
            timeUntil: '1 day',
            timeUntilStatus: 'upcoming'
          }
        ]);
      }
    } catch (error) {
      console.error('Failed to load calendar events:', error);
      // Use fallback data
      setCalendarEvents([
        {
          id: 'cal-1',
          title: 'Product Launch Review',
          startTime: new Date(Date.now() + 2*60*60*1000).toISOString(),
          endTime: new Date(Date.now() + 3*60*60*1000).toISOString(),
          attendees: ['Alec', 'Leo', 'Steph'],
          timeUntil: '2 hours',
          timeUntilStatus: 'soon'
        },
        {
          id: 'cal-2',
          title: 'Client Onboarding',
          startTime: new Date(Date.now() + 24*60*60*1000).toISOString(),
          endTime: new Date(Date.now() + 25*60*60*1000).toISOString(),
          attendees: ['Pablo', 'Alexa'],
          timeUntil: '1 day',
          timeUntilStatus: 'upcoming'
        }
      ]);
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

  // Push action item to Notion - UPDATED to handle the new structure with tasks array
  const pushActionItemToNotion = async (actionItem, assignee, meeting, taskIndex, assigneeIndex) => {
    // Extract the task text and assignee
    let taskText = '';
    let taskAssignee = 'Team';
    
    if (typeof actionItem === 'string') {
      // This is a specific task string with an assignee
      taskText = actionItem;
      taskAssignee = assignee || 'Team';
    } else if (typeof actionItem === 'object' && actionItem.task) {
      // Old format with task property
      taskText = actionItem.task;
      taskAssignee = actionItem.assignee || 'Team';
    } else {
      // Fallback
      taskText = actionItem;
    }
    
    // Quick edit popup
    const editedText = prompt("Edit task before sending to Notion:", taskText);
    if (!editedText) return;
    
    // Keep the assignee from the action item or auto-detect from edited text
    if (taskAssignee === 'Team') {
      teamMembers.slice(1).forEach(member => {
        if (editedText.toLowerCase().includes(member.toLowerCase())) {
          taskAssignee = member;
        }
      });
    }
    
    // Auto-detect priority
    let priority = "Medium";
    if (editedText.match(/urgent|asap|immediately|critical/i)) {
      priority = "Urgent";
    } else if (editedText.match(/important|priority|soon/i)) {
      priority = "High";
    } else if (editedText.match(/later|eventually|consider/i)) {
      priority = "Low";
    }
    
    // Set a due date (default to 1 week from now)
    const dueDate = new Date();
    if (editedText.match(/today/i)) {
      // Keep today
    } else if (editedText.match(/tomorrow/i)) {
      dueDate.setDate(dueDate.getDate() + 1);
    } else if (editedText.match(/this week/i)) {
      dueDate.setDate(dueDate.getDate() + 7);
    } else {
      dueDate.setDate(dueDate.getDate() + 7); // Default 1 week
    }
    
    // Set loading state
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
        // Reload Notion tasks to show the new one
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
            emails: emails.slice(0, 3),
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

  const testAI = async () => {
    try {
      const response = await fetch('http://localhost:3001/api/ai-test', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ message: 'Test message' })
      });
      const result = await response.json();
      console.log('AI Test Result:', result);
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

  // Helper function to get time color
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
      {/* Header with DGenz logo */}
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
            
            <button onClick={testAI} className="btn-glass px-4 py-2 rounded-lg">
              🧪 Test AI
            </button>
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
            {/* Left Column - Notion Tasks with ExpandableCard - INCREASED HEIGHT */}
            <ExpandableCard
              title="Notion Tasks"
              icon="📝"
              count={filteredNotionTasks.length}
              onRefresh={loadNotionTasks}
              isLoading={isLoadingNotion}
              className="expandable-hover"
              collapsedHeight="max-h-[600px]"  // INCREASED HEIGHT FROM DEFAULT 384px TO 600px
              expandedContent={
                <>
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
                  
                  <div className="space-y-3 expanded-content">
                    {filteredNotionTasks.map(task => (
                      <div key={task.id} className="task-card">
                        <div className="flex justify-between items-start">
                          <div className="flex-1">
                            <h4 className="font-medium">{task.title || task.name}</h4>
                            <div className="flex items-center gap-3 mt-2 text-xs opacity-70">
                              <span>👤 {task.assignedTo}</span>
                              {task.type && (
                                <span className="px-2 py-0.5 bg-purple-500 bg-opacity-20 rounded">
                                  🏷️ {task.type}
                                </span>
                              )}
                              {task.dueDate && (
                                <span>📅 {new Date(task.dueDate).toLocaleDateString()}</span>
                              )}
                            </div>
                            {task.priority && (
                              <span className={`inline-block mt-2 px-2 py-1 text-xs rounded priority-${
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
                </>
              }
            >
              {/* Collapsed view - SHOWING TASKS WITH TYPE AND DUE DATE */}
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
                    ? 'No pending tasks found. Check your Notion integration.'
                    : `No pending tasks for ${selectedPerson}.`
                  }
                </p>
              ) : (
                <div className="space-y-2">
                  {filteredNotionTasks.slice(0, filteredNotionTasks.length).map(task => (
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
                            {task.type && (
                              <span className="px-1.5 py-0.5 bg-purple-500 bg-opacity-20 rounded">
                                {task.type}
                              </span>
                            )}
                            {task.dueDate && (
                              <span className="text-yellow-400">
                                {new Date(task.dueDate).toLocaleDateString()}
                              </span>
                            )}
                          </div>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </ExpandableCard>

            {/* Middle Column - Calendar + Fireflies Meetings */}
            <div className="space-y-6">
              {/* Calendar Events with ExpandableCard - SHOWING MORE EVENTS */}
              <ExpandableCard
                title="Calendar"
                icon={<Calendar size={20} className="text-blue-400" />}
                count={calendarEvents.length}
                onRefresh={loadCalendarEvents}
                isLoading={isLoadingCalendar}
                className="expandable-hover"
                expandedContent={
                  <div className="space-y-3 expanded-content">
                    {calendarEvents.map(event => (
                      <div key={event.id} className="task-card">
                        <div className="flex justify-between items-start mb-2">
                          <h4 className="font-medium">{event.title}</h4>
                          {event.timeUntil && (
                            <span className={`text-sm font-semibold ${getTimeColor(event.timeUntilStatus)}`}>
                              {event.timeUntil}
                            </span>
                          )}
                        </div>
                        
                        <div className="flex items-center justify-between">
                          <div className="text-xs opacity-70">
                            📅 {new Date(event.startTime).toLocaleDateString()} • {new Date(event.startTime).toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'})}
                          </div>
                          {event.attendeeCount > 0 && (
                            <div className="text-xs opacity-60">
                              👥 {event.attendeeCount} attendee{event.attendeeCount !== 1 ? 's' : ''}
                            </div>
                          )}
                        </div>
                        
                        {event.location && (
                          <div className="text-xs opacity-60 mt-1">
                            📍 {event.location}
                          </div>
                        )}
                        
                        {event.meetLink && (
                          <a 
                            href={event.meetLink} 
                            target="_blank" 
                            rel="noopener noreferrer" 
                            className="inline-flex items-center gap-1 text-xs text-blue-400 hover:underline mt-2"
                          >
                            <svg className="w-3 h-3" fill="currentColor" viewBox="0 0 20 20">
                              <path d="M11 3a1 1 0 100 2h2.586l-6.293 6.293a1 1 0 101.414 1.414L15 6.414V9a1 1 0 102 0V4a1 1 0 00-1-1h-5z"/>
                              <path d="M5 5a2 2 0 00-2 2v8a2 2 0 002 2h8a2 2 0 002-2v-3a1 1 0 10-2 0v3H5V7h3a1 1 0 000-2H5z"/>
                            </svg>
                            Join Meeting
                          </a>
                        )}
                        
                        {event.description && (
                          <p className="text-xs opacity-50 mt-2">
                            {event.description}
                          </p>
                        )}
                      </div>
                    ))}
                  </div>
                }
              >
                {/* Collapsed view - SHOWING ALL EVENTS */}
                {calendarEvents.length === 0 ? (
                  <p className="opacity-70 text-center py-4">
                    No upcoming events.
                  </p>
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

              {/* Fireflies Meetings with ExpandableCard */}
              <ExpandableCard
                title="Meetings"
                icon="🎙️"
                count={meetings.length}
                onRefresh={loadMeetings}
                isLoading={isLoadingMeetings}
                className="expandable-hover"
                expandedContent={
                  <div className="space-y-3 expanded-content">
                    {meetings.map(meeting => (
                      <div key={meeting.id} className="task-card">
                        <div className="mb-3">
                          <h4 className="font-medium">{meeting.title}</h4>
                          <div className="flex items-center gap-4 mt-2 text-xs opacity-70">
                            <div className="flex items-center gap-1">
                              <Users size={12} />
                              <span>{meeting.attendees || 0} attendees</span>
                            </div>
                            <div className="flex items-center gap-1">
                              <Clock size={12} />
                              <span>{meeting.duration || '0m'}</span>
                            </div>
                          </div>
                        </div>
                        
                        {(meeting.summary || meeting.gist || meeting.overview) && (
                          <div className="mb-3">
                            <h5 className="text-xs font-medium opacity-80 mb-1">Summary:</h5>
                            <p className="text-xs opacity-70">
                              {meeting.summary || meeting.gist || meeting.overview}
                            </p>
                          </div>
                        )}
                        
                        {meeting.actionItems && meeting.actionItems.length > 0 && (
                          <div className="mb-3">
                            <h5 className="text-xs font-medium opacity-80 mb-1">Action Items:</h5>
                            <div className="space-y-2">
                              {meeting.actionItems.map((item, assigneeIndex) => {
                                // Check if this is the new format with assignee and tasks array
                                if (typeof item === 'object' && item.tasks && Array.isArray(item.tasks)) {
                                  // New format: { assignee: "Name", tasks: ["task1", "task2"] }
                                  return (
                                    <div key={assigneeIndex} className="ml-2">
                                      <div className="text-xs font-medium opacity-70 mb-1">
                                        👤 {item.assignee}:
                                      </div>
                                      <div className="space-y-1 ml-3">
                                        {item.tasks.map((task, taskIndex) => (
                                          <div key={taskIndex} className="flex items-center gap-2">
                                            <div className="flex-1">
                                              <p className="text-xs opacity-70">
                                                • {task}
                                              </p>
                                            </div>
                                            <button
                                              onClick={() => pushActionItemToNotion(task, item.assignee, meeting, taskIndex, assigneeIndex)}
                                              disabled={pushingToNotion[`${meeting.id}-${assigneeIndex}-${taskIndex}`]}
                                              className="btn-glass px-2 py-0.5 text-xs rounded flex items-center gap-1"
                                              title="Push to Notion"
                                            >
                                              {pushingToNotion[`${meeting.id}-${assigneeIndex}-${taskIndex}`] ? (
                                                <div className="loading-spinner border-white w-3 h-3"></div>
                                              ) : (
                                                <>
                                                  <Plus size={10} />
                                                  Notion
                                                </>
                                              )}
                                            </button>
                                          </div>
                                        ))}
                                      </div>
                                    </div>
                                  );
                                } else {
                                  // Old format: just a string or object with task property
                                  const taskText = typeof item === 'object' ? item.task : item;
                                  const assignee = typeof item === 'object' ? item.assignee : null;
                                  
                                  return (
                                    <div key={assigneeIndex} className="flex items-center gap-2">
                                      <div className="flex-1">
                                        <p className="text-xs opacity-70">
                                          • {taskText}
                                        </p>
                                        {assignee && (
                                          <span className="text-xs opacity-50 ml-3">
                                            👤 {assignee}
                                          </span>
                                        )}
                                      </div>
                                      <button
                                        onClick={() => pushActionItemToNotion(item, null, meeting, 0, assigneeIndex)}
                                        disabled={pushingToNotion[`${meeting.id}-${assigneeIndex}-0`]}
                                        className="btn-glass px-2 py-0.5 text-xs rounded flex items-center gap-1"
                                        title="Push to Notion"
                                      >
                                        {pushingToNotion[`${meeting.id}-${assigneeIndex}-0`] ? (
                                          <div className="loading-spinner border-white w-3 h-3"></div>
                                        ) : (
                                          <>
                                            <Plus size={10} />
                                            Notion
                                          </>
                                        )}
                                      </button>
                                    </div>
                                  );
                                }
                              })}
                            </div>
                          </div>
                        )}
                        
                        <div className="flex justify-between items-center">
                          <span className="text-xs opacity-60">
                            {new Date(meeting.date).toLocaleDateString()}
                          </span>
                          {meeting.firefliesUrl && meeting.firefliesUrl !== '#' && (
                            <a 
                              href={meeting.firefliesUrl || meeting.meetingUrl} 
                              target="_blank" 
                              rel="noopener noreferrer"
                              className="btn-glass px-2 py-1 text-xs rounded"
                            >
                              View
                            </a>
                          )}
                        </div>
                      </div>
                    ))}
                  </div>
                }
              >
                {/* Collapsed view - SHOWING MORE MEETINGS */}
                {meetings.length === 0 ? (
                  <p className="opacity-70 text-center py-4">
                    No meetings found.
                  </p>
                ) : (
                  <div className="space-y-2">
                    {meetings.map(meeting => (
                      <div key={meeting.id} className="task-card">
                        <h4 className="font-medium text-sm">{meeting.title}</h4>
                        <div className="flex items-center gap-4 mt-2 text-xs opacity-70">
                          <span><Users size={12} className="inline" /> {meeting.attendees || 0}</span>
                          <span><Clock size={12} className="inline" /> {meeting.duration || '0m'}</span>
                        </div>
                        {meeting.summary && (
                          <p className="text-xs opacity-60 mt-2 line-clamp-2">
                            {meeting.summary}
                          </p>
                        )}
                      </div>
                    ))}
                  </div>
                )}
              </ExpandableCard>
            </div>

            {/* Right Column - Emails with ExpandableCard - INCREASED HEIGHT TO MATCH NOTION */}
            <ExpandableCard
              title="Gmail"
              icon="📧"
              count={emails.length}
              onRefresh={loadEmails}
              isLoading={isLoadingEmails}
              className="expandable-hover"
              collapsedHeight="max-h-[600px]"  // INCREASED HEIGHT TO MATCH NOTION TASKS
              expandedContent={
                <div className="space-y-3 expanded-content">
                  {emails.map(email => (
                    <div 
                      key={email.id} 
                      className={`task-card email-card ${
                        archivingEmails[email.id] ? 'archiving' : ''
                      } ${
                        archivedEmails[email.id] ? 'email-archived archived-success' : ''
                      }`}
                    >
                      <div className="flex justify-between items-start">
                        <div className="flex-1">
                          <h4 className="font-medium">{email.subject}</h4>
                          <p className="text-sm opacity-70">
                            {email.from}
                          </p>
                          <p className="text-xs opacity-60 mt-2">
                            {email.snippet}
                          </p>
                        </div>
                        <div className="flex gap-1">
                          <button 
                            onClick={() => archiveEmail(email.id)}
                            disabled={archivingEmails[email.id] || archivedEmails[email.id]}
                            className={`btn-glass archive-btn px-2 py-1 text-xs rounded transition-all ${
                              archivedEmails[email.id] ? 'bg-green-500 bg-opacity-20' : ''
                            }`}
                            title="Archive Email"
                          >
                            {archivedEmails[email.id] ? (
                              <CheckCircle size={14} className="text-green-400" />
                            ) : archivingEmails[email.id] ? (
                              <div className="loading-spinner border-white w-3 h-3"></div>
                            ) : (
                              <Archive size={14} />
                            )}
                          </button>
                          <button 
                            onClick={() => generateDraftReply(email)}
                            className="btn-glass px-2 py-1 text-xs rounded"
                            title="Generate Draft Reply"
                          >
                            <Mail size={14} />
                          </button>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              }
            >
              {/* Collapsed view - SHOWING AT LEAST 10 EMAILS */}
              {emails.length === 0 ? (
                <p className="opacity-70 text-center py-8">
                  No emails found. Check your Gmail integration.
                </p>
              ) : (
                <div className="space-y-2">
                  {emails.slice(0, emails.length).map(email => (
                    <div 
                      key={email.id} 
                      className={`task-card email-card ${
                        archivingEmails[email.id] ? 'archiving' : ''
                      } ${
                        archivedEmails[email.id] ? 'email-archived archived-success' : ''
                      }`}
                    >
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
                        <div className="flex gap-1">
                          <button 
                            onClick={() => archiveEmail(email.id)}
                            disabled={archivingEmails[email.id] || archivedEmails[email.id]}
                            className={`btn-glass archive-btn px-2 py-1 text-xs rounded transition-all ${
                              archivedEmails[email.id] ? 'bg-green-500 bg-opacity-20' : ''
                            }`}
                            title="Archive Email"
                          >
                            {archivedEmails[email.id] ? (
                              <CheckCircle size={14} className="text-green-400" />
                            ) : archivingEmails[email.id] ? (
                              <div className="loading-spinner border-white w-3 h-3"></div>
                            ) : (
                              <Archive size={14} />
                            )}
                          </button>
                          <button 
                            onClick={() => generateDraftReply(email)}
                            className="btn-glass px-2 py-1 text-xs rounded"
                            title="Generate Draft Reply"
                          >
                            <Mail size={14} />
                          </button>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </ExpandableCard>
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

      {/* Enhanced AI Chat Box */}
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
            placeholder="Ask AI to manage tasks, analyze meetings, or help with productivity..."
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