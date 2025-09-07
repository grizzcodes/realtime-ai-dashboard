// frontend/src/components/GmailBoxEnhanced.js
import React, { useState, useEffect } from 'react';
import { 
  Mail, 
  Inbox, 
  Send, 
  FileText, 
  ChevronDown, 
  ChevronUp,
  ChevronRight,
  Trash2,
  Reply,
  Forward,
  Star,
  Archive,
  Sparkles,
  RefreshCw,
  Edit,
  X,
  Check,
  AlertCircle,
  Paperclip,
  ExternalLink
} from 'lucide-react';

const GmailBoxEnhanced = () => {
  const [emails, setEmails] = useState([]);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState('inbox');
  const [expandedEmail, setExpandedEmail] = useState(null);
  const [replyDraft, setReplyDraft] = useState('');
  const [editingReply, setEditingReply] = useState(false);
  const [generatingReply, setGeneratingReply] = useState(false);
  const [deleteConfirm, setDeleteConfirm] = useState(null);
  const [error, setError] = useState(null);

  useEffect(() => {
    fetchEmails();
  }, [activeTab]);

  const fetchEmails = async () => {
    setLoading(true);
    setError(null);
    try {
      const query = activeTab === 'sent' ? 'in:sent' : 
                   activeTab === 'drafts' ? 'in:drafts' : 'in:inbox';
      
      const response = await fetch(`http://localhost:3001/api/gmail/latest?query=${query}&limit=30`);
      const data = await response.json();
      
      if (data.success && data.emails) {
        setEmails(data.emails);
      } else {
        setEmails([]);
        if (data.error) setError(data.error);
      }
    } catch (error) {
      console.error('Failed to fetch emails:', error);
      setError('Failed to load emails');
      setEmails([]);
    } finally {
      setLoading(false);
    }
  };

  const fetchEmailDetails = async (emailId) => {
    try {
      const response = await fetch(`http://localhost:3001/api/gmail/email/${emailId}?includeThread=true`);
      const data = await response.json();
      
      if (data.success && data.email) {
        return data.email;
      }
      return null;
    } catch (error) {
      console.error('Failed to fetch email details:', error);
      return null;
    }
  };

  const handleEmailClick = async (email) => {
    if (expandedEmail?.id === email.id) {
      setExpandedEmail(null);
      setReplyDraft('');
      setEditingReply(false);
      setDeleteConfirm(null);
    } else {
      const fullEmail = await fetchEmailDetails(email.id);
      setExpandedEmail(fullEmail || email);
      setReplyDraft('');
      setEditingReply(false);
      setDeleteConfirm(null);
      
      // Mark as read
      if (email.isUnread) {
        await fetch(`http://localhost:3001/api/gmail/read/${email.id}`, { method: 'POST' });
        setEmails(emails.map(e => 
          e.id === email.id ? { ...e, isUnread: false } : e
        ));
      }
    }
  };

  const generateSmartReply = async () => {
    if (!expandedEmail) return;
    
    setGeneratingReply(true);
    setEditingReply(true);
    
    try {
      const response = await fetch('http://localhost:3001/api/gmail/smart-reply', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          emailId: expandedEmail.id,
          subject: expandedEmail.subject,
          from: expandedEmail.from,
          snippet: expandedEmail.snippet,
          body: expandedEmail.body,
          threadId: expandedEmail.threadId
        })
      });
      
      const data = await response.json();
      if (data.success && data.draft) {
        setReplyDraft(data.draft);
      } else {
        setReplyDraft(data.draft || 'Unable to generate reply. Please try again.');
      }
    } catch (error) {
      console.error('Failed to generate smart reply:', error);
      setReplyDraft('Failed to generate reply. Please write your response manually.');
    } finally {
      setGeneratingReply(false);
    }
  };

  const sendReply = async () => {
    if (!expandedEmail || !replyDraft.trim()) return;
    
    try {
      const response = await fetch('http://localhost:3001/api/gmail/send-reply', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          to: expandedEmail.from,
          subject: expandedEmail.subject.startsWith('Re:') ? 
                  expandedEmail.subject : `Re: ${expandedEmail.subject}`,
          body: replyDraft,
          threadId: expandedEmail.threadId,
          inReplyTo: expandedEmail.messageId,
          references: expandedEmail.references
        })
      });
      
      const data = await response.json();
      if (data.success) {
        setReplyDraft('');
        setEditingReply(false);
        alert('Reply sent successfully!');
        fetchEmails(); // Refresh emails
      } else {
        alert('Failed to send reply: ' + data.error);
      }
    } catch (error) {
      console.error('Failed to send reply:', error);
      alert('Failed to send reply');
    }
  };

  const deleteEmail = async (emailId) => {
    try {
      const response = await fetch(`http://localhost:3001/api/gmail/trash/${emailId}`, {
        method: 'DELETE'
      });
      
      const data = await response.json();
      if (data.success) {
        setEmails(emails.filter(e => e.id !== emailId));
        if (expandedEmail?.id === emailId) {
          setExpandedEmail(null);
        }
        setDeleteConfirm(null);
      } else {
        alert('Failed to delete email: ' + data.error);
      }
    } catch (error) {
      console.error('Failed to delete email:', error);
      alert('Failed to delete email');
    }
  };

  const archiveEmail = async (emailId) => {
    try {
      const response = await fetch(`http://localhost:3001/api/gmail/archive/${emailId}`, {
        method: 'POST'
      });
      
      const data = await response.json();
      if (data.success) {
        setEmails(emails.filter(e => e.id !== emailId));
        if (expandedEmail?.id === emailId) {
          setExpandedEmail(null);
        }
      }
    } catch (error) {
      console.error('Failed to archive email:', error);
    }
  };

  const formatDate = (dateString) => {
    const date = new Date(dateString);
    const now = new Date();
    const diff = now - date;
    const hours = Math.floor(diff / (1000 * 60 * 60));
    
    if (hours < 24) {
      return date.toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit' });
    } else if (hours < 48) {
      return 'Yesterday';
    } else {
      return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
    }
  };

  const truncateText = (text, maxLength = 50) => {
    if (!text) return '';
    if (text.length <= maxLength) return text;
    return text.substring(0, maxLength) + '...';
  };

  const getEmailPreview = (email) => {
    const from = email.from?.split('<')[0]?.trim() || email.from || '';
    return truncateText(from, 20);
  };

  return (
    <div className="gmail-box-enhanced" style={{
      background: 'linear-gradient(135deg, #1e3a8a 0%, #3730a3 100%)',
      borderRadius: '20px',
      padding: '1.5rem',
      color: 'white',
      height: '600px',
      display: 'flex',
      flexDirection: 'column',
      overflow: 'hidden'
    }}>
      {/* Header */}
      <div style={{
        display: 'flex',
        justifyContent: 'space-between',
        alignItems: 'center',
        marginBottom: '1rem'
      }}>
        <div style={{
          fontSize: '1.25rem',
          fontWeight: 'bold',
          display: 'flex',
          alignItems: 'center',
          gap: '0.5rem'
        }}>
          <Mail size={20} />
          Gmail
          {emails.filter(e => e.isUnread).length > 0 && (
            <span style={{ 
              background: '#ef4444', 
              color: 'white', 
              borderRadius: '12px', 
              padding: '2px 8px',
              fontSize: '0.75rem',
              marginLeft: '0.5rem'
            }}>
              {emails.filter(e => e.isUnread).length}
            </span>
          )}
        </div>
        <button 
          onClick={fetchEmails}
          style={{
            background: 'rgba(255, 255, 255, 0.2)',
            border: 'none',
            color: 'white',
            padding: '0.5rem',
            borderRadius: '8px',
            cursor: 'pointer',
            transition: 'all 0.3s ease'
          }}
          onMouseEnter={(e) => e.target.style.background = 'rgba(255, 255, 255, 0.3)'}
          onMouseLeave={(e) => e.target.style.background = 'rgba(255, 255, 255, 0.2)'}
        >
          <RefreshCw size={16} />
        </button>
      </div>

      {/* Tabs */}
      <div style={{
        display: 'flex',
        gap: '0.5rem',
        marginBottom: '1rem',
        borderBottom: '1px solid rgba(255, 255, 255, 0.2)',
        paddingBottom: '0.5rem'
      }}>
        {['inbox', 'sent', 'drafts'].map(tab => (
          <button 
            key={tab}
            onClick={() => setActiveTab(tab)}
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: '0.5rem',
              padding: '0.5rem 1rem',
              background: activeTab === tab ? 'rgba(255, 255, 255, 0.2)' : 'transparent',
              border: 'none',
              color: activeTab === tab ? 'white' : 'rgba(255, 255, 255, 0.7)',
              cursor: 'pointer',
              borderRadius: '8px',
              textTransform: 'capitalize',
              fontSize: '0.875rem',
              transition: 'all 0.3s ease'
            }}
          >
            {tab === 'inbox' && <Inbox size={16} />}
            {tab === 'sent' && <Send size={16} />}
            {tab === 'drafts' && <FileText size={16} />}
            {tab}
            {tab === 'inbox' && emails.filter(e => e.isUnread && activeTab === 'inbox').length > 0 && (
              <span style={{ 
                background: '#ef4444', 
                color: 'white', 
                borderRadius: '10px', 
                padding: '1px 6px',
                fontSize: '0.7rem'
              }}>
                {emails.filter(e => e.isUnread).length}
              </span>
            )}
          </button>
        ))}
      </div>

      {/* Email List */}
      <div style={{
        flex: 1,
        overflowY: 'auto',
        overflowX: 'hidden',
        background: 'rgba(255, 255, 255, 0.05)',
        borderRadius: '12px',
        padding: '0.75rem'
      }}>
        {loading ? (
          <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: '200px' }}>
            <RefreshCw className="animate-spin" size={24} style={{ animation: 'spin 1s linear infinite' }} />
          </div>
        ) : error ? (
          <div style={{
            background: 'rgba(244, 67, 54, 0.1)',
            border: '1px solid rgba(244, 67, 54, 0.3)',
            color: '#ff6b6b',
            padding: '1rem',
            borderRadius: '8px',
            fontSize: '0.875rem'
          }}>
            <AlertCircle size={16} style={{ marginRight: '0.5rem', display: 'inline' }} />
            {error}
          </div>
        ) : emails.length === 0 ? (
          <div style={{ textAlign: 'center', padding: '2rem', color: 'rgba(255, 255, 255, 0.6)' }}>
            <Mail size={36} style={{ opacity: 0.3, marginBottom: '0.5rem' }} />
            <p style={{ fontSize: '0.875rem' }}>No emails in {activeTab}</p>
          </div>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
            {emails.map((email) => {
              const isExpanded = expandedEmail?.id === email.id;
              
              return (
                <div key={email.id} style={{
                  background: isExpanded ? 'rgba(255, 255, 255, 0.95)' : 
                            email.isUnread ? 'rgba(255, 255, 255, 0.9)' : 'rgba(255, 255, 255, 0.8)',
                  color: '#1e293b',
                  borderRadius: '10px',
                  overflow: 'hidden',
                  transition: 'all 0.3s ease',
                  cursor: 'pointer'
                }}>
                  {/* Email Header Row */}
                  <div 
                    onClick={() => handleEmailClick(email)}
                    style={{
                      padding: '0.75rem',
                      display: 'flex',
                      alignItems: 'center',
                      gap: '0.75rem'
                    }}
                  >
                    {/* Expand Chevron */}
                    <div style={{ color: '#6b7280' }}>
                      {isExpanded ? <ChevronDown size={16} /> : <ChevronRight size={16} />}
                    </div>
                    
                    {/* Star */}
                    {email.isStarred && <Star size={14} fill="#fbbf24" color="#fbbf24" />}
                    
                    {/* From */}
                    <div style={{
                      fontWeight: email.isUnread ? '600' : '400',
                      fontSize: '0.875rem',
                      minWidth: '120px',
                      maxWidth: '120px',
                      overflow: 'hidden',
                      textOverflow: 'ellipsis',
                      whiteSpace: 'nowrap'
                    }}>
                      {getEmailPreview(email)}
                    </div>
                    
                    {/* Subject & Snippet */}
                    <div style={{
                      flex: 1,
                      display: 'flex',
                      gap: '0.5rem',
                      overflow: 'hidden'
                    }}>
                      <span style={{
                        fontWeight: email.isUnread ? '600' : '400',
                        fontSize: '0.875rem',
                        whiteSpace: 'nowrap',
                        overflow: 'hidden',
                        textOverflow: 'ellipsis',
                        maxWidth: '200px'
                      }}>
                        {truncateText(email.subject, 30)}
                      </span>
                      <span style={{
                        color: '#6b7280',
                        fontSize: '0.875rem',
                        whiteSpace: 'nowrap',
                        overflow: 'hidden',
                        textOverflow: 'ellipsis'
                      }}>
                        - {truncateText(email.snippet, 40)}
                      </span>
                    </div>
                    
                    {/* Labels */}
                    {email.labels && email.labels.includes('IMPORTANT') && (
                      <span style={{
                        background: '#fbbf24',
                        color: '#78350f',
                        padding: '2px 6px',
                        borderRadius: '4px',
                        fontSize: '0.65rem',
                        fontWeight: '500'
                      }}>IMPORTANT</span>
                    )}
                    
                    {/* Date */}
                    <div style={{
                      fontSize: '0.75rem',
                      color: '#6b7280',
                      whiteSpace: 'nowrap'
                    }}>
                      {formatDate(email.date)}
                    </div>
                    
                    {/* Quick Actions */}
                    <div style={{
                      display: 'flex',
                      gap: '0.25rem'
                    }} onClick={(e) => e.stopPropagation()}>
                      {!isExpanded && (
                        <>
                          <button
                            onClick={() => handleEmailClick(email)}
                            title="Reply"
                            style={{
                              background: 'transparent',
                              border: 'none',
                              color: '#6b7280',
                              cursor: 'pointer',
                              padding: '4px'
                            }}
                          >
                            <Reply size={14} />
                          </button>
                          <button
                            onClick={() => {
                              if (window.confirm('Delete this email?')) {
                                deleteEmail(email.id);
                              }
                            }}
                            title="Delete"
                            style={{
                              background: 'transparent',
                              border: 'none',
                              color: '#6b7280',
                              cursor: 'pointer',
                              padding: '4px'
                            }}
                          >
                            <Trash2 size={14} />
                          </button>
                        </>
                      )}
                    </div>
                  </div>

                  {/* Expanded Content */}
                  {isExpanded && expandedEmail && (
                    <div style={{
                      padding: '0 0.75rem 0.75rem 0.75rem',
                      borderTop: '1px solid #e5e7eb'
                    }}>
                      {/* Full Email Body */}
                      <div style={{
                        margin: '0.75rem 0',
                        padding: '0.75rem',
                        background: '#f9fafb',
                        borderRadius: '8px',
                        maxHeight: '200px',
                        overflowY: 'auto',
                        fontSize: '0.875rem',
                        lineHeight: '1.5',
                        color: '#374151',
                        whiteSpace: 'pre-wrap',
                        wordWrap: 'break-word'
                      }}>
                        {expandedEmail.body || expandedEmail.snippet}
                      </div>

                      {/* Action Buttons */}
                      <div style={{ display: 'flex', gap: '0.5rem', flexWrap: 'wrap' }}>
                        <button 
                          onClick={(e) => {
                            e.stopPropagation();
                            setEditingReply(true);
                          }}
                          style={{
                            display: 'flex',
                            alignItems: 'center',
                            gap: '0.25rem',
                            padding: '0.375rem 0.75rem',
                            border: 'none',
                            borderRadius: '6px',
                            cursor: 'pointer',
                            background: '#3b82f6',
                            color: 'white',
                            fontSize: '0.75rem'
                          }}
                        >
                          <Reply size={14} />
                          Reply
                        </button>
                        
                        <button 
                          onClick={(e) => {
                            e.stopPropagation();
                            generateSmartReply();
                          }}
                          style={{
                            display: 'flex',
                            alignItems: 'center',
                            gap: '0.25rem',
                            padding: '0.375rem 0.75rem',
                            border: 'none',
                            borderRadius: '6px',
                            cursor: 'pointer',
                            background: 'linear-gradient(135deg, #8b5cf6 0%, #7c3aed 100%)',
                            color: 'white',
                            fontSize: '0.75rem'
                          }}
                        >
                          <Sparkles size={14} />
                          {generatingReply ? 'Generating...' : 'Smart Reply'}
                        </button>

                        <button 
                          onClick={(e) => {
                            e.stopPropagation();
                            alert('Forward feature coming soon!');
                          }}
                          style={{
                            display: 'flex',
                            alignItems: 'center',
                            gap: '0.25rem',
                            padding: '0.375rem 0.75rem',
                            border: 'none',
                            borderRadius: '6px',
                            cursor: 'pointer',
                            background: '#10b981',
                            color: 'white',
                            fontSize: '0.75rem'
                          }}
                        >
                          <Forward size={14} />
                          Forward
                        </button>
                        
                        <button 
                          onClick={(e) => {
                            e.stopPropagation();
                            archiveEmail(expandedEmail.id);
                          }}
                          style={{
                            display: 'flex',
                            alignItems: 'center',
                            gap: '0.25rem',
                            padding: '0.375rem 0.75rem',
                            border: 'none',
                            borderRadius: '6px',
                            cursor: 'pointer',
                            background: '#6b7280',
                            color: 'white',
                            fontSize: '0.75rem'
                          }}
                        >
                          <Archive size={14} />
                          Archive
                        </button>
                        
                        <button 
                          onClick={(e) => {
                            e.stopPropagation();
                            setDeleteConfirm(expandedEmail.id);
                          }}
                          style={{
                            display: 'flex',
                            alignItems: 'center',
                            gap: '0.25rem',
                            padding: '0.375rem 0.75rem',
                            border: 'none',
                            borderRadius: '6px',
                            cursor: 'pointer',
                            background: '#ef4444',
                            color: 'white',
                            fontSize: '0.75rem'
                          }}
                        >
                          <Trash2 size={14} />
                          Delete
                        </button>
                      </div>

                      {/* Delete Confirmation */}
                      {deleteConfirm === expandedEmail.id && (
                        <div style={{
                          background: '#fef2f2',
                          border: '1px solid #fecaca',
                          color: '#991b1b',
                          padding: '0.75rem',
                          borderRadius: '6px',
                          marginTop: '0.5rem',
                          fontSize: '0.875rem'
                        }}>
                          Are you sure you want to delete this email?
                          <div style={{ marginTop: '0.5rem', display: 'flex', gap: '0.5rem' }}>
                            <button 
                              onClick={(e) => {
                                e.stopPropagation();
                                deleteEmail(expandedEmail.id);
                              }}
                              style={{
                                padding: '0.25rem 0.75rem',
                                background: '#ef4444',
                                color: 'white',
                                border: 'none',
                                borderRadius: '4px',
                                cursor: 'pointer',
                                fontSize: '0.75rem'
                              }}
                            >
                              Yes, Delete
                            </button>
                            <button 
                              onClick={(e) => {
                                e.stopPropagation();
                                setDeleteConfirm(null);
                              }}
                              style={{
                                padding: '0.25rem 0.75rem',
                                background: '#6b7280',
                                color: 'white',
                                border: 'none',
                                borderRadius: '4px',
                                cursor: 'pointer',
                                fontSize: '0.75rem'
                              }}
                            >
                              Cancel
                            </button>
                          </div>
                        </div>
                      )}

                      {/* Reply Editor */}
                      {editingReply && (
                        <div style={{
                          marginTop: '0.75rem',
                          padding: '0.75rem',
                          background: '#f3f4f6',
                          borderRadius: '8px'
                        }}>
                          <div style={{ marginBottom: '0.5rem', fontSize: '0.875rem', fontWeight: '500', color: '#374151' }}>
                            Reply to: {expandedEmail.from}
                          </div>
                          <textarea
                            value={replyDraft}
                            onChange={(e) => setReplyDraft(e.target.value)}
                            placeholder="Write your reply here..."
                            style={{
                              width: '100%',
                              minHeight: '100px',
                              padding: '0.5rem',
                              border: '1px solid #d1d5db',
                              borderRadius: '6px',
                              fontFamily: 'inherit',
                              fontSize: '0.875rem',
                              resize: 'vertical',
                              boxSizing: 'border-box'
                            }}
                          />
                          <div style={{ display: 'flex', gap: '0.5rem', marginTop: '0.5rem' }}>
                            <button 
                              onClick={sendReply}
                              disabled={!replyDraft.trim()}
                              style={{
                                padding: '0.375rem 0.75rem',
                                background: replyDraft.trim() ? '#3b82f6' : '#9ca3af',
                                color: 'white',
                                border: 'none',
                                borderRadius: '6px',
                                cursor: replyDraft.trim() ? 'pointer' : 'not-allowed',
                                fontSize: '0.75rem',
                                display: 'flex',
                                alignItems: 'center',
                                gap: '0.25rem'
                              }}
                            >
                              <Send size={14} />
                              Send
                            </button>
                            <button 
                              onClick={generateSmartReply}
                              style={{
                                padding: '0.375rem 0.75rem',
                                background: 'linear-gradient(135deg, #8b5cf6 0%, #7c3aed 100%)',
                                color: 'white',
                                border: 'none',
                                borderRadius: '6px',
                                cursor: 'pointer',
                                fontSize: '0.75rem',
                                display: 'flex',
                                alignItems: 'center',
                                gap: '0.25rem'
                              }}
                            >
                              <Sparkles size={14} />
                              Generate
                            </button>
                            <button 
                              onClick={() => {
                                setEditingReply(false);
                                setReplyDraft('');
                              }}
                              style={{
                                padding: '0.375rem 0.75rem',
                                background: '#6b7280',
                                color: 'white',
                                border: 'none',
                                borderRadius: '6px',
                                cursor: 'pointer',
                                fontSize: '0.75rem'
                              }}
                            >
                              Cancel
                            </button>
                          </div>
                        </div>
                      )}
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
};

export default GmailBoxEnhanced;