import React, { useState, useEffect } from 'react';
import {
  Settings,
  FileText,
  Clock,
  Mail,
  Hash,
  Calendar,
  Save,
  AlertCircle,
  CheckCircle,
  X,
  Edit,
  Plus,
  Trash2
} from 'lucide-react';
import { supabase } from '../../lib/supabase';

interface SystemSettings {
  invoice_number_format: string;
  invoice_number_prefix: string;
  invoice_number_start: number;
  quote_number_format: string;
  quote_number_prefix: string;
  quote_number_start: number;
  default_payment_terms: number;
  default_vat_rate: number;
  currency: string;
  date_format: string;
  time_format: string;
  fiscal_year_start: string;
}

interface EmailTemplate {
  id: string;
  name: string;
  subject: string;
  content: string;
  type: 'quote' | 'invoice' | 'reminder' | 'welcome';
}

// Fixed demo organization ID
const DEMO_ORG_ID = '550e8400-e29b-41d4-a716-446655440000';

function SystemSettings() {
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const [activeSection, setActiveSection] = useState<'numbering' | 'payment' | 'templates' | 'general'>('numbering');
  const [editingTemplate, setEditingTemplate] = useState<EmailTemplate | null>(null);
  const [showTemplateModal, setShowTemplateModal] = useState(false);

  const [settings, setSettings] = useState<SystemSettings>({
    invoice_number_format: 'F{YYYY}{MM}-{####}',
    invoice_number_prefix: 'F',
    invoice_number_start: 1,
    quote_number_format: 'O{YYYY}{MM}-{####}',
    quote_number_prefix: 'O',
    quote_number_start: 1,
    default_payment_terms: 30,
    default_vat_rate: 25,
    currency: 'SEK',
    date_format: 'YYYY-MM-DD',
    time_format: '24h',
    fiscal_year_start: '01-01'
  });

  const [emailTemplates, setEmailTemplates] = useState<EmailTemplate[]>([
    {
      id: '1',
      name: 'Offert skickad',
      subject: 'Offert #{quote_number} från {company_name}',
      content: 'Hej {customer_name},\n\nTack för ditt intresse! Bifogat finner du vår offert.\n\nMed vänliga hälsningar,\n{company_name}',
      type: 'quote'
    },
    {
      id: '2',
      name: 'Faktura skickad',
      subject: 'Faktura #{invoice_number} från {company_name}',
      content: 'Hej {customer_name},\n\nBifogat finner du faktura för utfört arbete.\n\nBetalningsvillkor: {payment_terms} dagar\nFörfallodatum: {due_date}\n\nMed vänliga hälsningar,\n{company_name}',
      type: 'invoice'
    }
  ]);

  useEffect(() => {
    loadSystemSettings();
  }, []);

  const loadSystemSettings = async () => {
    try {
      setLoading(true);
      setError(null);

      // In a real app, you would load from a system_settings table
      // For now, we'll use default values
      setSettings({
        invoice_number_format: 'F{YYYY}{MM}-{####}',
        invoice_number_prefix: 'F',
        invoice_number_start: 1,
        quote_number_format: 'O{YYYY}{MM}-{####}',
        quote_number_prefix: 'O',
        quote_number_start: 1,
        default_payment_terms: 30,
        default_vat_rate: 25,
        currency: 'SEK',
        date_format: 'YYYY-MM-DD',
        time_format: '24h',
        fiscal_year_start: '01-01'
      });
    } catch (err) {
      console.error('Error loading system settings:', err);
      setError('Ett oväntat fel inträffade vid laddning av systeminställningar.');
    } finally {
      setLoading(false);
    }
  };

  const handleSave = async () => {
    try {
      setSaving(true);
      setError(null);
      setSuccess(null);

      // In a real app, you would save to database
      // For now, we'll just simulate saving
      await new Promise(resolve => setTimeout(resolve, 1000));

      setSuccess('Systeminställningar sparade framgångsrikt!');
      setTimeout(() => setSuccess(null), 3000);
    } catch (err) {
      console.error('Error saving system settings:', err);
      setError('Ett oväntat fel inträffade vid sparning.');
    } finally {
      setSaving(false);
    }
  };

  const handleSaveTemplate = () => {
    if (!editingTemplate) return;

    if (editingTemplate.id === 'new') {
      // Add new template
      const newTemplate = {
        ...editingTemplate,
        id: Date.now().toString()
      };
      setEmailTemplates(prev => [...prev, newTemplate]);
    } else {
      // Update existing template
      setEmailTemplates(prev => prev.map(template => 
        template.id === editingTemplate.id ? editingTemplate : template
      ));
    }

    setEditingTemplate(null);
    setShowTemplateModal(false);
    setSuccess('E-postmall sparad framgångsrikt!');
    setTimeout(() => setSuccess(null), 3000);
  };

  const handleDeleteTemplate = (templateId: string) => {
    if (confirm('Är du säker på att du vill ta bort denna e-postmall?')) {
      setEmailTemplates(prev => prev.filter(template => template.id !== templateId));
      setSuccess('E-postmall borttagen framgångsrikt!');
      setTimeout(() => setSuccess(null), 3000);
    }
  };

  const generatePreviewNumber = (format: string, prefix: string, start: number) => {
    const now = new Date();
    const year = now.getFullYear();
    const month = (now.getMonth() + 1).toString().padStart(2, '0');
    const number = start.toString().padStart(4, '0');
    
    return format
      .replace('{YYYY}', year.toString())
      .replace('{MM}', month)
      .replace('{####}', number);
  };

  const getTemplateTypeLabel = (type: string) => {
    switch (type) {
      case 'quote': return 'Offert';
      case 'invoice': return 'Faktura';
      case 'reminder': return 'Påminnelse';
      case 'welcome': return 'Välkommen';
      default: return type;
    }
  };

  if (loading) {
    return (
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <h2 className="text-2xl font-bold text-gray-900">Systeminställningar</h2>
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
        </div>
        <div className="bg-white rounded-lg p-6 animate-pulse">
          <div className="space-y-4">
            {[1, 2, 3, 4].map(i => (
              <div key={i} className="h-12 bg-gray-200 rounded"></div>
            ))}
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold text-gray-900 flex items-center">
            <Settings className="w-7 h-7 mr-3 text-blue-600" />
            Systeminställningar
          </h2>
          <p className="mt-2 text-gray-600">
            Konfigurera systemets grundläggande inställningar och mallar
          </p>
        </div>
        <button
          onClick={handleSave}
          disabled={saving}
          className="inline-flex items-center px-4 py-2 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-blue-600 hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed"
        >
          {saving ? (
            <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
          ) : (
            <Save className="w-4 h-4 mr-2" />
          )}
          Spara ändringar
        </button>
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

      {/* Section Navigation */}
      <div className="border-b border-gray-200">
        <nav className="flex space-x-8">
          {[
            { id: 'numbering', label: 'Numrering', icon: Hash },
            { id: 'payment', label: 'Betalning', icon: Clock },
            { id: 'templates', label: 'E-postmallar', icon: Mail },
            { id: 'general', label: 'Allmänt', icon: Settings }
          ].map((section) => {
            const Icon = section.icon;
            return (
              <button
                key={section.id}
                onClick={() => setActiveSection(section.id as any)}
                className={`py-4 px-1 border-b-2 font-medium text-sm flex items-center ${
                  activeSection === section.id
                    ? 'border-blue-500 text-blue-600'
                    : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                }`}
              >
                <Icon className="w-4 h-4 mr-2" />
                {section.label}
              </button>
            );
          })}
        </nav>
      </div>

      {/* Numbering Settings */}
      {activeSection === 'numbering' && (
        <div className="space-y-6">
          <div className="bg-white rounded-lg shadow-sm border p-6">
            <h3 className="text-lg font-semibold text-gray-900 mb-6 flex items-center">
              <FileText className="w-5 h-5 mr-2 text-blue-600" />
              Fakturanumrering
            </h3>
            
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Nummerformat
                </label>
                <input
                  type="text"
                  value={settings.invoice_number_format}
                  onChange={(e) => setSettings(prev => ({ ...prev, invoice_number_format: e.target.value }))}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-blue-500 focus:border-blue-500"
                  placeholder="F{YYYY}{MM}-{####}"
                />
                <p className="text-xs text-gray-500 mt-1">
                  Använd {'{YYYY}'} för år, {'{MM}'} för månad, {'{####}'} för löpnummer
                </p>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Startnummer
                </label>
                <input
                  type="number"
                  value={settings.invoice_number_start}
                  onChange={(e) => setSettings(prev => ({ ...prev, invoice_number_start: parseInt(e.target.value) || 1 }))}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-blue-500 focus:border-blue-500"
                  min="1"
                />
              </div>

              <div className="md:col-span-2">
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Förhandsvisning
                </label>
                <div className="p-3 bg-gray-50 rounded-md border">
                  <code className="text-sm text-gray-900">
                    {generatePreviewNumber(settings.invoice_number_format, settings.invoice_number_prefix, settings.invoice_number_start)}
                  </code>
                </div>
              </div>
            </div>
          </div>

          <div className="bg-white rounded-lg shadow-sm border p-6">
            <h3 className="text-lg font-semibold text-gray-900 mb-6 flex items-center">
              <FileText className="w-5 h-5 mr-2 text-purple-600" />
              Offertnumrering
            </h3>
            
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Nummerformat
                </label>
                <input
                  type="text"
                  value={settings.quote_number_format}
                  onChange={(e) => setSettings(prev => ({ ...prev, quote_number_format: e.target.value }))}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-blue-500 focus:border-blue-500"
                  placeholder="O{YYYY}{MM}-{####}"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Startnummer
                </label>
                <input
                  type="number"
                  value={settings.quote_number_start}
                  onChange={(e) => setSettings(prev => ({ ...prev, quote_number_start: parseInt(e.target.value) || 1 }))}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-blue-500 focus:border-blue-500"
                  min="1"
                />
              </div>

              <div className="md:col-span-2">
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Förhandsvisning
                </label>
                <div className="p-3 bg-gray-50 rounded-md border">
                  <code className="text-sm text-gray-900">
                    {generatePreviewNumber(settings.quote_number_format, settings.quote_number_prefix, settings.quote_number_start)}
                  </code>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Payment Settings */}
      {activeSection === 'payment' && (
        <div className="bg-white rounded-lg shadow-sm border p-6">
          <h3 className="text-lg font-semibold text-gray-900 mb-6 flex items-center">
            <Clock className="w-5 h-5 mr-2 text-blue-600" />
            Betalningsinställningar
          </h3>
          
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Standard betalningsvillkor (dagar)
              </label>
              <input
                type="number"
                value={settings.default_payment_terms}
                onChange={(e) => setSettings(prev => ({ ...prev, default_payment_terms: parseInt(e.target.value) || 30 }))}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-blue-500 focus:border-blue-500"
                min="1"
                max="365"
              />
              <p className="text-xs text-gray-500 mt-1">
                Antal dagar från fakturadatum till förfallodatum
              </p>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Standard moms (%)
              </label>
              <input
                type="number"
                value={settings.default_vat_rate}
                onChange={(e) => setSettings(prev => ({ ...prev, default_vat_rate: parseInt(e.target.value) || 25 }))}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-blue-500 focus:border-blue-500"
                min="0"
                max="100"
                step="0.1"
              />
              <p className="text-xs text-gray-500 mt-1">
                Standard momssats för nya poster
              </p>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Valuta
              </label>
              <select
                value={settings.currency}
                onChange={(e) => setSettings(prev => ({ ...prev, currency: e.target.value }))}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-blue-500 focus:border-blue-500"
              >
                <option value="SEK">SEK - Svenska kronor</option>
                <option value="EUR">EUR - Euro</option>
                <option value="USD">USD - US Dollar</option>
                <option value="NOK">NOK - Norska kronor</option>
                <option value="DKK">DKK - Danska kronor</option>
              </select>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Räkenskapsårets start
              </label>
              <input
                type="text"
                value={settings.fiscal_year_start}
                onChange={(e) => setSettings(prev => ({ ...prev, fiscal_year_start: e.target.value }))}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-blue-500 focus:border-blue-500"
                placeholder="01-01"
              />
              <p className="text-xs text-gray-500 mt-1">
                Format: MM-DD (t.ex. 01-01 för 1 januari)
              </p>
            </div>
          </div>
        </div>
      )}

      {/* Email Templates */}
      {activeSection === 'templates' && (
        <div className="space-y-6">
          <div className="flex items-center justify-between">
            <h3 className="text-lg font-semibold text-gray-900 flex items-center">
              <Mail className="w-5 h-5 mr-2 text-blue-600" />
              E-postmallar
            </h3>
            <button
              onClick={() => {
                setEditingTemplate({
                  id: 'new',
                  name: '',
                  subject: '',
                  content: '',
                  type: 'quote'
                });
                setShowTemplateModal(true);
              }}
              className="inline-flex items-center px-3 py-2 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-blue-600 hover:bg-blue-700"
            >
              <Plus className="w-4 h-4 mr-2" />
              Ny mall
            </button>
          </div>

          <div className="grid grid-cols-1 gap-4">
            {emailTemplates.map((template) => (
              <div key={template.id} className="bg-white rounded-lg shadow-sm border p-6">
                <div className="flex items-center justify-between mb-4">
                  <div>
                    <h4 className="font-medium text-gray-900">{template.name}</h4>
                    <p className="text-sm text-gray-500">
                      Typ: {getTemplateTypeLabel(template.type)}
                    </p>
                  </div>
                  <div className="flex items-center space-x-2">
                    <button
                      onClick={() => {
                        setEditingTemplate(template);
                        setShowTemplateModal(true);
                      }}
                      className="text-gray-400 hover:text-blue-600"
                    >
                      <Edit className="w-4 h-4" />
                    </button>
                    <button
                      onClick={() => handleDeleteTemplate(template.id)}
                      className="text-gray-400 hover:text-red-600"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                </div>
                
                <div className="space-y-2">
                  <div>
                    <span className="text-sm font-medium text-gray-700">Ämne:</span>
                    <p className="text-sm text-gray-600">{template.subject}</p>
                  </div>
                  <div>
                    <span className="text-sm font-medium text-gray-700">Innehåll:</span>
                    <p className="text-sm text-gray-600 whitespace-pre-wrap line-clamp-3">
                      {template.content}
                    </p>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* General Settings */}
      {activeSection === 'general' && (
        <div className="bg-white rounded-lg shadow-sm border p-6">
          <h3 className="text-lg font-semibold text-gray-900 mb-6 flex items-center">
            <Calendar className="w-5 h-5 mr-2 text-blue-600" />
            Allmänna inställningar
          </h3>
          
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Datumformat
              </label>
              <select
                value={settings.date_format}
                onChange={(e) => setSettings(prev => ({ ...prev, date_format: e.target.value }))}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-blue-500 focus:border-blue-500"
              >
                <option value="YYYY-MM-DD">YYYY-MM-DD (2024-01-15)</option>
                <option value="DD/MM/YYYY">DD/MM/YYYY (15/01/2024)</option>
                <option value="MM/DD/YYYY">MM/DD/YYYY (01/15/2024)</option>
                <option value="DD.MM.YYYY">DD.MM.YYYY (15.01.2024)</option>
              </select>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Tidsformat
              </label>
              <select
                value={settings.time_format}
                onChange={(e) => setSettings(prev => ({ ...prev, time_format: e.target.value }))}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-blue-500 focus:border-blue-500"
              >
                <option value="24h">24-timmars (14:30)</option>
                <option value="12h">12-timmars (2:30 PM)</option>
              </select>
            </div>
          </div>
        </div>
      )}

      {/* Template Modal */}
      {showTemplateModal && editingTemplate && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-lg max-w-2xl w-full max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between p-6 border-b">
              <h3 className="text-lg font-semibold text-gray-900">
                {editingTemplate.id === 'new' ? 'Ny e-postmall' : 'Redigera e-postmall'}
              </h3>
              <button
                onClick={() => {
                  setEditingTemplate(null);
                  setShowTemplateModal(false);
                }}
                className="text-gray-400 hover:text-gray-600"
              >
                <X className="w-5 h-5" />
              </button>
            </div>
            
            <div className="p-6 space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Mallnamn *
                </label>
                <input
                  type="text"
                  required
                  value={editingTemplate.name}
                  onChange={(e) => setEditingTemplate(prev => prev ? { ...prev, name: e.target.value } : null)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-blue-500 focus:border-blue-500"
                  placeholder="T.ex. Offert skickad"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Typ *
                </label>
                <select
                  value={editingTemplate.type}
                  onChange={(e) => setEditingTemplate(prev => prev ? { ...prev, type: e.target.value as any } : null)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-blue-500 focus:border-blue-500"
                >
                  <option value="quote">Offert</option>
                  <option value="invoice">Faktura</option>
                  <option value="reminder">Påminnelse</option>
                  <option value="welcome">Välkommen</option>
                </select>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  E-postämne *
                </label>
                <input
                  type="text"
                  required
                  value={editingTemplate.subject}
                  onChange={(e) => setEditingTemplate(prev => prev ? { ...prev, subject: e.target.value } : null)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-blue-500 focus:border-blue-500"
                  placeholder="T.ex. Offert #{quote_number} från {company_name}"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  E-postinnehåll *
                </label>
                <textarea
                  required
                  value={editingTemplate.content}
                  onChange={(e) => setEditingTemplate(prev => prev ? { ...prev, content: e.target.value } : null)}
                  rows={8}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-blue-500 focus:border-blue-500"
                  placeholder="Skriv e-postinnehållet här..."
                />
              </div>

              <div className="bg-blue-50 p-4 rounded-lg">
                <h4 className="font-medium text-blue-900 mb-2">Tillgängliga variabler:</h4>
                <div className="text-sm text-blue-700 space-y-1">
                  <p><code>{'{company_name}'}</code> - Företagsnamn</p>
                  <p><code>{'{customer_name}'}</code> - Kundnamn</p>
                  <p><code>{'{quote_number}'}</code> - Offertnummer</p>
                  <p><code>{'{invoice_number}'}</code> - Fakturanummer</p>
                  <p><code>{'{amount}'}</code> - Belopp</p>
                  <p><code>{'{due_date}'}</code> - Förfallodatum</p>
                  <p><code>{'{payment_terms}'}</code> - Betalningsvillkor</p>
                </div>
              </div>
            </div>
            
            <div className="flex justify-end space-x-3 p-6 border-t">
              <button
                onClick={() => {
                  setEditingTemplate(null);
                  setShowTemplateModal(false);
                }}
                className="px-4 py-2 border border-gray-300 rounded-md text-sm font-medium text-gray-700 bg-white hover:bg-gray-50"
              >
                Avbryt
              </button>
              <button
                onClick={handleSaveTemplate}
                disabled={!editingTemplate.name || !editingTemplate.subject || !editingTemplate.content}
                className="px-4 py-2 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-blue-600 hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                Spara mall
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

export default SystemSettings;