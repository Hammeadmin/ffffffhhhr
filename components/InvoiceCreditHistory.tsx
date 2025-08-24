import React, { useState, useEffect } from 'react';
import {
  FileText,
  AlertTriangle,
  Calendar,
  User,
  Eye,
  X,
  ExternalLink,
  RefreshCw
} from 'lucide-react';
import {
  getInvoiceCreditNotes,
  type CreditNote
} from '../lib/creditNotes';
import { formatCurrency, formatDate } from '../lib/database';
import LoadingSpinner from './LoadingSpinner';
import CreditNotePreview from './CreditNotePreview';
import type { InvoiceWithRelations } from '../lib/invoices';

interface InvoiceCreditHistoryProps {
  invoice: InvoiceWithRelations;
  className?: string;
}

function InvoiceCreditHistory({ invoice, className = '' }: InvoiceCreditHistoryProps) {
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [creditNotes, setCreditNotes] = useState<CreditNote[]>([]);
  const [showPreview, setShowPreview] = useState<CreditNote | null>(null);

  useEffect(() => {
    loadCreditNotes();
  }, [invoice.id]);

  const loadCreditNotes = async () => {
    try {
      setLoading(true);
      setError(null);

      const result = await getInvoiceCreditNotes(invoice.id);
      if (result.error) {
        setError(result.error.message);
        return;
      }

      setCreditNotes(result.data || []);
    } catch (err) {
      console.error('Error loading credit notes:', err);
      setError('Ett oväntat fel inträffade vid laddning av kredithistorik.');
    } finally {
      setLoading(false);
    }
  };

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

  const totalCredited = creditNotes.reduce((sum, cn) => sum + Math.abs(cn.amount), 0);
  const remainingAmount = Math.abs(invoice.amount) - totalCredited;

  if (loading) {
    return (
      <div className={`bg-white rounded-lg border p-4 ${className}`}>
        <LoadingSpinner size="sm" text="Laddar kredithistorik..." />
      </div>
    );
  }

  return (
    <div className={`bg-white rounded-lg border ${className}`}>
      <div className="p-4 border-b border-gray-200">
        <div className="flex items-center justify-between">
          <h4 className="font-medium text-gray-900 flex items-center">
            <FileText className="w-4 h-4 mr-2 text-red-600" />
            Kredithistorik
          </h4>
          <button
            onClick={loadCreditNotes}
            className="text-gray-400 hover:text-gray-600"
            title="Uppdatera"
          >
            <RefreshCw className="w-4 h-4" />
          </button>
        </div>
      </div>

      <div className="p-4">
        {error && (
          <div className="mb-4 bg-red-50 border border-red-200 rounded-lg p-3">
            <div className="flex items-center">
              <AlertTriangle className="w-4 h-4 text-red-600 mr-2" />
              <p className="text-sm text-red-700">{error}</p>
            </div>
          </div>
        )}

        {/* Credit Summary */}
        <div className="mb-4 p-3 bg-gray-50 rounded-lg">
          <div className="grid grid-cols-3 gap-4 text-center">
            <div>
              <p className="text-xs font-medium text-gray-500 uppercase">Ursprungligt belopp</p>
              <p className="text-sm font-bold text-gray-900">{formatCurrency(invoice.amount)}</p>
            </div>
            <div>
              <p className="text-xs font-medium text-gray-500 uppercase">Totalt krediterat</p>
              <p className="text-sm font-bold text-red-600">{formatCurrency(totalCredited)}</p>
            </div>
            <div>
              <p className="text-xs font-medium text-gray-500 uppercase">Kvarvarande belopp</p>
              <p className="text-sm font-bold text-gray-900">{formatCurrency(remainingAmount)}</p>
            </div>
          </div>
        </div>

        {creditNotes.length === 0 ? (
          <div className="text-center py-6 text-gray-500">
            <FileText className="w-8 h-8 mx-auto mb-2 text-gray-400" />
            <p className="text-sm">Inga kreditfakturor för denna faktura</p>
          </div>
        ) : (
          <div className="space-y-3">
            {creditNotes.map((creditNote) => (
              <div key={creditNote.id} className="border border-red-200 rounded-lg p-3 bg-red-50">
                <div className="flex items-center justify-between mb-2">
                  <div className="flex items-center space-x-2">
                    <FileText className="w-4 h-4 text-red-600" />
                    <span className="text-sm font-medium text-gray-900">
                      {creditNote.credit_note_number}
                    </span>
                    <span className={`inline-flex px-2 py-1 text-xs font-medium rounded-full ${getStatusColor(creditNote.status)}`}>
                      {getStatusLabel(creditNote.status)}
                    </span>
                  </div>
                  <button
                    onClick={() => setShowPreview(creditNote)}
                    className="text-gray-400 hover:text-blue-600"
                    title="Förhandsgranska"
                  >
                    <Eye className="w-4 h-4" />
                  </button>
                </div>
                
                <div className="grid grid-cols-2 gap-4 text-sm">
                  <div>
                    <span className="font-medium text-gray-700">Anledning:</span>
                    <p className="text-gray-600">{creditNote.credit_reason}</p>
                  </div>
                  <div>
                    <span className="font-medium text-gray-700">Kreditbelopp:</span>
                    <p className="font-bold text-red-600">{formatCurrency(creditNote.amount)}</p>
                  </div>
                </div>
                
                <div className="flex items-center justify-between mt-2 text-xs text-gray-500">
                  <div className="flex items-center">
                    <Calendar className="w-3 h-3 mr-1" />
                    {formatDate(creditNote.created_at)}
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

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

            <div className="flex justify-end p-6 border-t">
              <button
                onClick={() => setShowPreview(null)}
                className="px-4 py-2 border border-gray-300 rounded-md text-sm font-medium text-gray-700 bg-white hover:bg-gray-50"
              >
                Stäng
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

export default InvoiceCreditHistory;