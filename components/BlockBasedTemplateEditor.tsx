import React, { useState } from 'react';
import {
  GripVertical,
  Plus,
  Trash2,
  Type,
  FileText,
  Package,
  MessageSquare,
  Edit,
  Save,
  X
} from 'lucide-react';
import { UNIT_LABELS, UNIT_DESCRIPTIONS, type QuoteLineItemTemplate } from '../lib/quoteTemplates';
import { formatCurrency } from '../lib/database';

export interface ContentBlock {
  id: string;
  type: 'header' | 'text_block' | 'line_items_table' | 'footer';
  content: any;
}

interface BlockBasedTemplateEditorProps {
  blocks: ContentBlock[];
  onBlocksChange: (blocks: ContentBlock[]) => void;
  className?: string;
}

function BlockBasedTemplateEditor({ blocks, onBlocksChange, className = '' }: BlockBasedTemplateEditorProps) {
  const [draggedBlock, setDraggedBlock] = useState<ContentBlock | null>(null);
  const [dragOverIndex, setDragOverIndex] = useState<number | null>(null);
  const [editingBlock, setEditingBlock] = useState<string | null>(null);

  const blockTypes = [
    { type: 'header', label: 'Rubrik', icon: Type, description: 'Huvudrubrik för offerten' },
    { type: 'text_block', label: 'Textblock', icon: MessageSquare, description: 'Beskrivande text' },
    { type: 'line_items_table', label: 'Artikeltabell', icon: Package, description: 'Tabell med artiklar och priser' },
    { type: 'footer', label: 'Sidfot', icon: FileText, description: 'Avslutande text' }
  ];

  const addBlock = (type: ContentBlock['type']) => {
    const newBlock: ContentBlock = {
      id: Date.now().toString(),
      type,
      content: getDefaultContent(type)
    };

    onBlocksChange([...blocks, newBlock]);
  };

  const getDefaultContent = (type: ContentBlock['type']) => {
    switch (type) {
      case 'header':
        return 'Ny offert';
      case 'text_block':
        return 'Beskrivning av arbetet som ska utföras...';
      case 'line_items_table':
        return [];
      case 'footer':
        return 'Tack för förtroendet! Vi ser fram emot att arbeta med er.';
      default:
        return '';
    }
  };

  const updateBlock = (blockId: string, content: any) => {
    onBlocksChange(blocks.map(block => 
      block.id === blockId ? { ...block, content } : block
    ));
  };

  const removeBlock = (blockId: string) => {
    onBlocksChange(blocks.filter(block => block.id !== blockId));
  };

  const handleDragStart = (e: React.DragEvent, block: ContentBlock) => {
    setDraggedBlock(block);
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

  const handleDrop = (e: React.DragEvent, dropIndex: number) => {
    e.preventDefault();
    setDragOverIndex(null);

    if (!draggedBlock) return;

    const dragIndex = blocks.findIndex(b => b.id === draggedBlock.id);
    if (dragIndex === dropIndex) return;

    const newBlocks = [...blocks];
    const [movedBlock] = newBlocks.splice(dragIndex, 1);
    newBlocks.splice(dropIndex, 0, movedBlock);

    onBlocksChange(newBlocks);
    setDraggedBlock(null);
  };

  const addLineItem = (blockId: string) => {
    const block = blocks.find(b => b.id === blockId);
    if (!block || block.type !== 'line_items_table') return;

    const newItem: QuoteLineItemTemplate = {
      name: '',
      description: '',
      quantity: 1,
      unit_price: 0,
      unit: 'st'
    };

    updateBlock(blockId, [...(block.content || []), newItem]);
  };

  const updateLineItem = (blockId: string, itemIndex: number, updates: Partial<QuoteLineItemTemplate>) => {
    const block = blocks.find(b => b.id === blockId);
    if (!block || block.type !== 'line_items_table') return;

    const updatedItems = (block.content || []).map((item: QuoteLineItemTemplate, index: number) => 
      index === itemIndex ? { ...item, ...updates } : item
    );

    updateBlock(blockId, updatedItems);
  };

  const removeLineItem = (blockId: string, itemIndex: number) => {
    const block = blocks.find(b => b.id === blockId);
    if (!block || block.type !== 'line_items_table') return;

    const updatedItems = (block.content || []).filter((_: any, index: number) => index !== itemIndex);
    updateBlock(blockId, updatedItems);
  };

  const getBlockIcon = (type: string) => {
    const blockType = blockTypes.find(bt => bt.type === type);
    return blockType ? blockType.icon : Type;
  };

  const getBlockLabel = (type: string) => {
    const blockType = blockTypes.find(bt => bt.type === type);
    return blockType ? blockType.label : type;
  };

  const renderBlockContent = (block: ContentBlock) => {
    const Icon = getBlockIcon(block.type);
    const isEditing = editingBlock === block.id;

    switch (block.type) {
      case 'header':
        return (
          <div className="space-y-2">
            <div className="flex items-center space-x-2 text-sm font-medium text-gray-700">
              <Icon className="w-4 h-4" />
              <span>{getBlockLabel(block.type)}</span>
            </div>
            {isEditing ? (
              <input
                type="text"
                value={block.content}
                onChange={(e) => updateBlock(block.id, e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-blue-500 focus:border-blue-500"
                placeholder="Rubriktext..."
                autoFocus
              />
            ) : (
              <h3 className="text-lg font-semibold text-gray-900">{block.content}</h3>
            )}
          </div>
        );

      case 'text_block':
        return (
          <div className="space-y-2">
            <div className="flex items-center space-x-2 text-sm font-medium text-gray-700">
              <Icon className="w-4 h-4" />
              <span>{getBlockLabel(block.type)}</span>
            </div>
            {isEditing ? (
              <textarea
                value={block.content}
                onChange={(e) => updateBlock(block.id, e.target.value)}
                rows={4}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-blue-500 focus:border-blue-500"
                placeholder="Textinnehåll..."
                autoFocus
              />
            ) : (
              <p className="text-gray-700 whitespace-pre-wrap">{block.content}</p>
            )}
          </div>
        );

      case 'footer':
        return (
          <div className="space-y-2">
            <div className="flex items-center space-x-2 text-sm font-medium text-gray-700">
              <Icon className="w-4 h-4" />
              <span>{getBlockLabel(block.type)}</span>
            </div>
            {isEditing ? (
              <textarea
                value={block.content}
                onChange={(e) => updateBlock(block.id, e.target.value)}
                rows={3}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-blue-500 focus:border-blue-500"
                placeholder="Sidfottext..."
                autoFocus
              />
            ) : (
              <p className="text-gray-700 whitespace-pre-wrap">{block.content}</p>
            )}
          </div>
        );

      case 'line_items_table':
        const lineItems = block.content || [];
        return (
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center space-x-2 text-sm font-medium text-gray-700">
                <Icon className="w-4 h-4" />
                <span>{getBlockLabel(block.type)}</span>
              </div>
              <button
                onClick={() => addLineItem(block.id)}
                className="inline-flex items-center px-2 py-1 border border-gray-300 rounded text-xs font-medium text-gray-700 bg-white hover:bg-gray-50"
              >
                <Plus className="w-3 h-3 mr-1" />
                Lägg till artikel
              </button>
            </div>

            {lineItems.length === 0 ? (
              <div className="text-center py-6 text-gray-500 border-2 border-dashed border-gray-300 rounded-lg">
                <Package className="w-8 h-8 mx-auto mb-2 text-gray-400" />
                <p className="text-sm">Inga artiklar ännu</p>
                <button
                  onClick={() => addLineItem(block.id)}
                  className="text-xs text-blue-600 hover:text-blue-700 mt-1"
                >
                  Lägg till första artikel
                </button>
              </div>
            ) : (
              <div className="space-y-3">
                {lineItems.map((item: QuoteLineItemTemplate, index: number) => (
                  <div key={index} className="border border-gray-200 rounded-lg p-3">
                    <div className="grid grid-cols-1 md:grid-cols-12 gap-3 items-start">
                      <div className="md:col-span-3">
                        <label className="block text-xs font-medium text-gray-700 mb-1">
                          Namn *
                        </label>
                        <input
                          type="text"
                          value={item.name}
                          onChange={(e) => updateLineItem(block.id, index, { name: e.target.value })}
                          className="w-full px-2 py-1 text-sm border border-gray-300 rounded focus:ring-blue-500 focus:border-blue-500"
                          placeholder="Artikelnamn"
                        />
                      </div>
                      <div className="md:col-span-3">
                        <label className="block text-xs font-medium text-gray-700 mb-1">
                          Beskrivning
                        </label>
                        <input
                          type="text"
                          value={item.description}
                          onChange={(e) => updateLineItem(block.id, index, { description: e.target.value })}
                          className="w-full px-2 py-1 text-sm border border-gray-300 rounded focus:ring-blue-500 focus:border-blue-500"
                          placeholder="Beskrivning"
                        />
                      </div>
                      <div className="md:col-span-2">
                        <label className="block text-xs font-medium text-gray-700 mb-1">
                          Antal
                        </label>
                        <input
                          type="number"
                          value={item.quantity}
                          onChange={(e) => updateLineItem(block.id, index, { quantity: parseFloat(e.target.value) || 1 })}
                          className="w-full px-2 py-1 text-sm border border-gray-300 rounded focus:ring-blue-500 focus:border-blue-500"
                          min="0"
                          step="0.1"
                        />
                      </div>
                      <div className="md:col-span-2">
                        <label className="block text-xs font-medium text-gray-700 mb-1">
                          Enhet
                        </label>
                        <select
                          value={item.unit}
                          onChange={(e) => updateLineItem(block.id, index, { unit: e.target.value as any })}
                          className="w-full px-2 py-1 text-sm border border-gray-300 rounded focus:ring-blue-500 focus:border-blue-500"
                        >
                          {Object.entries(UNIT_DESCRIPTIONS).map(([value, label]) => (
                            <option key={value} value={value}>{label}</option>
                          ))}
                        </select>
                      </div>
                      <div className="md:col-span-1">
                        <label className="block text-xs font-medium text-gray-700 mb-1">
                          À-pris
                        </label>
                        <input
                          type="number"
                          value={item.unit_price}
                          onChange={(e) => updateLineItem(block.id, index, { unit_price: parseFloat(e.target.value) || 0 })}
                          className="w-full px-2 py-1 text-sm border border-gray-300 rounded focus:ring-blue-500 focus:border-blue-500"
                          min="0"
                          step="0.01"
                        />
                      </div>
                      <div className="md:col-span-1 flex items-end">
                        <button
                          onClick={() => removeLineItem(block.id, index)}
                          className="p-1 text-gray-400 hover:text-red-600"
                          title="Ta bort artikel"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </div>
                    </div>
                    <div className="mt-2 text-right">
                      <span className="text-sm font-medium text-gray-900">
                        Summa: {formatCurrency(item.quantity * item.unit_price)}
                      </span>
                    </div>
                  </div>
                ))}
                
                <div className="text-right pt-3 border-t">
                  <span className="text-lg font-bold text-gray-900">
                    Total: {formatCurrency(lineItems.reduce((sum: number, item: QuoteLineItemTemplate) => 
                      sum + (item.quantity * item.unit_price), 0
                    ))}
                  </span>
                </div>
              </div>
            )}
          </div>
        );

      default:
        return <div>Okänd blocktyp: {block.type}</div>;
    }
  };

  return (
    <div className={`space-y-4 ${className}`}>
      {/* Add Block Buttons */}
      <div className="flex flex-wrap gap-2 p-4 bg-gray-50 rounded-lg border-2 border-dashed border-gray-300">
        <span className="text-sm font-medium text-gray-700 mr-2">Lägg till block:</span>
        {blockTypes.map((blockType) => {
          const Icon = blockType.icon;
          return (
            <button
              key={blockType.type}
              onClick={() => addBlock(blockType.type as ContentBlock['type'])}
              className="inline-flex items-center px-3 py-1 border border-gray-300 rounded-md text-xs font-medium text-gray-700 bg-white hover:bg-gray-50"
              title={blockType.description}
            >
              <Icon className="w-3 h-3 mr-1" />
              {blockType.label}
            </button>
          );
        })}
      </div>

      {/* Blocks List */}
      <div className="space-y-4">
        {blocks.map((block, index) => (
          <div
            key={block.id}
            draggable
            onDragStart={(e) => handleDragStart(e, block)}
            onDragOver={(e) => handleDragOver(e, index)}
            onDragLeave={handleDragLeave}
            onDrop={(e) => handleDrop(e, index)}
            className={`border rounded-lg p-4 transition-all cursor-move ${
              dragOverIndex === index 
                ? 'border-blue-500 bg-blue-50 transform scale-105' 
                : 'border-gray-200 hover:border-gray-300'
            } ${
              draggedBlock?.id === block.id 
                ? 'opacity-50 transform rotate-1' 
                : ''
            }`}
          >
            <div className="flex items-start space-x-3">
              <div className="flex-shrink-0 mt-2">
                <GripVertical className="w-5 h-5 text-gray-400" />
              </div>
              
              <div className="flex-1">
                {renderBlockContent(block)}
              </div>

              <div className="flex-shrink-0 flex items-center space-x-1">
                <button
                  onClick={() => setEditingBlock(editingBlock === block.id ? null : block.id)}
                  className="text-gray-400 hover:text-blue-600"
                  title="Redigera"
                >
                  <Edit className="w-4 h-4" />
                </button>
                <button
                  onClick={() => removeBlock(block.id)}
                  className="text-gray-400 hover:text-red-600"
                  title="Ta bort block"
                >
                  <Trash2 className="w-4 h-4" />
                </button>
              </div>
            </div>
          </div>
        ))}
      </div>

      {blocks.length === 0 && (
        <div className="text-center py-8 text-gray-500">
          <FileText className="w-12 h-12 mx-auto mb-3 text-gray-400" />
          <p className="font-medium">Inga block ännu</p>
          <p className="text-sm mt-1">Lägg till block för att bygga din offertmall</p>
        </div>
      )}
    </div>
  );
}

export default BlockBasedTemplateEditor;