import React, { useState, useEffect } from 'react';
import {
  FileText,
  X,
  AlertCircle,
  CheckCircle,
  Calculator,
  Package,
  DollarSign,
  Save,
  Send
} from 'lucide-react';
import {
  createCreditNote,
  validateCreditNoteCreation,
  CREDIT_REASONS,
  type CreditNoteRequest,
  type CreditReason
} from '../lib/creditNotes';
import { formatCurrency } from '../lib/database';
import { useAuth } from '../contexts/AuthContext';
import { getUserProfiles } from '../lib/database';
import type { InvoiceWithRelations } from '../lib/invoices';

interface CreditNoteModalProps {
  isOpen: boolean;
  onClose: () => void;
  invoice: InvoiceWithRelations;
  onCreditNoteCreated: () => void;
}

function CreditNoteModal({ isOpen, onClose, invoice, onCreditNoteCreated }: CreditNoteModalProps) {
  const { user } = useAuth();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [userProfile, setUserProfile] = useState<any>(null);
  const [step, setStep] = useState<'reason' | 'items' | 'review'>('reason');

  const [creditNoteData, setCreditNoteData] = useState<CreditNoteRequest>({
    original_invoice_id: invoice.id,
    credit_reason: 'returvara',
    credit_type: 'full',
    line_items: [],
    credit_amount: 0
  });

  const [selectedLineItems, setSelectedLineItems] = useState<Set<number>>(new Set());
  const [customReason, setCustomReason] = useState('');

  useEffect(() => {
    if (isOpen && user) {
      loadUserProfile();
      resetForm();
    }
  }, [isOpen, user]);

  const loadUserProfile = async () => {
    if (!user) return;

    try {
      const { data: profiles } = await getUserProfiles('', { userId: user.id });
      const profile = profiles?.[0];
      setUserProfile(profile);
    } catch (err) {
      console.error('Error loading user profile:', err);
    }
  };

  const resetForm = () => {
    setCreditNoteData({
      original_invoice_id: invoice.id,
      credit_reason: 'returvara',
      credit_type: 'full',
      line_items: [],
      credit_amount: 0
    });
    setSelectedLineItems(new Set());
    setCustomReason('');
    setStep('reason');
    setError(null);
  };

  const handleReasonNext = () => {
    if (creditNoteData.credit_reason === 'annat' && !customReason.trim()) {
      setError('Vänligen ange en anledning för kreditering.');
      return;
    }
    setError(null);
    setStep('items');
  };

  const handleItemsNext = () => {
    if (creditNoteData.credit_type === 'partial' && selectedLineItems.size === 0) {
      setError('Vänligen välj minst en artikel att kreditera.');
      return;
    }

    if (creditNoteData.credit_type === 'amount_adjustment' && creditNoteData.credit_amount <= 0) {
      setError('Vänligen ange ett giltigt kreditbelopp.');
      return;
    }

    // Prepare line items for partial credit
    if (creditNoteData.credit_type === 'partial') {
      const selectedItems = (invoice.invoice_line_items || [])
        .filter((_, index) => selectedLineItems.has(index))
        .map(item => ({
          description: item.description,
          quantity: item.quantity,
          unit_price: item.unit_price,
          total: item.total
        }));

      setCreditNoteData(prev => ({ ...prev, line_items: selectedItems }));
    }

    setError(null);
    setStep('review');
  };

  const handleCreateCreditNote = async () => {
    if (!userProfile?.organisation_id) {
      setError('Ingen organisation hittades för användaren.');
      return;
    }

    try {
      setLoading(true);
      setError(null);

      // Validate credit note creation
      const calculatedCreditAmount = calculateCreditAmount();
      const validation = validateCreditNoteCreation(invoice, calculatedCreditAmount);
      
      if (!validation.isValid) {
        setError(validation.error || 'Ogiltig kreditering');
        return;
      }

      // Prepare final request
      const finalRequest: CreditNoteRequest = {
        ...creditNoteData,
        custom_reason: creditNoteData.credit_reason === 'annat' ? customReason : undefined
      };

      const result = await createCreditNote(
        finalRequest,
        userProfile.organisation_id,
        user!.id
      );

      if (result.error) {
        setError(result.error.message);
        return;
      }

      onCreditNoteCreated();
      onClose();
    } catch (err) {
      console.error('Error creating credit note:', err);
      setError('Ett oväntat fel inträffade vid skapande av kreditfaktura.');
    } finally {
      setLoading(false);
    }
  };

  const calculateCreditAmount = (): number => {
    switch (creditNoteData.credit_type) {
      case 'full':
        return Math.abs(invoice.amount);
      case 'partial':
        return (invoice.invoice_line_items || [])
          .filter((_, index) => selectedLineItems.has(index))
          .reduce((sum, item) => sum + Math.abs(item.total), 0);
      case 'amount_adjustment':
        return Math.abs(creditNoteData.credit_amount || 0);
      default:
        return 0;
    }
  };

  const toggleLineItem = (index: number) => {
    const newSelected = new Set(selectedLineItems);
    if (newSelected.has(index)) {
      newSelected.delete(index);
    } else {
      newSelected.add(index);
    }
    setSelectedLineItems(newSelected);
  };

  const selectAllLineItems = () => {
    if (selectedLineItems.size === (invoice.invoice_line_items || []).length) {
      setSelectedLineItems(new Set());
    } else {
      setSelectedLineItems(new Set(Array.from({ length: invoice.invoice_line_items?.length || 0 }, (_, i) => i)));
    }
  };

  if (!isOpen) return null;

  const maxCreditAmount = Math.abs(invoice.net_amount || invoice.amount);
  const creditAmount = calculateCreditAmount();

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
      <div className="bg-white rounded-lg max-w-4xl w-full max-h-[90vh] overflow-y-auto">
        {/* Header */}
        <div className="flex items-center justify-between p-6 border-b">
          <div className="flex items-center">
            <FileText className="w-6 h-6 text-red-600 mr-3" />
            <div>
              <h3 className="text-lg font-semibold text-gray-900">Skapa Kreditfaktura</h3>
              <p className="text-sm text-gray-600">
                För faktura: {invoice.invoice_number} • {invoice.customer?.name}
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            disabled={loading}
            className="text-gray-400 hover:text-gray-600 disabled:opacity-50"
          >
            <X className="w-6 h-6" />
          </button>
        </div>

        {/* Progress Steps */}
        <div className="px-6 py-4 border-b bg-gray-50">
          <div className="flex items-center space-x-4">
            {[
              { key: 'reason', label: 'Anledning', icon: AlertCircle },
              { key: 'items', label: 'Artiklar', icon: Package },
              { key: 'review', label: 'Granska', icon: CheckCircle }
            ].map((stepItem, index) => {
              const Icon = stepItem.icon;
              const isActive = step === stepItem.key;
              const isCompleted = ['reason', 'items', 'review'].indexOf(step) > index;
              
              return (
                <div key={stepItem.key} className="flex items-center">
                  {index > 0 && (
                    <div className={`w-8 h-0.5 ${isCompleted ? 'bg-blue-600' : 'bg-gray-300'}`} />
                  )}
                  <div className={`flex items-center space-x-2 px-3 py-2 rounded-lg ${
                    isActive ? 'bg-blue-100 text-blue-700' : 
                    isCompleted ? 'bg-green-100 text-green-700' : 
                    'bg-gray-100 text-gray-500'
                  }`}>
                    <Icon className="w-4 h-4" />
                    <span className="text-sm font-medium">{stepItem.label}</span>
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        <div className="p-6">
          {/* Error Display */}
          {error && (
            <div className="mb-6 bg-red-50 border border-red-200 rounded-lg p-4">
              <div className="flex items-center">
                <AlertCircle className="w-5 h-5 text-red-600 mr-2" />
                <p className="text-red-700">{error}</p>
              </div>
            </div>
          )}

          {/* Step 1: Reason */}
          {step === 'reason' && (
            <div className="space-y-6">
              <div>
                <h4 className="text-lg font-medium text-gray-900 mb-4">Anledning till kreditering</h4>
                <div className="space-y-3">
                  {Object.entries(CREDIT_REASONS).map(([key, label]) => (
                    <label key={key} className="flex items-center p-3 border border-gray-200 rounded-lg hover:bg-gray-50 cursor-pointer">
                      <input
                        type="radio"
                        name="credit_reason"
                        value={key}
                        checked={creditNoteData.credit_reason === key}
                        onChange={(e) => setCreditNoteData(prev => ({ ...prev, credit_reason: e.target.value }))}
                        className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300"
                      />
                      <span className="ml-3 text-sm font-medium text-gray-900">{label}</span>
                    </label>
                  ))}
                </div>

                {creditNoteData.credit_reason === 'annat' && (
                  <div className="mt-4">
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Ange anledning *
                    </label>
                    <textarea
                      value={customReason}
                      onChange={(e) => setCustomReason(e.target.value)}
                      rows={3}
                      className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-blue-500 focus:border-blue-500"
                      placeholder="Beskriv anledningen till kreditering..."
                    />
                  </div>
                )}
              </div>

              <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
                <h5 className="font-medium text-blue-900 mb-2">Fakturainformation</h5>
                <div className="text-sm text-blue-800 space-y-1">
                  <p><strong>Fakturanummer:</strong> {invoice.invoice_number}</p>
                  <p><strong>Ursprungligt belopp:</strong> {formatCurrency(invoice.amount)}</p>
                  <p><strong>Redan krediterat:</strong> {formatCurrency(Math.abs(invoice.credited_amount || 0))}</p>
                  <p><strong>Kvarvarande att kreditera:</strong> {formatCurrency(maxCreditAmount)}</p>
                </div>
              </div>
            </div>
          )}

          {/* Step 2: Items */}
          {step === 'items' && (
            <div className="space-y-6">
              <div>
                <h4 className="text-lg font-medium text-gray-900 mb-4">Välj kredittyp</h4>
                <div className="space-y-3">
                  <label className="flex items-start p-3 border border-gray-200 rounded-lg hover:bg-gray-50 cursor-pointer">
                    <input
                      type="radio"
                      name="credit_type"
                      value="full"
                      checked={creditNoteData.credit_type === 'full'}
                      onChange={(e) => setCreditNoteData(prev => ({ ...prev, credit_type: e.target.value as any }))}
                      className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 mt-0.5"
                    />
                    <div className="ml-3">
                      <span className="text-sm font-medium text-gray-900">Fullständig kreditering</span>
                      <p className="text-sm text-gray-600">Kreditera hela fakturan ({formatCurrency(maxCreditAmount)})</p>
                    </div>
                  </label>

                  <label className="flex items-start p-3 border border-gray-200 rounded-lg hover:bg-gray-50 cursor-pointer">
                    <input
                      type="radio"
                      name="credit_type"
                      value="partial"
                      checked={creditNoteData.credit_type === 'partial'}
                      onChange={(e) => setCreditNoteData(prev => ({ ...prev, credit_type: e.target.value as any }))}
                      className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 mt-0.5"
                    />
                    <div className="ml-3">
                      <span className="text-sm font-medium text-gray-900">Partiell kreditering</span>
                      <p className="text-sm text-gray-600">Välj specifika artiklar att kreditera</p>
                    </div>
                  </label>

                  <label className="flex items-start p-3 border border-gray-200 rounded-lg hover:bg-gray-50 cursor-pointer">
                    <input
                      type="radio"
                      name="credit_type"
                      value="amount_adjustment"
                      checked={creditNoteData.credit_type === 'amount_adjustment'}
                      onChange={(e) => setCreditNoteData(prev => ({ ...prev, credit_type: e.target.value as any }))}
                      className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 mt-0.5"
                    />
                    <div className="ml-3">
                      <span className="text-sm font-medium text-gray-900">Beloppsjustering</span>
                      <p className="text-sm text-gray-600">Ange specifikt kreditbelopp</p>
                    </div>
                  </label>
                </div>
              </div>

              {/* Partial Credit - Line Items Selection */}
              {creditNoteData.credit_type === 'partial' && (
                <div>
                  <div className="flex items-center justify-between mb-4">
                    <h5 className="font-medium text-gray-900">Välj artiklar att kreditera</h5>
                    <button
                      onClick={selectAllLineItems}
                      className="text-sm text-blue-600 hover:text-blue-700 font-medium"
                    >
                      {selectedLineItems.size === (invoice.invoice_line_items || []).length ? 'Avmarkera alla' : 'Markera alla'}
                    </button>
                  </div>
                  
                  <div className="space-y-2 max-h-64 overflow-y-auto">
                    {(invoice.invoice_line_items || []).map((item, index) => (
                      <label key={index} className="flex items-center p-3 border border-gray-200 rounded-lg hover:bg-gray-50 cursor-pointer">
                        <input
                          type="checkbox"
                          checked={selectedLineItems.has(index)}
                          onChange={() => toggleLineItem(index)}
                          className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded"
                        />
                        <div className="ml-3 flex-1">
                          <div className="flex items-center justify-between">
                            <div>
                              <p className="text-sm font-medium text-gray-900">{item.description}</p>
                              <p className="text-sm text-gray-600">
                                {item.quantity} × {formatCurrency(item.unit_price)}
                              </p>
                            </div>
                            <span className="text-sm font-medium text-gray-900">
                              {formatCurrency(item.total)}
                            </span>
                          </div>
                        </div>
                      </label>
                    ))}
                  </div>

                  {selectedLineItems.size > 0 && (
                    <div className="mt-4 p-3 bg-blue-50 rounded-lg">
                      <div className="flex items-center justify-between">
                        <span className="text-sm font-medium text-blue-900">
                          {selectedLineItems.size} artiklar valda
                        </span>
                        <span className="text-sm font-bold text-blue-900">
                          Kreditbelopp: {formatCurrency(creditAmount)}
                        </span>
                      </div>
                    </div>
                  )}
                </div>
              )}

              {/* Amount Adjustment */}
              {creditNoteData.credit_type === 'amount_adjustment' && (
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Kreditbelopp *
                  </label>
                  <div className="relative">
                    <DollarSign className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-4 h-4" />
                    <input
                      type="number"
                      value={creditNoteData.credit_amount || ''}
                      onChange={(e) => setCreditNoteData(prev => ({ ...prev, credit_amount: parseFloat(e.target.value) || 0 }))}
                      className="w-full pl-10 pr-3 py-2 border border-gray-300 rounded-md focus:ring-blue-500 focus:border-blue-500"
                      placeholder="0.00"
                      min="0"
                      max={maxCreditAmount}
                      step="0.01"
                    />
                  </div>
                  <p className="text-xs text-gray-500 mt-1">
                    Maximalt kreditbelopp: {formatCurrency(maxCreditAmount)}
                  </p>
                </div>
              )}
            </div>
          )}

          {/* Step 3: Review */}
          {step === 'review' && (
            <div className="space-y-6">
              <div>
                <h4 className="text-lg font-medium text-gray-900 mb-4">Granska kreditfaktura</h4>
                
                <div className="bg-gray-50 rounded-lg p-4 space-y-3">
                  <div className="flex justify-between">
                    <span className="text-sm font-medium text-gray-700">Ursprunglig faktura:</span>
                    <span className="text-sm text-gray-900">{invoice.invoice_number}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-sm font-medium text-gray-700">Kund:</span>
                    <span className="text-sm text-gray-900">{invoice.customer?.name}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-sm font-medium text-gray-700">Anledning:</span>
                    <span className="text-sm text-gray-900">
                      {creditNoteData.credit_reason === 'annat' ? customReason : CREDIT_REASONS[creditNoteData.credit_reason as CreditReason]}
                    </span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-sm font-medium text-gray-700">Kredittyp:</span>
                    <span className="text-sm text-gray-900">
                      {creditNoteData.credit_type === 'full' ? 'Fullständig kreditering' :
                       creditNoteData.credit_type === 'partial' ? 'Partiell kreditering' :
                       'Beloppsjustering'}
                    </span>
                  </div>
                  <div className="flex justify-between border-t pt-3">
                    <span className="text-base font-semibold text-gray-900">Kreditbelopp:</span>
                    <span className="text-base font-bold text-red-600">
                      -{formatCurrency(creditAmount)}
                    </span>
                  </div>
                </div>

                {creditNoteData.credit_type === 'partial' && selectedLineItems.size > 0 && (
                  <div className="mt-4">
                    <h5 className="font-medium text-gray-900 mb-2">Valda artiklar:</h5>
                    <div className="space-y-2">
                      {(invoice.invoice_line_items || [])
                        .filter((_, index) => selectedLineItems.has(index))
                        .map((item, index) => (
                          <div key={index} className="flex justify-between p-2 bg-red-50 rounded">
                            <span className="text-sm text-gray-900">{item.description}</span>
                            <span className="text-sm font-medium text-red-600">
                              -{formatCurrency(item.total)}
                            </span>
                          </div>
                        ))}
                    </div>
                  </div>
                )}
              </div>

              <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4">
                <div className="flex items-start">
                  <AlertCircle className="w-5 h-5 text-yellow-600 mr-2 mt-0.5" />
                  <div>
                    <h5 className="font-medium text-yellow-900">Viktigt att veta</h5>
                    <ul className="text-sm text-yellow-800 mt-1 space-y-1">
                      <li>• Kreditfakturan kommer att skickas till kunden automatiskt</li>
                      <li>• Ursprungliga fakturans nettosumma kommer att uppdateras</li>
                      <li>• Denna åtgärd kan inte ångras efter att kreditfakturan skapats</li>
                    </ul>
                  </div>
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="flex items-center justify-between p-6 border-t bg-gray-50">
          <div className="flex items-center space-x-3">
            {step !== 'reason' && (
              <button
                onClick={() => setStep(step === 'review' ? 'items' : 'reason')}
                disabled={loading}
                className="px-4 py-2 border border-gray-300 rounded-md text-sm font-medium text-gray-700 bg-white hover:bg-gray-50 disabled:opacity-50"
              >
                Tillbaka
              </button>
            )}
          </div>

          <div className="flex items-center space-x-3">
            <button
              onClick={onClose}
              disabled={loading}
              className="px-4 py-2 border border-gray-300 rounded-md text-sm font-medium text-gray-700 bg-white hover:bg-gray-50 disabled:opacity-50"
            >
              Avbryt
            </button>
            
            {step === 'reason' && (
              <button
                onClick={handleReasonNext}
                className="px-4 py-2 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-blue-600 hover:bg-blue-700"
              >
                Nästa
              </button>
            )}
            
            {step === 'items' && (
              <button
                onClick={handleItemsNext}
                className="px-4 py-2 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-blue-600 hover:bg-blue-700"
              >
                Nästa
              </button>
            )}
            
            {step === 'review' && (
              <button
                onClick={handleCreateCreditNote}
                disabled={loading || creditAmount <= 0}
                className="inline-flex items-center px-4 py-2 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-red-600 hover:bg-red-700 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {loading ? (
                  <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
                ) : (
                  <Save className="w-4 h-4 mr-2" />
                )}
                Skapa Kreditfaktura
              </button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

export default CreditNoteModal;