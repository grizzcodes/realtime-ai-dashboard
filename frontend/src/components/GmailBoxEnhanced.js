// frontend/src/components/GmailBoxEnhanced.js
import React, { useState, useEffect } from 'react';
import { 
  Mail, 
  Inbox, 
  Send, 
  FileText, 
  ChevronDown, 
  ChevronUp,
  Trash2,
  Reply,
  Star,
  Archive,
  Sparkles,
  RefreshCw,
  Edit,
  X,
  Check,
  AlertCircle
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
    } else {
      const fullEmail = await fetchEmailDetails(email.id);
      setExpandedEmail(fullEmail || email);
      setReplyDraft('');
      setEditingReply(false);
      
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

  return (
    <div className="gmail-box-enhanced" style={{
      background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
      borderRadius: '20px',
      padding: '1.5rem',
      color: 'white',
      height: '600px',
      display: 'flex',
      flexDirection: 'column'
    }}>
      <div style={{
        display: 'flex',
        justifyContent: 'space-between',
        alignItems: 'center',
        marginBottom: '1rem'
      }}>
        <div style={{
          fontSize: '1.5rem',
          fontWeight: 'bold',
          display: 'flex',
          alignItems: 'center',
          gap: '0.5rem'
        }}>
          <Mail size={24} />
          Gmail Enhanced
        </div>
        <button 
          onClick={fetchEmails}
          style={{
            background: 'rgba(255, 255, 255, 0.2)',
            border: 'none',
            color: 'white',
            padding: '0.5rem',
            borderRadius: '8px',
            cursor: 'pointer'
          }}
        >
          <RefreshCw size={18} />
        </button>
      </div>

      <div style={{
        display: 'flex',
        gap: '1rem',
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
              borderRadius: '10px',
              textTransform: 'capitalize'
            }}
          >
            {tab === 'inbox' && <Inbox size={18} />}
            {tab === 'sent' && <Send size={18} />}
            {tab === 'drafts' && <FileText size={18} />}
            {tab}
            {tab === 'inbox' && emails.filter(e => e.isUnread).length > 0 && (
              <span style={{ 
                background: '#f44336', 
                color: 'white', 
                borderRadius: '10px', 
                padding: '2px 6px',
                fontSize: '0.75rem'
              }}>
                {emails.filter(e => e.isUnread).length}
              </span>
            )}
          </button>
        ))}
      </div>

      <div style={{
        flex: 1,
        overflowY: 'auto',
        background: 'rgba(255, 255, 255, 0.1)',
        borderRadius: '15px',
        padding: '1rem'
      }}>
        {loading ? (
          <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: '200px' }}>
            <RefreshCw className="animate-spin" size={32} />
          </div>
        ) : error ? (
          <div style={{
            background: 'rgba(244, 67, 54, 0.1)',
            border: '1px solid #f44336',
            color: '#f44336',
            padding: '1rem',
            borderRadius: '8px',
            marginBottom: '1rem'
          }}>
            <AlertCircle size={20} style={{ marginRight: '0.5rem', display: 'inline' }} />
            {error}
          </div>
        ) : emails.length === 0 ? (
          <div style={{ textAlign: 'center', padding: '2rem', color: 'rgba(255, 255, 255, 0.8)' }}>
            <Mail size={48} style={{ opacity: 0.5, marginBottom: '1rem' }} />
            <p>No emails in {activeTab}</p>
          </div>
        ) : (
          <>
            {expandedEmail && (
              <div style={{
                background: 'white',
                borderRadius: '15px',
                padding: '1.5rem',
                marginBottom: '1rem',
                boxShadow: '0 10px 30px rgba(0, 0, 0, 0.1)'
              }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '1rem' }}>
                  <div>
                    <div style={{ fontWeight: '600', color: '#333' }}>{expandedEmail.from}</div>
                    <div style={{ fontSize: '0.95rem', color: '#444' }}>{expandedEmail.subject}</div>
                  </div>
                  <button 
                    onClick={() => setExpandedEmail(null)}
                    style={{ background: 'none', border: 'none', cursor: 'pointer' }}
                  >
                    <X size={20} />
                  </button>
                </div>

                <div style={{
                  margin: '1rem 0',
                  padding: '1rem',
                  background: '#f8f9fa',
                  borderRadius: '10px',
                  maxHeight: '300px',
                  overflowY: 'auto',
                  whiteSpace: 'pre-wrap',
                  fontSize: '0.9rem',
                  lineHeight: '1.6',
                  color: '#333'
                }}>
                  {expandedEmail.body || expandedEmail.snippet}
                </div>

                {expandedEmail.thread && expandedEmail.thread.length > 1 && (
                  <div style={{ marginTop: '1rem', paddingTop: '1rem', borderTop: '1px solid #e0e0e0' }}>
                    <h4 style={{ marginBottom: '0.5rem', color: '#666' }}>
                      Thread ({expandedEmail.thread.length} messages)
                    </h4>
                    {expandedEmail.thread.map((msg, idx) => (
                      <div key={idx} style={{
                        padding: '0.75rem',
                        background: '#f8f9fa',
                        borderRadius: '8px',
                        marginBottom: '0.5rem',
                        fontSize: '0.85rem'
                      }}>
                        <strong>{msg.from}</strong> - {formatDate(msg.date)}
                        <div>{msg.snippet}</div>
                      </div>
                    ))}
                  </div>
                )}

                <div style={{ display: 'flex', gap: '0.5rem', marginTop: '1rem' }}>
                  <button 
                    onClick={generateSmartReply}
                    style={{
                      display: 'flex',
                      alignItems: 'center',
                      gap: '0.5rem',
                      padding: '0.5rem 1rem',
                      border: 'none',
                      borderRadius: '8px',
                      cursor: 'pointer',
                      background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
                      color: 'white'
                    }}
                  >
                    <Sparkles size={16} />
                    {generatingReply ? 'Generating...' : 'Smart Reply'}
                  </button>
                  <button 
                    onClick={() => setEditingReply(true)}
                    style={{
                      display: 'flex',
                      alignItems: 'center',
                      gap: '0.5rem',
                      padding: '0.5rem 1rem',
                      border: 'none',
                      borderRadius: '8px',
                      cursor: 'pointer',
                      background: '#4CAF50',
                      color: 'white'
                    }}
                  >
                    <Reply size={16} />
                    Reply
                  </button>
                  <button 
                    onClick={() => archiveEmail(expandedEmail.id)}
                    style={{
                      display: 'flex',
                      alignItems: 'center',
                      gap: '0.5rem',
                      padding: '0.5rem 1rem',
                      border: 'none',
                      borderRadius: '8px',
                      cursor: 'pointer',
                      background: '#2196F3',
                      color: 'white'
                    }}
                  >
                    <Archive size={16} />
                    Archive
                  </button>
                  <button 
                    onClick={() => setDeleteConfirm(expandedEmail.id)}
                    style={{
                      display: 'flex',
                      alignItems: 'center',
                      gap: '0.5rem',
                      padding: '0.5rem 1rem',
                      border: 'none',
                      borderRadius: '8px',
                      cursor: 'pointer',
                      background: '#f44336',
                      color: 'white'
                    }}
                  >
                    <Trash2 size={16} />
                    Delete
                  </button>
                </div>

                {deleteConfirm === expandedEmail.id && (
                  <div style={{
                    background: '#fff3cd',
                    border: '1px solid #ffc107',
                    color: '#856404',
                    padding: '1rem',
                    borderRadius: '8px',
                    marginTop: '0.5rem'
                  }}>
                    Are you sure you want to delete this email?
                    <div style={{ marginTop: '0.5rem' }}>
                      <button 
                        onClick={() => deleteEmail(expandedEmail.id)}
                        style={{
                          marginRight: '0.5rem',
                          padding: '0.5rem 1rem',
                          background: '#f44336',
                          color: 'white',
                          border: 'none',
                          borderRadius: '8px',
                          cursor: 'pointer'
                        }}
                      >
                        <Check size={16} style={{ display: 'inline', marginRight: '0.25rem' }} />
                        Yes, Delete
                      </button>
                      <button 
                        onClick={() => setDeleteConfirm(null)}
                        style={{
                          padding: '0.5rem 1rem',
                          background: '#ccc',
                          color: '#333',
                          border: 'none',
                          borderRadius: '8px',
                          cursor: 'pointer'
                        }}
                      >
                        <X size={16} style={{ display: 'inline', marginRight: '0.25rem' }} />
                        Cancel
                      </button>
                    </div>
                  </div>
                )}

                {editingReply && (
                  <div style={{
                    marginTop: '1rem',
                    padding: '1rem',
                    background: '#f0f0f0',
                    borderRadius: '10px'
                  }}>
                    <h4 style={{ marginBottom: '0.5rem', color: '#333' }}>
                      Reply to: {expandedEmail.from}
                    </h4>
                    <textarea
                      value={replyDraft}
                      onChange={(e) => setReplyDraft(e.target.value)}
                      placeholder="Write your reply here..."
                      style={{
                        width: '100%',
                        minHeight: '150px',
                        padding: '0.75rem',
                        border: '1px solid #ddd',
                        borderRadius: '8px',
                        fontFamily: 'inherit',
                        fontSize: '0.9rem',
                        resize: 'vertical'
                      }}
                    />
                    <div style={{ display: 'flex', gap: '0.5rem', marginTop: '0.75rem' }}>
                      <button 
                        onClick={sendReply}
                        disabled={!replyDraft.trim()}
                        style={{
                          padding: '0.5rem 1rem',
                          background: '#4CAF50',
                          color: 'white',
                          border: 'none',
                          borderRadius: '8px',
                          cursor: replyDraft.trim() ? 'pointer' : 'not-allowed',
                          opacity: replyDraft.trim() ? 1 : 0.5
                        }}
                      >
                        <Send size={16} style={{ display: 'inline', marginRight: '0.25rem' }} />
                        Send Reply
                      </button>
                      <button 
                        onClick={generateSmartReply}
                        style={{
                          padding: '0.5rem 1rem',
                          background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
                          color: 'white',
                          border: 'none',
                          borderRadius: '8px',
                          cursor: 'pointer'
                        }}
                      >
                        <Sparkles size={16} style={{ display: 'inline', marginRight: '0.25rem' }} />
                        Regenerate
                      </button>
                      <button 
                        onClick={() => {
                          setEditingReply(false);
                          setReplyDraft('');
                        }}
                        style={{
                          padding: '0.5rem 1rem',
                          background: '#ccc',
                          color: '#333',
                          border: 'none',
                          borderRadius: '8px',
                          cursor: 'pointer'
                        }}
                      >
                        <X size={16} style={{ display: 'inline', marginRight: '0.25rem' }} />
                        Cancel
                      </button>
                    </div>
                  </div>
                )}
              </div>
            )}

            {emails.map((email) => (
              <div 
                key={email.id}
                onClick={() => handleEmailClick(email)}
                style={{
                  background: email.isUnread ? 'white' : 'rgba(255, 255, 255, 0.95)',
                  color: '#333',
                  borderRadius: '10px',
                  padding: '1rem',
                  marginBottom: '0.75rem',
                  cursor: 'pointer',
                  transition: 'all 0.3s ease',
                  fontWeight: email.isUnread ? '600' : 'normal'
                }}
                onMouseEnter={(e) => {
                  e.currentTarget.style.transform = 'translateX(5px)';
                  e.currentTarget.style.boxShadow = '0 5px 15px rgba(0, 0, 0, 0.1)';
                }}
                onMouseLeave={(e) => {
                  e.currentTarget.style.transform = 'translateX(0)';
                  e.currentTarget.style.boxShadow = 'none';
                }}
              >
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '0.5rem' }}>
                  <div style={{ fontWeight: '600', color: '#333' }}>
                    {email.isStarred && <Star size={14} fill="gold" color="gold" style={{ marginRight: '0.25rem', display: 'inline' }} />}
                    {email.from}
                  </div>
                  <div style={{ fontSize: '0.85rem', color: '#666' }}>{formatDate(email.date)}</div>
                </div>
                <div style={{ fontSize: '0.95rem', marginBottom: '0.5rem', color: '#444' }}>{email.subject}</div>
                <div style={{
                  fontSize: '0.85rem',
                  color: '#666',
                  overflow: 'hidden',
                  textOverflow: 'ellipsis',
                  display: '-webkit-box',
                  WebkitLineClamp: 2,
                  WebkitBoxOrient: 'vertical'
                }}>{email.snippet}</div>
                <div style={{ display: 'flex', alignItems: 'center', marginTop: '0.5rem' }}>
                  {expandedEmail?.id === email.id ? (
                    <ChevronUp size={16} />
                  ) : (
                    <ChevronDown size={16} />
                  )}
                  <span style={{ fontSize: '0.75rem', marginLeft: '0.25rem', color: '#666' }}>
                    Click to {expandedEmail?.id === email.id ? 'collapse' : 'expand'}
                  </span>
                </div>
              </div>
            ))}
          </>
        )}
      </div>
    </div>
  );
};

export default GmailBoxEnhanced;