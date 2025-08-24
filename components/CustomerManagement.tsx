import React, { useState, useEffect } from 'react';
import { 
  Users, 
  Plus, 
  Search, 
  Filter, 
  Edit, 
  Trash2, 
  Eye,
  Phone, 
  Mail, 
  MapPin, 
  Calendar,
  Building,
  User,
  X,
  AlertCircle,
  RefreshCw,
  Download,
  Upload,
  ChevronLeft,
  ChevronRight,
  TrendingUp,
  FileText,
  Briefcase,
  Receipt,
  Clock,
  Activity
} from 'lucide-react';
import { 
  searchCustomers,
  createCustomer,
  updateCustomer,
  deleteCustomer,
  getCustomerById,
  getCustomerInteractions,
  checkDuplicateCustomer,
  getCities,
  formatCurrency,
  formatDate,
  formatDateTime
} from '../lib/database';
import type { Customer, Lead, Quote, Job, Invoice, UserProfile } from '../types/database';
import { LEAD_STATUS_LABELS, QUOTE_STATUS_LABELS, JOB_STATUS_LABELS, INVOICE_STATUS_LABELS } from '../types/database';
import ROTInformation from '../components/ROTInformation';

// Fixed demo organization ID
const DEMO_ORG_ID = '550e8400-e29b-41d4-a716-446655440000';

interface CustomerWithStats extends Customer {
  total_leads?: number;
  total_jobs?: number;
  last_contact?: string;
}

interface CustomerFormData {
  name: string;
  email: string;
  phone_number: string;
  address: string;
  postal_code: string;
  city: string;
}

interface CustomerInteractions {
  leads: (Lead & { assigned_to?: UserProfile })[];
  quotes: (Quote & { lead?: Lead })[];
  jobs: (Job & { quote?: Quote; assigned_to?: UserProfile })[];
  invoices: (Invoice & { job?: Job })[];
}

function CustomerManagement() {
  const [customers, setCustomers] = useState<CustomerWithStats[]>([]);
  const [cities, setCities] = useState<string[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedCity, setSelectedCity] = useState('');
  const [dateFrom, setDateFrom] = useState('');
  const [dateTo, setDateTo] = useState('');
  const [currentPage, setCurrentPage] = useState(1);
  const [totalCount, setTotalCount] = useState(0);
  const [showAddModal, setShowAddModal] = useState(false);
  const [showEditModal, setShowEditModal] = useState(false);
  const [showDetailModal, setShowDetailModal] = useState(false);
  const [selectedCustomer, setSelectedCustomer] = useState<CustomerWithStats | null>(null);
  const [customerInteractions, setCustomerInteractions] = useState<CustomerInteractions | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [duplicateError, setDuplicateError] = useState<string | null>(null);
  
  const [customerForm, setCustomerForm] = useState<CustomerFormData>({
    name: '',
    email: '',
    phone_number: '',
    address: '',
    postal_code: '',
    city: ''
  });

  const itemsPerPage = 20;
  const totalPages = Math.ceil(totalCount / itemsPerPage);

  useEffect(() => {
    loadCustomers();
    loadCities();
  }, [currentPage, searchTerm, selectedCity, dateFrom, dateTo]);

  const loadCustomers = async () => {
    try {
      setLoading(true);
      setError(null);
      
      const result = await searchCustomers(
        DEMO_ORG_ID,
        searchTerm,
        {
          city: selectedCity || undefined,
          dateFrom: dateFrom || undefined,
          dateTo: dateTo || undefined
        },
        {
          page: currentPage,
          limit: itemsPerPage
        }
      );
      
      if (result.error) {
        setError(result.error.message);
        return;
      }
      
      setCustomers(result.data || []);
      setTotalCount(result.totalCount || 0);
    } catch (err) {
      console.error('Error loading customers:', err);
      setError('Ett oväntat fel inträffade vid hämtning av kunder.');
    } finally {
      setLoading(false);
    }
  };

  const loadCities = async () => {
    try {
      const citiesList = await getCities(DEMO_ORG_ID);
      setCities(citiesList);
    } catch (err) {
      console.error('Error loading cities:', err);
    }
  };

  const loadCustomerDetails = async (customerId: string) => {
    try {
      const result = await getCustomerInteractions(customerId);
      
      if (result.error) {
        setError(result.error.message);
        return;
      }
      
      setCustomerInteractions({
        leads: result.leads,
        quotes: result.quotes,
        jobs: result.jobs,
        invoices: result.invoices
      });
    } catch (err) {
      console.error('Error loading customer details:', err);
      setError('Kunde inte ladda kunddetaljer.');
    }
  };

  const handleAddCustomer = async (e: React.FormEvent) => {
    e.preventDefault();
    
    try {
      setIsSubmitting(true);
      setDuplicateError(null);
      
      // Check for duplicates
      const duplicateCheck = await checkDuplicateCustomer(
        DEMO_ORG_ID,
        customerForm.email,
        customerForm.name
      );
      
      if (duplicateCheck.error) {
        setError(duplicateCheck.error.message);
        return;
      }
      
      if (duplicateCheck.isDuplicate) {
        const field = duplicateCheck.duplicateField === 'email' ? 'e-postadress' : 'företagsnamn';
        setDuplicateError(`En kund med samma ${field} finns redan.`);
        return;
      }
      
      const result = await createCustomer({
        organisation_id: DEMO_ORG_ID,
        name: customerForm.name,
        email: customerForm.email || null,
        phone_number: customerForm.phone_number || null,
        address: customerForm.address || null,
        postal_code: customerForm.postal_code || null,
        city: customerForm.city || null
      });
      
      if (result.error) {
        setError(result.error.message);
        return;
      }
      
      // Reset form and close modal
      setCustomerForm({
        name: '',
        email: '',
        phone_number: '',
        address: '',
        postal_code: '',
        city: ''
      });
      setShowAddModal(false);
      
      // Reload customers
      await loadCustomers();
      await loadCities(); // Reload cities in case a new one was added
    } catch (err) {
      console.error('Error creating customer:', err);
      setError('Kunde inte skapa kund.');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleEditCustomer = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!selectedCustomer) return;
    
    try {
      setIsSubmitting(true);
      setDuplicateError(null);
      
      // Check for duplicates (excluding current customer)
      const duplicateCheck = await checkDuplicateCustomer(
        DEMO_ORG_ID,
        customerForm.email,
        customerForm.name,
        selectedCustomer.id
      );
      
      if (duplicateCheck.error) {
        setError(duplicateCheck.error.message);
        return;
      }
      
      if (duplicateCheck.isDuplicate) {
        const field = duplicateCheck.duplicateField === 'email' ? 'e-postadress' : 'företagsnamn';
        setDuplicateError(`En annan kund med samma ${field} finns redan.`);
        return;
      }
      
      const result = await updateCustomer(selectedCustomer.id, {
        name: customerForm.name,
        email: customerForm.email || null,
        phone_number: customerForm.phone_number || null,
        address: customerForm.address || null,
        postal_code: customerForm.postal_code || null,
        city: customerForm.city || null
      });
      
      if (result.error) {
        setError(result.error.message);
        return;
      }
      
      // Reset form and close modal
      setCustomerForm({
        name: '',
        email: '',
        phone_number: '',
        address: '',
        postal_code: '',
        city: ''
      });
      setShowEditModal(false);
      setSelectedCustomer(null);
      
      // Reload customers
      await loadCustomers();
      await loadCities();
    } catch (err) {
      console.error('Error updating customer:', err);
      setError('Kunde inte uppdatera kund.');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleDeleteCustomer = async (customer: CustomerWithStats) => {
    if (!confirm(`Är du säker på att du vill ta bort kunden "${customer.name}"? Detta kan inte ångras.`)) {
      return;
    }
    
    try {
      const result = await deleteCustomer(customer.id);
      
      if (result.error) {
        setError(result.error.message);
        return;
      }
      
      // Reload customers
      await loadCustomers();
    } catch (err) {
      console.error('Error deleting customer:', err);
      setError('Kunde inte ta bort kund.');
    }
  };

  const handleViewCustomer = async (customer: CustomerWithStats) => {
    setSelectedCustomer(customer);
    setShowDetailModal(true);
    await loadCustomerDetails(customer.id);
  };

  const handleEditClick = (customer: CustomerWithStats) => {
    setSelectedCustomer(customer);
    setCustomerForm({
      name: customer.name,
      email: customer.email || '',
      phone_number: customer.phone_number || '',
      address: customer.address || '',
      postal_code: customer.postal_code || '',
      city: customer.city || ''
    });
    setShowEditModal(true);
  };

  const resetFilters = () => {
    setSearchTerm('');
    setSelectedCity('');
    setDateFrom('');
    setDateTo('');
    setCurrentPage(1);
  };

  const getInteractionIcon = (type: string) => {
    switch (type) {
      case 'lead': return TrendingUp;
      case 'quote': return FileText;
      case 'job': return Briefcase;
      case 'invoice': return Receipt;
      default: return Activity;
    }
  };

  const getInteractionColor = (type: string, status?: string) => {
    switch (type) {
      case 'lead':
        if (status === 'won') return 'text-green-600';
        if (status === 'lost') return 'text-red-600';
        return 'text-blue-600';
      case 'quote':
        if (status === 'accepted') return 'text-green-600';
        if (status === 'declined') return 'text-red-600';
        return 'text-purple-600';
      case 'job':
        if (status === 'completed') return 'text-green-600';
        return 'text-orange-600';
      case 'invoice':
        if (status === 'paid') return 'text-green-600';
        if (status === 'overdue') return 'text-red-600';
        return 'text-blue-600';
      default:
        return 'text-gray-600';
    }
  };

  // Create timeline from all interactions
  const createTimeline = () => {
    if (!customerInteractions) return [];
    
    const timeline = [];
    
    // Add leads
    customerInteractions.leads.forEach(lead => {
      timeline.push({
        id: `lead-${lead.id}`,
        type: 'lead',
        title: lead.title,
        status: lead.status,
        date: lead.created_at,
        description: `Lead: ${LEAD_STATUS_LABELS[lead.status]}`,
        assignedTo: lead.assigned_to?.full_name,
        value: lead.estimated_value
      });
    });
    
    // Add quotes
    customerInteractions.quotes.forEach(quote => {
      timeline.push({
        id: `quote-${quote.id}`,
        type: 'quote',
        title: quote.title,
        status: quote.status,
        date: quote.created_at,
        description: `Offert: ${QUOTE_STATUS_LABELS[quote.status]}`,
        value: quote.total_amount
      });
    });
    
    // Add jobs
    customerInteractions.jobs.forEach(job => {
      timeline.push({
        id: `job-${job.id}`,
        type: 'job',
        title: job.title,
        status: job.status,
        date: job.created_at,
        description: `Jobb: ${JOB_STATUS_LABELS[job.status]}`,
        assignedTo: job.assigned_to?.full_name,
        value: job.value
      });
    });
    
    // Add invoices
    customerInteractions.invoices.forEach(invoice => {
      timeline.push({
        id: `invoice-${invoice.id}`,
        type: 'invoice',
        title: `Faktura ${invoice.invoice_number}`,
        status: invoice.status,
        date: invoice.created_at,
        description: `Faktura: ${INVOICE_STATUS_LABELS[invoice.status]}`,
        value: invoice.amount
      });
    });
    
    // Sort by date (newest first)
    return timeline.sort((a, b) => 
      new Date(b.date || '').getTime() - new Date(a.date || '').getTime()
    );
  };

  if (loading && customers.length === 0) {
    return (
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <h1 className="text-3xl font-bold text-gray-900">Kunder</h1>
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
        </div>
        <div className="bg-white shadow rounded-lg p-6 animate-pulse">
          <div className="space-y-4">
            {[1, 2, 3, 4, 5].map(i => (
              <div key={i} className="h-16 bg-gray-200 rounded"></div>
            ))}
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
          <h1 className="text-3xl font-bold text-gray-900 flex items-center">
            <Users className="w-8 h-8 mr-3 text-blue-600" />
            Kunder
          </h1>
          <p className="mt-2 text-gray-600">
            Hantera alla dina kunder och kundrelationer ({totalCount} totalt)
          </p>
        </div>
        <div className="mt-4 sm:mt-0 flex items-center space-x-3">
          <button
            onClick={loadCustomers}
            className="inline-flex items-center px-3 py-2 border border-gray-300 rounded-md shadow-sm text-sm font-medium text-gray-700 bg-white hover:bg-gray-50"
          >
            <RefreshCw className="w-4 h-4 mr-2" />
            Uppdatera
          </button>
          <button
            onClick={() => setShowAddModal(true)}
            className="inline-flex items-center px-4 py-2 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-blue-600 hover:bg-blue-700"
          >
            <Plus className="w-4 h-4 mr-2" />
            Lägg till Kund
          </button>
        </div>
      </div>

      {/* Error Display */}
      {error && (
        <div className="bg-red-50 border border-red-200 rounded-lg p-4">
          <div className="flex items-center">
            <AlertCircle className="w-5 h-5 text-red-600 mr-2" />
            <span className="text-red-700">{error}</span>
            <button
              onClick={() => setError(null)}
              className="ml-auto text-red-600 hover:text-red-800"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        </div>
      )}

      {/* Filters */}
      <div className="bg-white p-4 rounded-lg shadow-sm border">
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Sök</label>
            <div className="relative">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-4 h-4" />
              <input
                type="text"
                placeholder="Sök kunder..."
                value={searchTerm}
                onChange={(e) => {
                  setSearchTerm(e.target.value);
                  setCurrentPage(1);
                }}
                className="pl-10 pr-4 py-2 w-full border border-gray-300 rounded-md focus:ring-blue-500 focus:border-blue-500"
              />
            </div>
          </div>
          
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Stad</label>
            <select
              value={selectedCity}
              onChange={(e) => {
                setSelectedCity(e.target.value);
                setCurrentPage(1);
              }}
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-blue-500 focus:border-blue-500"
            >
              <option value="">Alla städer</option>
              {cities.map(city => (
                <option key={city} value={city}>{city}</option>
              ))}
            </select>
          </div>
          
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Från datum</label>
            <input
              type="date"
              value={dateFrom}
              onChange={(e) => {
                setDateFrom(e.target.value);
                setCurrentPage(1);
              }}
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-blue-500 focus:border-blue-500"
            />
          </div>
          
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Till datum</label>
            <input
              type="date"
              value={dateTo}
              onChange={(e) => {
                setDateTo(e.target.value);
                setCurrentPage(1);
              }}
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-blue-500 focus:border-blue-500"
            />
          </div>
        </div>
        
        {(searchTerm || selectedCity || dateFrom || dateTo) && (
          <div className="mt-4 flex items-center justify-between">
            <div className="text-sm text-gray-600">
              Visar {customers.length} av {totalCount} kunder
            </div>
            <button
              onClick={resetFilters}
              className="text-sm text-blue-600 hover:text-blue-700"
            >
              Rensa filter
            </button>
          </div>
        )}
      </div>

      {/* Customer Table */}
      <div className="bg-white shadow rounded-lg overflow-hidden">
        {customers.length === 0 ? (
          <div className="text-center py-12">
            <Users className="mx-auto h-16 w-16 text-gray-400" />
            <h3 className="mt-4 text-lg font-medium text-gray-900">
              {searchTerm || selectedCity || dateFrom || dateTo ? 'Inga kunder hittades' : 'Inga kunder ännu'}
            </h3>
            <p className="mt-2 text-gray-500">
              {searchTerm || selectedCity || dateFrom || dateTo 
                ? 'Prova att ändra dina sökkriterier' 
                : 'Kom igång genom att lägga till din första kund.'
              }
            </p>
            {!searchTerm && !selectedCity && !dateFrom && !dateTo && (
              <div className="mt-6">
                <button
                  onClick={() => setShowAddModal(true)}
                  className="inline-flex items-center px-4 py-2 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-blue-600 hover:bg-blue-700"
                >
                  <Plus className="w-4 h-4 mr-2" />
                  Lägg till Kund
                </button>
              </div>
            )}
          </div>
        ) : (
          <>
            <div className="overflow-x-auto">
              <table className="min-w-full divide-y divide-gray-200">
                <thead className="bg-gray-50">
                  <tr>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Företag
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Kontakt
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Stad
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Leads/Jobb
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Senast kontaktad
                    </th>
                    <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Åtgärder
                    </th>
                  </tr>
                </thead>
                <tbody className="bg-white divide-y divide-gray-200">
                  {customers.map((customer) => (
                    <tr key={customer.id} className="hover:bg-gray-50">
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div>
                          <div className="text-sm font-medium text-gray-900">
                            {customer.name}
                          </div>
                          {customer.email && (
                            <div className="text-sm text-gray-500 flex items-center">
                              <Mail className="w-3 h-3 mr-1" />
                              {customer.email}
                            </div>
                          )}
                        </div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="text-sm text-gray-900">
                          {customer.phone_number && (
                            <div className="flex items-center">
                              <Phone className="w-3 h-3 mr-1 text-gray-400" />
                              {customer.phone_number}
                            </div>
                          )}
                        </div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="text-sm text-gray-900">
                          {customer.city && (
                            <div className="flex items-center">
                              <MapPin className="w-3 h-3 mr-1 text-gray-400" />
                              {customer.city}
                            </div>
                          )}
                        </div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="flex items-center space-x-4 text-sm">
                          <span className="text-blue-600">
                            {customer.total_leads || 0} leads
                          </span>
                          <span className="text-green-600">
                            {customer.total_jobs || 0} jobb
                          </span>
                        </div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                        {customer.last_contact ? (
                          <div className="flex items-center">
                            <Clock className="w-3 h-3 mr-1" />
                            {formatDate(customer.last_contact)}
                          </div>
                        ) : (
                          'Aldrig'
                        )}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                        <div className="flex items-center justify-end space-x-2">
                          <button
                            onClick={() => handleViewCustomer(customer)}
                            className="text-blue-600 hover:text-blue-900"
                            title="Visa detaljer"
                          >
                            <Eye className="w-4 h-4" />
                          </button>
                          <button
                            onClick={() => handleEditClick(customer)}
                            className="text-gray-600 hover:text-gray-900"
                            title="Redigera"
                          >
                            <Edit className="w-4 h-4" />
                          </button>
                          <button
                            onClick={() => handleDeleteCustomer(customer)}
                            className="text-red-600 hover:text-red-900"
                            title="Ta bort"
                          >
                            <Trash2 className="w-4 h-4" />
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            {/* Pagination */}
            {totalPages > 1 && (
              <div className="bg-white px-4 py-3 flex items-center justify-between border-t border-gray-200 sm:px-6">
                <div className="flex-1 flex justify-between sm:hidden">
                  <button
                    onClick={() => setCurrentPage(Math.max(1, currentPage - 1))}
                    disabled={currentPage === 1}
                    className="relative inline-flex items-center px-4 py-2 border border-gray-300 text-sm font-medium rounded-md text-gray-700 bg-white hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    Föregående
                  </button>
                  <button
                    onClick={() => setCurrentPage(Math.min(totalPages, currentPage + 1))}
                    disabled={currentPage === totalPages}
                    className="ml-3 relative inline-flex items-center px-4 py-2 border border-gray-300 text-sm font-medium rounded-md text-gray-700 bg-white hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    Nästa
                  </button>
                </div>
                <div className="hidden sm:flex-1 sm:flex sm:items-center sm:justify-between">
                  <div>
                    <p className="text-sm text-gray-700">
                      Visar{' '}
                      <span className="font-medium">{(currentPage - 1) * itemsPerPage + 1}</span>
                      {' '}till{' '}
                      <span className="font-medium">
                        {Math.min(currentPage * itemsPerPage, totalCount)}
                      </span>
                      {' '}av{' '}
                      <span className="font-medium">{totalCount}</span>
                      {' '}resultat
                    </p>
                  </div>
                  <div>
                    <nav className="relative z-0 inline-flex rounded-md shadow-sm -space-x-px">
                      <button
                        onClick={() => setCurrentPage(Math.max(1, currentPage - 1))}
                        disabled={currentPage === 1}
                        className="relative inline-flex items-center px-2 py-2 rounded-l-md border border-gray-300 bg-white text-sm font-medium text-gray-500 hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed"
                      >
                        <ChevronLeft className="h-5 w-5" />
                      </button>
                      
                      {/* Page numbers */}
                      {Array.from({ length: Math.min(5, totalPages) }, (_, i) => {
                        let pageNum;
                        if (totalPages <= 5) {
                          pageNum = i + 1;
                        } else if (currentPage <= 3) {
                          pageNum = i + 1;
                        } else if (currentPage >= totalPages - 2) {
                          pageNum = totalPages - 4 + i;
                        } else {
                          pageNum = currentPage - 2 + i;
                        }
                        
                        return (
                          <button
                            key={pageNum}
                            onClick={() => setCurrentPage(pageNum)}
                            className={`
                              relative inline-flex items-center px-4 py-2 border text-sm font-medium
                              ${currentPage === pageNum
                                ? 'z-10 bg-blue-50 border-blue-500 text-blue-600'
                                : 'bg-white border-gray-300 text-gray-500 hover:bg-gray-50'
                              }
                            `}
                          >
                            {pageNum}
                          </button>
                        );
                      })}
                      
                      <button
                        onClick={() => setCurrentPage(Math.min(totalPages, currentPage + 1))}
                        disabled={currentPage === totalPages}
                        className="relative inline-flex items-center px-2 py-2 rounded-r-md border border-gray-300 bg-white text-sm font-medium text-gray-500 hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed"
                      >
                        <ChevronRight className="h-5 w-5" />
                      </button>
                    </nav>
                  </div>
                </div>
              </div>
            )}
          </>
        )}
      </div>

      {/* Add Customer Modal */}
      {showAddModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-lg max-w-md w-full max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between p-6 border-b">
              <h3 className="text-lg font-semibold text-gray-900">Lägg till Kund</h3>
              <button
                onClick={() => {
                  setShowAddModal(false);
                  setDuplicateError(null);
                  setCustomerForm({
                    name: '',
                    email: '',
                    phone_number: '',
                    address: '',
                    postal_code: '',
                    city: ''
                  });
                }}
                className="text-gray-400 hover:text-gray-600"
              >
                <X className="w-5 h-5" />
              </button>
            </div>
            
            <form onSubmit={handleAddCustomer} className="p-6 space-y-4">
              {duplicateError && (
                <div className="bg-red-50 border border-red-200 rounded-lg p-3">
                  <div className="flex items-center">
                    <AlertCircle className="w-4 h-4 text-red-600 mr-2" />
                    <span className="text-red-700 text-sm">{duplicateError}</span>
                  </div>
                </div>
              )}
              
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Företagsnamn *
                </label>
                <input
                  type="text"
                  required
                  value={customerForm.name}
                  onChange={(e) => setCustomerForm(prev => ({ ...prev, name: e.target.value }))}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-blue-500 focus:border-blue-500"
                  placeholder="Företagsnamn"
                />
              </div>
              
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  E-postadress
                </label>
                <input
                  type="email"
                  value={customerForm.email}
                  onChange={(e) => setCustomerForm(prev => ({ ...prev, email: e.target.value }))}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-blue-500 focus:border-blue-500"
                  placeholder="kontakt@företag.se"
                />
              </div>
              
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Telefonnummer
                </label>
                <input
                  type="tel"
                  value={customerForm.phone_number}
                  onChange={(e) => setCustomerForm(prev => ({ ...prev, phone_number: e.target.value }))}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-blue-500 focus:border-blue-500"
                  placeholder="+46 70 123 45 67"
                />
              </div>
              
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Adress
                </label>
                <input
                  type="text"
                  value={customerForm.address}
                  onChange={(e) => setCustomerForm(prev => ({ ...prev, address: e.target.value }))}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-blue-500 focus:border-blue-500"
                  placeholder="Gatuadress"
                />
              </div>
              
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Postnummer
                  </label>
                  <input
                    type="text"
                    value={customerForm.postal_code}
                    onChange={(e) => setCustomerForm(prev => ({ ...prev, postal_code: e.target.value }))}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-blue-500 focus:border-blue-500"
                    placeholder="123 45"
                  />
                </div>
                
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Stad
                  </label>
                  <input
                    type="text"
                    value={customerForm.city}
                    onChange={(e) => setCustomerForm(prev => ({ ...prev, city: e.target.value }))}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-blue-500 focus:border-blue-500"
                    placeholder="Stockholm"
                  />
                </div>
              </div>
              
              <div className="flex justify-end space-x-3 pt-4">
                <button
                  type="button"
                  onClick={() => {
                    setShowAddModal(false);
                    setDuplicateError(null);
                    setCustomerForm({
                      name: '',
                      email: '',
                      phone_number: '',
                      address: '',
                      postal_code: '',
                      city: ''
                    });
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
                      Skapar...
                    </div>
                  ) : (
                    'Skapa Kund'
                  )}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Edit Customer Modal */}
      {showEditModal && selectedCustomer && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-lg max-w-md w-full max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between p-6 border-b">
              <h3 className="text-lg font-semibold text-gray-900">Redigera Kund</h3>
              <button
                onClick={() => {
                  setShowEditModal(false);
                  setSelectedCustomer(null);
                  setDuplicateError(null);
                  setCustomerForm({
                    name: '',
                    email: '',
                    phone_number: '',
                    address: '',
                    postal_code: '',
                    city: ''
                  });
                }}
                className="text-gray-400 hover:text-gray-600"
              >
                <X className="w-5 h-5" />
              </button>
            </div>
            
            <form onSubmit={handleEditCustomer} className="p-6 space-y-4">
              {duplicateError && (
                <div className="bg-red-50 border border-red-200 rounded-lg p-3">
                  <div className="flex items-center">
                    <AlertCircle className="w-4 h-4 text-red-600 mr-2" />
                    <span className="text-red-700 text-sm">{duplicateError}</span>
                  </div>
                </div>
              )}
              
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Företagsnamn *
                </label>
                <input
                  type="text"
                  required
                  value={customerForm.name}
                  onChange={(e) => setCustomerForm(prev => ({ ...prev, name: e.target.value }))}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-blue-500 focus:border-blue-500"
                  placeholder="Företagsnamn"
                />
              </div>
              
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  E-postadress
                </label>
                <input
                  type="email"
                  value={customerForm.email}
                  onChange={(e) => setCustomerForm(prev => ({ ...prev, email: e.target.value }))}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-blue-500 focus:border-blue-500"
                  placeholder="kontakt@företag.se"
                />
              </div>
              
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Telefonnummer
                </label>
                <input
                  type="tel"
                  value={customerForm.phone_number}
                  onChange={(e) => setCustomerForm(prev => ({ ...prev, phone_number: e.target.value }))}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-blue-500 focus:border-blue-500"
                  placeholder="+46 70 123 45 67"
                />
              </div>
              
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Adress
                </label>
                <input
                  type="text"
                  value={customerForm.address}
                  onChange={(e) => setCustomerForm(prev => ({ ...prev, address: e.target.value }))}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-blue-500 focus:border-blue-500"
                  placeholder="Gatuadress"
                />
              </div>
              
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Postnummer
                  </label>
                  <input
                    type="text"
                    value={customerForm.postal_code}
                    onChange={(e) => setCustomerForm(prev => ({ ...prev, postal_code: e.target.value }))}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-blue-500 focus:border-blue-500"
                    placeholder="123 45"
                  />
                </div>
                
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Stad
                  </label>
                  <input
                    type="text"
                    value={customerForm.city}
                    onChange={(e) => setCustomerForm(prev => ({ ...prev, city: e.target.value }))}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-blue-500 focus:border-blue-500"
                    placeholder="Stockholm"
                  />
                </div>
              </div>
              
              <div className="flex justify-end space-x-3 pt-4">
                <button
                  type="button"
                  onClick={() => {
                    setShowEditModal(false);
                    setSelectedCustomer(null);
                    setDuplicateError(null);
                    setCustomerForm({
                      name: '',
                      email: '',
                      phone_number: '',
                      address: '',
                      postal_code: '',
                      city: ''
                    });
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
                      Uppdaterar...
                    </div>
                  ) : (
                    'Uppdatera Kund'
                  )}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Customer Detail Modal */}
      {showDetailModal && selectedCustomer && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-lg max-w-4xl w-full max-h-[90vh] overflow-hidden flex flex-col">
            <div className="flex items-center justify-between p-6 border-b">
              <h3 className="text-lg font-semibold text-gray-900">Kunddetaljer</h3>
              <button
                onClick={() => {
                  setShowDetailModal(false);
                  setSelectedCustomer(null);
                  setCustomerInteractions(null);
                }}
                className="text-gray-400 hover:text-gray-600"
              >
                <X className="w-5 h-5" />
              </button>
            </div>
            
            <div className="flex-1 overflow-y-auto p-6">
              <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                {/* Customer Info Card */}
                <div className="lg:col-span-1">
                  <div className="bg-gray-50 rounded-lg p-6">
                    <div className="flex items-center mb-4">
                      <div className="w-12 h-12 bg-blue-100 rounded-full flex items-center justify-center mr-4">
                        <Building className="w-6 h-6 text-blue-600" />
                      </div>
                      <div>
                        <h4 className="text-lg font-semibold text-gray-900">{selectedCustomer.name}</h4>
                        <p className="text-sm text-gray-500">
                          Kund sedan {selectedCustomer.created_at ? formatDate(selectedCustomer.created_at) : 'Okänt'}
                        </p>
                      </div>
                    </div>
                    
                    <div className="space-y-3">
                      {selectedCustomer.email && (
                        <div className="flex items-center text-sm">
                          <Mail className="w-4 h-4 mr-2 text-gray-400" />
                          <a href={`mailto:${selectedCustomer.email}`} className="text-blue-600 hover:text-blue-700">
                            {selectedCustomer.email}
                          </a>
                        </div>
                      )}
                      
                      {selectedCustomer.phone_number && (
                        <div className="flex items-center text-sm">
                          <Phone className="w-4 h-4 mr-2 text-gray-400" />
                          <a href={`tel:${selectedCustomer.phone_number}`} className="text-blue-600 hover:text-blue-700">
                            {selectedCustomer.phone_number}
                          </a>
                        </div>
                      )}
                      
                      {(selectedCustomer.address || selectedCustomer.city) && (
                        <div className="flex items-start text-sm">
                          <MapPin className="w-4 h-4 mr-2 text-gray-400 mt-0.5" />
                          <div>
                            {selectedCustomer.address && <div>{selectedCustomer.address}</div>}
                            {(selectedCustomer.postal_code || selectedCustomer.city) && (
                              <div>
                                {selectedCustomer.postal_code} {selectedCustomer.city}
                              </div>
                            )}
                          </div>
                        </div>
                      )}
                    </div>
                    
                    {/* Quick Stats */}
                    <div className="mt-6 pt-6 border-t border-gray-200">
                      <div className="grid grid-cols-2 gap-4 text-center">
                        <div>
                          <div className="text-2xl font-bold text-blue-600">{selectedCustomer.total_leads || 0}</div>
                          <div className="text-xs text-gray-500">Leads</div>
                        </div>
                        <div>
                          <div className="text-2xl font-bold text-green-600">{selectedCustomer.total_jobs || 0}</div>
                          <div className="text-xs text-gray-500">Jobb</div>
                        </div>
                      </div>
                    </div>

                    {/* ROT INFORMATION DISPLAY */}
{selectedCustomer && selectedCustomer.include_rot && (
    <div className="mt-6 pt-6 border-t border-gray-200">
         <ROTInformation
            data={selectedCustomer}
            totalAmount={0} // totalAmount is not relevant here, so pass 0
            showDetails={true}
        />
    </div>
)}
                    
                    {/* Quick Actions */}
                    <div className="mt-6 space-y-2">
                      <button className="w-full flex items-center justify-center px-4 py-2 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-blue-600 hover:bg-blue-700">
                        <TrendingUp className="w-4 h-4 mr-2" />
                        Skapa Lead
                      </button>
                      <button className="w-full flex items-center justify-center px-4 py-2 border border-gray-300 rounded-md shadow-sm text-sm font-medium text-gray-700 bg-white hover:bg-gray-50">
                        <FileText className="w-4 h-4 mr-2" />
                        Ny Offert
                      </button>
                      <button className="w-full flex items-center justify-center px-4 py-2 border border-gray-300 rounded-md shadow-sm text-sm font-medium text-gray-700 bg-white hover:bg-gray-50">
                        <Calendar className="w-4 h-4 mr-2" />
                        Boka Möte
                      </button>
                    </div>
                  </div>
                </div>
                
                {/* Timeline */}
                <div className="lg:col-span-2">
                  <h5 className="text-lg font-semibold text-gray-900 mb-4">Interaktionshistorik</h5>
                  
                  {!customerInteractions ? (
                    <div className="flex items-center justify-center py-8">
                      <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
                    </div>
                  ) : (
                    <div className="space-y-4">
                      {createTimeline().length === 0 ? (
                        <div className="text-center py-8 text-gray-500">
                          <Activity className="w-12 h-12 mx-auto mb-2 text-gray-400" />
                          <p>Inga interaktioner ännu</p>
                          <p className="text-sm">Skapa en lead eller offert för att komma igång</p>
                        </div>
                      ) : (
                        createTimeline().map((item) => {
                          const Icon = getInteractionIcon(item.type);
                          const color = getInteractionColor(item.type, item.status);
                          
                          return (
                            <div key={item.id} className="flex items-start space-x-3 p-4 bg-white border border-gray-200 rounded-lg">
                              <div className="flex-shrink-0">
                                <div className="w-8 h-8 bg-gray-100 rounded-full flex items-center justify-center">
                                  <Icon className={`w-4 h-4 ${color}`} />
                                </div>
                              </div>
                              <div className="min-w-0 flex-1">
                                <div className="flex items-center justify-between">
                                  <p className="text-sm font-medium text-gray-900">{item.title}</p>
                                  {item.value && (
                                    <span className="text-sm font-medium text-green-600">
                                      {formatCurrency(item.value)}
                                    </span>
                                  )}
                                </div>
                                <p className="text-sm text-gray-500">{item.description}</p>
                                <div className="flex items-center space-x-4 text-xs text-gray-400 mt-1">
                                  <span>{item.date ? formatDateTime(item.date) : 'Okänt datum'}</span>
                                  {item.assignedTo && (
                                    <>
                                      <span>•</span>
                                      <span>Tilldelad: {item.assignedTo}</span>
                                    </>
                                  )}
                                </div>
                              </div>
                            </div>
                          );
                        })
                      )}
                    </div>
                  )}
                </div>
              </div>
            </div>
            
            {/* Footer Actions */}
            <div className="border-t border-gray-200 px-6 py-4">
              <div className="flex justify-between items-center">
                <button
                  onClick={() => {
                    setShowDetailModal(false);
                    setSelectedCustomer(null);
                    setCustomerInteractions(null);
                  }}
                  className="px-4 py-2 border border-gray-300 rounded-md text-sm font-medium text-gray-700 bg-white hover:bg-gray-50"
                >
                  Stäng
                </button>
                
                <div className="flex space-x-3">
                  <button
                    onClick={() => handleEditClick(selectedCustomer)}
                    className="inline-flex items-center px-4 py-2 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-blue-600 hover:bg-blue-700"
                  >
                    <Edit className="w-4 h-4 mr-2" />
                    Redigera Kund
                  </button>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

export default CustomerManagement;