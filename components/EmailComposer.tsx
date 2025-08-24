import React, { useState, useEffect } from 'react';
import { Mail, X, Send, Save, BookTemplate as Template, User, Building, AlertCircle, CheckCircle } from 'lucide-react';
import {
  createCommunication,
  sendEmail,
  EMAIL_TEMPLATES,
  processTemplate,
  getTemplateVariables,
  validateEmail,
  type EmailTemplate
} from '../lib/communications';
import { useAuth } from '../contexts/AuthContext';
import { getUserProfiles } from '../lib/database';
import type { OrderWithRelations } from '../lib/orders';

interface EmailComposerProps {
  isOpen: boolean;
  onClose: () => void;
  order: OrderWithRelations;
  onEmailSent: () => void;
}

function EmailComposer({ isOpen, onClose, order, onEmailSent }: EmailComposerProps) {
  const { user } = useAuth();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [userProfile, setUserProfile] = useState<any>(null);
  const [selectedTemplate, setSelectedTemplate] = useState<string>('');
  const [emailData, setEmailData] = useState({
    to: order.customer?.email || '',
    subject: `Angående order #${order.id.slice(-8).toUpperCase()}`,
    content: ''
  });

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
      setEmailData(prev => ({
        ...prev,
        subject: `Angående order #${order.id.slice(-8).toUpperCase()}`,
        content: ''
      }));
      return;
    }

    const template = EMAIL_TEMPLATES.find(t => t.id === templateId);
    if (!template) return;

    const variables = getTemplateVariables(order, userProfile?.organisation?.name);
    
    setEmailData(prev => ({
      ...prev,
      subject: processTemplate(template.subject, variables),
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
        type: 'email',
        recipient: emailData.to,
        subject: emailData.subject,
        content: emailData.content,
        status: 'draft',
        created_by_user_id: user.id
      });

      if (result.error) {
        setError(result.error.message);
        return;
      }

      onEmailSent();
    } catch (err) {
      console.error('Error saving draft:', err);
      setError('Ett oväntat fel inträffade vid sparning av utkast.');
    } finally {
      setLoading(false);
    }
  };

  const handleSendEmail = async () => {
    if (!user || !userProfile?.organisation_id) return;

    if (!validateEmail(emailData.to)) {
      setError('Ogiltig e-postadress.');
      return;
    }

    if (!emailData.subject.trim() || !emailData.content.trim()) {
      setError('Ämne och innehåll är obligatoriska.');
      return;
    }

    try {
      setLoading(true);
      setError(null);

      // Create communication record
      const commResult = await createCommunication({
        organisation_id: userProfile.organisation_id,
        order_id: order.id,
        type: 'email',
        recipient: emailData.to,
        subject: emailData.subject,
        content: emailData.content,
        status: 'draft',
        created_by_user_id: user.id
      });

      if (commResult.error) {
        setError(commResult.error.message);
        return;
      }

      // Send email
      const sendResult = await sendEmail(commResult.data!.id, {
        to: emailData.to,
        subject: emailData.subject,
        content: emailData.content,
        from_name: userProfile.organisation?.name || 'Momentum CRM',
        from_email: 'noreply@momentum.se'
      });

      if (sendResult.error) {
        setError(sendResult.error.message);
        return;
      }

      onEmailSent();
    } catch (err) {
      console.error('Error sending email:', err);
      setError('Ett oväntat fel inträffade vid skickande av e-post.');
    } finally {
      setLoading(false);
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
      <div className="bg-white rounded-lg max-w-3xl w-full max-h-[90vh] overflow-y-auto">
        {/* Header */}
        <div className="flex items-center justify-between p-6 border-b">
          <div className="flex items-center">
            <Mail className="w-6 h-6 text-blue-600 mr-3" />
            <div>
              <h3 className="text-lg font-semibold text-gray-900">Skicka E-post</h3>
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
              {EMAIL_TEMPLATES.map((template) => (
                <option key={template.id} value={template.id}>
                  {template.name}
                </option>
              ))}
            </select>
          </div>

          {/* Email Form */}
          <div className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Till *
              </label>
              <input
                type="email"
                required
                value={emailData.to}
                onChange={(e) => setEmailData(prev => ({ ...prev, to: e.target.value }))}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-blue-500 focus:border-blue-500"
                placeholder="kund@exempel.se"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Ämne *
              </label>
              <input
                type="text"
                required
                value={emailData.subject}
                onChange={(e) => setEmailData(prev => ({ ...prev, subject: e.target.value }))}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-blue-500 focus:border-blue-500"
                placeholder="Ämnesrad för e-posten"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Meddelande *
              </label>
              <textarea
                required
                value={emailData.content}
                onChange={(e) => setEmailData(prev => ({ ...prev, content: e.target.value }))}
                rows={12}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-blue-500 focus:border-blue-500"
                placeholder="Skriv ditt meddelande här..."
              />
              <p className="text-xs text-gray-500 mt-1">
                {emailData.content.length} tecken
              </p>
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
              <p><strong>E-post:</strong> {order.customer?.email || 'Ej registrerad'}</p>
              <p><strong>Telefon:</strong> {order.customer?.phone_number || 'Ej registrerat'}</p>
              <p><strong>Order:</strong> {order.title}</p>
            </div>
          </div>
        </div>

        {/* Footer */}
        <div className="flex items-center justify-between p-6 border-t bg-gray-50">
          <button
            onClick={handleSaveDraft}
            disabled={loading || !emailData.content.trim()}
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
              onClick={handleSendEmail}
              disabled={loading || !emailData.to || !emailData.subject.trim() || !emailData.content.trim()}
              className="inline-flex items-center px-4 py-2 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-blue-600 hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {loading ? (
                <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
              ) : (
                <Send className="w-4 h-4 mr-2" />
              )}
              Skicka E-post
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

export default EmailComposer;