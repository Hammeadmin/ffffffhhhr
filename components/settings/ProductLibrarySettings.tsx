import React, { useState, useEffect } from 'react';
import {
  Package,
  Plus,
  Edit,
  Trash2,
  Search,
  Filter,
  Save,
  X,
  AlertCircle,
  CheckCircle,
  Tag
} from 'lucide-react';
import { useAuth } from '../../contexts/AuthContext';
import {
  getProductLibrary,
  createProductLibraryItem,
  updateProductLibraryItem,
  deleteProductLibraryItem,
  getProductCategories,
  createDefaultProductLibrary,
  type ProductLibraryItem,
  UNIT_LABELS,
  UNIT_DESCRIPTIONS
} from '../../lib/quoteTemplates';
import { getUserProfiles } from '../../lib/database';
import { formatCurrency } from '../../lib/database';
import LoadingSpinner from '../LoadingSpinner';
import ConfirmDialog from '../ConfirmDialog';

function ProductLibrarySettings() {
  const { user } = useAuth();
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const [products, setProducts] = useState<ProductLibraryItem[]>([]);
  const [categories, setCategories] = useState<string[]>([]);
  const [editingProduct, setEditingProduct] = useState<ProductLibraryItem | null>(null);
  const [showProductModal, setShowProductModal] = useState(false);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState<string | null>(null);
  const [userProfile, setUserProfile] = useState<any>(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedCategory, setSelectedCategory] = useState('all');

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

      // Load products and categories
      const [productsResult, categoriesResult] = await Promise.all([
        getProductLibrary(profile.organisation_id, { search: searchTerm, category: selectedCategory }),
        getProductCategories(profile.organisation_id)
      ]);

      if (productsResult.error) {
        setError(productsResult.error.message);
        return;
      }

      if (categoriesResult.error) {
        setError(categoriesResult.error.message);
        return;
      }

      setProducts(productsResult.data || []);
      setCategories(categoriesResult.data || []);
    } catch (err) {
      console.error('Error loading data:', err);
      setError('Ett oväntat fel inträffade vid laddning av data.');
    } finally {
      setLoading(false);
    }
  };

  // Reload when filters change
  useEffect(() => {
    if (userProfile) {
      loadProducts();
    }
  }, [searchTerm, selectedCategory, userProfile]);

  const loadProducts = async () => {
    if (!userProfile?.organisation_id) return;

    try {
      const result = await getProductLibrary(userProfile.organisation_id, {
        search: searchTerm,
        category: selectedCategory
      });

      if (result.error) {
        setError(result.error.message);
        return;
      }

      setProducts(result.data || []);
    } catch (err) {
      console.error('Error loading products:', err);
      setError('Ett oväntat fel inträffade vid laddning av produkter.');
    }
  };

  const handleCreateProduct = () => {
    setEditingProduct({
      id: '',
      organisation_id: userProfile?.organisation_id || '',
      name: '',
      description: '',
      unit_price: 0,
      unit: 'st',
      category: ''
    });
    setShowProductModal(true);
  };

  const handleEditProduct = (product: ProductLibraryItem) => {
    setEditingProduct({ ...product });
    setShowProductModal(true);
  };

  const handleSaveProduct = async () => {
    if (!editingProduct) return;

    try {
      setSaving(true);
      setError(null);

      if (editingProduct.id) {
        // Update existing product
        const { id, created_at, ...updateData } = editingProduct;
        const result = await updateProductLibraryItem(id, updateData);
        if (result.error) {
          setError(result.error.message);
          return;
        }
      } else {
        // Create new product
        const { id, created_at, ...productData } = editingProduct;
        const result = await createProductLibraryItem(productData);
        if (result.error) {
          setError(result.error.message);
          return;
        }
      }

      setSuccess('Artikel sparad framgångsrikt!');
      setShowProductModal(false);
      setEditingProduct(null);
      await loadData();
      setTimeout(() => setSuccess(null), 3000);
    } catch (err) {
      console.error('Error saving product:', err);
      setError('Ett oväntat fel inträffade vid sparning.');
    } finally {
      setSaving(false);
    }
  };

  const handleDeleteProduct = async (productId: string) => {
    try {
      const result = await deleteProductLibraryItem(productId);
      if (result.error) {
        setError(result.error.message);
        return;
      }

      setSuccess('Artikel borttagen framgångsrikt!');
      setShowDeleteConfirm(null);
      await loadData();
      setTimeout(() => setSuccess(null), 3000);
    } catch (err) {
      console.error('Error deleting product:', err);
      setError('Ett oväntat fel inträffade vid borttagning.');
    }
  };

  const handleCreateDefaults = async () => {
    if (!userProfile?.organisation_id) return;

    try {
      setSaving(true);
      const result = await createDefaultProductLibrary(userProfile.organisation_id);
      if (result.error) {
        setError(result.error.message);
        return;
      }

      setSuccess('Standardartiklar skapade framgångsrikt!');
      await loadData();
      setTimeout(() => setSuccess(null), 3000);
    } catch (err) {
      console.error('Error creating default products:', err);
      setError('Ett oväntat fel inträffade vid skapande av standardartiklar.');
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <h2 className="text-2xl font-bold text-gray-900">Artikelbibliotek</h2>
          <LoadingSpinner />
        </div>
        <div className="bg-white rounded-lg p-6">
          <LoadingSpinner size="lg" text="Laddar artiklar..." />
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
            <Package className="w-7 h-7 mr-3 text-blue-600" />
            Artikelbibliotek
          </h2>
          <p className="mt-2 text-gray-600">
            Hantera ditt bibliotek av produkter och tjänster för snabbare offertframställning
          </p>
        </div>
        <div className="flex items-center space-x-3">
          {products.length === 0 && (
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
              Skapa standardartiklar
            </button>
          )}
          <button
            onClick={handleCreateProduct}
            className="inline-flex items-center px-4 py-2 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-blue-600 hover:bg-blue-700"
          >
            <Plus className="w-4 h-4 mr-2" />
            Ny artikel
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

      {/* Filters */}
      <div className="bg-white rounded-lg shadow-sm border p-4">
        <div className="flex flex-col sm:flex-row gap-4">
          <div className="flex-1">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-4 h-4" />
              <input
                type="text"
                placeholder="Sök artiklar..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-blue-500 focus:border-blue-500"
              />
            </div>
          </div>
          <div className="sm:w-48">
            <select
              value={selectedCategory}
              onChange={(e) => setSelectedCategory(e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-blue-500 focus:border-blue-500"
            >
              <option value="all">Alla kategorier</option>
              {categories.map(category => (
                <option key={category} value={category}>{category}</option>
              ))}
            </select>
          </div>
        </div>
      </div>

      {/* Products List */}
      <div className="bg-white rounded-lg shadow-sm border">
        <div className="px-6 py-4 border-b border-gray-200">
          <div className="flex items-center justify-between">
            <h3 className="text-lg font-semibold text-gray-900">Artiklar</h3>
            <span className="text-sm text-gray-500">{products.length} artiklar</span>
          </div>
        </div>

        {products.length === 0 ? (
          <div className="p-8 text-center text-gray-500">
            <Package className="w-12 h-12 mx-auto mb-3 text-gray-400" />
            <p className="font-medium">
              {searchTerm || selectedCategory !== 'all' ? 'Inga artiklar matchar filtren' : 'Inga artiklar skapade ännu'}
            </p>
            <p className="text-sm mt-1">
              {searchTerm || selectedCategory !== 'all' ? 'Prova att ändra sökterm eller filter' : 'Skapa din första artikel för att komma igång'}
            </p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-gray-200">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Artikel
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Kategori
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Enhet
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Pris
                  </th>
                  <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Åtgärder
                  </th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {products.map((product) => (
                  <tr key={product.id} className="hover:bg-gray-50">
                    <td className="px-6 py-4">
                      <div>
                        <p className="text-sm font-medium text-gray-900">{product.name}</p>
                        {product.description && (
                          <p className="text-sm text-gray-600">{product.description}</p>
                        )}
                      </div>
                    </td>
                    <td className="px-6 py-4">
                      {product.category && (
                        <span className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-blue-100 text-blue-800">
                          <Tag className="w-3 h-3 mr-1" />
                          {product.category}
                        </span>
                      )}
                    </td>
                    <td className="px-6 py-4 text-sm text-gray-900">
                      {UNIT_DESCRIPTIONS[product.unit]}
                    </td>
                    <td className="px-6 py-4 text-sm font-medium text-gray-900">
                      {formatCurrency(product.unit_price)}/{UNIT_LABELS[product.unit]}
                    </td>
                    <td className="px-6 py-4 text-right">
                      <div className="flex items-center justify-end space-x-2">
                        <button
                          onClick={() => handleEditProduct(product)}
                          className="text-gray-400 hover:text-blue-600"
                          title="Redigera"
                        >
                          <Edit className="w-4 h-4" />
                        </button>
                        <button
                          onClick={() => setShowDeleteConfirm(product.id)}
                          className="text-gray-400 hover:text-red-600"
                          title="Ta bort"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Product Edit Modal */}
      {showProductModal && editingProduct && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-lg max-w-2xl w-full max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between p-6 border-b">
              <h3 className="text-lg font-semibold text-gray-900">
                {editingProduct.id ? 'Redigera artikel' : 'Ny artikel'}
              </h3>
              <button
                onClick={() => {
                  setShowProductModal(false);
                  setEditingProduct(null);
                }}
                className="text-gray-400 hover:text-gray-600"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="p-6 space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Artikelnamn *
                  </label>
                  <input
                    type="text"
                    required
                    value={editingProduct.name}
                    onChange={(e) => setEditingProduct(prev => prev ? { ...prev, name: e.target.value } : null)}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-blue-500 focus:border-blue-500"
                    placeholder="T.ex. Taktvätt"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Kategori
                  </label>
                  <input
                    type="text"
                    value={editingProduct.category || ''}
                    onChange={(e) => setEditingProduct(prev => prev ? { ...prev, category: e.target.value } : null)}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-blue-500 focus:border-blue-500"
                    placeholder="T.ex. Taktvätt, Fasadtvätt"
                    list="categories"
                  />
                  <datalist id="categories">
                    {categories.map(category => (
                      <option key={category} value={category} />
                    ))}
                  </datalist>
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Beskrivning
                </label>
                <textarea
                  value={editingProduct.description}
                  onChange={(e) => setEditingProduct(prev => prev ? { ...prev, description: e.target.value } : null)}
                  rows={3}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-blue-500 focus:border-blue-500"
                  placeholder="Detaljerad beskrivning av artikeln..."
                />
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Enhet *
                  </label>
                  <select
                    value={editingProduct.unit}
                    onChange={(e) => setEditingProduct(prev => prev ? { ...prev, unit: e.target.value as any } : null)}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-blue-500 focus:border-blue-500"
                  >
                    {Object.entries(UNIT_DESCRIPTIONS).map(([value, label]) => (
                      <option key={value} value={value}>{label}</option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Pris per enhet *
                  </label>
                  <input
                    type="number"
                    required
                    value={editingProduct.unit_price}
                    onChange={(e) => setEditingProduct(prev => prev ? { ...prev, unit_price: parseFloat(e.target.value) || 0 } : null)}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-blue-500 focus:border-blue-500"
                    min="0"
                    step="0.01"
                    placeholder="0.00"
                  />
                </div>
              </div>

              {editingProduct.unit_price > 0 && (
                <div className="p-4 bg-blue-50 rounded-lg">
                  <p className="text-sm text-blue-700">
                    <strong>Förhandsvisning:</strong> {formatCurrency(editingProduct.unit_price)} per {UNIT_LABELS[editingProduct.unit]}
                  </p>
                </div>
              )}
            </div>

            <div className="flex justify-end space-x-3 p-6 border-t">
              <button
                onClick={() => {
                  setShowProductModal(false);
                  setEditingProduct(null);
                }}
                className="px-4 py-2 border border-gray-300 rounded-md text-sm font-medium text-gray-700 bg-white hover:bg-gray-50"
              >
                Avbryt
              </button>
              <button
                onClick={handleSaveProduct}
                disabled={saving || !editingProduct.name || editingProduct.unit_price <= 0}
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
                    Spara artikel
                  </>
                )}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Delete Confirmation */}
      <ConfirmDialog
        isOpen={!!showDeleteConfirm}
        onClose={() => setShowDeleteConfirm(null)}
        onConfirm={() => showDeleteConfirm && handleDeleteProduct(showDeleteConfirm)}
        title="Ta bort artikel"
        message="Är du säker på att du vill ta bort denna artikel? Denna åtgärd kan inte ångras."
        confirmText="Ta bort"
        type="danger"
      />
    </div>
  );
}

export default ProductLibrarySettings;