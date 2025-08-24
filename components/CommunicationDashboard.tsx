import React, { useState, useEffect } from 'react';
import {
  MessageSquare,
  Mail,
  Phone,
  Filter,
  Search,
  Download,
  RefreshCw,
  Calendar,
  User,
  Building,
  Send,
  AlertCircle,
  CheckCircle,
  Clock,
  TrendingUp,
  BarChart3
} from 'lucide-react';
import {
  getCommunications,
  getStatusColor,
  getStatusLabel,
  type CommunicationWithRelations,
  type CommunicationFilters,
  type CommunicationType,
  type CommunicationStatus
} from '../lib/communications';
import { getCustomers, getUserProfiles } from '../lib/database';
import { formatDateTime, formatCurrency } from '../lib/database';
import { useAuth } from '../contexts/AuthContext';
import LoadingSpinner from './LoadingSpinner';
import ExportButton from './ExportButton';
import EmptyState from './EmptyState';

function CommunicationDashboard() {
  const { user } = useAuth();
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [communications, setCommunications] = useState<CommunicationWithRelations[]>([]);
  const [customers, setCustomers] = useState<any[]>([]);
  const [userProfile, setUserProfile] = useState<any>(null);
  const [filters, setFilters] = useState<CommunicationFilters>({});
  const [searchTerm, setSearchTerm] = useState('');
  const [showFilters, setShowFilters] = useState(false);

  useEffect(() => {
    if (user) {
      loadData();
    }
  }, [user, filters]);

  const loadData = async () => {
    try {
      setLoading(true);
      setError(null);

      if (!user) return;

      // Get user profile
      const { data: profiles } = await getUserProfiles('', { userId: user.id });
      const profile = profiles?.[0];
      
      if (!profile?.organisation_id) {
        setError('Ingen organisation hittades för användaren');
        return;
      }

      setUserProfile(profile);

      // Load communications and customers
      const [communicationsResult, customersResult] = await Promise.all([
        getCommunications(profile.organisation_id, { ...filters, search: searchTerm }),
        getCustomers(profile.organisation_id)
      ]);

      if (communicationsResult.error) {
        setError(communicationsResult.error.message);
        return;
      }

      if (customersResult.error) {
        setError(customersResult.error.message);
        return;
      }

      setCommunications(communicationsResult.data || []);
      setCustomers(customersResult.data || []);
    } catch (err) {
      console.error('Error loading data:', err);
      setError('Ett oväntat fel inträffade vid laddning av data.');
    } finally {
      setLoading(false);
    }
  };

  const handleFilterChange = (key: keyof CommunicationFilters, value: any) => {
    setFilters(prev => ({
      ...prev,
      [key]: value === 'all' ? undefined : value
    }));
  };

  const clearFilters = () => {
    setFilters({});
    setSearchTerm('');
  };

  const getActiveFiltersCount = () => {
    return Object.values(filters).filter(Boolean).length + (searchTerm ? 1 : 0);
  };

  // Calculate statistics
  const stats = {
    totalCommunications: communications.length,
    emailsSent: communications.filter(c => c.type === 'email' && c.status === 'sent').length,
    smsSent: communications.filter(c => c.type === 'sms' && c.status === 'sent').length,
    failedCommunications: communications.filter(c => c.status === 'failed').length,
    totalCost: communications
      .filter(c => c.type === 'sms' && c.status === 'sent')
      .reduce((sum, c) => sum + (Math.ceil(c.content.length / 160) * 0.85), 0)
  };

  const formatRecipient = (communication: CommunicationWithRelations) => {
    if (communication.type === 'email') {
      return communication.recipient;
    } else {
      // Format phone number for display
      const phone = communication.recipient;
      if (phone.startsWith('+46')) {
        return phone.replace('+46', '0').replace(/(\d{3})(\d{3})(\d{2})(\d{2})/, '$1-$2 $3 $4');
      }
      return phone;
    }
  };

  if (loading) {
    return (
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <h1 className="text-3xl font-bold text-gray-900">Kommunikation</h1>
          <LoadingSpinner />
        </div>
        <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
          {[1, 2, 3, 4].map(i => (
            <div key={i} className="bg-white rounded-lg p-6 animate-pulse">
              <div className="h-6 bg-gray-200 rounded mb-4"></div>
              <div className="h-8 bg-gray-200 rounded mb-2"></div>
              <div className="h-4 bg-gray-200 rounded"></div>
            </div>
          ))}
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
            <MessageSquare className="w-8 h-8 mr-3 text-blue-600" />
            Kommunikation
          </h1>
          <p className="mt-2 text-gray-600">
            Översikt över all kundkommunikation via e-post och SMS
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
          <ExportButton
            data={communications}
            filename={`kommunikation-${new Date().toISOString().split('T')[0]}`}
            title="Exportera"
          />
        </div>
      </div>

      {/* Error Display */}
      {error && (
        <div className="bg-red-50 border border-red-200 rounded-lg p-4">
          <div className="flex items-center">
            <AlertCircle className="w-5 h-5 text-red-600 mr-2" />
            <p className="text-red-700">{error}</p>
          </div>
        </div>
      )}

      {/* Statistics Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
        <div className="bg-white rounded-lg shadow-sm border p-6">
          <div className="flex items-center">
            <div className="w-12 h-12 bg-blue-100 rounded-lg flex items-center justify-center">
              <MessageSquare className="w-6 h-6 text-blue-600" />
            </div>
            <div className="ml-4">
              <p className="text-sm font-medium text-gray-500">Total kommunikation</p>
              <p className="text-2xl font-bold text-gray-900">{stats.totalCommunications}</p>
            </div>
          </div>
        </div>

        <div className="bg-white rounded-lg shadow-sm border p-6">
          <div className="flex items-center">
            <div className="w-12 h-12 bg-green-100 rounded-lg flex items-center justify-center">
              <Mail className="w-6 h-6 text-green-600" />
            </div>
            <div className="ml-4">
              <p className="text-sm font-medium text-gray-500">E-post skickade</p>
              <p className="text-2xl font-bold text-gray-900">{stats.emailsSent}</p>
            </div>
          </div>
        </div>

        <div className="bg-white rounded-lg shadow-sm border p-6">
          <div className="flex items-center">
            <div className="w-12 h-12 bg-purple-100 rounded-lg flex items-center justify-center">
              <Phone className="w-6 h-6 text-purple-600" />
            </div>
            <div className="ml-4">
              <p className="text-sm font-medium text-gray-500">SMS skickade</p>
              <p className="text-2xl font-bold text-gray-900">{stats.smsSent}</p>
            </div>
          </div>
        </div>

        <div className="bg-white rounded-lg shadow-sm border p-6">
          <div className="flex items-center">
            <div className="w-12 h-12 bg-yellow-100 rounded-lg flex items-center justify-center">
              <TrendingUp className="w-6 h-6 text-yellow-600" />
            </div>
            <div className="ml-4">
              <p className="text-sm font-medium text-gray-500">SMS-kostnad</p>
              <p className="text-2xl font-bold text-gray-900">{formatCurrency(stats.totalCost)}</p>
            </div>
          </div>
        </div>
      </div>

      {/* Filters */}
      <div className="bg-white rounded-lg shadow-sm border p-4">
        <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between space-y-4 lg:space-y-0">
          <div className="flex flex-col sm:flex-row gap-4 flex-1">
            <div className="flex-1">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-4 h-4" />
                <input
                  type="text"
                  placeholder="Sök i kommunikation..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-blue-500 focus:border-blue-500"
                />
              </div>
            </div>
            
            <div className="flex gap-2">
              <select
                value={filters.type || 'all'}
                onChange={(e) => handleFilterChange('type', e.target.value)}
                className="px-3 py-2 border border-gray-300 rounded-lg focus:ring-blue-500 focus:border-blue-500"
              >
                <option value="all">Alla typer</option>
                <option value="email">E-post</option>
                <option value="sms">SMS</option>
              </select>

              <select
                value={filters.status || 'all'}
                onChange={(e) => handleFilterChange('status', e.target.value)}
                className="px-3 py-2 border border-gray-300 rounded-lg focus:ring-blue-500 focus:border-blue-500"
              >
                <option value="all">Alla statusar</option>
                <option value="draft">Utkast</option>
                <option value="sent">Skickat</option>
                <option value="delivered">Levererat</option>
                <option value="read">Läst</option>
                <option value="failed">Misslyckades</option>
              </select>
            </div>
          </div>

          <div className="flex items-center space-x-3">
            {getActiveFiltersCount() > 0 && (
              <button
                onClick={clearFilters}
                className="text-sm text-blue-600 hover:text-blue-700 font-medium"
              >
                Rensa filter ({getActiveFiltersCount()})
              </button>
            )}
          </div>
        </div>
      </div>

      {/* Communications List */}
      <div className="bg-white rounded-lg shadow-sm border">
        <div className="px-6 py-4 border-b border-gray-200">
          <div className="flex items-center justify-between">
            <h3 className="text-lg font-semibold text-gray-900">Kommunikationshistorik</h3>
            <span className="text-sm text-gray-500">{communications.length} meddelanden</span>
          </div>
        </div>

        {communications.length === 0 ? (
          <EmptyState
            type="general"
            title="Ingen kommunikation hittades"
            description={
              getActiveFiltersCount() > 0
                ? "Inga meddelanden matchar dina filter. Prova att ändra filtren."
                : "Ingen kundkommunikation har skickats ännu. Kommunikation visas här när meddelanden skickas från orderdetaljsidor."
            }
            actionText="Rensa filter"
            onAction={getActiveFiltersCount() > 0 ? clearFilters : undefined}
          />
        ) : (
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-gray-200">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Typ & Status
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Mottagare
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Ämne/Innehåll
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Order
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Skickat
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Av
                  </th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {communications.map((communication) => (
                  <tr key={communication.id} className="hover:bg-gray-50">
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="flex items-center space-x-2">
                        <div className="flex items-center">
                          {communication.type === 'email' ? (
                            <Mail className="w-4 h-4 text-blue-600 mr-2" />
                          ) : (
                            <Phone className="w-4 h-4 text-purple-600 mr-2" />
                          )}
                          <span className="text-sm font-medium text-gray-900">
                            {communication.type === 'email' ? 'E-post' : 'SMS'}
                          </span>
                        </div>
                        <span className={`inline-flex px-2 py-1 text-xs font-medium rounded-full ${getStatusColor(communication.status)}`}>
                          {getStatusLabel(communication.status)}
                        </span>
                      </div>
                    </td>
                    <td className="px-6 py-4">
                      <div>
                        <p className="text-sm font-medium text-gray-900">
                          {communication.order?.customer?.name}
                        </p>
                        <p className="text-sm text-gray-600">
                          {formatRecipient(communication)}
                        </p>
                      </div>
                    </td>
                    <td className="px-6 py-4">
                      <div className="max-w-xs">
                        {communication.subject && (
                          <p className="text-sm font-medium text-gray-900 truncate">
                            {communication.subject}
                          </p>
                        )}
                        <p className="text-sm text-gray-600 truncate">
                          {communication.content}
                        </p>
                      </div>
                    </td>
                    <td className="px-6 py-4">
                      <div>
                        <p className="text-sm font-medium text-gray-900">
                          {communication.order?.title}
                        </p>
                        <p className="text-sm text-gray-600">
                          #{communication.order_id.slice(-8).toUpperCase()}
                        </p>
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-600">
                      {communication.sent_at ? (
                        <div className="flex items-center">
                          <Clock className="w-3 h-3 mr-1" />
                          {formatDateTime(communication.sent_at)}
                        </div>
                      ) : (
                        <span className="text-gray-400">Ej skickat</span>
                      )}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="flex items-center">
                        <User className="w-3 h-3 mr-1 text-gray-400" />
                        <span className="text-sm text-gray-600">
                          {communication.created_by?.full_name}
                        </span>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}

export default CommunicationDashboard;