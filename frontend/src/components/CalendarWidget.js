// frontend/src/components/CalendarWidget.js
import React, { useState, useEffect } from 'react';
import { Calendar, Clock, Users, Video, Link, ChevronRight, Maximize2, Minimize2 } from 'lucide-react';

const CalendarWidget = () => {
  const [events, setEvents] = useState([]);
  const [loading, setLoading] = useState(true);
  const [isExpanded, setIsExpanded] = useState(false);

  useEffect(() => {
    // Fetch calendar events or use mock data
    fetchEvents();
  }, []);

  const fetchEvents = async () => {
    try {
      // Try to fetch from API
      const response = await fetch('http://localhost:3001/api/calendar/events');
      const data = await response.json();
      if (data.success) {
        setEvents(data.events);
      } else {
        // Use mock data if API fails
        setEvents(getMockEvents());
      }
    } catch (error) {
      console.error('Failed to fetch calendar events:', error);
      // Use mock data
      setEvents(getMockEvents());
    } finally {
      setLoading(false);
    }
  };

  const getMockEvents = () => {
    const today = new Date();
    return [
      {
        id: '1',
        title: 'DGenz Weekly Ops Call',
        time: '11:00 AM',
        date: today,
        attendees: 8,
        meetingLink: 'https://meet.google.com/abc-defg-hij',
        type: 'video'
      },
      {
        id: '2',
        title: 'P/ACT! x Dgenz',
        time: '12:00 PM',
        date: today,
        attendees: 4,
        meetingLink: 'https://zoom.us/j/123456789',
        type: 'video'
      },
      {
        id: '3',
        title: 'Meeting: Sound Explorers x Animation Studio',
        time: '01:00 PM',
        date: today,
        attendees: 12,
        meetingLink: 'https://meet.google.com/xyz-abcd-efg',
        type: 'video'
      },
      {
        id: '4',
        title: 'Dgenz Crew Gone Global',
        time: '06:00 AM',
        date: new Date(today.getTime() + 86400000), // Tomorrow
        attendees: 15,
        meetingLink: 'https://teams.microsoft.com/l/meetup-join/19:meeting',
        type: 'video'
      },
      {
        id: '5',
        title: 'ALEC/LEO (What are you doing?)',
        time: '02:30 PM',
        date: new Date(today.getTime() + 86400000), // Tomorrow
        attendees: 2,
        meetingLink: null,
        type: 'meeting'
      }
    ];
  };

  const formatTime = (timeString) => {
    return timeString; // Already formatted as "11:00 AM"
  };

  const isToday = (date) => {
    const today = new Date();
    return date.toDateString() === today.toDateString();
  };

  const isTomorrow = (date) => {
    const tomorrow = new Date();
    tomorrow.setDate(tomorrow.getDate() + 1);
    return date.toDateString() === tomorrow.toDateString();
  };

  const getDateLabel = (date) => {
    if (isToday(date)) return 'Today';
    if (isTomorrow(date)) return 'Tomorrow';
    return date.toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric' });
  };

  const truncateText = (text, maxLength) => {
    if (!text) return '';
    return text.length > maxLength ? text.substring(0, maxLength) + '...' : text;
  };

  const boxStyle = {
    background: 'rgba(17, 24, 39, 0.7)',
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
    <div className="calendar-widget" style={boxStyle}>
      {/* Header */}
      <div style={{ marginBottom: '1rem' }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '0.75rem' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
            <span style={{ fontSize: '1.25rem' }}>📅</span>
            <h2 style={{ margin: 0, fontSize: '1.125rem', fontWeight: '600', color: '#ffffff' }}>
              Calendar ({events.length})
            </h2>
          </div>
          <div style={{ display: 'flex', gap: '0.5rem' }}>
            <button
              onClick={fetchEvents}
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
      </div>

      {/* Events List */}
      <div style={{ maxHeight: isExpanded ? 'calc(80vh - 80px)' : '500px', overflowY: 'auto' }}>
        {loading ? (
          <div style={{ textAlign: 'center', padding: '2.5rem', color: 'rgba(255, 255, 255, 0.4)' }}>
            Loading events...
          </div>
        ) : events.length === 0 ? (
          <div style={{ textAlign: 'center', padding: '2.5rem', color: 'rgba(255, 255, 255, 0.4)' }}>
            <Calendar size={36} style={{ opacity: 0.3, marginBottom: '0.75rem' }} />
            <p style={{ fontSize: '0.8125rem' }}>No upcoming events</p>
          </div>
        ) : (
          <>
            {/* Group events by date */}
            {Object.entries(
              events.reduce((acc, event) => {
                const dateKey = getDateLabel(new Date(event.date));
                if (!acc[dateKey]) acc[dateKey] = [];
                acc[dateKey].push(event);
                return acc;
              }, {})
            ).map(([dateLabel, dateEvents]) => (
              <div key={dateLabel} style={{ marginBottom: '1rem' }}>
                {dateLabel !== 'Today' && (
                  <div style={{ 
                    fontSize: '0.75rem', 
                    color: 'rgba(255, 255, 255, 0.4)',
                    marginBottom: '0.5rem',
                    textTransform: 'uppercase',
                    letterSpacing: '0.05em'
                  }}>
                    {dateLabel}
                  </div>
                )}
                {dateEvents.map(event => (
                  <div
                    key={event.id}
                    style={{
                      padding: '0.75rem',
                      marginBottom: '0.5rem',
                      background: 'rgba(255, 255, 255, 0.02)',
                      borderRadius: '0.5rem',
                      border: '1px solid rgba(255, 255, 255, 0.05)',
                      transition: 'all 0.2s ease',
                      cursor: 'pointer'
                    }}
                    onMouseEnter={(e) => {
                      e.currentTarget.style.background = 'rgba(255, 255, 255, 0.05)';
                      e.currentTarget.style.borderColor = 'rgba(255, 255, 255, 0.1)';
                    }}
                    onMouseLeave={(e) => {
                      e.currentTarget.style.background = 'rgba(255, 255, 255, 0.02)';
                      e.currentTarget.style.borderColor = 'rgba(255, 255, 255, 0.05)';
                    }}
                  >
                    <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between' }}>
                      <div style={{ flex: 1 }}>
                        <div style={{ 
                          fontSize: '0.875rem', 
                          fontWeight: '500',
                          color: '#ffffff',
                          marginBottom: '0.375rem'
                        }}>
                          {event.title}
                        </div>
                        
                        <div style={{ display: 'flex', alignItems: 'center', gap: '1rem', flexWrap: 'wrap' }}>
                          {/* Time */}
                          <div style={{ display: 'flex', alignItems: 'center', gap: '0.25rem' }}>
                            <Clock size={12} style={{ color: 'rgba(255, 255, 255, 0.4)' }} />
                            <span style={{ fontSize: '0.75rem', color: 'rgba(255, 255, 255, 0.6)' }}>
                              {formatTime(event.time)}
                            </span>
                          </div>

                          {/* Attendees */}
                          {event.attendees && (
                            <div style={{ display: 'flex', alignItems: 'center', gap: '0.25rem' }}>
                              <Users size={12} style={{ color: 'rgba(255, 255, 255, 0.4)' }} />
                              <span style={{ fontSize: '0.75rem', color: 'rgba(255, 255, 255, 0.6)' }}>
                                {event.attendees} {event.attendees === 1 ? 'attendee' : 'attendees'}
                              </span>
                            </div>
                          )}

                          {/* Meeting Type */}
                          {event.type === 'video' && (
                            <div style={{ display: 'flex', alignItems: 'center', gap: '0.25rem' }}>
                              <Video size={12} style={{ color: 'rgba(255, 255, 255, 0.4)' }} />
                              <span style={{ fontSize: '0.75rem', color: 'rgba(255, 255, 255, 0.6)' }}>
                                Video call
                              </span>
                            </div>
                          )}
                        </div>

                        {/* Meeting Link */}
                        {event.meetingLink && (
                          <div style={{ marginTop: '0.5rem' }}>
                            <a
                              href={event.meetingLink}
                              target="_blank"
                              rel="noopener noreferrer"
                              onClick={(e) => e.stopPropagation()}
                              style={{
                                display: 'inline-flex',
                                alignItems: 'center',
                                gap: '0.25rem',
                                padding: '0.25rem 0.5rem',
                                background: 'rgba(59, 130, 246, 0.15)',
                                border: '1px solid rgba(59, 130, 246, 0.3)',
                                borderRadius: '0.375rem',
                                color: '#60a5fa',
                                fontSize: '0.6875rem',
                                textDecoration: 'none',
                                transition: 'all 0.2s ease'
                              }}
                              onMouseEnter={(e) => {
                                e.currentTarget.style.background = 'rgba(59, 130, 246, 0.25)';
                                e.currentTarget.style.borderColor = 'rgba(59, 130, 246, 0.5)';
                              }}
                              onMouseLeave={(e) => {
                                e.currentTarget.style.background = 'rgba(59, 130, 246, 0.15)';
                                e.currentTarget.style.borderColor = 'rgba(59, 130, 246, 0.3)';
                              }}
                            >
                              <Link size={11} />
                              Join Meeting
                            </a>
                          </div>
                        )}
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            ))}
          </>
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
    </div>
  );
};

export default CalendarWidget;