import { supabase } from './supabase';
import type { InvoiceWithRelations } from './invoices';
import { formatCurrency, formatDate } from './database';

export interface CreditNote extends InvoiceWithRelations {
  is_credit_note: true;
  original_invoice_id: string;
  credit_reason: string;
  credit_note_number: string;
  original_invoice?: InvoiceWithRelations;
}

export interface CreditNoteRequest {
  original_invoice_id?: string;
  credit_reason: string;
  custom_reason: string;
  credit_type: 'full' | 'partial' | 'amount_adjustment';
  line_items?: Array<{
    description: string;
    quantity: number;
    unit_price: number;
    total: number;
  }>;
  credit_amount?: number;
}

export const CREDIT_REASONS = {
  'returvara': 'Returvara',
  'priskorrigering': 'Priskorrigering',
  'felaktig_faktura': 'Felaktig faktura',
  'annat': 'Annat'
} as const;

export type CreditReason = keyof typeof CREDIT_REASONS;

// Get credit notes for an organization
export const getCreditNotes = async (
  organisationId: string
): Promise<{ data: CreditNote[] | null; error: Error | null }> => {
  try {
    const { data, error } = await supabase
      .from('invoices')
      .select(`
        *,
        customer:customers(id, name, email, phone_number),
        original_invoice:original_invoice_id(
          id, invoice_number, amount, created_at
        ),
        invoice_line_items(*)
      `)
      .eq('organisation_id', organisationId)
      .eq('is_credit_note', true)
      .order('created_at', { ascending: false });

    if (error) {
      return { data: null, error: new Error(error.message) };
    }

    return { data: data as CreditNote[] || [], error: null };
  } catch (err) {
    console.error('Error fetching credit notes:', err);
    return { data: null, error: err as Error };
  }
};

export const sendCreditNoteEmail = async (
  creditNoteId: string,
  emailData: {
    recipient_email: string;
    subject: string;
    email_body: string;
  }
): Promise<{ data: any | null; error: Error | null }> => {
  try {
    // The ONLY action required is to update the status in the 'invoices' table.
    // Your backend will handle the actual email sending when this status changes.
    const { data, error } = await supabase
      .from('invoices')
      .update({ status: 'sent' })
      .eq('id', creditNoteId)
      .select()
      .single();

    if (error) {
      throw new Error('Det gick inte att uppdatera kreditfakturans status: ' + error.message);
    }

    return { data, error: null };

  } catch (err: any) {
    console.error('Allvarligt fel i sendCreditNoteEmail:', err);
    return { data: null, error: new Error(err.message || 'Ett okänt serverfel inträffade.') };
  }
};

// Get credit notes for a specific invoice
export const getInvoiceCreditNotes = async (
  invoiceId: string
): Promise<{ data: CreditNote[] | null; error: Error | null }> => {
  try {
    const { data, error } = await supabase
      .from('invoices')
      .select(`
        *,
        customer:customers(id, name, email, phone_number),
        original_invoice:invoices!original_invoice_id(
      id, invoice_number, amount, created_at
    ),
        invoice_line_items(*)
      `)
      .eq('original_invoice_id', invoiceId)
      .eq('is_credit_note', true)
      .order('created_at', { ascending: false });

    if (error) {
      return { data: null, error: new Error(error.message) };
    }

    return { data: data as CreditNote[] || [], error: null };
  } catch (err) {
    console.error('Error fetching invoice credit notes:', err);
    return { data: null, error: err as Error };
  }
};

// Create a credit note
export const createCreditNote = async (
  request: CreditNoteRequest,
  organisationId: string,
  createdByUserId: string
): Promise<{ data: CreditNote | null; error: Error | null }> => {
  try {
    // Get original invoice details
    const { data: originalInvoice, error: invoiceError } = await supabase
      .from('invoices')
      .select(`
        *,
        customer:customers(*),
        invoice_line_items(*)
      `)
      .eq('id', request.original_invoice_id)
      .single();

    if (invoiceError || !originalInvoice) {
      return { data: null, error: new Error('Original invoice not found') };
    }

    // Generate credit note number
    const { data: creditNoteNumber, error: numberError } = await supabase
      .rpc('generate_credit_note_number', { org_id: organisationId });

    if (numberError) {
      return { data: null, error: new Error(numberError.message) };
    }

    // Calculate credit amount
    let creditAmount = 0;
    let lineItems: any[] = [];

    if (request.credit_type === 'full') {
      creditAmount = -Math.abs(originalInvoice.amount);
      lineItems = (originalInvoice.invoice_line_items || []).map((item: any) => ({
        description: item.description,
        quantity: item.quantity,
        unit_price: -Math.abs(item.unit_price),
        total: -Math.abs(item.total)
      }));
    } else if (request.credit_type === 'partial' && request.line_items) {
      lineItems = request.line_items.map(item => ({
        description: item.description,
        quantity: item.quantity,
        unit_price: -Math.abs(item.unit_price),
        total: -Math.abs(item.total)
      }));
      creditAmount = lineItems.reduce((sum, item) => sum + item.total, 0);
    } else if (request.credit_type === 'amount_adjustment' && request.credit_amount) {
      creditAmount = -Math.abs(request.credit_amount);
      lineItems = [{
        description: `Kreditering: ${request.credit_reason === 'annat' ? request.custom_reason : CREDIT_REASONS[request.credit_reason as CreditReason]}`,
        quantity: 1,
        unit_price: creditAmount,
        total: creditAmount
      }];
    }

    // Create credit note
    const { data: creditNote, error: createError } = await supabase
      .from('invoices')
      .insert({
        organisation_id: organisationId,
        customer_id: originalInvoice.customer_id,
        invoice_number: creditNoteNumber,
        credit_note_number: creditNoteNumber,
        is_credit_note: true,
        original_invoice_id: request.original_invoice_id,
        credit_reason: request.credit_reason === 'annat' ? request.custom_reason : CREDIT_REASONS[request.credit_reason as CreditReason],
        amount: creditAmount,
        status: 'draft',
        due_date: new Date().toISOString().split('T')[0],
        job_description: `Kreditfaktura för ${originalInvoice.invoice_number}`,
        assigned_team_id: originalInvoice.assigned_team_id,
        assigned_user_id: originalInvoice.assigned_user_id,
        assignment_type: originalInvoice.assignment_type
      })
      .select(`
        *,
        customer:customers(*),
        original_invoice:invoices!original_invoice_id(*)
      `)
      .single();

    if (createError) {
      return { data: null, error: new Error(createError.message) };
    }

    // Create line items for credit note
    if (lineItems.length > 0) {
      const lineItemsToInsert = lineItems.map(item => ({
        ...item,
        invoice_id: creditNote.id
      }));

      const { error: lineItemsError } = await supabase
        .from('invoice_line_items')
        .insert(lineItemsToInsert);

      if (lineItemsError) {
        // Rollback credit note creation
        await supabase.from('invoices').delete().eq('id', creditNote.id);
        return { data: null, error: new Error(lineItemsError.message) };
      }
    }

    return { data: creditNote as CreditNote, error: null };
  } catch (err) {
    console.error('Error creating credit note:', err);
    return { data: null, error: err as Error };
  }
};

// Update credit note status
export const updateCreditNoteStatus = async (
  creditNoteId: string,
  status: 'draft' | 'sent' | 'paid'
): Promise<{ error: Error | null }> => {
  try {
    const { error } = await supabase
      .from('invoices')
      .update({ status })
      .eq('id', creditNoteId)
      .eq('is_credit_note', true);

    if (error) {
      return { error: new Error(error.message) };
    }

    return { error: null };
  } catch (err) {
    console.error('Error updating credit note status:', err);
    return { error: err as Error };
  }
};

// Get credit note statistics
export const getCreditNoteStats = async (
  organisationId: string,
  dateFrom?: string,
  dateTo?: string
): Promise<{
  data: {
    totalCreditNotes: number;
    totalCreditAmount: number;
    creditsByReason: Record<string, number>;
    recentCreditNotes: CreditNote[];
  } | null;
  error: Error | null;
}> => {
  try {
    let query = supabase
      .from('credit_notes')
      .select(`
        *,
        customer:customers(name)
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

    const creditNotes = data || [];
    const totalCreditNotes = creditNotes.length;
    const totalCreditAmount = Math.abs(creditNotes.reduce((sum, cn) => sum + (cn.amount || 0), 0));

    const creditsByReason = creditNotes.reduce((acc, cn) => {
      const reason = cn.credit_reason || 'Okänd';
      acc[reason] = (acc[reason] || 0) + 1;
      return acc;
    }, {} as Record<string, number>);

    const recentCreditNotes = creditNotes.slice(0, 5) as CreditNote[];

    return {
      data: {
        totalCreditNotes,
        totalCreditAmount,
        creditsByReason,
        recentCreditNotes
      },
      error: null
    };
  } catch (err) {
    console.error('Error fetching credit note stats:', err);
    return { data: null, error: err as Error };
  }
};

// Validate credit note creation
export const validateCreditNoteCreation = (
  originalInvoice: InvoiceWithRelations,
  creditAmount: number
): { isValid: boolean; error?: string } => {
  // Check if invoice can be credited
  if (!['sent', 'paid'].includes(originalInvoice.status)) {
    return {
      isValid: false,
      error: 'Endast skickade eller betalda fakturor kan krediteras'
    };
  }

  // Check if credit amount is valid
  const maxCreditAmount = Math.abs(originalInvoice.net_amount || originalInvoice.amount);
  if (Math.abs(creditAmount) > maxCreditAmount) {
    return {
      isValid: false,
      error: `Kreditbelopp kan inte överstiga ${formatCurrency(maxCreditAmount)}`
    };
  }

  // Check if invoice is already fully credited
  if (originalInvoice.credited_amount && Math.abs(originalInvoice.credited_amount) >= Math.abs(originalInvoice.amount)) {
    return {
      isValid: false,
      error: 'Fakturan är redan fullständigt krediterad'
    };
  }

  return { isValid: true };
};

// Generate credit note email template
export const generateCreditNoteEmailTemplate = (
  creditNote: CreditNote,
  templateType: 'standard' | 'explanation' = 'standard'
): { subject: string; body: string } => {
  const customerName = creditNote.customer?.name || 'Kund';
  const creditNoteNumber = creditNote.credit_note_number;
  const originalInvoiceNumber = creditNote.original_invoice?.invoice_number;
  const creditAmount = formatCurrency(Math.abs(creditNote.amount));
  const reason = creditNote.credit_reason;

  let subject: string;
  let body: string;

  if (templateType === 'explanation') {
    subject = `Kreditfaktura ${creditNoteNumber} - Förklaring och nästa steg`;
    body = `Hej ${customerName}!

Vi har utfärdat en kreditfaktura för er tidigare faktura.

Kreditfaktura-detaljer:
- Kreditfaktura nummer: ${creditNoteNumber}
- Avser faktura: ${originalInvoiceNumber}
- Kreditbelopp: ${creditAmount}
- Anledning: ${reason}

Vad händer nu:
${creditNote.original_invoice?.status === 'paid' 
  ? `Eftersom den ursprungliga fakturan redan är betald kommer vi att återbetala ${creditAmount} till ert konto inom 5-10 arbetsdagar.`
  : `Det nya beloppet att betala för faktura ${originalInvoiceNumber} är nu ${formatCurrency(Math.abs((creditNote.original_invoice?.net_amount || 0)))}.`
}

Vid frågor om denna kreditfaktura, kontakta oss gärna.

Med vänliga hälsningar,
Momentum CRM`;
  } else {
    subject = `Kreditfaktura ${creditNoteNumber} från Momentum CRM`;
    body = `Hej ${customerName}!

Bifogat finner ni kreditfaktura för er tidigare faktura ${originalInvoiceNumber}.

Kreditfaktura-detaljer:
- Kreditfaktura nummer: ${creditNoteNumber}
- Kreditbelopp: ${creditAmount}
- Anledning: ${reason}

${creditNote.work_summary ? `Beskrivning:
${creditNote.work_summary}

` : ''}Vid frågor om denna kreditfaktura, kontakta oss gärna.

Med vänliga hälsningar,
Momentum CRM`;
  }

  return { subject, body };
};

// Utility functions
export const canCreateCreditNote = (invoice: InvoiceWithRelations): boolean => {
  return ['sent', 'paid'].includes(invoice.status) && !invoice.is_credit_note;
};

export const getRemainingCreditableAmount = (invoice: InvoiceWithRelations): number => {
  const originalAmount = Math.abs(invoice.amount);
  const creditedAmount = Math.abs(invoice.credited_amount || 0);
  return originalAmount - creditedAmount;
};

export const formatCreditReason = (reason: string): string => {
  return Object.values(CREDIT_REASONS).includes(reason as any) 
    ? reason 
    : reason || 'Okänd anledning';
};