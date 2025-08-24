import React, { useState, useEffect } from 'react';
import { Phone, X, Send, Save, BookTemplate as Template, User, AlertCircle, DollarSign } from 'lucide-react';
import {
  createCommunication,
  sendSMS,
  SMS_TEMPLATES,
  processTemplate,
  getTemplateVariables,
  calculateSMSCost,
  validatePhoneNumber,
  type SMSTemplate
} from '../lib/communications';
import { useAuth } from '../contexts/AuthContext';
import { getUserProfiles } from '../lib/database';
import { formatCurrency } from '../lib/database';
import type { OrderWithRelations } from '../lib/orders';

interface SMSComposerProps {
  isOpen: boolean;
  onClose: () => void;
  order: OrderWithRelations;
  onSMSSent: () => void;
}

function SMSComposer({ isOpen, onClose, order, onSMSSent }: SMSComposerProps) {
  const { user } = useAuth();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [userProfile, setUserProfile] = useState<any>(null);
  const [selectedTemplate, setSelectedTemplate] = useState<string>('');
  const [smsData, setSmsData] = useState({
    to: order.customer?.phone_number || '',
    content: ''
  });

  const SMS_COST_PER_MESSAGE = 0.85; // SEK
  const MAX_SMS_LENGTH = 160;

  useEffect(() => {
    if (isOpen && user) {
      loadUserProfile();
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

  const handleTemplateSelect = (templateId: string) => {
    setSelectedTemplate(templateId);
    
    if (!templateId) {
      setSmsData(prev => ({ ...prev, content: '' }));
      return;
    }

    const template = SMS_TEMPLATES.find(t => t.id === templateId);
    if (!template) return;

    const variables = getTemplateVariables(order, userProfile?.organisation?.name);
    
    setSmsData(prev => ({
      ...prev,
      content: processTemplate(template.content, variables)
    }));
  };

  const handleSaveDraft = async () => {
    if (!user || !userProfile?.organisation_id) return;

    try {
      setLoading(true);
      setError(null);

      const result = await createCommunication({
        organisation_id: userProfile.organisation_id,
        order_id: order.id,
        type: 'sms',
        recipient: smsData.to,
        content: smsData.content,
        status: 'draft',
        created_by_user_id: user.id
      });

      if (result.error) {
        setError(result.error.message);
        return;
      }

      onSMSSent();
    } catch (err) {
      console.error('Error saving draft:', err);
      setError('Ett oväntat fel inträffade vid sparning av utkast.');
    } finally {
      setLoading(false);
    }
  };

  const handleSendSMS = async () => {
    if (!user || !userProfile?.organisation_id) return;

    if (!validatePhoneNumber(smsData.to)) {
      setError('Ogiltigt telefonnummer.');
      return;
    }

    if (!smsData.content.trim()) {
      setError('Meddelande är obligatoriskt.');
      return;
    }

    if (smsData.content.length > MAX_SMS_LENGTH) {
      setError(`Meddelandet är för långt. Max ${MAX_SMS_LENGTH} tecken.`);
      return;
    }

    try {
      setLoading(true);
      setError(null);

      // Create communication record
      const commResult = await createCommunication({
        organisation_id: userProfile.organisation_id,
        order_id: order.id,
        type: 'sms',
        recipient: smsData.to,
        content: smsData.content,
        status: 'draft',
        created_by_user_id: user.id
      });

      if (commResult.error) {
        setError(commResult.error.message);
        return;
      }

      // Send SMS
      const sendResult = await sendSMS(commResult.data!.id, {
        to: smsData.to,
        content: smsData.content,
        from_number: '+46123456789' // TODO: Get from settings
      });

      if (sendResult.error) {
        setError(sendResult.error.message);
        return;
      }

      onSMSSent();
    } catch (err) {
      console.error('Error sending SMS:', err);
      setError('Ett oväntat fel inträffade vid skickande av SMS.');
    } finally {
      setLoading(false);
    }
  };

  const getCharacterCount = () => {
    return smsData.content.length;
  };

  const getMessageCount = () => {
    return Math.ceil(smsData.content.length / MAX_SMS_LENGTH);
  };

  const getEstimatedCost = () => {
    return calculateSMSCost(smsData.content, SMS_COST_PER_MESSAGE);
  };

  const isOverLimit = () => {
    return smsData.content.length > MAX_SMS_LENGTH;
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
      <div className="bg-white rounded-lg max-w-2xl w-full max-h-[90vh] overflow-y-auto">
        {/* Header */}
        <div className="flex items-center justify-between p-6 border-b">
          <div className="flex items-center">
            <Phone className="w-6 h-6 text-blue-600 mr-3" />
            <div>
              <h3 className="text-lg font-semibold text-gray-900">Skicka SMS</h3>
              <p className="text-sm text-gray-600">
                Till: {order.customer?.name} • Order: {order.title}
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

        <div className="p-6 space-y-6">
          {/* Error Display */}
          {error && (
            <div className="bg-red-50 border border-red-200 rounded-lg p-4">
              <div className="flex items-center">
                <AlertCircle className="w-5 h-5 text-red-600 mr-2" />
                <p className="text-red-700">{error}</p>
              </div>
            </div>
          )}

          {/* Template Selector */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Välj mall (valfritt)
            </label>
            <select
              value={selectedTemplate}
              onChange={(e) => handleTemplateSelect(e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-blue-500 focus:border-blue-500"
            >
              <option value="">Ingen mall - skriv eget meddelande</option>
              {SMS_TEMPLATES.map((template) => (
                <option key={template.id} value={template.id}>
                  {template.name}
                </option>
              ))}
            </select>
          </div>

          {/* SMS Form */}
          <div className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Till *
              </label>
              <input
                type="tel"
                required
                value={smsData.to}
                onChange={(e) => setSmsData(prev => ({ ...prev, to: e.target.value }))}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-blue-500 focus:border-blue-500"
                placeholder="+46 70 123 45 67"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Meddelande *
              </label>
              <textarea
                required
                value={smsData.content}
                onChange={(e) => setSmsData(prev => ({ ...prev, content: e.target.value }))}
                rows={4}
                className={`w-full px-3 py-2 border rounded-md focus:ring-blue-500 focus:border-blue-500 ${
                  isOverLimit() ? 'border-red-300' : 'border-gray-300'
                }`}
                placeholder="Skriv ditt SMS-meddelande här..."
              />
              
              {/* Character Counter */}
              <div className="flex items-center justify-between mt-2 text-xs">
                <div className="flex items-center space-x-4">
                  <span className={`font-medium ${isOverLimit() ? 'text-red-600' : 'text-gray-600'}`}>
                    {getCharacterCount()}/{MAX_SMS_LENGTH} tecken
                  </span>
                  <span className="text-gray-500">
                    {getMessageCount()} meddelande{getMessageCount() > 1 ? 'n' : ''}
                  </span>
                </div>
                <div className="flex items-center text-gray-600">
                  <DollarSign className="w-3 h-3 mr-1" />
                  <span>Kostnad: {formatCurrency(getEstimatedCost())}</span>
                </div>
              </div>
              
              {isOverLimit() && (
                <div className="mt-2 text-xs text-red-600">
                  Meddelandet är för långt och kommer att delas upp i {getMessageCount()} SMS.
                </div>
              )}
            </div>
          </div>

          {/* Customer Info */}
          <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
            <h4 className="font-medium text-blue-900 mb-2 flex items-center">
              <User className="w-4 h-4 mr-2" />
              Kundinformation
            </h4>
            <div className="text-sm text-blue-800 space-y-1">
              <p><strong>Kund:</strong> {order.customer?.name}</p>
              <p><strong>Telefon:</strong> {order.customer?.phone_number || 'Ej registrerat'}</p>
              <p><strong>Order:</strong> {order.title}</p>
            </div>
          </div>
        </div>

        {/* Footer */}
        <div className="flex items-center justify-between p-6 border-t bg-gray-50">
          <button
            onClick={handleSaveDraft}
            disabled={loading || !smsData.content.trim()}
            className="inline-flex items-center px-4 py-2 border border-gray-300 rounded-md shadow-sm text-sm font-medium text-gray-700 bg-white hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            <Save className="w-4 h-4 mr-2" />
            Spara utkast
          </button>

          <div className="flex items-center space-x-3">
            <button
              onClick={onClose}
              disabled={loading}
              className="px-4 py-2 border border-gray-300 rounded-md text-sm font-medium text-gray-700 bg-white hover:bg-gray-50 disabled:opacity-50"
            >
              Avbryt
            </button>
            <button
              onClick={handleSendSMS}
              disabled={loading || !smsData.to || !smsData.content.trim() || isOverLimit()}
              className="inline-flex items-center px-4 py-2 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-blue-600 hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {loading ? (
                <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
              ) : (
                <Send className="w-4 h-4 mr-2" />
              )}
              Skicka SMS ({formatCurrency(getEstimatedCost())})
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

export default SMSComposer;