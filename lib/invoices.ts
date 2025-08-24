import { supabase } from './supabase';
import type { Invoice, Customer, Job, UserProfile, Team, TeamMember, JobType } from '../types/database';
import { JOB_TYPE_LABELS } from '../types/database';
import { formatCurrency, formatDate } from './database';
import { canCreateCreditNote } from './creditNotes';

export interface InvoiceWithRelations extends Invoice {
  customer?: Customer;
  order?: OrderWithRelations;
  assigned_team?: Team & { 
    members?: (TeamMember & { user?: UserProfile })[];
    team_leader?: UserProfile;
  };
  assigned_user?: UserProfile;
  line_items?: InvoiceLineItem[];
  emails?: InvoiceEmail[];
  team_participation?: TeamJobParticipation[];
}

export interface InvoiceEmail {
  id: string;
  organisation_id: string;
  invoice_id: string;
  recipient_email: string;
  subject: string;
  email_body: string;
  attachments: any[];
  status: 'pending' | 'sent' | 'delivered' | 'opened' | 'failed';
  sent_at?: string | null;
  delivered_at?: string | null;
  opened_at?: string | null;
  error_message?: string | null;
  created_at?: string | null;
}

export interface TeamJobParticipation {
  id: string;
  organisation_id: string;
  invoice_id: string;
  user_id: string;
  hours_worked: number;
  role_in_job: string;
  commission_percentage: number;
  work_description?: string | null;
  quality_rating?: number | null;
  created_at?: string | null;
  user?: UserProfile;
}
export interface InvoiceLineItem {
  id: string;
  invoice_id: string;
  description: string;
  quantity: number;
  unit_price: number;
  total: number;
}

export interface InvoiceFilters {
  status?: string;
  customer?: string;
  dateFrom?: string;
  dateTo?: string;
  search?: string;
}

// Database operations
export const getInvoices = async (
  organisationId: string,
  filters: InvoiceFilters = {}
): Promise<{ data: InvoiceWithRelations[] | null; error: Error | null }> => {
  try {
    let query = supabase
      .from('invoices')
      .select(`
        *,
        customer:customers(id, name, email, phone_number, city),
        order:orders(id, title, description, job_description), 
        invoice_line_items(*),
        assigned_team:teams(
          id, name, specialty, hourly_rate,
          team_leader:user_profiles!teams_team_leader_id_fkey(id, full_name, email),
          members:team_members(
            id, role_in_team, is_active,
            user:user_profiles(id, full_name, email, phone_number)
          )
        ),
        assigned_user:user_profiles(id, full_name, email, phone_number),
        emails:invoice_emails(*),
        team_participation:team_job_participation(
          *,
          user_id:user_profiles(id, full_name, email)
        )
      `)
      .eq('organisation_id', organisationId)
      .eq('is_credit_note', false); // Only get regular invoices, not credit notes

    // Apply filters
    if (filters.status && filters.status !== 'all') {
      query = query.eq('status', filters.status);
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
      query = query.or(`invoice_number.ilike.%${filters.search}%`);
    }

    const { data, error } = await query.order('created_at', { ascending: false });


    if (error) {
      return { data: null, error: new Error(error.message) };
    }

    
    

    return { data: data || [], error: null };
  } catch (err) {
    console.error('Error fetching invoices:', err);
    return { data: null, error: err as Error };
  }
};

export const getInvoice = async (
  id: string
): Promise<{ data: InvoiceWithRelations | null; error: Error | null }> => {
  try {
    const { data, error } = await supabase
      .from('invoices')
      .select(`
        *,
        customer:customers(id, name, email, phone_number, address, postal_code, city),
        order:orders(id, title, description, job_description), 
        invoice_line_items(*),
        assigned_team:teams(
          id, name, specialty, hourly_rate,
          team_leader:user_profiles(id, full_name, email, phone_number),
          members:team_members(
            id, role_in_team, is_active,
            user:user_profiles(id, full_name, email, phone_number)
          )
        ),
        assigned_user:user_profiles(id, full_name, email, phone_number),
        emails:invoice_emails(*),
        team_participation:team_job_participation(
          *,
          user:user_profiles(id, full_name, email)
        )
      `)
      .eq('id', id)
      .single();

    if (error) {
      return { data: null, error: new Error(error.message) };
    }

    return { data, error: null };
  } catch (err) {
    console.error('Error fetching invoice:', err);
    return { data: null, error: err as Error };
  }
};

export const createInvoice = async (
  invoice: Omit<Invoice, 'id' | 'created_at' | 'invoice_line_items'>,
  lineItems: Omit<InvoiceLineItem, 'id' | 'invoice_id'>[]
): Promise<{ data: InvoiceWithRelations | null; error: Error | null }> => {
  try {
    // 1. Create the main invoice record
    const { data: newInvoice, error: invoiceError } = await supabase
      .from('invoices')
      .insert([invoice])
      .select(`
        *,
        customer:customers(*),
        order:orders(*) 
      `) // <-- CORRECTED SELECT STATEMENT
      .single();

    if (invoiceError) {
      return { data: null, error: new Error(invoiceError.message) };
    }

    if (!newInvoice) {
        return { data: null, error: new Error("Failed to create invoice, no data returned.") };
    }

    // 2. Prepare and insert the line items with the new invoice's ID
    const lineItemsToInsert = lineItems.map(item => ({
      ...item,
      invoice_id: newInvoice.id
      
    }));

    const { data: insertedLineItems, error: lineItemsError } = await supabase
      .from('invoice_line_items')
      .insert(lineItemsToInsert)
      .select();

    if (lineItemsError) {
        // Optional: Attempt to delete the partially created invoice for data consistency
        await supabase.from('invoices').delete().eq('id', newInvoice.id);
        return { data: null, error: new Error(`Failed to save line items: ${lineItemsError.message}`) };
    }

    // 3. Combine the results and return the complete invoice
    const completeInvoice: InvoiceWithRelations = {
        ...newInvoice,
        invoice_line_items: insertedLineItems as InvoiceLineItem[]
    };
    if (newInvoice.order_id) {
      const { error: orderUpdateError } = await supabase
        .from('orders')
        .update({ status: 'fakturerad' }) // Or 'completed', 'archived', etc.
        .eq('id', newInvoice.order_id);

      if (orderUpdateError) {
        // This is not a critical error, so we just log it and don't stop the process
        console.error('Could not update order status:', orderUpdateError);
      }
    }

    return { data: completeInvoice, error: null };
  } catch (err) {
    console.error('Error creating invoice:', err);
    return { data: null, error: err as Error };
  }
};

export const updateInvoice = async (
  id: string,
  updates: Partial<Invoice>,
  lineItems: InvoiceLineItem[]
): Promise<{ data: InvoiceWithRelations | null; error: Error | null }> => {
  try {
    // 1. Update the main invoice record first
    const { data: updatedInvoice, error: invoiceError } = await supabase
      .from('invoices')
      .update(updates)
      .eq('id', id)
      .select(`
        *,
        customer:customers(*),
        order:orders(*)
      `) // <-- CORRECTED SELECT STATEMENT
      .single();

    if (invoiceError) {
      return { data: null, error: new Error(invoiceError.message) };
    }

    if (!updatedInvoice) {
        return { data: null, error: new Error("Failed to update invoice.") };
    }

    // 2. Delete all existing line items for this invoice
    const { error: deleteError } = await supabase
        .from('invoice_line_items')
        .delete()
        .eq('invoice_id', id);

    if (deleteError) {
        return { data: null, error: new Error(`Failed to delete old line items: ${deleteError.message}`) };
    }

    // 3. Prepare and insert the new (or updated) line items
    // We remove the 'id' field as Supabase will generate a new one
    const lineItemsToInsert = lineItems.map(({ id: lineId, ...item }) => ({
        ...item,
        invoice_id: updatedInvoice.id
        
    }));

    const { data: insertedLineItems, error: insertError } = await supabase
        .from('invoice_line_items')
        .insert(lineItemsToInsert)
        .select();

    if (insertError) {
        return { data: null, error: new Error(`Failed to insert new line items: ${insertError.message}`) };
    }

    // 4. Combine and return the complete, updated invoice data
    const completeInvoice: InvoiceWithRelations = {
        ...updatedInvoice,
        invoice_line_items: insertedLineItems as InvoiceLineItem[]
    };
    
    return { data: completeInvoice, error: null };
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
      return { error: new Error(error.message) };
    }

    return { error: null };
  } catch (err) {
    console.error('Error deleting invoice:', err);
    return { error: err as Error };
  }
};

// Statistics and analytics
export const getInvoiceStats = async (
  organisationId: string,
  dateFrom?: string,
  dateTo?: string
): Promise<{
  data: {
    totalInvoices: number;
    totalAmount: number;
    paidAmount: number;
    overdueAmount: number;
    statusBreakdown: Record<string, number>;
    recentInvoices: InvoiceWithRelations[];
  } | null;
  error: Error | null;
}> => {
  try {
    let query = supabase
      .from('invoices')
      .select(`
        *,
        customer:customers(name),
        order:orders(id, title, description, job_description),
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

    const invoices = data || [];
    const totalInvoices = invoices.length;
    const totalAmount = invoices.reduce((sum, invoice) => sum + invoice.amount, 0);
    const paidAmount = invoices
      .filter(invoice => invoice.status === 'paid')
      .reduce((sum, invoice) => sum + invoice.amount, 0);
    const overdueAmount = invoices
      .filter(invoice => invoice.status === 'overdue')
      .reduce((sum, invoice) => sum + invoice.amount, 0);

    const statusBreakdown = invoices.reduce((acc, invoice) => {
      acc[invoice.status] = (acc[invoice.status] || 0) + 1;
      return acc;
    }, {} as Record<string, number>);

    const recentInvoices = invoices.slice(0, 5);

    return {
      data: {
        totalInvoices,
        totalAmount,
        paidAmount,
        overdueAmount,
        statusBreakdown,
        recentInvoices
      },
      error: null
    };
  } catch (err) {
    console.error('Error fetching invoice stats:', err);
    return { data: null, error: err as Error };
  }
};

// Email operations
export const sendInvoiceEmail = async (
  invoiceId: string,
  emailData: {
    recipient_email: string;
    subject: string;
    email_body: string;
    attachments?: any[];
    send_copy_to_team_leader?: boolean;
  }
): Promise<{ data: InvoiceEmail | null; error: Error | null }> => {
  try {
    // Get invoice details for organization ID
    const { data: invoice } = await supabase
      .from('invoices')
      .select('organisation_id, assigned_team_id')
      .eq('id', invoiceId)
      .single();

    if (!invoice) {
      return { data: null, error: new Error('Faktura hittades inte') };
    }

    // Create email record
    const { data: emailRecord, error: emailError } = await supabase
      .from('invoice_emails')
      .insert([{
        organisation_id: invoice.organisation_id,
        invoice_id: invoiceId,
        recipient_email: emailData.recipient_email,
        subject: emailData.subject,
        email_body: emailData.email_body,
        attachments: emailData.attachments || [],
        status: 'pending'
      }])
      .select()
      .single();

    if (emailError) {
      return { data: null, error: new Error(emailError.message) };
    }

    // TODO: Integrate with actual email service (SendGrid, Resend, etc.)
    // For now, simulate email sending
    await new Promise(resolve => setTimeout(resolve, 1000));

    // Update email status and invoice
    const { data: updatedEmail, error: updateError } = await supabase
      .from('invoice_emails')
      .update({
        status: 'sent',
        sent_at: new Date().toISOString()
      })
      .eq('id', emailRecord.id)
      .select()
      .single();

    if (updateError) {
      return { data: null, error: new Error(updateError.message) };
    }

    // Update invoice email tracking
    await supabase
      .from('invoices')
      .update({
        status: 'sent',
        email_sent: true,
        email_sent_at: new Date().toISOString(),
        email_recipient: emailData.recipient_email
      })
      .eq('id', invoiceId);

    return { data: updatedEmail, error: null };
  } catch (err) {
    console.error('Error sending invoice email:', err);
    return { data: null, error: err as Error };
  }
};

export const getInvoiceEmails = async (
  invoiceId: string
): Promise<{ data: InvoiceEmail[] | null; error: Error | null }> => {
  try {
    const { data, error } = await supabase
      .from('invoice_emails')
      .select('*')
      .eq('invoice_id', invoiceId)
      .order('created_at', { ascending: false });

    if (error) {
      return { data: null, error: new Error(error.message) };
    }

    return { data: data || [], error: null };
  } catch (err) {
    console.error('Error fetching invoice emails:', err);
    return { data: null, error: err as Error };
  }
};

// Team participation operations
export const getTeamJobParticipation = async (
  invoiceId: string
): Promise<{ data: TeamJobParticipation[] | null; error: Error | null }> => {
  try {
    const { data, error } = await supabase
      .from('team_job_participation')
      .select(`
        *,
        user:user_profiles(id, full_name, email, phone_number)
      `)
      .eq('invoice_id', invoiceId)
      .order('role_in_job', { ascending: true });

    if (error) {
      return { data: null, error: new Error(error.message) };
    }

    return { data: data || [], error: null };
  } catch (err) {
    console.error('Error fetching team job participation:', err);
    return { data: null, error: err as Error };
  }
};

export const updateTeamJobParticipation = async (
  invoiceId: string,
  participationData: Array<{
    user_id: string;
    hours_worked: number;
    role_in_job: string;
    work_description?: string;
    quality_rating?: number;
  }>
): Promise<{ error: Error | null }> => {
  try {
    // Get invoice organization ID
    const { data: invoice } = await supabase
      .from('invoices')
      .select('organisation_id')
      .eq('id', invoiceId)
      .single();

    if (!invoice) {
      return { error: new Error('Faktura hittades inte') };
    }

    // Delete existing participation records
    await supabase
      .from('team_job_participation')
      .delete()
      .eq('invoice_id', invoiceId);

    // Insert new participation records
    const participationRecords = participationData.map(data => ({
      organisation_id: invoice.organisation_id,
      invoice_id: invoiceId,
      ...data
    }));

    const { error } = await supabase
      .from('team_job_participation')
      .insert(participationRecords);

    if (error) {
      return { error: new Error(error.message) };
    }

    return { error: null };
  } catch (err) {
    console.error('Error updating team job participation:', err);
    return { error: err as Error };
  }
};

// Email template generation
export const generateInvoiceEmailTemplate = (
  invoice: InvoiceWithRelations,
  templateType: 'standard' | 'team_presentation' | 'quality_assurance' | 'follow_up' = 'standard'
): { subject: string; body: string } => {
  const customerName = invoice.customer?.name || 'Kund';
  const invoiceNumber = invoice.invoice_number;
  const amount = formatCurrency(invoice.amount);
  const dueDate = invoice.due_date ? formatDate(invoice.due_date) : 'Enligt överenskommelse';
  
  // Team/individual assignment info
  const assignmentInfo = invoice.assigned_team 
    ? `Team: ${invoice.assigned_team.name} (${invoice.assigned_team.members?.filter(m => m.is_active).length || 0} personer)`
    : invoice.assigned_user 
    ? `Utfört av: ${invoice.assigned_user.full_name}`
    : 'Momentum CRM';

  const jobTypeLabel = invoice.job_type ? JOB_TYPE_LABELS[invoice.job_type] : 'Allmänt arbete';

  let subject: string;
  let body: string;

  switch (templateType) {
    case 'team_presentation':
      subject = `Faktura ${invoiceNumber} - ${jobTypeLabel} utfört av ${invoice.assigned_team?.name || 'vårt team'}`;
      body = `Hej ${customerName}!

Vi är glada att kunna presentera fakturan för det ${jobTypeLabel.toLowerCase()} som vårt team har utfört åt er.

${assignmentInfo} har arbetat professionellt med ert uppdrag och vi är stolta över resultatet.

Fakturadetaljer:
- Fakturanummer: ${invoiceNumber}
- Belopp: ${amount}
- Förfallodatum: ${dueDate}
- Utfört arbete: ${invoice.job_description || 'Se bifogad faktura'}

${invoice.work_summary ? `Sammanfattning av utfört arbete:
${invoice.work_summary}

` : ''}Vårt team står bakom kvaliteten på det utförda arbetet och vi erbjuder full garanti enligt våra standardvillkor.

Vid frågor om fakturan eller det utförda arbetet, kontakta gärna ${invoice.assigned_team?.team_leader?.full_name || 'oss'} direkt.

Tack för förtroendet!

Med vänliga hälsningar,
Momentum CRM`;
      break;

    case 'quality_assurance':
      subject = `Faktura ${invoiceNumber} - Kvalitetsgaranti för ${jobTypeLabel}`;
      body = `Hej ${customerName}!

Bifogat finner ni faktura för det ${jobTypeLabel.toLowerCase()} som ${assignmentInfo} har utfört.

Vi på Momentum CRM står bakom kvaliteten på allt arbete som utförs av våra specialiserade team. ${invoice.assigned_team ? `Team ${invoice.assigned_team.name} har gedigen erfarenhet inom ${jobTypeLabel.toLowerCase()} och följer våra höga kvalitetsstandarder.` : ''}

Kvalitetsgaranti:
- Professionellt utfört arbete enligt branschstandard
- Garanti på utfört arbete enligt våra villkor
- Efterkontroll vid behov
- Kundnöjdhetsgaranti

Fakturadetaljer:
- Fakturanummer: ${invoiceNumber}
- Belopp: ${amount}
- Förfallodatum: ${dueDate}

${invoice.work_summary ? `Utfört arbete:
${invoice.work_summary}

` : ''}Vi hoppas ni är nöjda med resultatet och ser fram emot framtida samarbeten.

Med vänliga hälsningar,
Momentum CRM`;
      break;

    case 'follow_up':
      subject = `Uppföljning: Faktura ${invoiceNumber} och ert ${jobTypeLabel}`;
      body = `Hej ${customerName}!

Vi hoppas ni är nöjda med det ${jobTypeLabel.toLowerCase()} som ${assignmentInfo} utförde åt er.

Bifogat finner ni fakturan för det utförda arbetet. Vi skulle uppskatta er feedback om både arbetet och vår service.

Fakturadetaljer:
- Fakturanummer: ${invoiceNumber}
- Belopp: ${amount}
- Förfallodatum: ${dueDate}

${invoice.work_summary ? `Sammanfattning av utfört arbete:
${invoice.work_summary}

` : ''}För framtida behov av ${jobTypeLabel.toLowerCase()} eller andra tjänster, tveka inte att kontakta oss. Vi har specialiserade team för alla typer av uppdrag.

Tack för ert förtroende!

Med vänliga hälsningar,
Momentum CRM`;
      break;

    default: // standard
      subject = `Faktura ${invoiceNumber} från Momentum CRM`;
      body = `Hej ${customerName}!

Tack för att ni valde Momentum CRM för ert ${jobTypeLabel.toLowerCase()}.

Bifogat finner ni faktura för det utförda arbetet.

Fakturadetaljer:
- Fakturanummer: ${invoiceNumber}
- Belopp: ${amount}
- Förfallodatum: ${dueDate}
- ${assignmentInfo}

${invoice.work_summary ? `Utfört arbete:
${invoice.work_summary}

` : ''}Vid frågor om fakturan, kontakta oss gärna.

Med vänliga hälsningar,
Momentum CRM`;
  }

  return { subject, body };
};

// Utility functions
export const getOverdueInvoices = (invoices: InvoiceWithRelations[]): InvoiceWithRelations[] => {
  const today = new Date();
  today.setHours(0, 0, 0, 0);

  return invoices.filter(invoice => 
    invoice.due_date && 
    new Date(invoice.due_date) < today && 
    invoice.status !== 'paid'
  );
};

export const getInvoicesDueSoon = (invoices: InvoiceWithRelations[], days = 7): InvoiceWithRelations[] => {
  const today = new Date();
  const futureDate = new Date();
  futureDate.setDate(today.getDate() + days);

  return invoices.filter(invoice => 
    invoice.due_date && 
    invoice.status === 'sent' &&
    new Date(invoice.due_date) >= today && 
    new Date(invoice.due_date) <= futureDate
  );
};

export const searchInvoices = (invoices: InvoiceWithRelations[], searchTerm: string): InvoiceWithRelations[] => {
  if (!searchTerm.trim()) return invoices;

  const term = searchTerm.toLowerCase();
  return invoices.filter(invoice =>
    invoice.invoice_number.toLowerCase().includes(term) ||
    invoice.customer?.name.toLowerCase().includes(term) ||
    invoice.job?.title?.toLowerCase().includes(term)
  );
};