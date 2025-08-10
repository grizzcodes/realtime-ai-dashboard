import React, { useState } from 'react';
import { Maximize2, Minimize2, RotateCcw } from 'lucide-react';

// Reusable Expandable Card Component
const ExpandableCard = ({ 
  title, 
  icon, 
  count, 
  children, 
  onRefresh, 
  isLoading,
  className = "",
  expandedContent,
  defaultExpanded = false
}) => {
  const [isExpanded, setIsExpanded] = useState(defaultExpanded);

  return (
    <div 
      className={`card-glass p-6 animate-fade-in transition-all duration-500 ease-in-out ${
        isExpanded ? 'col-span-full lg:col-span-full row-span-2 z-20' : ''
      } ${className}`}
      style={{
        maxHeight: isExpanded ? '80vh' : 'auto',
        overflow: 'hidden',
        transform: isExpanded ? 'scale(1.02)' : 'scale(1)',
        boxShadow: isExpanded ? '0 20px 40px rgba(0,0,0,0.3)' : ''
      }}
    >
      <div className="flex justify-between items-center mb-4">
        <h2 className="text-xl font-bold text-glow flex items-center gap-2">
          {typeof icon === 'string' ? <span className="text-2xl">{icon}</span> : icon}
          {title} {count !== undefined && `(${count})`}
        </h2>
        <div className="flex gap-2">
          <button
            onClick={() => setIsExpanded(!isExpanded)}
            className="btn-glass p-2 rounded-full transition-all hover:scale-110 hover:bg-white hover:bg-opacity-20"
            title={isExpanded ? "Minimize" : "Expand"}
          >
            {isExpanded ? <Minimize2 size={16} /> : <Maximize2 size={16} />}
          </button>
          {onRefresh && (
            <button
              onClick={onRefresh}
              disabled={isLoading}
              className="btn-glass p-2 rounded-full transition-all hover:bg-white hover:bg-opacity-20"
            >
              <RotateCcw size={16} className={isLoading ? 'animate-spin' : ''} />
            </button>
          )}
        </div>
      </div>
      
      <div className={`transition-all duration-500 ease-in-out ${
        isExpanded ? 'max-h-[70vh] overflow-y-auto pr-2' : 'max-h-96 overflow-y-auto'
      }`}>
        {isExpanded && expandedContent ? expandedContent : children}
      </div>
    </div>
  );
};

export default ExpandableCard;