// frontend/src/components/TaskDashboard.js
import React, { useState, useEffect } from 'react';
import { CheckCircle, Circle, AlertCircle, Clock, Calendar, User, ChevronRight, ChevronDown } from 'lucide-react';

const TaskDashboard = () => {
  const [tasks, setTasks] = useState([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState('all');
  const [expandedTasks, setExpandedTasks] = useState(new Set());

  useEffect(() => {
    fetchTasks();
  }, []);

  const getMockTasks = () => {
    const today = new Date();
    return [
      {
        id: '1',
        title: 'RASA IDEAS AI',
        assignee: 'Alec Chapados, Leo Ramlall, Pablo',
        priority: 'high',
        status: 'pending',
        dueDate: new Date(today.getTime() - 3 * 24 * 60 * 60 * 1000).toISOString(), // 3 days ago
        description: 'AI-powered research assistant system architecture',
        tags: ['AI', 'Research', 'MVP']
      },
      {
        id: '2',
        title: 'CLAY + SENDING READY FOR THIS WEEK WITH Thierry',
        assignee: 'Alec Chapados',
        priority: 'high',
        status: 'pending',
        dueDate: new Date(today.getTime()).toISOString(), // Today
        description: 'Prepare and send weekly update with Thierry',
        tags: ['Weekly', 'Communication']
      },
      {
        id: '3',
        title: 'AFTER BEEP FINISH SCRIPT W/ AIDAN',
        assignee: 'Alec Chapados',
        priority: 'high',
        status: 'in progress',
        dueDate: new Date(today.getTime() + 3 * 24 * 60 * 60 * 1000).toISOString(), // In 3 days
        description: 'Complete script revisions with Aidan after beep sound effects',
        tags: ['Script', 'Audio', 'Collaboration']
      },
      {
        id: '4',
        title: 'PACT! MAKE A FUCKED UP PANDA BADASS PANDA+ CGI IDEAS',
        assignee: 'Leo Ramlall, Alec Chapados',
        priority: 'medium',
        status: 'pending',
        dueDate: new Date(today.getTime() - 2 * 24 * 60 * 60 * 1000).toISOString(), // 2 days ago
        description: 'Develop CGI concepts for the Panda character',
        tags: ['CGI', 'Creative', 'Character Design']
      },
      {
        id: '5',
        title: 'POST PARTNERSHIP WITH REVE.ART',
        assignee: 'Alec Chapados',
        priority: 'medium',
        status: 'pending',
        dueDate: new Date(today.getTime() + 10 * 24 * 60 * 60 * 1000).toISOString(), // In 10 days
        description: 'Announce partnership with REVE.ART on social media',
        tags: ['Partnership', 'Marketing', 'Social Media']
      },
      {
        id: '6',
        title: 'Develop automated workflow model to reinforce Gus\'s character depth and generate content ideas',
        assignee: 'Leo Ramlall',
        priority: 'medium',
        status: 'pending',
        dueDate: new Date(today.getTime() + 21 * 24 * 60 * 60 * 1000).toISOString(), // In 3 weeks
        description: 'Create automated system for character development and content generation',
        tags: ['Automation', 'Character', 'Content']
      }
    ];
  };

  const fetchTasks = async () => {
    try {
      const response = await fetch('http://localhost:3001/api/notion/tasks');
      const data = await response.json();
      if (data.success && data.tasks && data.tasks.length > 0) {
        setTasks(data.tasks);
      } else {
        // Use mock data if API returns no tasks
        setTasks(getMockTasks());
      }
    } catch (error) {
      console.error('Failed to fetch tasks:', error);
      // Use mock data on error
      setTasks(getMockTasks());
    } finally {
      setLoading(false);
    }
  };

  const formatDateRelative = (dateString) => {
    if (!dateString) return '';
    
    const date = new Date(dateString);
    const now = new Date();
    now.setHours(0, 0, 0, 0);
    date.setHours(0, 0, 0, 0);
    
    const diffTime = date - now;
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
    
    if (diffDays === 0) {
      return 'Today';
    } else if (diffDays === 1) {
      return 'Tomorrow';
    } else if (diffDays === -1) {
      return 'Yesterday';
    } else if (diffDays > 1 && diffDays <= 7) {
      return `in ${diffDays} days`;
    } else if (diffDays > 7 && diffDays <= 14) {
      return 'in 1 week';
    } else if (diffDays > 14 && diffDays <= 21) {
      return 'in 2 weeks';
    } else if (diffDays > 21 && diffDays <= 30) {
      return 'in 3 weeks';
    } else if (diffDays > 30 && diffDays <= 60) {
      return 'in 1 month';
    } else if (diffDays > 60 && diffDays <= 90) {
      return 'in 2 months';
    } else if (diffDays > 90) {
      const months = Math.round(diffDays / 30);
      return `in ${months} months`;
    } else if (diffDays < 0 && diffDays >= -7) {
      return `${Math.abs(diffDays)} days ago`;
    } else if (diffDays < -7 && diffDays >= -30) {
      const weeks = Math.round(Math.abs(diffDays) / 7);
      return `${weeks} week${weeks > 1 ? 's' : ''} ago`;
    } else if (diffDays < -30) {
      const months = Math.round(Math.abs(diffDays) / 30);
      return `${months} month${months > 1 ? 's' : ''} ago`;
    } else {
      return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
    }
  };

  const getPriorityColor = (priority) => {
    switch(priority?.toLowerCase()) {
      case 'high': return '#ef4444';
      case 'medium': return '#f59e0b';
      case 'low': return '#10b981';
      default: return '#6b7280';
    }
  };

  const getStatusIcon = (status) => {
    switch(status?.toLowerCase()) {
      case 'completed':
        return <CheckCircle size={16} style={{ color: '#10b981' }} />;
      case 'in progress':
        return <Clock size={16} style={{ color: '#3b82f6' }} />;
      default:
        return <Circle size={16} style={{ color: '#6b7280' }} />;
    }
  };

  const toggleTaskExpansion = (taskId) => {
    const newExpanded = new Set(expandedTasks);
    if (newExpanded.has(taskId)) {
      newExpanded.delete(taskId);
    } else {
      newExpanded.add(taskId);
    }
    setExpandedTasks(newExpanded);
  };

  const filteredTasks = tasks.filter(task => {
    if (filter === 'all') return true;
    return task.status?.toLowerCase() === filter.toLowerCase();
  });

  return (
    <div style={{
      background: 'rgba(17, 24, 39, 0.7)',
      backdropFilter: 'blur(8px)',
      WebkitBackdropFilter: 'blur(8px)',
      borderRadius: '0.75rem',
      border: '1px solid rgba(255, 255, 255, 0.08)',
      padding: '1rem'
    }}>
      {/* Header */}
      <div style={{ marginBottom: '1rem' }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '0.75rem' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
            <span style={{ fontSize: '1.25rem' }}>📋</span>
            <h2 style={{ margin: 0, fontSize: '1.125rem', fontWeight: '600', color: '#ffffff' }}>
              Notion Tasks ({filteredTasks.length})
            </h2>
          </div>
          <button
            onClick={fetchTasks}
            style={{
              background: 'transparent',
              border: 'none',
              cursor: 'pointer',
              padding: '0.375rem',
              color: 'rgba(255, 255, 255, 0.5)',
              transition: 'all 0.2s ease'
            }}
            onMouseEnter={(e) => e.currentTarget.style.color = 'rgba(255, 255, 255, 0.8)'}
            onMouseLeave={(e) => e.currentTarget.style.color = 'rgba(255, 255, 255, 0.5)'}
          >
            ↻
          </button>
        </div>

        {/* Filter Buttons */}
        <div style={{ display: 'flex', gap: '0.5rem' }}>
          {['all', 'pending', 'in progress', 'completed'].map(status => (
            <button
              key={status}
              onClick={() => setFilter(status)}
              style={{
                padding: '0.25rem 0.625rem',
                borderRadius: '0.375rem',
                border: filter === status ? '1px solid rgba(59, 130, 246, 0.3)' : '1px solid rgba(255, 255, 255, 0.08)',
                background: filter === status ? 'rgba(59, 130, 246, 0.15)' : 'transparent',
                color: filter === status ? '#60a5fa' : 'rgba(255, 255, 255, 0.6)',
                fontSize: '0.75rem',
                cursor: 'pointer',
                transition: 'all 0.2s ease',
                textTransform: 'capitalize'
              }}
            >
              {status}
            </button>
          ))}
        </div>
      </div>

      {/* Task List */}
      <div style={{ maxHeight: '500px', overflowY: 'auto' }}>
        {loading ? (
          <div style={{ textAlign: 'center', padding: '2.5rem', color: 'rgba(255, 255, 255, 0.4)' }}>
            Loading tasks...
          </div>
        ) : filteredTasks.length === 0 ? (
          <div style={{ textAlign: 'center', padding: '2.5rem', color: 'rgba(255, 255, 255, 0.4)' }}>
            No tasks found
          </div>
        ) : (
          filteredTasks.map(task => (
            <div
              key={task.id}
              style={{
                marginBottom: '0.5rem',
                background: 'rgba(255, 255, 255, 0.02)',
                borderRadius: '0.5rem',
                border: '1px solid rgba(255, 255, 255, 0.05)',
                overflow: 'hidden',
                transition: 'all 0.2s ease'
              }}
            >
              <div
                onClick={() => toggleTaskExpansion(task.id)}
                style={{
                  padding: '0.75rem',
                  cursor: 'pointer',
                  transition: 'background 0.2s ease'
                }}
                onMouseEnter={(e) => e.currentTarget.style.background = 'rgba(255, 255, 255, 0.03)'}
                onMouseLeave={(e) => e.currentTarget.style.background = 'transparent'}
              >
                <div style={{ display: 'flex', alignItems: 'flex-start', gap: '0.625rem' }}>
                  <div style={{ paddingTop: '0.125rem' }}>
                    {expandedTasks.has(task.id) ? (
                      <ChevronDown size={14} style={{ color: 'rgba(255, 255, 255, 0.3)' }} />
                    ) : (
                      <ChevronRight size={14} style={{ color: 'rgba(255, 255, 255, 0.3)' }} />
                    )}
                  </div>
                  
                  {getStatusIcon(task.status)}
                  
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{ 
                      fontSize: '0.875rem', 
                      fontWeight: '500',
                      color: task.status === 'completed' ? 'rgba(255, 255, 255, 0.5)' : '#ffffff',
                      textDecoration: task.status === 'completed' ? 'line-through' : 'none',
                      marginBottom: '0.25rem'
                    }}>
                      {task.title}
                    </div>
                    
                    <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', flexWrap: 'wrap' }}>
                      {task.assignee && (
                        <div style={{ display: 'flex', alignItems: 'center', gap: '0.25rem' }}>
                          <User size={12} style={{ color: 'rgba(255, 255, 255, 0.3)' }} />
                          <span style={{ fontSize: '0.6875rem', color: 'rgba(255, 255, 255, 0.5)' }}>
                            {task.assignee}
                          </span>
                        </div>
                      )}
                      
                      {task.priority && (
                        <span style={{
                          fontSize: '0.625rem',
                          padding: '0.125rem 0.375rem',
                          borderRadius: '0.25rem',
                          background: `${getPriorityColor(task.priority)}20`,
                          color: getPriorityColor(task.priority),
                          border: `1px solid ${getPriorityColor(task.priority)}40`,
                          fontWeight: '600'
                        }}>
                          {task.priority.toUpperCase()}
                        </span>
                      )}
                      
                      {task.dueDate && (
                        <div style={{ display: 'flex', alignItems: 'center', gap: '0.25rem' }}>
                          <Calendar size={12} style={{ color: 'rgba(255, 255, 255, 0.3)' }} />
                          <span style={{ 
                            fontSize: '0.6875rem', 
                            color: new Date(task.dueDate) < new Date() ? '#ef4444' : 'rgba(255, 255, 255, 0.5)'
                          }}>
                            {formatDateRelative(task.dueDate)}
                          </span>
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              </div>
              
              {expandedTasks.has(task.id) && (
                <div style={{
                  padding: '0 0.75rem 0.75rem 2.75rem',
                  borderTop: '1px solid rgba(255, 255, 255, 0.05)'
                }}>
                  {task.description && (
                    <p style={{ 
                      fontSize: '0.75rem', 
                      color: 'rgba(255, 255, 255, 0.5)',
                      margin: '0.5rem 0 0 0',
                      lineHeight: '1.5'
                    }}>
                      {task.description}
                    </p>
                  )}
                  
                  {task.tags && task.tags.length > 0 && (
                    <div style={{ display: 'flex', gap: '0.375rem', marginTop: '0.5rem', flexWrap: 'wrap' }}>
                      {task.tags.map((tag, index) => (
                        <span
                          key={index}
                          style={{
                            fontSize: '0.625rem',
                            padding: '0.125rem 0.5rem',
                            borderRadius: '0.75rem',
                            background: 'rgba(139, 92, 246, 0.1)',
                            border: '1px solid rgba(139, 92, 246, 0.3)',
                            color: '#a78bfa'
                          }}
                        >
                          {tag}
                        </span>
                      ))}
                    </div>
                  )}
                </div>
              )}
            </div>
          ))
        )}
      </div>
    </div>
  );
};

export default TaskDashboard;