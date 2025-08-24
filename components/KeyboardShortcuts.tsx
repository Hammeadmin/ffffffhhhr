import React, { useEffect, useState } from 'react';
import { Keyboard, X } from 'lucide-react';

interface Shortcut {
  key: string;
  description: string;
  category: string;
}

interface KeyboardShortcutsProps {
  isOpen: boolean;
  onClose: () => void;
}

function KeyboardShortcuts({ isOpen, onClose }: KeyboardShortcutsProps) {
  const shortcuts: Shortcut[] = [
    // Navigation
    { key: 'G + D', description: 'Gå till Dashboard', category: 'Navigation' },
    { key: 'G + O', description: 'Gå till Ordrar', category: 'Navigation' },
    { key: 'G + K', description: 'Gå till Kunder', category: 'Navigation' },
    { key: 'G + F', description: 'Gå till Offerter', category: 'Navigation' },
    { key: 'G + C', description: 'Gå till Kalender', category: 'Navigation' },
    { key: 'G + I', description: 'Gå till Fakturor', category: 'Navigation' },
    
    // Actions
    { key: 'N', description: 'Skapa ny (beroende på sida)', category: 'Åtgärder' },
    { key: 'Ctrl + S', description: 'Spara', category: 'Åtgärder' },
    { key: 'Escape', description: 'Stäng modal/dialog', category: 'Åtgärder' },
    { key: 'Enter', description: 'Bekräfta/Skicka', category: 'Åtgärder' },
    
    // Search
    { key: 'Ctrl + K', description: 'Öppna snabbsökning', category: 'Sök' },
    { key: '/', description: 'Fokusera sökfält', category: 'Sök' },
    
    // Help
    { key: '?', description: 'Visa denna hjälp', category: 'Hjälp' },
    { key: 'Ctrl + ?', description: 'Öppna användarguide', category: 'Hjälp' }
  ];

  const groupedShortcuts = shortcuts.reduce((acc, shortcut) => {
    if (!acc[shortcut.category]) {
      acc[shortcut.category] = [];
    }
    acc[shortcut.category].push(shortcut);
    return acc;
  }, {} as Record<string, Shortcut[]>);

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
      <div className="bg-white rounded-lg max-w-2xl w-full max-h-[90vh] overflow-y-auto">
        {/* Header */}
        <div className="flex items-center justify-between p-6 border-b">
          <div className="flex items-center">
            <Keyboard className="w-6 h-6 text-blue-600 mr-3" />
            <h2 className="text-xl font-semibold text-gray-900">Tangentbordsgenvägar</h2>
          </div>
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-gray-600"
          >
            <X className="w-6 h-6" />
          </button>
        </div>

        {/* Content */}
        <div className="p-6">
          <p className="text-gray-600 mb-6">
            Använd dessa tangentbordsgenvägar för att navigera snabbare i systemet.
          </p>

          <div className="space-y-6">
            {Object.entries(groupedShortcuts).map(([category, categoryShortcuts]) => (
              <div key={category}>
                <h3 className="text-lg font-semibold text-gray-900 mb-3">{category}</h3>
                <div className="space-y-2">
                  {categoryShortcuts.map((shortcut, index) => (
                    <div key={index} className="flex items-center justify-between py-2 px-3 bg-gray-50 rounded-lg">
                      <span className="text-gray-700">{shortcut.description}</span>
                      <div className="flex items-center space-x-1">
                        {shortcut.key.split(' + ').map((key, keyIndex) => (
                          <React.Fragment key={keyIndex}>
                            {keyIndex > 0 && <span className="text-gray-400 text-xs">+</span>}
                            <kbd className="px-2 py-1 text-xs font-semibold text-gray-800 bg-white border border-gray-300 rounded shadow-sm">
                              {key}
                            </kbd>
                          </React.Fragment>
                        ))}
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Footer */}
        <div className="p-6 border-t bg-gray-50">
          <div className="flex items-center justify-between">
            <p className="text-sm text-gray-600">
              Tryck <kbd className="px-2 py-1 text-xs font-semibold text-gray-800 bg-white border border-gray-300 rounded">?</kbd> när som helst för att visa denna hjälp
            </p>
            <button
              onClick={onClose}
              className="px-4 py-2 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-blue-600 hover:bg-blue-700"
            >
              Stäng
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

export default KeyboardShortcuts;