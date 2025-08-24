import { supabase } from './supabase';
import { generateAcceptanceToken, type ROTData } from './rot';
import type { Quote, Customer, Lead, QuoteLineItem, QuoteStatus } from '../types/database';

export interface QuoteWithRelations extends Quote {
  customer?: Customer;
  lead?: Lead;
  line_items?: QuoteLineItem[];
  order?: any;
}

export interface QuoteFilters {
  status?: string;
  customer?: string;
  dateFrom?: string;
  dateTo?: string;
  search?: string;
}

export interface QuoteEmailData {
  recipient_email: string;
  subject: string;
  body: string;
  include_acceptance_link?: boolean;
}

// Database operations
export const getQuotes = async (
  organisationId: string,
  filters: QuoteFilters = {}
): Promise<{ data: QuoteWithRelations[] | null; error: Error | null }> => {
  try {
    let query = supabase
      .from('quotes')
      .select(`
        *,
        customer:customers(*),
        lead:leads(id, title),
        quote_line_items(*),
        order:orders(id, title, status)
      `)
      .eq('organisation_id', organisationId);

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
      query = query.or(`title.ilike.%${filters.search}%,description.ilike.%${filters.search}%,quote_number.ilike.%${filters.search}%`);
    }

    const { data, error } = await query.order('created_at', { ascending: false });

    if (error) {
      return { data: null, error: new Error(error.message) };
    }

    return { data: data || [], error: null };
  } catch (err) {
    console.error('Error fetching quotes:', err);
    return { data: null, error: err as Error };
  }
};

export const getQuote = async (
  id: string
): Promise<{ data: QuoteWithRelations | null; error: Error | null }> => {
  try {
    const { data, error } = await supabase
      .from('quotes')
      .select(`
        *,
        customer:customers(*),
        lead:leads(id, title),
        quote_line_items(*),
        order:orders(id, title, status)
      `)
      .eq('id', id)
      .single();

    if (error) {
      return { data: null, error: new Error(error.message) };
    }

    return { data, error: null };
  } catch (err) {
    console.error('Error fetching quote:', err);
    return { data: null, error: err as Error };
  }
};

export const createQuote = async (
  quote: Omit<Quote, 'id' | 'created_at'>,
  lineItems: Omit<QuoteLineItem, 'id' | 'quote_id'>[]
): Promise<{ data: QuoteWithRelations | null; error: Error | null }> => {
  try {
    // Create quote
    const { data: newQuote, error: quoteError } = await supabase
      .from('quotes')
      .insert([quote])
      .select(`
        *,
        customer:customers(*),
        lead:leads(id, title)
      `)
      .single();

    if (quoteError) {
      return { data: null, error: new Error(quoteError.message) };
    }

    // Create line items
    if (lineItems.length > 0) {
      const lineItemsToInsert = lineItems.map(item => ({
        ...item,
        quote_id: newQuote.id
      }));

      const { error: lineItemsError } = await supabase
        .from('quote_line_items')
        .insert(lineItemsToInsert);

      if (lineItemsError) {
        // Rollback quote creation
        await supabase.from('quotes').delete().eq('id', newQuote.id);
        return { data: null, error: new Error(lineItemsError.message) };
      }
    }

    // Fetch complete quote data
    const result = await getQuote(newQuote.id);
    return result;
  } catch (err) {
    console.error('Error creating quote:', err);
    return { data: null, error: err as Error };
  }
};

export const updateQuote = async (
  id: string,
  updates: Partial<Quote>,
  lineItems?: QuoteLineItem[]
): Promise<{ data: QuoteWithRelations | null; error: Error | null }> => {
  try {
    // Update quote
    const { data, error } = await supabase
      .from('quotes')
      .update(updates)
      .eq('id', id)
      .select(`
        *,
        customer:customers(*),
        lead:leads(id, title),
        quote_line_items(*),
        order:orders(id, title, status)
      `)
      .single();

    if (error) {
      return { data: null, error: new Error(error.message) };
    }

    // Update line items if provided
    if (lineItems) {
      // Delete existing line items
      await supabase
        .from('quote_line_items')
        .delete()
        .eq('quote_id', id);

      // Insert new line items
      if (lineItems.length > 0) {
        const lineItemsToInsert = lineItems.map(item => ({
          ...item,
          quote_id: id
        }));

        const { error: lineItemsError } = await supabase
          .from('quote_line_items')
          .insert(lineItemsToInsert);

        if (lineItemsError) {
          return { data: null, error: new Error(lineItemsError.message) };
        }
      }
    }

    return { data, error: null };
  } catch (err) {
    console.error('Error updating quote:', err);
    return { data: null, error: err as Error };
  }
};

export const deleteQuote = async (id: string): Promise<{ error: Error | null }> => {
  try {
    const { error } = await supabase
      .from('quotes')
      .delete()
      .eq('id', id);

    if (error) {
      return { error: new Error(error.message) };
    }

    return { error: null };
  } catch (err) {
    console.error('Error deleting quote:', err);
    return { error: err as Error };
  }
};

export const sendQuoteEmail = async (
  quoteId: string,
  emailData: QuoteEmailData
): Promise<{ data: any | null; error: Error | null }> => {
  try {
    // Generate acceptance token if including acceptance link
    let acceptanceToken = null;
    if (emailData.include_acceptance_link) {
      const tokenResult = await generateAcceptanceToken(quoteId, 30);
      if (tokenResult.error) {
        return { data: null, error: tokenResult.error };
      }
      acceptanceToken = tokenResult.data;
    }

    // Update quote status to sent
    const { error: updateError } = await supabase
      .from('quotes')
      .update({ 
        status: 'sent',
        ...(acceptanceToken && { acceptance_token: acceptanceToken })
      })
      .eq('id', quoteId);

    if (updateError) {
      return { data: null, error: new Error(updateError.message) };
    }

    // TODO: Integrate with actual email service
    // For now, simulate email sending
    await new Promise(resolve => setTimeout(resolve, 1000));

    return { 
      data: { 
        success: true, 
        acceptance_token: acceptanceToken,
        acceptance_url: acceptanceToken ? `${window.location.origin}/quote-accept/${acceptanceToken}` : null
      }, 
      error: null 
    };
  } catch (err) {
    console.error('Error sending quote email:', err);
    return { data: null, error: err as Error };
  }
};

// Generate quote email template with ROT information
export const generateQuoteEmailTemplate = (
  quote: QuoteWithRelations,
  includeAcceptanceLink: boolean = true
): { subject: string; body: string } => {
  const customerName = quote.customer?.name || 'Kund';
  const quoteNumber = quote.quote_number || 'N/A';
  const amount = quote.total_amount;
  const rotAmount = quote.rot_amount || 0;
  const netAmount = amount - rotAmount;
  const companyName = 'Momentum CRM';

  const subject = `Offert ${quoteNumber} från ${companyName}`;

  let body = `Hej ${customerName}!

Tack för ditt intresse för våra tjänster. Bifogat finner du vår offert för ${quote.title}.

Offertdetaljer:
- Offertnummer: ${quoteNumber}
- Totalt belopp: ${new Intl.NumberFormat('sv-SE', { style: 'currency', currency: 'SEK' }).format(amount)}`;

  if (quote.include_rot && rotAmount > 0) {
    body += `
- ROT-avdrag: ${new Intl.NumberFormat('sv-SE', { style: 'currency', currency: 'SEK' }).format(rotAmount)}
- Att betala efter ROT: ${new Intl.NumberFormat('sv-SE', { style: 'currency', currency: 'SEK' }).format(netAmount)}

ROT-information:
Denna offert är berättigad till ROT-avdrag. Som privatperson kan du få skatteavdrag för 50% av arbetskostnaden, upp till 50 000 kr per person och år. ROT-avdraget dras av direkt från fakturan.`;
  }

  if (includeAcceptanceLink) {
    body += `

För att godkänna denna offert, klicka på länken nedan:
[Länk kommer att genereras automatiskt]

Offerten är giltig till ${quote.valid_until ? new Date(quote.valid_until).toLocaleDateString('sv-SE') : 'enligt överenskommelse'}.`;
  }

  body += `

Vid frågor om offerten, tveka inte att kontakta oss.

Med vänliga hälsningar,
${companyName}`;

  return { subject, body };
};

// Utility functions
export const getQuoteStats = async (
  organisationId: string,
  dateFrom?: string,
  dateTo?: string
): Promise<{
  data: {
    totalQuotes: number;
    totalValue: number;
    averageValue: number;
    statusBreakdown: Record<string, number>;
    rotQuotes: number;
    totalROTAmount: number;
  } | null;
  error: Error | null;
}> => {
  try {
    let query = supabase
      .from('quotes')
      .select('*')
      .eq('organisation_id', organisationId);

    if (dateFrom) {
      query = query.gte('created_at', dateFrom);
    }

    if (dateTo) {
      query = query.lte('created_at', dateTo);
    }

    const { data, error } = await query;

    if (error) {
      return { data: null, error: new Error(error.message) };
    }

    const quotes = data || [];
    const totalQuotes = quotes.length;
    const totalValue = quotes.reduce((sum, quote) => sum + quote.total_amount, 0);
    const averageValue = totalQuotes > 0 ? totalValue / totalQuotes : 0;

    const statusBreakdown = quotes.reduce((acc, quote) => {
      acc[quote.status] = (acc[quote.status] || 0) + 1;
      return acc;
    }, {} as Record<string, number>);

    const rotQuotes = quotes.filter(quote => quote.include_rot && quote.rot_amount > 0).length;
    const totalROTAmount = quotes.reduce((sum, quote) => sum + (quote.rot_amount || 0), 0);

    return {
      data: {
        totalQuotes,
        totalValue,
        averageValue,
        statusBreakdown,
        rotQuotes,
        totalROTAmount
      },
      error: null
    };
  } catch (err) {
    console.error('Error fetching quote stats:', err);
    return { data: null, error: err as Error };
  }
};