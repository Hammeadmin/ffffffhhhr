import React from 'react';
import { Building, Mail, Phone, MapPin, Calendar, FileText } from 'lucide-react';
import type { QuoteTemplate, ContentBlock, extractLineItemsFromTemplate } from '../lib/quoteTemplates';
import { formatCurrency, formatDate } from '../lib/database';
import { UNIT_LABELS, extractLineItemsFromTemplate as extractItems } from '../lib/quoteTemplates';

interface QuotePreviewProps {
  template?: QuoteTemplate; // Make template optional
  quote: any;
  logoUrl?: string | null;
  companyInfo?: any;
  customerInfo?: any;
  quoteNumber?: string;
  validUntil?: string;
}

function QuotePreview({ 
  template, 
  logoUrl, 
  companyInfo, 
  customerInfo,
  quoteNumber = 'O2024-001',
  validUntil
}: QuotePreviewProps) {
const subtotal = quote.subtotal || 0;
const vatAmount = quote.vat_amount || 0;
const total = quote.total_amount || 0;
const rotAmount = quote.rot_amount || 0;
const finalAmount = total - rotAmount;

  const defaultCompany = {
    name: 'Momentum CRM AB',
    org_number: '556123-4567',
    email: 'info@momentum.se',
    phone: '+46 8 123 456 78',
    address: 'Företagsgatan 123',
    postal_code: '123 45',
    city: 'Stockholm'
  };

  const defaultCustomer = {
    name: 'Exempel Kund AB',
    email: 'kontakt@exempel.se',
    phone: '+46 8 987 654 32',
    address: 'Kundgatan 456',
    postal_code: '456 78',
    city: 'Göteborg'
  };

  const company = companyInfo || defaultCompany;
  const customer = customerInfo || defaultCustomer;

  const renderContentBlock = (block: ContentBlock) => {
    switch (block.type) {
      case 'header':
        return (
          <div className="text-center mb-6">
            <h2 className="text-2xl font-bold text-gray-800">{block.content}</h2>
          </div>
        );

      case 'text_block':
        return (
          <div className="mb-6">
            <p className="text-gray-700 leading-relaxed whitespace-pre-wrap">{block.content}</p>
          </div>
        );

      case 'line_items_table':
        if (!Array.isArray(block.content) || block.content.length === 0) {
          return null;
        }
        return (
          <div className="mb-8">
            <h3 className="text-lg font-semibold text-gray-800 mb-4">Offertspecifikation</h3>
            <div className="overflow-x-auto">
              <table className="min-w-full">
                <thead className="border-b-2 border-gray-200">
                  <tr>
                    <th className="px-4 py-3 text-left text-sm font-semibold text-gray-600 uppercase tracking-wider">
                      Beskrivning
                    </th>
                    <th className="px-4 py-3 text-center text-sm font-semibold text-gray-600 uppercase tracking-wider">
                      Antal
                    </th>
                    <th className="px-4 py-3 text-center text-sm font-semibold text-gray-600 uppercase tracking-wider">
                      Enhet
                    </th>
                    <th className="px-4 py-3 text-right text-sm font-semibold text-gray-600 uppercase tracking-wider">
                      À-pris
                    </th>
                    <th className="px-4 py-3 text-right text-sm font-semibold text-gray-600 uppercase tracking-wider">
                      Summa
                    </th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100">
                  {block.content.map((item: any, index: number) => (
                    <tr key={index} className="hover:bg-gray-50">
                      <td className="px-4 py-4">
                        <div>
                          <p className="text-sm font-medium text-gray-900">{item.name}</p>
                          {item.description && (
                            <p className="text-sm text-gray-600 mt-1">{item.description}</p>
                          )}
                        </div>
                      </td>
                      <td className="px-4 py-4 text-center text-sm text-gray-900">
                        {item.quantity}
                      </td>
                      <td className="px-4 py-4 text-center text-sm text-gray-900">
                        {UNIT_LABELS[item.unit]}
                      </td>
                      <td className="px-4 py-4 text-right text-sm text-gray-900">
                        {formatCurrency(item.unit_price)}
                      </td>
                      <td className="px-4 py-4 text-right text-sm font-medium text-gray-900">
                        {formatCurrency(item.quantity * item.unit_price)}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        );

      case 'footer':
        return (
          <div className="mt-8 pt-6 border-t border-gray-200">
            <p className="text-gray-700 leading-relaxed whitespace-pre-wrap">{block.content}</p>
          </div>
        );

      default:
        return null;
    }
  };

  return (
    <div className="bg-white p-8 border border-gray-200 rounded-lg shadow-sm max-w-4xl mx-auto">
      {/* Header */}
      <div className="flex justify-between items-start pb-8 border-b-2 border-gray-200">
        {/* Company Info */}
        <div className="flex-1">
          <div className="flex items-start space-x-4 mb-4">
            {logoUrl ? (
              <img 
                src={logoUrl} 
                alt="Företagslogo" 
                className="h-16 w-auto object-contain"
                onError={(e) => {
                  // Fallback to icon if image fails to load
                  e.currentTarget.style.display = 'none';
                }}
              />
            ) : (
              <div className="w-16 h-16 bg-blue-600 rounded-lg flex items-center justify-center">
                <Building className="w-8 h-8 text-white" />
              </div>
            )}
            <div>
              <h1 className="text-2xl font-bold text-gray-900">{company.name}</h1>
              {company.org_number && (
                <p className="text-sm text-gray-600">Org.nr: {company.org_number}</p>
              )}
            </div>
          </div>
          
          <div className="space-y-1 text-sm text-gray-600">
            {company.address && (
              <div className="flex items-center">
                <MapPin className="w-4 h-4 mr-2" />
                {company.address}, {company.postal_code} {company.city}
              </div>
            )}
            {company.phone && (
              <div className="flex items-center">
                <Phone className="w-4 h-4 mr-2" />
                {company.phone}
              </div>
            )}
            {company.email && (
              <div className="flex items-center">
                <Mail className="w-4 h-4 mr-2" />
                {company.email}
              </div>
            )}
          </div>
        </div>

        {/* Quote Info */}
        <div className="text-right">
          <h2 className="text-3xl font-bold text-gray-800 mb-2">OFFERT</h2>
          <div className="space-y-1 text-sm">
            <p><span className="font-semibold">Offertnr:</span> {quoteNumber}</p>
            <p><span className="font-semibold">Datum:</span> {formatDate(new Date().toISOString())}</p>
            {validUntil && (
              <p><span className="font-semibold">Giltig till:</span> {formatDate(validUntil)}</p>
            )}
          </div>
        </div>
      </div>

      {/* Customer and Quote Info */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-8 py-6">
        <div>
          <h3 className="text-sm font-semibold text-gray-500 uppercase tracking-wider mb-3">
            Offert till
          </h3>
          <div className="space-y-1">
            <p className="font-bold text-gray-900">{customer.name}</p>
            {customer.address && (
              <p className="text-gray-600">{customer.address}</p>
            )}
            {customer.postal_code && customer.city && (
              <p className="text-gray-600">{customer.postal_code} {customer.city}</p>
            )}
            {customer.email && (
              <p className="text-gray-600">{customer.email}</p>
            )}
            {customer.phone && (
              <p className="text-gray-600">{customer.phone}</p>
            )}
          </div>
        </div>

        <div>
          <h3 className="text-sm font-semibold text-gray-500 uppercase tracking-wider mb-3">
            Offertinformation
          </h3>
          <div className="space-y-1">
            <p><span className="font-semibold">Mall:</span> {template.name}</p>
            {template.description && (
              <p><span className="font-semibold">Beskrivning:</span> {template.description}</p>
            )}
            <p><span className="font-semibold">Betalningsvillkor:</span> {paymentTerms} dagar</p>
            <p><span className="font-semibold">Moms:</span> {(vatRate * 100).toFixed(0)}%</p>
          </div>
        </div>
      </div>

      {/* Render Content Blocks */}
      <div className="py-6">
        {template.content_structure.map((block) => (
          <div key={block.id}>
            {renderContentBlock(block)}
          </div>
        ))}
      </div>

      {/* Totals */}
      <div className="flex justify-end py-6 border-t border-gray-200">
        <div className="w-full max-w-sm space-y-2">
          <div className="flex justify-between text-sm">
            <span className="text-gray-600">Subtotal:</span>
            <span className="font-medium text-gray-900">{formatCurrency(subtotal)}</span>
          </div>
          <div className="flex justify-between text-sm">
            <span className="text-gray-600">Moms ({(vatRate * 100).toFixed(0)}%):</span>
            <span className="font-medium text-gray-900">{formatCurrency(vatAmount)}</span>
          </div>
          <div className="flex justify-between text-lg font-bold text-gray-900 pt-2 border-t border-gray-300">
            <span>Totalt:</span>
            <span>{formatCurrency(total)}</span>
          </div>
          {rotAmount > 0 && (
            <>
                <div className="flex justify-between text-sm text-green-600">
                    <span>ROT-avdrag:</span>
                    <span className="font-medium">-{formatCurrency(rotAmount)}</span>
                </div>
                <div className="flex justify-between text-lg font-bold text-green-700 pt-2 border-t border-green-300">
                    <span>Att betala efter ROT:</span>
                    <span>{formatCurrency(finalAmount)}</span>
                </div>
            </>
        )}
        </div>
      </div>

      {/* Terms and Notes */}
      <div className="py-6 border-t border-gray-200">
        <h4 className="font-semibold text-gray-800 mb-3">Villkor och information</h4>
        
        <div className="space-y-3 text-sm text-gray-700">
          <p>
            <strong>Betalningsvillkor:</strong> Betalning ska ske inom {paymentTerms} dagar från fakturadatum.
          </p>
          <p>
            <strong>Giltighet:</strong> Denna offert är giltig i 30 dagar från utfärdandedatum.
          </p>
          {template.settings.notes && (
            <div>
              <strong>Övriga villkor:</strong>
              <p className="mt-1 whitespace-pre-wrap">{template.settings.notes}</p>
            </div>
          )}
        </div>
      </div>

      {/* Footer */}
      <div className="pt-6 border-t border-gray-200 text-center">
        <p className="text-sm text-gray-600 mb-2">
          Tack för ditt intresse! Vi ser fram emot att arbeta med er.
        </p>
        <p className="text-xs text-gray-500">
          {company.name} | {company.org_number && `Org.nr: ${company.org_number} | `}
          {company.email} | {company.phone}
        </p>
      </div>
    </div>
  );
}

export default QuotePreview;