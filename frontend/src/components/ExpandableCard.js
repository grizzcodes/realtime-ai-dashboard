import React, { useState, useEffect, useRef } from 'react';
import { Maximize2, Minimize2, RotateCcw } from 'lucide-react';

// Reusable Expandable Card Component with Floating Overlay
const ExpandableCard = ({ 
  title, 
  icon, 
  count, 
  children, 
  onRefresh, 
  isLoading,
  className = "",
  expandedContent,
  defaultExpanded = false,
  collapsedHeight = "max-h-96" // New prop for customizable collapsed height
}) => {
  const [isExpanded, setIsExpanded] = useState(defaultExpanded);
  const [cardPosition, setCardPosition] = useState(null);
  const cardRef = useRef(null);

  useEffect(() => {
    if (isExpanded && cardRef.current) {
      // Capture original position before expanding
      const rect = cardRef.current.getBoundingClientRect();
      setCardPosition({
        top: rect.top,
        left: rect.left,
        width: rect.width,
        height: rect.height
      });
    }
  }, [isExpanded]);

  return (
    <>
      {/* Backdrop when expanded */}
      {isExpanded && (
        <div 
          className="fixed inset-0 bg-black bg-opacity-50 backdrop-blur-sm z-40 transition-all duration-300"
          onClick={() => setIsExpanded(false)}
        />
      )}
      
      {/* Main Card */}
      <div 
        ref={cardRef}
        className={`card-glass p-6 animate-fade-in transition-all duration-500 ease-in-out ${
          isExpanded 
            ? 'fixed z-50 shadow-2xl' 
            : 'relative hover:shadow-lg hover:-translate-y-1'
        } ${className}`}
        style={
          isExpanded 
            ? {
                top: '50%',
                left: '50%',
                transform: 'translate(-50%, -50%)',
                width: '90vw',
                maxWidth: '1200px',
                height: '85vh',
                maxHeight: '85vh',
                animation: 'expandFloat 0.5s ease-out'
              }
            : {
                transform: 'scale(1)',
                maxHeight: 'auto',
                overflow: 'hidden'
              }
        }
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
          isExpanded 
            ? 'max-h-[calc(85vh-80px)] overflow-y-auto pr-2 custom-scrollbar' 
            : `${collapsedHeight} overflow-y-auto`
        }`}>
          {isExpanded && expandedContent ? expandedContent : children}
        </div>
      </div>
    </>
  );
};

export default ExpandableCard;