import { supabase } from './supabase';

export type NotificationType = 'order_assignment' | 'event_assignment' | 'status_update' | 'system';

export interface Notification {
  id: string;
  user_id: string;
  type: NotificationType;
  title: string;
  message: string;
  is_read: boolean;
  action_url?: string | null;
  created_at?: string | null;
}

export interface NotificationWithUser extends Notification {
  user?: {
    id: string;
    full_name: string;
    email?: string;
  };
}

export interface CreateNotificationRequest {
  user_id: string;
  type: NotificationType;
  title: string;
  message: string;
  action_url?: string;
  metadata?: {
    order_id?: string;
    order_title?: string;
    event_id?: string;
    event_title?: string;
    team_id?: string;
    team_name?: string;
    old_status?: string;
    new_status?: string;
  };
}

export interface CreateTeamNotificationRequest {
  team_id: string;
  type: NotificationType;
  title: string;
  message: string;
  action_url?: string;
  exclude_user_id?: string;
}

// Get notifications for a user
export const getNotifications = async (
  userId: string,
  limit = 50,
  unreadOnly = false
): Promise<{ data: Notification[] | null; error: Error | null }> => {
  try {
    let query = supabase
      .from('notifications')
      .select('*')
      .eq('user_id', userId);

    if (unreadOnly) {
      query = query.eq('is_read', false);
    }

    const { data, error } = await query
      .order('created_at', { ascending: false })
      .limit(limit);

    if (error) {
      return { data: null, error: new Error(error.message) };
    }

    return { data: data || [], error: null };
  } catch (err) {
    console.error('Error fetching notifications:', err);
    return { data: null, error: err as Error };
  }
};

// Get unread notification count
export const getUnreadNotificationCount = async (
  userId: string
): Promise<{ data: number | null; error: Error | null }> => {
  try {
    const { count, error } = await supabase
      .from('notifications')
      .select('*', { count: 'exact', head: true })
      .eq('user_id', userId)
      .eq('is_read', false);

    if (error) {
      return { data: null, error: new Error(error.message) };
    }

    return { data: count || 0, error: null };
  } catch (err) {
    console.error('Error fetching unread count:', err);
    return { data: null, error: err as Error };
  }
};

// Mark notification as read
export const markNotificationAsRead = async (
  notificationId: string
): Promise<{ error: Error | null }> => {
  try {
    const { error } = await supabase
      .from('notifications')
      .update({ is_read: true })
      .eq('id', notificationId);

    if (error) {
      return { error: new Error(error.message) };
    }

    return { error: null };
  } catch (err) {
    console.error('Error marking notification as read:', err);
    return { error: err as Error };
  }
};

// Mark all notifications as read for a user
export const markAllNotificationsAsRead = async (
  userId: string
): Promise<{ error: Error | null }> => {
  try {
    const { error } = await supabase
      .from('notifications')
      .update({ is_read: true })
      .eq('user_id', userId)
      .eq('is_read', false);

    if (error) {
      return { error: new Error(error.message) };
    }

    return { error: null };
  } catch (err) {
    console.error('Error marking all notifications as read:', err);
    return { error: err as Error };
  }
};

// Delete notification
export const deleteNotification = async (
  notificationId: string
): Promise<{ error: Error | null }> => {
  try {
    const { error } = await supabase
      .from('notifications')
      .delete()
      .eq('id', notificationId);

    if (error) {
      return { error: new Error(error.message) };
    }

    return { error: null };
  } catch (err) {
    console.error('Error deleting notification:', err);
    return { error: err as Error };
  }
};

// Create notification via Edge Function
export const createNotification = async (
  request: CreateNotificationRequest
): Promise<{ data: any | null; error: Error | null }> => {
  try {
    const { data, error } = await supabase.functions.invoke('create-notification', {
      body: request
    });

    if (error) {
      return { data: null, error: new Error(error.message) };
    }

    return { data, error: null };
  } catch (err) {
    console.error('Error creating notification:', err);
    return { data: null, error: err as Error };
  }
};

// Create team notification via Edge Function
export const createTeamNotification = async (
  request: CreateTeamNotificationRequest
): Promise<{ data: any | null; error: Error | null }> => {
  try {
    const { data, error } = await supabase.functions.invoke('create-notification', {
      body: request
    });

    if (error) {
      return { data: null, error: new Error(error.message) };
    }

    return { data, error: null };
  } catch (err) {
    console.error('Error creating team notification:', err);
    return { data: null, error: err as Error };
  }
};

// Subscribe to real-time notifications
export const subscribeToNotifications = (
  userId: string,
  onNotification: (notification: Notification) => void
) => {
  const channel = supabase
    .channel('notifications')
    .on(
      'postgres_changes',
      {
        event: 'INSERT',
        schema: 'public',
        table: 'notifications',
        filter: `user_id=eq.${userId}`
      },
      (payload) => {
        console.log('New notification received:', payload);
        onNotification(payload.new as Notification);
      }
    )
    .subscribe();

  return () => {
    supabase.removeChannel(channel);
  };
};

// Utility functions for generating notification content
export const generateOrderAssignmentNotification = (
  userId: string,
  orderId: string,
  orderTitle: string
): CreateNotificationRequest => ({
  user_id: userId,
  type: 'order_assignment',
  title: 'Ny order tilldelad',
  message: `Du har tilldelats ordern "${orderTitle}"`,
  action_url: `/ordrar?highlight=${orderId}`,
  metadata: {
    order_id: orderId,
    order_title: orderTitle
  }
});

export const generateEventAssignmentNotification = (
  userId: string,
  eventId: string,
  eventTitle: string,
  eventDate?: string
): CreateNotificationRequest => ({
  user_id: userId,
  type: 'event_assignment',
  title: 'Ny händelse schemalagd',
  message: `Du har en ny händelse: "${eventTitle}"${eventDate ? ` den ${formatSwedishDate(eventDate)}` : ''}`,
  action_url: `/kalender?highlight=${eventId}`,
  metadata: {
    event_id: eventId,
    event_title: eventTitle
  }
});

export const generateStatusUpdateNotification = (
  userId: string,
  itemTitle: string,
  oldStatus: string,
  newStatus: string,
  actionUrl?: string
): CreateNotificationRequest => ({
  user_id: userId,
  type: 'status_update',
  title: 'Status uppdaterad',
  message: `"${itemTitle}" har ändrats från "${oldStatus}" till "${newStatus}"`,
  action_url: actionUrl,
  metadata: {
    old_status: oldStatus,
    new_status: newStatus
  }
});

export const generateTeamAssignmentNotification = (
  teamId: string,
  orderId: string,
  orderTitle: string,
  teamName: string,
  excludeUserId?: string
): CreateTeamNotificationRequest => ({
  team_id: teamId,
  type: 'order_assignment',
  title: 'Nytt teamuppdrag',
  message: `Ditt team "${teamName}" har tilldelats ordern "${orderTitle}"`,
  action_url: `/ordrar?highlight=${orderId}`,
  exclude_user_id: excludeUserId
});

// Helper function to format Swedish dates
const formatSwedishDate = (dateString: string): string => {
  return new Intl.DateTimeFormat('sv-SE', {
    weekday: 'long',
    year: 'numeric',
    month: 'long',
    day: 'numeric'
  }).format(new Date(dateString));
};