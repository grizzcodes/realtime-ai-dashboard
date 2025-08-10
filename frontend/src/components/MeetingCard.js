import React, { useState } from 'react';
import { Users, Clock, CheckCircle, ExternalLink, ChevronDown, ChevronUp, Plus } from 'lucide-react';

const MeetingCard = ({ meeting, pushActionItemToNotion, pushingToNotion }) => {
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
    <div className="task-card hover:shadow-lg transition-shadow border border-gray-700">
      {/* Meeting Header */}
      <div className="mb-3">
        <h4 className="font-bold text-lg">
          {meeting.title || 'Meeting Summary'}
        </h4>
        <div className="flex flex-wrap items-center gap-4 mt-2 text-xs opacity-70">
          {meeting.meetingDateTime && (
            <span>📅 {meeting.meetingDateTime}</span>
          )}
          <div className="flex items-center gap-1">
            <Users size={12} />
            <span>{meeting.attendees || meeting.participants?.split(',').length || 1} attendees</span>
          </div>
          <div className="flex items-center gap-1">
            <Clock size={12} />
            <span>{meeting.duration || 'N/A'}</span>
          </div>
        </div>
      </div>
      
      {/* Participants */}
      {meeting.participants && (
        <div className="mb-3 p-2 bg-gray-800 bg-opacity-50 rounded">
          <h5 className="text-xs font-bold text-blue-400 mb-1">Participants:</h5>
          <p className="text-xs opacity-90">{meeting.participants}</p>
        </div>
      )}
      
      {/* Gist */}
      {meeting.gist && (
        <div className="mb-3 p-2 bg-gray-800 bg-opacity-50 rounded">
          <h5 className="text-xs font-bold text-green-400 mb-1">Gist:</h5>
          <p className="text-xs opacity-90 whitespace-pre-wrap">
            {isExpanded ? meeting.gist : (meeting.gist.substring(0, 200) + (meeting.gist.length > 200 ? '...' : ''))}
          </p>
        </div>
      )}
      
      {/* Overview */}
      {meeting.overview && (
        <div className="mb-3 p-2 bg-gray-800 bg-opacity-50 rounded">
          <h5 className="text-xs font-bold text-yellow-400 mb-1">Overview:</h5>
          <p className="text-xs opacity-90 whitespace-pre-wrap">
            {isExpanded ? meeting.overview : (meeting.overview.substring(0, 200) + (meeting.overview.length > 200 ? '...' : ''))}
          </p>
        </div>
      )}
      
      {/* Summary (if no overview/gist) */}
      {meeting.summary && !meeting.overview && !meeting.gist && (
        <div className="mb-3 p-2 bg-gray-800 bg-opacity-50 rounded">
          <h5 className="text-xs font-bold text-purple-400 mb-1">Summary:</h5>
          <p className="text-xs opacity-90">{meeting.summary}</p>
        </div>
      )}
      
      {/* Notes (if expanded) */}
      {isExpanded && meeting.notes && (
        <div className="mb-3 p-2 bg-gray-800 bg-opacity-50 rounded">
          <h5 className="text-xs font-bold text-indigo-400 mb-1">Notes:</h5>
          <p className="text-xs opacity-90 whitespace-pre-wrap">{meeting.notes}</p>
        </div>
      )}
      
      {/* Action Items */}
      {actionItems.length > 0 && (
        <div className="mb-3">
          <h5 className="text-sm font-bold text-orange-400 mb-2 flex items-center gap-2">
            <CheckCircle size={14} />
            Action Items ({actionItems.length})
          </h5>
          <div className="space-y-2">
            {displayedItems.map((item, index) => (
              <div key={index} className="bg-gray-900 bg-opacity-50 rounded-lg p-3 border border-gray-700">
                <div className="flex items-start gap-2">
                  <CheckCircle size={14} className="text-green-400 mt-0.5 flex-shrink-0" />
                  <div className="flex-1">
                    <p className="text-xs text-gray-200">{item.task}</p>
                    <div className="flex items-center justify-between mt-2">
                      <span className="text-xs opacity-70 text-blue-300">
                        👤 {item.assignee}
                      </span>
                      {pushActionItemToNotion && (
                        <button
                          onClick={() => pushActionItemToNotion(item, meeting, index)}
                          disabled={pushingToNotion && pushingToNotion[`${meeting.id}-${index}`]}
                          className="btn-glass px-3 py-1 text-xs rounded-full flex items-center gap-1 hover:bg-blue-500 hover:bg-opacity-30 transition-all"
                          title="Push to Notion"
                        >
                          {pushingToNotion && pushingToNotion[`${meeting.id}-${index}`] ? (
                            <div className="loading-spinner border-white w-3 h-3"></div>
                          ) : (
                            <>
                              <Plus size={12} />
                              Add to Notion
                            </>
                          )}
                        </button>
                      )}
                    </div>
                  </div>
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
      
      {/* No Action Items Message */}
      {(!actionItems || actionItems.length === 0) && (
        <div className="mb-3 p-3 bg-gray-800 bg-opacity-30 rounded text-center">
          <p className="text-xs opacity-60">No action items found for this meeting</p>
        </div>
      )}
      
      {/* Meeting Footer */}
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