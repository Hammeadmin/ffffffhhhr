import { supabase } from './supabase';

export interface QuoteTemplate {
  id: string;
  organisation_id: string;
  name: string;
  description?: string | null;
  content_structure: ContentBlock[];
  default_line_items?: QuoteLineItemTemplate[]; // Keep for backward compatibility
  settings: {
    default_vat_rate?: number;
    default_payment_terms?: number;
    notes?: string;
  };
  sort_order?: number;
  created_at?: string | null;
}

export interface ContentBlock {
  id: string;
  type: 'header' | 'text_block' | 'line_items_table' | 'footer';
  content: any;
}

export interface QuoteLineItemTemplate {
  name: string;
  description: string;
  quantity: number;
  unit_price: number;
  unit: 'st' | 'kvm' | 'tim' | 'löpm' | 'kg' | 'liter' | 'meter';
  category?: string;
}

export interface ProductLibraryItem {
  id: string;
  organisation_id: string;
  name: string;
  description: string;
  unit_price: number;
  unit: 'st' | 'kvm' | 'tim' | 'löpm' | 'kg' | 'liter' | 'meter';
  category?: string | null;
  created_at?: string | null;
}

export interface ProductFilters {
  category?: string;
  search?: string;
}

// Quote Templates operations
export const getQuoteTemplates = async (
  organisationId: string
): Promise<{ data: QuoteTemplate[] | null; error: Error | null }> => {
  try {
    const { data, error } = await supabase
      .from('quote_templates')
      .select('*')
      .eq('organisation_id', organisationId)
      .order('sort_order', { ascending: true })
      .order('created_at', { ascending: true });

    if (error) {
      return { data: null, error: new Error(error.message) };
    }

    // Ensure content_structure exists and migrate if needed
    const processedData = (data || []).map(template => {
      if (!template.content_structure || template.content_structure.length === 0) {
        // Migrate from default_line_items if needed
        if (template.default_line_items && template.default_line_items.length > 0) {
          template.content_structure = [
            { id: '1', type: 'header', content: template.name },
            { id: '2', type: 'text_block', content: template.description || 'Beskrivning av offerten' },
            { id: '3', type: 'line_items_table', content: template.default_line_items },
            { id: '4', type: 'footer', content: 'Tack för förtroendet! Vi ser fram emot att arbeta med er.' }
          ];
        } else {
          template.content_structure = [];
        }
      }
      return template;
    });

    return { data: processedData, error: null };
  } catch (err) {
    console.error('Error fetching quote templates:', err);
    return { data: null, error: err as Error };
  }
};

export const updateQuoteTemplateOrder = async (
  templateId: string,
  newSortOrder: number
): Promise<{ error: Error | null }> => {
  try {
    const { error } = await supabase
      .from('quote_templates')
      .update({ sort_order: newSortOrder })
      .eq('id', templateId);

    if (error) {
      return { error: new Error(error.message) };
    }

    return { error: null };
  } catch (err) {
    console.error('Error updating template order:', err);
    return { error: err as Error };
  }
};

export const reorderQuoteTemplates = async (
  organisationId: string,
  templateIds: string[]
): Promise<{ error: Error | null }> => {
  try {
    // Update sort_order for each template based on its position in the array
    const updates = templateIds.map((templateId, index) => 
      supabase
        .from('quote_templates')
        .update({ sort_order: index })
        .eq('id', templateId)
        .eq('organisation_id', organisationId)
    );

    const results = await Promise.all(updates);
    
    // Check if any updates failed
    const errors = results.filter(result => result.error);
    if (errors.length > 0) {
      return { error: new Error(`Failed to update ${errors.length} templates`) };
    }

    return { error: null };
  } catch (err) {
    console.error('Error reordering templates:', err);
    return { error: err as Error };
  }
};

export const createQuoteTemplate = async (
  template: Omit<QuoteTemplate, 'id' | 'created_at'>
): Promise<{ data: QuoteTemplate | null; error: Error | null }> => {
  try {
    // Get the next sort_order value
    const { data: maxOrderData } = await supabase
      .from('quote_templates')
      .select('sort_order')
      .eq('organisation_id', template.organisation_id)
      .order('sort_order', { ascending: false })
      .limit(1)
      .single();

    const nextSortOrder = (maxOrderData?.sort_order || 0) + 1;

    const { data, error } = await supabase
      .from('quote_templates')
      .insert([{ ...template, sort_order: nextSortOrder }])
      .select()
      .single();

    if (error) {
      return { data: null, error: new Error(error.message) };
    }

    return { data, error: null };
  } catch (err) {
    console.error('Error creating quote template:', err);
    return { data: null, error: err as Error };
  }
};

export const updateQuoteTemplate = async (
  id: string,
  updates: Partial<QuoteTemplate>
): Promise<{ data: QuoteTemplate | null; error: Error | null }> => {
  try {
    const { data, error } = await supabase
      .from('quote_templates')
      .update(updates)
      .eq('id', id)
      .select()
      .single();

    if (error) {
      return { data: null, error: new Error(error.message) };
    }

    return { data, error: null };
  } catch (err) {
    console.error('Error updating quote template:', err);
    return { data: null, error: err as Error };
  }
};

export const deleteQuoteTemplate = async (id: string): Promise<{ error: Error | null }> => {
  try {
    const { error } = await supabase
      .from('quote_templates')
      .delete()
      .eq('id', id);

    if (error) {
      return { error: new Error(error.message) };
    }

    return { error: null };
  } catch (err) {
    console.error('Error deleting quote template:', err);
    return { error: err as Error };
  }
};

// Product Library operations (using quote_line_items table)
export const getProductLibrary = async (
  organisationId: string,
  filters: ProductFilters = {}
): Promise<{ data: ProductLibraryItem[] | null; error: Error | null }> => {
  try {
    let query = supabase
      .from('quote_line_items')
      .select('id, organisation_id, name, description, unit_price, unit, category, created_at')
      .eq('organisation_id', organisationId)
      .eq('is_library_item', true);

    if (filters.category && filters.category !== 'all') {
      query = query.eq('category', filters.category);
    }

    if (filters.search) {
      query = query.or(`name.ilike.%${filters.search}%,description.ilike.%${filters.search}%`);
    }

    const { data, error } = await query.order('name');

    if (error) {
      return { data: null, error: new Error(error.message) };
    }

    return { data: data || [], error: null };
  } catch (err) {
    console.error('Error fetching product library:', err);
    return { data: null, error: err as Error };
  }
};

export const createProductLibraryItem = async (
  item: Omit<ProductLibraryItem, 'id' | 'created_at'>
): Promise<{ data: ProductLibraryItem | null; error: Error | null }> => {
  try {
    const { data, error } = await supabase
      .from('quote_line_items')
      .insert([{
        organisation_id: item.organisation_id,
        name: item.name,
        description: item.description,
        unit_price: item.unit_price,
        unit: item.unit,
        category: item.category,
        is_library_item: true,
        quantity: 1, // Default for library items
        total: item.unit_price, // Default for library items
        sort_order: 0 // Default for library items
      }])
      .select('id, organisation_id, name, description, unit_price, unit, category, created_at')
      .single();

    if (error) {
      return { data: null, error: new Error(error.message) };
    }

    return { data, error: null };
  } catch (err) {
    console.error('Error creating product library item:', err);
    return { data: null, error: err as Error };
  }
};

export const updateProductLibraryItem = async (
  id: string,
  updates: Partial<Omit<ProductLibraryItem, 'id' | 'created_at'>>
): Promise<{ data: ProductLibraryItem | null; error: Error | null }> => {
  try {
    const { data, error } = await supabase
      .from('quote_line_items')
      .update(updates)
      .eq('id', id)
      .eq('is_library_item', true)
      .select('id, organisation_id, name, description, unit_price, unit, category, created_at')
      .single();

    if (error) {
      return { data: null, error: new Error(error.message) };
    }

    return { data, error: null };
  } catch (err) {
    console.error('Error updating product library item:', err);
    return { data: null, error: err as Error };
  }
};

export const deleteProductLibraryItem = async (id: string): Promise<{ error: Error | null }> => {
  try {
    const { error } = await supabase
      .from('quote_line_items')
      .delete()
      .eq('id', id)
      .eq('is_library_item', true);

    if (error) {
      return { error: new Error(error.message) };
    }

    return { error: null };
  } catch (err) {
    console.error('Error deleting product library item:', err);
    return { error: err as Error };
  }
};

// Utility functions
export const getProductCategories = async (
  organisationId: string
): Promise<{ data: string[] | null; error: Error | null }> => {
  try {
    const { data, error } = await supabase
      .from('quote_line_items')
      .select('category')
      .eq('organisation_id', organisationId)
      .eq('is_library_item', true)
      .not('category', 'is', null);

    if (error) {
      return { data: null, error: new Error(error.message) };
    }

    const categories = Array.from(new Set(data?.map(item => item.category).filter(Boolean))) as string[];
    return { data: categories, error: null };
  } catch (err) {
    console.error('Error fetching product categories:', err);
    return { data: null, error: err as Error };
  }
};

export const createDefaultTemplates = async (
  organisationId: string
): Promise<{ error: Error | null }> => {
  try {
    const defaultTemplates: Omit<QuoteTemplate, 'id' | 'created_at' | 'sort_order'>[] = [
      {
        organisation_id: organisationId,
        name: 'Taktvätt - Standard',
        description: 'Standardmall för taktvätt med vanliga tjänster',
        content_structure: [
          { id: '1', type: 'header', content: 'Offert för Taktvätt' },
          { id: '2', type: 'text_block', content: 'Vi erbjuder professionell taktvätt med miljövänliga metoder och garanterat resultat.' },
          { 
            id: '3', 
            type: 'line_items_table', 
            content: [
              {
                name: 'Taktvätt',
                description: 'Grundlig rengöring av takyta',
                quantity: 1,
                unit_price: 150,
                unit: 'kvm',
                category: 'Taktvätt'
              },
              {
                name: 'Mossbehandling',
                description: 'Behandling mot mossa och alger',
                quantity: 1,
                unit_price: 50,
                unit: 'kvm',
                category: 'Taktvätt'
              },
              {
                name: 'Takrännerengöring',
                description: 'Rengöring av takrännor och stuprör',
                quantity: 1,
                unit_price: 800,
                unit: 'st',
                category: 'Taktvätt'
              }
            ]
          },
          { id: '4', type: 'footer', content: 'Alla priser inkluderar material och arbetskostnad. Garanti på utfört arbete enligt våra standardvillkor.' }
        ],
        settings: {
          default_vat_rate: 25,
          default_payment_terms: 30,
          notes: 'Pris inkluderar material och arbetskostnad. Garanti på utfört arbete enligt våra standardvillkor.'
        }
      },
      {
        organisation_id: organisationId,
        name: 'Fasadtvätt - Standard',
        description: 'Standardmall för fasadtvätt',
        content_structure: [
          { id: '1', type: 'header', content: 'Offert för Fasadtvätt' },
          { id: '2', type: 'text_block', content: 'Professionell fasadrengöring som återställer fasadens ursprungliga utseende.' },
          { 
            id: '3', 
            type: 'line_items_table', 
            content: [
              {
                name: 'Fasadtvätt',
                description: 'Professionell fasadrengöring',
                quantity: 1,
                unit_price: 80,
                unit: 'kvm',
                category: 'Fasadtvätt'
              },
              {
                name: 'Högtryckstvätt',
                description: 'Högtryckstvätt av fasadytor',
                quantity: 1,
                unit_price: 120,
                unit: 'kvm',
                category: 'Fasadtvätt'
              }
            ]
          },
          { id: '4', type: 'footer', content: 'Vi använder miljövänliga rengöringsmedel och garanterar ett professionellt resultat.' }
        ],
        settings: {
          default_vat_rate: 25,
          default_payment_terms: 30
        }
      },
      {
        organisation_id: organisationId,
        name: 'Fönsterputsning - Standard',
        description: 'Standardmall för fönsterputsning',
        content_structure: [
          { id: '1', type: 'header', content: 'Offert för Fönsterputsning' },
          { id: '2', type: 'text_block', content: 'Kristallklara fönster med vår professionella fönsterputsning.' },
          { 
            id: '3', 
            type: 'line_items_table', 
            content: [
              {
                name: 'Fönsterputsning',
                description: 'Professionell fönsterputsning in- och utsida',
                quantity: 1,
                unit_price: 25,
                unit: 'kvm',
                category: 'Fönsterputsning'
              },
              {
                name: 'Karmrengöring',
                description: 'Rengöring av fönsterkarmar',
                quantity: 1,
                unit_price: 15,
                unit: 'löpm',
                category: 'Fönsterputsning'
              }
            ]
          },
          { id: '4', type: 'footer', content: 'Regelbunden fönsterputsning förbättrar både utseende och ljusinsläpp.' }
        ],
        settings: {
          default_vat_rate: 25,
          default_payment_terms: 30
        }
      }
    ];

    for (const template of defaultTemplates) {
      await createQuoteTemplate(template);
    }

    return { error: null };
  } catch (err) {
    console.error('Error creating default templates:', err);
    return { error: err as Error };
  }
};

// Helper function to extract line items from content structure
export const extractLineItemsFromTemplate = (template: QuoteTemplate): QuoteLineItemTemplate[] => {
  const lineItemsBlocks = template.content_structure.filter(block => block.type === 'line_items_table');
  const allLineItems: QuoteLineItemTemplate[] = [];
  
  lineItemsBlocks.forEach(block => {
    if (Array.isArray(block.content)) {
      allLineItems.push(...block.content);
    }
  });
  
  return allLineItems;
};

// Helper function to calculate template total from content structure
export const calculateTemplateTotal = (template: QuoteTemplate): number => {
  const lineItems = extractLineItemsFromTemplate(template);
  return lineItems.reduce((sum, item) => sum + (item.quantity * item.unit_price), 0);
};

export const createDefaultProductLibrary = async (
  organisationId: string
): Promise<{ error: Error | null }> => {
  try {
    const defaultProducts: Omit<ProductLibraryItem, 'id' | 'created_at'>[] = [
      // Taktvätt
      {
        organisation_id: organisationId,
        name: 'Taktvätt',
        description: 'Grundlig rengöring av takyta med professionell utrustning',
        unit_price: 150,
        unit: 'kvm',
        category: 'Taktvätt'
      },
      {
        organisation_id: organisationId,
        name: 'Mossbehandling',
        description: 'Behandling mot mossa och alger på takyta',
        unit_price: 50,
        unit: 'kvm',
        category: 'Taktvätt'
      },
      {
        organisation_id: organisationId,
        name: 'Takrännerengöring',
        description: 'Rengöring av takrännor och stuprör',
        unit_price: 800,
        unit: 'st',
        category: 'Taktvätt'
      },
      // Fasadtvätt
      {
        organisation_id: organisationId,
        name: 'Fasadtvätt',
        description: 'Professionell fasadrengöring med miljövänliga medel',
        unit_price: 80,
        unit: 'kvm',
        category: 'Fasadtvätt'
      },
      {
        organisation_id: organisationId,
        name: 'Högtryckstvätt',
        description: 'Högtryckstvätt av fasadytor och betongstrukturer',
        unit_price: 120,
        unit: 'kvm',
        category: 'Fasadtvätt'
      },
      // Fönsterputsning
      {
        organisation_id: organisationId,
        name: 'Fönsterputsning',
        description: 'Professionell fönsterputsning in- och utsida',
        unit_price: 25,
        unit: 'kvm',
        category: 'Fönsterputsning'
      },
      {
        organisation_id: organisationId,
        name: 'Karmrengöring',
        description: 'Rengöring av fönsterkarmar och trösklar',
        unit_price: 15,
        unit: 'löpm',
        category: 'Fönsterputsning'
      },
      // Allmänt
      {
        organisation_id: organisationId,
        name: 'Arbetstid',
        description: 'Allmän arbetstid för diverse uppdrag',
        unit_price: 650,
        unit: 'tim',
        category: 'Allmänt'
      },
      {
        organisation_id: organisationId,
        name: 'Materialhantering',
        description: 'Hantering och transport av material',
        unit_price: 200,
        unit: 'st',
        category: 'Allmänt'
      }
    ];

    for (const product of defaultProducts) {
      await createProductLibraryItem(product);
    }

    return { error: null };
  } catch (err) {
    console.error('Error creating default product library:', err);
    return { error: err as Error };
  }
};

// Unit labels for Swedish
export const UNIT_LABELS = {
  st: 'st',
  kvm: 'kvm',
  tim: 'tim',
  löpm: 'löpm',
  kg: 'kg',
  liter: 'liter',
  meter: 'meter'
};

export const UNIT_DESCRIPTIONS = {
  st: 'Styck',
  kvm: 'Kvadratmeter',
  tim: 'Timmar',
  löpm: 'Löpmeter',
  kg: 'Kilogram',
  liter: 'Liter',
  meter: 'Meter'
};