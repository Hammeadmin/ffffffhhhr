import React, { useState, useEffect } from 'react';
import {
  MessageSquare,
  Mail,
  Phone,
  Plus,
  Clock,
  CheckCircle,
  AlertCircle,
  Send,
  User,
  Calendar
} from 'lucide-react';
import {
  getOrderCommunications,
  createCommunication,
  sendEmail,
  sendSMS,
  EMAIL_TEMPLATES,
  SMS_TEMPLATES,
  processTemplate,
  getTemplateVariables,
  getStatusColor,
  getStatusLabel,
  calculateSMSCost,
  type Communication,
  type CommunicationWithRelations,
  type EmailTemplate,
  type SMSTemplate
} from '../lib/communications';
import { formatDateTime } from '../lib/database';
import { useAuth } from '../contexts/AuthContext';
import { useToast } from '../hooks/useToast';
import LoadingSpinner from './LoadingSpinner';
import EmailComposer from './EmailComposer';
import SMSComposer from './SMSComposer';
import type { OrderWithRelations } from '../lib/orders';

interface CommunicationPanelProps {
  order: OrderWithRelations;
  className?: string;
}

function CommunicationPanel({ order, className = '' }: CommunicationPanelProps) {
  const { user } = useAuth();
  const { success, error: showError } = useToast();
  const [loading, setLoading] = useState(true);
  const [communications, setCommunications] = useState<CommunicationWithRelations[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [showEmailComposer, setShowEmailComposer] = useState(false);
  const [showSMSComposer, setShowSMSComposer] = useState(false);

  useEffect(() => {
    loadCommunications();
  }, [order.id]);

  const loadCommunications = async () => {
    try {
      setLoading(true);
      setError(null);

      const result = await getOrderCommunications(order.id);
      if (result.error) {
        setError(result.error.message);
        return;
      }

      setCommunications(result.data || []);
    } catch (err) {
      console.error('Error loading communications:', err);
      setError('Ett oväntat fel inträffade vid laddning av kommunikation.');
    } finally {
      setLoading(false);
    }
  };

  const handleEmailSent = () => {
    setShowEmailComposer(false);
    loadCommunications();
    success('E-post skickat framgångsrikt!');
  };

  const handleSMSSent = () => {
    setShowSMSComposer(false);
    loadCommunications();
    success('SMS skickat framgångsrikt!');
  };

  const getTimelineIcon = (communication: CommunicationWithRelations) => {
    if (communication.type === 'email') {
      switch (communication.status) {
        case 'sent': return <Mail className="w-4 h-4 text-blue-600" />;
        case 'delivered': return <CheckCircle className="w-4 h-4 text-green-600" />;
        case 'failed': return <AlertCircle className="w-4 h-4 text-red-600" />;
        default: return <Mail className="w-4 h-4 text-gray-600" />;
      }
    } else {
      switch (communication.status) {
        case 'sent': return <Phone className="w-4 h-4 text-blue-600" />;
        case 'delivered': return <CheckCircle className="w-4 h-4 text-green-600" />;
        case 'failed': return <AlertCircle className="w-4 h-4 text-red-600" />;
        default: return <Phone className="w-4 h-4 text-gray-600" />;
      }
    }
  };

  const formatRecipient = (communication: CommunicationWithRelations) => {
    if (communication.type === 'email') {
      return communication.recipient;
    } else {
      // Format phone number for display
      const phone = communication.recipient;
      if (phone.startsWith('+46')) {
        return phone.replace('+46', '0').replace(/(\d{3})(\d{3})(\d{2})(\d{2})/, '$1-$2 $3 $4');
      }
      return phone;
    }
  };

  if (loading) {
    return (
      <div className={`bg-white rounded-lg border p-6 ${className}`}>
        <LoadingSpinner size="sm" text="Laddar kommunikation..." />
      </div>
    );
  }

  return (
    <div className={`bg-white rounded-lg border ${className}`}>
      <div className="p-6 border-b border-gray-200">
        <div className="flex items-center justify-between">
          <h3 className="text-lg font-semibold text-gray-900 flex items-center">
            <MessageSquare className="w-5 h-5 mr-2 text-blue-600" />
            Kommunikation
          </h3>
          <div className="flex items-center space-x-2">
            <button
              onClick={() => setShowEmailComposer(true)}
              disabled={!order.customer?.email}
              className="inline-flex items-center px-3 py-2 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-blue-600 hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed"
              title={!order.customer?.email ? 'Ingen e-postadress registrerad för kunden' : 'Skicka e-post'}
            >
              <Mail className="w-4 h-4 mr-2" />
              Skicka E-post
            </button>
            <button
              onClick={() => setShowSMSComposer(true)}
              disabled={!order.customer?.phone_number}
              className="inline-flex items-center px-3 py-2 border border-gray-300 rounded-md shadow-sm text-sm font-medium text-gray-700 bg-white hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed"
              title={!order.customer?.phone_number ? 'Inget telefonnummer registrerat för kunden' : 'Skicka SMS'}
            >
              <Phone className="w-4 h-4 mr-2" />
              Skicka SMS
            </button>
          </div>
        </div>
      </div>

      <div className="p-6">
        {error && (
          <div className="mb-4 bg-red-50 border border-red-200 rounded-lg p-4">
            <div className="flex items-center">
              <AlertCircle className="w-5 h-5 text-red-600 mr-2" />
              <p className="text-red-700">{error}</p>
            </div>
          </div>
        )}

        {communications.length === 0 ? (
          <div className="text-center py-8 text-gray-500">
            <MessageSquare className="w-12 h-12 mx-auto mb-3 text-gray-400" />
            <p className="font-medium">Ingen kommunikation ännu</p>
            <p className="text-sm mt-1">Skicka ditt första meddelande till kunden</p>
          </div>
        ) : (
          <div className="space-y-6">
            <h4 className="font-medium text-gray-900">Kommunikationshistorik</h4>
            
            {/* Timeline */}
            <div className="flow-root">
              <ul className="-mb-8">
                {communications.map((communication, index) => (
                  <li key={communication.id}>
                    <div className="relative pb-8">
                      {index !== communications.length - 1 && (
                        <span
                          className="absolute top-4 left-4 -ml-px h-full w-0.5 bg-gray-200"
                          aria-hidden="true"
                        />
                      )}
                      <div className="relative flex space-x-3">
                        <div className="flex h-8 w-8 items-center justify-center rounded-full bg-white border-2 border-gray-300">
                          {getTimelineIcon(communication)}
                        </div>
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center justify-between">
                            <div className="flex items-center space-x-2">
                              <p className="text-sm font-medium text-gray-900">
                                {communication.type === 'email' ? 'E-post' : 'SMS'}
                              </p>
                              <span className={`inline-flex px-2 py-1 text-xs font-medium rounded-full ${getStatusColor(communication.status)}`}>
                                {getStatusLabel(communication.status)}
                              </span>
                            </div>
                            <p className="text-sm text-gray-500">
                              {formatDateTime(communication.created_at)}
                            </p>
                          </div>
                          
                          <div className="mt-2">
                            <p className="text-sm text-gray-600">
                              Till: {formatRecipient(communication)}
                            </p>
                            {communication.subject && (
                              <p className="text-sm font-medium text-gray-900 mt-1">
                                {communication.subject}
                              </p>
                            )}
                            <div className="mt-2 p-3 bg-gray-50 rounded-lg">
                              <p className="text-sm text-gray-700 whitespace-pre-wrap">
                                {communication.content}
                              </p>
                            </div>
                            
                            {communication.created_by && (
                              <div className="flex items-center mt-2 text-xs text-gray-500">
                                <User className="w-3 h-3 mr-1" />
                                Skickat av {communication.created_by.full_name}
                              </div>
                            )}
                            
                            {communication.error_message && (
                              <div className="mt-2 p-2 bg-red-50 border border-red-200 rounded text-xs text-red-700">
                                Fel: {communication.error_message}
                              </div>
                            )}
                          </div>
                        </div>
                      </div>
                    </div>
                  </li>
                ))}
              </ul>
            </div>
          </div>
        )}
      </div>

      {/* Email Composer Modal */}
      {showEmailComposer && (
        <EmailComposer
          isOpen={showEmailComposer}
          onClose={() => setShowEmailComposer(false)}
          order={order}
          onEmailSent={handleEmailSent}
        />
      )}

      {/* SMS Composer Modal */}
      {showSMSComposer && (
        <SMSComposer
          isOpen={showSMSComposer}
          onClose={() => setShowSMSComposer(false)}
          order={order}
          onSMSSent={handleSMSSent}
        />
      )}
    </div>
  );
}

export default CommunicationPanel;