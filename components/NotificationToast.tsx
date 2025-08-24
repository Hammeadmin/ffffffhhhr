import React, { useEffect, useState } from 'react';
import { Bell, X, ExternalLink } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import type { Notification } from '../lib/notifications';

interface NotificationToastProps {
  notification: Notification;
  onDismiss: () => void;
  onMarkAsRead: () => void;
}

function NotificationToast({ notification, onDismiss, onMarkAsRead }: NotificationToastProps) {
  const navigate = useNavigate();
  const [isVisible, setIsVisible] = useState(false);

  useEffect(() => {
    // Animate in
    const timer = setTimeout(() => setIsVisible(true), 100);
    
    // Auto dismiss after 8 seconds
    const dismissTimer = setTimeout(() => {
      handleDismiss();
    }, 8000);
    
    return () => {
      clearTimeout(timer);
      clearTimeout(dismissTimer);
    };
  }, []);

  const handleDismiss = () => {
    setIsVisible(false);
    setTimeout(onDismiss, 300);
  };

  const handleClick = () => {
    onMarkAsRead();
    
    if (notification.action_url) {
      navigate(notification.action_url);
    }
    
    handleDismiss();
  };

  const getNotificationColor = (type: string) => {
    switch (type) {
      case 'order_assignment':
        return 'border-blue-400 bg-blue-50';
      case 'event_assignment':
        return 'border-indigo-400 bg-indigo-50';
      case 'status_update':
        return 'border-green-400 bg-green-50';
      case 'system':
        return 'border-gray-400 bg-gray-50';
      default:
        return 'border-blue-400 bg-blue-50';
    }
  };

  return (
    <div
      className={`
        ${getNotificationColor(notification.type)} border-l-4 shadow-lg
        max-w-sm w-full p-4 rounded-xl pointer-events-auto transform transition-all duration-300 ease-in-out
        ${isVisible ? 'translate-x-0 opacity-100' : 'translate-x-full opacity-0'}
        ${notification.action_url ? 'cursor-pointer hover:shadow-xl' : ''}
      `}
      onClick={notification.action_url ? handleClick : undefined}
    >
      <div className="flex items-start">
        <div className="flex-shrink-0">
          <Bell className="w-5 h-5 text-blue-600" />
        </div>
        <div className="ml-3 flex-1">
          <p className="text-sm font-medium text-gray-900">
            {notification.title}
          </p>
          <p className="mt-1 text-sm text-gray-600">
            {notification.message}
          </p>
          {notification.action_url && (
            <div className="mt-2 flex items-center text-xs text-blue-600">
              <ExternalLink className="w-3 h-3 mr-1" />
              Klicka för att visa
            </div>
          )}
        </div>
        <div className="ml-4 flex-shrink-0">
          <button
            onClick={(e) => {
              e.stopPropagation();
              handleDismiss();
            }}
            className="inline-flex text-gray-400 hover:text-gray-600 focus:outline-none focus:text-gray-600 transition-colors duration-200 p-1 rounded-lg hover:bg-white/20"
          >
            <X className="w-4 h-4" />
          </button>
        </div>
      </div>
    </div>
  );
}

export default NotificationToast;