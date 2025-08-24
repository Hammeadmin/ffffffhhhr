import React, { useState, useEffect } from 'react';
import {
  Package,
  Search,
  Plus,
  Check,
  X,
  Filter,
  Tag,
  ShoppingCart,
  Save,
  AlertCircle
} from 'lucide-react';
import {
  getProductLibrary,
  getProductCategories,
  createProductLibraryItem,
  type ProductLibraryItem,
  UNIT_LABELS,
  UNIT_DESCRIPTIONS
} from '../lib/quoteTemplates';
import { formatCurrency } from '../lib/database';
import LoadingSpinner from './LoadingSpinner';

interface ProductLibraryModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSelectProducts: (products: Array<ProductLibraryItem & { quantity: number }>) => void;
  organisationId: string;
  multiSelect?: boolean;
}

function ProductLibraryModal({ 
  isOpen, 
  onClose, 
  onSelectProducts, 
  organisationId,
  multiSelect = true 
}: ProductLibraryModalProps) {
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [products, setProducts] = useState<ProductLibraryItem[]>([]);
  const [categories, setCategories] = useState<string[]>([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedCategory, setSelectedCategory] = useState('all');
  const [selectedProducts, setSelectedProducts] = useState<Map<string, number>>(new Map());
  const [showCreateForm, setShowCreateForm] = useState(false);
  const [newProduct, setNewProduct] = useState<Omit<ProductLibraryItem, 'id' | 'created_at'>>({
    organisation_id: organisationId,
    name: '',
    description: '',
    unit_price: 0,
    unit: 'st',
    category: ''
  });

  useEffect(() => {
    if (isOpen) {
      loadData();
    }
  }, [isOpen, searchTerm, selectedCategory]);

  const loadData = async () => {
    try {
      setLoading(true);
      setError(null);

      const [productsResult, categoriesResult] = await Promise.all([
        getProductLibrary(organisationId, {
          search: searchTerm,
          category: selectedCategory
        }),
        getProductCategories(organisationId)
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
      console.error('Error loading product library:', err);
      setError('Ett oväntat fel inträffade vid laddning av artikelbiblioteket.');
    } finally {
      setLoading(false);
    }
  };

  const handleProductToggle = (product: ProductLibraryItem) => {
    if (!multiSelect) {
      // Single select mode
      const productWithQuantity = { ...product, quantity: 1 };
      onSelectProducts([productWithQuantity]);
      onClose();
      return;
    }

    // Multi select mode
    const newSelected = new Map(selectedProducts);
    if (newSelected.has(product.id)) {
      newSelected.delete(product.id);
    } else {
      newSelected.set(product.id, 1);
    }
    setSelectedProducts(newSelected);
  };

  const handleQuantityChange = (productId: string, quantity: number) => {
    const newSelected = new Map(selectedProducts);
    if (quantity > 0) {
      newSelected.set(productId, quantity);
    } else {
      newSelected.delete(productId);
    }
    setSelectedProducts(newSelected);
  };

  const handleAddSelected = () => {
    const selectedProductsWithQuantity = products
      .filter(product => selectedProducts.has(product.id))
      .map(product => ({
        ...product,
        quantity: selectedProducts.get(product.id) || 1
      }));

    onSelectProducts(selectedProductsWithQuantity);
    onClose();
  };

  const handleSelectAll = () => {
    if (selectedProducts.size === products.length) {
      setSelectedProducts(new Map());
    } else {
      const newSelected = new Map();
      products.forEach(product => {
        newSelected.set(product.id, 1);
      });
      setSelectedProducts(newSelected);
    }
  };

  const handleCreateProduct = async () => {
    try {
      if (!newProduct.name || newProduct.unit_price <= 0) {
        setError('Namn och pris är obligatoriska fält.');
        return;
      }

      const result = await createProductLibraryItem(newProduct);
      if (result.error) {
        setError(result.error.message);
        return;
      }

      setShowCreateForm(false);
      setNewProduct({
        organisation_id: organisationId,
        name: '',
        description: '',
        unit_price: 0,
        unit: 'st',
        category: ''
      });
      
      await loadData();
    } catch (err) {
      console.error('Error creating product:', err);
      setError('Ett oväntat fel inträffade vid skapande av artikel.');
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
      <div className="bg-white rounded-lg max-w-4xl w-full max-h-[90vh] overflow-hidden">
        {/* Header */}
        <div className="flex items-center justify-between p-6 border-b">
          <div className="flex items-center">
            <Package className="w-6 h-6 text-blue-600 mr-3" />
            <div>
              <h3 className="text-lg font-semibold text-gray-900">Artikelbibliotek</h3>
              <p className="text-sm text-gray-600">
                {multiSelect ? 'Välj artiklar att lägga till i offerten' : 'Välj en artikel'}
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-gray-600"
          >
            <X className="w-6 h-6" />
          </button>
        </div>

        {/* Filters */}
        <div className="p-4 border-b bg-gray-50">
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
            <div className="flex gap-2">
              {multiSelect && products.length > 0 && (
                <button
                  onClick={handleSelectAll}
                  className="px-3 py-2 border border-gray-300 rounded-lg text-sm font-medium text-gray-700 bg-white hover:bg-gray-50"
                >
                  {selectedProducts.size === products.length ? 'Avmarkera alla' : 'Markera alla'}
                </button>
              )}
              <button
                onClick={() => setShowCreateForm(!showCreateForm)}
                className="px-3 py-2 border border-blue-300 rounded-lg text-sm font-medium text-blue-700 bg-blue-50 hover:bg-blue-100"
              >
                <Plus className="w-4 h-4 mr-1" />
                Ny artikel
              </button>
            </div>
          </div>

          {/* Quick Create Form */}
          {showCreateForm && (
            <div className="mt-4 p-4 bg-white rounded-lg border border-blue-200">
              <h4 className="font-medium text-gray-900 mb-3">Skapa ny artikel</h4>
              <div className="grid grid-cols-1 md:grid-cols-4 gap-3">
                <input
                  type="text"
                  placeholder="Artikelnamn"
                  value={newProduct.name}
                  onChange={(e) => setNewProduct(prev => ({ ...prev, name: e.target.value }))}
                  className="px-3 py-2 border border-gray-300 rounded-md focus:ring-blue-500 focus:border-blue-500"
                />
                <input
                  type="text"
                  placeholder="Beskrivning"
                  value={newProduct.description}
                  onChange={(e) => setNewProduct(prev => ({ ...prev, description: e.target.value }))}
                  className="px-3 py-2 border border-gray-300 rounded-md focus:ring-blue-500 focus:border-blue-500"
                />
                <input
                  type="number"
                  placeholder="Pris"
                  value={newProduct.unit_price || ''}
                  onChange={(e) => setNewProduct(prev => ({ ...prev, unit_price: parseFloat(e.target.value) || 0 }))}
                  className="px-3 py-2 border border-gray-300 rounded-md focus:ring-blue-500 focus:border-blue-500"
                  min="0"
                  step="0.01"
                />
                <div className="flex gap-2">
                  <select
                    value={newProduct.unit}
                    onChange={(e) => setNewProduct(prev => ({ ...prev, unit: e.target.value as any }))}
                    className="flex-1 px-3 py-2 border border-gray-300 rounded-md focus:ring-blue-500 focus:border-blue-500"
                  >
                    {Object.entries(UNIT_DESCRIPTIONS).map(([value, label]) => (
                      <option key={value} value={value}>{label}</option>
                    ))}
                  </select>
                  <button
                    onClick={handleCreateProduct}
                    className="px-3 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700"
                  >
                    <Save className="w-4 h-4" />
                  </button>
                </div>
              </div>
              {error && (
                <div className="mt-2 text-sm text-red-600 flex items-center">
                  <AlertCircle className="w-4 h-4 mr-1" />
                  {error}
                </div>
              )}
            </div>
          )}
        </div>

        {/* Products List */}
        <div className="flex-1 overflow-y-auto max-h-96">
          {loading ? (
            <div className="p-8 text-center">
              <LoadingSpinner size="lg" text="Laddar artiklar..." />
            </div>
          ) : error && !showCreateForm ? (
            <div className="p-8 text-center text-red-600">
              <AlertCircle className="w-8 h-8 mx-auto mb-2" />
              <p>{error}</p>
            </div>
          ) : products.length === 0 ? (
            <div className="p-8 text-center text-gray-500">
              <Package className="w-12 h-12 mx-auto mb-3 text-gray-400" />
              <p className="font-medium">
                {searchTerm || selectedCategory !== 'all' ? 'Inga artiklar matchar filtren' : 'Inga artiklar i biblioteket'}
              </p>
              <p className="text-sm mt-1">
                {searchTerm || selectedCategory !== 'all' ? 'Prova att ändra sökterm eller filter' : 'Lägg till artiklar genom att klicka "Ny artikel" ovan'}
              </p>
            </div>
          ) : (
            <div className="p-4 space-y-2">
              {products.map((product) => {
                const isSelected = selectedProducts.has(product.id);
                const quantity = selectedProducts.get(product.id) || 1;

                return (
                  <div
                    key={product.id}
                    className={`border rounded-lg p-4 cursor-pointer transition-all ${
                      isSelected 
                        ? 'border-blue-500 bg-blue-50' 
                        : 'border-gray-200 hover:border-gray-300 hover:bg-gray-50'
                    }`}
                    onClick={() => handleProductToggle(product)}
                  >
                    <div className="flex items-start justify-between">
                      <div className="flex-1">
                        <div className="flex items-center space-x-3 mb-2">
                          <div className={`w-5 h-5 rounded border-2 flex items-center justify-center ${
                            isSelected 
                              ? 'border-blue-500 bg-blue-500' 
                              : 'border-gray-300'
                          }`}>
                            {isSelected && <Check className="w-3 h-3 text-white" />}
                          </div>
                          <h4 className="font-medium text-gray-900">{product.name}</h4>
                          {product.category && (
                            <span className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-gray-100 text-gray-800">
                              <Tag className="w-3 h-3 mr-1" />
                              {product.category}
                            </span>
                          )}
                        </div>
                        
                        {product.description && (
                          <p className="text-sm text-gray-600 mb-2">{product.description}</p>
                        )}
                        
                        <div className="flex items-center space-x-4 text-sm text-gray-600">
                          <span>Enhet: {UNIT_DESCRIPTIONS[product.unit]}</span>
                          <span className="font-medium text-gray-900">
                            {formatCurrency(product.unit_price)}/{UNIT_LABELS[product.unit]}
                          </span>
                        </div>
                      </div>

                      {multiSelect && isSelected && (
                        <div className="ml-4 flex items-center space-x-2" onClick={(e) => e.stopPropagation()}>
                          <label className="text-sm font-medium text-gray-700">Antal:</label>
                          <input
                            type="number"
                            value={quantity}
                            onChange={(e) => handleQuantityChange(product.id, parseFloat(e.target.value) || 1)}
                            className="w-20 px-2 py-1 text-sm border border-gray-300 rounded focus:ring-blue-500 focus:border-blue-500"
                            min="0.1"
                            step="0.1"
                          />
                          <span className="text-sm text-gray-600">{UNIT_LABELS[product.unit]}</span>
                        </div>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="flex items-center justify-between p-6 border-t bg-gray-50">
          <div className="text-sm text-gray-600">
            {multiSelect && selectedProducts.size > 0 && (
              <span>{selectedProducts.size} artiklar valda</span>
            )}
          </div>
          <div className="flex items-center space-x-3">
            <button
              onClick={onClose}
              className="px-4 py-2 border border-gray-300 rounded-md text-sm font-medium text-gray-700 bg-white hover:bg-gray-50"
            >
              Avbryt
            </button>
            {multiSelect && (
              <button
                onClick={handleAddSelected}
                disabled={selectedProducts.size === 0}
                className="inline-flex items-center px-4 py-2 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-blue-600 hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                <ShoppingCart className="w-4 h-4 mr-2" />
                Lägg till ({selectedProducts.size})
              </button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

export default ProductLibraryModal;