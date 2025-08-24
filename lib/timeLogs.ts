import { supabase } from './supabase';
import type { UserProfile, Order } from '../types/database';

export interface TimeLog {
  id: string;
  order_id: string;
  user_id: string;
  start_time: string;
  end_time?: string | null;
  break_duration: number;
  notes?: string | null;
  is_approved: boolean;
  hourly_rate: number;
  total_amount: number;
  location_lat?: number | null;
  location_lng?: number | null;
  photo_urls: string[];
  materials_used: Material[];
  travel_time_minutes: number;
  work_type?: string | null;
  weather_conditions?: string | null;
  created_at?: string | null;
  updated_at?: string | null;
}

export interface TimeLogWithRelations extends TimeLog {
  order?: Order & { customer?: { name: string } };
  user?: UserProfile;
}

export interface Material {
  name: string;
  quantity: number;
  unit: string;
  notes?: string;
}

export interface TimeLogFilters {
  userId?: string;
  orderId?: string;
  dateFrom?: string;
  dateTo?: string;
  isApproved?: boolean;
  workType?: string;
}

export interface TimeLogStats {
  totalHours: number;
  totalAmount: number;
  approvedHours: number;
  pendingHours: number;
  ordersWorked: number;
  averageHourlyRate: number;
}

export interface WeeklyTimesheet {
  weekStart: string;
  weekEnd: string;
  totalHours: number;
  totalAmount: number;
  dailyBreakdown: Array<{
    date: string;
    hours: number;
    amount: number;
    orders: Array<{
      orderId: string;
      orderTitle: string;
      hours: number;
      amount: number;
    }>;
  }>;
  isSubmitted: boolean;
  isApproved: boolean;
}

// Get time logs with filters
export const getTimeLogs = async (
  filters: TimeLogFilters = {}
): Promise<{ data: TimeLogWithRelations[] | null; error: Error | null }> => {
  try {
    let query = supabase
      .from('time_logs')
      .select(`
        *,
        order:orders(
          id, title, description,
          customer:customers(name)
        ),
        user:user_profiles(id, full_name, email)
      `);

    // Apply filters
    if (filters.userId) {
      query = query.eq('user_id', filters.userId);
    }

    if (filters.orderId) {
      query = query.eq('order_id', filters.orderId);
    }

    if (filters.dateFrom) {
      query = query.gte('start_time', filters.dateFrom);
    }

    if (filters.dateTo) {
      query = query.lte('start_time', filters.dateTo);
    }

    if (filters.isApproved !== undefined) {
      query = query.eq('is_approved', filters.isApproved);
    }

    if (filters.workType) {
      query = query.eq('work_type', filters.workType);
    }

    const { data, error } = await query.order('start_time', { ascending: false });

    if (error) {
      return { data: null, error: new Error(error.message) };
    }

    return { data: data || [], error: null };
  } catch (err) {
    console.error('Error fetching time logs:', err);
    return { data: null, error: err as Error };
  }
};

// Start time tracking
export const startTimeTracking = async (
  orderId: string,
  userId: string,
  workType?: string,
  location?: { lat: number; lng: number },
  weatherConditions?: string
): Promise<{ data: TimeLog | null; error: Error | null }> => {
  try {
    // Get user's hourly rate
    const { data: userProfile } = await supabase
      .from('user_profiles')
      .select('hourly_rate')
      .eq('id', userId)
      .single();

    const hourlyRate = userProfile?.hourly_rate || 650; // Default rate

    const { data, error } = await supabase
      .from('time_logs')
      .insert([{
        order_id: orderId,
        user_id: userId,
        start_time: new Date().toISOString(),
        hourly_rate: hourlyRate,
        work_type: workType,
        location_lat: location?.lat,
        location_lng: location?.lng,
        weather_conditions: weatherConditions
      }])
      .select()
      .single();

    if (error) {
      return { data: null, error: new Error(error.message) };
    }

    return { data, error: null };
  } catch (err) {
    console.error('Error starting time tracking:', err);
    return { data: null, error: err as Error };
  }
};

// Stop time tracking
export const stopTimeTracking = async (
  timeLogId: string,
  breakDuration: number = 0,
  notes?: string,
  materials?: Material[],
  photoUrls?: string[]
): Promise<{ data: TimeLog | null; error: Error | null }> => {
  try {
    const { data, error } = await supabase
      .from('time_logs')
      .update({
        end_time: new Date().toISOString(),
        break_duration: breakDuration,
        notes: notes,
        materials_used: materials || [],
        photo_urls: photoUrls || []
      })
      .eq('id', timeLogId)
      .select()
      .single();

    if (error) {
      return { data: null, error: new Error(error.message) };
    }

    return { data, error: null };
  } catch (err) {
    console.error('Error stopping time tracking:', err);
    return { data: null, error: err as Error };
  }
};

// Get active time log for user
export const getActiveTimeLog = async (
  userId: string
): Promise<{ data: TimeLogWithRelations | null; error: Error | null }> => {
  try {
    const { data, error } = await supabase
      .from('time_logs')
      .select(`
        *,
        order:orders(
          id, title, description,
          customer:customers(name)
        )
      `)
      .eq('user_id', userId)
      .is('end_time', null)
      .order('start_time', { ascending: false })
      .limit(1)
      .maybeSingle();

    if (error) {
      return { data: null, error: new Error(error.message) };
    }

    return { data, error: null };
  } catch (err) {
    console.error('Error fetching active time log:', err);
    return { data: null, error: err as Error };
  }
};

// Update time log
export const updateTimeLog = async (
  timeLogId: string,
  updates: Partial<TimeLog>
): Promise<{ data: TimeLog | null; error: Error | null }> => {
  try {
    const { data, error } = await supabase
      .from('time_logs')
      .update(updates)
      .eq('id', timeLogId)
      .select()
      .single();

    if (error) {
      return { data: null, error: new Error(error.message) };
    }

    return { data, error: null };
  } catch (err) {
    console.error('Error updating time log:', err);
    return { data: null, error: err as Error };
  }
};

// Get time log statistics
export const getTimeLogStats = async (
  userId: string,
  dateFrom?: string,
  dateTo?: string
): Promise<{ data: TimeLogStats | null; error: Error | null }> => {
  try {
    let query = supabase
      .from('time_logs')
      .select('*')
      .eq('user_id', userId)
      .not('end_time', 'is', null);

    if (dateFrom) {
      query = query.gte('start_time', dateFrom);
    }

    if (dateTo) {
      query = query.lte('start_time', dateTo);
    }

    const { data, error } = await query;

    if (error) {
      return { data: null, error: new Error(error.message) };
    }

    const timeLogs = data || [];
    
    const totalMinutes = timeLogs.reduce((sum, log) => {
      if (!log.end_time) return sum;
      const duration = new Date(log.end_time).getTime() - new Date(log.start_time).getTime();
      return sum + (duration / (1000 * 60)) - (log.break_duration || 0);
    }, 0);

    const totalHours = totalMinutes / 60;
    const totalAmount = timeLogs.reduce((sum, log) => sum + (log.total_amount || 0), 0);
    const approvedLogs = timeLogs.filter(log => log.is_approved);
    const approvedHours = approvedLogs.reduce((sum, log) => {
      if (!log.end_time) return sum;
      const duration = new Date(log.end_time).getTime() - new Date(log.start_time).getTime();
      return sum + ((duration / (1000 * 60)) - (log.break_duration || 0)) / 60;
    }, 0);

    const pendingHours = totalHours - approvedHours;
    const ordersWorked = new Set(timeLogs.map(log => log.order_id)).size;
    const averageHourlyRate = timeLogs.length > 0 
      ? timeLogs.reduce((sum, log) => sum + log.hourly_rate, 0) / timeLogs.length 
      : 0;

    return {
      data: {
        totalHours: Math.round(totalHours * 100) / 100,
        totalAmount,
        approvedHours: Math.round(approvedHours * 100) / 100,
        pendingHours: Math.round(pendingHours * 100) / 100,
        ordersWorked,
        averageHourlyRate
      },
      error: null
    };
  } catch (err) {
    console.error('Error fetching time log stats:', err);
    return { data: null, error: err as Error };
  }
};

// Get weekly timesheet
export const getWeeklyTimesheet = async (
  userId: string,
  weekStart: string
): Promise<{ data: WeeklyTimesheet | null; error: Error | null }> => {
  try {
    const weekStartDate = new Date(weekStart);
    const weekEndDate = new Date(weekStartDate);
    weekEndDate.setDate(weekEndDate.getDate() + 6);
    weekEndDate.setHours(23, 59, 59, 999);

    const { data, error } = await supabase
      .from('time_logs')
      .select(`
        *,
        order:orders(id, title)
      `)
      .eq('user_id', userId)
      .gte('start_time', weekStartDate.toISOString())
      .lte('start_time', weekEndDate.toISOString())
      .not('end_time', 'is', null)
      .order('start_time');

    if (error) {
      return { data: null, error: new Error(error.message) };
    }

    const timeLogs = data || [];
    
    // Group by day
    const dailyBreakdown = [];
    for (let i = 0; i < 7; i++) {
      const currentDate = new Date(weekStartDate);
      currentDate.setDate(currentDate.getDate() + i);
      const dateStr = currentDate.toISOString().split('T')[0];
      
      const dayLogs = timeLogs.filter(log => 
        log.start_time.split('T')[0] === dateStr
      );

      const dayHours = dayLogs.reduce((sum, log) => {
        const duration = new Date(log.end_time!).getTime() - new Date(log.start_time).getTime();
        return sum + ((duration / (1000 * 60)) - (log.break_duration || 0)) / 60;
      }, 0);

      const dayAmount = dayLogs.reduce((sum, log) => sum + (log.total_amount || 0), 0);

      const orders = dayLogs.reduce((acc, log) => {
        const existing = acc.find(o => o.orderId === log.order_id);
        const logHours = ((new Date(log.end_time!).getTime() - new Date(log.start_time).getTime()) / (1000 * 60) - (log.break_duration || 0)) / 60;
        
        if (existing) {
          existing.hours += logHours;
          existing.amount += log.total_amount || 0;
        } else {
          acc.push({
            orderId: log.order_id,
            orderTitle: (log as any).order?.title || 'Okänd order',
            hours: logHours,
            amount: log.total_amount || 0
          });
        }
        return acc;
      }, [] as Array<{ orderId: string; orderTitle: string; hours: number; amount: number }>);

      dailyBreakdown.push({
        date: dateStr,
        hours: Math.round(dayHours * 100) / 100,
        amount: dayAmount,
        orders
      });
    }

    const totalHours = dailyBreakdown.reduce((sum, day) => sum + day.hours, 0);
    const totalAmount = dailyBreakdown.reduce((sum, day) => sum + day.amount, 0);

    // Check if timesheet is submitted/approved (this would be in a separate table in real implementation)
    const isSubmitted = false; // TODO: Implement timesheet submission tracking
    const isApproved = timeLogs.every(log => log.is_approved);

    return {
      data: {
        weekStart: weekStartDate.toISOString().split('T')[0],
        weekEnd: weekEndDate.toISOString().split('T')[0],
        totalHours: Math.round(totalHours * 100) / 100,
        totalAmount,
        dailyBreakdown,
        isSubmitted,
        isApproved
      },
      error: null
    };
  } catch (err) {
    console.error('Error fetching weekly timesheet:', err);
    return { data: null, error: err as Error };
  }
};

// Approve time logs
export const approveTimeLogs = async (
  timeLogIds: string[]
): Promise<{ error: Error | null }> => {
  try {
    const { error } = await supabase
      .from('time_logs')
      .update({ is_approved: true })
      .in('id', timeLogIds);

    if (error) {
      return { error: new Error(error.message) };
    }

    return { error: null };
  } catch (err) {
    console.error('Error approving time logs:', err);
    return { error: err as Error };
  }
};

// Get current location (mock implementation)
export const getCurrentLocation = async (): Promise<{ lat: number; lng: number } | null> => {
  return new Promise((resolve) => {
    if ('geolocation' in navigator) {
      navigator.geolocation.getCurrentPosition(
        (position) => {
          resolve({
            lat: position.coords.latitude,
            lng: position.coords.longitude
          });
        },
        () => {
          // Fallback to Stockholm coordinates
          resolve({ lat: 59.3293, lng: 18.0686 });
        },
        { timeout: 5000 }
      );
    } else {
      // Fallback to Stockholm coordinates
      resolve({ lat: 59.3293, lng: 18.0686 });
    }
  });
};

// Get mock weather data
export const getMockWeatherData = async (
  lat?: number,
  lng?: number
): Promise<{
  temperature: number;
  condition: string;
  humidity: number;
  windSpeed: number;
  icon: string;
}> => {
  // Mock weather data - in real implementation, integrate with weather API
  const conditions = ['Soligt', 'Molnigt', 'Regn', 'Snö', 'Dimma'];
  const icons = ['☀️', '☁️', '🌧️', '❄️', '🌫️'];
  
  const randomCondition = Math.floor(Math.random() * conditions.length);
  
  return {
    temperature: Math.floor(Math.random() * 30) - 5, // -5 to 25°C
    condition: conditions[randomCondition],
    humidity: Math.floor(Math.random() * 40) + 40, // 40-80%
    windSpeed: Math.floor(Math.random() * 15) + 2, // 2-17 m/s
    icon: icons[randomCondition]
  };
};

// Calculate work duration
export const calculateWorkDuration = (
  startTime: string,
  endTime: string,
  breakDuration: number = 0
): { hours: number; minutes: number; totalMinutes: number } => {
  const start = new Date(startTime);
  const end = new Date(endTime);
  const totalMinutes = Math.floor((end.getTime() - start.getTime()) / (1000 * 60)) - breakDuration;
  
  return {
    hours: Math.floor(totalMinutes / 60),
    minutes: totalMinutes % 60,
    totalMinutes
  };
};

// Format duration for display
export const formatDuration = (minutes: number): string => {
  const hours = Math.floor(minutes / 60);
  const mins = minutes % 60;
  
  if (hours === 0) {
    return `${mins}m`;
  } else if (mins === 0) {
    return `${hours}h`;
  } else {
    return `${hours}h ${mins}m`;
  }
};

// Get today's schedule for worker
export const getTodaySchedule = async (
  userId: string
): Promise<{ data: any[] | null; error: Error | null }> => {
  try {
    const today = new Date();
    const startOfDay = new Date(today.getFullYear(), today.getMonth(), today.getDate());
    const endOfDay = new Date(startOfDay);
    endOfDay.setDate(endOfDay.getDate() + 1);

    const { data, error } = await supabase
      .from('calendar_events')
      .select(`
        *,
        related_order:orders(
          id, title, description, status,
          customer:customers(name, address, phone_number)
        )
      `)
      .eq('assigned_to_user_id', userId)
      .gte('start_time', startOfDay.toISOString())
      .lt('start_time', endOfDay.toISOString())
      .order('start_time');

    if (error) {
      return { data: null, error: new Error(error.message) };
    }

    return { data: data || [], error: null };
  } catch (err) {
    console.error('Error fetching today schedule:', err);
    return { data: null, error: err as Error };
  }
};

// Get worker's assigned orders for the week
export const getWorkerWeeklyOrders = async (
  userId: string,
  weekStart?: string
): Promise<{ data: any[] | null; error: Error | null }> => {
  try {
    const startDate = weekStart ? new Date(weekStart) : new Date();
    if (!weekStart) {
      // Get start of current week (Monday)
      const dayOfWeek = startDate.getDay();
      const diff = startDate.getDate() - dayOfWeek + (dayOfWeek === 0 ? -6 : 1);
      startDate.setDate(diff);
    }
    
    const endDate = new Date(startDate);
    endDate.setDate(endDate.getDate() + 6);
    endDate.setHours(23, 59, 59, 999);

    const { data, error } = await supabase
      .from('calendar_events')
      .select(`
        *,
        related_order:orders(
          id, title, description, status, value,
          customer:customers(name, address, city)
        )
      `)
      .eq('assigned_to_user_id', userId)
      .gte('start_time', startDate.toISOString())
      .lte('start_time', endDate.toISOString())
      .order('start_time');

    if (error) {
      return { data: null, error: new Error(error.message) };
    }

    return { data: data || [], error: null };
  } catch (err) {
    console.error('Error fetching weekly orders:', err);
    return { data: null, error: err as Error };
  }
};

// Submit timesheet for approval
export const submitTimesheet = async (
  userId: string,
  weekStart: string,
  notes?: string
): Promise<{ error: Error | null }> => {
  try {
    // In a real implementation, this would create a timesheet submission record
    // For now, we'll just mark all time logs for that week as submitted
    const weekStartDate = new Date(weekStart);
    const weekEndDate = new Date(weekStartDate);
    weekEndDate.setDate(weekEndDate.getDate() + 6);
    weekEndDate.setHours(23, 59, 59, 999);

    // This would typically create a timesheet_submissions record
    // For now, we'll add a note to indicate submission
    const { error } = await supabase
      .from('time_logs')
      .update({ 
        notes: `${notes ? notes + ' | ' : ''}Tidrapport inskickad: ${new Date().toISOString()}`
      })
      .eq('user_id', userId)
      .gte('start_time', weekStartDate.toISOString())
      .lte('start_time', weekEndDate.toISOString());

    if (error) {
      return { error: new Error(error.message) };
    }

    return { error: null };
  } catch (err) {
    console.error('Error submitting timesheet:', err);
    return { error: err as Error };
  }
};