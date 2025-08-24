import { supabase } from './supabase';
import type { Order, OrderNote, OrderActivity, UserProfile, Customer, OrderStatus, Team, AssignmentType, JobType } from '../types/database';
import { ORDER_STATUS_LABELS, getOrderStatusColor, type OrderStatus, type Customer, type UserProfile, type Team } from '../types/database';
import { createNotification, generateOrderAssignmentNotification, generateStatusUpdateNotification, generateTeamAssignmentNotification } from './notifications';

export interface OrderWithRelations extends Order {
  customer?: Customer;
  assigned_to?: UserProfile;
  assigned_team?: Team;
  notes?: OrderNote[];
  activities?: OrderActivity[];
}

export interface OrderFilters {
  status?: string;
  assignedTo?: string;
  customer?: string;
  dateFrom?: string;
  dateTo?: string;
  search?: string;
}

// Database operations
export const getOrders = async (
  organisationId: string,
  filters: OrderFilters = {}
): Promise<{ data: OrderWithRelations[] | null; error: Error | null }> => {
  try {
    let query = supabase
      .from('orders')
      .select(`
        *,
        customer:customers(id, name, email, phone_number, city),
        assigned_to:user_profiles(id, full_name, email),
        assigned_team:teams(id, name, specialty, team_leader:user_profiles(id, full_name))
      `)
      .eq('organisation_id', organisationId);

    // Apply filters
    if (filters.status && filters.status !== 'all') {
      query = query.eq('status', filters.status);
    }

    if (filters.assignedTo && filters.assignedTo !== 'all') {
      if (filters.assignedTo === 'unassigned') {
        query = query.is('assigned_to_user_id', null);
      } else {
        query = query.eq('assigned_to_user_id', filters.assignedTo);
      }
    }

    if (filters.customer && filters.customer !== 'all') {
      query = query.eq('customer_id', filters.customer);
    }

    if (filters.dateFrom) {
      query = query.gte('created_at', filters.dateFrom);
    }

    if (filters.dateTo) {
      query = query.lte('created_at', filters.dateTo);
    }

    if (filters.search) {
      query = query.or(`title.ilike.%${filters.search}%,description.ilike.%${filters.search}%`);
    }

    const { data, error } = await query.order('created_at', { ascending: false });

    if (error) {
      return { data: null, error: new Error(error.message) };
    }

    return { data: data || [], error: null };
  } catch (err) {
    console.error('Error fetching orders:', err);
    return { data: null, error: err as Error };
  }
};

export const getOrder = async (
  id: string
): Promise<{ data: OrderWithRelations | null; error: Error | null }> => {
  try {
    const { data, error } = await supabase
      .from('orders')
      .select(`
        *,
        customer:customers(id, name, email, phone_number, address, postal_code, city),
        assigned_to:user_profiles(id, full_name, email, phone_number),
        assigned_team:teams(
          id, name, specialty, hourly_rate,
          team_leader:user_profiles(id, full_name),
          members:team_members(
            id, role_in_team,
            user:user_profiles(id, full_name, phone_number)
          )
        )
      `)
      .eq('id', id)
      .single();

    if (error) {
      return { data: null, error: new Error(error.message) };
    }

    return { data, error: null };
  } catch (err) {
    console.error('Error fetching order:', err);
    return { data: null, error: err as Error };
  }
};

export const createOrder = async (
  order: Omit<Order, 'id' | 'created_at'>
): Promise<{ data: OrderWithRelations | null; error: Error | null }> => {
  try {
    const { data, error } = await supabase
      .from('orders')
      .insert([order])
      .select(`
        *,
        customer:customers(id, name, email, phone_number, city),
        assigned_to:user_profiles(id, full_name, email),
        assigned_team:teams(id, name, specialty, team_leader:user_profiles(id, full_name))
      `)
      .single();

    if (error) {
      return { data: null, error: new Error(error.message) };
    }

    // Log activity
    if (data) {
      await createOrderActivity(data.id, null, 'created', 'Order skapad');
    }

    return { data, error: null };
  } catch (err) {
    console.error('Error creating order:', err);
    return { data: null, error: err as Error };
  }
};

export const updateOrder = async (
  id: string,
  updates: Partial<Order>
): Promise<{ data: OrderWithRelations | null; error: Error | null }> => {
  try {
    // Get current order for activity logging
    const { data: currentOrder } = await supabase
      .from('orders')
      .select('*')
      .eq('id', id)
      .single();

    const { data, error } = await supabase
      .from('orders')
      .update(updates)
      .eq('id', id)
      .select(`
        *,
        customer:customers(id, name, email, phone_number, city),
        assigned_to:user_profiles(id, full_name, email),
        assigned_team:teams(id, name, specialty, team_leader:user_profiles(id, full_name))
      `)
      .single();

    if (error) {
      return { data: null, error: new Error(error.message) };
    }

    // Log activities for significant changes
    if (data && currentOrder) {
      if (updates.status && updates.status !== currentOrder.status) {
        // Send notification to assigned user about status change
        if (data.assigned_to_user_id) {
          await createStatusChangeNotification(
            data.assigned_to_user_id,
            data.id,
            data.title,
            currentOrder.status,
            updates.status
          );
        }

        await createOrderActivity(
          id,
          null,
          'status_changed',
          `Status ändrad från ${ORDER_STATUS_LABELS[currentOrder.status]} till ${ORDER_STATUS_LABELS[updates.status]}`,
          currentOrder.status,
          updates.status
        );
      }

      if (updates.assigned_to_user_id !== undefined && updates.assigned_to_user_id !== currentOrder.assigned_to_user_id) {
        // Send notification to newly assigned user
        if (updates.assigned_to_user_id) {
          const notification = generateOrderAssignmentNotification(
            updates.assigned_to_user_id,
            data.id,
            data.title
          );
          await createNotification(notification);
        }

        await createOrderActivity(
          id,
          null,
          'assigned',
          updates.assigned_to_user_id 
            ? 'Order tilldelad' 
            : 'Tilldelning borttagen'
        );
      }

      if (updates.assigned_to_team_id !== undefined && updates.assigned_to_team_id !== currentOrder.assigned_to_team_id) {
        // Send notification to team members
        if (updates.assigned_to_team_id && data.assigned_team) {
          const teamNotification = generateTeamAssignmentNotification(
            updates.assigned_to_team_id,
            data.id,
            data.title,
            data.assigned_team.name,
            currentOrder.assigned_to_user_id || undefined // Exclude the user who made the assignment
          );
          await createNotification(teamNotification);
        }

        await createOrderActivity(
          id,
          null,
          'team_assigned',
          updates.assigned_to_team_id 
            ? `Order tilldelad till team: ${data.assigned_team?.name}` 
            : 'Team-tilldelning borttagen'
        );
      }
    }

    return { data, error: null };
  } catch (err) {
    console.error('Error updating order:', err);
    return { data: null, error: err as Error };
  }
};

export const deleteOrder = async (id: string): Promise<{ error: Error | null }> => {
  try {
    const { error } = await supabase
      .from('orders')
      .delete()
      .eq('id', id);

    if (error) {
      return { error: new Error(error.message) };
    }

    return { error: null };
  } catch (err) {
    console.error('Error deleting order:', err);
    return { error: err as Error };
  }
};

// Order notes operations
export const getOrderNotes = async (
  orderId: string
): Promise<{ data: OrderNote[] | null; error: Error | null }> => {
  try {
    const { data, error } = await supabase
      .from('order_notes')
      .select(`
        *,
        user:user_profiles(id, full_name, email)
      `)
      .eq('order_id', orderId)
      .order('created_at', { ascending: false });

    if (error) {
      return { data: null, error: new Error(error.message) };
    }

    return { data: data || [], error: null };
  } catch (err) {
    console.error('Error fetching order notes:', err);
    return { data: null, error: err as Error };
  }
};

export const createOrderNote = async (
  note: Omit<OrderNote, 'id' | 'created_at'>
): Promise<{ data: OrderNote | null; error: Error | null }> => {
  try {
    const { data, error } = await supabase
      .from('order_notes')
      .insert([note])
      .select(`
        *,
        user:user_profiles(id, full_name, email)
      `)
      .single();

    if (error) {
      return { data: null, error: new Error(error.message) };
    }

    // Log activity
    await createOrderActivity(note.order_id, note.user_id, 'note_added', 'Anteckning tillagd');

    return { data, error: null };
  } catch (err) {
    console.error('Error creating order note:', err);
    return { data: null, error: err as Error };
  }
};

// Order activities operations
export const getOrderActivities = async (
  orderId: string
): Promise<{ data: OrderActivity[] | null; error: Error | null }> => {
  try {
    const { data, error } = await supabase
      .from('order_activities')
      .select(`
        *,
        user:user_profiles(id, full_name, email)
      `)
      .eq('order_id', orderId)
      .order('created_at', { ascending: false });

    if (error) {
      return { data: null, error: new Error(error.message) };
    }

    return { data: data || [], error: null };
  } catch (err) {
    console.error('Error fetching order activities:', err);
    return { data: null, error: err as Error };
  }
};

export const createOrderActivity = async (
  orderId: string,
  userId: string | null,
  activityType: string,
  description: string,
  oldValue?: string,
  newValue?: string
): Promise<{ data: OrderActivity | null; error: Error | null }> => {
  try {
    const { data, error } = await supabase
      .from('order_activities')
      .insert([{
        order_id: orderId,
        user_id: userId,
        activity_type: activityType,
        description,
        old_value: oldValue,
        new_value: newValue
      }])
      .select(`
        *,
        user:user_profiles(id, full_name, email)
      `)
      .single();

    if (error) {
      return { data: null, error: new Error(error.message) };
    }

    return { data, error: null };
  } catch (err) {
    console.error('Error creating order activity:', err);
    return { data: null, error: err as Error };
  }
};

// Statistics and analytics
export const getOrderStats = async (
  organisationId: string,
  dateFrom?: string,
  dateTo?: string
): Promise<{
  data: {
    totalOrders: number;
    totalValue: number;
    averageValue: number;
    statusBreakdown: Record<string, number>;
    recentOrders: OrderWithRelations[];
  } | null;
  error: Error | null;
}> => {
  try {
    let query = supabase
      .from('orders')
      .select(`
        *,
        customer:customers(name),
        assigned_to:user_profiles(full_name)
      `)
      .eq('organisation_id', organisationId);

    if (dateFrom) {
      query = query.gte('created_at', dateFrom);
    }

    if (dateTo) {
      query = query.lte('created_at', dateTo);
    }

    const { data, error } = await query.order('created_at', { ascending: false });

    if (error) {
      return { data: null, error: new Error(error.message) };
    }

    const orders = data || [];
    const totalOrders = orders.length;
    const totalValue = orders.reduce((sum, order) => sum + (order.value || 0), 0);
    const averageValue = totalOrders > 0 ? totalValue / totalOrders : 0;

    const statusBreakdown = orders.reduce((acc, order) => {
      acc[order.status] = (acc[order.status] || 0) + 1;
      return acc;
    }, {} as Record<string, number>);

    const recentOrders = orders.slice(0, 5);

    return {
      data: {
        totalOrders,
        totalValue,
        averageValue,
        statusBreakdown,
        recentOrders
      },
      error: null
    };
  } catch (err) {
    console.error('Error fetching order stats:', err);
    return { data: null, error: err as Error };
  }
};

// Utility functions
export const getOrdersByStatus = (orders: OrderWithRelations[], status: string): OrderWithRelations[] => {
  return orders.filter(order => order.status === status);
};

export const getOrdersForUser = (orders: OrderWithRelations[], userId: string): OrderWithRelations[] => {
  return orders.filter(order => order.assigned_to_user_id === userId);
};

export const getOverdueOrders = (orders: OrderWithRelations[]): OrderWithRelations[] => {
  // For now, we'll consider orders in 'bokad_bekräftad' status for more than 30 days as potentially overdue
  const thirtyDaysAgo = new Date();
  thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);

  return orders.filter(order => 
    order.status === 'bokad_bekräftad' && 
    order.created_at && 
    new Date(order.created_at) < thirtyDaysAgo
  );
};

export const searchOrders = (orders: OrderWithRelations[], searchTerm: string): OrderWithRelations[] => {
  if (!searchTerm.trim()) return orders;

  const term = searchTerm.toLowerCase();
  return orders.filter(order =>
    order.title.toLowerCase().includes(term) ||
    order.description?.toLowerCase().includes(term) ||
    order.customer?.name.toLowerCase().includes(term) ||
    order.assigned_to?.full_name.toLowerCase().includes(term) ||
    order.source?.toLowerCase().includes(term)
  );
};

// Notification helpers
const createStatusChangeNotification = async (
  userId: string,
  orderId: string,
  orderTitle: string,
  oldStatus: string,
  newStatus: string
): Promise<void> => {
  try {
    const notification = generateStatusUpdateNotification(
      userId,
      orderTitle,
      ORDER_STATUS_LABELS[oldStatus as OrderStatus],
      ORDER_STATUS_LABELS[newStatus as OrderStatus],
      `/ordrar?highlight=${orderId}`
    );
    await createNotification(notification);
  } catch (err) {
    console.error('Error creating status change notification:', err);
  }
};