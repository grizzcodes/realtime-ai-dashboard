// frontend/src/components/GmailBoxEnhanced.js
import React, { useState, useEffect } from 'react';
import gmailService from '../services/gmailServiceEnhanced';
import {
  Inbox,
  Search,
  Filter,
  RefreshCw,
  Star,
  Trash2,
  ChevronDown,
  Clock,
  Tag,
  User,
  Calendar,
  AlertCircle,
  Eye,
  EyeOff,
  Maximize2,
  Minimize2,
  Send,
  Archive,
  ChevronRight
} from 'lucide-react';

const GmailBoxEnhanced = () => {
  const [emails, setEmails] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedEmail, setSelectedEmail] = useState(null);
  const [filterType, setFilterType] = useState('inbox');
  const [showFilters, setShowFilters] = useState(false);
  const [isExpanded, setIsExpanded] = useState(false);

  useEffect(() => {
    fetchEmails();
  }, [filterType]);

  const fetchEmails = async () => {
    setLoading(true);
    setError(null);
    
    try {
      let query = '';
      switch(filterType) {
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
      
      const fetchedEmails = await gmailService.listEmails(query, 20);
      setEmails(fetchedEmails);
    } catch (err) {
      setError(err.message || 'Failed to fetch emails');
      console.error('Error fetching emails:', err);
    } finally {
      setLoading(false);
    }
  };

  const handleDelete = async (emailId, e) => {
    e.stopPropagation();
    try {
      await gmailService.deleteEmail(emailId);
      setEmails(emails.filter(email => email.id !== emailId));
      if (selectedEmail?.id === emailId) {
        setSelectedEmail(null);
      }
    } catch (err) {
      setError(`Failed to delete email: ${err.message}`);
    }
  };

  const formatDate = (dateString) => {
    if (!dateString) return '';
    const date = new Date(dateString);
    const now = new Date();
    const diff = now - date;
    const days = Math.floor(diff / (1000 * 60 * 60 * 24));
    const hours = Math.floor(diff / (1000 * 60 * 60));
    
    if (hours < 24) {
      return date.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit', hour12: true }).toUpperCase();
    } else if (days === 1) {
      return 'Yesterday';
    } else {
      return date.toLocaleDateString('en-US', { month: 'numeric', day: 'numeric' });
    }
  };

  const truncateText = (text, maxLength) => {
    if (!text) return '';
    return text.length > maxLength ? text.substring(0, maxLength) + '...' : text;
  };

  const extractSenderName = (from) => {
    if (!from) return 'Unknown';
    const match = from.match(/^([^<]+)/);
    if (match) {
      return match[1].trim().replace(/"/g, '');
    }
    return from.split('@')[0];
  };

  // Box styling that EXACTLY matches Notion Tasks and other components
  const boxStyle = {
    background: 'rgba(17, 24, 39, 0.7)', // Dark neutral background matching other boxes
    backdropFilter: 'blur(8px)',
    WebkitBackdropFilter: 'blur(8px)',
    borderRadius: '0.75rem',
    border: '1px solid rgba(255, 255, 255, 0.08)',
    padding: '1rem',
    height: isExpanded ? '80vh' : 'auto',
    position: isExpanded ? 'fixed' : 'relative',
    top: isExpanded ? '10vh' : 'auto',
    left: isExpanded ? '10%' : 'auto',
    right: isExpanded ? '10%' : 'auto',
    zIndex: isExpanded ? 1000 : 1,
    transition: 'all 0.3s ease'
  };

  return (
    <div className={`gmail-container ${isExpanded ? 'expanded' : ''}`} style={boxStyle}>
      {/* Header */}
      <div className="gmail-header" style={{ marginBottom: '1rem' }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '0.75rem' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
            <span style={{ fontSize: '1.25rem' }}>✉️</span>
            <h2 style={{ margin: 0, fontSize: '1.125rem', fontWeight: '600', color: '#ffffff' }}>Gmail</h2>
            {emails.filter(e => e.isUnread).length > 0 && (
              <span style={{
                background: '#dc2626',
                color: '#ffffff',
                padding: '0.125rem 0.5rem',
                borderRadius: '0.75rem',
                fontSize: '0.75rem',
                fontWeight: '600'
              }}>
                {emails.filter(e => e.isUnread).length}
              </span>
            )}
          </div>
          <div style={{ display: 'flex', gap: '0.5rem' }}>
            <button
              onClick={fetchEmails}
              disabled={loading}
              style={{
                background: 'transparent',
                border: 'none',
                cursor: loading ? 'not-allowed' : 'pointer',
                padding: '0.375rem',
                display: 'flex',
                alignItems: 'center',
                color: 'rgba(255, 255, 255, 0.5)',
                transition: 'all 0.2s ease'
              }}
              onMouseEnter={(e) => e.currentTarget.style.color = 'rgba(255, 255, 255, 0.8)'}
              onMouseLeave={(e) => e.currentTarget.style.color = 'rgba(255, 255, 255, 0.5)'}
            >
              <RefreshCw size={18} className={loading ? 'animate-spin' : ''} />
            </button>
            <button
              onClick={() => setIsExpanded(!isExpanded)}
              style={{
                background: 'transparent',
                border: 'none',
                cursor: 'pointer',
                padding: '0.375rem',
                display: 'flex',
                alignItems: 'center',
                color: 'rgba(255, 255, 255, 0.5)',
                transition: 'all 0.2s ease'
              }}
              onMouseEnter={(e) => e.currentTarget.style.color = 'rgba(255, 255, 255, 0.8)'}
              onMouseLeave={(e) => e.currentTarget.style.color = 'rgba(255, 255, 255, 0.5)'}
            >
              {isExpanded ? <Minimize2 size={18} /> : <Maximize2 size={18} />}
            </button>
          </div>
        </div>

        {/* Filter Tabs */}
        <div style={{ display: 'flex', gap: '0.25rem', marginBottom: '0.75rem' }}>
          {[
            { key: 'inbox', label: 'Inbox', icon: <Inbox size={14} />, count: emails.filter(e => !e.labelIds?.includes('SENT')).length },
            { key: 'sent', label: 'Sent', icon: <Send size={14} /> },
            { key: 'drafts', label: 'Drafts', icon: <Archive size={14} /> }
          ].map(tab => (
            <button
              key={tab.key}
              onClick={() => setFilterType(tab.key)}
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: '0.375rem',
                padding: '0.375rem 0.75rem',
                background: filterType === tab.key ? 'rgba(59, 130, 246, 0.15)' : 'rgba(255, 255, 255, 0.03)',
                border: '1px solid ' + (filterType === tab.key ? 'rgba(59, 130, 246, 0.3)' : 'rgba(255, 255, 255, 0.08)'),
                borderRadius: '0.5rem',
                color: filterType === tab.key ? '#60a5fa' : 'rgba(255, 255, 255, 0.6)',
                fontSize: '0.8125rem',
                cursor: 'pointer',
                transition: 'all 0.2s ease'
              }}
              onMouseEnter={(e) => {
                if (filterType !== tab.key) {
                  e.currentTarget.style.background = 'rgba(255, 255, 255, 0.05)';
                }
              }}
              onMouseLeave={(e) => {
                if (filterType !== tab.key) {
                  e.currentTarget.style.background = 'rgba(255, 255, 255, 0.03)';
                }
              }}
            >
              {tab.icon}
              {tab.label}
              {tab.key === 'inbox' && tab.count > 0 && (
                <span style={{
                  background: '#dc2626',
                  color: '#ffffff',
                  padding: '0.0625rem 0.375rem',
                  borderRadius: '0.625rem',
                  fontSize: '0.6875rem',
                  fontWeight: '600'
                }}>
                  {tab.count}
                </span>
              )}
            </button>
          ))}
        </div>
      </div>

      {/* Email List */}
      <div style={{ 
        maxHeight: isExpanded ? 'calc(80vh - 120px)' : '400px', 
        overflowY: 'auto',
        overflowX: 'hidden'
      }}>
        {loading ? (
          <div style={{ textAlign: 'center', padding: '2.5rem' }}>
            <div className="loading-spinner" />
            <p style={{ marginTop: '0.75rem', color: 'rgba(255, 255, 255, 0.4)', fontSize: '0.8125rem' }}>Loading emails...</p>
          </div>
        ) : emails.length === 0 ? (
          <div style={{ textAlign: 'center', padding: '2.5rem', color: 'rgba(255, 255, 255, 0.4)' }}>
            <Inbox size={36} style={{ opacity: 0.3, marginBottom: '0.75rem' }} />
            <p style={{ fontSize: '0.8125rem' }}>No emails found</p>
          </div>
        ) : (
          emails.map(email => (
            <div
              key={email.id}
              onClick={() => setSelectedEmail(email)}
              style={{
                padding: '0.625rem 0.75rem',
                marginBottom: '0.125rem',
                background: 'transparent',
                borderRadius: '0.5rem',
                cursor: 'pointer',
                transition: 'all 0.2s ease',
                display: 'flex',
                alignItems: 'center',
                gap: '0.625rem'
              }}
              onMouseEnter={(e) => {
                e.currentTarget.style.background = 'rgba(255, 255, 255, 0.03)';
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.background = 'transparent';
              }}
            >
              <ChevronRight size={14} style={{ color: 'rgba(255, 255, 255, 0.3)' }} />
              
              <div style={{ flex: 1, minWidth: 0 }}>
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '0.125rem' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', flex: 1 }}>
                    <span style={{ 
                      fontWeight: email.isUnread ? '600' : 'normal',
                      fontSize: '0.8125rem',
                      color: email.isUnread ? '#ffffff' : 'rgba(255, 255, 255, 0.8)'
                    }}>
                      {truncateText(extractSenderName(email.from), 25)}
                    </span>
                    {email.isImportant && (
                      <span style={{
                        background: 'rgba(251, 191, 36, 0.2)',
                        color: '#fbbf24',
                        padding: '0.0625rem 0.375rem',
                        borderRadius: '0.25rem',
                        fontSize: '0.625rem',
                        fontWeight: '600',
                        textTransform: 'uppercase'
                      }}>
                        Important
                      </span>
                    )}
                  </div>
                  <span style={{ fontSize: '0.6875rem', color: 'rgba(255, 255, 255, 0.3)' }}>
                    {formatDate(email.date)}
                  </span>
                </div>
                <div style={{ 
                  fontSize: '0.8125rem', 
                  marginBottom: '0.125rem',
                  color: 'rgba(255, 255, 255, 0.7)'
                }}>
                  {truncateText(email.subject || '(no subject)', 45)}
                </div>
                <div style={{ 
                  fontSize: '0.75rem', 
                  color: 'rgba(255, 255, 255, 0.4)',
                  lineHeight: '1.3'
                }}>
                  - {truncateText(email.snippet, 70)}
                </div>
              </div>

              <div style={{ display: 'flex', gap: '0.25rem' }}>
                <button
                  onClick={(e) => handleDelete(email.id, e)}
                  title="Delete"
                  style={{
                    background: 'transparent',
                    border: 'none',
                    cursor: 'pointer',
                    padding: '0.25rem',
                    display: 'flex',
                    alignItems: 'center',
                    color: 'rgba(255, 255, 255, 0.2)',
                    transition: 'all 0.2s ease'
                  }}
                  onMouseEnter={(e) => {
                    e.currentTarget.style.color = '#ef4444';
                  }}
                  onMouseLeave={(e) => {
                    e.currentTarget.style.color = 'rgba(255, 255, 255, 0.2)';
                  }}
                >
                  <Trash2 size={14} />
                </button>
              </div>
            </div>
          ))
        )}
      </div>

      {/* Expanded overlay background */}
      {isExpanded && (
        <div 
          onClick={() => setIsExpanded(false)}
          style={{
            position: 'fixed',
            top: 0,
            left: 0,
            right: 0,
            bottom: 0,
            background: 'rgba(0, 0, 0, 0.5)',
            zIndex: -1
          }}
        />
      )}

      {/* Email Preview Modal */}
      {selectedEmail && (
        <div style={{
          position: 'fixed',
          top: 0,
          left: 0,
          right: 0,
          bottom: 0,
          background: 'rgba(0, 0, 0, 0.8)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          zIndex: 2000,
          padding: '1.25rem'
        }}>
          <div style={{
            background: 'rgba(17, 24, 39, 0.95)',
            backdropFilter: 'blur(20px)',
            borderRadius: '0.75rem',
            maxWidth: '700px',
            maxHeight: '70vh',
            width: '100%',
            overflow: 'hidden',
            border: '1px solid rgba(255, 255, 255, 0.1)'
          }}>
            <div style={{
              padding: '1.25rem',
              borderBottom: '1px solid rgba(255, 255, 255, 0.1)'
            }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                <h3 style={{ margin: 0, fontSize: '1.125rem', fontWeight: '600', color: '#ffffff' }}>
                  {selectedEmail.subject || '(no subject)'}
                </h3>
                <button
                  onClick={() => setSelectedEmail(null)}
                  style={{
                    background: 'transparent',
                    border: 'none',
                    fontSize: '1.25rem',
                    cursor: 'pointer',
                    padding: '0.25rem',
                    color: 'rgba(255, 255, 255, 0.5)'
                  }}
                >
                  ×
                </button>
              </div>
              <div style={{ marginTop: '0.75rem', fontSize: '0.8125rem', color: 'rgba(255, 255, 255, 0.5)' }}>
                <div style={{ marginBottom: '0.25rem' }}>
                  <strong>From:</strong> {selectedEmail.from}
                </div>
                <div>
                  <strong>Date:</strong> {new Date(selectedEmail.date).toLocaleString()}
                </div>
              </div>
            </div>
            <div style={{
              padding: '1.25rem',
              maxHeight: 'calc(70vh - 120px)',
              overflowY: 'auto',
              color: 'rgba(255, 255, 255, 0.8)',
              fontSize: '0.875rem',
              lineHeight: '1.6'
            }}>
              {selectedEmail.body || selectedEmail.snippet}
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default GmailBoxEnhanced;