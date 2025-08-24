// src/components/InvoicePreview.tsx
import React from 'react';
import { Building, Mail, Phone } from 'lucide-react';
import type { InvoiceWithRelations } from '../lib/invoices';
import { formatCurrency, formatDate, getSystemSettings } from '../lib/database';


interface InvoicePreviewProps {
  invoice: InvoiceWithRelations;
  logoUrl?: string | null;
  systemSettings?: { invoice_footer_text?: string | null } | null; // <-- ADD THIS
}

function InvoicePreview({ invoice, logoUrl, systemSettings }: InvoicePreviewProps) {
  if (!invoice) return null;

const subtotal = invoice.subtotal || invoice.invoice_line_items?.reduce((sum, item) => sum + item.total, 0) || 0;
const vatAmount = invoice.vat_amount || subtotal * 0.25;
const total = invoice.amount || 0;
const rotAmount = invoice.rot_amount || 0;
const finalAmount = total - rotAmount;
  

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

        {/* Right Column: Invoice Title and Details */}
        <div className="text-right">
          <h2 className="text-3xl font-bold text-gray-800">FAKTURA</h2>
          <p className="text-gray-600 mt-1">
            <span className="font-semibold">Fakturanr:</span> {invoice.invoice_number}
          </p>
          <p className="text-gray-600">
            <span className="font-semibold">Datum:</span> {formatDate(invoice.created_at)}
          </p>
        </div>
      </div>

      {/* Customer Info */}
      <div className="grid grid-cols-2 gap-8 mt-6">
        <div>
          <h3 className="text-sm font-semibold text-gray-500 uppercase tracking-wider mb-2">Fakturera till</h3>
          <p className="font-bold text-gray-900">{invoice.customer?.name}</p>
          {invoice.customer?.email && <p className="text-gray-600">{invoice.customer.email}</p>}
          {invoice.customer?.phone_number && <p className="text-gray-600">{invoice.customer.phone_number}</p>}
        </div>
        <div className="text-right">
          <h3 className="text-sm font-semibold text-gray-500 uppercase tracking-wider mb-2">Betalningsvillkor</h3>
          <p className="font-bold text-gray-900">
            Förfallodatum: {invoice.due_date ? formatDate(invoice.due_date) : 'N/A'}
          </p>
        </div>
      </div> 

          {/* Assignment Info */}
    <div className="mt-6">
        <h3 className="text-sm font-semibold text-gray-500 uppercase tracking-wider mb-2">Arbete utfört av</h3>
        <div className="text-gray-600">
            {invoice.assignment_type === 'team' && invoice.assigned_team ? (
                <p>{invoice.assigned_team.name}</p>
            ) : invoice.assignment_type === 'individual' && invoice.assigned_user ? (
                <p>{invoice.assigned_user.full_name}</p>
            ) : (
                <p>Momentum CRM</p>
            )}
        </div>
    </div>

      {/* Line Items Table */}
<div className="mt-8">
    <h3 className="text-lg font-semibold text-gray-800 mb-2">Fakturaspecifikation</h3>
    {invoice.job_description && (
        <p className="text-sm text-gray-600 pb-4 border-b mb-4">
            {invoice.job_description}
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
            {(invoice.invoice_line_items || []).map((item, index) => (
                <tr key={index} className="border-b border-gray-100">
                    <td className="px-2 py-3 text-gray-800">{item.description}</td>
                    <td className="px-2 py-3 text-right text-gray-600">{item.quantity}</td>
                    <td className="px-2 py-3 text-right text-gray-600">{formatCurrency(item.unit_price)}</td>
                    <td className="px-2 py-3 text-right font-medium text-gray-800">{formatCurrency(item.total)}</td>
                </tr>
            ))}
        </tbody>
    </table>
</div>

      {/* Totals */}
      <div className="flex justify-end mt-6">
        <div className="w-full max-w-xs space-y-2">
          <div className="flex justify-between">
            <span className="text-gray-600">Subtotal:</span>
            <span className="font-medium">{formatCurrency(subtotal)}</span>
          </div>
          <div className="flex justify-between">
            <span className="text-gray-600">Moms (25%):</span>
            <span className="font-medium">{formatCurrency(vatAmount)}</span>
          </div>
          <div className="flex justify-between text-xl font-bold text-gray-900 pt-2 border-t">
            <span>Totalt att betala:</span>
            <span>{formatCurrency(invoice.amount)}</span>
          </div>
          {rotAmount > 0 && (
            <>
                <div className="flex justify-between text-sm text-green-600">
                    <span>ROT-avdrag:</span>
                    <span className="font-medium">-{formatCurrency(rotAmount)}</span>
                </div>
                <div className="flex justify-between text-xl font-bold text-green-700 pt-2 border-t border-green-300">
                    <span>Att betala efter ROT:</span>
                    <span>{formatCurrency(finalAmount)}</span>
                </div>
            </>
        )}
        {/* END OF NEW BLOCK */}
        </div>
      </div>

          {/* Terms and Conditions */}
    <div className="mt-8 pt-6 border-t">
        <h4 className="font-semibold text-gray-800 mb-2">Villkor</h4>
        <p className="text-xs text-gray-500">
            Betalning ska ske inom {invoice.payment_terms || '30'} dagar. Vid försenad betalning debiteras dröjsmålsränta enligt räntelagen.
            Eventuella anmärkningar på fakturan ska göras inom 8 dagar.
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

export default InvoicePreview;