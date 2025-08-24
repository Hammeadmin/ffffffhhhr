import { supabase } from './supabase';

export interface ROTData {
  include_rot: boolean;
  rot_personnummer?: string | null;
  rot_organisationsnummer?: string | null;
  rot_fastighetsbeteckning?: string | null;
  rot_amount?: number | null;
}

export interface ROTFormData {
  type: 'person' | 'company';
  identifier: string;
  fastighetsbeteckning: string;
}

export interface QuoteAcceptanceData {
  token: string;
  rot_data: ROTFormData;
  client_ip?: string;
}

// ROT validation functions
export const validateSwedishPersonnummer = (personnummer: string): boolean => {
  if (!personnummer) return false;
  
  // Remove any non-digit characters except hyphen
  const cleaned = personnummer.replace(/[^0-9-]/g, '');
  
  // Check format: YYYYMMDD-XXXX or YYMMDD-XXXX
  const formats = [
    /^[0-9]{8}-[0-9]{4}$/, // YYYYMMDD-XXXX
    /^[0-9]{6}-[0-9]{4}$/  // YYMMDD-XXXX
  ];
  
  if (!formats.some(format => format.test(cleaned))) {
    return false;
  }
  
  // Basic length validation
  const digitsOnly = cleaned.replace('-', '');
  return digitsOnly.length === 10 || digitsOnly.length === 12;
};

export const validateSwedishOrganisationsnummer = (orgnummer: string): boolean => {
  if (!orgnummer) return false;
  
  // Remove any non-digit characters except hyphen
  const cleaned = orgnummer.replace(/[^0-9-]/g, '');
  
  // Check format: XXXXXX-XXXX
  if (!/^[0-9]{6}-[0-9]{4}$/.test(cleaned)) {
    return false;
  }
  
  // Basic validation (in real implementation, you'd use Luhn algorithm)
  const digitsOnly = cleaned.replace('-', '');
  return digitsOnly.length === 10;
};

export const formatSwedishPersonnummer = (personnummer: string): string => {
  const cleaned = personnummer.replace(/[^0-9]/g, '');
  
  if (cleaned.length === 10) {
    return `${cleaned.slice(0, 6)}-${cleaned.slice(6)}`;
  } else if (cleaned.length === 12) {
    return `${cleaned.slice(0, 8)}-${cleaned.slice(8)}`;
  }
  
  return personnummer;
};

export const formatSwedishOrganisationsnummer = (orgnummer: string): string => {
  const cleaned = orgnummer.replace(/[^0-9]/g, '');
  
  if (cleaned.length === 10) {
    return `${cleaned.slice(0, 6)}-${cleaned.slice(6)}`;
  }
  
  return orgnummer;
};

// ROT calculation functions
export const calculateROTAmount = (
  totalAmount: number,
  laborPercentage: number = 0.7,
  rotPercentage: number = 0.5,
  maxROTPerPerson: number = 50000
): number => {
  const laborCost = totalAmount * laborPercentage;
  const rotDeduction = laborCost * rotPercentage;
  
  return Math.min(rotDeduction, maxROTPerPerson);
};

export const calculateNetAmountAfterROT = (totalAmount: number, rotAmount: number): number => {
  return totalAmount - rotAmount;
};

// Quote acceptance functions
export const generateAcceptanceToken = async (quoteId: string, expiresInDays: number = 30): Promise<{
  data: string | null;
  error: Error | null;
}> => {
  try {
    const { data, error } = await supabase.rpc('set_quote_acceptance_token', {
      quote_id: quoteId,
      expires_in_days: expiresInDays
    });

    if (error) {
      return { data: null, error: new Error(error.message) };
    }

    return { data, error: null };
  } catch (err) {
    console.error('Error generating acceptance token:', err);
    return { data: null, error: err as Error };
  }
};

export const getQuoteByToken = async (token: string): Promise<{
  data: any | null;
  error: Error | null;
}> => {
  try {
    const { data, error } = await supabase
      .from('quotes')
      .select(`
        *,
        customer:customers(*),
        organisation:organisations(*),
        quote_line_items(*)
      `)
      .eq('acceptance_token', token)
      .gt('token_expires_at', new Date().toISOString())
      .eq('status', 'sent')
      .single();

    if (error) {
      return { data: null, error: new Error(error.message) };
    }

    return { data, error: null };
  } catch (err) {
    console.error('Error fetching quote by token:', err);
    return { data: null, error: err as Error };
  }
};

export const acceptQuoteWithROT = async (acceptanceData: QuoteAcceptanceData): Promise<{
  data: any | null;
  error: Error | null;
}> => {
  try {
    const { data, error } = await supabase.rpc('accept_quote_with_rot', {
      token: acceptanceData.token,
      rot_type: acceptanceData.rot_data.type,
      rot_identifier: acceptanceData.rot_data.identifier,
      fastighetsbeteckning: acceptanceData.rot_data.fastighetsbeteckning,
      client_ip: acceptanceData.client_ip
    });

    if (error) {
      return { data: null, error: new Error(error.message) };
    }

    return { data, error: null };
  } catch (err) {
    console.error('Error accepting quote:', err);
    return { data: null, error: err as Error };
  }
};

// ROT reporting functions
export const getROTReport = async (
  organisationId: string,
  taxYear?: number
): Promise<{
  data: any[] | null;
  error: Error | null;
}> => {
  try {
    let query = supabase
      .from('rot_report')
      .select('*')
      .eq('organisation_id', organisationId);

    if (taxYear) {
      query = query.eq('tax_year', taxYear);
    }

    const { data, error } = await query.order('created_at', { ascending: false });

    if (error) {
      return { data: null, error: new Error(error.message) };
    }

    return { data: data || [], error: null };
  } catch (err) {
    console.error('Error fetching ROT report:', err);
    return { data: null, error: err as Error };
  }
};

export const getROTSummary = async (
  organisationId: string,
  taxYear?: number
): Promise<{
  data: {
    totalROTAmount: number;
    totalInvoices: number;
    averageROTPerInvoice: number;
    rotByCustomerType: {
      privatpersoner: number;
      företag: number;
    };
  } | null;
  error: Error | null;
}> => {
  try {
    let query = supabase
      .from('rot_report')
      .select('*')
      .eq('organisation_id', organisationId);

    if (taxYear) {
      query = query.eq('tax_year', taxYear);
    }

    const { data, error } = await query;

    if (error) {
      return { data: null, error: new Error(error.message) };
    }

    const reports = data || [];
    const totalROTAmount = reports.reduce((sum, report) => sum + (report.rot_amount || 0), 0);
    const totalInvoices = reports.length;
    const averageROTPerInvoice = totalInvoices > 0 ? totalROTAmount / totalInvoices : 0;

    const rotByCustomerType = reports.reduce(
      (acc, report) => {
        if (report.rot_personnummer) {
          acc.privatpersoner += report.rot_amount || 0;
        } else if (report.rot_organisationsnummer) {
          acc.företag += report.rot_amount || 0;
        }
        return acc;
      },
      { privatpersoner: 0, företag: 0 }
    );

    return {
      data: {
        totalROTAmount,
        totalInvoices,
        averageROTPerInvoice,
        rotByCustomerType
      },
      error: null
    };
  } catch (err) {
    console.error('Error fetching ROT summary:', err);
    return { data: null, error: err as Error };
  }
};

// Utility functions
export const getROTExplanationText = (): string => {
  return `ROT-avdrag är ett skatteavdrag för reparation, ombyggnad och tillbyggnad av bostäder. 
Som privatperson kan du få avdrag för 50% av arbetskostnaden, upp till maximalt 50 000 kr per person och år. 
För att få ROT-avdrag krävs att arbetet utförs på din permanenta bostad eller fritidsbostad i Sverige.`;
};

export const getROTEmailText = (): string => {
  return `Denna offert är berättigad till ROT-avdrag. Som privatperson kan du få skatteavdrag för 50% av arbetskostnaden, 
upp till 50 000 kr per person och år. När du godkänner offerten kommer du att kunna ange dina ROT-uppgifter.`;
};

export const isROTEligible = (serviceType: string): boolean => {
  // ROT-eligible services (simplified list)
  const rotEligibleServices = [
    'taktvätt',
    'fasadtvätt',
    'fönsterputsning',
    'målning',
    'reparation',
    'underhåll'
  ];
  
  return rotEligibleServices.some(service => 
    serviceType.toLowerCase().includes(service)
  );
};

export const formatROTAmount = (amount: number): string => {
  return new Intl.NumberFormat('sv-SE', {
    style: 'currency',
    currency: 'SEK',
    minimumFractionDigits: 0,
    maximumFractionDigits: 0
  }).format(amount);
};