import { supabase } from './supabase';
import type { CalendarEvent, UserProfile, Lead, Job } from '../types/database';
import type { TeamWithRelations } from './teams';
import { createNotification, createTeamNotification, generateEventAssignmentNotification } from './notifications';

export interface CalendarEventWithRelations extends CalendarEvent {
  assigned_to?: UserProfile;
  related_lead?: Lead;
  related_job?: Job;
  assigned_team?: TeamWithRelations;
}

export interface CalendarFilters {
  type?: string;
  assignedTo?: string;
  assignedToTeam?: string;
  userIds?: string[];
  teamIds?: string[];
  dateFrom?: string;
  dateTo?: string;
}

// Swedish locale constants
export const SWEDISH_MONTHS = [
  'Januari', 'Februari', 'Mars', 'April', 'Maj', 'Juni',
  'Juli', 'Augusti', 'September', 'Oktober', 'November', 'December'
];

export const SWEDISH_DAYS_SHORT = ['Mån', 'Tis', 'Ons', 'Tor', 'Fre', 'Lör', 'Sön'];
export const SWEDISH_DAYS_LONG = ['Måndag', 'Tisdag', 'Onsdag', 'Torsdag', 'Fredag', 'Lördag', 'Söndag'];

export const EVENT_TYPE_COLORS = {
  meeting: 'bg-blue-100 text-blue-800 border-blue-200',
  task: 'bg-green-100 text-green-800 border-green-200',
  reminder: 'bg-orange-100 text-orange-800 border-orange-200'
};

export const EVENT_TYPE_LABELS = {
  meeting: 'Möte',
  task: 'Uppgift',
  reminder: 'Påminnelse'
};

// Database operations
export const getCalendarEvents = async (
  organisationId: string,
  filters: CalendarFilters = {}
): Promise<{ data: CalendarEventWithRelations[] | null; error: Error | null }> => {
  try {
    let query = supabase
      .from('calendar_events')
      .select(`
        *,
        assigned_to:user_profiles(id, full_name, email, role),
        related_lead:leads(id, title, customer:customers(name)),
        related_job:jobs(id, title, customer:customers(name)),
        assigned_team:teams(
          id, name, specialty,
          members:team_members(
            id, user_id, is_active,
            user:user_profiles(id, full_name, role)
          )
        )
      `)
      .eq('organisation_id', organisationId);

    // Apply filters
    if (filters.type && filters.type !== 'all') {
      query = query.eq('type', filters.type);
    }

    if (filters.assignedTo && filters.assignedTo !== 'all') {
      if (filters.assignedTo === 'unassigned') {
        query = query.is('assigned_to_user_id', null);
      } else {
        query = query.eq('assigned_to_user_id', filters.assignedTo);
      }
    }

    // Filter by specific user IDs
    const userIds = filters.userIds || [];
const teamIds = filters.teamIds || [];

// If team filters are selected, we also want to see events for the members of those teams.
let allUserIds = [...userIds];
if (teamIds.length > 0) {
  const { data: teamMembers } = await supabase
    .from('team_members')
    .select('user_id')
    .in('team_id', teamIds)
    .eq('is_active', true);

  if (teamMembers) {
    const teamUserIds = teamMembers.map(tm => tm.user_id);
    // Combine unique user IDs
    allUserIds = [...new Set([...allUserIds, ...teamUserIds])];
  }
}

// Now, build the final query using .or()
if (allUserIds.length > 0 || teamIds.length > 0) {
  const userFilter = `assigned_to_user_id.in.(${allUserIds.join(',')})`;
  const teamFilter = `assigned_to_team_id.in.(${teamIds.join(',')})`;

  let orFilter = '';
  if (allUserIds.length > 0 && teamIds.length > 0) {
    orFilter = `${userFilter},${teamFilter}`;
  } else if (allUserIds.length > 0) {
    orFilter = userFilter;
  } else { // teamIds.length > 0
    orFilter = teamFilter;
  }

  query = query.or(orFilter);
}

    if (filters.dateFrom) {
      query = query.gte('start_time', filters.dateFrom);
    }

    if (filters.dateTo) {
      query = query.lte('start_time', filters.dateTo);
    }

    const { data, error } = await query.order('start_time', { ascending: true });

    if (error) {
      return { data: null, error: new Error(error.message) };
    }

    return { data: data || [], error: null };
  } catch (err) {
    console.error('Error fetching calendar events:', err);
    return { data: null, error: err as Error };
  }
};

export const createCalendarEvent = async (
  event: Omit<CalendarEvent, 'id' | 'created_at'>
): Promise<{ data: CalendarEventWithRelations | null; error: Error | null }> => {
  try {
    const { data, error } = await supabase
      .from('calendar_events')
      .insert([event])
      .select(`
        *,
        assigned_to:user_profiles(id, full_name, email, role),
        related_lead:leads(id, title, customer:customers(name)),
        related_job:jobs(id, title, customer:customers(name)),
        assigned_team:teams(
          id, name, specialty,
          members:team_members(
            id, user_id, is_active,
            user:user_profiles(id, full_name, role)
          )
        )
      `)
      .single();

    if (error) {
      return { data: null, error: new Error(error.message) };
    }

    // Send notifications for new event assignments
    if (data) {
      // Notify assigned user
      if (data.assigned_to_user_id) {
        const notification = generateEventAssignmentNotification(
          data.assigned_to_user_id,
          data.id,
          data.title,
          data.start_time || undefined
        );
        await createNotification(notification);
      }

      // Notify team members
      if (data.assigned_to_team_id) {
        const teamNotification = {
          team_id: data.assigned_to_team_id,
          type: 'event_assignment' as const,
          title: 'Ny teamhändelse schemalagd',
          message: `Ditt team har en ny händelse: "${data.title}"${data.start_time ? ` den ${formatSwedishDate(data.start_time)}` : ''}`,
          action_url: `/kalender?highlight=${data.id}`
        };
        await createTeamNotification(teamNotification);
      }
    }
    return { data, error: null };
  } catch (err) {
    console.error('Error creating calendar event:', err);
    return { data: null, error: err as Error };
  }
};

export const updateCalendarEvent = async (
  id: string,
  updates: Partial<CalendarEvent>
): Promise<{ data: CalendarEventWithRelations | null; error: Error | null }> => {
  try {
    // Get current event for comparison
    const { data: currentEvent } = await supabase
      .from('calendar_events')
      .select('*')
      .eq('id', id)
      .single();

    const { data, error } = await supabase
      .from('calendar_events')
      .update(updates)
      .eq('id', id)
      .select(`
        *,
        assigned_to:user_profiles(id, full_name, email, role),
        related_lead:leads(id, title, customer:customers(name)),
        related_job:jobs(id, title, customer:customers(name)),
        assigned_team:teams(
          id, name, specialty,
          members:team_members(
            id, user_id, is_active,
            user:user_profiles(id, full_name, role)
          )
        )
      `)
      .single();

    if (error) {
      return { data: null, error: new Error(error.message) };
    }

    // Send notifications for assignment changes
    if (data && currentEvent) {
      // Check if user assignment changed
      if (updates.assigned_to_user_id !== undefined && 
          updates.assigned_to_user_id !== currentEvent.assigned_to_user_id &&
          updates.assigned_to_user_id) {
        const notification = generateEventAssignmentNotification(
          updates.assigned_to_user_id,
          data.id,
          data.title,
          data.start_time || undefined
        );
        await createNotification(notification);
      }

      // Check if team assignment changed
      if (updates.assigned_to_team_id !== undefined && 
          updates.assigned_to_team_id !== currentEvent.assigned_to_team_id &&
          updates.assigned_to_team_id) {
        const teamNotification = {
          team_id: updates.assigned_to_team_id,
          type: 'event_assignment' as const,
          title: 'Teamhändelse uppdaterad',
          message: `Händelsen "${data.title}" har uppdaterats${data.start_time ? ` och är schemalagd den ${formatSwedishDate(data.start_time)}` : ''}`,
          action_url: `/kalender?highlight=${data.id}`,
          exclude_user_id: currentEvent.assigned_to_user_id || undefined
        };
        await createTeamNotification(teamNotification);
      }
    }
    return { data, error: null };
  } catch (err) {
    console.error('Error updating calendar event:', err);
    return { data: null, error: err as Error };
  }
};

export const deleteCalendarEvent = async (id: string): Promise<{ error: Error | null }> => {
  try {
    const { error } = await supabase
      .from('calendar_events')
      .delete()
      .eq('id', id);

    if (error) {
      return { error: new Error(error.message) };
    }

    return { error: null };
  } catch (err) {
    console.error('Error deleting calendar event:', err);
    return { error: err as Error };
  }
};

// Permission checking utilities
export const canUserViewCalendar = (
  currentUser: UserProfile,
  targetUserId?: string,
  targetTeamId?: string
): boolean => {
  // Admin can view any calendar
  if (currentUser.role === 'admin') {
    return true;
  }

  // Users can always view their own calendar
  if (targetUserId === currentUser.id) {
    return true;
  }

  // For team calendars, check if user is member of the team
  if (targetTeamId) {
    // This would need to be checked against team membership
    // For now, allow sales and admin to view team calendars
    return currentUser.role === 'sales' || currentUser.role === 'admin';
  }

  // Sales can view other sales and admin calendars
  if (currentUser.role === 'sales') {
    return true; // Will be further restricted by the actual user role check
  }

  // Workers can only view their own calendar and their team calendars
  return false;
};

export const canUserCreateEventFor = (
  currentUser: UserProfile,
  targetUserId?: string,
  targetTeamId?: string
): boolean => {
  // Admin can create events for anyone
  if (currentUser.role === 'admin') {
    return true;
  }

  // Users can create events for themselves
  if (targetUserId === currentUser.id) {
    return true;
  }

  // Sales can create events for their team members
  if (currentUser.role === 'sales') {
    return true; // Further restricted by team membership check
  }

  // Workers can only create events for themselves
  return targetUserId === currentUser.id;
};

export const getCalendarPermissionMessage = (currentUser: UserProfile): string => {
  switch (currentUser.role) {
    case 'admin':
      return 'Du kan visa och hantera alla kalendrar i organisationen';
    case 'sales':
      return 'Du kan visa din egen kalender och ditt teams kalendrar';
    case 'worker':
      return 'Du kan visa din egen kalender och ditt teams kalendrar';
    default:
      return 'Begränsad kalenderåtkomst';
  }
};

// Utility functions
export const formatSwedishDate = (date: Date): string => {
  return new Intl.DateTimeFormat('sv-SE', {
    weekday: 'long',
    year: 'numeric',
    month: 'long',
    day: 'numeric',
    timeZone: 'Europe/Stockholm'
  }).format(date);
};


export const formatSwedishTime = (date: Date): string => {
  return new Intl.DateTimeFormat('sv-SE', {
    hour: '2-digit',
    minute: '2-digit',
    timeZone: 'Europe/Stockholm'
  }).format(date);
};

export const formatSwedishDateTime = (date: Date): string => {
  return new Intl.DateTimeFormat('sv-SE', {
    weekday: 'short',
    month: 'short',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
    timeZone: 'Europe/Stockholm'
  }).format(date);
};

export const getWeekNumber = (date: Date): number => {
  const d = new Date(Date.UTC(date.getFullYear(), date.getMonth(), date.getDate()));
  const dayNum = d.getUTCDay() || 7;
  d.setUTCDate(d.getUTCDate() + 4 - dayNum);
  const yearStart = new Date(Date.UTC(d.getUTCFullYear(), 0, 1));
  return Math.ceil((((d.getTime() - yearStart.getTime()) / 86400000) + 1) / 7);
};

export const getMonthDays = (year: number, month: number): Date[] => {
  const firstDay = new Date(year, month, 1);
  const lastDay = new Date(year, month + 1, 0);
  const days: Date[] = [];

  // Add days from previous month to fill the first week
  const firstDayOfWeek = (firstDay.getDay() + 6) % 7; // Convert Sunday=0 to Monday=0
  for (let i = firstDayOfWeek - 1; i >= 0; i--) {
    days.push(new Date(year, month, -i));
  }

  // Add all days of the current month
  for (let day = 1; day <= lastDay.getDate(); day++) {
    days.push(new Date(year, month, day));
  }

  // Add days from next month to fill the last week
  const remainingDays = 42 - days.length; // 6 weeks * 7 days
  for (let day = 1; day <= remainingDays; day++) {
    days.push(new Date(year, month + 1, day));
  }

  return days;
};

export const getWeekDays = (date: Date): Date[] => {
  const monday = new Date(date);
  const dayOfWeek = (date.getDay() + 6) % 7; // Convert Sunday=0 to Monday=0
  monday.setDate(date.getDate() - dayOfWeek);

  const days: Date[] = [];
  for (let i = 0; i < 7; i++) {
    const day = new Date(monday);
    day.setDate(monday.getDate() + i);
    days.push(day);
  }

  return days;
};

export const getTimeSlots = (): string[] => {
  const slots: string[] = [];
  for (let hour = 0; hour < 24; hour++) {
    for (let minute = 0; minute < 60; minute += 30) {
      const time = `${hour.toString().padStart(2, '0')}:${minute.toString().padStart(2, '0')}`;
      slots.push(time);
    }
  }
  return slots;
};

export const isToday = (date: Date): boolean => {
  const today = new Date();
  return date.toDateString() === today.toDateString();
};

export const isSameMonth = (date1: Date, date2: Date): boolean => {
  return date1.getFullYear() === date2.getFullYear() && date1.getMonth() === date2.getMonth();
};

export const isSameDay = (date1: Date, date2: Date): boolean => {
  return date1.toDateString() === date2.toDateString();
};

export const checkEventConflict = (
  newEvent: { start_time: string; end_time: string; assigned_to_user_id?: string },
  existingEvents: CalendarEventWithRelations[],
  excludeEventId?: string
): boolean => {
  if (!newEvent.assigned_to_user_id || !newEvent.start_time || !newEvent.end_time) {
    return false;
  }

  const newStart = new Date(newEvent.start_time);
  const newEnd = new Date(newEvent.end_time);

  return existingEvents.some(event => {
    if (excludeEventId && event.id === excludeEventId) return false;
    if (event.assigned_to_user_id !== newEvent.assigned_to_user_id) return false;
    if (!event.start_time || !event.end_time) return false;

    const eventStart = new Date(event.start_time);
    const eventEnd = new Date(event.end_time);

    // Check for overlap
    return newStart < eventEnd && newEnd > eventStart;
  });
};

export const getEventsForDay = (events: CalendarEventWithRelations[], date: Date): CalendarEventWithRelations[] => {
  return events.filter(event => {
    if (!event.start_time) return false;
    const eventDate = new Date(event.start_time);
    return isSameDay(eventDate, date);
  });
};

export const getEventsForWeek = (events: CalendarEventWithRelations[], weekStart: Date): CalendarEventWithRelations[] => {
  const weekEnd = new Date(weekStart);
  weekEnd.setDate(weekStart.getDate() + 6);
  weekEnd.setHours(23, 59, 59, 999);

  return events.filter(event => {
    if (!event.start_time) return false;
    const eventDate = new Date(event.start_time);
    return eventDate >= weekStart && eventDate <= weekEnd;
  });
};

export const createRecurringEvents = async (
  baseEvent: Omit<CalendarEvent, 'id' | 'created_at'>,
  recurrence: {
    type: 'daily' | 'weekly' | 'monthly';
    interval: number;
    endDate: string;
  }
): Promise<{ data: CalendarEventWithRelations[] | null; error: Error | null }> => {
  try {
    const events: Omit<CalendarEvent, 'id' | 'created_at'>[] = [];
    const startDate = new Date(baseEvent.start_time!);
    const endDate = new Date(recurrence.endDate);
    const eventDuration = baseEvent.end_time 
      ? new Date(baseEvent.end_time).getTime() - startDate.getTime()
      : 60 * 60 * 1000; // Default 1 hour

    let currentDate = new Date(startDate);
    let eventCount = 0;
    const maxEvents = 100; // Prevent infinite loops

    while (currentDate <= endDate && eventCount < maxEvents) {
      const eventStart = new Date(currentDate);
      const eventEnd = new Date(currentDate.getTime() + eventDuration);

      events.push({
        ...baseEvent,
        start_time: eventStart.toISOString(),
        end_time: eventEnd.toISOString(),
        title: `${baseEvent.title} (${eventCount + 1})`
      });

      // Calculate next occurrence
      switch (recurrence.type) {
        case 'daily':
          currentDate.setDate(currentDate.getDate() + recurrence.interval);
          break;
        case 'weekly':
          currentDate.setDate(currentDate.getDate() + (7 * recurrence.interval));
          break;
        case 'monthly':
          currentDate.setMonth(currentDate.getMonth() + recurrence.interval);
          break;
      }

      eventCount++;
    }

    // Insert all events
    const { data, error } = await supabase
      .from('calendar_events')
      .insert(events)
      .select(`
        *,
        assigned_to:user_profiles(id, full_name, email),
        related_lead:leads(id, title, customer:customers(name)),
        related_job:jobs(id, title, customer:customers(name))
      `);

    if (error) {
      return { data: null, error: new Error(error.message) };
    }

    return { data: data || [], error: null };
  } catch (err) {
    console.error('Error creating recurring events:', err);
    return { data: null, error: err as Error };
  }
};