import React, { useState, useEffect } from 'react';
import {
  FileText,
  ChevronDown,
  Eye,
  Package,
  X,
  Check,
  Sparkles
} from 'lucide-react';
import {
  getQuoteTemplates,
  type QuoteTemplate,
  extractLineItemsFromTemplate,
  calculateTemplateTotal,
  UNIT_LABELS
} from '../lib/quoteTemplates';
import { formatCurrency } from '../lib/database';
import LoadingSpinner from './LoadingSpinner';
import QuotePreview from './QuotePreview';
import { supabase } from '../lib/supabase';



interface QuoteTemplateSelectorProps {
  organisationId: string;
  onSelectTemplate: (template: QuoteTemplate) => void;
  onSelectPartial?: (lineItems: any[]) => void;
  companyInfo?: any;
  className?: string;
}

function QuoteTemplateSelector({ 
  organisationId, 
  onSelectTemplate, 
  onSelectPartial,
  companyInfo,
  className = '' 
}: QuoteTemplateSelectorProps) {
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [templates, setTemplates] = useState<QuoteTemplate[]>([]);
  const [selectedTemplate, setSelectedTemplate] = useState<string>('');
  const [showPreview, setShowPreview] = useState<QuoteTemplate | null>(null);
  const [selectedItems, setSelectedItems] = useState<number[]>([]);
  const [showPartialModal, setShowPartialModal] = useState<QuoteTemplate | null>(null);
  const [isDropdownOpen, setIsDropdownOpen] = useState(false);

  useEffect(() => {
    loadTemplates();
  }, [organisationId]);

  const loadTemplates = async () => {
    try {
      setLoading(true);
      setError(null);

      const result = await getQuoteTemplates(organisationId);
      if (result.error) {
        setError(result.error.message);
        return;
      }

      setTemplates(result.data || []);
    } catch (err) {
      console.error('Error loading templates:', err);
      setError('Ett oväntat fel inträffade vid laddning av mallar.');
    } finally {
      setLoading(false);
    }
  };

  const handleTemplateSelect = (templateId: string) => {
    setSelectedTemplate(templateId);
    setIsDropdownOpen(false);
    const template = templates.find(t => t.id === templateId);
    if (template) {
      onSelectTemplate(template);
    }
  };

  const handlePartialSelect = (template: QuoteTemplate) => {
    const lineItems = extractLineItemsFromTemplate(template);
    setSelectedItems(lineItems.map((_, index) => index));
    setShowPartialModal(template);
  };

  const handleApplyPartial = () => {
    if (showPartialModal && onSelectPartial) {
      const lineItems = extractLineItemsFromTemplate(showPartialModal);
      const selectedLineItems = selectedItems.map(index => lineItems[index]).filter(Boolean);
      onSelectPartial(selectedLineItems);
      setShowPartialModal(null);
      setSelectedItems([]);
    }
  };

  const toggleItemSelection = (index: number) => {
    setSelectedItems(prev => 
      prev.includes(index) 
        ? prev.filter(i => i !== index)
        : [...prev, index]
    );
  };

  const calculatePartialTotal = () => {
    if (!showPartialModal) return 0;
    const lineItems = extractLineItemsFromTemplate(showPartialModal);
    return selectedItems.reduce((sum, index) => {
      const item = lineItems[index];
      if (!item) return sum;
      return sum + (item.quantity * item.unit_price);
    }, 0);
  };

  if (loading) {
    return (
      <div className={`bg-white rounded-lg border p-4 ${className}`}>
        <LoadingSpinner size="sm" text="Laddar mallar..." />
      </div>
    );
  }

  if (error) {
    return (
      <div className={`bg-red-50 border border-red-200 rounded-lg p-4 ${className}`}>
        <p className="text-sm text-red-700">{error}</p>
      </div>
    );
  }

  if (templates.length === 0) {
    return (
      <div className={`bg-gray-50 border border-gray-200 rounded-lg p-4 ${className}`}>
        <p className="text-sm text-gray-600 text-center">
          Inga mallar tillgängliga. Skapa mallar i inställningarna först.
        </p>
      </div>
    );
  }

  return (
    <>
    <div className={`bg-white rounded-lg border ${className}`}>
      <div className="p-4">
        <div className="mb-4">
          <label className="block text-sm font-medium text-gray-700 mb-2">
            Välj offertmall
          </label>
          <div className="relative">
            <button
              type="button"
              onClick={() => setIsDropdownOpen(!isDropdownOpen)}
              className="w-full flex items-center justify-between px-4 py-3 border border-gray-300 rounded-lg bg-white hover:bg-gray-50 focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-colors"
            >
              <div className="flex items-center">
                <Sparkles className="w-4 h-4 mr-2 text-blue-600" />
                <span className="text-sm text-gray-700">
                  {selectedTemplate 
                    ? templates.find(t => t.id === selectedTemplate)?.name || 'Välj mall...'
                    : 'Välj mall...'
                  }
                </span>
              </div>
              <ChevronDown className={`w-4 h-4 text-gray-400 transition-transform ${isDropdownOpen ? 'rotate-180' : ''}`} />
            </button>

            {isDropdownOpen && (
              <>
                <div 
                  className="fixed inset-0 z-10"
                  onClick={() => setIsDropdownOpen(false)}
                />
                <div className="absolute top-full left-0 right-0 mt-1 bg-white border border-gray-200 rounded-lg shadow-lg z-20 max-h-64 overflow-y-auto">
                  <div className="py-1">
                    <button
                      type="button"
                      onClick={() => {
                        setSelectedTemplate('');
                        setIsDropdownOpen(false);
                      }}
                      className="w-full px-4 py-2 text-left text-sm text-gray-500 hover:bg-gray-50"
                    >
                      Ingen mall (tom offert)
                    </button>
                    {templates.map((template) => (
                      <button
                        key={template.id}
                        type="button" 
                        onClick={() => handleTemplateSelect(template.id)}
                        className={`w-full px-4 py-3 text-left hover:bg-gray-50 transition-colors ${
                          selectedTemplate === template.id ? 'bg-blue-50 text-blue-700' : ''
                        }`}
                      >
                        <div className="flex items-center justify-between">
                          <div>
                            <p className="text-sm font-medium text-gray-900">{template.name}</p>
                            <p className="text-xs text-gray-600">
                              {extractLineItemsFromTemplate(template).length} artiklar • {formatCurrency(calculateTemplateTotal(template))}
                            </p>
                          </div>
                          <div className="flex items-center space-x-1">
                            <button
                              onClick={(e) => {
                                e.stopPropagation();
                                setShowPreview(template);
                              }}
                              className="text-gray-400 hover:text-blue-600"
                              title="Förhandsgranska"
                            >
                              <Eye className="w-3 h-3" />
                            </button>
                            <button
                              onClick={(e) => {
                                e.stopPropagation();
                                handlePartialSelect(template);
                              }}
                              className="text-gray-400 hover:text-green-600"
                              title="Välj specifika artiklar"
                            >
                              <Package className="w-3 h-3" />
                            </button>
                          </div>
                        </div>
                      </button>
                    ))}
                  </div>
                </div>
              </>
            )}
          </div>
        </div>

        {selectedTemplate && (
          <div className="mt-4 p-4 bg-blue-50 rounded-lg border border-blue-200">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-blue-900">
                  Mall vald: {templates.find(t => t.id === selectedTemplate)?.name}
                </p>
                <p className="text-xs text-blue-700">
                  Artiklar kommer att läggas till automatiskt när du skapar offerten
                </p>
              </div>
              <button
                onClick={() => setSelectedTemplate('')}
                className="text-blue-600 hover:text-blue-800"
                title="Rensa val"
              >
                <X className="w-4 h-4" />
              </button>
            </div>
          </div>
        )}
        </div>
      </div>

      {/* Template Preview Modal */}
      {showPreview && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-lg max-w-5xl w-full max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between p-6 border-b">
              <h3 className="text-lg font-semibold text-gray-900">
                Förhandsvisning: {showPreview.name}
              </h3>
              <button
                onClick={() => setShowPreview(null)}
                className="text-gray-400 hover:text-gray-600"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="p-6">
              <QuotePreview 
                template={showPreview}
                logoUrl={companyInfo?.logo_url}
                companyInfo={companyInfo}
              />
            </div>

            <div className="flex justify-end space-x-3 p-6 border-t">
              <button
                onClick={() => setShowPreview(null)}
                className="px-4 py-2 border border-gray-300 rounded-md text-sm font-medium text-gray-700 bg-white hover:bg-gray-50"
              >
                Stäng
              </button>
              <button
                onClick={() => {
                  onSelectTemplate(showPreview);
                  setShowPreview(null);
                }}
                className="px-4 py-2 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-blue-600 hover:bg-blue-700"
              >
                Använd denna mall
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Partial Selection Modal */}
      {showPartialModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-lg max-w-3xl w-full max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between p-6 border-b">
              <h3 className="text-lg font-semibold text-gray-900">
                Välj artiklar från: {showPartialModal.name}
              </h3>
              <button
                onClick={() => {
                  setShowPartialModal(null);
                  setSelectedItems([]);
                }}
                className="text-gray-400 hover:text-gray-600"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="p-6">
              <div className="space-y-3">
                {extractLineItemsFromTemplate(showPartialModal).map((item, index) => (
                  <div
                    key={index}
                    className={`border rounded-lg p-4 cursor-pointer transition-all ${
                      selectedItems.includes(index)
                        ? 'border-blue-500 bg-blue-50'
                        : 'border-gray-200 hover:border-gray-300'
                    }`}
                    onClick={() => toggleItemSelection(index)}
                  >
                    <div className="flex items-center justify-between">
                      <div className="flex items-center space-x-3">
                        <div className={`w-5 h-5 rounded border-2 flex items-center justify-center ${
                          selectedItems.includes(index)
                            ? 'border-blue-500 bg-blue-500'
                            : 'border-gray-300'
                        }`}>
                          {selectedItems.includes(index) && <Check className="w-3 h-3 text-white" />}
                        </div>
                        <div>
                          <h5 className="font-medium text-gray-900">{item.name}</h5>
                          {item.description && (
                            <p className="text-sm text-gray-600">{item.description}</p>
                          )}
                        </div>
                      </div>
                      <div className="text-right">
                        <p className="text-sm font-medium text-gray-900">
                          {item.quantity} {UNIT_LABELS[item.unit]} × {formatCurrency(item.unit_price)}
                        </p>
                        <p className="text-sm text-gray-600">
                          = {formatCurrency(item.quantity * item.unit_price)}
                        </p>
                      </div>
                    </div>
                  </div>
                ))}
              </div>

              {selectedItems.length > 0 && (
                <div className="mt-6 p-4 bg-blue-50 rounded-lg">
                  <div className="flex items-center justify-between">
                    <span className="text-sm font-medium text-blue-900">
                      {selectedItems.length} artiklar valda
                    </span>
                    <span className="text-sm font-bold text-blue-900">
                      Total: {formatCurrency(calculatePartialTotal())}
                    </span>
                  </div>
                </div>
              )}
            </div>

            <div className="flex items-center justify-between p-6 border-t">
              <button
                onClick={() => {
                  const lineItems = extractLineItemsFromTemplate(showPartialModal);
                  const allSelected = selectedItems.length === lineItems.length;
                  if (allSelected) {
                    setSelectedItems([]);
                  } else {
                    setSelectedItems(lineItems.map((_, index) => index));
                  }
                }}
                className="text-sm text-blue-600 hover:text-blue-700 font-medium"
              >
                {selectedItems.length === extractLineItemsFromTemplate(showPartialModal).length ? 'Avmarkera alla' : 'Markera alla'}
              </button>

              <div className="flex items-center space-x-3">
                <button
                  onClick={() => {
                    setShowPartialModal(null);
                    setSelectedItems([]);
                  }}
                  className="px-4 py-2 border border-gray-300 rounded-md text-sm font-medium text-gray-700 bg-white hover:bg-gray-50"
                >
                  Avbryt
                </button>
                <button
                  onClick={handleApplyPartial}
                  disabled={selectedItems.length === 0}
                  className="px-4 py-2 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-blue-600 hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  Lägg till valda ({selectedItems.length})
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    
    </>
  );
}

export default QuoteTemplateSelector;