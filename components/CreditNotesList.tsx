import React, { useState, useEffect } from 'react';
import {
  FileText,
  Search,
  Filter,
  Eye,
  Mail,
  Download,
  RefreshCw,
  AlertTriangle,
  Calendar,
  User,
  Send,
  X,
  Building,
  ExternalLink
} from 'lucide-react';
import {
  getCreditNotes,
  getCreditNoteStats,
  updateCreditNoteStatus,
  generateCreditNoteEmailTemplate,
  type CreditNote
} from '../lib/creditNotes';
import { formatCurrency, formatDate } from '../lib/database';
import { useAuth } from '../contexts/AuthContext';
import { getUserProfiles } from '../lib/database';
import LoadingSpinner from './LoadingSpinner';
import EmptyState from './EmptyState';
import ExportButton from './ExportButton';
import CreditNotePreview from './CreditNotePreview';
import { sendCreditNoteEmail } from '../lib/creditNotes';
import { useToast } from '../hooks/useToast';

interface CreditNotesListProps {
  className?: string;
}

function CreditNotesList({ className = '' }: CreditNotesListProps) {
  const { user } = useAuth();
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [creditNotes, setCreditNotes] = useState<CreditNote[]>([]);
  const [stats, setStats] = useState<any>(null);
  const [userProfile, setUserProfile] = useState<any>(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');
  const [showPreview, setShowPreview] = useState<CreditNote | null>(null);
  const [showEmailModal, setShowEmailModal] = useState<CreditNote | null>(null);
  const [emailData, setEmailData] = useState({ subject: '', body: '' });
  const [emailLoading, setEmailLoading] = useState(false);
  const { addToast } = useToast();
  const [selectedTemplate, setSelectedTemplate] = useState<'standard' | 'explanation'>('standard');

  useEffect(() => {
    if (user) {
      loadData();
    }
  }, [user]);

 useEffect(() => {
    if (showEmailModal) {
      const template = generateCreditNoteEmailTemplate(showEmailModal, selectedTemplate);
      setEmailData({ subject: template.subject, body: template.body });
    }
}, [showEmailModal, selectedTemplate]);

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

      // Load credit notes and stats
      const [creditNotesResult, statsResult] = await Promise.all([
        getCreditNotes(profile.organisation_id),
        getCreditNoteStats(profile.organisation_id)
      ]);

      if (creditNotesResult.error) {
        setError(creditNotesResult.error.message);
        return;
      }

      if (statsResult.error) {
        setError(statsResult.error.message);
        return;
      }

      setCreditNotes(creditNotesResult.data || []);
      setStats(statsResult.data);
    } catch (err) {
      console.error('Error loading credit notes:', err);
      setError('Ett oväntat fel inträffade vid laddning av kreditfakturor.');
    } finally {
      setLoading(false);
    }
  };

  const handleSendEmail = async () => {
    if (!showEmailModal || !showEmailModal.customer?.email) return;

    setEmailLoading(true);
    const result = await sendCreditNoteEmail(showEmailModal.id, {
        recipient_email: showEmailModal.customer.email,
        subject: emailData.subject,
        email_body: emailData.body
    });

    setEmailLoading(false);

    if (result.error) {
        addToast(result.error.message, 'error');
    } else {
        addToast('Kreditfakturan har skickats!', 'success');
        setShowEmailModal(null);
        loadData();
    }
};

  const handleStatusUpdate = async (creditNoteId: string, newStatus: 'draft' | 'sent' | 'paid') => {
    try {
      const result = await updateCreditNoteStatus(creditNoteId, newStatus);
      if (result.error) {
        setError(result.error.message);
        return;
      }

      // Update local state
      setCreditNotes(prev => prev.map(cn => 
        cn.id === creditNoteId ? { ...cn, status: newStatus } : cn
      ));
    } catch (err) {
      console.error('Error updating credit note status:', err);
      setError('Ett oväntat fel inträffade vid uppdatering av status.');
    }
  };

  const filteredCreditNotes = creditNotes.filter(creditNote => {
    const matchesSearch = !searchTerm || 
      creditNote.credit_note_number?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      creditNote.customer?.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      creditNote.original_invoice?.invoice_number?.toLowerCase().includes(searchTerm.toLowerCase());

    const matchesStatus = statusFilter === 'all' || creditNote.status === statusFilter;

    return matchesSearch && matchesStatus;
  });

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'draft': return 'bg-gray-100 text-gray-800';
      case 'sent': return 'bg-blue-100 text-blue-800';
      case 'paid': return 'bg-green-100 text-green-800';
      default: return 'bg-gray-100 text-gray-800';
    }
  };

  const getStatusLabel = (status: string) => {
    switch (status) {
      case 'draft': return 'Utkast';
      case 'sent': return 'Skickad';
      case 'paid': return 'Registrerad';
      default: return status;
    }
  };

  if (loading) {
    return (
      <div className={`space-y-6 ${className}`}>
        <div className="flex items-center justify-between">
          <h2 className="text-2xl font-bold text-gray-900">Kreditfakturor</h2>
          <LoadingSpinner />
        </div>
        <div className="bg-white rounded-lg p-6">
          <LoadingSpinner size="lg" text="Laddar kreditfakturor..." />
        </div>
      </div>
    );
  }

  return (
    <div className={`space-y-6 ${className}`}>
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h2 className="text-2xl font-bold text-gray-900 flex items-center">
            <FileText className="w-7 h-7 mr-3 text-red-600" />
            Kreditfakturor
          </h2>
          <p className="mt-2 text-gray-600">
            Hantera och följ upp utfärdade kreditfakturor
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
            data={filteredCreditNotes}
            filename={`kreditfakturor-${new Date().toISOString().split('T')[0]}`}
            title="Exportera"
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

      {/* Statistics Cards */}
      {stats && (
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          <div className="bg-white rounded-lg shadow-sm border p-6">
            <div className="flex items-center">
              <div className="w-12 h-12 bg-red-100 rounded-lg flex items-center justify-center">
                <FileText className="w-6 h-6 text-red-600" />
              </div>
              <div className="ml-4">
                <p className="text-sm font-medium text-gray-500">Totalt kreditfakturor</p>
                <p className="text-2xl font-bold text-gray-900">{stats.totalCreditNotes}</p>
              </div>
            </div>
          </div>

          <div className="bg-white rounded-lg shadow-sm border p-6">
            <div className="flex items-center">
              <div className="w-12 h-12 bg-orange-100 rounded-lg flex items-center justify-center">
                <AlertTriangle className="w-6 h-6 text-orange-600" />
              </div>
              <div className="ml-4">
                <p className="text-sm font-medium text-gray-500">Totalt kreditbelopp</p>
                <p className="text-2xl font-bold text-red-600">{formatCurrency(stats.totalCreditAmount)}</p>
              </div>
            </div>
          </div>

          <div className="bg-white rounded-lg shadow-sm border p-6">
            <div className="flex items-center">
              <div className="w-12 h-12 bg-blue-100 rounded-lg flex items-center justify-center">
                <Calendar className="w-6 h-6 text-blue-600" />
              </div>
              <div className="ml-4">
                <p className="text-sm font-medium text-gray-500">Denna månad</p>
                <p className="text-2xl font-bold text-gray-900">
                  {creditNotes.filter(cn => {
                    const cnDate = new Date(cn.created_at || '');
                    const now = new Date();
                    return cnDate.getMonth() === now.getMonth() && cnDate.getFullYear() === now.getFullYear();
                  }).length}
                </p>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Filters */}
      <div className="bg-white rounded-lg shadow-sm border p-4">
        <div className="flex flex-col sm:flex-row gap-4">
          <div className="flex-1">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-4 h-4" />
              <input
                type="text"
                placeholder="Sök kreditfakturor..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-blue-500 focus:border-blue-500"
              />
            </div>
          </div>
          <div className="sm:w-48">
            <select
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-blue-500 focus:border-blue-500"
            >
              <option value="all">Alla statusar</option>
              <option value="draft">Utkast</option>
              <option value="sent">Skickad</option>
              <option value="paid">Registrerad</option>
            </select>
          </div>
        </div>
      </div>

      {/* Credit Notes List */}
      <div className="bg-white rounded-lg shadow-sm border">
        <div className="px-6 py-4 border-b border-gray-200">
          <div className="flex items-center justify-between">
            <h3 className="text-lg font-semibold text-gray-900">Kreditfakturor</h3>
            <span className="text-sm text-gray-500">{filteredCreditNotes.length} kreditfakturor</span>
          </div>
        </div>

        {filteredCreditNotes.length === 0 ? (
          <EmptyState
            type="general"
            title="Inga kreditfakturor hittades"
            description={
              searchTerm || statusFilter !== 'all'
                ? "Inga kreditfakturor matchar dina filter. Prova att ändra söktermen eller filtren."
                : "Inga kreditfakturor har skapats ännu. Kreditfakturor skapas från fakturor som behöver krediteras."
            }
            actionText={searchTerm || statusFilter !== 'all' ? "Rensa filter" : undefined}
            onAction={searchTerm || statusFilter !== 'all' ? () => {
              setSearchTerm('');
              setStatusFilter('all');
            } : undefined}
          />
        ) : (
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-gray-200">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Kreditfaktura
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Ursprunglig faktura
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Kund
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Anledning
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Kreditbelopp
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Status
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Datum
                  </th>
                  <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Åtgärder
                  </th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {filteredCreditNotes.map((creditNote) => (
                  <tr key={creditNote.id} className="hover:bg-gray-50">
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="flex items-center">
                        <FileText className="w-4 h-4 text-red-600 mr-2" />
                        <span className="text-sm font-medium text-gray-900">
                          {creditNote.credit_note_number}
                        </span>
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="flex items-center">
                        <ExternalLink className="w-3 h-3 text-gray-400 mr-2" />
                        <span className="text-sm text-gray-900">
                          {creditNote.original_invoice?.invoice_number}
                        </span>
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div>
                        <p className="text-sm font-medium text-gray-900">
                          {creditNote.customer?.name}
                        </p>
                        <p className="text-sm text-gray-600">
                          {creditNote.customer?.email}
                        </p>
                      </div>
                    </td>
                    <td className="px-6 py-4">
                      <span className="text-sm text-gray-900">
                        {creditNote.credit_reason}
                      </span>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <span className="text-sm font-bold text-red-600">
                        {formatCurrency(creditNote.amount)}
                      </span>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <select
                        value={creditNote.status}
                        onChange={(e) => handleStatusUpdate(creditNote.id, e.target.value as any)}
                        className={`text-xs font-medium rounded-full px-2 py-1 border-0 ${getStatusColor(creditNote.status)}`}
                      >
                        <option value="draft">Utkast</option>
                        <option value="sent">Skickad</option>
                        <option value="paid">Registrerad</option>
                      </select>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-600">
                      <div className="flex items-center">
                        <Calendar className="w-3 h-3 mr-1" />
                        {formatDate(creditNote.created_at)}
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-right">
                      <div className="flex items-center justify-end space-x-2">
                        <button
                          onClick={() => setShowPreview(creditNote)}
                          className="text-gray-400 hover:text-blue-600"
                          title="Förhandsgranska"
                        >
                          <Eye className="w-4 h-4" />
                        </button>
                        <button
                            onClick={() => setShowEmailModal(creditNote)}
                            disabled={!creditNote.customer?.email}
                            className="text-gray-400 hover:text-green-600 disabled:opacity-50"
                            title="Skicka e-post"
                        >
                            <Mail className="w-4 h-4" />
                        </button>
                        <button
                          onClick={() => {/* TODO: Implement PDF download */}}
                          className="text-gray-400 hover:text-purple-600"
                          title="Ladda ner PDF"
                        >
                          <Download className="w-4 h-4" />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {showEmailModal && (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
        <div className="bg-white rounded-lg max-w-2xl w-full">
            <div className="flex items-center justify-between p-6 border-b">
                <h3 className="text-lg font-semibold text-gray-900">Skicka Kreditfaktura</h3>
                <button onClick={() => setShowEmailModal(null)} className="text-gray-400 hover:text-gray-600"><X className="w-5 h-5" /></button>
            </div>
            <div className="p-6 space-y-4">
                <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Mottagare</label>
                    <input type="email" value={showEmailModal.customer?.email || ''} readOnly className="w-full px-3 py-2 border border-gray-300 rounded-md bg-gray-50" />
                </div>
              <div>
    <label htmlFor="template" className="block text-sm font-medium text-gray-700 mb-1">E-postmall</label>
    <select
        id="template"
        value={selectedTemplate}
        onChange={(e) => setSelectedTemplate(e.target.value as 'standard' | 'explanation')}
        className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500"
    >
        <option value="standard">Standard</option>
        <option value="explanation">Förklaring</option>
    </select>
</div>
                <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Ämne</label>
                    <input type="text" value={emailData.subject} onChange={e => setEmailData(d => ({ ...d, subject: e.target.value }))} className="w-full px-3 py-2 border border-gray-300 rounded-md" />
                </div>
                <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Meddelande</label>
                    <textarea value={emailData.body} onChange={e => setEmailData(d => ({ ...d, body: e.target.value }))} rows={8} className="w-full px-3 py-2 border border-gray-300 rounded-md" />
                </div>
            </div>
            <div className="flex justify-end space-x-3 p-6 border-t">
                <button onClick={() => setShowEmailModal(null)} className="px-4 py-2 border border-gray-300 rounded-md text-sm font-medium">Avbryt</button>
                <button onClick={handleSendEmail} disabled={emailLoading} className="inline-flex items-center px-4 py-2 border border-transparent rounded-md text-sm font-medium text-white bg-blue-600 hover:bg-blue-700 disabled:opacity-50">
                    {emailLoading ? <LoadingSpinner size="sm" color="white" /> : <Send className="w-4 h-4 mr-2" />}
                    Skicka
                </button>
            </div>
        </div>
    </div>
)}

      {/* Credit Note Preview Modal */}
      {showPreview && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-lg max-w-5xl w-full max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between p-6 border-b">
              <h3 className="text-lg font-semibold text-gray-900">
                Kreditfaktura: {showPreview.credit_note_number}
              </h3>
              <button
                onClick={() => setShowPreview(null)}
                className="text-gray-400 hover:text-gray-600"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="p-6">
              <CreditNotePreview creditNote={showPreview} />
            </div>

            <div className="flex justify-end space-x-3 p-6 border-t">
              <button
                onClick={() => setShowPreview(null)}
                className="px-4 py-2 border border-gray-300 rounded-md text-sm font-medium text-gray-700 bg-white hover:bg-gray-50"
              >
                Stäng
              </button>
              <button
                onClick={() => {/* TODO: Implement PDF download */}}
                className="px-4 py-2 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-blue-600 hover:bg-blue-700"
              >
                <Download className="w-4 h-4 mr-2" />
                Ladda ner PDF
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

export default CreditNotesList;