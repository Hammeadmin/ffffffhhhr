import React, { useState, useEffect } from 'react';
import {
  Calculator,
  Download,
  Calendar,
  User,
  Building,
  FileText,
  Filter,
  RefreshCw,
  AlertTriangle,
  TrendingUp,
  BarChart3
} from 'lucide-react';
import { getROTReport, getROTSummary, formatROTAmount } from '../lib/rot';
import { formatCurrency, formatDate } from '../lib/database';
import { useAuth } from '../contexts/AuthContext';
import { getUserProfiles } from '../lib/database';
import LoadingSpinner from './LoadingSpinner';
import ExportButton from './ExportButton';

function ROTReport() {
  const { user } = useAuth();
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [rotData, setRotData] = useState<any[]>([]);
  const [summary, setSummary] = useState<any>(null);
  const [userProfile, setUserProfile] = useState<any>(null);
  const [selectedYear, setSelectedYear] = useState<number>(new Date().getFullYear());

  useEffect(() => {
    if (user) {
      loadData();
    }
  }, [user, selectedYear]);

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

      // Load ROT data and summary
      const [reportResult, summaryResult] = await Promise.all([
        getROTReport(profile.organisation_id, selectedYear),
        getROTSummary(profile.organisation_id, selectedYear)
      ]);

      if (reportResult.error) {
        setError(reportResult.error.message);
        return;
      }

      if (summaryResult.error) {
        setError(summaryResult.error.message);
        return;
      }

      setRotData(reportResult.data || []);
      setSummary(summaryResult.data);
    } catch (err) {
      console.error('Error loading ROT data:', err);
      setError('Ett oväntat fel inträffade vid laddning av ROT-data.');
    } finally {
      setLoading(false);
    }
  };

  const generateROTExport = () => {
    const exportData = rotData.map(item => ({
      'Fakturanummer': item.invoice_number,
      'Datum': formatDate(item.created_at),
      'Kund': item.customer_name,
      'Personnummer': item.rot_personnummer || '',
      'Organisationsnummer': item.rot_organisationsnummer || '',
      'Fastighetsbeteckning': item.rot_fastighetsbeteckning || '',
      'Fakturabelopp': item.amount,
      'ROT-avdrag': item.rot_amount,
      'Nettosumma': item.amount - item.rot_amount,
      'Adress': `${item.address || ''} ${item.postal_code || ''} ${item.city || ''}`.trim()
    }));

    return exportData;
  };

  const availableYears = Array.from(
    { length: 5 }, 
    (_, i) => new Date().getFullYear() - i
  );

  if (loading) {
    return (
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <h2 className="text-2xl font-bold text-gray-900">ROT-rapport</h2>
          <LoadingSpinner />
        </div>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          {[1, 2, 3].map(i => (
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
          <h2 className="text-2xl font-bold text-gray-900 flex items-center">
            <Calculator className="w-7 h-7 mr-3 text-green-600" />
            ROT-rapport
          </h2>
          <p className="mt-2 text-gray-600">
            Översikt över ROT-avdrag för skattedeklaration och rapportering
          </p>
        </div>
        <div className="mt-4 sm:mt-0 flex items-center space-x-3">
          <select
            value={selectedYear}
            onChange={(e) => setSelectedYear(parseInt(e.target.value))}
            className="px-3 py-2 border border-gray-300 rounded-md focus:ring-blue-500 focus:border-blue-500"
          >
            {availableYears.map(year => (
              <option key={year} value={year}>{year}</option>
            ))}
          </select>
          <button
            onClick={loadData}
            className="inline-flex items-center px-3 py-2 border border-gray-300 rounded-md shadow-sm text-sm font-medium text-gray-700 bg-white hover:bg-gray-50"
          >
            <RefreshCw className="w-4 h-4 mr-2" />
            Uppdatera
          </button>
          <ExportButton
            data={generateROTExport()}
            filename={`rot-rapport-${selectedYear}`}
            title="Exportera ROT-data"
          />
        </div>
      </div>

      {/* Error Display */}
      {error && (
        <div className="bg-red-50 border border-red-200 rounded-lg p-4">
          <div className="flex items-center">
            <AlertTriangle className="w-5 h-5 text-red-600 mr-2" />
            <p className="text-red-700">{error}</p>
          </div>
        </div>
      )}

      {/* Summary Cards */}
      {summary && (
        <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
          <div className="bg-white rounded-lg shadow-sm border p-6">
            <div className="flex items-center">
              <div className="w-12 h-12 bg-green-100 rounded-lg flex items-center justify-center">
                <Calculator className="w-6 h-6 text-green-600" />
              </div>
              <div className="ml-4">
                <p className="text-sm font-medium text-gray-500">Totalt ROT-avdrag</p>
                <p className="text-2xl font-bold text-green-600">
                  {formatROTAmount(summary.totalROTAmount)}
                </p>
              </div>
            </div>
          </div>

          <div className="bg-white rounded-lg shadow-sm border p-6">
            <div className="flex items-center">
              <div className="w-12 h-12 bg-blue-100 rounded-lg flex items-center justify-center">
                <FileText className="w-6 h-6 text-blue-600" />
              </div>
              <div className="ml-4">
                <p className="text-sm font-medium text-gray-500">Antal fakturor</p>
                <p className="text-2xl font-bold text-gray-900">{summary.totalInvoices}</p>
              </div>
            </div>
          </div>

          <div className="bg-white rounded-lg shadow-sm border p-6">
            <div className="flex items-center">
              <div className="w-12 h-12 bg-purple-100 rounded-lg flex items-center justify-center">
                <User className="w-6 h-6 text-purple-600" />
              </div>
              <div className="ml-4">
                <p className="text-sm font-medium text-gray-500">Privatpersoner</p>
                <p className="text-2xl font-bold text-gray-900">
                  {formatROTAmount(summary.rotByCustomerType.privatpersoner)}
                </p>
              </div>
            </div>
          </div>

          <div className="bg-white rounded-lg shadow-sm border p-6">
            <div className="flex items-center">
              <div className="w-12 h-12 bg-orange-100 rounded-lg flex items-center justify-center">
                <Building className="w-6 h-6 text-orange-600" />
              </div>
              <div className="ml-4">
                <p className="text-sm font-medium text-gray-500">Företag</p>
                <p className="text-2xl font-bold text-gray-900">
                  {formatROTAmount(summary.rotByCustomerType.företag)}
                </p>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ROT Data Table */}
      <div className="bg-white rounded-lg shadow-sm border">
        <div className="px-6 py-4 border-b border-gray-200">
          <div className="flex items-center justify-between">
            <h3 className="text-lg font-semibold text-gray-900">ROT-avdrag {selectedYear}</h3>
            <span className="text-sm text-gray-500">{rotData.length} fakturor</span>
          </div>
        </div>

        {rotData.length === 0 ? (
          <div className="p-8 text-center text-gray-500">
            <Calculator className="w-12 h-12 mx-auto mb-3 text-gray-400" />
            <p className="font-medium">Inga ROT-avdrag för {selectedYear}</p>
            <p className="text-sm mt-1">ROT-avdrag visas här när fakturor med ROT-information skapas</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-gray-200">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Faktura
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Kund
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    ROT-uppgifter
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Fastighetsbeteckning
                  </th>
                  <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Fakturabelopp
                  </th>
                  <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                    ROT-avdrag
                  </th>
                  <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Nettosumma
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Datum
                  </th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {rotData.map((item) => (
                  <tr key={item.id} className="hover:bg-gray-50">
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="flex items-center">
                        <FileText className="w-4 h-4 text-blue-600 mr-2" />
                        <span className="text-sm font-medium text-gray-900">
                          {item.invoice_number}
                        </span>
                      </div>
                    </td>
                    <td className="px-6 py-4">
                      <div>
                        <p className="text-sm font-medium text-gray-900">{item.customer_name}</p>
                        <p className="text-sm text-gray-600">
                          {item.address && `${item.address}, ${item.postal_code} ${item.city}`}
                        </p>
                      </div>
                    </td>
                    <td className="px-6 py-4">
                      <div className="flex items-center">
                        {item.rot_personnummer ? (
                          <>
                            <User className="w-4 h-4 text-purple-600 mr-2" />
                            <span className="text-sm text-gray-900">{item.rot_personnummer}</span>
                          </>
                        ) : item.rot_organisationsnummer ? (
                          <>
                            <Building className="w-4 h-4 text-blue-600 mr-2" />
                            <span className="text-sm text-gray-900">{item.rot_organisationsnummer}</span>
                          </>
                        ) : (
                          <span className="text-sm text-gray-400">Ej angivet</span>
                        )}
                      </div>
                    </td>
                    <td className="px-6 py-4 text-sm text-gray-900">
                      {item.rot_fastighetsbeteckning || '-'}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-right text-sm text-gray-900">
                      {formatCurrency(item.amount)}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium text-green-600">
                      {formatROTAmount(item.rot_amount)}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-bold text-gray-900">
                      {formatROTAmount(item.amount - item.rot_amount)}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-600">
                      <div className="flex items-center">
                        <Calendar className="w-3 h-3 mr-1" />
                        {formatDate(item.created_at)}
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* ROT Information */}
      <div className="bg-blue-50 border border-blue-200 rounded-lg p-6">
        <h3 className="font-semibold text-blue-900 mb-3">Information om ROT-rapportering</h3>
        <div className="text-sm text-blue-800 space-y-2">
          <p>
            <strong>För Skatteverket:</strong> Denna rapport innehåller all nödvändig information för ROT-rapportering till Skatteverket.
          </p>
          <p>
            <strong>Rapporteringsperiod:</strong> ROT-avdrag ska rapporteras månadsvis till Skatteverket senast den 12:e i månaden efter utförd tjänst.
          </p>
          <p>
            <strong>Kontrolluppgifter:</strong> Kontrolluppgifter för ROT-avdrag ska lämnas senast den 31 januari året efter.
          </p>
        </div>
      </div>
    </div>
  );
}

export default ROTReport;