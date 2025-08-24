import React, { useState, useEffect } from 'react';
import {
  Bell,
  Mail,
  Clock,
  CheckCircle,
  AlertCircle,
  RefreshCw,
  Play,
  Eye,
  Calendar,
  TrendingUp,
  FileText,
  Receipt,
  X
} from 'lucide-react';
import {
  triggerReminders,
  getReminderLogs,
  getReminderStats,
  getUpcomingReminders,
  type ReminderStats,
  type ReminderLog
} from '../lib/reminders';
import { formatCurrency, formatDateTime } from '../lib/database';
import { supabase } from '../lib/supabase';

// Fixed demo organization ID
const DEMO_ORG_ID = '550e8400-e29b-41d4-a716-446655440000';

interface ReminderManagementProps {
  organizationId?: string;
}

function ReminderManagement({ organizationId = DEMO_ORG_ID }: ReminderManagementProps) {
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [reminderLogs, setReminderLogs] = useState<ReminderLog[]>([]);
  const [stats, setStats] = useState<{
    totalReminders: number;
    quoteReminders: number;
    invoiceReminders: number;
    successRate: number;
  } | null>(null);
  const [upcomingReminders, setUpcomingReminders] = useState<{
    quotes: Array<{ id: string; quote_number: string; title: string; days_since_sent: number }>;
    invoices: Array<{ id: string; invoice_number: string; days_to_due: number; amount: number }>;
  } | null>(null);
  const [isTriggering, setIsTriggering] = useState(false);
  const [showLogs, setShowLogs] = useState(false);
  const [lastTriggerResult, setLastTriggerResult] = useState<ReminderStats | null>(null);

  useEffect(() => {
    loadData();
  }, [organizationId]);

  const loadData = async () => {
    try {
      setLoading(true);
      setError(null);

      const [logsResult, statsResult, upcomingResult] = await Promise.all([
        getReminderLogs(organizationId, 20),
        getReminderStats(organizationId, 30),
        getUpcomingReminders(organizationId)
      ]);

      if (logsResult.error) {
        setError(logsResult.error.message);
        return;
      }

      if (statsResult.error) {
        setError(statsResult.error.message);
        return;
      }

      if (upcomingResult.error) {
        setError(upcomingResult.error.message);
        return;
      }

      setReminderLogs(logsResult.data || []);
      setStats(statsResult.data);
      setUpcomingReminders(upcomingResult.data);
    } catch (err) {
      console.error('Error loading reminder data:', err);
      setError('Ett oväntat fel inträffade vid hämtning av påminnelsedata.');
    } finally {
      setLoading(false);
    }
  };

  const handleTriggerReminders = async (type?: 'quotes' | 'invoices', dryRun = false) => {
    try {
      setIsTriggering(true);
      setError(null);

      const result = await triggerReminders(organizationId, type, dryRun);

      if (result.error) {
        setError(result.error.message);
        return;
      }

      setLastTriggerResult(result.data);
      
      // Reload data to show updated logs
      await loadData();
    } catch (err) {
      console.error('Error triggering reminders:', err);
      setError('Ett fel inträffade vid körning av påminnelser.');
    } finally {
      setIsTriggering(false);
    }
  };

  const getReminderTypeLabel = (type: string) => {
    switch (type) {
      case 'quote_followup': return 'Offert-uppföljning';
      case 'invoice_payment': return 'Faktura-påminnelse';
      default: return type;
    }
  };

  const getReminderTypeIcon = (type: string) => {
    switch (type) {
      case 'quote_followup': return FileText;
      case 'invoice_payment': return Receipt;
      default: return Bell;
    }
  };

  const getDaysDescription = (type: string, daysOffset: number) => {
    if (type === 'quote_followup') {
      return `${daysOffset} dagar efter skickad`;
    } else {
      if (daysOffset < 0) {
        return `${Math.abs(daysOffset)} dagar före förfallodatum`;
      } else if (daysOffset === 0) {
        return 'På förfallodatum';
      } else {
        return `${daysOffset} dagar efter förfallodatum`;
      }
    }
  };

  if (loading) {
    return (
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <h2 className="text-2xl font-bold text-gray-900">Automatiska Påminnelser</h2>
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          {[1, 2, 3].map(i => (
            <div key={i} className="bg-white rounded-lg p-6 animate-pulse">
              <div className="h-6 bg-gray-200 rounded mb-4"></div>
              <div className="h-8 bg-gray-200 rounded mb-2"></div>
              <div className="h-4 bg-gray-200 rounded"></div>
            </div>
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h2 className="text-2xl font-bold text-gray-900 flex items-center">
            <Bell className="w-7 h-7 mr-3 text-blue-600" />
            Automatiska Påminnelser
          </h2>
          <p className="mt-2 text-gray-600">
            Hantera automatiska e-postpåminnelser för offerter och fakturor
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
          <button
            onClick={() => setShowLogs(!showLogs)}
            className="inline-flex items-center px-3 py-2 border border-gray-300 rounded-md shadow-sm text-sm font-medium text-gray-700 bg-white hover:bg-gray-50"
          >
            <Eye className="w-4 h-4 mr-2" />
            {showLogs ? 'Dölj' : 'Visa'} Logg
          </button>
        </div>
      </div>

      {/* Error Display */}
      {error && (
        <div className="bg-red-50 border border-red-200 rounded-lg p-4">
          <div className="flex items-center">
            <AlertCircle className="w-5 h-5 text-red-600 mr-2" />
            <p className="text-red-700">{error}</p>
          </div>
        </div>
      )}

      {/* Last Trigger Result */}
      {lastTriggerResult && (
        <div className="bg-green-50 border border-green-200 rounded-lg p-4">
          <div className="flex items-center mb-2">
            <CheckCircle className="w-5 h-5 text-green-600 mr-2" />
            <h3 className="font-medium text-green-900">Påminnelser körda</h3>
          </div>
          <div className="text-sm text-green-700">
            <p>Offerter behandlade: {lastTriggerResult.quotesProcessed}</p>
            <p>Fakturor behandlade: {lastTriggerResult.invoicesProcessed}</p>
            <p>E-post skickade: {lastTriggerResult.emailsSent}</p>
            {lastTriggerResult.errors.length > 0 && (
              <p className="text-red-600">Fel: {lastTriggerResult.errors.length}</p>
            )}
          </div>
        </div>
      )}

      {/* Statistics Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
        <div className="bg-white rounded-lg shadow-sm border p-6">
          <div className="flex items-center">
            <div className="w-12 h-12 bg-blue-100 rounded-lg flex items-center justify-center">
              <Mail className="w-6 h-6 text-blue-600" />
            </div>
            <div className="ml-4">
              <p className="text-sm font-medium text-gray-500">Totalt skickade</p>
              <p className="text-2xl font-bold text-gray-900">{stats?.totalReminders || 0}</p>
            </div>
          </div>
        </div>

        <div className="bg-white rounded-lg shadow-sm border p-6">
          <div className="flex items-center">
            <div className="w-12 h-12 bg-purple-100 rounded-lg flex items-center justify-center">
              <FileText className="w-6 h-6 text-purple-600" />
            </div>
            <div className="ml-4">
              <p className="text-sm font-medium text-gray-500">Offert-påminnelser</p>
              <p className="text-2xl font-bold text-gray-900">{stats?.quoteReminders || 0}</p>
            </div>
          </div>
        </div>

        <div className="bg-white rounded-lg shadow-sm border p-6">
          <div className="flex items-center">
            <div className="w-12 h-12 bg-green-100 rounded-lg flex items-center justify-center">
              <Receipt className="w-6 h-6 text-green-600" />
            </div>
            <div className="ml-4">
              <p className="text-sm font-medium text-gray-500">Faktura-påminnelser</p>
              <p className="text-2xl font-bold text-gray-900">{stats?.invoiceReminders || 0}</p>
            </div>
          </div>
        </div>

        <div className="bg-white rounded-lg shadow-sm border p-6">
          <div className="flex items-center">
            <div className="w-12 h-12 bg-yellow-100 rounded-lg flex items-center justify-center">
              <TrendingUp className="w-6 h-6 text-yellow-600" />
            </div>
            <div className="ml-4">
              <p className="text-sm font-medium text-gray-500">Framgångsgrad</p>
              <p className="text-2xl font-bold text-gray-900">{stats?.successRate || 0}%</p>
            </div>
          </div>
        </div>
      </div>

      {/* Manual Trigger Section */}
      <div className="bg-white rounded-lg shadow-sm border p-6">
        <h3 className="text-lg font-semibold text-gray-900 mb-4">Manuell körning</h3>
        <p className="text-gray-600 mb-4">
          Kör påminnelser manuellt för testning eller omedelbar körning. Normalt körs dessa automatiskt via cron job.
        </p>
        
        <div className="flex flex-wrap gap-3">
          <button
            onClick={() => handleTriggerReminders(undefined, true)}
            disabled={isTriggering}
            className="inline-flex items-center px-4 py-2 border border-gray-300 rounded-md shadow-sm text-sm font-medium text-gray-700 bg-white hover:bg-gray-50 disabled:opacity-50"
          >
            {isTriggering ? (
              <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-gray-600 mr-2"></div>
            ) : (
              <Eye className="w-4 h-4 mr-2" />
            )}
            Test-körning (Dry Run)
          </button>
          
          <button
            onClick={() => handleTriggerReminders('quotes')}
            disabled={isTriggering}
            className="inline-flex items-center px-4 py-2 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-purple-600 hover:bg-purple-700 disabled:opacity-50"
          >
            {isTriggering ? (
              <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
            ) : (
              <FileText className="w-4 h-4 mr-2" />
            )}
            Kör Offert-påminnelser
          </button>
          
          <button
            onClick={() => handleTriggerReminders('invoices')}
            disabled={isTriggering}
            className="inline-flex items-center px-4 py-2 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-green-600 hover:bg-green-700 disabled:opacity-50"
          >
            {isTriggering ? (
              <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
            ) : (
              <Receipt className="w-4 h-4 mr-2" />
            )}
            Kör Faktura-påminnelser
          </button>
          
          <button
            onClick={() => handleTriggerReminders()}
            disabled={isTriggering}
            className="inline-flex items-center px-4 py-2 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-blue-600 hover:bg-blue-700 disabled:opacity-50"
          >
            {isTriggering ? (
              <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
            ) : (
              <Play className="w-4 h-4 mr-2" />
            )}
            Kör Alla Påminnelser
          </button>
        </div>
      </div>

      {/* Upcoming Reminders */}
      {upcomingReminders && (upcomingReminders.quotes.length > 0 || upcomingReminders.invoices.length > 0) && (
        <div className="bg-white rounded-lg shadow-sm border p-6">
          <h3 className="text-lg font-semibold text-gray-900 mb-4">Kommande Påminnelser</h3>
          
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* Upcoming Quote Reminders */}
            {upcomingReminders.quotes.length > 0 && (
              <div>
                <h4 className="font-medium text-gray-900 mb-3 flex items-center">
                  <FileText className="w-4 h-4 mr-2 text-purple-600" />
                  Offerter ({upcomingReminders.quotes.length})
                </h4>
                <div className="space-y-2">
                  {upcomingReminders.quotes.map((quote) => (
                    <div key={quote.id} className="flex items-center justify-between p-3 bg-purple-50 rounded-lg">
                      <div>
                        <p className="font-medium text-gray-900">{quote.quote_number}</p>
                        <p className="text-sm text-gray-600">{quote.title}</p>
                      </div>
                      <div className="text-right">
                        <p className="text-sm font-medium text-purple-600">
                          {quote.days_since_sent} dagar sedan
                        </p>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Upcoming Invoice Reminders */}
            {upcomingReminders.invoices.length > 0 && (
              <div>
                <h4 className="font-medium text-gray-900 mb-3 flex items-center">
                  <Receipt className="w-4 h-4 mr-2 text-green-600" />
                  Fakturor ({upcomingReminders.invoices.length})
                </h4>
                <div className="space-y-2">
                  {upcomingReminders.invoices.map((invoice) => (
                    <div key={invoice.id} className="flex items-center justify-between p-3 bg-green-50 rounded-lg">
                      <div>
                        <p className="font-medium text-gray-900">{invoice.invoice_number}</p>
                        <p className="text-sm text-gray-600">{formatCurrency(invoice.amount)}</p>
                      </div>
                      <div className="text-right">
                        <p className={`text-sm font-medium ${
                          invoice.days_to_due > 0 ? 'text-red-600' : 
                          invoice.days_to_due === 0 ? 'text-orange-600' : 'text-green-600'
                        }`}>
                          {invoice.days_to_due > 0 ? `${invoice.days_to_due} dagar försenad` :
                           invoice.days_to_due === 0 ? 'Förfaller idag' :
                           `${Math.abs(invoice.days_to_due)} dagar kvar`}
                        </p>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        </div>
      )}

      {/* Reminder Logs */}
      {showLogs && (
        <div className="bg-white rounded-lg shadow-sm border">
          <div className="px-6 py-4 border-b border-gray-200">
            <div className="flex items-center justify-between">
              <h3 className="text-lg font-semibold text-gray-900">Påminnelselogg</h3>
              <button
                onClick={() => setShowLogs(false)}
                className="text-gray-400 hover:text-gray-600"
              >
                <X className="w-5 h-5" />
              </button>
            </div>
          </div>
          
          <div className="p-6">
            {reminderLogs.length === 0 ? (
              <div className="text-center py-8 text-gray-500">
                <Bell className="w-12 h-12 mx-auto mb-2 text-gray-400" />
                <p>Inga påminnelser skickade ännu</p>
              </div>
            ) : (
              <div className="space-y-4">
                {reminderLogs.map((log) => {
                  const Icon = getReminderTypeIcon(log.reminder_type);
                  return (
                    <div key={log.id} className="flex items-start space-x-3 p-4 bg-gray-50 rounded-lg">
                      <div className="flex-shrink-0">
                        <div className={`w-8 h-8 rounded-full flex items-center justify-center ${
                          log.email_sent ? 'bg-green-100' : 'bg-red-100'
                        }`}>
                          {log.email_sent ? (
                            <CheckCircle className="w-4 h-4 text-green-600" />
                          ) : (
                            <AlertCircle className="w-4 h-4 text-red-600" />
                          )}
                        </div>
                      </div>
                      
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center space-x-2 mb-1">
                          <Icon className="w-4 h-4 text-gray-600" />
                          <p className="text-sm font-medium text-gray-900">
                            {getReminderTypeLabel(log.reminder_type)}
                          </p>
                          <span className="text-xs text-gray-500">
                            {getDaysDescription(log.reminder_type, log.days_offset)}
                          </span>
                        </div>
                        
                        <p className="text-sm text-gray-600">
                          {log.quote_id ? `Offert: ${(log as any).quote?.quote_number}` : 
                           log.invoice_id ? `Faktura: ${(log as any).invoice?.invoice_number}` : 
                           'Okänd referens'}
                        </p>
                        
                        <div className="flex items-center justify-between mt-2">
                          <p className="text-xs text-gray-500">
                            {formatDateTime(log.sent_at)}
                          </p>
                          {log.email_error && (
                            <p className="text-xs text-red-600">
                              Fel: {log.email_error}
                            </p>
                          )}
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        </div>
      )}

      {/* Cron Job Instructions */}
      <div className="bg-blue-50 border border-blue-200 rounded-lg p-6">
        <h3 className="text-lg font-semibold text-blue-900 mb-2">Automatisk körning med Cron Job</h3>
        <p className="text-blue-800 mb-4">
          För att köra påminnelser automatiskt: (Zobor löser i slutet)
        </p>
        <div className="bg-blue-100 rounded-lg p-4">
          <code className="text-sm text-blue-900 block">
            # tex: Kör påminnelser varje dag kl 09:00<br/>
            0 9 * * * curl -X POST "https://your-project.supabase.co/functions/v1/send-reminders" \<br/>
            &nbsp;&nbsp;-H "Authorization: Bearer YOUR_SERVICE_ROLE_KEY" \<br/>
            &nbsp;&nbsp;-H "Content-Type: application/json" \<br/>
            &nbsp;&nbsp;-d '{}'
          </code>
        </div>
        <p className="text-sm text-blue-700 mt-2">
          Sätts up vid lansering
        </p>
      </div>
    </div>
  );
}

export default ReminderManagement;