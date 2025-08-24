import React, { useState } from 'react';
import {
  FormInput,
  Plus,
  Trash2,
  GripVertical,
  Eye,
  Code,
  Save,
  Settings,
  Type,
  Mail,
  Phone,
  Calendar,
  Hash,
  ToggleLeft,
  List,
  FileText,
  CheckSquare,
  Star,
  AlertCircle,
  CheckCircle,
  X,
  Copy
} from 'lucide-react';

interface FormField {
  id: string;
  type: 'text' | 'email' | 'phone' | 'textarea' | 'select' | 'checkbox' | 'radio' | 'number' | 'date';
  label: string;
  placeholder?: string;
  required: boolean;
  options?: string[];
  validation?: {
    minLength?: number;
    maxLength?: number;
    pattern?: string;
  };
}

interface LeadForm {
  id: string;
  name: string;
  description: string;
  fields: FormField[];
  settings: {
    submitButtonText: string;
    successMessage: string;
    redirectUrl?: string;
    emailNotification: boolean;
    autoAssign?: string;
    leadSource: string;
  };
}

function LeadFormBuilder() {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState<'builder' | 'preview' | 'embed' | 'settings'>('builder');
  const [draggedField, setDraggedField] = useState<FormField | null>(null);
  const [editingField, setEditingField] = useState<FormField | null>(null);
  const [showFieldModal, setShowFieldModal] = useState(false);

  const [currentForm, setCurrentForm] = useState<LeadForm>({
    id: '1',
    name: 'Kontaktformulär',
    description: 'Grundläggande kontaktformulär för att samla in leads från webbsidan',
    fields: [
      {
        id: '1',
        type: 'text',
        label: 'Namn',
        placeholder: 'Ditt fullständiga namn',
        required: true
      },
      {
        id: '2',
        type: 'email',
        label: 'E-postadress',
        placeholder: 'din@email.se',
        required: true
      },
      {
        id: '3',
        type: 'phone',
        label: 'Telefonnummer',
        placeholder: '+46 70 123 45 67',
        required: false
      },
      {
        id: '4',
        type: 'textarea',
        label: 'Meddelande',
        placeholder: 'Berätta om ditt projekt eller behov...',
        required: true
      }
    ],
    settings: {
      submitButtonText: 'Skicka förfrågan',
      successMessage: 'Tack för din förfrågan! Vi återkommer inom 24 timmar.',
      emailNotification: true,
      leadSource: 'Webbformulär'
    }
  });

  const fieldTypes = [
    { type: 'text', label: 'Text', icon: Type },
    { type: 'email', label: 'E-post', icon: Mail },
    { type: 'phone', label: 'Telefon', icon: Phone },
    { type: 'textarea', label: 'Textområde', icon: FileText },
    { type: 'select', label: 'Dropdown', icon: List },
    { type: 'checkbox', label: 'Kryssruta', icon: CheckSquare },
    { type: 'radio', label: 'Radioknappar', icon: ToggleLeft },
    { type: 'number', label: 'Nummer', icon: Hash },
    { type: 'date', label: 'Datum', icon: Calendar }
  ];

  const handleAddField = (type: FormField['type']) => {
    const newField: FormField = {
      id: Date.now().toString(),
      type,
      label: `Nytt ${fieldTypes.find(ft => ft.type === type)?.label.toLowerCase()} fält`,
      required: false,
      ...(type === 'select' || type === 'radio' ? { options: ['Alternativ 1', 'Alternativ 2'] } : {})
    };
    
    setEditingField(newField);
    setShowFieldModal(true);
  };

  const handleSaveField = () => {
    if (!editingField) return;

    if (editingField.id === 'new' || !currentForm.fields.find(f => f.id === editingField.id)) {
      // Add new field
      const newField = { ...editingField, id: Date.now().toString() };
      setCurrentForm(prev => ({
        ...prev,
        fields: [...prev.fields, newField]
      }));
    } else {
      // Update existing field
      setCurrentForm(prev => ({
        ...prev,
        fields: prev.fields.map(field => 
          field.id === editingField.id ? editingField : field
        )
      }));
    }

    setEditingField(null);
    setShowFieldModal(false);
  };

  const handleDeleteField = (fieldId: string) => {
    if (confirm('Är du säker på att du vill ta bort detta fält?')) {
      setCurrentForm(prev => ({
        ...prev,
        fields: prev.fields.filter(field => field.id !== fieldId)
      }));
    }
  };

  const handleMoveField = (fieldId: string, direction: 'up' | 'down') => {
    const currentIndex = currentForm.fields.findIndex(f => f.id === fieldId);
    if (currentIndex === -1) return;

    const newIndex = direction === 'up' ? currentIndex - 1 : currentIndex + 1;
    if (newIndex < 0 || newIndex >= currentForm.fields.length) return;

    const newFields = [...currentForm.fields];
    [newFields[currentIndex], newFields[newIndex]] = [newFields[newIndex], newFields[currentIndex]];

    setCurrentForm(prev => ({ ...prev, fields: newFields }));
  };

  const handleSaveForm = async () => {
    try {
      setLoading(true);
      setError(null);

      // Simulate saving
      await new Promise(resolve => setTimeout(resolve, 1000));

      setSuccess('Formulär sparat framgångsrikt!');
      setTimeout(() => setSuccess(null), 3000);
    } catch (err) {
      setError('Kunde inte spara formulär. Försök igen.');
    } finally {
      setLoading(false);
    }
  };

  const generateEmbedCode = () => {
    const baseUrl = window.location.origin;
    return `<!-- Momentum CRM Lead Form -->
<div id="momentum-lead-form-${currentForm.id}"></div>
<script>
  (function() {
    var script = document.createElement('script');
    script.src = '${baseUrl}/embed/form.js';
    script.setAttribute('data-form-id', '${currentForm.id}');
    document.head.appendChild(script);
  })();
</script>`;
  };

  const copyEmbedCode = () => {
    navigator.clipboard.writeText(generateEmbedCode());
    setSuccess('Embed-kod kopierad till urklipp!');
    setTimeout(() => setSuccess(null), 3000);
  };

  const getFieldIcon = (type: string) => {
    const fieldType = fieldTypes.find(ft => ft.type === type);
    return fieldType ? fieldType.icon : Type;
  };

  const renderFieldPreview = (field: FormField) => {
    const commonProps = {
      className: "w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-blue-500 focus:border-blue-500",
      placeholder: field.placeholder,
      required: field.required
    };

    switch (field.type) {
      case 'text':
        return <input type="text" {...commonProps} />;
      case 'email':
        return <input type="email" {...commonProps} />;
      case 'phone':
        return <input type="tel" {...commonProps} />;
      case 'number':
        return <input type="number" {...commonProps} />;
      case 'date':
        return <input type="date" {...commonProps} />;
      case 'textarea':
        return <textarea rows={3} {...commonProps} />;
      case 'select':
        return (
          <select {...commonProps}>
            <option value="">Välj alternativ...</option>
            {field.options?.map((option, index) => (
              <option key={index} value={option}>{option}</option>
            ))}
          </select>
        );
      case 'checkbox':
        return (
          <div className="space-y-2">
            {field.options?.map((option, index) => (
              <label key={index} className="flex items-center">
                <input type="checkbox" className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded" />
                <span className="ml-2 text-sm text-gray-700">{option}</span>
              </label>
            ))}
          </div>
        );
      case 'radio':
        return (
          <div className="space-y-2">
            {field.options?.map((option, index) => (
              <label key={index} className="flex items-center">
                <input type="radio" name={field.id} className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300" />
                <span className="ml-2 text-sm text-gray-700">{option}</span>
              </label>
            ))}
          </div>
        );
      default:
        return <input type="text" {...commonProps} />;
    }
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold text-gray-900 flex items-center">
            <FormInput className="w-7 h-7 mr-3 text-blue-600" />
            Lead-formulärbyggare
          </h2>
          <p className="mt-2 text-gray-600">
            Skapa anpassade formulär för att samla in leads från din webbsida
          </p>
        </div>
        <button
          onClick={handleSaveForm}
          disabled={loading}
          className="inline-flex items-center px-4 py-2 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-blue-600 hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed"
        >
          {loading ? (
            <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
          ) : (
            <Save className="w-4 h-4 mr-2" />
          )}
          Spara formulär
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

      {/* Form Info */}
      <div className="bg-white rounded-lg shadow-sm border p-6">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Formulärnamn
            </label>
            <input
              type="text"
              value={currentForm.name}
              onChange={(e) => setCurrentForm(prev => ({ ...prev, name: e.target.value }))}
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-blue-500 focus:border-blue-500"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Lead-källa
            </label>
            <input
              type="text"
              value={currentForm.settings.leadSource}
              onChange={(e) => setCurrentForm(prev => ({ 
                ...prev, 
                settings: { ...prev.settings, leadSource: e.target.value }
              }))}
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-blue-500 focus:border-blue-500"
            />
          </div>
        </div>
        <div className="mt-4">
          <label className="block text-sm font-medium text-gray-700 mb-2">
            Beskrivning
          </label>
          <textarea
            value={currentForm.description}
            onChange={(e) => setCurrentForm(prev => ({ ...prev, description: e.target.value }))}
            rows={2}
            className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-blue-500 focus:border-blue-500"
          />
        </div>
      </div>

      {/* Tab Navigation */}
      <div className="border-b border-gray-200">
        <nav className="flex space-x-8">
          {[
            { id: 'builder', label: 'Byggare', icon: FormInput },
            { id: 'preview', label: 'Förhandsvisning', icon: Eye },
            { id: 'embed', label: 'Embed-kod', icon: Code },
            { id: 'settings', label: 'Inställningar', icon: Settings }
          ].map((tab) => {
            const Icon = tab.icon;
            return (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id as any)}
                className={`py-4 px-1 border-b-2 font-medium text-sm flex items-center ${
                  activeTab === tab.id
                    ? 'border-blue-500 text-blue-600'
                    : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                }`}
              >
                <Icon className="w-4 h-4 mr-2" />
                {tab.label}
              </button>
            );
          })}
        </nav>
      </div>

      {/* Form Builder */}
      {activeTab === 'builder' && (
        <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
          {/* Field Types */}
          <div className="bg-white rounded-lg shadow-sm border p-4">
            <h3 className="font-semibold text-gray-900 mb-4">Fälttyper</h3>
            <div className="space-y-2">
              {fieldTypes.map((fieldType) => {
                const Icon = fieldType.icon;
                return (
                  <button
                    key={fieldType.type}
                    onClick={() => handleAddField(fieldType.type)}
                    className="w-full flex items-center px-3 py-2 text-sm text-gray-700 hover:bg-gray-50 rounded-md border border-gray-200 hover:border-blue-300"
                  >
                    <Icon className="w-4 h-4 mr-2 text-gray-500" />
                    {fieldType.label}
                  </button>
                );
              })}
            </div>
          </div>

          {/* Form Fields */}
          <div className="lg:col-span-3 bg-white rounded-lg shadow-sm border p-6">
            <div className="flex items-center justify-between mb-4">
              <h3 className="font-semibold text-gray-900">Formulärfält</h3>
              <span className="text-sm text-gray-500">{currentForm.fields.length} fält</span>
            </div>

            {currentForm.fields.length === 0 ? (
              <div className="text-center py-8 text-gray-500">
                <FormInput className="w-12 h-12 mx-auto mb-2 text-gray-400" />
                <p>Inga fält ännu</p>
                <p className="text-sm">Lägg till fält från panelen till vänster</p>
              </div>
            ) : (
              <div className="space-y-4">
                {currentForm.fields.map((field, index) => {
                  const Icon = getFieldIcon(field.type);
                  return (
                    <div key={field.id} className="border border-gray-200 rounded-lg p-4">
                      <div className="flex items-center justify-between mb-2">
                        <div className="flex items-center space-x-3">
                          <GripVertical className="w-4 h-4 text-gray-400 cursor-move" />
                          <Icon className="w-4 h-4 text-gray-600" />
                          <span className="font-medium text-gray-900">{field.label}</span>
                          {field.required && <Star className="w-3 h-3 text-red-500" />}
                        </div>
                        <div className="flex items-center space-x-2">
                          <button
                            onClick={() => handleMoveField(field.id, 'up')}
                            disabled={index === 0}
                            className="text-gray-400 hover:text-gray-600 disabled:opacity-50"
                          >
                            ↑
                          </button>
                          <button
                            onClick={() => handleMoveField(field.id, 'down')}
                            disabled={index === currentForm.fields.length - 1}
                            className="text-gray-400 hover:text-gray-600 disabled:opacity-50"
                          >
                            ↓
                          </button>
                          <button
                            onClick={() => {
                              setEditingField(field);
                              setShowFieldModal(true);
                            }}
                            className="text-gray-400 hover:text-blue-600"
                          >
                            <Settings className="w-4 h-4" />
                          </button>
                          <button
                            onClick={() => handleDeleteField(field.id)}
                            className="text-gray-400 hover:text-red-600"
                          >
                            <Trash2 className="w-4 h-4" />
                          </button>
                        </div>
                      </div>
                      <div className="text-sm text-gray-600">
                        Typ: {fieldTypes.find(ft => ft.type === field.type)?.label}
                        {field.placeholder && ` • Placeholder: "${field.placeholder}"`}
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        </div>
      )}

      {/* Preview */}
      {activeTab === 'preview' && (
        <div className="max-w-2xl mx-auto">
          <div className="bg-white rounded-lg shadow-sm border p-8">
            <div className="mb-6">
              <h3 className="text-xl font-semibold text-gray-900 mb-2">{currentForm.name}</h3>
              <p className="text-gray-600">{currentForm.description}</p>
            </div>

            <form className="space-y-6">
              {currentForm.fields.map((field) => (
                <div key={field.id}>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    {field.label}
                    {field.required && <span className="text-red-500 ml-1">*</span>}
                  </label>
                  {renderFieldPreview(field)}
                </div>
              ))}

              <button
                type="button"
                className="w-full inline-flex items-center justify-center px-6 py-3 border border-transparent rounded-md shadow-sm text-base font-medium text-white bg-blue-600 hover:bg-blue-700"
              >
                {currentForm.settings.submitButtonText}
              </button>
            </form>
          </div>
        </div>
      )}

      {/* Embed Code */}
      {activeTab === 'embed' && (
        <div className="space-y-6">
          <div className="bg-white rounded-lg shadow-sm border p-6">
            <h3 className="text-lg font-semibold text-gray-900 mb-4">Embed-kod</h3>
            <p className="text-gray-600 mb-4">
              Kopiera denna kod och klistra in den på din webbsida där du vill att formuläret ska visas.
            </p>
            
            <div className="relative">
              <pre className="bg-gray-50 p-4 rounded-lg text-sm overflow-x-auto border">
                <code>{generateEmbedCode()}</code>
              </pre>
              <button
                onClick={copyEmbedCode}
                className="absolute top-2 right-2 inline-flex items-center px-3 py-1 border border-gray-300 rounded-md shadow-sm text-xs font-medium text-gray-700 bg-white hover:bg-gray-50"
              >
                <Copy className="w-3 h-3 mr-1" />
                Kopiera
              </button>
            </div>
          </div>

          <div className="bg-blue-50 border border-blue-200 rounded-lg p-6">
            <h4 className="font-medium text-blue-900 mb-2">Instruktioner</h4>
            <ol className="text-sm text-blue-800 space-y-1 list-decimal list-inside">
              <li>Kopiera embed-koden ovan</li>
              <li>Klistra in koden i HTML-koden på din webbsida</li>
              <li>Formuläret kommer automatiskt att visas på den platsen</li>
              <li>Alla inskickade formulär skapas som nya leads i systemet</li>
            </ol>
          </div>
        </div>
      )}

      {/* Settings */}
      {activeTab === 'settings' && (
        <div className="bg-white rounded-lg shadow-sm border p-6">
          <h3 className="text-lg font-semibold text-gray-900 mb-6">Formulärinställningar</h3>
          
          <div className="space-y-6">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Knapptext
                </label>
                <input
                  type="text"
                  value={currentForm.settings.submitButtonText}
                  onChange={(e) => setCurrentForm(prev => ({
                    ...prev,
                    settings: { ...prev.settings, submitButtonText: e.target.value }
                  }))}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-blue-500 focus:border-blue-500"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Omdirigerings-URL (valfritt)
                </label>
                <input
                  type="url"
                  value={currentForm.settings.redirectUrl || ''}
                  onChange={(e) => setCurrentForm(prev => ({
                    ...prev,
                    settings: { ...prev.settings, redirectUrl: e.target.value }
                  }))}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-blue-500 focus:border-blue-500"
                  placeholder="https://dinsida.se/tack"
                />
              </div>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Bekräftelsemeddelande
              </label>
              <textarea
                value={currentForm.settings.successMessage}
                onChange={(e) => setCurrentForm(prev => ({
                  ...prev,
                  settings: { ...prev.settings, successMessage: e.target.value }
                }))}
                rows={3}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-blue-500 focus:border-blue-500"
              />
            </div>

            <div className="space-y-4">
              <label className="flex items-center">
                <input
                  type="checkbox"
                  checked={currentForm.settings.emailNotification}
                  onChange={(e) => setCurrentForm(prev => ({
                    ...prev,
                    settings: { ...prev.settings, emailNotification: e.target.checked }
                  }))}
                  className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded"
                />
                <span className="ml-3 text-sm text-gray-700">
                  Skicka e-postnotifiering när formulär skickas in
                </span>
              </label>
            </div>
          </div>
        </div>
      )}

      {/* Field Edit Modal */}
      {showFieldModal && editingField && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-lg max-w-2xl w-full max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between p-6 border-b">
              <h3 className="text-lg font-semibold text-gray-900">
                Redigera fält
              </h3>
              <button
                onClick={() => {
                  setEditingField(null);
                  setShowFieldModal(false);
                }}
                className="text-gray-400 hover:text-gray-600"
              >
                <X className="w-5 h-5" />
              </button>
            </div>
            
            <div className="p-6 space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Fältetikett *
                </label>
                <input
                  type="text"
                  required
                  value={editingField.label}
                  onChange={(e) => setEditingField(prev => prev ? { ...prev, label: e.target.value } : null)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-blue-500 focus:border-blue-500"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Placeholder-text
                </label>
                <input
                  type="text"
                  value={editingField.placeholder || ''}
                  onChange={(e) => setEditingField(prev => prev ? { ...prev, placeholder: e.target.value } : null)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-blue-500 focus:border-blue-500"
                />
              </div>

              {(editingField.type === 'select' || editingField.type === 'checkbox' || editingField.type === 'radio') && (
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Alternativ (ett per rad)
                  </label>
                  <textarea
                    value={editingField.options?.join('\n') || ''}
                    onChange={(e) => setEditingField(prev => prev ? { 
                      ...prev, 
                      options: e.target.value.split('\n').filter(opt => opt.trim()) 
                    } : null)}
                    rows={4}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-blue-500 focus:border-blue-500"
                    placeholder="Alternativ 1&#10;Alternativ 2&#10;Alternativ 3"
                  />
                </div>
              )}

              <div className="space-y-3">
                <label className="flex items-center">
                  <input
                    type="checkbox"
                    checked={editingField.required}
                    onChange={(e) => setEditingField(prev => prev ? { ...prev, required: e.target.checked } : null)}
                    className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded"
                  />
                  <span className="ml-3 text-sm text-gray-700">Obligatoriskt fält</span>
                </label>
              </div>
            </div>
            
            <div className="flex justify-end space-x-3 p-6 border-t">
              <button
                onClick={() => {
                  setEditingField(null);
                  setShowFieldModal(false);
                }}
                className="px-4 py-2 border border-gray-300 rounded-md text-sm font-medium text-gray-700 bg-white hover:bg-gray-50"
              >
                Avbryt
              </button>
              <button
                onClick={handleSaveField}
                disabled={!editingField.label}
                className="px-4 py-2 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-blue-600 hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                Spara fält
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

export default LeadFormBuilder;