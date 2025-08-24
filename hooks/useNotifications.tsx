import { useState, useEffect, useCallback } from 'react';
import { createPortal } from 'react-dom';
import { useAuth } from '../contexts/AuthContext';
import NotificationToast from '../components/NotificationToast';
import {
  getNotifications,
  getUnreadNotificationCount,
  markNotificationAsRead,
  markAllNotificationsAsRead,
  deleteNotification,
  subscribeToNotifications,
  type Notification
} from '../lib/notifications';

export function useNotifications() {
  const { user } = useAuth();
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [unreadCount, setUnreadCount] = useState(0);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [toastNotifications, setToastNotifications] = useState<Notification[]>([]);

  // Load notifications
  const loadNotifications = useCallback(async () => {
    if (!user) return;

    try {
      setLoading(true);
      setError(null);

      const [notificationsResult, countResult] = await Promise.all([
        getNotifications(user.id, 50),
        getUnreadNotificationCount(user.id)
      ]);

      if (notificationsResult.error) {
        setError(notificationsResult.error.message);
        return;
      }

      if (countResult.error) {
        setError(countResult.error.message);
        return;
      }

      setNotifications(notificationsResult.data || []);
      setUnreadCount(countResult.data || 0);
    } catch (err) {
      console.error('Error loading notifications:', err);
      setError('Kunde inte ladda notifieringar');
    } finally {
      setLoading(false);
    }
  }, [user]);

  // Mark notification as read
  const markAsRead = useCallback(async (notificationId: string) => {
    const result = await markNotificationAsRead(notificationId);
    
    if (result.error) {
      setError(result.error.message);
      return;
    }

    // Update local state
    setNotifications(prev => prev.map(notification => 
      notification.id === notificationId 
        ? { ...notification, is_read: true }
        : notification
    ));

    // Update unread count
    setUnreadCount(prev => Math.max(0, prev - 1));
  }, []);

  // Mark all notifications as read
  const markAllAsRead = useCallback(async () => {
    if (!user) return;

    const result = await markAllNotificationsAsRead(user.id);
    
    if (result.error) {
      setError(result.error.message);
      return;
    }

    // Update local state
    setNotifications(prev => prev.map(notification => ({ 
      ...notification, 
      is_read: true 
    })));
    setUnreadCount(0);
  }, [user]);

  // Delete notification
  const deleteNotificationLocal = useCallback(async (notificationId: string) => {
    const result = await deleteNotification(notificationId);
    
    if (result.error) {
      setError(result.error.message);
      return;
    }

    // Update local state
    const notification = notifications.find(n => n.id === notificationId);
    setNotifications(prev => prev.filter(n => n.id !== notificationId));
    
    // Update unread count if the deleted notification was unread
    if (notification && !notification.is_read) {
      setUnreadCount(prev => Math.max(0, prev - 1));
    }
  }, [notifications]);

  // Handle new real-time notification
  const handleNewNotification = useCallback((newNotification: Notification) => {
    setNotifications(prev => [newNotification, ...prev]);
    
    if (!newNotification.is_read) {
      setUnreadCount(prev => prev + 1);
    }

    // Show toast notification for new notifications
    setToastNotifications(prev => [...prev, newNotification]);

    // Show browser notification if permission granted
    if ('Notification' in window && Notification.permission === 'granted') {
      new window.Notification(newNotification.title, {
        body: newNotification.message,
        icon: '/vite.svg',
        tag: newNotification.id
      });
    }
  }, []);

  // Remove toast notification
  const removeToastNotification = useCallback((notificationId: string) => {
    setToastNotifications(prev => prev.filter(n => n.id !== notificationId));
  }, []);

  // Mark toast notification as read and remove
  const markToastAsRead = useCallback(async (notificationId: string) => {
    await markAsRead(notificationId);
    removeToastNotification(notificationId);
  }, [markAsRead, removeToastNotification]);
  // Set up real-time subscription
  useEffect(() => {
    if (!user) return;

    const unsubscribe = subscribeToNotifications(user.id, handleNewNotification);
    
    return unsubscribe;
  }, [user, handleNewNotification]);

  // Load notifications on mount and user change
  useEffect(() => {
    if (user) {
      loadNotifications();
    }
  }, [user, loadNotifications]);

  // Request notification permission
  useEffect(() => {
    if ('Notification' in window && window.Notification.permission === 'default') {
      window.Notification.requestPermission();
    }
  }, []);

  // Render toast notifications
  const renderToastNotifications = () => {
    if (toastNotifications.length === 0) return null;

    return createPortal(
      <div className="fixed top-4 right-4 z-50 space-y-2 pointer-events-none">
        {toastNotifications.map((notification) => (
          <NotificationToast
            key={notification.id}
            notification={notification}
            onDismiss={() => removeToastNotification(notification.id)}
            onMarkAsRead={() => markToastAsRead(notification.id)}
          />
        ))}
      </div>,
      document.body
    );
  };
  return {
    notifications,
    unreadCount,
    loading,
    error,
    markAsRead,
    markAllAsRead,
    deleteNotification: deleteNotificationLocal,
    refreshNotifications: loadNotifications,
    clearError: () => setError(null),
    renderToastNotifications
  };
}