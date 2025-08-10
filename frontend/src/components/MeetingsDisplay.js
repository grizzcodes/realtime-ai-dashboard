// frontend/src/components/MeetingsDisplay.js
import React from 'react';
import MeetingCard from './MeetingCard';
import { RotateCcw } from 'lucide-react';

const MeetingsDisplay = ({ meetings, isLoading, onRefresh, pushActionItemToNotion, pushingToNotion }) => {
  // Debug log to see what data we have
  React.useEffect(() => {
    if (meetings && meetings.length > 0) {
      console.log('🎯 Meetings Data Debug:', {
        totalMeetings: meetings.length,
        firstMeeting: meetings[0],
        hasGist: !!meetings[0]?.gist,
        hasOverview: !!meetings[0]?.overview,
        hasNotes: !!meetings[0]?.notes,
        actionItemsCount: meetings[0]?.actionItems?.length || 0
      });
    }
  }, [meetings]);

  return (
    <div className="w-full">
      {/* Header */}
      <div className="flex justify-between items-center mb-4">
        <h2 className="text-xl font-bold text-glow flex items-center gap-2">
          🎙️ Fireflies Meetings ({meetings.length})
        </h2>
        <button
          onClick={onRefresh}
          disabled={isLoading}
          className="btn-glass p-2 rounded-full transition-all hover:scale-110 hover:bg-white hover:bg-opacity-20"
          title="Refresh"
        >
          <RotateCcw size={16} className={isLoading ? 'animate-spin' : ''} />
        </button>
      </div>

      {/* Meetings List */}
      <div className="space-y-4 max-h-[70vh] overflow-y-auto pr-2">
        {meetings.length === 0 ? (
          <div className="text-center py-8 opacity-70">
            <p>No meetings found.</p>
            <p className="text-sm mt-2">Check your Slack #fireflies-ai channel.</p>
          </div>
        ) : (
          meetings.map((meeting) => (
            <MeetingCard
              key={meeting.id}
              meeting={meeting}
              pushActionItemToNotion={pushActionItemToNotion}
              pushingToNotion={pushingToNotion}
            />
          ))
        )}
      </div>

      {/* Debug Panel (remove in production) */}
      {process.env.NODE_ENV === 'development' && meetings.length > 0 && (
        <div className="mt-4 p-3 bg-gray-900 bg-opacity-50 rounded text-xs">
          <h4 className="font-bold mb-2">Debug Info:</h4>
          <pre className="text-xs opacity-70">
            {JSON.stringify({
              totalMeetings: meetings.length,
              firstMeetingKeys: Object.keys(meetings[0] || {}),
              hasContent: {
                gist: meetings.filter(m => m.gist).length,
                overview: meetings.filter(m => m.overview).length,
                notes: meetings.filter(m => m.notes).length,
                actionItems: meetings.filter(m => m.actionItems?.length > 0).length
              }
            }, null, 2)}
          </pre>
        </div>
      )}
    </div>
  );
};

export default MeetingsDisplay;