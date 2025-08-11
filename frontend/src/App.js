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