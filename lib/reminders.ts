import { supabase } from './supabase';

export interface ReminderStats {
  quotesProcessed: number;
  invoicesProcessed: number;
  emailsSent: number;
  errors: string[];
}

export interface ReminderLog {
  id: string;
  organisation_id: string;
  quote_id?: string;
  invoice_id?: string;
  reminder_type: 'quote_followup' | 'invoice_payment';
  days_offset: number;
  email_sent: boolean;
  email_error?: string;
  sent_at: string;
  created_at: string;
}

/**
 * Trigger reminder check manually (for testing or immediate execution)
 */
export const triggerReminders = async (
  organizationId?: string,
  type?: 'quotes' | 'invoices',
  dryRun = false
): Promise<{ data: ReminderStats | null; error: Error | null }> => {
  try {
    const { data, error } = await supabase.functions.invoke('send-reminders', {
      body: {
        organizationId,
        type,
        dryRun
      }
    });

    if (error) {
      return { data: null, error: new Error(error.message) };
    }

    return { data: data.results, error: null };
  } catch (err) {
    console.error('Error triggering reminders:', err);
    return { data: null, error: err as Error };
  }
};

/**
 * Get reminder logs for an organization
 */
export const getReminderLogs = async (
  organizationId: string,
  limit = 50
): Promise<{ data: ReminderLog[] | null; error: Error | null }> => {
  try {
    const { data, error } = await supabase
      .from('reminder_logs')
      .select(`
        *,
        quote:quotes(quote_number, title),
        invoice:invoices(invoice_number)
      `)
      .eq('organisation_id', organizationId)
      .order('sent_at', { ascending: false })
      .limit(limit);

    if (error) {
      return { data: null, error: new Error(error.message) };
    }

    return { data: data || [], error: null };
  } catch (err) {
    console.error('Error fetching reminder logs:', err);
    return { data: null, error: err as Error };
  }
};

/**
 * Get reminder statistics for an organization
 */
export const getReminderStats = async (
  organizationId: string,
  days = 30
): Promise<{
  data: {
    totalReminders: number;
    quoteReminders: number;
    invoiceReminders: number;
    successRate: number;
  } | null;
  error: Error | null;
}> => {
  try {
    const dateFrom = new Date();
    dateFrom.setDate(dateFrom.getDate() - days);

    const { data, error } = await supabase
      .from('reminder_logs')
      .select('reminder_type, email_sent')
      .eq('organisation_id', organizationId)
      .gte('sent_at', dateFrom.toISOString());

    if (error) {
      return { data: null, error: new Error(error.message) };
    }

    const logs = data || [];
    const totalReminders = logs.length;
    const quoteReminders = logs.filter(log => log.reminder_type === 'quote_followup').length;
    const invoiceReminders = logs.filter(log => log.reminder_type === 'invoice_payment').length;
    const successfulReminders = logs.filter(log => log.email_sent).length;
    const successRate = totalReminders > 0 ? (successfulReminders / totalReminders) * 100 : 0;

    return {
      data: {
        totalReminders,
        quoteReminders,
        invoiceReminders,
        successRate: Math.round(successRate)
      },
      error: null
    };
  } catch (err) {
    console.error('Error fetching reminder stats:', err);
    return { data: null, error: err as Error };
  }
};

/**
 * Check which quotes and invoices are due for reminders
 */
export const getUpcomingReminders = async (
  organizationId: string
): Promise<{
  data: {
    quotes: Array<{ id: string; quote_number: string; title: string; days_since_sent: number }>;
    invoices: Array<{ id: string; invoice_number: string; days_to_due: number; amount: number }>;
  } | null;
  error: Error | null;
}> => {
  try {
    // Get quotes that might need follow-up
    const { data: quotes, error: quotesError } = await supabase
      .from('quotes')
      .select('id, quote_number, title, created_at')
      .eq('organisation_id', organizationId)
      .eq('status', 'sent');

    if (quotesError) {
      return { data: null, error: new Error(quotesError.message) };
    }

    // Get unpaid invoices
    const { data: invoices, error: invoicesError } = await supabase
      .from('invoices')
      .select('id, invoice_number, amount, due_date')
      .eq('organisation_id', organizationId)
      .in('status', ['sent', 'overdue'])
      .not('due_date', 'is', null);

    if (invoicesError) {
      return { data: null, error: new Error(invoicesError.message) };
    }

    // Calculate days and filter for upcoming reminders
    const now = new Date();
    const followUpDays = [3, 7, 14];
    const reminderDays = [-3, 0, 7, 14];

    const upcomingQuotes = (quotes || [])
      .map(quote => {
        const daysSinceSent = Math.floor((now.getTime() - new Date(quote.created_at).getTime()) / (1000 * 60 * 60 * 24));
        return { ...quote, days_since_sent: daysSinceSent };
      })
      .filter(quote => followUpDays.includes(quote.days_since_sent));

    const upcomingInvoices = (invoices || [])
      .map(invoice => {
        const daysToDue = Math.floor((new Date(invoice.due_date).getTime() - now.getTime()) / (1000 * 60 * 60 * 24));
        return { ...invoice, days_to_due: daysToDue };
      })
      .filter(invoice => reminderDays.includes(invoice.days_to_due));

    return {
      data: {
        quotes: upcomingQuotes,
        invoices: upcomingInvoices
      },
      error: null
    };
  } catch (err) {
    console.error('Error fetching upcoming reminders:', err);
    return { data: null, error: err as Error };
  }
};