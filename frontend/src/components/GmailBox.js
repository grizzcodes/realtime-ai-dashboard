import React, { useState, useEffect } from 'react';
import { Mail, Send, FileText, Inbox, ChevronDown, ChevronRight, Archive, Trash2, Reply, Forward, Star, Clock, User, Paperclip } from 'lucide-react';

const GmailBox = () => {
  const [emails, setEmails] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [selectedTab, setSelectedTab] = useState('inbox');
  const [expandedThreads, setExpandedThreads] = useState(new Set());
  const [selectedEmail, setSelectedEmail] = useState(null);
  const [threadMessages, setThreadMessages] = useState({});

  useEffect(() => {
    fetchEmails();
    const interval = setInterval(fetchEmails, 60000);
    return () => clearInterval(interval);
  }, [selectedTab]);

  const fetchEmails = async () => {
    try {
      setLoading(true);
      
      // Fetch based on selected tab
      let query = '';
      switch(selectedTab) {
        case 'inbox':
          query = 'in:inbox';
          break;
        case 'sent':
          query = 'in:sent';
          break;
        case 'drafts':
          query = 'in:drafts';
          break;
        default:
          query = 'in:inbox';
      }

      const response = await fetch(`http://localhost:3001/api/gmail/latest?limit=25&query=${encodeURIComponent(query)}`);
      const data = await response.json();
      
      if (data.success) {
        setEmails(data.emails || []);
        setError(null);
      } else {
        setError(data.error || 'Failed to fetch emails');
      }
    } catch (err) {
      console.error('Error fetching emails:', err);
      setError('Failed to connect to email service');
    } finally {
      setLoading(false);
    }
  };

  const fetchThread = async (threadId) => {
    try {
      const response = await fetch(`http://localhost:3001/api/gmail/thread/${threadId}`);
      const data = await response.json();
      
      if (data.success && data.messages) {
        setThreadMessages(prev => ({
          ...prev,
          [threadId]: data.messages
        }));
      }
    } catch (err) {
      console.error('Error fetching thread:', err);
    }
  };

  const toggleThread = async (email) => {
    const newExpanded = new Set(expandedThreads);
    
    if (newExpanded.has(email.id)) {
      newExpanded.delete(email.id);
      setSelectedEmail(null);
    } else {
      // Collapse all others and expand this one
      newExpanded.clear();
      newExpanded.add(email.id);
      setSelectedEmail(email);
      
      // Fetch thread messages if not already loaded
      if (email.threadId && !threadMessages[email.threadId]) {
        await fetchThread(email.threadId);
      }
    }
    
    setExpandedThreads(newExpanded);
  };

  const formatDate = (dateString) => {
    const date = new Date(dateString);
    const now = new Date();
    const diffMs = now - date;
    const diffHours = Math.floor(diffMs / (1000 * 60 * 60));
    
    if (diffHours < 1) {
      const diffMins = Math.floor(diffMs / (1000 * 60));
      return `${diffMins}m ago`;
    } else if (diffHours < 24) {
      return `${diffHours}h ago`;
    } else if (diffHours < 48) {
      return 'Yesterday';
    } else {
      return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
    }
  };

  const extractSenderName = (from) => {
    if (!from) return 'Unknown';
    const match = from.match(/^([^<]+)/);
    return match ? match[1].trim() : from.split('@')[0];
  };

  const extractSenderEmail = (from) => {
    if (!from) return '';
    const match = from.match(/<([^>]+)>/);
    return match ? match[1] : from;
  };

  const getTabIcon = (tab) => {
    switch(tab) {
      case 'inbox':
        return <Inbox className="w-4 h-4" />;
      case 'sent':
        return <Send className="w-4 h-4" />;
      case 'drafts':
        return <FileText className="w-4 h-4" />;
      default:
        return <Mail className="w-4 h-4" />;
    }
  };

  const getTabCount = () => {
    switch(selectedTab) {
      case 'inbox':
        return emails.filter(e => e.isUnread).length;
      case 'sent':
        return emails.length;
      case 'drafts':
        return emails.length;
      default:
        return 0;
    }
  };

  const tabs = [
    { id: 'inbox', label: 'Inbox', icon: <Inbox className="w-4 h-4" /> },
    { id: 'sent', label: 'Sent', icon: <Send className="w-4 h-4" /> },
    { id: 'drafts', label: 'Drafts', icon: <FileText className="w-4 h-4" /> }
  ];

  return (
    <div className="bg-gray-900 rounded-lg overflow-hidden h-full flex flex-col">
      {/* Header */}
      <div className="p-4 border-b border-gray-800">
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-2">
            <Mail className="w-5 h-5 text-blue-400" />
            <h2 className="text-lg font-semibold text-white">Gmail</h2>
            {getTabCount() > 0 && (
              <span className="px-2 py-0.5 bg-blue-500/20 text-blue-400 rounded-full text-xs">
                {getTabCount()}
              </span>
            )}
          </div>
          <button
            onClick={fetchEmails}
            className="p-1.5 hover:bg-gray-800 rounded-lg transition-colors"
            title="Refresh"
          >
            <svg className="w-4 h-4 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
            </svg>
          </button>
        </div>

        {/* Tabs */}
        <div className="flex gap-1">
          {tabs.map(tab => (
            <button
              key={tab.id}
              onClick={() => setSelectedTab(tab.id)}
              className={`flex items-center gap-2 px-3 py-1.5 rounded-lg transition-all ${
                selectedTab === tab.id
                  ? 'bg-blue-500/20 text-blue-400 border border-blue-500/30'
                  : 'text-gray-400 hover:bg-gray-800 hover:text-gray-300'
              }`}
            >
              {tab.icon}
              <span className="text-sm font-medium">{tab.label}</span>
              {selectedTab === tab.id && getTabCount() > 0 && (
                <span className="text-xs">({getTabCount()})</span>
              )}
            </button>
          ))}
        </div>
      </div>

      {/* Email List */}
      <div className="flex-1 overflow-y-auto">
        {loading ? (
          <div className="flex items-center justify-center h-32">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-400"></div>
          </div>
        ) : error ? (
          <div className="p-4 text-center text-gray-500">
            <Mail className="w-8 h-8 mx-auto mb-2 opacity-50" />
            <p className="text-sm">{error}</p>
          </div>
        ) : emails.length === 0 ? (
          <div className="p-8 text-center text-gray-500">
            <div className="flex justify-center mb-3">
              {getTabIcon(selectedTab)}
            </div>
            <p className="text-sm">No emails in {selectedTab}</p>
          </div>
        ) : (
          <div className="divide-y divide-gray-800">
            {emails.map((email) => (
              <div key={email.id} className="relative">
                {/* Email Item */}
                <div
                  className={`p-4 hover:bg-gray-800/50 cursor-pointer transition-all ${
                    email.isUnread ? 'bg-blue-500/5 border-l-2 border-blue-400' : ''
                  } ${expandedThreads.has(email.id) ? 'bg-gray-800' : ''}`}
                  onClick={() => toggleThread(email)}
                >
                  <div className="flex items-start gap-3">
                    {/* Expand Icon */}
                    <div className="mt-1">
                      {expandedThreads.has(email.id) ? (
                        <ChevronDown className="w-4 h-4 text-gray-500" />
                      ) : (
                        <ChevronRight className="w-4 h-4 text-gray-500" />
                      )}
                    </div>

                    {/* Avatar */}
                    <div className="flex-shrink-0">
                      <div className="w-8 h-8 rounded-full bg-gradient-to-br from-blue-400 to-purple-500 flex items-center justify-center">
                        <span className="text-white text-xs font-semibold">
                          {extractSenderName(email.from).charAt(0).toUpperCase()}
                        </span>
                      </div>
                    </div>

                    {/* Content */}
                    <div className="flex-1 min-w-0">
                      <div className="flex items-start justify-between mb-1">
                        <div className="flex items-center gap-2">
                          <span className={`text-sm ${email.isUnread ? 'font-semibold text-white' : 'text-gray-300'}`}>
                            {extractSenderName(email.from)}
                          </span>
                          {email.isUnread && (
                            <span className="w-2 h-2 bg-blue-400 rounded-full"></span>
                          )}
                        </div>
                        <span className="text-xs text-gray-500">{formatDate(email.date)}</span>
                      </div>
                      
                      <h4 className={`text-sm mb-1 truncate ${email.isUnread ? 'text-white font-medium' : 'text-gray-300'}`}>
                        {email.subject || 'No subject'}
                      </h4>
                      
                      <p className="text-xs text-gray-500 line-clamp-2">
                        {email.snippet}
                      </p>

                      {/* Labels/Actions */}
                      {email.labels && email.labels.length > 0 && (
                        <div className="flex gap-1 mt-2">
                          {email.labels.map((label, idx) => (
                            <span key={idx} className="px-2 py-0.5 bg-gray-800 text-gray-400 rounded text-xs">
                              {label}
                            </span>
                          ))}
                        </div>
                      )}
                    </div>

                    {/* Quick Actions */}
                    <div className="flex items-center gap-1 opacity-0 hover:opacity-100 transition-opacity">
                      <button className="p-1 hover:bg-gray-700 rounded" title="Archive">
                        <Archive className="w-3 h-3 text-gray-400" />
                      </button>
                      <button className="p-1 hover:bg-gray-700 rounded" title="Delete">
                        <Trash2 className="w-3 h-3 text-gray-400" />
                      </button>
                      <button className="p-1 hover:bg-gray-700 rounded" title="Star">
                        <Star className="w-3 h-3 text-gray-400" />
                      </button>
                    </div>
                  </div>
                </div>

                {/* Expanded Thread View */}
                {expandedThreads.has(email.id) && (
                  <div className="bg-gray-850 border-l-2 border-gray-700 ml-4">
                    {/* Thread Messages */}
                    {threadMessages[email.threadId] ? (
                      <div className="p-4 space-y-4">
                        {threadMessages[email.threadId].map((message, idx) => (
                          <div key={message.id} className="bg-gray-800 rounded-lg p-4">
                            <div className="flex items-start justify-between mb-2">
                              <div className="flex items-center gap-2">
                                <User className="w-4 h-4 text-gray-400" />
                                <span className="text-sm font-medium text-gray-300">
                                  {extractSenderName(message.from)}
                                </span>
                                <span className="text-xs text-gray-500">
                                  {extractSenderEmail(message.from)}
                                </span>
                              </div>
                              <span className="text-xs text-gray-500">
                                {formatDate(message.date)}
                              </span>
                            </div>
                            
                            <div className="text-sm text-gray-300 whitespace-pre-wrap">
                              {message.body || message.snippet}
                            </div>

                            {/* Thread Actions */}
                            {idx === threadMessages[email.threadId].length - 1 && (
                              <div className="flex gap-2 mt-4 pt-4 border-t border-gray-700">
                                <button className="flex items-center gap-1 px-3 py-1.5 bg-blue-500/20 text-blue-400 rounded-lg hover:bg-blue-500/30 transition-colors text-sm">
                                  <Reply className="w-3 h-3" />
                                  Reply
                                </button>
                                <button className="flex items-center gap-1 px-3 py-1.5 bg-gray-700 text-gray-400 rounded-lg hover:bg-gray-600 transition-colors text-sm">
                                  <Forward className="w-3 h-3" />
                                  Forward
                                </button>
                              </div>
                            )}
                          </div>
                        ))}
                      </div>
                    ) : (
                      <div className="p-4">
                        <div className="bg-gray-800 rounded-lg p-6">
                          <div className="text-sm text-gray-300 mb-2">
                            <strong>From:</strong> {email.from}
                          </div>
                          <div className="text-sm text-gray-300 mb-2">
                            <strong>Subject:</strong> {email.subject}
                          </div>
                          <div className="text-sm text-gray-300 mb-4">
                            <strong>Date:</strong> {new Date(email.date).toLocaleString()}
                          </div>
                          
                          <div className="text-sm text-gray-300 whitespace-pre-wrap">
                            {email.snippet}
                          </div>

                          <div className="flex gap-2 mt-4 pt-4 border-t border-gray-700">
                            <button className="flex items-center gap-1 px-3 py-1.5 bg-blue-500/20 text-blue-400 rounded-lg hover:bg-blue-500/30 transition-colors text-sm">
                              <Reply className="w-3 h-3" />
                              Reply
                            </button>
                            <button className="flex items-center gap-1 px-3 py-1.5 bg-gray-700 text-gray-400 rounded-lg hover:bg-gray-600 transition-colors text-sm">
                              <Forward className="w-3 h-3" />
                              Forward
                            </button>
                          </div>
                        </div>
                      </div>
                    )}
                  </div>
                )}
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
};

export default GmailBox;