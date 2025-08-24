import React, { useState, useEffect } from 'react';
import {
  TrendingUp,
  Users,
  DollarSign,
  Target,
  Calendar,
  Download,
  Filter,
  RefreshCw,
  BarChart3,
  PieChart,
  LineChart,
  Activity,
  AlertCircle,
  FileText,
  Clock,
  MapPin,
  Star
} from 'lucide-react';
import {
  LineChart as RechartsLineChart,
  BarChart as RechartsBarChart,
  PieChart as RechartsPieChart,
  AreaChart,
  ComposedChart,
  Line,
  Bar,
  Area,
  Pie,
  Cell,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer
} from 'recharts';
import { useAuth } from '../contexts/AuthContext';
import { formatCurrency, formatDate } from '../lib/database';

// Fixed demo organization ID
const DEMO_ORG_ID = '550e8400-e29b-41d4-a716-446655440000';

interface DateRange {
  startDate: string;
  endDate: string;
  preset: 'last7days' | 'last30days' | 'last3months' | 'last6months' | 'lastyear' | 'custom';
}

interface AnalyticsData {
  salesTrends: any[];
  leadAnalytics: any[];
  customerMetrics: any[];
  financialData: any[];
  teamPerformance: any[];
}

function Analytics() {
  const { user } = useAuth();
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState<'sales' | 'leads' | 'customers' | 'financial' | 'team'>('sales');
  const [dateRange, setDateRange] = useState<DateRange>({
    startDate: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
    endDate: new Date().toISOString().split('T')[0],
    preset: 'last30days'
  });
  const [analyticsData, setAnalyticsData] = useState<AnalyticsData>({
    salesTrends: [],
    leadAnalytics: [],
    customerMetrics: [],
    financialData: [],
    teamPerformance: []
  });

  useEffect(() => {
    loadAnalyticsData();
  }, [dateRange]);

  const loadAnalyticsData = async () => {
    try {
      setLoading(true);
      setError(null);

      // Simulate API call - in real app, this would fetch from Supabase
      await new Promise(resolve => setTimeout(resolve, 1000));

      // Mock data generation
      const mockData = generateMockAnalyticsData();
      setAnalyticsData(mockData);
    } catch (err) {
      console.error('Error loading analytics data:', err);
      setError('Kunde inte ladda analysdata. Försök igen senare.');
    } finally {
      setLoading(false);
    }
  };

  const generateMockAnalyticsData = (): AnalyticsData => {
    // Generate sales trends data
    const salesTrends = Array.from({ length: 12 }, (_, i) => {
      const date = new Date();
      date.setMonth(date.getMonth() - 11 + i);
      return {
        månad: date.toLocaleDateString('sv-SE', { month: 'short', year: '2-digit' }),
        intäkter: Math.floor(Math.random() * 500000) + 200000,
        affärer: Math.floor(Math.random() * 20) + 10,
        genomsnittligAffär: Math.floor(Math.random() * 50000) + 25000,
        målIntäkter: 400000
      };
    });

    // Generate lead analytics data
    const leadSources = ['Webbsida', 'Referral', 'Sociala medier', 'E-post', 'Telefon', 'Mässa'];
    const leadAnalytics = leadSources.map(source => ({
      källa: source,
      leads: Math.floor(Math.random() * 100) + 20,
      konverteringar: Math.floor(Math.random() * 30) + 5,
      konverteringsgrad: Math.floor(Math.random() * 40) + 10,
      genomsnittligSvarstid: Math.floor(Math.random() * 24) + 2,
      kostnadPerLead: Math.floor(Math.random() * 500) + 100
    }));

    // Generate customer metrics
    const customerSegments = ['Små företag', 'Medelstora företag', 'Stora företag', 'Privatpersoner'];
    const customerMetrics = customerSegments.map(segment => ({
      segment,
      antal: Math.floor(Math.random() * 200) + 50,
      genomsnittligVärde: Math.floor(Math.random() * 100000) + 50000,
      livstidsvärde: Math.floor(Math.random() * 500000) + 200000,
      nöjdhet: Math.floor(Math.random() * 3) + 3
    }));

    // Generate financial data
    const financialData = Array.from({ length: 6 }, (_, i) => {
      const date = new Date();
      date.setMonth(date.getMonth() - 5 + i);
      return {
        månad: date.toLocaleDateString('sv-SE', { month: 'long' }),
        intäkter: Math.floor(Math.random() * 800000) + 400000,
        kostnader: Math.floor(Math.random() * 300000) + 200000,
        vinst: 0, // Will be calculated
        utestående: Math.floor(Math.random() * 200000) + 50000,
        kassaflöde: Math.floor(Math.random() * 400000) + 100000
      };
    }).map(item => ({
      ...item,
      vinst: item.intäkter - item.kostnader,
      vinstmarginal: Math.round(((item.intäkter - item.kostnader) / item.intäkter) * 100)
    }));

    // Generate team performance data
    const teamMembers = ['Anna Andersson', 'Erik Eriksson', 'Maria Nilsson', 'Johan Johansson', 'Lisa Larsson'];
    const teamPerformance = teamMembers.map(name => ({
      namn: name,
      leads: Math.floor(Math.random() * 50) + 20,
      affärer: Math.floor(Math.random() * 15) + 5,
      intäkter: Math.floor(Math.random() * 300000) + 100000,
      konverteringsgrad: Math.floor(Math.random() * 30) + 15,
      genomsnittligAffärstid: Math.floor(Math.random() * 20) + 10,
      kundnöjdhet: (Math.random() * 2 + 3).toFixed(1),
      måluppfyllelse: Math.floor(Math.random() * 50) + 70
    }));

    return {
      salesTrends,
      leadAnalytics,
      customerMetrics,
      financialData,
      teamPerformance
    };
  };

  const handleDateRangeChange = (preset: DateRange['preset']) => {
    const now = new Date();
    let startDate: Date;

    switch (preset) {
      case 'last7days':
        startDate = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
        break;
      case 'last30days':
        startDate = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);
        break;
      case 'last3months':
        startDate = new Date(now.getFullYear(), now.getMonth() - 3, now.getDate());
        break;
      case 'last6months':
        startDate = new Date(now.getFullYear(), now.getMonth() - 6, now.getDate());
        break;
      case 'lastyear':
        startDate = new Date(now.getFullYear() - 1, now.getMonth(), now.getDate());
        break;
      default:
        return;
    }

    setDateRange({
      startDate: startDate.toISOString().split('T')[0],
      endDate: now.toISOString().split('T')[0],
      preset
    });
  };

  const exportReport = (reportType: string) => {
    // Mock export functionality
    const data = JSON.stringify(analyticsData, null, 2);
    const blob = new Blob([data], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `${reportType}-rapport-${new Date().toISOString().split('T')[0]}.json`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };

  const COLORS = ['#2563EB', '#10B981', '#F59E0B', '#EF4444', '#8B5CF6', '#06B6D4', '#84CC16', '#F97316'];

  // Custom tooltip for Swedish formatting
  const CustomTooltip = ({ active, payload, label }: any) => {
    if (active && payload && payload.length) {
      return (
        <div className="bg-white p-3 border border-gray-200 rounded-lg shadow-lg">
          <p className="text-gray-900 font-medium">{label}</p>
          {payload.map((entry: any, index: number) => (
            <p key={index} style={{ color: entry.color }}>
              {entry.name}: {
                entry.name.includes('intäkter') || entry.name.includes('värde') || entry.name.includes('kostnad') 
                  ? formatCurrency(entry.value)
                  : entry.name.includes('grad') || entry.name.includes('marginal')
                  ? `${entry.value}%`
                  : entry.value
              }
            </p>
          ))}
        </div>
      );
    }
    return null;
  };

  if (loading) {
    return (
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <h1 className="text-3xl font-bold text-gray-900">Analys & Rapporter</h1>
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
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

  if (error) {
    return (
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <h1 className="text-3xl font-bold text-gray-900">Analys & Rapporter</h1>
        </div>
        <div className="bg-red-50 border border-red-200 rounded-lg p-6">
          <div className="flex items-center">
            <AlertCircle className="w-10 h-10 text-red-600 mr-4" />
            <div className="flex-1">
              <h3 className="text-lg font-semibold text-red-900">Kunde inte ladda analysdata</h3>
              <p className="text-red-700 mt-1">{error}</p>
            </div>
            <button 
              onClick={loadAnalyticsData}
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
          <h1 className="text-3xl font-bold text-gray-900 flex items-center">
            <BarChart3 className="w-8 h-8 mr-3 text-blue-600" />
            Analys & Rapporter
          </h1>
          <p className="mt-2 text-gray-600">Detaljerad analys av försäljning, leads, kunder och team</p>
        </div>
        <div className="mt-4 sm:mt-0 flex items-center space-x-3">
          <button
            onClick={loadAnalyticsData}
            className="inline-flex items-center px-3 py-2 border border-gray-300 rounded-md shadow-sm text-sm font-medium text-gray-700 bg-white hover:bg-gray-50"
          >
            <RefreshCw className="w-4 h-4 mr-2" />
            Uppdatera
          </button>
          <button
            onClick={() => exportReport(activeTab)}
            className="inline-flex items-center px-4 py-2 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-blue-600 hover:bg-blue-700"
          >
            <Download className="w-4 h-4 mr-2" />
            Exportera
          </button>
        </div>
      </div>

      {/* Date Range Filter */}
      <div className="bg-white rounded-lg shadow-sm border p-4">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between">
          <div className="flex items-center space-x-4">
            <Calendar className="w-5 h-5 text-gray-400" />
            <span className="text-sm font-medium text-gray-700">Tidsperiod:</span>
            <div className="flex space-x-2">
              {[
                { key: 'last7days', label: '7 dagar' },
                { key: 'last30days', label: '30 dagar' },
                { key: 'last3months', label: '3 månader' },
                { key: 'last6months', label: '6 månader' },
                { key: 'lastyear', label: '1 år' }
              ].map((period) => (
                <button
                  key={period.key}
                  onClick={() => handleDateRangeChange(period.key as DateRange['preset'])}
                  className={`px-3 py-1 text-sm rounded-md ${
                    dateRange.preset === period.key
                      ? 'bg-blue-100 text-blue-700 border border-blue-300'
                      : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                  }`}
                >
                  {period.label}
                </button>
              ))}
            </div>
          </div>
          <div className="mt-4 sm:mt-0 flex items-center space-x-3">
            <input
              type="date"
              value={dateRange.startDate}
              onChange={(e) => setDateRange(prev => ({ ...prev, startDate: e.target.value, preset: 'custom' }))}
              className="px-3 py-1 text-sm border border-gray-300 rounded-md focus:ring-blue-500 focus:border-blue-500"
            />
            <span className="text-gray-500">till</span>
            <input
              type="date"
              value={dateRange.endDate}
              onChange={(e) => setDateRange(prev => ({ ...prev, endDate: e.target.value, preset: 'custom' }))}
              className="px-3 py-1 text-sm border border-gray-300 rounded-md focus:ring-blue-500 focus:border-blue-500"
            />
          </div>
        </div>
      </div>

      {/* Tab Navigation */}
      <div className="border-b border-gray-200">
        <nav className="flex space-x-8">
          {[
            { id: 'sales', label: 'Försäljning', icon: TrendingUp },
            { id: 'leads', label: 'Leads', icon: Target },
            { id: 'customers', label: 'Kunder', icon: Users },
            { id: 'financial', label: 'Ekonomi', icon: DollarSign },
            { id: 'team', label: 'Team', icon: Activity }
          ].map((tab) => {
            const Icon = tab.icon;
            return (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id as any)}
                className={`py-4 px-1 border-b-2 font-medium text-sm flex items-center ${
                  activeTab === tab.id
                    ? 'border-blue-500 text-blue-600'
                    : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                }`}
              >
                <Icon className="w-4 h-4 mr-2" />
                {tab.label}
              </button>
            );
          })}
        </nav>
      </div>

      {/* Sales Analytics */}
      {activeTab === 'sales' && (
        <div className="space-y-6">
          {/* KPI Cards */}
          <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
            <div className="bg-white rounded-lg shadow-sm border p-6">
              <div className="flex items-center">
                <div className="w-12 h-12 bg-green-100 rounded-lg flex items-center justify-center">
                  <DollarSign className="w-6 h-6 text-green-600" />
                </div>
                <div className="ml-4">
                  <p className="text-sm font-medium text-gray-500">Total Intäkter</p>
                  <p className="text-2xl font-bold text-gray-900">
                    {formatCurrency(analyticsData.salesTrends.reduce((sum, item) => sum + item.intäkter, 0))}
                  </p>
                </div>
              </div>
            </div>

            <div className="bg-white rounded-lg shadow-sm border p-6">
              <div className="flex items-center">
                <div className="w-12 h-12 bg-blue-100 rounded-lg flex items-center justify-center">
                  <Target className="w-6 h-6 text-blue-600" />
                </div>
                <div className="ml-4">
                  <p className="text-sm font-medium text-gray-500">Antal Affärer</p>
                  <p className="text-2xl font-bold text-gray-900">
                    {analyticsData.salesTrends.reduce((sum, item) => sum + item.affärer, 0)}
                  </p>
                </div>
              </div>
            </div>

            <div className="bg-white rounded-lg shadow-sm border p-6">
              <div className="flex items-center">
                <div className="w-12 h-12 bg-purple-100 rounded-lg flex items-center justify-center">
                  <BarChart3 className="w-6 h-6 text-purple-600" />
                </div>
                <div className="ml-4">
                  <p className="text-sm font-medium text-gray-500">Genomsnittlig Affär</p>
                  <p className="text-2xl font-bold text-gray-900">
                    {formatCurrency(
                      analyticsData.salesTrends.reduce((sum, item) => sum + item.genomsnittligAffär, 0) / 
                      analyticsData.salesTrends.length
                    )}
                  </p>
                </div>
              </div>
            </div>

            <div className="bg-white rounded-lg shadow-sm border p-6">
              <div className="flex items-center">
                <div className="w-12 h-12 bg-orange-100 rounded-lg flex items-center justify-center">
                  <Clock className="w-6 h-6 text-orange-600" />
                </div>
                <div className="ml-4">
                  <p className="text-sm font-medium text-gray-500">Pipeline Hastighet</p>
                  <p className="text-2xl font-bold text-gray-900">14 dagar</p>
                </div>
              </div>
            </div>
          </div>

          {/* Revenue Trends Chart */}
          <div className="bg-white rounded-lg shadow-sm border p-6">
            <h3 className="text-lg font-semibold text-gray-900 mb-4">Intäktsutveckling över tid</h3>
            <ResponsiveContainer width="100%" height={400}>
              <ComposedChart data={analyticsData.salesTrends}>
                <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
                <XAxis dataKey="månad" stroke="#6b7280" fontSize={12} />
                <YAxis stroke="#6b7280" fontSize={12} tickFormatter={(value) => `${Math.round(value / 1000)}k`} />
                <Tooltip content={<CustomTooltip />} />
                <Legend />
                <Bar dataKey="intäkter" fill="#2563EB" name="Intäkter" />
                <Line type="monotone" dataKey="målIntäkter" stroke="#EF4444" strokeWidth={2} name="Mål" strokeDasharray="5 5" />
                <Line type="monotone" dataKey="genomsnittligAffär" stroke="#10B981" strokeWidth={2} name="Genomsnittlig Affär" />
              </ComposedChart>
            </ResponsiveContainer>
          </div>

          {/* Sales by Team Member */}
          <div className="bg-white rounded-lg shadow-sm border p-6">
            <h3 className="text-lg font-semibold text-gray-900 mb-4">Försäljning per teammedlem</h3>
            <ResponsiveContainer width="100%" height={300}>
              <RechartsBarChart data={analyticsData.teamPerformance}>
                <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
                <XAxis dataKey="namn" stroke="#6b7280" fontSize={12} />
                <YAxis stroke="#6b7280" fontSize={12} tickFormatter={(value) => `${Math.round(value / 1000)}k`} />
                <Tooltip content={<CustomTooltip />} />
                <Bar dataKey="intäkter" fill="#8B5CF6" name="Intäkter" />
              </RechartsBarChart>
            </ResponsiveContainer>
          </div>
        </div>
      )}

      {/* Lead Analytics */}
      {activeTab === 'leads' && (
        <div className="space-y-6">
          {/* Lead Source Performance */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <div className="bg-white rounded-lg shadow-sm border p-6">
              <h3 className="text-lg font-semibold text-gray-900 mb-4">Lead-källor prestanda</h3>
              <ResponsiveContainer width="100%" height={300}>
                <RechartsPieChart>
                  <Pie
                    data={analyticsData.leadAnalytics}
                    cx="50%"
                    cy="50%"
                    outerRadius={100}
                    fill="#8884d8"
                    dataKey="leads"
                    label={({ källa, percent }) => `${källa} ${(percent * 100).toFixed(0)}%`}
                  >
                    {analyticsData.leadAnalytics.map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                    ))}
                  </Pie>
                  <Tooltip />
                </RechartsPieChart>
              </ResponsiveContainer>
            </div>

            <div className="bg-white rounded-lg shadow-sm border p-6">
              <h3 className="text-lg font-semibold text-gray-900 mb-4">Konverteringsgrad per källa</h3>
              <ResponsiveContainer width="100%" height={300}>
                <RechartsBarChart data={analyticsData.leadAnalytics}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
                  <XAxis dataKey="källa" stroke="#6b7280" fontSize={12} angle={-45} textAnchor="end" height={80} />
                  <YAxis stroke="#6b7280" fontSize={12} />
                  <Tooltip formatter={(value) => [`${value}%`, 'Konverteringsgrad']} />
                  <Bar dataKey="konverteringsgrad" fill="#10B981" />
                </RechartsBarChart>
              </ResponsiveContainer>
            </div>
          </div>

          {/* Lead Analytics Table */}
          <div className="bg-white rounded-lg shadow-sm border overflow-hidden">
            <div className="px-6 py-4 border-b border-gray-200">
              <h3 className="text-lg font-semibold text-gray-900">Detaljerad lead-analys</h3>
            </div>
            <div className="overflow-x-auto">
              <table className="min-w-full divide-y divide-gray-200">
                <thead className="bg-gray-50">
                  <tr>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Källa</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Leads</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Konverteringar</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Konverteringsgrad</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Svarstid (tim)</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Kostnad/Lead</th>
                  </tr>
                </thead>
                <tbody className="bg-white divide-y divide-gray-200">
                  {analyticsData.leadAnalytics.map((item, index) => (
                    <tr key={index}>
                      <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">{item.källa}</td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">{item.leads}</td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">{item.konverteringar}</td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                        <span className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full ${
                          item.konverteringsgrad >= 25 ? 'bg-green-100 text-green-800' :
                          item.konverteringsgrad >= 15 ? 'bg-yellow-100 text-yellow-800' :
                          'bg-red-100 text-red-800'
                        }`}>
                          {item.konverteringsgrad}%
                        </span>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">{item.genomsnittligSvarstid}</td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">{formatCurrency(item.kostnadPerLead)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* Customer Analytics */}
      {activeTab === 'customers' && (
        <div className="space-y-6">
          {/* Customer Metrics Cards */}
          <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
            <div className="bg-white rounded-lg shadow-sm border p-6">
              <div className="flex items-center">
                <div className="w-12 h-12 bg-blue-100 rounded-lg flex items-center justify-center">
                  <Users className="w-6 h-6 text-blue-600" />
                </div>
                <div className="ml-4">
                  <p className="text-sm font-medium text-gray-500">Totalt Kunder</p>
                  <p className="text-2xl font-bold text-gray-900">
                    {analyticsData.customerMetrics.reduce((sum, item) => sum + item.antal, 0)}
                  </p>
                </div>
              </div>
            </div>

            <div className="bg-white rounded-lg shadow-sm border p-6">
              <div className="flex items-center">
                <div className="w-12 h-12 bg-green-100 rounded-lg flex items-center justify-center">
                  <DollarSign className="w-6 h-6 text-green-600" />
                </div>
                <div className="ml-4">
                  <p className="text-sm font-medium text-gray-500">Genomsnittligt CLV</p>
                  <p className="text-2xl font-bold text-gray-900">
                    {formatCurrency(
                      analyticsData.customerMetrics.reduce((sum, item) => sum + item.livstidsvärde, 0) / 
                      analyticsData.customerMetrics.length
                    )}
                  </p>
                </div>
              </div>
            </div>

            <div className="bg-white rounded-lg shadow-sm border p-6">
              <div className="flex items-center">
                <div className="w-12 h-12 bg-purple-100 rounded-lg flex items-center justify-center">
                  <RefreshCw className="w-6 h-6 text-purple-600" />
                </div>
                <div className="ml-4">
                  <p className="text-sm font-medium text-gray-500">Återkommande Kunder</p>
                  <p className="text-2xl font-bold text-gray-900">73%</p>
                </div>
              </div>
            </div>

            <div className="bg-white rounded-lg shadow-sm border p-6">
              <div className="flex items-center">
                <div className="w-12 h-12 bg-yellow-100 rounded-lg flex items-center justify-center">
                  <Star className="w-6 h-6 text-yellow-600" />
                </div>
                <div className="ml-4">
                  <p className="text-sm font-medium text-gray-500">Genomsnittlig Nöjdhet</p>
                  <p className="text-2xl font-bold text-gray-900">4.2/5</p>
                </div>
              </div>
            </div>
          </div>

          {/* Customer Segmentation */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <div className="bg-white rounded-lg shadow-sm border p-6">
              <h3 className="text-lg font-semibold text-gray-900 mb-4">Kundsegmentering</h3>
              <ResponsiveContainer width="100%" height={300}>
                <RechartsPieChart>
                  <Pie
                    data={analyticsData.customerMetrics}
                    cx="50%"
                    cy="50%"
                    outerRadius={100}
                    fill="#8884d8"
                    dataKey="antal"
                    label={({ segment, percent }) => `${segment} ${(percent * 100).toFixed(0)}%`}
                  >
                    {analyticsData.customerMetrics.map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                    ))}
                  </Pie>
                  <Tooltip />
                </RechartsPieChart>
              </ResponsiveContainer>
            </div>

            <div className="bg-white rounded-lg shadow-sm border p-6">
              <h3 className="text-lg font-semibold text-gray-900 mb-4">Livstidsvärde per segment</h3>
              <ResponsiveContainer width="100%" height={300}>
                <RechartsBarChart data={analyticsData.customerMetrics}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
                  <XAxis dataKey="segment" stroke="#6b7280" fontSize={12} angle={-45} textAnchor="end" height={80} />
                  <YAxis stroke="#6b7280" fontSize={12} tickFormatter={(value) => `${Math.round(value / 1000)}k`} />
                  <Tooltip content={<CustomTooltip />} />
                  <Bar dataKey="livstidsvärde" fill="#06B6D4" name="Livstidsvärde" />
                </RechartsBarChart>
              </ResponsiveContainer>
            </div>
          </div>

          {/* Customer Details Table */}
          <div className="bg-white rounded-lg shadow-sm border overflow-hidden">
            <div className="px-6 py-4 border-b border-gray-200">
              <h3 className="text-lg font-semibold text-gray-900">Detaljerad kundanalys</h3>
            </div>
            <div className="overflow-x-auto">
              <table className="min-w-full divide-y divide-gray-200">
                <thead className="bg-gray-50">
                  <tr>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Segment</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Antal</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Genomsnittligt Värde</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Livstidsvärde</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Nöjdhet</th>
                  </tr>
                </thead>
                <tbody className="bg-white divide-y divide-gray-200">
                  {analyticsData.customerMetrics.map((item, index) => (
                    <tr key={index}>
                      <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">{item.segment}</td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">{item.antal}</td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">{formatCurrency(item.genomsnittligVärde)}</td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">{formatCurrency(item.livstidsvärde)}</td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                        <div className="flex items-center">
                          {Array.from({ length: 5 }, (_, i) => (
                            <Star
                              key={i}
                              className={`w-4 h-4 ${
                                i < item.nöjdhet ? 'text-yellow-400 fill-current' : 'text-gray-300'
                              }`}
                            />
                          ))}
                          <span className="ml-2 text-sm text-gray-600">{item.nöjdhet}/5</span>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* Financial Reports */}
      {activeTab === 'financial' && (
        <div className="space-y-6">
          {/* Financial KPIs */}
          <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
            <div className="bg-white rounded-lg shadow-sm border p-6">
              <div className="flex items-center">
                <div className="w-12 h-12 bg-green-100 rounded-lg flex items-center justify-center">
                  <DollarSign className="w-6 h-6 text-green-600" />
                </div>
                <div className="ml-4">
                  <p className="text-sm font-medium text-gray-500">Total Intäkter</p>
                  <p className="text-2xl font-bold text-gray-900">
                    {formatCurrency(analyticsData.financialData.reduce((sum, item) => sum + item.intäkter, 0))}
                  </p>
                </div>
              </div>
            </div>

            <div className="bg-white rounded-lg shadow-sm border p-6">
              <div className="flex items-center">
                <div className="w-12 h-12 bg-blue-100 rounded-lg flex items-center justify-center">
                  <TrendingUp className="w-6 h-6 text-blue-600" />
                </div>
                <div className="ml-4">
                  <p className="text-sm font-medium text-gray-500">Total Vinst</p>
                  <p className="text-2xl font-bold text-gray-900">
                    {formatCurrency(analyticsData.financialData.reduce((sum, item) => sum + item.vinst, 0))}
                  </p>
                </div>
              </div>
            </div>

            <div className="bg-white rounded-lg shadow-sm border p-6">
              <div className="flex items-center">
                <div className="w-12 h-12 bg-purple-100 rounded-lg flex items-center justify-center">
                  <BarChart3 className="w-6 h-6 text-purple-600" />
                </div>
                <div className="ml-4">
                  <p className="text-sm font-medium text-gray-500">Vinstmarginal</p>
                  <p className="text-2xl font-bold text-gray-900">
                    {Math.round(
                      analyticsData.financialData.reduce((sum, item) => sum + item.vinstmarginal, 0) / 
                      analyticsData.financialData.length
                    )}%
                  </p>
                </div>
              </div>
            </div>

            <div className="bg-white rounded-lg shadow-sm border p-6">
              <div className="flex items-center">
                <div className="w-12 h-12 bg-red-100 rounded-lg flex items-center justify-center">
                  <FileText className="w-6 h-6 text-red-600" />
                </div>
                <div className="ml-4">
                  <p className="text-sm font-medium text-gray-500">Utestående</p>
                  <p className="text-2xl font-bold text-gray-900">
                    {formatCurrency(analyticsData.financialData.reduce((sum, item) => sum + item.utestående, 0))}
                  </p>
                </div>
              </div>
            </div>
          </div>

          {/* Revenue vs Profit Chart */}
          <div className="bg-white rounded-lg shadow-sm border p-6">
            <h3 className="text-lg font-semibold text-gray-900 mb-4">Intäkter vs Vinst över tid</h3>
            <ResponsiveContainer width="100%" height={400}>
              <ComposedChart data={analyticsData.financialData}>
                <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
                <XAxis dataKey="månad" stroke="#6b7280" fontSize={12} />
                <YAxis stroke="#6b7280" fontSize={12} tickFormatter={(value) => `${Math.round(value / 1000)}k`} />
                <Tooltip content={<CustomTooltip />} />
                <Legend />
                <Bar dataKey="intäkter" fill="#2563EB" name="Intäkter" />
                <Bar dataKey="kostnader" fill="#EF4444" name="Kostnader" />
                <Line type="monotone" dataKey="vinst" stroke="#10B981" strokeWidth={3} name="Vinst" />
              </ComposedChart>
            </ResponsiveContainer>
          </div>

          {/* Cash Flow Chart */}
          <div className="bg-white rounded-lg shadow-sm border p-6">
            <h3 className="text-lg font-semibold text-gray-900 mb-4">Kassaflöde och utestående fakturor</h3>
            <ResponsiveContainer width="100%" height={300}>
              <AreaChart data={analyticsData.financialData}>
                <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
                <XAxis dataKey="månad" stroke="#6b7280" fontSize={12} />
                <YAxis stroke="#6b7280" fontSize={12} tickFormatter={(value) => `${Math.round(value / 1000)}k`} />
                <Tooltip content={<CustomTooltip />} />
                <Legend />
                <Area type="monotone" dataKey="kassaflöde" stackId="1" stroke="#06B6D4" fill="#06B6D4" fillOpacity={0.6} name="Kassaflöde" />
                <Area type="monotone" dataKey="utestående" stackId="2" stroke="#F59E0B" fill="#F59E0B" fillOpacity={0.6} name="Utestående" />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        </div>
      )}

      {/* Team Performance */}
      {activeTab === 'team' && (
        <div className="space-y-6">
          {/* Team Performance Overview */}
          <div className="bg-white rounded-lg shadow-sm border overflow-hidden">
            <div className="px-6 py-4 border-b border-gray-200">
              <h3 className="text-lg font-semibold text-gray-900">Teamprestation översikt</h3>
            </div>
            <div className="overflow-x-auto">
              <table className="min-w-full divide-y divide-gray-200">
                <thead className="bg-gray-50">
                  <tr>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Namn</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Leads</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Affärer</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Intäkter</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Konvertering</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Affärstid</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Kundnöjdhet</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Måluppfyllelse</th>
                  </tr>
                </thead>
                <tbody className="bg-white divide-y divide-gray-200">
                  {analyticsData.teamPerformance.map((member, index) => (
                    <tr key={index}>
                      <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">{member.namn}</td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">{member.leads}</td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">{member.affärer}</td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">{formatCurrency(member.intäkter)}</td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                        <span className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full ${
                          member.konverteringsgrad >= 25 ? 'bg-green-100 text-green-800' :
                          member.konverteringsgrad >= 15 ? 'bg-yellow-100 text-yellow-800' :
                          'bg-red-100 text-red-800'
                        }`}>
                          {member.konverteringsgrad}%
                        </span>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">{member.genomsnittligAffärstid} dagar</td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                        <div className="flex items-center">
                          <Star className="w-4 h-4 text-yellow-400 fill-current mr-1" />
                          {member.kundnöjdhet}
                        </div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                        <div className="flex items-center">
                          <div className="w-full bg-gray-200 rounded-full h-2 mr-2">
                            <div 
                              className={`h-2 rounded-full ${
                                member.måluppfyllelse >= 90 ? 'bg-green-500' :
                                member.måluppfyllelse >= 70 ? 'bg-yellow-500' :
                                'bg-red-500'
                              }`}
                              style={{ width: `${Math.min(member.måluppfyllelse, 100)}%` }}
                            ></div>
                          </div>
                          <span className="text-xs text-gray-600">{member.måluppfyllelse}%</span>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>

          {/* Team Performance Charts */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <div className="bg-white rounded-lg shadow-sm border p-6">
              <h3 className="text-lg font-semibold text-gray-900 mb-4">Intäkter per teammedlem</h3>
              <ResponsiveContainer width="100%" height={300}>
                <RechartsBarChart data={analyticsData.teamPerformance}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
                  <XAxis dataKey="namn" stroke="#6b7280" fontSize={12} angle={-45} textAnchor="end" height={80} />
                  <YAxis stroke="#6b7280" fontSize={12} tickFormatter={(value) => `${Math.round(value / 1000)}k`} />
                  <Tooltip content={<CustomTooltip />} />
                  <Bar dataKey="intäkter" fill="#2563EB" name="Intäkter" />
                </RechartsBarChart>
              </ResponsiveContainer>
            </div>

            <div className="bg-white rounded-lg shadow-sm border p-6">
              <h3 className="text-lg font-semibold text-gray-900 mb-4">Konverteringsgrad per teammedlem</h3>
              <ResponsiveContainer width="100%" height={300}>
                <RechartsBarChart data={analyticsData.teamPerformance}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
                  <XAxis dataKey="namn" stroke="#6b7280" fontSize={12} angle={-45} textAnchor="end" height={80} />
                  <YAxis stroke="#6b7280" fontSize={12} />
                  <Tooltip formatter={(value) => [`${value}%`, 'Konverteringsgrad']} />
                  <Bar dataKey="konverteringsgrad" fill="#10B981" />
                </RechartsBarChart>
              </ResponsiveContainer>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

export default Analytics;