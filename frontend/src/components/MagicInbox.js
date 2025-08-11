import React, { useEffect, useState } from 'react';
import { Sparkles, Calendar, MailQuestion, Clock4, RefreshCw, CheckCircle2, AlertCircle } from 'lucide-react';

export default function MagicInbox() {
  const [data, setData] = useState({
    replySuggestions: [],
    quickWins: [],
    upcomingTasks: [],
    waitingOn: []
  });

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

  const fetchMagicInbox = async () => {
    try {
      setIsLoading(true);
      const res = await fetch('http://localhost:3001/api/ai/magic-inbox');
      const json = await res.json();
      
      if (json.success) {
        setData(json.data);
        setMetadata(json.metadata || {});
        setLastRefresh(new Date());
      }
    } catch (error) {
      console.error('Failed to load Magic Inbox:', error);
      // Set intelligent defaults if API fails
      setData({
        replySuggestions: [
          "Check email integration - Gmail may be disconnected",
          "Review pending Notion tasks for urgent items",
          "Follow up on yesterday's meeting action items"
        ],
        quickWins: [
          "Mark completed tasks as done in Notion",
          "Send quick status update to team",
          "Review and archive old emails"
        ],
        upcomingTasks: [
          "Check calendar for today's meetings",
          "Review priority tasks in Notion",
          "Update project status dashboard"
        ],
        waitingOn: [
          "Responses to pending requests",
          "Approvals from stakeholders"
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

  if (isLoading && !data.replySuggestions.length) {
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
          {metadata.totalMeetings > 0 && (
            <span className="opacity-60">🎙️ {metadata.totalMeetings} meetings</span>
          )}
          
          <button
            onClick={handleRefresh}
            disabled={isLoading}
            className="btn-glass px-2 py-1 rounded-lg flex items-center gap-1 ml-2"
          >
            <RefreshCw size={12} className={isLoading ? 'animate-spin' : ''} />
            {isLoading ? 'Refreshing...' : 'Refresh'}
          </button>
        </div>
      </div>

      <div className="grid md:grid-cols-2 gap-6">
        {/* Reply Suggestions */}
        <div className="card-glass p-6 animate-slide-in">
          <div className="flex items-center gap-2 mb-4">
            <MailQuestion className="text-yellow-400" size={20} />
            <h3 className="font-bold">📧 You Should Reply To...</h3>
            <span className="text-yellow-400 text-lg">⚠️</span>
          </div>
          <div className="space-y-3">
            {data.replySuggestions.length > 0 ? (
              data.replySuggestions.map((item, i) => (
                <div key={i} className="p-3 glass rounded-lg hover:bg-white hover:bg-opacity-5 transition-all cursor-pointer">
                  <p className="text-sm">{item}</p>
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
                  <p className="text-sm">• {item}</p>
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
                  <p className="text-sm">• {item}</p>
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
                  <p className="text-sm">• {item}</p>
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