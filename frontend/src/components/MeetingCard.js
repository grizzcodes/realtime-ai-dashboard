import React, { useState } from 'react';
import { Users, Clock, FileText, CheckCircle, ExternalLink, ChevronDown, ChevronUp } from 'lucide-react';

const MeetingCard = ({ meeting }) => {
  const [isExpanded, setIsExpanded] = useState(false);
  
  // Parse action items from different formats
  const parseActionItems = () => {
    if (Array.isArray(meeting.actionItems)) {
      return meeting.actionItems;
    }
    
    // If actionItems is a string, parse it
    if (typeof meeting.actionItems === 'string') {
      const items = [];
      const lines = meeting.actionItems.split('\n').filter(line => line.trim());
      
      let currentAssignee = 'Team';
      for (const line of lines) {
        // Check if this line is an assignee header (e.g., "Alec CHAPADOS:")
        const assigneeMatch = line.match(/^([A-Z][a-z]+ ?[A-Z]*[a-z]*):$/);
        if (assigneeMatch) {
          currentAssignee = assigneeMatch[1].trim();
        } else {
          // This is a task
          const cleanTask = line
            .replace(/^[•\-\*]\s*/, '')
            .replace(/^\d+\.\s*/, '')
            .trim();
          
          if (cleanTask) {
            items.push({
              task: cleanTask,
              assignee: currentAssignee
            });
          }
        }
      }
      
      return items;
    }
    
    return [];
  };
  
  const actionItems = parseActionItems();
  const displayedItems = isExpanded ? actionItems : actionItems.slice(0, 3);
  const hasMoreItems = actionItems.length > 3;
  
  return (
    <div className="task-card hover:shadow-lg transition-shadow">
      {/* Meeting Header */}
      <div className="mb-3">
        <h4 className="font-medium text-sm line-clamp-2">
          {meeting.title || 'Meeting Summary'}
        </h4>
        <div className="flex items-center gap-4 mt-2 text-xs opacity-70">
          <div className="flex items-center gap-1">
            <Users size={12} />
            <span>{meeting.attendees || 0} attendees</span>
          </div>
          <div className="flex items-center gap-1">
            <Clock size={12} />
            <span>{meeting.duration || 'N/A'}</span>
          </div>
          {meeting.meetingDateTime && (
            <span className="text-xs">{meeting.meetingDateTime}</span>
          )}
        </div>
      </div>
      
      {/* Participants */}
      {meeting.participants && (
        <div className="mb-3">
          <h5 className="text-xs font-medium opacity-80 mb-1">Participants:</h5>
          <p className="text-xs opacity-70">{meeting.participants}</p>
        </div>
      )}
      
      {/* Meeting Summary/Gist/Overview */}
      {(meeting.gist || meeting.overview || meeting.summary) && (
        <div className="mb-3">
          <h5 className="text-xs font-medium opacity-80 mb-1">
            {meeting.gist && 'Gist:'}
            {!meeting.gist && meeting.overview && 'Overview:'}
            {!meeting.gist && !meeting.overview && meeting.summary && 'Summary:'}
          </h5>
          <p className={`text-xs opacity-70 ${isExpanded ? '' : 'line-clamp-3'}`}>
            {meeting.gist || meeting.overview || meeting.summary}
          </p>
        </div>
      )}
      
      {/* Notes (if expanded) */}
      {isExpanded && meeting.notes && (
        <div className="mb-3">
          <h5 className="text-xs font-medium opacity-80 mb-1">Notes:</h5>
          <p className="text-xs opacity-70 whitespace-pre-wrap">{meeting.notes}</p>
        </div>
      )}
      
      {/* Action Items */}
      {actionItems.length > 0 && (
        <div className="mb-3">
          <h5 className="text-xs font-medium opacity-80 mb-2">Action Items:</h5>
          <div className="space-y-2">
            {displayedItems.map((item, index) => (
              <div key={index} className="flex items-start gap-2">
                <CheckCircle size={14} className="text-green-400 mt-0.5 flex-shrink-0" />
                <div className="flex-1">
                  <p className="text-xs">{item.task}</p>
                  <span className="text-xs opacity-60">
                    Assigned to: {item.assignee}
                  </span>
                </div>
              </div>
            ))}
          </div>
          
          {/* Show more/less button */}
          {hasMoreItems && (
            <button
              onClick={() => setIsExpanded(!isExpanded)}
              className="mt-2 flex items-center gap-1 text-xs text-blue-400 hover:text-blue-300 transition-colors"
            >
              {isExpanded ? (
                <>
                  <ChevronUp size={14} />
                  Show less
                </>
              ) : (
                <>
                  <ChevronDown size={14} />
                  Show {actionItems.length - 3} more items
                </>
              )}
            </button>
          )}
        </div>
      )}
      
      {/* Meeting Date & Link */}
      <div className="flex justify-between items-center mt-3 pt-3 border-t border-gray-700">
        <span className="text-xs opacity-60">
          {new Date(meeting.date).toLocaleDateString()}
        </span>
        {meeting.firefliesUrl && (
          <a
            href={meeting.firefliesUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="text-xs text-blue-400 hover:text-blue-300 flex items-center gap-1"
          >
            View in Fireflies
            <ExternalLink size={12} />
          </a>
        )}
      </div>
    </div>
  );
};

export default MeetingCard;