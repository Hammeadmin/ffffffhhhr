import React, { useState, useEffect } from 'react';
import { 
  Plus, 
  Search, 
  Filter, 
  Edit, 
  Eye, 
  Trash2, 
  Copy, 
  Send, 
  CheckCircle, 
  XCircle,
  FileText,
  Calendar,
  DollarSign,
  User,
  Building,
  RefreshCw,
  AlertCircle,
  X,
  Minus,
  Download,
  Mail,
  Briefcase,
  Printer,
  FileDown,
  Sparkles,
  Package
} from 'lucide-react';
import { 
  getQuotes, 
  getCustomers, 
  getLeads,
  createQuote, 
  updateQuote, 
  deleteQuote,
  duplicateQuote,
  convertQuoteToJob,
  getQuoteById,
  formatCurrency,
  formatDate 
} from '../lib/database';
import { getQuoteTemplates, type QuoteTemplate } from '../lib/quoteTemplates';
import type { Quote, Customer, Lead, QuoteStatus, QuoteLineItem } from '../types/database';
import { QUOTE_STATUS_LABELS, getQuoteStatusColor } from '../types/database';
import { useAuth } from '../contexts/AuthContext';
import ProductLibraryModal from './ProductLibraryModal';
import QuoteTemplateSelector from './QuoteTemplateSelector';
import { supabase } from '../lib/supabase';
import { useParams } from 'react-router-dom'; // Add this
import { getOrder } from '../lib/orders'; // Import your existing function
import { useLocation } from 'react-router-dom';
import ROTFields from '../components/ROTFields';
import ROTInformation from '../components/ROTInformation';
import { generateAcceptanceToken } from '../lib/rot';

// Fixed demo organization ID
const DEMO_ORG_ID = '550e8400-e29b-41d4-a716-446655440000';

interface QuoteWithRelations extends Quote {
  customer?: Customer;
  lead?: Lead;
  line_items?: QuoteLineItem[];
}

interface QuoteFormData {
  customer_id: string;
  lead_id: string;
  title: string;
  description: string;
  valid_until: string;
  line_items: {
    description: string;
    quantity: number;
    unit_price: number;
  }[];
  include_rot: boolean;
  rot_personnummer: string | null;
  rot_organisationsnummer: string | null;
  rot_fastighetsbeteckning: string | null;
  rot_amount: number;
}

function QuoteManagement() {
  const { user } = useAuth();
  const [quotes, setQuotes] = useState<QuoteWithRelations[]>([]);
  const [customers, setCustomers] = useState<Customer[]>([]);
  const [leads, setLeads] = useState<Lead[]>([]);
  const [templates, setTemplates] = useState<QuoteTemplate[]>([]);
  const [selectedTemplate, setSelectedTemplate] = useState<QuoteTemplate | null>(null);
  const [companyInfo, setCompanyInfo] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [showDetailModal, setShowDetailModal] = useState(false);
  const [showProductLibrary, setShowProductLibrary] = useState(false);
  const [selectedQuote, setSelectedQuote] = useState<QuoteWithRelations | null>(null);
  const [editingQuote, setEditingQuote] = useState<QuoteWithRelations | null>(null);
  const location = useLocation();
  const { orderId } = useParams();
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');
  const [dateFrom, setDateFrom] = useState('');
  const [dateTo, setDateTo] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isPrintMode, setIsPrintMode] = useState(false);
  const [quoteForm, setQuoteForm] = useState<QuoteFormData>({
    customer_id: '',
    lead_id: '',
    title: '',
    description: '',
    valid_until: '',
    line_items: [{ description: '', quantity: 1, unit_price: 0 }],
    include_rot: false,
    rot_personnummer: null,
    rot_organisationsnummer: null,
    rot_fastighetsbeteckning: null,
    rot_amount: 0
  });

   useEffect(() => {
    // Check if we navigated here with an order object in the state
    const orderToQuote = location.state?.orderToQuote;

    if (orderToQuote) {
      // Pre-populate the form state with the data from the navigation state
      setQuoteForm(prevForm => ({
        ...prevForm,
        customer_id: orderToQuote.customer_id,
        lead_id: orderToQuote.lead_id || '',
        title: `Offert för: ${orderToQuote.title}`,
        description: orderToQuote.description || '',
        // Important: also link the order_id to the quote itself
        order_id: orderToQuote.id 
      }));

      // Automatically open the creation modal
      setShowCreateModal(true);

      // Clear the state so it doesn't re-trigger on refresh
      window.history.replaceState({}, document.title)
    }
  }, [location.state]); // This dependency array ensures the code runs when navigation state is present

  useEffect(() => {
    loadData();
  }, [statusFilter, searchTerm, dateFrom, dateTo]);

  const loadData = async () => {
    try {
      setLoading(true);
      setError(null);
      
      const filters = {
        status: statusFilter,
        search: searchTerm,
        dateFrom: dateFrom || undefined,
        dateTo: dateTo || undefined
      };

      const [quotesResult, customersResult, leadsResult, templatesResult] = await Promise.all([
        getQuotes(DEMO_ORG_ID, filters),
        getCustomers(DEMO_ORG_ID),
        getLeads(DEMO_ORG_ID),
        getQuoteTemplates(DEMO_ORG_ID)
      ]);
      
      if (quotesResult.error) {
        setError(quotesResult.error.message);
        return;
      }
      
      if (customersResult.error) {
        setError(customersResult.error.message);
        return;
      }
      
      if (leadsResult.error) {
        setError(leadsResult.error.message);
        return;
      }

      // Load templates for quote creation
      if (templatesResult.error) {
        setError(templatesResult.error.message);
        return;
      }

      setTemplates(templatesResult.data || []);
      
      setQuotes(quotesResult.data || []);
      setCustomers(customersResult.data || []);
      setLeads(leadsResult.data || []);

      // Load company info for template preview
      const { data: orgData } = await supabase
        .from('organisations')
        .select('*')
        .eq('id', DEMO_ORG_ID)
        .single();
      setCompanyInfo(orgData);
    } catch (err) {
      console.error('Error loading data:', err);
      setError('Ett oväntat fel inträffade vid hämtning av data.');
    } finally {
      setLoading(false);
    }
  };

  const handleGenerateTestToken = async (quoteId: string) => {
    const { data: token, error } = await generateAcceptanceToken(quoteId);

    if (error) {
        alert('Could not generate token: ' + error.message);
        return;
    }

    if (token) {
        const url = `${window.location.origin}/quote-accept/${token}`;
        // Using prompt makes it easy to copy the URL
        prompt("Here is your test URL. Open it in a new tab:", url);
    } else {
        alert('Failed to generate a token for an unknown reason.');
    }
};

  const handleCreateQuote = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!quoteForm.customer_id || !quoteForm.title) {
      setError('Kund och titel är obligatoriska fält.');
      return;
    }

    try {
      setIsSubmitting(true);
      setError(null);

      const quoteData = {
        organisation_id: DEMO_ORG_ID,
        customer_id: quoteForm.customer_id,
        lead_id: quoteForm.lead_id || null,
        title: quoteForm.title,
        description: quoteForm.description || null,
        status: 'draft' as QuoteStatus,
        valid_until: quoteForm.valid_until || null,
        total_amount: 0, // Will be calculated by the database function
            include_rot: quoteForm.include_rot,
    rot_personnummer: quoteForm.rot_personnummer,
    rot_organisationsnummer: quoteForm.rot_organisationsnummer,
    rot_fastighetsbeteckning: quoteForm.rot_fastighetsbeteckning,
    rot_amount: quoteForm.rot_amount
      };

      const lineItems = quoteForm.line_items.filter(item => 
        item.description.trim() && item.quantity > 0 && item.unit_price >= 0
      );

      const result = await createQuote(quoteData, lineItems);
      
      if (result.error) {
        setError(result.error.message);
        return;
      }

      // Reset form and close modal
      setQuoteForm({
        customer_id: '',
        lead_id: '',
        title: '',
        description: '',
        valid_until: '',
        line_items: [{ description: '', quantity: 1, unit_price: 0 }]
      });
      setSelectedTemplate(null);
      setShowCreateModal(false);
      
      // Reload data
      await loadData();
    } catch (err) {
      console.error('Error creating quote:', err);
      setError('Kunde inte skapa offert.');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleUpdateQuote = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!editingQuote || !quoteForm.customer_id || !quoteForm.title) {
      setError('Kund och titel är obligatoriska fält.');
      return;
    }

    try {
      setIsSubmitting(true);
      setError(null);

      const updates = {
        customer_id: quoteForm.customer_id,
        lead_id: quoteForm.lead_id || null,
        title: quoteForm.title,
        description: quoteForm.description || null,
        valid_until: quoteForm.valid_until || null,
            include_rot: quoteForm.include_rot,
    rot_personnummer: quoteForm.rot_personnummer,
    rot_organisationsnummer: quoteForm.rot_organisationsnummer,
    rot_fastighetsbeteckning: quoteForm.rot_fastighetsbeteckning,
    rot_amount: quoteForm.rot_amount
      };

      const lineItems = quoteForm.line_items.filter(item => 
        item.description.trim() && item.quantity > 0 && item.unit_price >= 0
      );

      const result = await updateQuote(editingQuote.id, updates, lineItems);
      
      if (result.error) {
        setError(result.error.message);
        return;
      }

      // Reset form and close modal
      setEditingQuote(null);
      setQuoteForm({
        customer_id: '',
        lead_id: '',
        title: '',
        description: '',
        valid_until: '',
        line_items: [{ description: '', quantity: 1, unit_price: 0 }]
      });
      setSelectedTemplate(null);
      setShowCreateModal(false);
      
      // Reload data
      await loadData();
      await handleViewQuote(editingQuote);
    } catch (err) {
      console.error('Error updating quote:', err);
      setError('Kunde inte uppdatera offert.');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleDeleteQuote = async (quoteId: string) => {
    if (!confirm('Är du säker på att du vill ta bort denna offert?')) return;
    
    try {
      const result = await deleteQuote(quoteId);
      
      if (result.error) {
        setError(result.error.message);
        return;
      }
      
      await loadData();
    } catch (err) {
      console.error('Error deleting quote:', err);
      setError('Kunde inte ta bort offert.');
    }
  };

  const handleDuplicateQuote = async (quoteId: string) => {
    try {
      const result = await duplicateQuote(quoteId);
      
      if (result.error) {
        setError(result.error.message);
        return;
      }
      
      await loadData();
    } catch (err) {
      console.error('Error duplicating quote:', err);
      setError('Kunde inte kopiera offert.');
    }
  };

  const handleConvertToJob = async (quoteId: string) => {
    if (!confirm('Konvertera denna offert till ett jobb?')) return;
    
    try {
      const result = await convertQuoteToJob(quoteId);
      
      if (result.error) {
        setError(result.error.message);
        return;
      }
      
      alert('Offert konverterad till jobb!');
      await loadData();
    } catch (err) {
      console.error('Error converting to job:', err);
      setError('Kunde inte konvertera offert till jobb.');
    }
  };

  const handleViewQuote = async (quote: QuoteWithRelations) => {
    try {
      // Fetch full quote details including line items
      const result = await getQuoteById(quote.id);
      
      if (result.error) {
        setError(result.error.message);
        return;
      }
      
      setSelectedQuote(result.data);
      setShowDetailModal(true);
    } catch (err) {
      console.error('Error fetching quote details:', err);
      setError('Kunde inte hämta offertdetaljer.');
    }
  };

  const handleEditQuote = async (quote: QuoteWithRelations) => {
    try {
      // Fetch full quote details including line items
      const result = await getQuoteById(quote.id);
      
      if (result.error) {
        setError(result.error.message);
        return;
      }
      
      const fullQuote = result.data!;
      
      setEditingQuote(fullQuote);
      setQuoteForm({
        customer_id: fullQuote.customer_id || '',
        lead_id: fullQuote.lead_id || '',
        title: fullQuote.title,
        description: fullQuote.description || '',
        valid_until: fullQuote.valid_until || '',
        line_items: fullQuote.line_items && fullQuote.line_items.length > 0 
          ? fullQuote.line_items.map(item => ({
              description: item.description,
              quantity: item.quantity,
              unit_price: item.unit_price
            }))
          : [{ description: '', quantity: 1, unit_price: 0 }],
        include_rot: fullQuote.include_rot || false,
    rot_personnummer: fullQuote.rot_personnummer || null,
    rot_organisationsnummer: fullQuote.rot_organisationsnummer || null,
    rot_fastighetsbeteckning: fullQuote.rot_fastighetsbeteckning || null,
    rot_amount: fullQuote.rot_amount || 0
      });
      setSelectedTemplate(null);
      setShowCreateModal(true);
    } catch (err) {
      console.error('Error preparing quote for edit:', err);
      setError('Kunde inte förbereda offert för redigering.');
    }
  };

  const handleStatusChange = async (quoteId: string, newStatus: QuoteStatus) => {
    try {
      const result = await updateQuote(quoteId, { status: newStatus });
      
      if (result.error) {
        setError(result.error.message);
        return;
      }
      
      await loadData();
    } catch (err) {
      console.error('Error updating quote status:', err);
      setError('Kunde inte uppdatera offertstatus.');
    }
  };

  const handleTemplateSelect = (template: QuoteTemplate) => {
    setSelectedTemplate(template);
    
    // Convert template line items to quote line items
    const templateLineItems = template.default_line_items.map((item, index) => ({
      quote_id: '',
      description: item.description,
      quantity: item.quantity,
      unit_price: item.unit_price,
      total: item.quantity * item.unit_price,
      sort_order: index,
      created_at: new Date().toISOString()
    }));

    // Calculate totals
    const subtotal = templateLineItems.reduce((sum, item) => sum + item.total, 0);
    const vatRate = (template.settings.default_vat_rate || 25) / 100;
    const vatAmount = subtotal * vatRate;
    const total = subtotal + vatAmount;

    // Update form data with template values
    setQuoteForm(prev => ({
      ...prev,
      title: template.name,
      description: template.description || '',
      line_items: templateLineItems,
      subtotal,
      vat_amount: vatAmount,
      total_amount: total,
      // Set valid until date based on template or default 30 days
      valid_until: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString().split('T')[0]
    }));
  };

  const handleAddFromLibrary = (products: Array<any>) => {
    const newLineItems = products.map(product => ({
      description: product.description,
      quantity: product.quantity,
      unit_price: product.unit_price,
      total: product.quantity * product.unit_price,
      sort_order: (quoteForm.line_items?.length || 0) + 1,
      name: product.name,
      unit: product.unit,
      category: product.category
    }));

    setQuoteForm(prev => ({
      ...prev,
      line_items: [...(prev.line_items || []), ...newLineItems],
      total_amount: (prev.total_amount || 0) + newLineItems.reduce((sum, item) => sum + item.total, 0)
    }));

    setShowProductLibrary(false);
  };

  const handleSelectTemplate = (template: any) => {
    // Extract line items from template content structure
    const lineItemsBlocks = template.content_structure.filter((block: any) => block.type === 'line_items_table');
    const allLineItems: any[] = [];
    
    lineItemsBlocks.forEach((block: any) => {
      if (Array.isArray(block.content)) {
        allLineItems.push(...block.content);
      }
    });

    const templateLineItems = allLineItems.map((item, index) => ({
      description: item.description,
      quantity: item.quantity,
      unit_price: item.unit_price,
      total: item.quantity * item.unit_price,
      sort_order: index + 1,
      name: item.name,
      unit: item.unit,
      category: item.category
    }));

    const totalAmount = templateLineItems.reduce((sum, item) => sum + item.total, 0);

    setQuoteForm(prev => ({
      ...prev,
      title: template.name,
      description: template.description || '',
      line_items: templateLineItems,
      total_amount: totalAmount
    }));
  };

  const addLineItem = () => {
    setQuoteForm(prev => ({
      ...prev,
      line_items: [...prev.line_items, { description: '', quantity: 1, unit_price: 0 }]
    }));
  };

  const removeLineItem = (index: number) => {
    if (quoteForm.line_items.length > 1) {
      setQuoteForm(prev => ({
        ...prev,
        line_items: prev.line_items.filter((_, i) => i !== index)
      }));
    }
  };

  const updateLineItem = (index: number, field: string, value: any) => {
    setQuoteForm(prev => ({
      ...prev,
      line_items: prev.line_items.map((item, i) => 
        i === index ? { ...item, [field]: value } : item
      )
    }));
  };

  const calculateSubtotal = () => {
    return quoteForm.line_items.reduce((sum, item) => 
      sum + (item.quantity * item.unit_price), 0
    );
  };

  const calculateVAT = () => {
    return calculateSubtotal() * 0.25;
  };

  const calculateTotal = () => {
    return calculateSubtotal() + calculateVAT();
  };

  const handlePrintQuote = () => {
    setIsPrintMode(true);
    setTimeout(() => {
      window.print();
      setIsPrintMode(false);
    }, 100);
  };

  const handleExportPDF = () => {
    // For now, use browser print to PDF functionality
    // In a real implementation, you'd use a PDF library like jsPDF or react-pdf
    handlePrintQuote();
  };

  const resetForm = () => {
    setQuoteForm({
      customer_id: '',
      lead_id: '',
      title: '',
      description: '',
      valid_until: '',
      line_items: [{ description: '', quantity: 1, unit_price: 0 }],
      include_rot: false,
        rot_personnummer: null,
        rot_organisationsnummer: null,
        rot_fastighetsbeteckning: null,
        rot_amount: 0
    });
    setEditingQuote(null);
    setSelectedTemplate(null);
    setError(null);
  };

  if (loading) {
    return (
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <h1 className="text-3xl font-bold text-gray-900">Offerter</h1>
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
        </div>
        <div className="bg-white shadow rounded-lg p-6">
          <div className="animate-pulse space-y-4">
            {[1, 2, 3, 4, 5].map(i => (
              <div key={i} className="h-16 bg-gray-200 rounded"></div>
            ))}
          </div>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <h1 className="text-3xl font-bold text-gray-900">Offerter</h1>
        </div>
        <div className="bg-red-50 border border-red-200 rounded-lg p-6">
          <div className="flex items-center">
            <AlertCircle className="w-10 h-10 text-red-600 mr-4" />
            <div className="flex-1">
              <h3 className="text-lg font-semibold text-red-900">Kunde inte ladda offerter</h3>
              <p className="text-red-700 mt-1">{error}</p>
            </div>
            <button 
              onClick={loadData}
              className="ml-4 inline-flex items-center px-4 py-2 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-red-600 hover:bg-red-700"
            >
              <RefreshCw className="w-4 h-4 mr-2" />
              Försök igen
            </button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">Offerter</h1>
          <p className="mt-2 text-gray-600">
            Hantera offerter och prisförslag ({quotes.length} totalt)
          </p>
        </div>
        <div className="mt-4 sm:mt-0 flex items-center space-x-3">
          <button
            onClick={loadData}
            className="inline-flex items-center px-3 py-2 border border-gray-300 rounded-md shadow-sm text-sm font-medium text-gray-700 bg-white hover:bg-gray-50"
          >
            <RefreshCw className="w-4 h-4 mr-2" />
            Uppdatera
          </button>
          <button
            onClick={() => {
              resetForm();
              setShowCreateModal(true);
            }}
            className="inline-flex items-center px-4 py-2 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-blue-600 hover:bg-blue-700"
          >
            <Plus className="w-4 h-4 mr-2" />
            Skapa Offert
          </button>
        </div>
      </div>

      {/* Filters */}
      <div className="bg-white p-4 rounded-lg shadow-sm border">
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          <div>
            <div className="relative">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-4 h-4" />
              <input
                type="text"
                placeholder="Sök offerter..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pl-10 pr-4 py-2 w-full border border-gray-300 rounded-md focus:ring-blue-500 focus:border-blue-500"
              />
            </div>
          </div>
          <div>
            <select
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-blue-500 focus:border-blue-500"
            >
              <option value="all">Alla</option>
              <option value="draft">Utkast</option>
              <option value="sent">Skickade</option>
              <option value="accepted">Accepterade</option>
              <option value="declined">Avvisade</option>
            </select>
          </div>
          <div>
            <input
              type="date"
              value={dateFrom}
              onChange={(e) => setDateFrom(e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-blue-500 focus:border-blue-500"
              placeholder="Från datum"
            />
          </div>
          <div>
            <input
              type="date"
              value={dateTo}
              onChange={(e) => setDateTo(e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-blue-500 focus:border-blue-500"
              placeholder="Till datum"
            />
          </div>
        </div>
      </div>

      {/* Quotes Table */}
      <div className="bg-white shadow rounded-lg overflow-hidden">
        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-gray-200">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Offertnummer
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Kund
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Titel
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Belopp
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Status
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Giltig till
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Åtgärder
                </th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              {quotes.length === 0 ? (
                <tr>
                  <td colSpan={7} className="px-6 py-12 text-center">
                    <FileText className="mx-auto h-16 w-16 text-gray-400" />
                    <h3 className="mt-4 text-lg font-medium text-gray-900">Inga offerter ännu</h3>
                    <p className="mt-2 text-gray-500">Skapa din första offert för att komma igång.</p>
                    <div className="mt-6">
                      <button
                        onClick={() => {
                          resetForm();
                          setShowCreateModal(true);
                        }}
                        className="inline-flex items-center px-4 py-2 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-blue-600 hover:bg-blue-700"
                      >
                        <Plus className="w-4 h-4 mr-2" />
                        Skapa Offert
                      </button>
                    </div>
                  </td>
                </tr>
              ) : (
                quotes.map((quote) => (
                  <tr key={quote.id} className="hover:bg-gray-50">
                    <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">
                      {quote.quote_number || 'Genereras...'}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                      {quote.customer?.name || 'Okänd kund'}
                    </td>
                    <td className="px-6 py-4 text-sm text-gray-900">
                      <div className="max-w-xs truncate">{quote.title}</div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                      {formatCurrency(quote.total_amount)}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <span className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full ${getQuoteStatusColor(quote.status)}`}>
                        {QUOTE_STATUS_LABELS[quote.status]}
                      </span>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                      {quote.valid_until ? formatDate(quote.valid_until) : '-'}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm font-medium">
                      <div className="flex items-center space-x-2">
                        <button
                          onClick={() => handleViewQuote(quote)}
                          className="text-blue-600 hover:text-blue-900"
                          title="Visa"
                        >
                          <Eye className="w-4 h-4" />
                        </button>
                        <button
                          onClick={() => handleEditQuote(quote)}
                          className="text-gray-600 hover:text-gray-900"
                          title="Redigera"
                        >
                          <Edit className="w-4 h-4" />
                        </button>
                        <button
                          onClick={() => handleDuplicateQuote(quote.id)}
                          className="text-green-600 hover:text-green-900"
                          title="Kopiera"
                        >
                          <Copy className="w-4 h-4" />
                        </button>
                        {quote.status === 'draft' && (
                          <button
                            onClick={() => handleStatusChange(quote.id, 'sent')}
                            className="text-blue-600 hover:text-blue-900"
                            title="Skicka"
                          >
                            <Send className="w-4 h-4" />
                          </button>
                        )}
                        {quote.status === 'sent' && (
                          <>
                            <button
                              onClick={() => handleStatusChange(quote.id, 'accepted')}
                              className="text-green-600 hover:text-green-900"
                              title="Markera som accepterad"
                            >
                              <CheckCircle className="w-4 h-4" />
                            </button>
                            <button
                              onClick={() => handleStatusChange(quote.id, 'declined')}
                              className="text-red-600 hover:text-red-900"
                              title="Markera som avvisad"
                            >
                              <XCircle className="w-4 h-4" />
                            </button>
                          </>
                        )}
                        {/* ADD THIS BUTTON for 'sent' quotes */}
        {quote.status === 'sent' && (
            <button
                onClick={(e) => {
                    e.stopPropagation();
                    handleGenerateTestToken(quote.id);
                }}
                className="text-yellow-500 hover:text-yellow-700"
                title="Generate Test Token"
            >
                <Sparkles className="w-4 h-4" />
            </button>
        )}
                        {quote.status === 'accepted' && (
                          <button
                            onClick={() => handleConvertToJob(quote.id)}
                            className="text-purple-600 hover:text-purple-900"
                            title="Konvertera till jobb"
                          >
                            <Briefcase className="w-4 h-4" />
                          </button>
                        )}
                        <button
                          onClick={() => handleDeleteQuote(quote.id)}
                          className="text-red-600 hover:text-red-900"
                          title="Ta bort"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Create/Edit Quote Modal */}
      {showCreateModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-[60]">
          <div className="bg-white rounded-lg max-w-4xl w-full max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between p-6 border-b">
              <h3 className="text-lg font-semibold text-gray-900">
                {editingQuote ? 'Redigera Offert' : 'Skapa Offert'}
              </h3>
              <button
                onClick={() => {
                  setShowCreateModal(false);
                  resetForm();
                }}
                className="text-gray-400 hover:text-gray-600"
              >
                <X className="w-5 h-5" />
              </button>
            </div>
            
            <form onSubmit={editingQuote ? handleUpdateQuote : handleCreateQuote} className="p-6 space-y-6">
              {/* Template Selector - Only show when creating new quote */}
              {!editingQuote && templates.length > 0 && (
                <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
                  <QuoteTemplateSelector
                    organisationId={DEMO_ORG_ID}
                    onSelectTemplate={handleTemplateSelect}
                    onSelectPartial={(template, selectedItems) => {
                      // Handle partial template selection
                      const selectedLineItems = selectedItems.map(index => {
                        const item = template.default_line_items[index];
                        return {
                          quote_id: '',
                          description: item.description,
                          quantity: item.quantity,
                          unit_price: item.unit_price,
                          total: item.quantity * item.unit_price,
                          sort_order: index,
                          created_at: new Date().toISOString()
                        };
                      });

                      const subtotal = selectedLineItems.reduce((sum, item) => sum + item.total, 0);
                      const vatRate = (template.settings.default_vat_rate || 25) / 100;
                      const vatAmount = subtotal * vatRate;
                      const total = subtotal + vatAmount;

                      setQuoteForm(prev => ({
                        ...prev,
                        line_items: [...prev.line_items, ...selectedLineItems],
                        subtotal: prev.subtotal + subtotal,
                        vat_amount: prev.vat_amount + vatAmount,
                        total_amount: prev.total_amount + total
                      }));
                    }}
                    companyInfo={companyInfo}
                  />
                </div>
              )}

              {/* Basic Information */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Kund *
                  </label>
                  <select
                    required
                    value={quoteForm.customer_id}
                    onChange={(e) => setQuoteForm(prev => ({ ...prev, customer_id: e.target.value }))}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-blue-500 focus:border-blue-500"
                  >
                    <option value="">Välj kund</option>
                    {customers.map((customer) => (
                      <option key={customer.id} value={customer.id}>
                        {customer.name}
                      </option>
                    ))}
                  </select>
                </div>
                
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Relaterad Lead (valfritt)
                  </label>
                  <select
                    value={quoteForm.lead_id}
                    onChange={(e) => setQuoteForm(prev => ({ ...prev, lead_id: e.target.value }))}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-blue-500 focus:border-blue-500"
                  >
                    <option value="">Ingen lead</option>
                    {leads.filter(lead => !quoteForm.customer_id || lead.customer_id === quoteForm.customer_id).map((lead) => (
                      <option key={lead.id} value={lead.id}>
                        {lead.title}
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Titel *
                  </label>
                  <input
                    type="text"
                    required
                    value={quoteForm.title}
                    onChange={(e) => setQuoteForm(prev => ({ ...prev, title: e.target.value }))}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-blue-500 focus:border-blue-500"
                    placeholder="Offertens titel"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Giltig till
                  </label>
                  <input
                    type="date"
                    value={quoteForm.valid_until}
                    onChange={(e) => setQuoteForm(prev => ({ ...prev, valid_until: e.target.value }))}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-blue-500 focus:border-blue-500"
                  />
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Beskrivning
                </label>
                <textarea
                  value={quoteForm.description}
                  onChange={(e) => setQuoteForm(prev => ({ ...prev, description: e.target.value }))}
                  rows={3}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-blue-500 focus:border-blue-500"
                  placeholder="Beskrivning av offerten..."
                />
              </div>

              {/* Line Items */}
              <div>
                <div className="flex items-center justify-between mb-4">
                  <h4 className="text-lg font-medium text-gray-900">Radposter</h4>
                  <div className="flex items-center space-x-2">
                    <button
                      onClick={() => setShowProductLibrary(true)}
                      type="button"
                      className="inline-flex items-center px-3 py-2 border border-blue-300 rounded-md shadow-sm text-sm font-medium text-blue-700 bg-blue-50 hover:bg-blue-100"
                    >
                      <Package className="w-4 h-4 mr-2" />
                      Lägg till från bibliotek
                    </button>
                    <button
                      onClick={addLineItem}
                      type="button"
                      className="inline-flex items-center px-3 py-2 border border-gray-300 rounded-md shadow-sm text-sm font-medium text-gray-700 bg-white hover:bg-gray-50"
                    >
                      <Plus className="w-4 h-4 mr-2" />
                      Lägg till artikel
                    </button>
                  </div>
                </div>

                {/* ROT/RUT DEDUCTION SECTION */}
<div className="border-t border-gray-200 pt-6">
          <ROTFields
              data={{
                  include_rot: quoteForm.include_rot,
                  rot_personnummer: quoteForm.rot_personnummer,
                  rot_organisationsnummer: quoteForm.rot_organisationsnummer,
                  rot_fastighetsbeteckning: quoteForm.rot_fastighetsbeteckning,
                  rot_amount: quoteForm.rot_amount,
              }}
              onChange={(rotData) =>
                  setQuoteForm(prev => ({ ...prev, ...rotData }))
              }
              totalAmount={calculateTotal()} // Ensure this function calculates the total before ROT
          />
</div>

                {/* Template Selector */}
                {DEMO_ORG_ID && (
                  <QuoteTemplateSelector
                    organisationId={DEMO_ORG_ID}
                    onSelectTemplate={handleSelectTemplate}
                    companyInfo={companyInfo}
                    className="mb-4"
                  />
                )}

                <div className="space-y-3">
                  {quoteForm.line_items.map((item, index) => (
                    <div key={index} className="grid grid-cols-12 gap-3 items-end">
                      <div className="col-span-5">
                        <label className="block text-xs font-medium text-gray-700 mb-1">
                          Beskrivning
                        </label>
                        <input
                          type="text"
                          value={item.description}
                          onChange={(e) => updateLineItem(index, 'description', e.target.value)}
                          className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-blue-500 focus:border-blue-500 text-sm"
                          placeholder="Beskrivning av tjänst/produkt"
                        />
                      </div>
                      <div className="col-span-2">
                        <label className="block text-xs font-medium text-gray-700 mb-1">
                          Antal
                        </label>
                        <input
                          type="number"
                          min="0"
                          step="0.01"
                          value={item.quantity}
                          onChange={(e) => updateLineItem(index, 'quantity', parseFloat(e.target.value) || 0)}
                          className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-blue-500 focus:border-blue-500 text-sm"
                        />
                      </div>
                      <div className="col-span-2">
                        <label className="block text-xs font-medium text-gray-700 mb-1">
                          Enhetspris
                        </label>
                        <input
                          type="number"
                          min="0"
                          step="0.01"
                          value={item.unit_price}
                          onChange={(e) => updateLineItem(index, 'unit_price', parseFloat(e.target.value) || 0)}
                          className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-blue-500 focus:border-blue-500 text-sm"
                        />
                      </div>
                      <div className="col-span-2">
                        <label className="block text-xs font-medium text-gray-700 mb-1">
                          Totalt
                        </label>
                        <div className="px-3 py-2 bg-gray-50 border border-gray-300 rounded-md text-sm text-gray-900">
                          {formatCurrency(item.quantity * item.unit_price)}
                        </div>
                      </div>
                      <div className="col-span-1">
                        <button
                          type="button"
                          onClick={() => removeLineItem(index)}
                          disabled={quoteForm.line_items.length === 1}
                          className="p-2 text-red-600 hover:text-red-900 disabled:text-gray-400 disabled:cursor-not-allowed"
                        >
                          <Minus className="w-4 h-4" />
                        </button>
                      </div>
                    </div>
                  ))}
                </div>

                {/* Totals */}
                <div className="mt-6 bg-gray-50 p-4 rounded-lg">
                  <div className="space-y-2">
                    <div className="flex justify-between text-sm">
                      <span>Subtotal:</span>
                      <span>{formatCurrency(calculateSubtotal())}</span>
                    </div>
                    <div className="flex justify-between text-sm">
                      <span>Moms (25%):</span>
                      <span>{formatCurrency(calculateVAT())}</span>
                    </div>
                    <div className="flex justify-between text-lg font-semibold border-t pt-2">
                      <span>Totalt:</span>
                      <span>{formatCurrency(calculateTotal())}</span>
                    </div>
                  </div>
                </div>
              </div>

              {error && (
                <div className="flex items-center space-x-2 text-red-600 bg-red-50 p-3 rounded-lg">
                  <AlertCircle className="h-5 w-5 flex-shrink-0" />
                  <span className="text-sm">{error}</span>
                </div>
              )}

              <div className="flex justify-end space-x-3 pt-4">
                <button
                  type="button"
                  onClick={() => {
                    setShowCreateModal(false);
                    resetForm();
                  }}
                  className="px-4 py-2 border border-gray-300 rounded-md text-sm font-medium text-gray-700 bg-white hover:bg-gray-50"
                >
                  Avbryt
                </button>
                <button
                  type="submit"
                  disabled={isSubmitting}
                  className="px-4 py-2 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-blue-600 hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {isSubmitting ? (
                    <div className="flex items-center">
                      <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
                      {editingQuote ? 'Uppdaterar...' : 'Skapar...'}
                    </div>
                  ) : (
                    editingQuote ? 'Uppdatera Offert' : 'Skapa Offert'
                  )}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Product Library Modal */}
      {showProductLibrary && DEMO_ORG_ID && (
        <ProductLibraryModal
          isOpen={showProductLibrary}
          onClose={() => setShowProductLibrary(false)}
          onSelectProducts={handleAddFromLibrary}
          organisationId={DEMO_ORG_ID}
          multiSelect={true}
        />
      )}

      {/* Quote Detail Modal */}
      {showDetailModal && selectedQuote && (
        <div className={`fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50 ${isPrintMode ? 'print:bg-white print:relative print:p-0' : ''}`}>
          <div className={`bg-white rounded-lg max-w-5xl w-full max-h-[90vh] overflow-y-auto ${isPrintMode ? 'print:max-w-none print:max-h-none print:overflow-visible print:rounded-none print:shadow-none' : ''}`}>
            <div className="flex items-center justify-between p-6 border-b">
              <h3 className="text-lg font-semibold text-gray-900">Offertdetaljer</h3>
              <div className="flex items-center space-x-2">
                <button
                  onClick={handleExportPDF}
                  className="inline-flex items-center px-3 py-1 border border-gray-300 rounded-md text-sm font-medium text-gray-700 bg-white hover:bg-gray-50 print:hidden"
                >
                  <FileDown className="w-4 h-4 mr-1" />
                  Exportera PDF
                </button>
                <button
                  onClick={handlePrintQuote}
                  className="inline-flex items-center px-3 py-1 border border-gray-300 rounded-md text-sm font-medium text-gray-700 bg-white hover:bg-gray-50 print:hidden"
                >
                  <Printer className="w-4 h-4 mr-1" />
                  Skriv ut
                </button>
                <button
                onClick={() => {
                  setShowDetailModal(false);
                  setSelectedQuote(null);
                }}
                  className="text-gray-400 hover:text-gray-600 print:hidden"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>
            </div>
            
            <div className={`p-6 ${isPrintMode ? 'print:p-8' : ''}`}>
              {/* Company Header */}
              <div className="mb-8 pb-6 border-b-2 border-gray-200">
                <div className="flex items-start justify-between">
                  <div>
                    <div className="flex items-center mb-4">
                      <div className="w-16 h-16 bg-blue-600 rounded-lg flex items-center justify-center mr-4">
                        <Building className="w-8 h-8 text-white" />
                      </div>
                      <div>
                        <h1 className="text-2xl font-bold text-gray-900">Momentum CRM</h1>
                        <p className="text-gray-600">Professionella CRM-lösningar</p>
                      </div>
                    </div>
                    <div className="text-sm text-gray-600">
                      <p>Företagsgatan 123</p>
                      <p>123 45 Stockholm</p>
                      <p>Tel: +46 8 123 456 78</p>
                      <p>E-post: info@momentum.se</p>
                      <p>Org.nr: 556123-4567</p>
                    </div>
                  </div>
                  <div className="text-right">
                    <h2 className="text-3xl font-bold text-blue-600 mb-2">OFFERT</h2>
                    <div className="text-lg font-semibold text-gray-900 mb-1">
                      {selectedQuote.quote_number}
                    </div>
                    <div className="text-sm text-gray-600">
                      Datum: {selectedQuote.created_at ? formatDate(selectedQuote.created_at) : 'Okänt'}
                    </div>
                    {selectedQuote.valid_until && (
                      <div className="text-sm text-gray-600">
                        Giltig till: {formatDate(selectedQuote.valid_until)}
                      </div>
                    )}
                    <div className="mt-2">
                      <span className={`inline-flex px-3 py-1 text-sm font-semibold rounded-full ${getQuoteStatusColor(selectedQuote.status)} print:border print:border-gray-400`}>
                        {QUOTE_STATUS_LABELS[selectedQuote.status]}
                      </span>
                    </div>
                  </div>
                </div>
              </div>

              {/* Quote Title and Description */}
              <div className="mb-8">
                <h3 className="text-xl font-bold text-gray-900 mb-2">{selectedQuote.title}</h3>
                {selectedQuote.description && (
                  <p className="text-gray-700 leading-relaxed">{selectedQuote.description}</p>
                )}
              </div>

              {/* Customer and Quote Information */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-8 mb-8">
                <div>
                  <h4 className="font-bold text-gray-900 mb-3 text-lg border-b border-gray-200 pb-1">Kund</h4>
                  <div className="space-y-2">
                    <div className="font-semibold text-gray-900">
                      {selectedQuote.customer?.name || 'Okänd kund'}
                    </div>
                    {selectedQuote.customer?.email && (
                      <div className="text-gray-700">{selectedQuote.customer.email}</div>
                    )}
                    {selectedQuote.customer?.phone_number && (
                      <div className="text-gray-700">{selectedQuote.customer.phone_number}</div>
                    )}
                    {selectedQuote.customer?.address && (
                      <div className="text-gray-700">
                        <div>{selectedQuote.customer.address}</div>
                        {selectedQuote.customer.postal_code && selectedQuote.customer.city && (
                          <div>{selectedQuote.customer.postal_code} {selectedQuote.customer.city}</div>
                        )}
                      </div>
                    )}
                  </div>
                </div>
                
                <div>
                  <h4 className="font-bold text-gray-900 mb-3 text-lg border-b border-gray-200 pb-1">Offertinformation</h4>
                  <div className="space-y-2 text-gray-700">
                    <div>
                      <span className="font-medium">Offertnummer:</span> {selectedQuote.quote_number}
                    </div>
                    <div>
                      <span className="font-medium">Datum:</span> {selectedQuote.created_at ? formatDate(selectedQuote.created_at) : 'Okänt'}
                    </div>
                    {selectedQuote.valid_until && (
                      <div>
                        <span className="font-medium">Giltig till:</span> {formatDate(selectedQuote.valid_until)}
                      </div>
                    )}
                    {selectedQuote.lead && (
                      <div>
                        <span className="font-medium">Relaterad lead:</span> {selectedQuote.lead.title}
                      </div>
                    )}
                  </div>
                </div>
              </div>

              {/* Line Items */}
              {selectedQuote.line_items && selectedQuote.line_items.length > 0 && (
                <div className="mb-8">
                  <h4 className="font-bold text-gray-900 mb-4 text-lg border-b border-gray-200 pb-1">Specifikation</h4>
                  <div className="overflow-x-auto">
                    <table className="min-w-full border border-gray-300">
                      <thead className="bg-gray-50">
                        <tr>
                          <th className="px-4 py-3 text-left text-sm font-bold text-gray-900 border-b border-gray-300">
                            Beskrivning
                          </th>
                          <th className="px-4 py-3 text-center text-sm font-bold text-gray-900 border-b border-gray-300">
                            Antal
                          </th>
                          <th className="px-4 py-3 text-right text-sm font-bold text-gray-900 border-b border-gray-300">
                            Enhetspris
                          </th>
                          <th className="px-4 py-3 text-right text-sm font-bold text-gray-900 border-b border-gray-300">
                            Totalt
                          </th>
                        </tr>
                      </thead>
                      <tbody className="bg-white">
                        {selectedQuote.line_items.map((item, index) => (
                          <tr key={item.id} className={index % 2 === 0 ? 'bg-white' : 'bg-gray-50'}>
                            <td className="px-4 py-3 text-sm text-gray-900 border-b border-gray-200">
                              {item.description}
                            </td>
                            <td className="px-4 py-3 text-sm text-gray-900 text-center border-b border-gray-200">
                              {item.quantity}
                            </td>
                            <td className="px-4 py-3 text-sm text-gray-900 text-right border-b border-gray-200">
                              {formatCurrency(item.unit_price)}
                            </td>
                            <td className="px-4 py-3 text-sm text-gray-900 text-right border-b border-gray-200 font-medium">
                              {formatCurrency(item.total)}
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>
              )}

              {/* Totals */}
              <div className="mb-8">
                <div className="flex justify-end">
                  <div className="w-80">
                    <div className="bg-gray-50 border border-gray-300 p-6 rounded-lg">
                      <div className="space-y-3">
                        <div className="flex justify-between text-sm">
                          <span className="font-medium">Subtotal:</span>
                          <span>{formatCurrency(selectedQuote.subtotal || 0)}</span>
                        </div>
                        <div className="flex justify-between text-sm">
                          <span className="font-medium">Moms (25%):</span>
                          <span>{formatCurrency(selectedQuote.vat_amount || 0)}</span>
                        </div>
                        <div className="flex justify-between text-lg font-bold border-t border-gray-300 pt-3">
                          <span>Totalt att betala:</span>
                          <span className="text-blue-600">{formatCurrency(selectedQuote.total_amount)}</span>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              </div>

              {/* ROT INFORMATION DISPLAY */}
{selectedQuote && selectedQuote.include_rot && (
    <div className="mb-8">
        <ROTInformation
            data={selectedQuote}
            totalAmount={selectedQuote.total_amount}
        />
    </div>
)}

              {/* Terms and Conditions */}
              <div className="mb-8">
                <h4 className="font-bold text-gray-900 mb-4 text-lg border-b border-gray-200 pb-1">Villkor</h4>
                <div className="text-sm text-gray-700 space-y-2 leading-relaxed">
                  <p><strong>Betalningsvillkor:</strong> Betalning ska ske inom 30 dagar från fakturadatum. Vid försenad betalning debiteras dröjsmålsränta enligt räntelagen.</p>
                  <p><strong>Leverans:</strong> Leverans sker enligt överenskommelse. Eventuella förseningar ska meddelas omgående.</p>
                  <p><strong>Garanti:</strong> Vi lämnar 12 månaders garanti på utfört arbete från leveransdatum.</p>
                  <p><strong>Force Majeure:</strong> Vi ansvarar inte för förseningar eller skador orsakade av omständigheter utanför vår kontroll.</p>
                  <p><strong>Giltighetstid:</strong> Denna offert är giltig i 30 dagar från utfärdandedatum om inget annat anges.</p>
                  <p><strong>Ändringar:</strong> Eventuella ändringar av beställningen kan medföra prisändringar och ska bekräftas skriftligt.</p>
                </div>
              </div>

              {/* Digital Signature Area */}
              <div className="mb-8 border-t-2 border-gray-200 pt-8">
                <h4 className="font-bold text-gray-900 mb-6 text-lg">Godkännande</h4>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                  <div>
                    <div className="text-center">
                      <div className="border-b-2 border-gray-300 mb-2 pb-8">
                        {/* Signature area */}
                      </div>
                      <div className="text-sm text-gray-700">
                        <p className="font-medium">Kund</p>
                        <p>Namn: _________________________</p>
                        <p>Datum: _________________________</p>
                      </div>
                    </div>
                  </div>
                  <div>
                    <div className="text-center">
                      <div className="border-b-2 border-gray-300 mb-2 pb-8">
                        {/* Signature area */}
                      </div>
                      <div className="text-sm text-gray-700">
                        <p className="font-medium">Momentum CRM</p>
                        <p>Namn: _________________________</p>
                        <p>Datum: _________________________</p>
                      </div>
                    </div>
                  </div>
                </div>
                <div className="mt-6 text-center text-sm text-gray-600">
                  <p>Genom att underteckna denna offert godkänner kunden ovanstående villkor och priser.</p>
                </div>
              </div>

              {/* Footer */}
              <div className="text-center text-xs text-gray-500 border-t border-gray-200 pt-4">
                <p>Momentum CRM AB | Org.nr: 556123-4567 | info@momentum.se | +46 8 123 456 78</p>
                <p>Företagsgatan 123, 123 45 Stockholm | www.momentum.se</p>
              </div>
            </div>
            
            <div className="border-t border-gray-200 px-6 py-4 print:hidden">
              <div className="flex justify-between items-center">
                <div className="flex items-center space-x-3">
                  <button
                    onClick={handleExportPDF}
                    className="inline-flex items-center px-4 py-2 border border-gray-300 rounded-md shadow-sm text-sm font-medium text-gray-700 bg-white hover:bg-gray-50"
                  >
                    <FileDown className="w-4 h-4 mr-2" />
                    Exportera PDF
                  </button>
                  <button
                    onClick={handlePrintQuote}
                    className="inline-flex items-center px-4 py-2 border border-gray-300 rounded-md shadow-sm text-sm font-medium text-gray-700 bg-white hover:bg-gray-50"
                  >
                    <Printer className="w-4 h-4 mr-2" />
                    Skriv ut
                  </button>
                </div>
                
                <div className="flex space-x-3">
                  <button
                    onClick={() => {
                      setShowDetailModal(false);
                      setSelectedQuote(null);
                    }}
                    className="px-4 py-2 border border-gray-300 rounded-md text-sm font-medium text-gray-700 bg-white hover:bg-gray-50"
                  >
                    Stäng
                  </button>
                  <button
                    onClick={() => handleEditQuote(selectedQuote)}
                    className="inline-flex items-center px-4 py-2 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-blue-600 hover:bg-blue-700"
                  >
                    <Edit className="w-4 h-4 mr-2" />
                    Redigera
                  </button>
                  {selectedQuote.status === 'accepted' && (
                    <button
                      onClick={() => handleConvertToJob(selectedQuote.id)}
                      className="inline-flex items-center px-4 py-2 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-green-600 hover:bg-green-700"
                    >
                      <Briefcase className="w-4 h-4 mr-2" />
                      Konvertera till Jobb
                    </button>
                  )}
                </div>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

export default QuoteManagement;