import React, { useState, useEffect } from 'react';
import { Bell, X, Check, Clock, AlertCircle, TrendingUp, FileText, Receipt, Calendar, Users, CheckCircle, Trash2, Package, User } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { useNotifications } from '../hooks/useNotifications';
import { formatDateTime } from '../lib/database';
import type { Notification } from '../lib/notifications';

interface NotificationPanelProps {
  isOpen: boolean;
  onClose: () => void;
}

function NotificationPanel({ isOpen, onClose }: NotificationPanelProps) {
  const navigate = useNavigate();
  const {
    notifications,
    unreadCount,
    loading,
    error,
    markAsRead,
    markAllAsRead,
    deleteNotification: deleteNotificationLocal,
    refreshNotifications,
    clearError
  } = useNotifications();
  
  const [filter, setFilter] = useState<'all' | 'unread' | 'high'>('all');

  const filteredNotifications = notifications.filter(notification => {
    switch (filter) {
      case 'unread': return !notification.is_read;
      case 'high': return notification.type === 'order_assignment' || notification.type === 'status_update';
      default: return true;
    }
  });

  const handleNotificationClick = async (notification: Notification) => {
    // Mark as read if not already read
    if (!notification.is_read) {
      await markAsRead(notification.id);
    }

    // Navigate to action URL if available
    if (notification.action_url) {
      navigate(notification.action_url);
      onClose();
    }
  };

  const getNotificationIcon = (type: string) => {
    switch (type) {
      case 'order_assignment': return Package;
      case 'event_assignment': return Calendar;
      case 'status_update': return TrendingUp;
      case 'system': return AlertCircle;
      default: return Bell;
    }
  };

  const getNotificationColor = (type: string) => {
    switch (type) {
      case 'order_assignment': return 'text-blue-600 bg-blue-100 dark:text-blue-400 dark:bg-blue-900/30';
      case 'event_assignment': return 'text-indigo-600 bg-indigo-100 dark:text-indigo-400 dark:bg-indigo-900/30';
      case 'status_update': return 'text-green-600 bg-green-100 dark:text-green-400 dark:bg-green-900/30';
      case 'system': return 'text-gray-600 bg-gray-100 dark:text-gray-400 dark:bg-gray-700';
      default: return 'text-gray-600 bg-gray-100 dark:text-gray-400 dark:bg-gray-700';
    }
  };

  const getRelativeTime = (timestamp?: string) => {
    if (!timestamp) return '';
    
    const now = new Date();
    const time = new Date(timestamp);
    const diffInMinutes = Math.floor((now.getTime() - time.getTime()) / (1000 * 60));
    
    if (diffInMinutes < 1) return 'just nu';
    if (diffInMinutes < 60) return `${diffInMinutes}m sedan`;
    if (diffInMinutes < 1440) return `${Math.floor(diffInMinutes / 60)}h sedan`;
    return `${Math.floor(diffInMinutes / 1440)}d sedan`;
  };

  // Refresh notifications when panel opens
  useEffect(() => {
    if (isOpen) {
      refreshNotifications();
    }
  }, [isOpen, refreshNotifications]);

  if (!isOpen) return null;

  return (
    <div className="fixed inset-y-0 right-0 w-96 bg-white dark:bg-gray-800 border-l border-gray-200 dark:border-gray-700 shadow-2xl z-40 transform transition-transform duration-300 ease-in-out">
      {/* Header */}
      <div className="flex items-center justify-between p-6 border-b border-gray-200 dark:border-gray-700">
        <div className="flex items-center space-x-3">
          <Bell className="w-6 h-6 text-gray-700 dark:text-gray-300" />
          <div>
            <h2 className="text-lg font-semibold text-gray-900 dark:text-white">Notifieringar</h2>
            {unreadCount > 0 && (
              <p className="text-sm text-gray-500 dark:text-gray-400">
                {unreadCount} olästa
              </p>
            )}
          </div>
        </div>
        <button
          onClick={onClose}
          className="p-2 rounded-lg text-gray-400 dark:text-gray-500 hover:text-gray-600 dark:hover:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors duration-200"
        >
          <X className="w-5 h-5" />
        </button>
      </div>

      {/* Error Display */}
      {error && (
        <div className="mx-4 mb-4 bg-red-50 border border-red-200 rounded-lg p-3">
          <div className="flex items-center justify-between">
            <div className="flex items-center">
              <AlertCircle className="w-4 h-4 text-red-600 mr-2" />
              <p className="text-sm text-red-700">{error}</p>
            </div>
            <button onClick={clearError} className="text-red-400 hover:text-red-600">
              <X className="w-4 h-4" />
            </button>
          </div>
        </div>
      )}

      {/* Filters and Actions */}
      <div className="p-4 border-b border-gray-200 dark:border-gray-700 space-y-3">
        <div className="flex items-center justify-between">
          <div className="flex space-x-2">
            {[
              { key: 'all', label: 'Alla' },
              { key: 'unread', label: 'Olästa' },
              { key: 'high', label: 'Viktiga' }
            ].map((filterOption) => (
              <button
                key={filterOption.key}
                onClick={() => setFilter(filterOption.key as any)}
                className={`px-3 py-1 text-xs font-medium rounded-full transition-colors duration-200 ${
                  filter === filterOption.key
                    ? 'bg-primary-100 dark:bg-primary-900/30 text-primary-700 dark:text-primary-300'
                    : 'bg-gray-100 dark:bg-gray-700 text-gray-600 dark:text-gray-400 hover:bg-gray-200 dark:hover:bg-gray-600'
                }`}
              >
                {filterOption.label}
              </button>
            ))}
          </div>
          
          {unreadCount > 0 && (
            <button
              onClick={markAllAsRead}
              className="text-xs text-primary-600 dark:text-primary-400 hover:text-primary-700 dark:hover:text-primary-300 font-medium"
            >
              Markera alla som lästa
            </button>
          )}
        </div>
      </div>

      {/* Notifications List */}
      <div className="flex-1 overflow-y-auto scrollbar-thin">
        {loading ? (
          <div className="p-6 space-y-4">
            {[1, 2, 3].map(i => (
              <div key={i} className="animate-pulse">
                <div className="flex items-start space-x-3">
                  <div className="w-10 h-10 bg-gray-200 dark:bg-gray-700 rounded-lg"></div>
                  <div className="flex-1 space-y-2">
                    <div className="h-4 bg-gray-200 dark:bg-gray-700 rounded w-3/4"></div>
                    <div className="h-3 bg-gray-200 dark:bg-gray-700 rounded w-1/2"></div>
                  </div>
                </div>
              </div>
            ))}
          </div>
        ) : filteredNotifications.length === 0 ? (
          <div className="p-8 text-center text-gray-500 dark:text-gray-400">
            <Bell className="w-12 h-12 mx-auto mb-3 text-gray-400 dark:text-gray-500" />
            <p className="text-sm font-medium">
              {filter === 'unread' ? 'Inga olästa notifieringar' : 
               filter === 'high' ? 'Inga viktiga notifieringar' : 
               'Inga notifieringar'}
            </p>
            <p className="text-xs mt-1">Du är uppdaterad!</p>
          </div>
        ) : (
          <div className="p-4 space-y-2">
            {filteredNotifications.map((notification) => {
              const Icon = getNotificationIcon(notification.type);
              
              return (
                <div
                  key={notification.id}
                  className={`group relative p-4 rounded-xl border transition-all duration-200 hover:shadow-md cursor-pointer ${
                    notification.is_read
                      ? 'bg-gray-50 dark:bg-gray-700/50 border-gray-200 dark:border-gray-600'
                      : 'bg-white dark:bg-gray-700 border-primary-200 dark:border-primary-700 shadow-sm'
                  }`}
                  onClick={() => handleNotificationClick(notification)}
                >
                  {/* Unread indicator */}
                  {!notification.is_read && (
                    <div className="absolute left-2 top-1/2 transform -translate-y-1/2 w-2 h-2 bg-primary-500 rounded-full"></div>
                  )}

                  <div className="flex items-start space-x-3">
                    <div className={`w-10 h-10 rounded-lg flex items-center justify-center shadow-sm ${getNotificationColor(notification.type)}`}>
                      <Icon className="w-5 h-5" />
                    </div>
                    
                    <div className="flex-1 min-w-0">
                      <div className="flex items-start justify-between mb-1">
                        <h4 className="text-sm font-medium text-gray-900 dark:text-white">
                          {notification.title}
                        </h4>
                        <div className="flex items-center space-x-1 opacity-0 group-hover:opacity-100 transition-opacity duration-200">
                          {!notification.is_read && (
                            <button
                              onClick={(e) => {
                                e.stopPropagation();
                                markAsRead(notification.id);
                              }}
                              className="p-1 rounded text-gray-400 dark:text-gray-500 hover:text-green-600 dark:hover:text-green-400"
                              title="Markera som läst"
                            >
                              <Check className="w-3 h-3" />
                            </button>
                          )}
                          <button
                            onClick={(e) => {
                              e.stopPropagation();
                              deleteNotificationLocal(notification.id);
                            }}
                            className="p-1 rounded text-gray-400 dark:text-gray-500 hover:text-red-600 dark:hover:text-red-400"
                            title="Ta bort"
                          >
                            <Trash2 className="w-3 h-3" />
                          </button>
                        </div>
                      </div>
                      
                      <p className="text-sm text-gray-600 dark:text-gray-400 mb-2">
                        {notification.message}
                      </p>
                      
                      <div className="flex items-center justify-between">
                        <span className="text-xs text-gray-500 dark:text-gray-500">
                          {getRelativeTime(notification.created_at)}
                        </span>
                      </div>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* Footer */}
      {!loading && notifications.length > 0 && (
        <div className="p-4 border-t border-gray-200 dark:border-gray-700">
          <button
            onClick={() => {
              navigate('/notifieringar');
              onClose();
            }}
            className="w-full text-center text-sm text-primary-600 dark:text-primary-400 hover:text-primary-700 dark:hover:text-primary-300 font-medium py-2"
          >
            Visa alla notifieringar
          </button>
        </div>
      )}
    </div>
  );

}

export default NotificationPanel;