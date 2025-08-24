import React from 'react';
import { Building, Mail, Phone, AlertTriangle } from 'lucide-react';
import type { CreditNote } from '../lib/creditNotes';
import { formatCurrency, formatDate } from '../lib/database';

interface CreditNotePreviewProps {
  creditNote: CreditNote;
  logoUrl?: string | null;
  systemSettings?: { invoice_footer_text?: string | null } | null;
}

function CreditNotePreview({ creditNote, logoUrl, systemSettings }: CreditNotePreviewProps) {
  if (!creditNote) return null;

  const subtotal = Math.abs(creditNote.invoice_line_items?.reduce((sum, item) => sum + item.total, 0) || 0);
  const vatAmount = subtotal * 0.25; // 25% VAT
  const totalAmount = Math.abs(creditNote.amount);

  return (
    <div className="bg-white p-8 border border-gray-200 rounded-lg shadow-sm">
      {/* Header */}
      <div className="flex justify-between items-start pb-6 border-b">
        {/* Left Column: Logo and Company Info */}
        <div>
          {logoUrl ? (
            <img src={logoUrl} alt="Företagslogo" className="h-16 w-auto mb-4" />
          ) : (
            <div className="w-16 h-16 bg-blue-600 rounded-lg flex items-center justify-center mb-4">
              <Building className="w-8 h-8 text-white" />
            </div>
          )}
          <h1 className="text-xl font-bold text-gray-900">Momentum CRM</h1>
          <p className="text-gray-600 text-sm">Företagsgatan 123, 123 45 Stockholm</p>
        </div>

        {/* Right Column: Credit Note Title and Details */}
        <div className="text-right">
          <div className="flex items-center justify-end mb-2">
            <AlertTriangle className="w-6 h-6 text-red-600 mr-2" />
            <h2 className="text-3xl font-bold text-red-600">KREDITFAKTURA</h2>
          </div>
          <p className="text-gray-600">
            <span className="font-semibold">Kreditnr:</span> {creditNote.credit_note_number}
          </p>
          <p className="text-gray-600">
            <span className="font-semibold">Datum:</span> {formatDate(creditNote.created_at)}
          </p>
          <p className="text-gray-600">
            <span className="font-semibold">Avser faktura:</span> {creditNote.original_invoice?.invoice_number}
          </p>
        </div>
      </div>

      {/* Customer Info and Credit Details */}
      <div className="grid grid-cols-2 gap-8 mt-6">
        <div>
          <h3 className="text-sm font-semibold text-gray-500 uppercase tracking-wider mb-2">Kreditera till</h3>
          <p className="font-bold text-gray-900">{creditNote.customer?.name}</p>
          {creditNote.customer?.email && <p className="text-gray-600">{creditNote.customer.email}</p>}
          {creditNote.customer?.phone_number && <p className="text-gray-600">{creditNote.customer.phone_number}</p>}
        </div>
        <div className="text-right">
          <h3 className="text-sm font-semibold text-gray-500 uppercase tracking-wider mb-2">Kreditinformation</h3>
          <p className="font-bold text-gray-900">
            Anledning: {creditNote.credit_reason}
          </p>
          <p className="text-gray-600">
            Ursprunglig faktura: {formatCurrency(creditNote.original_invoice?.amount || 0)}
          </p>
        </div>
      </div>

      {/* Assignment Info */}
      <div className="mt-6">
        <h3 className="text-sm font-semibold text-gray-500 uppercase tracking-wider mb-2">Arbete utfört av</h3>
        <div className="text-gray-600">
          {creditNote.assignment_type === 'team' && creditNote.assigned_team ? (
            <p>{creditNote.assigned_team.name}</p>
          ) : creditNote.assignment_type === 'individual' && creditNote.assigned_user ? (
            <p>{creditNote.assigned_user.full_name}</p>
          ) : (
            <p>Momentum CRM</p>
          )}
        </div>
      </div>

      {/* Line Items Table */}
      <div className="mt-8">
        <h3 className="text-lg font-semibold text-gray-800 mb-2">Kreditspecifikation</h3>
        {creditNote.job_description && (
          <p className="text-sm text-gray-600 pb-4 border-b mb-4">
            {creditNote.job_description}
          </p>
        )}
        <table className="min-w-full">
          <thead className="border-b-2 border-gray-200">
            <tr>
              <th className="px-2 py-2 text-left text-sm font-semibold text-gray-600 uppercase tracking-wider">Beskrivning</th>
              <th className="px-2 py-2 text-right text-sm font-semibold text-gray-600 uppercase tracking-wider">Antal</th>
              <th className="px-2 py-2 text-right text-sm font-semibold text-gray-600 uppercase tracking-wider">À-pris</th>
              <th className="px-2 py-2 text-right text-sm font-semibold text-gray-600 uppercase tracking-wider">Summa</th>
            </tr>
          </thead>
          <tbody>
            {(creditNote.invoice_line_items || []).map((item, index) => (
              <tr key={index} className="border-b border-gray-100">
                <td className="px-2 py-3 text-gray-800">{item.description}</td>
                <td className="px-2 py-3 text-right text-gray-600">{item.quantity}</td>
                <td className="px-2 py-3 text-right text-gray-600 text-red-600">
                  {formatCurrency(item.unit_price)}
                </td>
                <td className="px-2 py-3 text-right font-medium text-red-600">
                  {formatCurrency(item.total)}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* Totals */}
      <div className="flex justify-end mt-6">
        <div className="w-full max-w-xs space-y-2">
          <div className="flex justify-between text-red-600">
            <span>Subtotal:</span>
            <span className="font-medium">-{formatCurrency(subtotal)}</span>
          </div>
          <div className="flex justify-between text-red-600">
            <span>Moms (25%):</span>
            <span className="font-medium">-{formatCurrency(vatAmount)}</span>
          </div>
          <div className="flex justify-between text-xl font-bold text-red-600 pt-2 border-t border-red-200">
            <span>Totalt kreditbelopp:</span>
            <span>{formatCurrency(creditNote.amount)}</span>
          </div>
        </div>
      </div>

      {/* Credit Note Information */}
      <div className="mt-8 pt-6 border-t border-red-200 bg-red-50 rounded-lg p-4">
        <h4 className="font-semibold text-red-800 mb-2 flex items-center">
          <AlertTriangle className="w-4 h-4 mr-2" />
          Kreditfaktura - Viktigt
        </h4>
        <div className="text-sm text-red-700 space-y-2">
          <p>
            <strong>Detta är en kreditfaktura</strong> som minskar det belopp ni är skyldiga oss.
          </p>
          <p>
            <strong>Ursprunglig faktura:</strong> {creditNote.original_invoice?.invoice_number} ({formatCurrency(creditNote.original_invoice?.amount || 0)})
          </p>
          <p>
            <strong>Nytt saldo efter kredit:</strong> {formatCurrency((creditNote.original_invoice?.net_amount || 0))}
          </p>
          {creditNote.original_invoice?.status === 'paid' && (
            <p>
              <strong>Återbetalning:</strong> Vi kommer att återbetala {formatCurrency(totalAmount)} till ert registrerade konto inom 5-10 arbetsdagar.
            </p>
          )}
        </div>
      </div>

      {/* Terms and Conditions */}
      <div className="mt-8 pt-6 border-t">
        <h4 className="font-semibold text-gray-800 mb-2">Villkor för kreditfaktura</h4>
        <p className="text-xs text-gray-500">
          Denna kreditfaktura minskar ert utestående belopp med angivet belopp. 
          Vid frågor om kreditfakturan, kontakta oss inom 8 dagar från utfärdandedatum.
          {creditNote.original_invoice?.status === 'paid' && ' Återbetalning sker till det konto som användes för ursprunglig betalning.'}
        </p>
      </div>

      {/* Footer */}
      <div className="mt-12 pt-6 border-t text-center text-xs text-gray-500">
        {systemSettings?.invoice_footer_text && (
          <p className="text-sm text-gray-700 mb-4">{systemSettings.invoice_footer_text}</p>
        )}
        <p>Tack för ert förtroende!</p>
        <p>Momentum CRM AB | Org.nr: 556123-4567 | info@momentum.se</p>
      </div>
    </div>
  );
}

export default CreditNotePreview;