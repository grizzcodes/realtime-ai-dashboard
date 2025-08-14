import React from 'react';
import { Check } from 'lucide-react';

// Helper function for relative time display
export const getRelativeTime = (date) => {
  if (!date) return null;
  
  const now = new Date();
  const dueDate = new Date(date);
  const diffMs = dueDate - now;
  const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24));
  const diffHours = Math.floor(diffMs / (1000 * 60 * 60));
  const diffMinutes = Math.floor(diffMs / (1000 * 60));
  
  // Overdue
  if (diffMs < 0) {
    const absDays = Math.abs(diffDays);
    const absHours = Math.abs(diffHours);
    
    if (absDays === 0) {
      if (absHours === 0) return { text: 'Overdue', color: 'text-red-500' };
      return { text: `${absHours}h overdue`, color: 'text-red-500' };
    }
    if (absDays === 1) return { text: '1 day overdue', color: 'text-red-500' };
    return { text: `${absDays} days overdue`, color: 'text-red-500' };
  }
  
  // Due now
  if (diffMinutes < 60) {
    return { text: 'Due now', color: 'text-red-500' };
  }
  
  // Due in hours
  if (diffHours < 24) {
    if (diffHours === 1) return { text: 'in 1 hour', color: 'text-orange-500' };
    return { text: `in ${diffHours} hours`, color: 'text-orange-500' };
  }
  
  // Due in days
  if (diffDays === 0) return { text: 'Due today', color: 'text-orange-500' };
  if (diffDays === 1) return { text: 'Due tomorrow', color: 'text-yellow-500' };
  if (diffDays === 2) return { text: 'in 2 days', color: 'text-yellow-500' };
  if (diffDays <= 7) return { text: `in ${diffDays} days`, color: 'text-blue-400' };
  
  // Due later
  const weeks = Math.floor(diffDays / 7);
  if (weeks === 1) return { text: 'in 1 week', color: 'text-gray-400' };
  if (weeks < 4) return { text: `in ${weeks} weeks`, color: 'text-gray-400' };
  
  const months = Math.floor(diffDays / 30);
  if (months === 1) return { text: 'in 1 month', color: 'text-gray-400' };
  return { text: `in ${months} months`, color: 'text-gray-400' };
};

// Enhanced Task Item Component
export const TaskItem = ({ task, completingTasks, completeTask, isExpanded = false }) => {
  const relativeTime = getRelativeTime(task.dueDate);
  const checkboxSize = isExpanded ? 'w-5 h-5' : 'w-4 h-4';
  const checkSize = isExpanded ? 14 : 12;
  
  return (
    <div className="task-card">
      <div className="flex justify-between items-start">
        <div className="flex items-start gap-2 flex-1">
          {/* Interactive Checkbox */}
          <button
            onClick={() => completeTask(task.id)}
            disabled={completingTasks[task.id]}
            className={`mt-0.5 ${checkboxSize} rounded border-2 transition-all flex items-center justify-center ${
              completingTasks[task.id] 
                ? 'bg-green-500 border-green-500' 
                : 'border-gray-400 hover:border-blue-400'
            }`}
          >
            {completingTasks[task.id] && (
              <Check size={checkSize} className="text-white animate-scale-in" />
            )}
          </button>
          
          <div className="flex-1">
            <h4 className={`font-medium ${!isExpanded ? 'text-sm' : ''}`}>
              {task.title || task.name}
            </h4>
            <div className={`flex items-center gap-2 text-xs opacity-70 mt-1 ${isExpanded ? 'gap-3 mt-2' : ''}`}>
              <span>👤 {task.assignedTo}</span>
              {task.priority && (
                <span className={`px-1 py-0.5 rounded text-xs priority-${
                  task.priority === 'High' ? 'high' :
                  task.priority === 'Medium' ? 'medium' : 'low'
                }`}>
                  {task.priority}
                </span>
              )}
              {task.type && (
                <span className={`px-1.5 py-0.5 bg-purple-500 bg-opacity-20 rounded ${isExpanded ? 'px-2' : ''}`}>
                  {isExpanded ? '🏷️ ' : ''}{task.type}
                </span>
              )}
              {relativeTime && (
                <span className={relativeTime.color}>
                  {isExpanded ? '📅 ' : ''}{relativeTime.text}
                </span>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default { getRelativeTime, TaskItem };
