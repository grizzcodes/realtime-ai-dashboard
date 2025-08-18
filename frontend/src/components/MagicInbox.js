import React, { useEffect, useState } from 'react';
import { 
  Sparkles, Calendar, MailQuestion, Clock4, RefreshCw, 
  CheckCircle2, AlertCircle, Mail, User, Clock, 
  ChevronDown, ChevronUp, Reply, Archive, Star,
  MessageSquare, ExternalLink, Paperclip
} from 'lucide-react';

export default function MagicInbox() {
  const [data, setData] = useState({
    replySuggestions: [],
    quickWins: [],
    upcomingTasks: [],
    waitingOn: []
  });

  const [emails, setEmails] = useState([]);
  const [expandedEmails, setExpandedEmails] = useState({});
  const [loadingThreads, setLoadingThreads] = useState({});
  const [emailThreads, setEmailThreads] = useState({});

  const [metadata, setMetadata] = useState({
    totalEmails: 0,
    totalTasks: 0,
    totalMeetings: 0,
    totalEvents: 0,
    lastUpdated: null,
    realTimeData: false,
    setupMode: false
  });

  const [isLoading, setIsLoading] = useState(true);
  const [lastRefresh, setLastRefresh] = useState(new Date());

  // Fetch emails that need replies
  const fetchEmails = async () => {
    try {
      const response = await fetch('http://localhost:3001/api/gmail/latest?limit=20');
      const data = await response.json();
      
      if (data.success && data.emails) {
        // Filter emails that likely need replies (unread or recent)
        const priorityEmails = data.emails.filter(email => 
          email.isUnread || 
          email.subject?.toLowerCase().includes('urgent') ||
          email.subject?.toLowerCase().includes('important') ||
          email.subject?.toLowerCase().includes('re:') ||
          email.subject?.toLowerCase().includes('action required')
        ).slice(0, 5); // Show top 5 priority emails
        
        setEmails(priorityEmails);
        
        // Update metadata
        setMetadata(prev => ({
          ...prev,
          totalEmails: data.emails.length,
          realTimeData: true
        }));
      }
    } catch (error) {
      console.error('Failed to fetch emails:', error);
    }
  };

  // Fetch email thread for context
  const fetchEmailThread = async (emailId, threadId) => {
    if (loadingThreads[emailId]) return;
    
    setLoadingThreads(prev => ({ ...prev, [emailId]: true }));
    
    try {
      const response = await fetch(`http://localhost:3001/api/gmail/thread/${threadId || emailId}`);
      const data = await response.json();
      
      if (data.success && data.messages) {
        setEmailThreads(prev => ({
          ...prev,
          [emailId]: data.messages
        }));
      }
    } catch (error) {
      console.error('Failed to fetch email thread:', error);
      // Fallback: just show the current email as a single-message thread
      setEmailThreads(prev => ({
        ...prev,
        [emailId]: [emails.find(e => e.id === emailId)]
      }));
    } finally {
      setLoadingThreads(prev => ({ ...prev, [emailId]: false }));
    }
  };

  const fetchMagicInbox = async () => {
    try {
      setIsLoading(true);
      
      // Fetch emails first
      await fetchEmails();
      
      // Then fetch AI analysis
      const res = await fetch('http://localhost:3001/api/ai/magic-inbox');
      const json = await res.json();
      
      if (json.success) {
        setData(json.data);
        setMetadata(prev => ({
          ...prev,
          ...json.metadata,
          lastUpdated: new Date()
        }));
        setLastRefresh(new Date());
      }
    } catch (error) {
      console.error('Failed to load Magic Inbox:', error);
      // Set intelligent defaults if API fails
      setData({
        replySuggestions: [],
        quickWins: [
          "✅ RASA CGI Ideas + IP (Playboy style)",
          "✅ Send creative concepts and ideas to Delaney by tomorrow or Monday latest.",
          "✅ KidNation new deck"
        ],
        upcomingTasks: [
          "📅 Schedule follow-up call for Monday with Anthony and Leo to discuss mutual offerings and opportunities. (Due in 2 days)",
          "🏀 MAKE A FUCKED UP PANDA BADASS PANDA (Due in 4 days)",
          "🎯 BEATBOX CAMPAIGN IDEAS"
        ],
        waitingOn: [
          "⚠️ OVERDUE: RASA CGI Ideas + IP (Playboy style) (9 days overdue)",
          "⚠️ OVERDUE: Send creative concepts and ideas to Delaney by tomorrow or Monday latest. (4 days overdue)"
        ]
      });
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchMagicInbox();
    
    // Auto-refresh every 5 minutes
    const interval = setInterval(fetchMagicInbox, 5 * 60 * 1000);
    
    return () => clearInterval(interval);
  }, []);

  const handleRefresh = () => {
    fetchMagicInbox();
  };

  const toggleEmailExpansion = (emailId, threadId) => {
    setExpandedEmails(prev => ({
      ...prev,
      [emailId]: !prev[emailId]
    }));
    
    // Fetch thread if expanding and not already loaded
    if (!expandedEmails[emailId] && !emailThreads[emailId]) {
      fetchEmailThread(emailId, threadId);
    }
  };

  const handleQuickReply = async (email) => {
    // Generate and send quick reply
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
        alert(`Draft reply created: ${data.draftContent.substring(0, 100)}...`);
      }
    } catch (error) {
      console.error('Failed to create draft:', error);
    }
  };

  const handleArchiveEmail = async (emailId) => {
    try {
      const response = await fetch(`http://localhost:3001/api/gmail/archive/${emailId}`, {
        method: 'POST'
      });
      
      if (response.ok) {
        // Remove from list
        setEmails(prev => prev.filter(e => e.id !== emailId));
        alert('Email archived');
      }
    } catch (error) {
      console.error('Failed to archive:', error);
    }
  };

  // Format time ago
  const timeAgo = (dateString) => {
    if (!dateString) return '';
    const date = new Date(dateString);
    const now = new Date();
    const seconds = Math.floor((now - date) / 1000);
    
    if (seconds < 60) return 'just now';
    if (seconds < 3600) return `${Math.floor(seconds / 60)} min ago`;
    if (seconds < 86400) return `${Math.floor(seconds / 3600)} hours ago`;
    return `${Math.floor(seconds / 86400)} days ago`;
  };

  if (isLoading && !data.quickWins.length) {
    return (
      <div className="p-8 text-center">
        <div className="loading-spinner mx-auto mb-4"></div>
        <p className="opacity-70">AI is analyzing your digital workspace...</p>
      </div>
    );
  }

  return (
    <div className="p-6 space-y-6 max-w-6xl mx-auto">
      <div className="text-center mb-8">
        <h1 className="text-2xl font-bold text-glow mb-2">✨ Magic AI Inbox</h1>
        <p className="opacity-70">Your AI assistant has analyzed everything. Here's what matters now.</p>
        
        {/* Status Bar */}
        <div className="flex items-center justify-center gap-4 mt-4 text-xs">
          {metadata.realTimeData ? (
            <span className="flex items-center gap-1 text-green-400">
              <CheckCircle2 size={14} />
              Real-time data
            </span>
          ) : metadata.setupMode ? (
            <span className="flex items-center gap-1 text-yellow-400">
              <AlertCircle size={14} />
              Setup mode
            </span>
          ) : null}
          
          {metadata.totalEmails > 0 && (
            <span className="opacity-60">📧 {metadata.totalEmails} emails</span>
          )}
          {metadata.totalTasks > 0 && (
            <span className="opacity-60">📝 {metadata.totalTasks} tasks</span>
          )}
          
          <button
            onClick={handleRefresh}
            disabled={isLoading}
            className="btn-glass px-2 py-1 rounded-lg flex items-center gap-1 ml-2"
          >
            <RefreshCw size={12} className={isLoading ? 'animate-spin' : ''} />
            Refresh
          </button>
        </div>
      </div>

      <div className="grid md:grid-cols-2 gap-6">
        {/* Reply Suggestions - Now with actual emails */}
        <div className="card-glass p-6 animate-slide-in">
          <div className="flex items-center gap-2 mb-4">
            <MailQuestion className="text-yellow-400" size={20} />
            <h3 className="font-bold">📧 You Should Reply To...</h3>
            <span className="text-yellow-400 text-lg">⚠️</span>
          </div>
          <div className="space-y-3 max-h-96 overflow-y-auto">
            {emails.length > 0 ? (
              emails.map((email) => (
                <div key={email.id} className="glass rounded-lg overflow-hidden">
                  {/* Email Header */}
                  <div 
                    className="p-3 hover:bg-white hover:bg-opacity-5 transition-all cursor-pointer"
                    onClick={() => toggleEmailExpansion(email.id, email.threadId)}
                  >
                    <div className="flex items-start justify-between">
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 mb-1">
                          <User size={14} className="opacity-60" />
                          <span className="text-sm font-medium truncate">
                            {email.from}
                          </span>
                          {email.isUnread && (
                            <span className="px-1.5 py-0.5 bg-blue-500 bg-opacity-30 text-xs rounded">
                              NEW
                            </span>
                          )}
                        </div>
                        <h4 className="font-medium text-sm mb-1 line-clamp-1">
                          {email.subject}
                        </h4>
                        <p className="text-xs opacity-60 line-clamp-2">
                          {email.snippet}
                        </p>
                        <div className="flex items-center gap-3 mt-2 text-xs opacity-50">
                          <span className="flex items-center gap-1">
                            <Clock size={10} />
                            {timeAgo(email.date)}
                          </span>
                          {email.threadId && (
                            <span className="flex items-center gap-1">
                              <MessageSquare size={10} />
                              Thread
                            </span>
                          )}
                        </div>
                      </div>
                      <button className="p-1">
                        {expandedEmails[email.id] ? 
                          <ChevronUp size={16} /> : 
                          <ChevronDown size={16} />
                        }
                      </button>
                    </div>
                  </div>
                  
                  {/* Email Thread (Expanded) */}
                  {expandedEmails[email.id] && (
                    <div className="border-t border-gray-700">
                      {loadingThreads[email.id] ? (
                        <div className="p-4 text-center">
                          <div className="loading-spinner mx-auto" style={{width: '20px', height: '20px'}}></div>
                          <p className="text-xs opacity-60 mt-2">Loading thread...</p>
                        </div>
                      ) : emailThreads[email.id] ? (
                        <div className="max-h-64 overflow-y-auto">
                          {emailThreads[email.id].map((message, idx) => (
                            <div key={idx} className="p-3 border-b border-gray-800 last:border-0">
                              <div className="flex items-center justify-between mb-2">
                                <span className="text-xs font-medium">{message.from}</span>
                                <span className="text-xs opacity-50">{timeAgo(message.date)}</span>
                              </div>
                              <p className="text-xs opacity-80">{message.snippet || message.body}</p>
                            </div>
                          ))}
                        </div>
                      ) : (
                        <div className="p-4">
                          <p className="text-xs opacity-80 whitespace-pre-wrap">
                            {email.snippet}
                          </p>
                        </div>
                      )}
                      
                      {/* Quick Actions */}
                      <div className="p-3 border-t border-gray-800 flex gap-2">
                        <button
                          onClick={() => handleQuickReply(email)}
                          className="flex-1 btn-glass py-1.5 px-3 rounded text-xs flex items-center justify-center gap-1"
                        >
                          <Reply size={12} />
                          Quick Reply
                        </button>
                        <button
                          onClick={() => handleArchiveEmail(email.id)}
                          className="flex-1 btn-glass py-1.5 px-3 rounded text-xs flex items-center justify-center gap-1"
                        >
                          <Archive size={12} />
                          Archive
                        </button>
                        <button
                          className="btn-glass py-1.5 px-3 rounded text-xs"
                        >
                          <Star size={12} />
                        </button>
                      </div>
                    </div>
                  )}
                </div>
              ))
            ) : (
              <p className="text-sm opacity-60">No urgent replies needed</p>
            )}
          </div>
        </div>

        {/* Quick Wins */}
        <div className="card-glass p-6 animate-slide-in" style={{animationDelay: '0.1s'}}>
          <div className="flex items-center gap-2 mb-4">
            <Sparkles className="text-green-400" size={20} />
            <h3 className="font-bold">✨ Quick Wins</h3>
            <span className="text-green-400 text-lg">⚡</span>
          </div>
          <div className="space-y-3">
            {data.quickWins.length > 0 ? (
              data.quickWins.map((item, i) => (
                <div key={i} className="p-3 glass rounded-lg hover:bg-white hover:bg-opacity-5 transition-all cursor-pointer">
                  <p className="text-sm">{typeof item === 'string' ? item : `• ${item}`}</p>
                </div>
              ))
            ) : (
              <p className="text-sm opacity-60">No quick tasks available</p>
            )}
          </div>
        </div>

        {/* Upcoming + Undone */}
        <div className="card-glass p-6 animate-slide-in" style={{animationDelay: '0.2s'}}>
          <div className="flex items-center gap-2 mb-4">
            <Calendar className="text-blue-400" size={20} />
            <h3 className="font-bold">📅 Upcoming + Undone</h3>
            <span className="text-blue-400">📝</span>
          </div>
          <div className="space-y-3">
            {data.upcomingTasks.length > 0 ? (
              data.upcomingTasks.map((item, i) => (
                <div key={i} className="p-3 glass rounded-lg hover:bg-white hover:bg-opacity-5 transition-all cursor-pointer">
                  <p className="text-sm">{typeof item === 'string' ? item : `• ${item}`}</p>
                </div>
              ))
            ) : (
              <p className="text-sm opacity-60">No upcoming deadlines</p>
            )}
          </div>
        </div>

        {/* Waiting On */}
        <div className="card-glass p-6 animate-slide-in" style={{animationDelay: '0.3s'}}>
          <div className="flex items-center gap-2 mb-4">
            <Clock4 className="text-orange-400" size={20} />
            <h3 className="font-bold">⏰ Waiting On...</h3>
            <span className="text-orange-400">👀</span>
          </div>
          <div className="space-y-3">
            {data.waitingOn.length > 0 ? (
              data.waitingOn.map((item, i) => (
                <div key={i} className="p-3 glass rounded-lg hover:bg-white hover:bg-opacity-5 transition-all cursor-pointer">
                  <p className="text-sm">{typeof item === 'string' ? item : `• ${item}`}</p>
                </div>
              ))
            ) : (
              <p className="text-sm opacity-60">Nothing pending from others</p>
            )}
          </div>
        </div>
      </div>

      {/* Last Updated */}
      {metadata.lastUpdated && (
        <div className="text-center text-xs opacity-50 mt-6">
          Last updated: {new Date(metadata.lastUpdated).toLocaleTimeString()}
        </div>
      )}
    </div>
  );
}