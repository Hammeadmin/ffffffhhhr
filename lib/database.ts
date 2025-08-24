import { supabase } from './supabase';
import type { Customer, UserProfile, Lead, Quote, Job, Invoice, CalendarEvent, Team, TeamMember, Organisation, 
  UserProfile, 
  Customer, 
  Lead, 
  Quote, 
  Job, 
  Invoice, 
  CalendarEvent,
  LeadNote,
  LeadActivity,
  JobActivity,
  UserRole,
  DatabaseResult,
  DatabaseListResult,
  LeadStatus,
  JobStatus,
  JobPriority,
  QuoteLineItem
} from '../types/database';
import { LEAD_STATUS_LABELS, JOB_STATUS_LABELS, JOB_PRIORITY_LABELS } from '../types/database';

// Error handling utility
const handleDatabaseError = (error: any): Error => {
  console.error('Database error:', error);
  
  if (error?.message) {
    return new Error(error.message);
  }
  
  return new Error('Ett oväntat databasfel inträffade');
};

// Organisation functions
export const createOrganisation = async (name: string, orgNumber?: string): Promise<DatabaseResult<Organisation>> => {
  try {
    const { data, error } = await supabase
      .from('organisations')
      .insert([{ name, org_number: orgNumber }])
      .select()
      .single();
    
    if (error) {
      return { data: null, error: handleDatabaseError(error) };
    }
    
    return { data, error: null };
  } catch (err) {
    return { data: null, error: handleDatabaseError(err) };
  }
};

export const getOrganisation = async (id: string): Promise<DatabaseResult<Organisation>> => {
  try {
    const { data, error } = await supabase
      .from('organisations')
      .select('*')
      .eq('id', id)
      .single();
    
    if (error) {
      return { data: null, error: handleDatabaseError(error) };
    }
    
    return { data, error: null };
  } catch (err) {
    return { data: null, error: handleDatabaseError(err) };
  }
};

// User Profile functions
export const createUserProfile = async (
  userId: string,
  organisationId: string,
  fullName: string,
  email?: string,
  phoneNumber?: string,
  role: UserRole = 'worker'
): Promise<DatabaseResult<UserProfile>> => {
  try {
    const { data, error } = await supabase
      .from('user_profiles')
      .insert([{
        id: userId,
        organisation_id: organisationId,
        full_name: fullName,
        email,
        phone_number: phoneNumber,
        role
      }])
      .select()
      .single();
    
    if (error) {
      return { data: null, error: handleDatabaseError(error) };
    }
    
    return { data, error: null };
  } catch (err) {
    return { data: null, error: handleDatabaseError(err) };
  }
};

export const getUserProfile = async (userId: string): Promise<DatabaseResult<UserProfile & { organisation: Organisation }>> => {
  try {
    const { data, error } = await supabase
      .from('user_profiles')
      .select(`
        *,
        organisation:organisations(*)
      `)
      .eq('id', userId)
      .single();
    
    if (error) {
      return { data: null, error: handleDatabaseError(error) };
    }
    
    return { data, error: null };
  } catch (err) {
    return { data: null, error: handleDatabaseError(err) };
  }
};

// User profiles operations
export const getUserProfiles = async (
  organisationId: string,
  filters: { userId?: string; role?: string; isActive?: boolean } = {}
): Promise<{ data: UserProfile[] | null; error: Error | null }> => {
  try {
    let query = supabase
      .from('user_profiles')
      .select(`
        *,
        organisation:organisations(id, name)
      `);

    if (organisationId) {
      query = query.eq('organisation_id', organisationId);
    }

    if (filters.userId) {
      query = query.eq('id', filters.userId);
    }

    if (filters.role) {
      query = query.eq('role', filters.role);
    }

    if (filters.isActive !== undefined) {
      query = query.eq('is_active', filters.isActive);
    }

    const { data, error } = await query.order('full_name');

    if (error) {
      return { data: null, error: new Error(error.message) };
    }

    return { data: data || [], error: null };
  } catch (err) {
    console.error('Error fetching user profiles:', err);
    return { data: null, error: err as Error };
  }
};

export const updateUserProfile = async (userId: string, updates: Partial<UserProfile>): Promise<DatabaseResult<UserProfile>> => {
  try {
    const { data, error } = await supabase
      .from('user_profiles')
      .update(updates)
      .eq('id', userId)
      .select()
      .single();
    
    if (error) {
      return { data: null, error: handleDatabaseError(error) };
    }
    
    return { data, error: null };
  } catch (err) {
    return { data: null, error: handleDatabaseError(err) };
  }
};

// Customer functions
export const getCustomers = async (organisationId: string): Promise<DatabaseListResult<Customer & { total_leads?: number; total_jobs?: number; last_contact?: string }>> => {
  try {
    const { data, error } = await supabase
      .from('customers')
      .select(`
        *,
        leads!left(id, created_at),
        jobs!left(id)
      `)
      .eq('organisation_id', organisationId)
      .order('created_at', { ascending: false });
    
    if (error) {
      return { data: null, error: handleDatabaseError(error) };
    }
    
    // Process the data to include counts and last contact
    const processedData = (data || []).map(customer => {
      const leads = customer.leads || [];
      const jobs = customer.jobs || [];
      
      return {
        ...customer,
        total_leads: leads.length,
        total_jobs: jobs.length,
        last_contact: leads.length > 0 
          ? leads.reduce((latest, lead) => 
              !latest || new Date(lead.created_at) > new Date(latest) 
                ? lead.created_at 
                : latest, null)
          : null,
        leads: undefined, // Remove the nested data
        jobs: undefined
      };
    });
    
    return { data: processedData, error: null };
  } catch (err) {
    return { data: null, error: handleDatabaseError(err) };
  }
};

export const searchCustomers = async (
  organisationId: string, 
  searchTerm: string = '',
  filters: {
    city?: string;
    isActive?: boolean;
    dateFrom?: string;
    dateTo?: string;
  } = {},
  pagination: {
    page?: number;
    limit?: number;
  } = {}
): Promise<DatabaseListResult<Customer & { total_leads?: number; total_jobs?: number; last_contact?: string }> & { totalCount?: number }> => {
  try {
    let query = supabase
      .from('customers')
      .select(`
        *,
        leads!left(id, created_at),
        jobs!left(id)
      `, { count: 'exact' })
      .eq('organisation_id', organisationId);

    // Apply search filter
    if (searchTerm) {
      query = query.or(`name.ilike.%${searchTerm}%,email.ilike.%${searchTerm}%,phone_number.ilike.%${searchTerm}%,city.ilike.%${searchTerm}%`);
    }

    // Apply filters
    if (filters.city) {
      query = query.eq('city', filters.city);
    }

    if (filters.dateFrom) {
      query = query.gte('created_at', filters.dateFrom);
    }

    if (filters.dateTo) {
      query = query.lte('created_at', filters.dateTo);
    }

    // Apply pagination
    const page = pagination.page || 1;
    const limit = pagination.limit || 50;
    const from = (page - 1) * limit;
    const to = from + limit - 1;

    query = query.range(from, to).order('name', { ascending: true });

    const { data, error, count } = await query;
    
    if (error) {
      return { data: null, error: handleDatabaseError(error), totalCount: 0 };
    }
    
    // Process the data to include counts and last contact
    const processedData = (data || []).map(customer => {
      const leads = customer.leads || [];
      const jobs = customer.jobs || [];
      
      return {
        ...customer,
        total_leads: leads.length,
        total_jobs: jobs.length,
        last_contact: leads.length > 0 
          ? leads.reduce((latest, lead) => 
              !latest || new Date(lead.created_at) > new Date(latest) 
                ? lead.created_at 
                : latest, null)
          : null,
        leads: undefined, // Remove the nested data
        jobs: undefined
      };
    });
    
    return { data: processedData, error: null, totalCount: count || 0 };
  } catch (err) {
    return { data: null, error: handleDatabaseError(err), totalCount: 0 };
  }
};

export const getCustomerById = async (customerId: string): Promise<DatabaseResult<Customer>> => {
  try {
    const { data, error } = await supabase
      .from('customers')
      .select('*')
      .eq('id', customerId)
      .single();
    
    if (error) {
      return { data: null, error: handleDatabaseError(error) };
    }
    
    return { data, error: null };
  } catch (err) {
    return { data: null, error: handleDatabaseError(err) };
  }
};

export const getCustomerInteractions = async (customerId: string): Promise<{
  leads: (Lead & { assigned_to?: UserProfile })[];
  quotes: (Quote & { lead?: Lead })[];
  jobs: (Job & { quote?: Quote; assigned_to?: UserProfile })[];
  invoices: (Invoice & { job?: Job })[];
  error: Error | null;
}> => {
  try {
    const [leadsResult, quotesResult, jobsResult, invoicesResult] = await Promise.all([
      supabase
        .from('leads')
        .select(`
          *,
          assigned_to:user_profiles(*)
        `)
        .eq('customer_id', customerId)
        .order('created_at', { ascending: false }),
      
      supabase
        .from('quotes')
        .select(`
          *,
          lead:leads(*)
        `)
        .eq('customer_id', customerId)
        .order('created_at', { ascending: false }),
      
      supabase
        .from('jobs')
        .select(`
          *,
          quote:quotes(*),
          assigned_to:user_profiles(*)
        `)
        .eq('customer_id', customerId)
        .order('created_at', { ascending: false }),
      
      supabase
        .from('invoices')
        .select(`
          *,
          job:jobs(*)
        `)
        .eq('customer_id', customerId)
        .order('created_at', { ascending: false })
    ]);

    if (leadsResult.error || quotesResult.error || jobsResult.error || invoicesResult.error) {
      const error = leadsResult.error || quotesResult.error || jobsResult.error || invoicesResult.error;
      return {
        leads: [],
        quotes: [],
        jobs: [],
        invoices: [],
        error: handleDatabaseError(error)
      };
    }

    return {
      leads: leadsResult.data || [],
      quotes: quotesResult.data || [],
      jobs: jobsResult.data || [],
      invoices: invoicesResult.data || [],
      error: null
    };
  } catch (err) {
    return {
      leads: [],
      quotes: [],
      jobs: [],
      invoices: [],
      error: handleDatabaseError(err)
    };
  }
};

export const checkDuplicateCustomer = async (
  organisationId: string, 
  email?: string, 
  name?: string,
  excludeId?: string
): Promise<{ isDuplicate: boolean; duplicateField?: string; error: Error | null }> => {
  try {
    let query = supabase
      .from('customers')
      .select('id, name, email')
      .eq('organisation_id', organisationId);

    if (excludeId) {
      query = query.neq('id', excludeId);
    }

    const { data, error } = await query;
    
    if (error) {
      return { isDuplicate: false, error: handleDatabaseError(error) };
    }

    const customers = data || [];
    
    // Check for email duplicate
    if (email && email.trim()) {
      const emailDuplicate = customers.find(c => 
        c.email && c.email.toLowerCase() === email.toLowerCase()
      );
      if (emailDuplicate) {
        return { isDuplicate: true, duplicateField: 'email', error: null };
      }
    }

    // Check for name duplicate
    if (name && name.trim()) {
      const nameDuplicate = customers.find(c => 
        c.name && c.name.toLowerCase() === name.toLowerCase()
      );
      if (nameDuplicate) {
        return { isDuplicate: true, duplicateField: 'name', error: null };
      }
    }

    return { isDuplicate: false, error: null };
  } catch (err) {
    return { isDuplicate: false, error: handleDatabaseError(err) };
  }
};

export const getCities = async (organisationId: string): Promise<string[]> => {
  try {
    const { data, error } = await supabase
      .from('customers')
      .select('city')
      .eq('organisation_id', organisationId)
      .not('city', 'is', null)
      .order('city', { ascending: true });
    
    if (error) {
      console.error('Error fetching cities:', error);
      return [];
    }
    
    // Get unique cities
    const cities = [...new Set((data || []).map(item => item.city).filter(Boolean))];
    return cities;
  } catch (err) {
    console.error('Error fetching cities:', err);
    return [];
  }
};

export const createCustomer = async (customer: Omit<Customer, 'id' | 'created_at'>): Promise<DatabaseResult<Customer>> => {
  try {
    const { data, error } = await supabase
      .from('customers')
      .insert([customer])
      .select()
      .single();
    
    if (error) {
      return { data: null, error: handleDatabaseError(error) };
    }
    
    return { data, error: null };
  } catch (err) {
    return { data: null, error: handleDatabaseError(err) };
  }
};

export const updateCustomer = async (id: string, updates: Partial<Customer>): Promise<DatabaseResult<Customer>> => {
  try {
    const { data, error } = await supabase
      .from('customers')
      .update(updates)
      .eq('id', id)
      .select()
      .single();
    
    if (error) {
      return { data: null, error: handleDatabaseError(error) };
    }
    
    return { data, error: null };
  } catch (err) {
    return { data: null, error: handleDatabaseError(err) };
  }
};

export const deleteCustomer = async (id: string): Promise<{ error: Error | null }> => {
  try {
    const { error } = await supabase
      .from('customers')
      .delete()
      .eq('id', id);
    
    if (error) {
      return { error: handleDatabaseError(error) };
    }
    
    return { error: null };
  } catch (err) {
    return { error: handleDatabaseError(err) };
  }
};

// Team member functions
export const getTeamMembers = async (organisationId: string): Promise<DatabaseListResult<UserProfile>> => {
  try {
    const { data, error } = await supabase
      .from('user_profiles')
      .select('*')
      .eq('organisation_id', organisationId)
      .eq('is_active', true)
      .order('full_name', { ascending: true });
    
    if (error) {
      return { data: null, error: handleDatabaseError(error) };
    }
    
    return { data: data || [], error: null };
  } catch (err) {
    return { data: null, error: handleDatabaseError(err) };
  }
};

export const getSystemSettings = async (organisationId: string) => {
  try {
    const { data, error } = await supabase
      .from('system_settings')
      .select('default_payment_terms, logo_url, invoice_footer_text') // Added footer text
      .eq('organisation_id', organisationId)
      .maybeSingle(); // <-- Use .maybeSingle() instead of .single()

    if (error) throw error;
    
    // If no settings are found (data is null), return a default object
    if (!data) {
      return { 
        data: { 
          default_payment_terms: 30, 
          logo_url: null,
          invoice_footer_text: 'Tack för ert förtroende!'
        }, 
        error: null 
      };
    }
    
    return { data, error: null };
  } catch (err) {
    console.error('Error fetching system settings:', err);
    return { data: null, error: err as Error };
  }
};

export const getSavedLineItems = async (
  organisationId: string
): Promise<{ data: SavedLineItem[] | null; error: Error | null }> => {
  try {
    const { data, error } = await supabase
      .from('saved_line_items')
      .select('*')
      .eq('organisation_id', organisationId)
      .order('name', { ascending: true });

    if (error) throw error;
    return { data, error: null };
  } catch (err) {
    console.error('Error fetching saved line items:', err);
    return { data: null, error: err as Error };
  }
};

export const createSavedLineItem = async (
  organisationId: string,
  itemData: { name: string; description?: string; unit_price: number }
): Promise<{ data: SavedLineItem | null; error: Error | null }> => {
  try {
    const { data, error } = await supabase
      .from('saved_line_items')
      .insert([
        {
          organisation_id: organisationId,
          name: itemData.name,
          description: itemData.description || itemData.name,
          unit_price: itemData.unit_price,
        },
      ])
      .select()
      .single();

    if (error) throw error;
    return { data, error: null };
  } catch (err) {
    console.error('Error creating saved line item:', err);
    return { data: null, error: err as Error };
  }
};

// Lead functions
export const getLeads = async (organisationId: string): Promise<DatabaseListResult<Lead & { customer?: Customer; assigned_to?: UserProfile }>> => {
  try {
    const { data, error } = await supabase
      .from('leads')
      .select(`
        *,
        customer:customers(*),
        assigned_to:user_profiles(*)
      `)
      .eq('organisation_id', organisationId)
      .order('created_at', { ascending: false });
    
    if (error) {
      return { data: null, error: handleDatabaseError(error) };
    }
    
    return { data: data || [], error: null };
  } catch (err) {
    return { data: null, error: handleDatabaseError(err) };
  }
};

export const createLead = async (lead: Omit<Lead, 'id' | 'created_at'>): Promise<DatabaseResult<Lead & { customer?: Customer; assigned_to?: UserProfile }>> => {
  try {
    const { data, error } = await supabase
      .from('leads')
      .insert([lead])
      .select(`
        *,
        customer:customers(*),
        assigned_to:user_profiles(*)
      `)
      .single();
    
    if (error) {
      return { data: null, error: handleDatabaseError(error) };
    }
    
    return { data, error: null };
  } catch (err) {
    return { data: null, error: handleDatabaseError(err) };
  }
};

export const updateLead = async (id: string, updates: Partial<Lead>): Promise<DatabaseResult<Lead & { customer?: Customer; assigned_to?: UserProfile }>> => {
  try {
    const { data, error } = await supabase
      .from('leads')
      .update(updates)
      .eq('id', id)
      .select(`
        *,
        customer:customers(*),
        assigned_to:user_profiles(*)
      `)
      .single();
    
    if (error) {
      return { data: null, error: handleDatabaseError(error) };
    }
    
    return { data, error: null };
  } catch (err) {
    return { data: null, error: handleDatabaseError(err) };
  }
};

export const deleteLead = async (id: string): Promise<{ error: Error | null }> => {
  try {
    const { error } = await supabase
      .from('leads')
      .delete()
      .eq('id', id);
    
    if (error) {
      return { error: handleDatabaseError(error) };
    }
    
    return { error: null };
  } catch (err) {
    return { error: handleDatabaseError(err) };
  }
};

// Lead Notes functions
export const getLeadNotes = async (leadId: string): Promise<DatabaseListResult<LeadNote & { user?: UserProfile }>> => {
  try {
    const { data, error } = await supabase
      .from('lead_notes')
      .select(`
        *,
        user:user_profiles(*)
      `)
      .eq('lead_id', leadId)
      .order('created_at', { ascending: false });
    
    if (error) {
      return { data: null, error: handleDatabaseError(error) };
    }
    
    return { data: data || [], error: null };
  } catch (err) {
    return { data: null, error: handleDatabaseError(err) };
  }
};

export const createLeadNote = async (leadId: string, userId: string, content: string): Promise<DatabaseResult<LeadNote & { user?: UserProfile }>> => {
  try {
    const { data, error } = await supabase
      .from('lead_notes')
      .insert([{
        lead_id: leadId,
        user_id: userId,
        content
      }])
      .select(`
        *,
        user:user_profiles(*)
      `)
      .single();
    
    if (error) {
      return { data: null, error: handleDatabaseError(error) };
    }
    
    return { data, error: null };
  } catch (err) {
    return { data: null, error: handleDatabaseError(err) };
  }
};

export const updateLeadNote = async (noteId: string, content: string): Promise<DatabaseResult<LeadNote & { user?: UserProfile }>> => {
  try {
    const { data, error } = await supabase
      .from('lead_notes')
      .update({ content })
      .eq('id', noteId)
      .select(`
        *,
        user:user_profiles(*)
      `)
      .single();
    
    if (error) {
      return { data: null, error: handleDatabaseError(error) };
    }
    
    return { data, error: null };
  } catch (err) {
    return { data: null, error: handleDatabaseError(err) };
  }
};

export const deleteLeadNote = async (noteId: string): Promise<{ error: Error | null }> => {
  try {
    const { error } = await supabase
      .from('lead_notes')
      .delete()
      .eq('id', noteId);
    
    if (error) {
      return { error: handleDatabaseError(error) };
    }
    
    return { error: null };
  } catch (err) {
    return { error: handleDatabaseError(err) };
  }
};

// Lead Activities functions
export const getLeadActivities = async (leadId: string): Promise<DatabaseListResult<LeadActivity & { user?: UserProfile }>> => {
  try {
    const { data, error } = await supabase
      .from('lead_activities')
      .select(`
        *,
        user:user_profiles(*)
      `)
      .eq('lead_id', leadId)
      .order('created_at', { ascending: false });
    
    if (error) {
      return { data: null, error: handleDatabaseError(error) };
    }
    
    return { data: data || [], error: null };
  } catch (err) {
    return { data: null, error: handleDatabaseError(err) };
  }
};

export const createLeadActivity = async (
  leadId: string, 
  userId: string | null, 
  activityType: string, 
  description: string
): Promise<DatabaseResult<LeadActivity & { user?: UserProfile }>> => {
  try {
    const { data, error } = await supabase
      .from('lead_activities')
      .insert([{
        lead_id: leadId,
        user_id: userId,
        activity_type: activityType,
        description
      }])
      .select(`
        *,
        user:user_profiles(*)
      `)
      .single();
    
    if (error) {
      return { data: null, error: handleDatabaseError(error) };
    }
    
    return { data, error: null };
  } catch (err) {
    return { data: null, error: handleDatabaseError(err) };
  }
};

// Quote functions
export const getQuotes = async (
  organisationId: string,
  filters: {
    status?: string;
    search?: string;
    dateFrom?: string;
    dateTo?: string;
  } = {}
): Promise<DatabaseListResult<Quote & { customer?: Customer; lead?: Lead }>> => {
  try {
    let query = supabase
      .from('quotes')
      .select(`
        *,
        customer:customers(*),
        lead:leads(*)
      `)
      .eq('organisation_id', organisationId);

    // Apply filters
    if (filters.status && filters.status !== 'all') {
      query = query.eq('status', filters.status);
    }

    if (filters.search) {
      query = query.or(`title.ilike.%${filters.search}%,quote_number.ilike.%${filters.search}%`);
    }

    if (filters.dateFrom) {
      query = query.gte('created_at', filters.dateFrom);
    }

    if (filters.dateTo) {
      query = query.lte('created_at', filters.dateTo);
    }

    const { data, error } = await query.order('created_at', { ascending: false });
    
    if (error) {
      return { data: null, error: handleDatabaseError(error) };
    }
    
    return { data: data || [], error: null };
  } catch (err) {
    return { data: null, error: handleDatabaseError(err) };
  }
};

export const getQuoteById = async (quoteId: string): Promise<DatabaseResult<Quote & { customer?: Customer; lead?: Lead; line_items?: QuoteLineItem[] }>> => {
  try {
    const { data, error } = await supabase
      .from('quotes')
      .select(`
        *,
        customer:customers(*),
        lead:leads(*)
      `)
      .eq('id', quoteId)
      .single();
    
    if (error) {
      return { data: null, error: handleDatabaseError(error) };
    }

    // Fetch line items separately
    const { data: lineItems, error: lineItemsError } = await supabase
      .from('quote_line_items')
      .select('*')
      .eq('quote_id', quoteId)
      .order('sort_order', { ascending: true });

    if (lineItemsError) {
      console.error('Error fetching line items:', lineItemsError);
    }

    return { 
      data: { 
        ...data, 
        line_items: lineItems || [] 
      }, 
      error: null 
    };
  } catch (err) {
    return { data: null, error: handleDatabaseError(err) };
  }
};

export const generateQuoteNumber = async (organisationId: string): Promise<string> => {
  try {
    const { data, error } = await supabase.rpc('generate_quote_number', {
      org_id: organisationId
    });

    if (error) {
      console.error('Error generating quote number:', error);
      // Fallback to client-side generation
      const year = new Date().getFullYear();
      const random = Math.floor(Math.random() * 999) + 1;
      return `OFF-${year}-${random.toString().padStart(3, '0')}`;
    }

    return data;
  } catch (err) {
    console.error('Error generating quote number:', err);
    // Fallback to client-side generation
    const year = new Date().getFullYear();
    const random = Math.floor(Math.random() * 999) + 1;
    return `OFF-${year}-${random.toString().padStart(3, '0')}`;
  }
};

export const createQuote = async (
  quote: Omit<Quote, 'id' | 'created_at' | 'quote_number'>,
  lineItems: Omit<QuoteLineItem, 'id' | 'quote_id' | 'created_at'>[] = []
): Promise<DatabaseResult<Quote & { customer?: Customer; lead?: Lead }>> => {
  try {
    // Generate quote number
    const quoteNumber = await generateQuoteNumber(quote.organisation_id!);

    // Calculate totals
    const subtotal = lineItems.reduce((sum, item) => sum + (item.quantity * item.unit_price), 0);
    const vatAmount = subtotal * 0.25; // 25% Swedish VAT
    const totalAmount = subtotal + vatAmount;

    const { data, error } = await supabase
      .from('quotes')
      .insert([{
        ...quote,
        quote_number: quoteNumber,
        subtotal,
        vat_amount: vatAmount,
        total_amount: totalAmount
      }])
      .select(`
        *,
        customer:customers(*),
        lead:leads(*)
      `)
      .single();
    
    if (error) {
      return { data: null, error: handleDatabaseError(error) };
    }

    // Insert line items if provided
    if (lineItems.length > 0 && data) {
      const lineItemsWithQuoteId = lineItems.map((item, index) => ({
        ...item,
        quote_id: data.id,
        total: item.quantity * item.unit_price,
        sort_order: index
      }));

      const { error: lineItemsError } = await supabase
        .from('quote_line_items')
        .insert(lineItemsWithQuoteId);

      if (lineItemsError) {
        console.error('Error creating line items:', lineItemsError);
      }
    }
    
    return { data, error: null };
  } catch (err) {
    return { data: null, error: handleDatabaseError(err) };
  }
};

export const updateQuote = async (
  id: string, 
  updates: Partial<Quote>,
  lineItems?: Omit<QuoteLineItem, 'id' | 'quote_id' | 'created_at'>[]
): Promise<DatabaseResult<Quote & { customer?: Customer; lead?: Lead }>> => {
  try {
    // If line items are provided, recalculate totals
    if (lineItems) {
      const subtotal = lineItems.reduce((sum, item) => sum + (item.quantity * item.unit_price), 0);
      const vatAmount = subtotal * 0.25; // 25% Swedish VAT
      const totalAmount = subtotal + vatAmount;

      updates = {
        ...updates,
        subtotal,
        vat_amount: vatAmount,
        total_amount: totalAmount
      };
    }

    const { data, error } = await supabase
      .from('quotes')
      .update(updates)
      .eq('id', id)
      .select(`
        *,
        customer:customers(*),
        lead:leads(*)
      `)
      .single();
    
    if (error) {
      return { data: null, error: handleDatabaseError(error) };
    }

    // Update line items if provided
    if (lineItems && data) {
      // Delete existing line items
      await supabase
        .from('quote_line_items')
        .delete()
        .eq('quote_id', id);

      // Insert new line items
      if (lineItems.length > 0) {
        const lineItemsWithQuoteId = lineItems.map((item, index) => ({
          ...item,
          quote_id: id,
          total: item.quantity * item.unit_price,
          sort_order: index
        }));

        const { error: lineItemsError } = await supabase
          .from('quote_line_items')
          .insert(lineItemsWithQuoteId);

        if (lineItemsError) {
          console.error('Error updating line items:', lineItemsError);
        }
      }
    }
    
    return { data, error: null };
  } catch (err) {
    return { data: null, error: handleDatabaseError(err) };
  }
};

export const deleteQuote = async (id: string): Promise<{ error: Error | null }> => {
  try {
    const { error } = await supabase
      .from('quotes')
      .delete()
      .eq('id', id);
    
    if (error) {
      return { error: handleDatabaseError(error) };
    }
    
    return { error: null };
  } catch (err) {
    return { error: handleDatabaseError(err) };
  }
};

export const duplicateQuote = async (originalQuoteId: string): Promise<DatabaseResult<Quote & { customer?: Customer; lead?: Lead }>> => {
  try {
    // Get original quote with line items
    const originalResult = await getQuoteById(originalQuoteId);
    
    if (originalResult.error || !originalResult.data) {
      return { data: null, error: originalResult.error || new Error('Quote not found') };
    }

    const original = originalResult.data;
    
    // Create new quote
    const newQuote = {
      organisation_id: original.organisation_id,
      customer_id: original.customer_id,
      lead_id: original.lead_id,
      title: `${original.title} (Kopia)`,
      description: original.description,
      status: 'draft' as const,
      valid_until: null // Reset valid until date
    };

    // Prepare line items
    const lineItems = (original.line_items || []).map(item => ({
      description: item.description,
      quantity: item.quantity,
      unit_price: item.unit_price
    }));

    return await createQuote(newQuote, lineItems);
  } catch (err) {
    return { data: null, error: handleDatabaseError(err) };
  }
};

export const convertQuoteToJob = async (quoteId: string): Promise<DatabaseResult<Job & { customer?: Customer; quote?: Quote; assigned_to?: UserProfile }>> => {
  try {
    // Get quote details
    const quoteResult = await getQuoteById(quoteId);
    
    if (quoteResult.error || !quoteResult.data) {
      return { data: null, error: quoteResult.error || new Error('Quote not found') };
    }

    const quote = quoteResult.data;
    
    // Create job from quote
    const job = {
      organisation_id: quote.organisation_id,
      customer_id: quote.customer_id,
      quote_id: quoteId,
      assigned_to_user_id: null, // Will need to be assigned later
      title: quote.title,
      description: quote.description,
      status: 'pending' as const,
      value: quote.total_amount
    };

    const result = await createJob(job);
    
    if (result.error) {
      return { data: null, error: result.error };
    }

    // Update quote status to accepted if not already
    if (quote.status !== 'accepted') {
      await updateQuote(quoteId, { status: 'accepted' });
    }

    return result;
  } catch (err) {
    return { data: null, error: handleDatabaseError(err) };
  }
};

// Job functions
export const getJobs = async (
  organisationId: string,
  filters: {
    status?: string;
    assignedTo?: string;
    priority?: string;
    search?: string;
    dateFrom?: string;
    dateTo?: string;
  } = {}
): Promise<DatabaseListResult<Job & { customer?: Customer; quote?: Quote; assigned_to?: UserProfile }>> => {
  try {
    let query = supabase
      .from('jobs')
      .select(`
        *,
        customer:customers(*),
        quote:quotes(*),
        assigned_to:user_profiles(*)
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

    if (filters.priority && filters.priority !== 'all') {
      query = query.eq('priority', filters.priority);
    }

    if (filters.search) {
      query = query.or(`title.ilike.%${filters.search}%,job_number.ilike.%${filters.search}%,description.ilike.%${filters.search}%`);
    }

    if (filters.dateFrom) {
      query = query.gte('created_at', filters.dateFrom);
    }

    if (filters.dateTo) {
      query = query.lte('created_at', filters.dateTo);
    }

    const { data, error } = await query.order('created_at', { ascending: false });
    
    if (error) {
      return { data: null, error: handleDatabaseError(error) };
    }
    
    return { data: data || [], error: null };
  } catch (err) {
    return { data: null, error: handleDatabaseError(err) };
  }
};

export const generateJobNumber = async (organisationId: string): Promise<string> => {
  try {
    const { data, error } = await supabase.rpc('generate_job_number', {
      org_id: organisationId
    });

    if (error) {
      console.error('Error generating job number:', error);
      // Fallback to client-side generation
      const year = new Date().getFullYear();
      const random = Math.floor(Math.random() * 999) + 1;
      return `JOBB-${year}-${random.toString().padStart(3, '0')}`;
    }

    return data;
  } catch (err) {
    console.error('Error generating job number:', err);
    // Fallback to client-side generation
    const year = new Date().getFullYear();
    const random = Math.floor(Math.random() * 999) + 1;
    return `JOBB-${year}-${random.toString().padStart(3, '0')}`;
  }
};

export const createJob = async (job: Omit<Job, 'id' | 'created_at'>): Promise<DatabaseResult<Job & { customer?: Customer; quote?: Quote; assigned_to?: UserProfile }>> => {
  try {
    // Generate job number if not provided
    let jobData = { ...job };
    if (!jobData.job_number && jobData.organisation_id) {
      jobData.job_number = await generateJobNumber(jobData.organisation_id);
    }

    const { data, error } = await supabase
      .from('jobs')
      .insert([jobData])
      .select(`
        *,
        customer:customers(*),
        quote:quotes(*),
        assigned_to:user_profiles(*)
      `)
      .single();
    
    if (error) {
      return { data: null, error: handleDatabaseError(error) };
    }
    
    return { data, error: null };
  } catch (err) {
    return { data: null, error: handleDatabaseError(err) };
  }
};

export const updateJob = async (id: string, updates: Partial<Job>): Promise<DatabaseResult<Job & { customer?: Customer; quote?: Quote; assigned_to?: UserProfile }>> => {
  try {
    const { data, error } = await supabase
      .from('jobs')
      .update(updates)
      .eq('id', id)
      .select(`
        *,
        customer:customers(*),
        quote:quotes(*),
        assigned_to:user_profiles(*)
      `)
      .single();
    
    if (error) {
      return { data: null, error: handleDatabaseError(error) };
    }
    
    return { data, error: null };
  } catch (err) {
    return { data: null, error: handleDatabaseError(err) };
  }
};

export const getJobById = async (jobId: string): Promise<DatabaseResult<Job & { customer?: Customer; quote?: Quote; assigned_to?: UserProfile }>> => {
  try {
    const { data, error } = await supabase
      .from('jobs')
      .select(`
        *,
        customer:customers(*),
        quote:quotes(*),
        assigned_to:user_profiles(*)
      `)
      .eq('id', jobId)
      .single();
    
    if (error) {
      return { data: null, error: handleDatabaseError(error) };
    }
    
    return { data, error: null };
  } catch (err) {
    return { data: null, error: handleDatabaseError(err) };
  }
};

export const deleteJob = async (id: string): Promise<{ error: Error | null }> => {
  try {
    const { error } = await supabase
      .from('jobs')
      .delete()
      .eq('id', id);
    
    if (error) {
      return { error: handleDatabaseError(error) };
    }
    
    return { error: null };
  } catch (err) {
    return { error: handleDatabaseError(err) };
  }
};

// Job Activities functions
export const getJobActivities = async (jobId: string): Promise<DatabaseListResult<JobActivity & { user?: UserProfile }>> => {
  try {
    const { data, error } = await supabase
      .from('job_activities')
      .select(`
        *,
        user:user_profiles(*)
      `)
      .eq('job_id', jobId)
      .order('created_at', { ascending: false });
    
    if (error) {
      return { data: null, error: handleDatabaseError(error) };
    }
    
    return { data: data || [], error: null };
  } catch (err) {
    return { data: null, error: handleDatabaseError(err) };
  }
};

export const createJobActivity = async (
  jobId: string, 
  userId: string | null, 
  activityType: string, 
  description: string,
  oldValue?: string,
  newValue?: string
): Promise<DatabaseResult<JobActivity & { user?: UserProfile }>> => {
  try {
    const { data, error } = await supabase
      .from('job_activities')
      .insert([{
        job_id: jobId,
        user_id: userId,
        activity_type: activityType,
        description,
        old_value: oldValue,
        new_value: newValue
      }])
      .select(`
        *,
        user:user_profiles(*)
      `)
      .single();
    
    if (error) {
      return { data: null, error: handleDatabaseError(error) };
    }
    
    return { data, error: null };
  } catch (err) {
    return { data: null, error: handleDatabaseError(err) };
  }
};

// Invoice functions
export const getInvoices = async (organisationId: string): Promise<DatabaseListResult<Invoice & { job?: Job; customer?: Customer }>> => {
  try {
    const { data, error } = await supabase
      .from('invoices')
      .select(`
        *,
        job:jobs(*),
        customer:customers(*)
      `)
      .eq('organisation_id', organisationId)
      .order('created_at', { ascending: false });
    
    if (error) {
      return { data: null, error: handleDatabaseError(error) };
    }
    
    return { data: data || [], error: null };
  } catch (err) {
    return { data: null, error: handleDatabaseError(err) };
  }
};

export const generateInvoiceNumber = async (organisationId: string): Promise<string> => {
  try {
    const { data, error } = await supabase.rpc('generate_invoice_number', {
      org_id: organisationId
    });

    if (error) {
      console.error('Error generating invoice number:', error);
      // Fallback to client-side generation
      const year = new Date().getFullYear();
      const random = Math.floor(Math.random() * 9999) + 1;
      return `${year}-${random.toString().padStart(4, '0')}`;
    }

    return data;
  } catch (err) {
    console.error('Error generating invoice number:', err);
    // Fallback to client-side generation
    const year = new Date().getFullYear();
    const random = Math.floor(Math.random() * 9999) + 1;
    return `${year}-${random.toString().padStart(4, '0')}`;
  }
};

export const createInvoice = async (
  invoice: Omit<Invoice, 'id' | 'created_at' | 'amount'>,
  lineItems: Omit<InvoiceLineItem, 'id' | 'invoice_id' | 'total'>[]
): Promise<{ data: InvoiceWithRelations | null; error: Error | null }> => {
  try {
    // Calculate total amount from line items
    const totalAmount = lineItems.reduce((sum, item) => sum + (item.quantity * item.unit_price), 0);

    const { data: invoiceData, error: invoiceError } = await supabase
      .from('invoices')
      .insert([{ ...invoice, amount: totalAmount }])
      .select()
      .single();

    if (invoiceError) throw invoiceError;

    const itemsToInsert = lineItems.map(item => ({
      invoice_id: invoiceData.id,
      description: item.description,
      quantity: item.quantity,
      unit_price: item.unit_price,
      total: item.quantity * item.unit_price,
    }));

    const { error: itemsError } = await supabase
      .from('invoice_line_items')
      .insert(itemsToInsert);

    if (itemsError) throw itemsError;

    return { data: invoiceData, error: null };
  } catch (err) {
    console.error('Error creating invoice:', err);
    return { data: null, error: err as Error };
  }
};

// REPLACE the existing updateInvoice function
export const updateInvoice = async (
  id: string,
  updates: Partial<Invoice>,
  lineItems: Omit<InvoiceLineItem, 'id' | 'invoice_id' | 'total'>[]
): Promise<{ data: InvoiceWithRelations | null; error: Error | null }> => {
  try {
    // 1. Delete old line items for this invoice
    const { error: deleteError } = await supabase
      .from('invoice_line_items')
      .delete()
      .eq('invoice_id', id);

    if (deleteError) throw deleteError;

    // 2. Insert new line items
    const itemsToInsert = lineItems.map(item => ({
      invoice_id: id,
      description: item.description,
      quantity: item.quantity,
      unit_price: item.unit_price,
      total: item.quantity * item.unit_price,
    }));

    const { error: insertError } = await supabase
      .from('invoice_line_items')
      .insert(itemsToInsert);

    if (insertError) throw insertError;
    const totalAmount = lineItems.reduce((sum, item) => sum + (item.quantity * item.unit_price), 0);
    const { data, error } = await supabase
      .from('invoices')
      .update({ ...updates, amount: totalAmount })
      .eq('id', id)
      .select()
      .single();

    if (error) throw error;

    return { data, error: null };
  } catch (err) {
    console.error('Error updating invoice:', err);
    return { data: null, error: err as Error };
  }
};

export const deleteInvoice = async (id: string): Promise<{ error: Error | null }> => {
  try {
    const { error } = await supabase
      .from('invoices')
      .delete()
      .eq('id', id);
    
    if (error) {
      return { error: handleDatabaseError(error) };
    }
    
    return { error: null };
  } catch (err) {
    return { error: handleDatabaseError(err) };
  }
};

export const convertJobToInvoice = async (jobId: string): Promise<DatabaseResult<Invoice & { job?: Job; customer?: Customer }>> => {
  try {
    // Get job details
    const jobResult = await getJobById(jobId);
    
    if (jobResult.error || !jobResult.data) {
      return { data: null, error: jobResult.error || new Error('Job not found') };
    }

    const job = jobResult.data;
    
    // Create invoice from job
    const invoiceData = {
      organisation_id: job.organisation_id,
      job_id: jobId,
      customer_id: job.customer_id,
      invoice_number: await generateInvoiceNumber(job.organisation_id!),
      status: 'draft' as const,
      due_date: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString().split('T')[0], // 30 days from now
      amount: job.value
    };

    const result = await createInvoice(invoiceData);
    
    if (result.error) {
      return { data: null, error: result.error };
    }

    // Update job status to invoiced
    if (job.status !== 'invoiced') {
      await updateJob(jobId, { status: 'invoiced' });
    }

    return result;
  } catch (err) {
    return { data: null, error: handleDatabaseError(err) };
  }
};

// Calendar Event functions
export const getCalendarEvents = async (organisationId: string): Promise<DatabaseListResult<CalendarEvent & { assigned_to?: UserProfile; related_lead?: Lead; related_job?: Job }>> => {
  try {
    const { data, error } = await supabase
      .from('calendar_events')
      .select(`
        *,
        assigned_to:user_profiles(*),
        related_lead:leads(*),
        related_job:jobs(*)
      `)
      .eq('organisation_id', organisationId)
      .order('start_time', { ascending: true });
    
    if (error) {
      return { data: null, error: handleDatabaseError(error) };
    }
    
    return { data: data || [], error: null };
  } catch (err) {
    return { data: null, error: handleDatabaseError(err) };
  }
};

export const createCalendarEvent = async (event: Omit<CalendarEvent, 'id' | 'created_at'>): Promise<DatabaseResult<CalendarEvent & { assigned_to?: UserProfile; related_lead?: Lead; related_job?: Job }>> => {
  try {
    const { data, error } = await supabase
      .from('calendar_events')
      .insert([event])
      .select(`
        *,
        assigned_to:user_profiles(*),
        related_lead:leads(*),
        related_job:jobs(*)
      `)
      .single();
    
    if (error) {
      return { data: null, error: handleDatabaseError(error) };
    }
    
    return { data, error: null };
  } catch (err) {
    return { data: null, error: handleDatabaseError(err) };
  }
};

export const updateCalendarEvent = async (id: string, updates: Partial<CalendarEvent>): Promise<DatabaseResult<CalendarEvent & { assigned_to?: UserProfile; related_lead?: Lead; related_job?: Job }>> => {
  try {
    const { data, error } = await supabase
      .from('calendar_events')
      .update(updates)
      .eq('id', id)
      .select(`
        *,
        assigned_to:user_profiles(*),
        related_lead:leads(*),
        related_job:jobs(*)
      `)
      .single();
    
    if (error) {
      return { data: null, error: handleDatabaseError(error) };
    }
    
    return { data, error: null };
  } catch (err) {
    return { data: null, error: handleDatabaseError(err) };
  }
};

// Utility functions


export const formatCurrency = (amount: number): string => {
  return new Intl.NumberFormat('sv-SE', {
    style: 'currency',
    currency: 'SEK',
  }).format(amount);
};


// Format time in Swedish format (HH:MM)
export const formatTime = (date: string | Date): string => {
  const dateObj = typeof date === 'string' ? new Date(date) : date;
  return new Intl.DateTimeFormat('sv-SE', {
    hour: '2-digit',
    minute: '2-digit',
    timeZone: 'Europe/Stockholm'
  }).format(dateObj);
};

export const formatDate = (date: string): string => {
  return new Intl.DateTimeFormat('sv-SE', {
    year: 'numeric',
    month: 'long',
    day: 'numeric',
  }).format(new Date(date));
};

export const formatDateTime = (date: string): string => {
  return new Intl.DateTimeFormat('sv-SE', {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  }).format(new Date(date));
};


// Team management functions
export const createTeamMember = async (
  memberData: Omit<UserProfile, 'id' | 'created_at'>
): Promise<{ data: UserProfile | null; error: Error | null }> => {
  try {
    const { data, error } = await supabase
      .from('user_profiles')
      .insert([memberData])
      .select('*')
      .single();

    if (error) {
      return { data: null, error: new Error(error.message) };
    }

    return { data, error: null };
  } catch (err) {
    console.error('Error creating team member:', err);
    return { data: null, error: err as Error };
  }
};

export const updateTeamMember = async (
  id: string,
  updates: Partial<UserProfile>
): Promise<{ data: UserProfile | null; error: Error | null }> => {
  try {
    const { data, error } = await supabase
      .from('user_profiles')
      .update(updates)
      .eq('id', id)
      .select('*')
      .single();

    if (error) {
      return { data: null, error: new Error(error.message) };
    }

    return { data, error: null };
  } catch (err) {
    console.error('Error updating team member:', err);
    return { data: null, error: err as Error };
  }
};

export const deleteTeamMember = async (id: string): Promise<{ error: Error | null }> => {
  try {
    const { error } = await supabase
      .from('user_profiles')
      .delete()
      .eq('id', id);

    if (error) {
      return { error: new Error(error.message) };
    }

    return { error: null };
  } catch (err) {
    console.error('Error deleting team member:', err);
    return { error: err as Error };
  }
};

export const getTeamAnalytics = async (
  organisationId: string
): Promise<{
  data: {
    totalMembers: number;
    activeMembers: number;
    totalRevenue: number;
    averageConversionRate: number;
    averageCompletionRate: number;
    topPerformer: {
      name: string;
      metric: string;
      value: number;
    } | null;
  } | null;
  error: Error | null;
}> => {
  try {
    // Get team member stats
    const { data: members, error: membersError } = await supabase
      .from('user_profiles')
      .select('*')
      .eq('organisation_id', organisationId);

    if (membersError) {
      return { data: null, error: new Error(membersError.message) };
    }

    // Get revenue data
    const { data: invoices, error: invoicesError } = await supabase
      .from('invoices')
      .select('amount')
      .eq('organisation_id', organisationId)
      .eq('status', 'paid');

    if (invoicesError) {
      console.error('Error fetching invoices for analytics:', invoicesError);
    }

    const totalMembers = members?.length || 0;
    const activeMembers = members?.filter(m => m.is_active).length || 0;
    const totalRevenue = invoices?.reduce((sum, inv) => sum + (inv.amount || 0), 0) || 0;

    // Mock analytics data for demo
    const analytics = {
      totalMembers,
      activeMembers,
      totalRevenue,
      averageConversionRate: 65, // Mock data
      averageCompletionRate: 85, // Mock data
      topPerformer: totalMembers > 0 ? {
        name: members[0].full_name,
        metric: 'Konverteringsgrad',
        value: 78
      } : null
    };

    return { data: analytics, error: null };
  } catch (err) {
    console.error('Error fetching team analytics:', err);
    return { data: null, error: err as Error };
  }
};

export const getWorkloadDistribution = async (
  organisationId: string
): Promise<{
  data: Array<{
    userId: string;
    name: string;
    role: UserRole;
    activeLeads: number;
    activeJobs: number;
    capacity: number;
    utilization: number;
  }> | null;
  error: Error | null;
}> => {
  try {
    // Get team members
    const { data: members, error: membersError } = await supabase
      .from('user_profiles')
      .select('*')
      .eq('organisation_id', organisationId)
      .eq('is_active', true);

    if (membersError) {
      return { data: null, error: new Error(membersError.message) };
    }

    if (!members || members.length === 0) {
      return { data: [], error: null };
    }

    // Get workload data for each member
    const workloadPromises = members.map(async (member) => {
      // Get active leads
      const { data: leads } = await supabase
        .from('leads')
        .select('id')
        .eq('assigned_to_user_id', member.id)
        .not('status', 'in', '("won","lost")');

      // Get active jobs
      const { data: jobs } = await supabase
        .from('jobs')
        .select('id')
        .eq('assigned_to_user_id', member.id)
        .not('status', 'in', '("completed","invoiced")');

      const activeLeads = leads?.length || 0;
      const activeJobs = jobs?.length || 0;
      
      // Calculate capacity based on role
      const capacity = member.role === 'sales' ? 20 : member.role === 'admin' ? 15 : 10;
      const utilization = Math.round(((activeLeads + activeJobs) / capacity) * 100);

      return {
        userId: member.id,
        name: member.full_name,
        role: member.role,
        activeLeads,
        activeJobs,
        capacity,
        utilization: Math.min(utilization, 100)
      };
    });

    const workloadData = await Promise.all(workloadPromises);
    return { data: workloadData, error: null };
  } catch (err) {
    console.error('Error fetching workload distribution:', err);
    return { data: null, error: err as Error };
  }
};
// Dashboard-specific utility functions with proper error handling
export const getKPIData = async (organisationId: string) => {
  try {
    // Execute KPI queries directly for better performance
    const [totalSalesResult, activeLeadsResult, activeJobsResult, overdueInvoicesResult] = await Promise.all([
      // Total försäljning: SUM(amount) FROM invoices WHERE status = 'paid'
      supabase
        .from('invoices')
        .select('amount')
        .eq('organisation_id', organisationId)
        .eq('status', 'paid'),
      
      // Aktiva leads: COUNT(*) FROM leads WHERE status NOT IN ('won', 'lost')
      supabase
        .from('leads')
        .select('id', { count: 'exact' })
        .eq('organisation_id', organisationId)
        .not('status', 'in', '(won,lost)'),
      
      // Pågående jobb: COUNT(*) FROM jobs WHERE status = 'in_progress'
      supabase
        .from('jobs')
        .select('id', { count: 'exact' })
        .eq('organisation_id', organisationId)
        .eq('status', 'in_progress'),
      
      // Förfallna fakturor: COUNT(*) FROM invoices WHERE status = 'overdue'
      supabase
        .from('invoices')
        .select('id', { count: 'exact' })
        .eq('organisation_id', organisationId)
        .eq('status', 'overdue')
    ]);

    // Handle errors from any of the requests
    if (totalSalesResult.error || activeLeadsResult.error || activeJobsResult.error || overdueInvoicesResult.error) {
      console.error('Error fetching KPI data:', {
        totalSalesError: totalSalesResult.error,
        activeLeadsError: activeLeadsResult.error,
        activeJobsError: activeJobsResult.error,
        overdueInvoicesError: overdueInvoicesResult.error
      });
      
      return {
        totalSales: 0,
        activeLeads: 0,
        activeJobs: 0,
        overdueInvoices: 0,
        error: 'Kunde inte hämta KPI-data'
      };
    }

    // Calculate total sales
    const totalSales = (totalSalesResult.data || [])
      .reduce((sum, invoice) => sum + (invoice.amount || 0), 0);

    return {
      totalSales,
      activeLeads: activeLeadsResult.count || 0,
      activeJobs: activeJobsResult.count || 0,
      overdueInvoices: overdueInvoicesResult.count || 0,
      error: null
    };
  } catch (error) {
    console.error('Error fetching KPI data:', error);
    return {
      totalSales: 0,
      activeLeads: 0,
      activeJobs: 0,
      overdueInvoices: 0,
      error: 'Ett oväntat fel inträffade vid hämtning av KPI-data'
    };
  }
};

export const getSalesDataByMonth = async (organisationId: string, months: number = 6) => {
  try {
    // Get paid invoices for the last 6 months
    const sixMonthsAgo = new Date();
    sixMonthsAgo.setMonth(sixMonthsAgo.getMonth() - months);
    
    const { data: invoices, error } = await supabase
      .from('invoices')
      .select('amount, created_at')
      .eq('organisation_id', organisationId)
      .eq('status', 'paid')
      .gte('created_at', sixMonthsAgo.toISOString())
      .order('created_at', { ascending: true });
    
    if (error) {
      console.error('Error fetching sales data:', error);
      return [];
    }

    const invoiceData = invoices || [];
    const salesByMonth = [];
    const now = new Date();
    
    for (let i = months - 1; i >= 0; i--) {
      const date = new Date(now.getFullYear(), now.getMonth() - i, 1);
      const monthName = date.toLocaleDateString('sv-SE', { month: 'short', year: 'numeric' });
      
      const monthSales = invoiceData
        .filter(inv => {
          if (!inv.created_at) return false;
          const invDate = new Date(inv.created_at);
          return invDate.getMonth() === date.getMonth() && 
                 invDate.getFullYear() === date.getFullYear();
        })
        .reduce((sum, inv) => sum + (inv.amount || 0), 0);

      salesByMonth.push({
        month: monthName,
        försäljning: monthSales
      });
    }
    
    return salesByMonth;
  } catch (error) {
    console.error('Error fetching sales data:', error);
    return [];
  }
};

// Get lead status distribution for charts
export const getLeadStatusDistribution = async (organisationId: string) => {
  try {
    const { data: leads, error } = await supabase
      .from('leads')
      .select('status')
      .eq('organisation_id', organisationId);
    
    if (error) {
      console.error('Error fetching lead status distribution:', error);
      return [];
    }

    const statusCounts = (leads || []).reduce((acc, lead) => {
      acc[lead.status] = (acc[lead.status] || 0) + 1;
      return acc;
    }, {} as Record<string, number>);

    return Object.entries(statusCounts).map(([status, count]) => ({
      name: LEAD_STATUS_LABELS[status as LeadStatus] || status,
      value: count,
      status
    }));
  } catch (error) {
    console.error('Error fetching lead status distribution:', error);
    return [];
  }
};

// Get job status distribution for charts
export const getJobStatusDistribution = async (organisationId: string) => {
  try {
    const { data: jobs, error } = await supabase
      .from('jobs')
      .select('status')
      .eq('organisation_id', organisationId);
    
    if (error) {
      console.error('Error fetching job status distribution:', error);
      return [];
    }

    const statusCounts = (jobs || []).reduce((acc, job) => {
      acc[job.status] = (acc[job.status] || 0) + 1;
      return acc;
    }, {} as Record<string, number>);

    return Object.entries(statusCounts).map(([status, count]) => ({
      name: JOB_STATUS_LABELS[status as JobStatus] || status,
      antal: count,
      status
    }));
  } catch (error) {
    console.error('Error fetching job status distribution:', error);
    return [];
  }
};

// Get job priority distribution for charts
export const getJobPriorityDistribution = async (organisationId: string) => {
  try {
    const { data: jobs, error } = await supabase
      .from('jobs')
      .select('priority')
      .eq('organisation_id', organisationId);
    
    if (error) {
      console.error('Error fetching job priority distribution:', error);
      return [];
    }

    const priorityCounts = (jobs || []).reduce((acc, job) => {
      const priority = job.priority || 'normal';
      acc[priority] = (acc[priority] || 0) + 1;
      return acc;
    }, {} as Record<string, number>);

    return Object.entries(priorityCounts).map(([priority, count]) => ({
      name: JOB_PRIORITY_LABELS[priority as JobPriority] || priority,
      antal: count,
      priority
    }));
  } catch (error) {
    console.error('Error fetching job priority distribution:', error);
    return [];
  }
};

// Get recent activity across all tables
export const getRecentActivity = async (organisationId: string, limit: number = 10) => {
  try {
    const [leadsResult, quotesResult, jobsResult, invoicesResult] = await Promise.all([
      supabase
        .from('leads')
        .select('id, title, status, created_at, customer:customers(name)')
        .eq('organisation_id', organisationId)
        .order('created_at', { ascending: false })
        .limit(3),
      
      supabase
        .from('quotes')
        .select('id, title, status, created_at, customer:customers(name)')
        .eq('organisation_id', organisationId)
        .order('created_at', { ascending: false })
        .limit(3),
      
      supabase
        .from('jobs')
        .select('id, title, status, created_at, customer:customers(name)')
        .eq('organisation_id', organisationId)
        .order('created_at', { ascending: false })
        .limit(3),
      
      supabase
        .from('invoices')
        .select('id, invoice_number, status, created_at, customer:customers(name)')
        .eq('organisation_id', organisationId)
        .order('created_at', { ascending: false })
        .limit(3)
    ]);

    const activities = [];

    // Process leads
    if (leadsResult.data) {
      leadsResult.data.forEach(lead => {
        activities.push({
          id: `lead-${lead.id}`,
          type: 'lead' as const,
          title: `Ny lead: ${lead.title}`,
          subtitle: lead.customer?.name || 'Okänd kund',
          time: lead.created_at || '',
          status: lead.status
        });
      });
    }

    // Process quotes
    if (quotesResult.data) {
      quotesResult.data.forEach(quote => {
        const statusText = quote.status === 'accepted' ? 'accepterad' : 
                          quote.status === 'sent' ? 'skickad' : 
                          quote.status === 'declined' ? 'avvisad' : 'skapad';
        activities.push({
          id: `quote-${quote.id}`,
          type: 'quote' as const,
          title: `Offert ${statusText}: ${quote.title}`,
          subtitle: quote.customer?.name || 'Okänd kund',
          time: quote.created_at || '',
          status: quote.status
        });
      });
    }

    // Process jobs
    if (jobsResult.data) {
      jobsResult.data.forEach(job => {
        const statusText = job.status === 'completed' ? 'slutfört' : 
                          job.status === 'in_progress' ? 'påbörjat' : 
                          job.status === 'invoiced' ? 'fakturerat' : 'skapat';
        activities.push({
          id: `job-${job.id}`,
          type: 'job' as const,
          title: `Jobb ${statusText}: ${job.title}`,
          subtitle: job.customer?.name || 'Okänd kund',
          time: job.created_at || '',
          status: job.status
        });
      });
    }

    // Process invoices
    if (invoicesResult.data) {
      invoicesResult.data.forEach(invoice => {
        const statusText = invoice.status === 'paid' ? 'betald' : 
                          invoice.status === 'sent' ? 'skickad' : 
                          invoice.status === 'overdue' ? 'förfallen' : 'skapad';
        activities.push({
          id: `invoice-${invoice.id}`,
          type: 'invoice' as const,
          title: `Faktura ${statusText}: ${invoice.invoice_number}`,
          subtitle: invoice.customer?.name || 'Okänd kund',
          time: invoice.created_at || '',
          status: invoice.status
        });
      });
    }

    // Sort by time and limit results
    return activities
      .sort((a, b) => new Date(b.time).getTime() - new Date(a.time).getTime())
      .slice(0, limit);

  } catch (error) {
    console.error('Error fetching recent activity:', error);
    return [];
  }
};