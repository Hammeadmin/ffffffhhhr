import React, { useState, useEffect } from 'react';
import {
  FileText,
  Plus,
  Edit,
  Trash2,
  Copy,
  Eye,
  Save,
  X,
  AlertCircle,
  CheckCircle,
  Package,
  GripVertical
} from 'lucide-react';
import { useAuth } from '../../contexts/AuthContext';
import {
  getQuoteTemplates,
  createQuoteTemplate,
  updateQuoteTemplate,
  deleteQuoteTemplate,
  createDefaultTemplates,
  reorderQuoteTemplates,
  calculateTemplateTotal,
  type QuoteTemplate,
  type ContentBlock,
  UNIT_LABELS,
  UNIT_DESCRIPTIONS
} from '../../lib/quoteTemplates';
import { getUserProfiles } from '../../lib/database';
import { formatCurrency } from '../../lib/database';
import LoadingSpinner from '../LoadingSpinner';
import ConfirmDialog from '../ConfirmDialog';
import QuotePreview from '../QuotePreview';
import BlockBasedTemplateEditor from '../BlockBasedTemplateEditor';
import { supabase } from '../../lib/supabase';

function QuoteTemplateSettings() {
  const { user } = useAuth();
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const [templates, setTemplates] = useState<QuoteTemplate[]>([]);
  const [editingTemplate, setEditingTemplate] = useState<QuoteTemplate | null>(null);
  const [showTemplateModal, setShowTemplateModal] = useState(false);
  const [showPreview, setShowPreview] = useState<QuoteTemplate | null>(null);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState<string | null>(null);
  const [userProfile, setUserProfile] = useState<any>(null);
  const [draggedTemplate, setDraggedTemplate] = useState<QuoteTemplate | null>(null);
  const [dragOverIndex, setDragOverIndex] = useState<number | null>(null);
  const [companyInfo, setCompanyInfo] = useState<any>(null);

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    try {
      setLoading(true);
      setError(null);

      if (!user) return;

      // Get user profile to get organisation_id
      const { data: profiles } = await getUserProfiles('', { userId: user.id });
      const profile = profiles?.[0];
      
      if (!profile?.organisation_id) {
        setError('Ingen organisation hittades för användaren');
        return;
      }

      setUserProfile(profile);

      // Load templates
      const result = await getQuoteTemplates(profile.organisation_id);
      if (result.error) {
        setError(result.error.message);
        return;
      }

      setTemplates(result.data || []);

      // Load company info for preview
      const { data: orgData } = await supabase
        .from('organisations')
        .select('*')
        .eq('id', profile.organisation_id)
        .single();
      
      setCompanyInfo(orgData);
    } catch (err) {
      console.error('Error loading data:', err);
      setError('Ett oväntat fel inträffade vid laddning av data.');
    } finally {
      setLoading(false);
    }
  };

  const handleCreateTemplate = () => {
    setEditingTemplate({
      id: '',
      organisation_id: userProfile?.organisation_id || '',
      name: '',
      description: '',
      content_structure: [],
      settings: {
        default_vat_rate: 25,
        default_payment_terms: 30
      }
    });
    setShowTemplateModal(true);
  };

  const handleEditTemplate = (template: QuoteTemplate) => {
    setEditingTemplate({ ...template });
    setShowTemplateModal(true);
  };

  const handleDuplicateTemplate = (template: QuoteTemplate) => {
    setEditingTemplate({
      ...template,
      id: '',
      name: `${template.name} (Kopia)`,
      created_at: undefined
    });
    setShowTemplateModal(true);
  };

  const handleSaveTemplate = async () => {
    if (!editingTemplate) return;

    try {
      setSaving(true);
      setError(null);

      if (editingTemplate.id) {
        // Update existing template
        const result = await updateQuoteTemplate(editingTemplate.id, editingTemplate);
        if (result.error) {
          setError(result.error.message);
          return;
        }
      } else {
        // Create new template
        const { id, created_at, ...templateData } = editingTemplate;
        const result = await createQuoteTemplate(templateData);
        if (result.error) {
          setError(result.error.message);
          return;
        }
      }

      setSuccess('Mall sparad framgångsrikt!');
      setShowTemplateModal(false);
      setEditingTemplate(null);
      await loadData();
      setTimeout(() => setSuccess(null), 3000);
    } catch (err) {
      console.error('Error saving template:', err);
      setError('Ett oväntat fel inträffade vid sparning.');
    } finally {
      setSaving(false);
    }
  };

  const handleDeleteTemplate = async (templateId: string) => {
    try {
      const result = await deleteQuoteTemplate(templateId);
      if (result.error) {
        setError(result.error.message);
        return;
      }

      setSuccess('Mall borttagen framgångsrikt!');
      setShowDeleteConfirm(null);
      await loadData();
      setTimeout(() => setSuccess(null), 3000);
    } catch (err) {
      console.error('Error deleting template:', err);
      setError('Ett oväntat fel inträffade vid borttagning.');
    }
  };

  const handleCreateDefaults = async () => {
    if (!userProfile?.organisation_id) return;

    try {
      setSaving(true);
      const result = await createDefaultTemplates(userProfile.organisation_id);
      if (result.error) {
        setError(result.error.message);
        return;
      }

      setSuccess('Standardmallar skapade framgångsrikt!');
      await loadData();
      setTimeout(() => setSuccess(null), 3000);
    } catch (err) {
      console.error('Error creating default templates:', err);
      setError('Ett oväntat fel inträffade vid skapande av standardmallar.');
    } finally {
      setSaving(false);
    }
  };

  const handleDragStart = (e: React.DragEvent, template: QuoteTemplate) => {
    setDraggedTemplate(template);
    e.dataTransfer.effectAllowed = 'move';
  };

  const handleDragOver = (e: React.DragEvent, index: number) => {
    e.preventDefault();
    e.dataTransfer.dropEffect = 'move';
    setDragOverIndex(index);
  };

  const handleDragLeave = () => {
    setDragOverIndex(null);
  };

  const handleDrop = async (e: React.DragEvent, dropIndex: number) => {
    e.preventDefault();
    setDragOverIndex(null);

    if (!draggedTemplate || !userProfile?.organisation_id) return;

    const dragIndex = templates.findIndex(t => t.id === draggedTemplate.id);
    if (dragIndex === dropIndex) return;

    try {
      // Create new order array
      const newTemplates = [...templates];
      const [movedTemplate] = newTemplates.splice(dragIndex, 1);
      newTemplates.splice(dropIndex, 0, movedTemplate);

      // Update local state immediately for better UX
      setTemplates(newTemplates);

      // Update database
      const templateIds = newTemplates.map(t => t.id);
      const result = await reorderQuoteTemplates(userProfile.organisation_id, templateIds);
      
      if (result.error) {
        // Revert on error
        setTemplates(templates);
        setError(result.error.message);
        return;
      }

      setSuccess('Mallordning uppdaterad!');
      setTimeout(() => setSuccess(null), 2000);
    } catch (err) {
      console.error('Error reordering templates:', err);
      setError('Ett fel inträffade vid omordning av mallar.');
      // Revert on error
      setTemplates(templates);
    } finally {
      setDraggedTemplate(null);
    }
  };

  const handleBlocksChange = (blocks: ContentBlock[]) => {
    if (!editingTemplate) return;
    
    setEditingTemplate(prev => prev ? {
      ...prev,
      content_structure: blocks
    } : null);
  };

  if (loading) {
    return (
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <h2 className="text-2xl font-bold text-gray-900">Offertmallar</h2>
          <LoadingSpinner />
        </div>
        <div className="bg-white rounded-lg p-6">
          <LoadingSpinner size="lg" text="Laddar mallar..." />
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
            <FileText className="w-7 h-7 mr-3 text-blue-600" />
            Offertmallar
          </h2>
          <p className="mt-2 text-gray-600">
            Skapa och hantera mallar för snabbare offertframställning
          </p>
        </div>
        <div className="flex items-center space-x-3">
          {templates.length === 0 && (
            <button
              onClick={handleCreateDefaults}
              disabled={saving}
              className="inline-flex items-center px-3 py-2 border border-gray-300 rounded-md shadow-sm text-sm font-medium text-gray-700 bg-white hover:bg-gray-50 disabled:opacity-50"
            >
              {saving ? (
                <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-gray-600 mr-2"></div>
              ) : (
                <Package className="w-4 h-4 mr-2" />
              )}
              Skapa standardmallar
            </button>
          )}
          <button
            onClick={handleCreateTemplate}
            className="inline-flex items-center px-4 py-2 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-blue-600 hover:bg-blue-700"
          >
            <Plus className="w-4 h-4 mr-2" />
            Ny mall
          </button>
        </div>
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

      {/* Templates List */}
      <div className="bg-white rounded-lg shadow-sm border">
        <div className="px-6 py-4 border-b border-gray-200">
          <h3 className="text-lg font-semibold text-gray-900">Dina mallar</h3>
        </div>

        {templates.length === 0 ? (
          <div className="p-8 text-center text-gray-500">
            <FileText className="w-12 h-12 mx-auto mb-3 text-gray-400" />
            <p className="font-medium">Inga mallar skapade ännu</p>
            <p className="text-sm mt-1">Skapa din första mall för att komma igång</p>
          </div>
        ) : (
          <div className="p-6">
            <div className="space-y-4">
              {templates.map((template, index) => (
                <div 
                  key={template.id} 
                  draggable
                  onDragStart={(e) => handleDragStart(e, template)}
                  onDragOver={(e) => handleDragOver(e, index)}
                  onDragLeave={handleDragLeave}
                  onDrop={(e) => handleDrop(e, index)}
                  className={`border rounded-lg p-4 hover:shadow-md transition-all cursor-move ${
                    dragOverIndex === index 
                      ? 'border-blue-500 bg-blue-50 transform scale-105' 
                      : 'border-gray-200'
                  } ${
                    draggedTemplate?.id === template.id 
                      ? 'opacity-50 transform rotate-2' 
                      : ''
                  }`}
                >
                  <div className="flex items-start space-x-3">
                    <div className="flex-shrink-0 mt-1">
                      <GripVertical className="w-5 h-5 text-gray-400" />
                    </div>
                    <div className="flex-1">
                      <div className="flex items-start justify-between mb-3">
                        <div className="flex-1">
                          <h4 className="font-medium text-gray-900">{template.name}</h4>
                          {template.description && (
                            <p className="text-sm text-gray-600 mt-1">{template.description}</p>
                          )}
                        </div>
                        <div className="flex items-center space-x-1 ml-2">
                          <button
                            onClick={() => setShowPreview(template)}
                            className="text-gray-400 hover:text-blue-600"
                            title="Förhandsgranska"
                          >
                            <Eye className="w-4 h-4" />
                          </button>
                          <button
                            onClick={() => handleEditTemplate(template)}
                            className="text-gray-400 hover:text-blue-600"
                            title="Redigera"
                          >
                            <Edit className="w-4 h-4" />
                          </button>
                          <button
                            onClick={() => handleDuplicateTemplate(template)}
                            className="text-gray-400 hover:text-green-600"
                            title="Duplicera"
                          >
                            <Copy className="w-4 h-4" />
                          </button>
                          <button
                            onClick={() => setShowDeleteConfirm(template.id)}
                            className="text-gray-400 hover:text-red-600"
                            title="Ta bort"
                          >
                            <Trash2 className="w-4 h-4" />
                          </button>
                        </div>
                      </div>

                      <div className="space-y-2 text-sm text-gray-600">
                        <p>{template.content_structure.filter(b => b.type === 'line_items_table').length} artikeltabeller</p>
                        <p className="font-medium text-gray-900">
                          Total: {formatCurrency(calculateTemplateTotal(template))}
                        </p>
                      </div>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>

      {/* Template Edit Modal */}
      {showTemplateModal && editingTemplate && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-lg max-w-4xl w-full max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between p-6 border-b">
              <h3 className="text-lg font-semibold text-gray-900">
                {editingTemplate.id ? 'Redigera mall' : 'Ny offertmall'}
              </h3>
              <button
                onClick={() => {
                  setShowTemplateModal(false);
                  setEditingTemplate(null);
                }}
                className="text-gray-400 hover:text-gray-600"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="p-6 space-y-6">
              {/* Basic Info */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
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
                    placeholder="T.ex. Taktvätt - Standard"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Betalningsvillkor (dagar)
                  </label>
                  <input
                    type="number"
                    value={editingTemplate.settings.default_payment_terms || 30}
                    onChange={(e) => setEditingTemplate(prev => prev ? {
                      ...prev,
                      settings: { ...prev.settings, default_payment_terms: parseInt(e.target.value) || 30 }
                    } : null)}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-blue-500 focus:border-blue-500"
                    min="1"
                  />
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Beskrivning
                </label>
                <textarea
                  value={editingTemplate.description || ''}
                  onChange={(e) => setEditingTemplate(prev => prev ? { ...prev, description: e.target.value } : null)}
                  rows={2}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-blue-500 focus:border-blue-500"
                  placeholder="Beskrivning av mallen..."
                />
              </div>

              {/* Line Items */}
              <div>
                <h4 className="font-medium text-gray-900 mb-4">Mallinnehåll</h4>
                <BlockBasedTemplateEditor
                  blocks={editingTemplate.content_structure}
                  onBlocksChange={handleBlocksChange}
                />
              </div>

              {/* Template Notes */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Allmänna anteckningar
                </label>
                <textarea
                  value={editingTemplate.settings.notes || ''}
                  onChange={(e) => setEditingTemplate(prev => prev ? {
                    ...prev,
                    settings: { ...prev.settings, notes: e.target.value }
                  } : null)}
                  rows={3}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-blue-500 focus:border-blue-500"
                  placeholder="Allmänna anteckningar för denna mall (visas inte i offerten)..."
                />
              </div>
            </div>

            <div className="flex justify-end space-x-3 p-6 border-t">
              <button
                onClick={() => {
                  setShowTemplateModal(false);
                  setEditingTemplate(null);
                }}
                className="px-4 py-2 border border-gray-300 rounded-md text-sm font-medium text-gray-700 bg-white hover:bg-gray-50"
              >
                Avbryt
              </button>
              <button
                onClick={handleSaveTemplate}
                disabled={saving || !editingTemplate.name}
                className="px-4 py-2 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-blue-600 hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {saving ? (
                  <div className="flex items-center">
                    <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
                    Sparar...
                  </div>
                ) : (
                  <>
                    <Save className="w-4 h-4 mr-2" />
                    Spara mall
                  </>
                )}
              </button>
            </div>
          </div>
        </div>
      )}

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

            <div className="flex justify-end p-6 border-t">
              <button
                onClick={() => setShowPreview(null)}
                className="px-4 py-2 border border-gray-300 rounded-md text-sm font-medium text-gray-700 bg-white hover:bg-gray-50"
              >
                Stäng
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Delete Confirmation */}
      <ConfirmDialog
        isOpen={!!showDeleteConfirm}
        onClose={() => setShowDeleteConfirm(null)}
        onConfirm={() => showDeleteConfirm && handleDeleteTemplate(showDeleteConfirm)}
        title="Ta bort offertmall"
        message="Är du säker på att du vill ta bort denna mall? Denna åtgärd kan inte ångras."
        confirmText="Ta bort"
        type="danger"
      />
    </div>
  );
}

export default QuoteTemplateSettings;