// frontend/src/components/ActionItemManager.js
import React, { useState, useEffect } from 'react';
import { Check, X, Edit2, Send, Calendar, User, AlertCircle, ChevronRight, Save, RefreshCw, CheckSquare, Square } from 'lucide-react';
import './ActionItemManager.css';

const ActionItemManager = ({ meetings = [] }) => {
  const [actionItems, setActionItems] = useState([]);
  const [editingId, setEditingId] = useState(null);
  const [editValue, setEditValue] = useState('');
  const [selectedItems, setSelectedItems] = useState([]);
  const [syncing, setSyncing] = useState(false);
  const [notionTasks, setNotionTasks] = useState([]);
  const [showBulkActions, setShowBulkActions] = useState(false);
  const [expandedMeetings, setExpandedMeetings] = useState({});

  // Team members for assignment
  const teamMembers = ['Unassigned', 'Alec', 'Leo', 'Steph', 'Pablo', 'Anthony', 'Dany', 'Mathieu'];
  
  // Priority levels
  const priorities = ['Low', 'Medium', 'High', 'Urgent'];
  
  // Project/Client tags
  const projects = ['General', 'DGenz', 'One Dot', 'Animation Studio', 'TSC', 'Haiti Twins', 'GUS'];

  useEffect(() => {
    if (meetings && meetings.length > 0) {
      parseAllActionItems();
    }
    loadNotionTasks();
  }, [meetings]);

  const parseAllActionItems = () => {
    if (!meetings || !Array.isArray(meetings) || meetings.length === 0) {
      setActionItems([]);
      return;
    }
    
    const allItems = [];
    
    meetings.forEach(meeting => {
      if (meeting && meeting.actionItems && Array.isArray(meeting.actionItems)) {
        meeting.actionItems.forEach((item, index) => {
          if (item) {
            const parsedItem = parseActionItem(item, meeting);
            allItems.push({
              ...parsedItem,
              id: `${meeting.id}-${index}`,
              meetingId: meeting.id,
              meetingTitle: meeting.title || 'Untitled Meeting',
              meetingDate: meeting.date,
              meetingUrl: meeting.firefliesUrl || meeting.meetingUrl || '#'
            });
          }
        });
      }
    });
    
    setActionItems(allItems);
  };

  const parseActionItem = (item, meeting) => {
    const text = typeof item === 'string' ? item : item.task || item.description || '';
    
    // Smart parsing for assignee
    let assignee = 'Unassigned';
    teamMembers.slice(1).forEach(member => {
      if (text.toLowerCase().includes(member.toLowerCase())) {
        assignee = member;
      }
    });
    
    // Check for assignee pattern "Name: task"
    const assigneeMatch = text.match(/^([A-Z][a-z]+(?:\s+[A-Z][a-z]+)?)\s*[:–-]\s*/);
    if (assigneeMatch && teamMembers.includes(assigneeMatch[1])) {
      assignee = assigneeMatch[1];
    }
    
    // Smart parsing for priority
    let priority = 'Medium';
    if (text.match(/urgent|asap|immediately|critical/i)) {
      priority = 'Urgent';
    } else if (text.match(/important|priority|soon/i)) {
      priority = 'High';
    } else if (text.match(/later|eventually|consider/i)) {
      priority = 'Low';
    }
    
    // Smart parsing for due date
    let dueDate = null;
    const today = new Date();
    
    if (text.match(/today/i)) {
      dueDate = today.toISOString().split('T')[0];
    } else if (text.match(/tomorrow/i)) {
      const tomorrow = new Date(today);
      tomorrow.setDate(tomorrow.getDate() + 1);
      dueDate = tomorrow.toISOString().split('T')[0];
    } else if (text.match(/this week|week/i)) {
      const nextWeek = new Date(today);
      nextWeek.setDate(nextWeek.getDate() + 7);
      dueDate = nextWeek.toISOString().split('T')[0];
    } else if (text.match(/next week/i)) {
      const nextWeek = new Date(today);
      nextWeek.setDate(nextWeek.getDate() + 14);
      dueDate = nextWeek.toISOString().split('T')[0];
    } else {
      // Default to 1 week from now
      const nextWeek = new Date(today);
      nextWeek.setDate(nextWeek.getDate() + 7);
      dueDate = nextWeek.toISOString().split('T')[0];
    }
    
    // Detect project/client
    let project = 'General';
    projects.slice(1).forEach(proj => {
      if (meeting.title.includes(proj) || text.includes(proj)) {
        project = proj;
      }
    });
    
    // Check if already in Notion
    const inNotion = notionTasks && notionTasks.length > 0 
      ? notionTasks.some(task => 
          task && task.title && text.length > 20 && 
          task.title.toLowerCase().includes(text.substring(0, 50).toLowerCase())
        )
      : false;
    
    return {
      text: text,
      assignee: assignee,
      priority: priority,
      dueDate: dueDate,
      project: project,
      inNotion: inNotion,
      edited: false
    };
  };

  const loadNotionTasks = async () => {
    try {
      const response = await fetch('http://localhost:3001/api/notion/tasks');
      const data = await response.json();
      if (data && data.success) {
        setNotionTasks(data.tasks || []);
      }
    } catch (error) {
      console.error('Failed to load Notion tasks:', error);
      setNotionTasks([]);
    }
  };

  const startEdit = (item) => {
    setEditingId(item.id);
    setEditValue(item.text);
  };

  const saveEdit = (item) => {
    const updatedItems = actionItems.map(ai => {
      if (ai.id === item.id) {
        const parsed = parseActionItem(editValue, { title: item.meetingTitle });
        return {
          ...ai,
          ...parsed,
          text: editValue,
          edited: true
        };
      }
      return ai;
    });
    setActionItems(updatedItems);
    setEditingId(null);
    setEditValue('');
  };

  const cancelEdit = () => {
    setEditingId(null);
    setEditValue('');
  };

  const updateAssignee = (itemId, assignee) => {
    setActionItems(items => items.map(item => 
      item.id === itemId ? { ...item, assignee, edited: true } : item
    ));
  };

  const updatePriority = (itemId, priority) => {
    setActionItems(items => items.map(item => 
      item.id === itemId ? { ...item, priority, edited: true } : item
    ));
  };

  const updateDueDate = (itemId, dueDate) => {
    setActionItems(items => items.map(item => 
      item.id === itemId ? { ...item, dueDate, edited: true } : item
    ));
  };

  const updateProject = (itemId, project) => {
    setActionItems(items => items.map(item => 
      item.id === itemId ? { ...item, project, edited: true } : item
    ));
  };

  const toggleItemSelection = (itemId) => {
    setSelectedItems(prev => 
      prev.includes(itemId) 
        ? prev.filter(id => id !== itemId)
        : [...prev, itemId]
    );
  };

  const selectAll = () => {
    if (selectedItems.length === actionItems.length) {
      setSelectedItems([]);
    } else {
      setSelectedItems(actionItems.map(item => item.id));
    }
  };

  const selectAllInMeeting = (meetingId) => {
    const meetingItems = actionItems.filter(item => item.meetingId === meetingId);
    const meetingItemIds = meetingItems.map(item => item.id);
    const allSelected = meetingItemIds.every(id => selectedItems.includes(id));
    
    if (allSelected) {
      setSelectedItems(prev => prev.filter(id => !meetingItemIds.includes(id)));
    } else {
      setSelectedItems(prev => [...new Set([...prev, ...meetingItemIds])]);
    }
  };

  const pushToNotion = async (items) => {
    setSyncing(true);
    const itemsToPush = Array.isArray(items) ? items : [items];
    let successCount = 0;
    
    try {
      for (const item of itemsToPush) {
        const notionTask = {
          title: item.text,
          assignee: item.assignee !== 'Unassigned' ? item.assignee : '',
          priority: item.priority,
          dueDate: item.dueDate,
          project: item.project,
          source: `Fireflies: ${item.meetingTitle}`,
          meetingUrl: item.meetingUrl,
          meetingDate: item.meetingDate
        };
        
        const response = await fetch('http://localhost:3001/api/notion/tasks', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(notionTask)
        });
        
        if (response.ok) {
          successCount++;
          // Mark as synced
          setActionItems(prev => prev.map(ai => 
            ai.id === item.id ? { ...ai, inNotion: true } : ai
          ));
        }
      }
      
      // Reload Notion tasks to verify
      await loadNotionTasks();
      
      if (successCount > 0) {
        setSelectedItems([]);
        alert(`✅ Successfully added ${successCount} task(s) to Notion!`);
      }
    } catch (error) {
      console.error('Failed to push to Notion:', error);
      alert('❌ Failed to add tasks to Notion');
    } finally {
      setSyncing(false);
    }
  };

  const pushSelectedToNotion = () => {
    const itemsToPush = actionItems.filter(item => selectedItems.includes(item.id) && !item.inNotion);
    if (itemsToPush.length > 0) {
      pushToNotion(itemsToPush);
    } else {
      alert('No new items to push (selected items may already be in Notion)');
    }
  };

  const toggleMeetingExpansion = (meetingId) => {
    setExpandedMeetings(prev => ({
      ...prev,
      [meetingId]: !prev[meetingId]
    }));
  };

  // Group items by meeting
  const groupedItems = actionItems.reduce((groups, item) => {
    const key = item.meetingId;
    if (!groups[key]) {
      groups[key] = {
        title: item.meetingTitle,
        items: [],
        date: item.meetingDate
      };
    }
    groups[key].items.push(item);
    return groups;
  }, {});

  const getPriorityColor = (priority) => {
    switch(priority) {
      case 'Urgent': return 'priority-urgent';
      case 'High': return 'priority-high';
      case 'Medium': return 'priority-medium';
      case 'Low': return 'priority-low';
      default: return 'priority-medium';
    }
  };

  const getPriorityBadgeColor = (priority) => {
    switch(priority) {
      case 'Urgent': return 'badge-urgent';
      case 'High': return 'badge-high';
      case 'Medium': return 'badge-medium';
      case 'Low': return 'badge-low';
      default: return 'badge-medium';
    }
  };

  return (
    <div className="action-manager-container">
      {/* Header */}
      <div className="action-header">
        <div className="header-info">
          <h2>Action Items Manager</h2>
          <p>{actionItems.length} items from {meetings?.length || 0} meetings</p>
        </div>
        
        <div className="header-actions">
          <button
            onClick={() => setShowBulkActions(!showBulkActions)}
            className="btn-secondary"
          >
            {showBulkActions ? 'Hide Bulk Actions' : 'Bulk Actions'}
          </button>
          
          <button
            onClick={() => parseAllActionItems()}
            className="btn-primary"
          >
            <RefreshCw size={16} />
            Refresh
          </button>
        </div>
      </div>
      
      {/* Bulk Actions Bar */}
      {showBulkActions && (
        <div className="bulk-actions-bar">
          <div className="bulk-select">
            <button
              onClick={selectAll}
              className="btn-link"
            >
              {selectedItems.length === actionItems.length ? 'Deselect All' : 'Select All'}
            </button>
            <span className="selected-count">
              {selectedItems.length} selected
            </span>
          </div>
          
          {selectedItems.length > 0 && (
            <button
              onClick={pushSelectedToNotion}
              disabled={syncing}
              className="btn-notion"
            >
              <Send size={16} />
              Push {selectedItems.length} to Notion
            </button>
          )}
        </div>
      )}

      {/* No data messages */}
      {(!meetings || meetings.length === 0) && (
        <div className="empty-state">
          <AlertCircle size={48} />
          <h3>No Meetings Found</h3>
          <p>Load your meetings first to manage action items.</p>
        </div>
      )}

      {meetings && meetings.length > 0 && actionItems.length === 0 && (
        <div className="empty-state">
          <AlertCircle size={48} />
          <h3>No Action Items Found</h3>
          <p>Your meetings don't contain any action items yet.</p>
        </div>
      )}

      {/* Action Items by Meeting */}
      {actionItems.length > 0 && (
        <div className="meetings-list">
          {Object.entries(groupedItems).map(([meetingId, meeting]) => (
            <div key={meetingId} className="meeting-group">
              <div 
                className="meeting-header-row"
                onClick={() => toggleMeetingExpansion(meetingId)}
              >
                <ChevronRight 
                  size={20} 
                  className={`expand-icon ${expandedMeetings[meetingId] ? 'expanded' : ''}`}
                />
                <div className="meeting-info">
                  <h3>{meeting.title}</h3>
                  <span className="meeting-meta">
                    {meeting.items.length} items • {new Date(meeting.date).toLocaleDateString()}
                  </span>
                </div>
                {showBulkActions && (
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      selectAllInMeeting(meetingId);
                    }}
                    className="btn-select-all"
                  >
                    Select All
                  </button>
                )}
              </div>
              
              {expandedMeetings[meetingId] && (
                <div className="action-items-list">
                  {meeting.items.map(item => (
                    <div key={item.id} className="action-item">
                      {/* Checkbox */}
                      {showBulkActions && (
                        <div className="item-checkbox">
                          <button
                            onClick={() => toggleItemSelection(item.id)}
                            className="checkbox-btn"
                          >
                            {selectedItems.includes(item.id) ? <CheckSquare size={18} /> : <Square size={18} />}
                          </button>
                        </div>
                      )}
                      
                      {/* Main Content */}
                      <div className="item-content">
                        {editingId === item.id ? (
                          <div className="edit-mode">
                            <input
                              type="text"
                              value={editValue}
                              onChange={(e) => setEditValue(e.target.value)}
                              className="edit-input"
                              autoFocus
                              onKeyPress={(e) => e.key === 'Enter' && saveEdit(item)}
                            />
                            <button
                              onClick={() => saveEdit(item)}
                              className="btn-icon save"
                            >
                              <Check size={18} />
                            </button>
                            <button
                              onClick={cancelEdit}
                              className="btn-icon cancel"
                            >
                              <X size={18} />
                            </button>
                          </div>
                        ) : (
                          <div className="view-mode">
                            <p className="item-text">
                              {item.text}
                              {item.edited && (
                                <span className="edited-badge">edited</span>
                              )}
                              {item.inNotion && (
                                <span className="notion-badge">✓ In Notion</span>
                              )}
                            </p>
                            <button
                              onClick={() => startEdit(item)}
                              className="btn-icon edit"
                            >
                              <Edit2 size={16} />
                            </button>
                          </div>
                        )}
                        
                        {/* Metadata Row */}
                        <div className="item-metadata">
                          {/* Assignee */}
                          <div className="meta-field">
                            <User size={14} />
                            <select
                              value={item.assignee}
                              onChange={(e) => updateAssignee(item.id, e.target.value)}
                              className="meta-select"
                            >
                              {teamMembers.map(member => (
                                <option key={member} value={member}>{member}</option>
                              ))}
                            </select>
                          </div>
                          
                          {/* Priority */}
                          <select
                            value={item.priority}
                            onChange={(e) => updatePriority(item.id, e.target.value)}
                            className={`meta-select priority ${getPriorityBadgeColor(item.priority)}`}
                          >
                            {priorities.map(p => (
                              <option key={p} value={p}>{p}</option>
                            ))}
                          </select>
                          
                          {/* Due Date */}
                          <div className="meta-field">
                            <Calendar size={14} />
                            <input
                              type="date"
                              value={item.dueDate || ''}
                              onChange={(e) => updateDueDate(item.id, e.target.value)}
                              className="meta-date"
                            />
                          </div>
                          
                          {/* Project */}
                          <select
                            value={item.project}
                            onChange={(e) => updateProject(item.id, e.target.value)}
                            className="meta-select project"
                          >
                            {projects.map(p => (
                              <option key={p} value={p}>{p}</option>
                            ))}
                          </select>
                        </div>
                      </div>
                      
                      {/* Individual Push Button */}
                      {!showBulkActions && !item.inNotion && (
                        <button
                          onClick={() => pushToNotion(item)}
                          disabled={syncing}
                          className="btn-push-notion"
                        >
                          → Notion
                        </button>
                      )}
                    </div>
                  ))}
                </div>
              )}
            </div>
          ))}
        </div>
      )}
      
      {/* Floating Summary */}
      {actionItems.length > 0 && (
        <div className="floating-summary">
          <h4>Quick Stats</h4>
          <div className="stats-list">
            <div className="stat-row">
              <span>Unassigned:</span>
              <span className="stat-value">{actionItems.filter(i => i.assignee === 'Unassigned').length}</span>
            </div>
            <div className="stat-row">
              <span>Urgent/High:</span>
              <span className="stat-value urgent">
                {actionItems.filter(i => i.priority === 'Urgent' || i.priority === 'High').length}
              </span>
            </div>
            <div className="stat-row">
              <span>Not in Notion:</span>
              <span className="stat-value new">
                {actionItems.filter(i => !i.inNotion).length}
              </span>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default ActionItemManager;
