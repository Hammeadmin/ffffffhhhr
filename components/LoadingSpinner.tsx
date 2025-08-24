import React from 'react';

interface LoadingSpinnerProps {
  size?: 'sm' | 'md' | 'lg' | 'xl';
  color?: 'blue' | 'white' | 'gray';
  text?: string;
  fullScreen?: boolean;
}

function LoadingSpinner({ 
  size = 'md', 
  color = 'blue', 
  text,
  fullScreen = false 
}: LoadingSpinnerProps) {
  const getSizeClasses = () => {
    switch (size) {
      case 'sm': return 'h-4 w-4';
      case 'md': return 'h-8 w-8';
      case 'lg': return 'h-12 w-12';
      case 'xl': return 'h-16 w-16';
      default: return 'h-8 w-8';
    }
  };

  const getColorClasses = () => {
    switch (color) {
      case 'blue': return 'border-blue-600';
      case 'white': return 'border-white';
      case 'gray': return 'border-gray-600';
      default: return 'border-blue-600';
    }
  };

  const spinner = (
    <div className={`animate-spin rounded-full ${getSizeClasses()} border-b-2 ${getColorClasses()}`}></div>
  );

  if (fullScreen) {
    return (
      <div className="fixed inset-0 bg-white bg-opacity-75 flex items-center justify-center z-50">
        <div className="text-center">
          {spinner}
          {text && (
            <p className="mt-4 text-gray-600 text-sm">{text}</p>
          )}
        </div>
      </div>
    );
  }

  if (text) {
    return (
      <div className="flex items-center justify-center space-x-3">
        {spinner}
        <span className="text-gray-600 text-sm">{text}</span>
      </div>
    );
  }

  return spinner;
}

export default LoadingSpinner;