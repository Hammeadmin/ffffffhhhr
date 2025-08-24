import React, { useState } from 'react';
import {
  Zap,
  Link,
  CheckCircle,
  AlertCircle,
  Settings,
  Calendar,
  Mail,
  Database,
  Download,
  Upload,
  Key,
  Globe,
  Save,
  MessageSquare,
  X,
  RefreshCw,
  ExternalLink
} from 'lucide-react';

interface Integration {
  id: string;
  name: string;
  description: string;
  icon: React.ComponentType<any>;
  status: 'connected' | 'disconnected' | 'error';
  lastSync?: string;
  settings?: Record<string, any>;
}

function IntegrationSettings() {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const [showConfigModal, setShowConfigModal] = useState<string | null>(null);

  const [integrations, setIntegrations] = useState<Integration[]>([
    {
      id: 'fortnox',
      name: 'Fortnox',
      description: 'Synkronisera fakturor och kunder med Fortnox redovisningssystem',
      icon: Database,
      status: 'disconnected',
      settings: {
        apiKey: '',
        clientSecret: '',
        autoSync: false,
        syncInterval: '24h'
      }
    },
    {
      id: 'google-calendar',
      name: 'Google Calendar',
      description: 'Synkronisera möten och aktiviteter med Google Calendar',
      icon: Calendar,
      status: 'disconnected',
      settings: {
        calendarId: '',
        syncDirection: 'both',
        reminderMinutes: 15
      }
    },
    {
      id: 'outlook-calendar',
      name: 'Outlook Calendar',
      description: 'Synkronisera möten och aktiviteter med Outlook Calendar',
      icon: Calendar,
      status: 'disconnected',
      settings: {
        tenantId: '',
        clientId: '',
        syncDirection: 'both'
      }
    },
    {
      id: 'sendgrid',
      name: 'SendGrid',
      description: 'Skicka e-post via SendGrid för påminnelser och notifieringar',
      icon: Mail,
      status: 'disconnected',
      settings: {
        apiKey: '',
        fromEmail: '',
        fromName: '',
        templates: {}
      }
    },
     { 
      id: 'twilio',
      name: 'Twilio',
      description: 'SMS-tjänst som ett alternativ till kommunikation/påminnelser/bekräftelser',
      icon: MessageSquare,
      status: 'disconnected',
      settings: {
      accountSid: '',
      authToken: '',
      phoneNumber: ''
    }
 },
    {
      id: 'mailgun',
      name: 'Mailgun',
      description: 'Alternativ e-posttjänst för att skicka transaktionsmail',
      icon: Mail,
      status: 'disconnected',
      settings: {
        apiKey: '',
        domain: '',
        fromEmail: ''
      }
    }
  ]);

  const [backupSettings, setBackupSettings] = useState({
    autoBackup: true,
    backupFrequency: 'weekly',
    retentionDays: 30,
    includeFiles: true,
    encryptBackups: true,
    backupLocation: 'cloud'
  });

  const handleConnect = async (integrationId: string) => {
    setLoading(true);
    setError(null);
    
    try {
      // Simulate connection process
      await new Promise(resolve => setTimeout(resolve, 2000));
      
      setIntegrations(prev => prev.map(integration => 
        integration.id === integrationId 
          ? { ...integration, status: 'connected', lastSync: new Date().toISOString() }
          : integration
      ));
      
      setSuccess(`${integrations.find(i => i.id === integrationId)?.name} ansluten framgångsrikt!`);
      setTimeout(() => setSuccess(null), 3000);
    } catch (err) {
      setError('Kunde inte ansluta integration. Kontrollera inställningarna.');
    } finally {
      setLoading(false);
    }
  };

  const handleDisconnect = async (integrationId: string) => {
    if (!confirm('Är du säker på att du vill koppla från denna integration?')) return;
    
    setIntegrations(prev => prev.map(integration => 
      integration.id === integrationId 
        ? { ...integration, status: 'disconnected', lastSync: undefined }
        : integration
    ));
    
    setSuccess('Integration frånkopplad framgångsrikt!');
    setTimeout(() => setSuccess(null), 3000);
  };

  const handleSync = async (integrationId: string) => {
    setLoading(true);
    
    try {
      // Simulate sync process
      await new Promise(resolve => setTimeout(resolve, 1500));
      
      setIntegrations(prev => prev.map(integration => 
        integration.id === integrationId 
          ? { ...integration, lastSync: new Date().toISOString() }
          : integration
      ));
      
      setSuccess('Synkronisering slutförd framgångsrikt!');
      setTimeout(() => setSuccess(null), 3000);
    } catch (err) {
      setError('Synkronisering misslyckades. Försök igen senare.');
    } finally {
      setLoading(false);
    }
  };

  const handleExportData = async () => {
    setLoading(true);
    
    try {
      // Simulate export process
      await new Promise(resolve => setTimeout(resolve, 2000));
      
      // Create a mock export file
      const exportData = {
        exportDate: new Date().toISOString(),
        leads: 'Mock lead data...',
        customers: 'Mock customer data...',
        quotes: 'Mock quote data...',
        jobs: 'Mock job data...',
        invoices: 'Mock invoice data...'
      };
      
      const blob = new Blob([JSON.stringify(exportData, null, 2)], { type: 'application/json' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `momentum-export-${new Date().toISOString().split('T')[0]}.json`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
      
      setSuccess('Data exporterad framgångsrikt!');
      setTimeout(() => setSuccess(null), 3000);
    } catch (err) {
      setError('Export misslyckades. Försök igen senare.');
    } finally {
      setLoading(false);
    }
  };

  const handleBackup = async () => {
    setLoading(true);
    
    try {
      // Simulate backup process
      await new Promise(resolve => setTimeout(resolve, 3000));
      
      setSuccess('Backup skapad framgångsrikt!');
      setTimeout(() => setSuccess(null), 3000);
    } catch (err) {
      setError('Backup misslyckades. Försök igen senare.');
    } finally {
      setLoading(false);
    }
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'connected':
        return <CheckCircle className="w-5 h-5 text-green-600" />;
      case 'error':
        return <AlertCircle className="w-5 h-5 text-red-600" />;
      default:
        return <X className="w-5 h-5 text-gray-400" />;
    }
  };

  const getStatusLabel = (status: string) => {
    switch (status) {
      case 'connected': return 'Ansluten';
      case 'error': return 'Fel';
      default: return 'Ej ansluten';
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'connected': return 'text-green-600';
      case 'error': return 'text-red-600';
      default: return 'text-gray-500';
    }
  };

  const formatLastSync = (lastSync?: string) => {
    if (!lastSync) return 'Aldrig';
    
    const date = new Date(lastSync);
    const now = new Date();
    const diffMinutes = Math.floor((now.getTime() - date.getTime()) / (1000 * 60));
    
    if (diffMinutes < 1) return 'Just nu';
    if (diffMinutes < 60) return `${diffMinutes} min sedan`;
    if (diffMinutes < 1440) return `${Math.floor(diffMinutes / 60)} tim sedan`;
    return `${Math.floor(diffMinutes / 1440)} dagar sedan`;
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h2 className="text-2xl font-bold text-gray-900 flex items-center">
          <Zap className="w-7 h-7 mr-3 text-blue-600" />
          Integrationer
        </h2>
        <p className="mt-2 text-gray-600">
          Anslut externa tjänster för att automatisera arbetsflöden och synkronisera data
        </p>
      </div>

      {/* Status Messages */}
      {error && (
        <div className="bg-red-50 border border-red-200 rounded-lg p-4">
          <div className="flex items-center">
            <AlertCircle className="w-5 h-5 text-red-600 mr-2" />
            <p className="text-red-700">{error}</p>
            <button
              onClick={() => setError(null)}
              className="ml-auto text-red-400 hover:text-red-600"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        </div>
      )}

      {success && (
        <div className="bg-green-50 border border-green-200 rounded-lg p-4">
          <div className="flex items-center">
            <CheckCircle className="w-5 h-5 text-green-600 mr-2" />
            <p className="text-green-700">{success}</p>
            <button
              onClick={() => setSuccess(null)}
              className="ml-auto text-green-400 hover:text-green-600"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        </div>
      )}

      {/* Available Integrations */}
      <div className="bg-white rounded-lg shadow-sm border">
        <div className="px-6 py-4 border-b border-gray-200">
          <h3 className="text-lg font-semibold text-gray-900">Tillgängliga integrationer</h3>
        </div>
        
        <div className="p-6">
          <div className="grid grid-cols-1 gap-6">
            {integrations.map((integration) => {
              const Icon = integration.icon;
              return (
                <div key={integration.id} className="border border-gray-200 rounded-lg p-6">
                  <div className="flex items-start justify-between">
                    <div className="flex items-start space-x-4">
                      <div className="w-12 h-12 bg-gray-100 rounded-lg flex items-center justify-center">
                        <Icon className="w-6 h-6 text-gray-600" />
                      </div>
                      
                      <div className="flex-1">
                        <div className="flex items-center space-x-3 mb-2">
                          <h4 className="font-medium text-gray-900">{integration.name}</h4>
                          <div className="flex items-center space-x-2">
                            {getStatusIcon(integration.status)}
                            <span className={`text-sm font-medium ${getStatusColor(integration.status)}`}>
                              {getStatusLabel(integration.status)}
                            </span>
                          </div>
                        </div>
                        
                        <p className="text-sm text-gray-600 mb-3">{integration.description}</p>
                        
                        {integration.status === 'connected' && (
                          <p className="text-xs text-gray-500">
                            Senast synkroniserad: {formatLastSync(integration.lastSync)}
                          </p>
                        )}
                      </div>
                    </div>
                    
                    <div className="flex items-center space-x-2">
                      {integration.status === 'connected' ? (
                        <>
                          <button
                            onClick={() => handleSync(integration.id)}
                            disabled={loading}
                            className="inline-flex items-center px-3 py-2 border border-gray-300 rounded-md shadow-sm text-sm font-medium text-gray-700 bg-white hover:bg-gray-50 disabled:opacity-50"
                          >
                            <RefreshCw className="w-4 h-4 mr-2" />
                            Synka
                          </button>
                          <button
                            onClick={() => setShowConfigModal(integration.id)}
                            className="inline-flex items-center px-3 py-2 border border-gray-300 rounded-md shadow-sm text-sm font-medium text-gray-700 bg-white hover:bg-gray-50"
                          >
                            <Settings className="w-4 h-4 mr-2" />
                            Konfigurera
                          </button>
                          <button
                            onClick={() => handleDisconnect(integration.id)}
                            className="inline-flex items-center px-3 py-2 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-red-600 hover:bg-red-700"
                          >
                            Koppla från
                          </button>
                        </>
                      ) : (
                        <>
                          <button
                            onClick={() => setShowConfigModal(integration.id)}
                            className="inline-flex items-center px-3 py-2 border border-gray-300 rounded-md shadow-sm text-sm font-medium text-gray-700 bg-white hover:bg-gray-50"
                          >
                            <Settings className="w-4 h-4 mr-2" />
                            Konfigurera
                          </button>
                          <button
                            onClick={() => handleConnect(integration.id)}
                            disabled={loading}
                            className="inline-flex items-center px-3 py-2 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-blue-600 hover:bg-blue-700 disabled:opacity-50"
                          >
                            {loading ? (
                              <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
                            ) : (
                              <Link className="w-4 h-4 mr-2" />
                            )}
                            Anslut
                          </button>
                        </>
                      )}
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      </div>

      {/* Backup and Export */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Data Export */}
        <div className="bg-white rounded-lg shadow-sm border p-6">
          <h3 className="text-lg font-semibold text-gray-900 mb-4 flex items-center">
            <Download className="w-5 h-5 mr-2 text-blue-600" />
            Dataexport
          </h3>
          
          <p className="text-gray-600 mb-4">
            Exportera all din data för backup eller migration till andra system.
          </p>
          
          <div className="space-y-3">
            <label className="flex items-center">
              <input type="checkbox" defaultChecked className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded" />
              <span className="ml-3 text-sm text-gray-700">Leads och kunder</span>
            </label>
            <label className="flex items-center">
              <input type="checkbox" defaultChecked className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded" />
              <span className="ml-3 text-sm text-gray-700">Offerter och fakturor</span>
            </label>
            <label className="flex items-center">
              <input type="checkbox" defaultChecked className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded" />
              <span className="ml-3 text-sm text-gray-700">Jobb och aktiviteter</span>
            </label>
            <label className="flex items-center">
              <input type="checkbox" className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded" />
              <span className="ml-3 text-sm text-gray-700">Systemkonfiguration</span>
            </label>
          </div>
          
          <button
            onClick={handleExportData}
            disabled={loading}
            className="mt-4 w-full inline-flex items-center justify-center px-4 py-2 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-blue-600 hover:bg-blue-700 disabled:opacity-50"
          >
            {loading ? (
              <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
            ) : (
              <Download className="w-4 h-4 mr-2" />
            )}
            Exportera data
          </button>
        </div>

        {/* Backup Settings */}
        <div className="bg-white rounded-lg shadow-sm border p-6">
          <h3 className="text-lg font-semibold text-gray-900 mb-4 flex items-center">
            <Database className="w-5 h-5 mr-2 text-blue-600" />
            Automatisk backup
          </h3>
          
          <div className="space-y-4">
            <label className="flex items-center">
              <input 
                type="checkbox" 
                checked={backupSettings.autoBackup}
                onChange={(e) => setBackupSettings(prev => ({ ...prev, autoBackup: e.target.checked }))}
                className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded" 
              />
              <span className="ml-3 text-sm text-gray-700">Aktivera automatisk backup</span>
            </label>
            
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Backup-frekvens
              </label>
              <select
                value={backupSettings.backupFrequency}
                onChange={(e) => setBackupSettings(prev => ({ ...prev, backupFrequency: e.target.value }))}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-blue-500 focus:border-blue-500"
              >
                <option value="daily">Dagligen</option>
                <option value="weekly">Veckovis</option>
                <option value="monthly">Månadsvis</option>
              </select>
            </div>
            
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Behåll backups (dagar)
              </label>
              <input
                type="number"
                value={backupSettings.retentionDays}
                onChange={(e) => setBackupSettings(prev => ({ ...prev, retentionDays: parseInt(e.target.value) || 30 }))}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-blue-500 focus:border-blue-500"
                min="1"
                max="365"
              />
            </div>
          </div>
          
          <button
            onClick={handleBackup}
            disabled={loading}
            className="mt-4 w-full inline-flex items-center justify-center px-4 py-2 border border-gray-300 rounded-md shadow-sm text-sm font-medium text-gray-700 bg-white hover:bg-gray-50 disabled:opacity-50"
          >
            {loading ? (
              <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-gray-600 mr-2"></div>
            ) : (
              <Upload className="w-4 h-4 mr-2" />
            )}
            Skapa backup nu
          </button>
        </div>
      </div>

      {/* Configuration Modal */}
      {showConfigModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-lg max-w-2xl w-full max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between p-6 border-b">
              <h3 className="text-lg font-semibold text-gray-900">
                Konfigurera {integrations.find(i => i.id === showConfigModal)?.name}
              </h3>
              <button
                onClick={() => setShowConfigModal(null)}
                className="text-gray-400 hover:text-gray-600"
              >
                <X className="w-5 h-5" />
              </button>
            </div>
            
            <div className="p-6">
              {showConfigModal === 'fortnox' && (
                <div className="space-y-4">
                  <div className="bg-blue-50 p-4 rounded-lg mb-4">
                    <div className="flex items-start">
                      <Globe className="w-5 h-5 text-blue-600 mr-2 mt-0.5" />
                      <div>
                        <h4 className="font-medium text-blue-900">Fortnox Integration</h4>
                        <p className="text-sm text-blue-700 mt-1">
                          För att ansluta till Fortnox behöver du skapa en app i Fortnox Developer Portal och få API-nycklar.
                        </p>
                        <a 
                          href="https://developer.fortnox.se" 
                          target="_blank" 
                          rel="noopener noreferrer"
                          className="inline-flex items-center text-sm text-blue-600 hover:text-blue-700 mt-2"
                        >
                          Öppna Fortnox Developer Portal
                          <ExternalLink className="w-3 h-3 ml-1" />
                        </a>
                      </div>
                    </div>
                  </div>
                  
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      API-nyckel *
                    </label>
                    <div className="relative">
                      <Key className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-4 h-4" />
                      <input
                        type="password"
                        className="w-full pl-10 pr-3 py-2 border border-gray-300 rounded-md focus:ring-blue-500 focus:border-blue-500"
                        placeholder="Ange din Fortnox API-nyckel"
                      />
                    </div>
                  </div>
                  
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Client Secret *
                    </label>
                    <input
                      type="password"
                      className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-blue-500 focus:border-blue-500"
                      placeholder="Ange client secret"
                    />
                  </div>
                  
                  <div className="space-y-3">
                    <label className="flex items-center">
                      <input type="checkbox" className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded" />
                      <span className="ml-3 text-sm text-gray-700">Automatisk synkronisering</span>
                    </label>
                    
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">
                        Synkroniseringsintervall
                      </label>
                      <select className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-blue-500 focus:border-blue-500">
                        <option value="1h">Varje timme</option>
                        <option value="6h">Var 6:e timme</option>
                        <option value="24h">Dagligen</option>
                        <option value="weekly">Veckovis</option>
                      </select>
                    </div>
                  </div>
                </div>
              )}
              
              {showConfigModal === 'google-calendar' && (
                <div className="space-y-4">
                  <div className="bg-blue-50 p-4 rounded-lg mb-4">
                    <div className="flex items-start">
                      <Calendar className="w-5 h-5 text-blue-600 mr-2 mt-0.5" />
                      <div>
                        <h4 className="font-medium text-blue-900">Google Calendar Integration</h4>
                        <p className="text-sm text-blue-700 mt-1">
                          Synkronisera dina möten och aktiviteter med Google Calendar för bättre schemaläggning.
                        </p>
                      </div>
                    </div>
                  </div>
                  
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Kalender-ID
                    </label>
                    <input
                      type="text"
                      className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-blue-500 focus:border-blue-500"
                      placeholder="primary eller specifik kalender-ID"
                    />
                  </div>
                  
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Synkroniseringsriktning
                    </label>
                    <select className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-blue-500 focus:border-blue-500">
                      <option value="both">Båda riktningar</option>
                      <option value="to-google">Endast till Google</option>
                      <option value="from-google">Endast från Google</option>
                    </select>
                  </div>
                  
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Påminnelse (minuter före)
                    </label>
                    <input
                      type="number"
                      defaultValue={15}
                      className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-blue-500 focus:border-blue-500"
                      min="0"
                      max="1440"
                    />
                  </div>
                </div>
              )}
              
              {showConfigModal === 'sendgrid' && (
                <div className="space-y-4">
                  <div className="bg-blue-50 p-4 rounded-lg mb-4">
                    <div className="flex items-start">
                      <Mail className="w-5 h-5 text-blue-600 mr-2 mt-0.5" />
                      <div>
                        <h4 className="font-medium text-blue-900">SendGrid Integration</h4>
                        <p className="text-sm text-blue-700 mt-1">
                          Använd SendGrid för att skicka professionella e-postmeddelanden och påminnelser.
                        </p>
                      </div>
                    </div>
                  </div>
                  
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      API-nyckel *
                    </label>
                    <div className="relative">
                      <Key className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-4 h-4" />
                      <input
                        type="password"
                        className="w-full pl-10 pr-3 py-2 border border-gray-300 rounded-md focus:ring-blue-500 focus:border-blue-500"
                        placeholder="SG.xxxxxxxxxx"
                      />
                    </div>
                  </div>
                  
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Avsändar-e-post *
                    </label>
                    <input
                      type="email"
                      className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-blue-500 focus:border-blue-500"
                      placeholder="noreply@dittföretag.se"
                    />
                  </div>
                  
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Avsändarnamn
                    </label>
                    <input
                      type="text"
                      className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-blue-500 focus:border-blue-500"
                      placeholder="Ditt Företag"
                    />
                  </div>
                </div>
              )}
              
              {showConfigModal === 'twilio' && (
                <div className="space-y-4">
                  <div className="bg-blue-50 p-4 rounded-lg mb-4">
                    <div className="flex items-start">
                      <Mail className="w-5 h-5 text-blue-600 mr-2 mt-0.5" />
                      <div>
                        <h4 className="font-medium text-blue-900">Twilio SMS Integration</h4>
                        <p className="text-sm text-blue-700 mt-1">
                          Använd Twilio för att skicka SMS-meddelanden till kunder direkt från systemet.
                        </p>
                      </div>
                    </div>
                  </div>
                  
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Account SID *
                    </label>
                    <input
                      type="text"
                      className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-blue-500 focus:border-blue-500"
                      placeholder="ACxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx"
                    />
                  </div>
                  
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Auth Token *
                    </label>
                    <input
                      type="password"
                      className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-blue-500 focus:border-blue-500"
                      placeholder="Ange auth token"
                    />
                  </div>
                  
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Avsändarnummer *
                    </label>
                    <input
                      type="tel"
                      className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-blue-500 focus:border-blue-500"
                      placeholder="+46123456789"
                    />
                  </div>
                  
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Kostnad per SMS (SEK)
                    </label>
                    <input
                      type="number"
                      step="0.01"
                      defaultValue={0.85}
                      className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-blue-500 focus:border-blue-500"
                    />
                  </div>
                </div>
              )}
            </div>
            
            <div className="flex justify-end space-x-3 p-6 border-t">
              <button
                onClick={() => setShowConfigModal(null)}
                className="px-4 py-2 border border-gray-300 rounded-md text-sm font-medium text-gray-700 bg-white hover:bg-gray-50"
              >
                Avbryt
              </button>
              <button
                onClick={() => {
                  setShowConfigModal(null);
                  setSuccess('Konfiguration sparad framgångsrikt!');
                  setTimeout(() => setSuccess(null), 3000);
                }}
                className="px-4 py-2 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-blue-600 hover:bg-blue-700"
              >
                <Save className="w-4 h-4 mr-2" />
                Spara konfiguration
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

export default IntegrationSettings;