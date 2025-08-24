import React, { useState } from 'react';
import { HelpCircle, X } from 'lucide-react';

interface HelpTooltipProps {
  content: string;
  title?: string;
  position?: 'top' | 'bottom' | 'left' | 'right';
  size?: 'sm' | 'md' | 'lg';
}

function HelpTooltip({ content, title, position = 'top', size = 'sm' }: HelpTooltipProps) {
  const [isVisible, setIsVisible] = useState(false);

  const getPositionClasses = () => {
    switch (position) {
      case 'bottom':
        return 'top-full left-1/2 transform -translate-x-1/2 mt-2';
      case 'left':
        return 'right-full top-1/2 transform -translate-y-1/2 mr-2';
      case 'right':
        return 'left-full top-1/2 transform -translate-y-1/2 ml-2';
      default: // top
        return 'bottom-full left-1/2 transform -translate-x-1/2 mb-2';
    }
  };

  const getArrowClasses = () => {
    switch (position) {
      case 'bottom':
        return 'bottom-full left-1/2 transform -translate-x-1/2 border-b-gray-800 border-b-4 border-x-transparent border-x-4 border-t-0';
      case 'left':
        return 'left-full top-1/2 transform -translate-y-1/2 border-l-gray-800 border-l-4 border-y-transparent border-y-4 border-r-0';
      case 'right':
        return 'right-full top-1/2 transform -translate-y-1/2 border-r-gray-800 border-r-4 border-y-transparent border-y-4 border-l-0';
      default: // top
        return 'top-full left-1/2 transform -translate-x-1/2 border-t-gray-800 border-t-4 border-x-transparent border-x-4 border-b-0';
    }
  };

  const getSizeClasses = () => {
    switch (size) {
      case 'lg':
        return 'w-80 max-w-sm';
      case 'md':
        return 'w-64 max-w-xs';
      default:
        return 'w-48 max-w-xs';
    }
  };

  return (
    <div className="relative inline-block">
      <button
        type="button"
        onMouseEnter={() => setIsVisible(true)}
        onMouseLeave={() => setIsVisible(false)}
        onClick={() => setIsVisible(!isVisible)}
        className="text-gray-400 hover:text-gray-600 focus:outline-none focus:text-gray-600 transition-colors"
      >
        <HelpCircle className="w-4 h-4" />
      </button>

      {isVisible && (
        <>
          {/* Mobile backdrop */}
          <div 
            className="fixed inset-0 z-40 md:hidden"
            onClick={() => setIsVisible(false)}
          />
          
          <div className={`absolute z-50 ${getPositionClasses()}`}>
            <div className={`bg-gray-800 text-white text-sm rounded-lg shadow-lg p-3 ${getSizeClasses()}`}>
              {/* Close button for mobile */}
              <button
                onClick={() => setIsVisible(false)}
                className="absolute top-2 right-2 text-gray-300 hover:text-white md:hidden"
              >
                <X className="w-3 h-3" />
              </button>

              {title && (
                <div className="font-semibold mb-2 pr-6 md:pr-0">{title}</div>
              )}
              <div className="text-gray-200 leading-relaxed pr-6 md:pr-0">
                {content}
              </div>
              
              {/* Arrow */}
              <div className={`absolute w-0 h-0 ${getArrowClasses()}`}></div>
            </div>
          </div>
        </>
      )}
    </div>
  );
}

export default HelpTooltip;