import React, { useState, useRef, useEffect } from 'react';
import { 
  Search, 
  X, 
  Clock, 
  Package,
  Users, 
  FileText, 
  Receipt,
  Calendar,
  Command,
  ArrowRight
} from 'lucide-react';
import { useNavigate } from 'react-router-dom';

interface SearchResult {
  id: string;
  type: 'order' | 'customer' | 'quote' | 'invoice' | 'event';
  title: string;
  subtitle?: string;
  url: string;
  metadata?: string;
}

interface SearchModalProps {
  isOpen: boolean;
  onClose: () => void;
}

function SearchModal({ isOpen, onClose }: SearchModalProps) {
  const [query, setQuery] = useState('');
  const [results, setResults] = useState<SearchResult[]>([]);
  const [recentSearches, setRecentSearches] = useState<string[]>([]);
  const [loading, setLoading] = useState(false);
  const [selectedIndex, setSelectedIndex] = useState(0);
  const inputRef = useRef<HTMLInputElement>(null);
  const navigate = useNavigate();

  // Mock search function
  const performSearch = async (searchQuery: string): Promise<SearchResult[]> => {
    if (!searchQuery.trim()) return [];

    await new Promise(resolve => setTimeout(resolve, 200));

    const mockResults: SearchResult[] = [
      {
        id: '1',
        type: 'order',
        title: 'Webbsida för Acme AB',
        subtitle: 'Order • Öppen • 150 000 kr',
        url: '/ordrar',
        metadata: 'Skapad för 3 dagar sedan'
      },
      {
        id: '2',
        type: 'customer',
        title: 'Acme AB',
        subtitle: 'Stockholm • 5 aktiva projekt • info@acme.se',
        url: '/kunder',
        metadata: '3 år som kund'
      },
      {
        id: '3',
        type: 'quote',
        title: 'Offert #2024-001',
        subtitle: 'Skickad • 75 000 kr • Acme AB',
        url: '/offerter',
        metadata: 'Skickad för 5 dagar sedan'
      },
      {
        id: '4',
        type: 'order',
        title: 'E-handelslösning',
        subtitle: 'Order • Bokad & Bekräftad • Deadline: 2024-02-15',
        url: '/ordrar',
        metadata: 'Deadline: 2024-02-15'
      },
      {
        id: '5',
        type: 'invoice',
        title: 'Faktura #F2024-001',
        subtitle: 'Skickad • 45 000 kr • Förfaller 2024-02-01',
        url: '/fakturor',
        metadata: 'Skickad för 2 dagar sedan'
      },
      {
        id: '6',
        type: 'event',
        title: 'Möte med Acme AB',
        subtitle: 'Imorgon 14:00 • Kontoret • Anna Andersson',
        url: '/kalender',
        metadata: 'Projektgenomgång'
      }
    ];

    return mockResults.filter(result => 
      result.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
      result.subtitle?.toLowerCase().includes(searchQuery.toLowerCase())
    );
  };

  useEffect(() => {
    if (isOpen) {
      inputRef.current?.focus();
      // Load recent searches
      const saved = localStorage.getItem('recentSearches');
      if (saved) {
        setRecentSearches(JSON.parse(saved));
      }
    } else {
      setQuery('');
      setResults([]);
      setSelectedIndex(0);
    }
  }, [isOpen]);

  useEffect(() => {
    const searchTimeout = setTimeout(async () => {
      if (query.trim()) {
        setLoading(true);
        const searchResults = await performSearch(query);
        setResults(searchResults);
        setSelectedIndex(0);
        setLoading(false);
      } else {
        setResults([]);
      }
    }, 200);

    return () => clearTimeout(searchTimeout);
  }, [query]);

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Escape') {
      onClose();
    } else if (e.key === 'ArrowDown') {
      e.preventDefault();
      setSelectedIndex(prev => Math.min(prev + 1, results.length - 1));
    } else if (e.key === 'ArrowUp') {
      e.preventDefault();
      setSelectedIndex(prev => Math.max(prev - 1, 0));
    } else if (e.key === 'Enter') {
      e.preventDefault();
      if (results[selectedIndex]) {
        handleResultClick(results[selectedIndex]);
      }
    }
  };

  const handleResultClick = (result: SearchResult) => {
    // Save to recent searches
    const newRecentSearches = [query, ...recentSearches.filter(s => s !== query)].slice(0, 5);
    setRecentSearches(newRecentSearches);
    localStorage.setItem('recentSearches', JSON.stringify(newRecentSearches));

    navigate(result.url);
    onClose();
  };

  const handleRecentSearchClick = (search: string) => {
    setQuery(search);
    inputRef.current?.focus();
  };

  const getTypeIcon = (type: string) => {
    switch (type) {
      case 'order': return Package;
      case 'customer': return Users;
      case 'quote': return FileText;
      case 'invoice': return Receipt;
      case 'event': return Calendar;
      default: return FileText;
    }
  };

  const getTypeLabel = (type: string) => {
    switch (type) {
      case 'order': return 'Order';
      case 'customer': return 'Kund';
      case 'quote': return 'Offert';
      case 'invoice': return 'Faktura';
      case 'event': return 'Händelse';
      default: return type;
    }
  };

  const getTypeColor = (type: string) => {
    switch (type) {
      case 'order': return 'text-blue-600 bg-blue-100 dark:text-blue-400 dark:bg-blue-900/30';
      case 'customer': return 'text-green-600 bg-green-100 dark:text-green-400 dark:bg-green-900/30';
      case 'quote': return 'text-purple-600 bg-purple-100 dark:text-purple-400 dark:bg-purple-900/30';
      case 'invoice': return 'text-red-600 bg-red-100 dark:text-red-400 dark:bg-red-900/30';
      case 'event': return 'text-indigo-600 bg-indigo-100 dark:text-indigo-400 dark:bg-indigo-900/30';
      default: return 'text-gray-600 bg-gray-100 dark:text-gray-400 dark:bg-gray-700';
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 backdrop-blur-sm flex items-start justify-center p-4 z-50 pt-20">
      <div className="bg-white dark:bg-gray-800 rounded-2xl w-full max-w-2xl shadow-2xl border border-gray-200 dark:border-gray-700 overflow-hidden animate-scale-in">
        {/* Search Input */}
        <div className="p-6 border-b border-gray-200 dark:border-gray-700">
          <div className="relative">
            <Search className="absolute left-4 top-1/2 transform -translate-y-1/2 text-gray-400 dark:text-gray-500 w-5 h-5" />
            <input
              ref={inputRef}
              type="text"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              onKeyDown={handleKeyDown}
              className="w-full pl-12 pr-12 py-4 text-lg bg-gray-50 dark:bg-gray-700 border-0 rounded-xl focus:ring-2 focus:ring-primary-500 focus:bg-white dark:focus:bg-gray-600 transition-all duration-200 text-gray-900 dark:text-white placeholder-gray-500 dark:placeholder-gray-400"
              placeholder="Sök leads, kunder, offerter, jobb..."
            />
            {query && (
              <button
                onClick={() => setQuery('')}
                className="absolute right-4 top-1/2 transform -translate-y-1/2 text-gray-400 dark:text-gray-500 hover:text-gray-600 dark:hover:text-gray-300 transition-colors duration-200"
              >
                <X className="w-5 h-5" />
              </button>
            )}
          </div>
          
          {/* Keyboard Hint */}
          <div className="flex items-center justify-between mt-3 text-xs text-gray-500 dark:text-gray-400">
            <div className="flex items-center space-x-4">
              <span className="flex items-center">
                <kbd className="px-2 py-1 bg-gray-200 dark:bg-gray-700 rounded text-xs">↑↓</kbd>
                <span className="ml-2">navigera</span>
              </span>
              <span className="flex items-center">
                <kbd className="px-2 py-1 bg-gray-200 dark:bg-gray-700 rounded text-xs">↵</kbd>
                <span className="ml-2">välj</span>
              </span>
              <span className="flex items-center">
                <kbd className="px-2 py-1 bg-gray-200 dark:bg-gray-700 rounded text-xs">esc</kbd>
                <span className="ml-2">stäng</span>
              </span>
            </div>
            <div className="flex items-center">
              <Command className="w-3 h-3 mr-1" />
              <span>K för att öppna</span>
            </div>
          </div>
        </div>

        {/* Search Results */}
        <div className="max-h-96 overflow-y-auto scrollbar-thin">
          {loading ? (
            <div className="p-6 text-center">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary-600 mx-auto"></div>
              <p className="text-sm text-gray-500 dark:text-gray-400 mt-3">Söker...</p>
            </div>
          ) : query.trim() ? (
            results.length > 0 ? (
              <div className="py-2">
                {results.map((result, index) => {
                  const Icon = getTypeIcon(result.type);
                  const isSelected = index === selectedIndex;
                  
                  return (
                    <button
                      key={result.id}
                      onClick={() => handleResultClick(result)}
                      className={`w-full px-6 py-4 text-left hover:bg-gray-50 dark:hover:bg-gray-700 flex items-center space-x-4 transition-all duration-200 ${
                        isSelected ? 'bg-primary-50 dark:bg-primary-900/20 border-r-2 border-primary-500' : ''
                      }`}
                    >
                      <div className={`w-12 h-12 rounded-xl flex items-center justify-center shadow-sm ${getTypeColor(result.type)}`}>
                        <Icon className="w-5 h-5" />
                      </div>
                      
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center justify-between mb-1">
                          <p className="text-sm font-medium text-gray-900 dark:text-white truncate">
                            {result.title}
                          </p>
                          <span className={`px-3 py-1 text-xs font-medium rounded-full ${getTypeColor(result.type)}`}>
                            {getTypeLabel(result.type)}
                          </span>
                        </div>
                        {result.subtitle && (
                          <p className="text-sm text-gray-600 dark:text-gray-400 truncate">
                            {result.subtitle}
                          </p>
                        )}
                        {result.metadata && (
                          <p className="text-xs text-gray-500 dark:text-gray-500 mt-1">
                            {result.metadata}
                          </p>
                        )}
                      </div>
                      
                      <ArrowRight className="w-4 h-4 text-gray-400 dark:text-gray-500" />
                    </button>
                  );
                })}
              </div>
            ) : (
              <div className="p-8 text-center text-gray-500 dark:text-gray-400">
                <Search className="w-12 h-12 mx-auto mb-3 text-gray-400 dark:text-gray-500" />
                <p className="text-sm font-medium">Inga resultat för "{query}"</p>
                <p className="text-xs mt-1">Försök med andra sökord</p>
              </div>
            )
          ) : recentSearches.length > 0 ? (
            <div className="py-2">
              <div className="px-6 py-3 text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider border-b border-gray-200 dark:border-gray-700">
                Senaste sökningar
              </div>
              {recentSearches.map((search, index) => (
                <button
                  key={index}
                  onClick={() => handleRecentSearchClick(search)}
                  className="w-full px-6 py-3 text-left hover:bg-gray-50 dark:hover:bg-gray-700 flex items-center space-x-3 transition-colors duration-200"
                >
                  <Clock className="w-4 h-4 text-gray-400 dark:text-gray-500" />
                  <span className="text-sm text-gray-700 dark:text-gray-300">{search}</span>
                  <ArrowRight className="w-3 h-3 text-gray-400 dark:text-gray-500 ml-auto" />
                </button>
              ))}
            </div>
          ) : (
            <div className="p-8 text-center text-gray-500 dark:text-gray-400">
              <Search className="w-12 h-12 mx-auto mb-3 text-gray-400 dark:text-gray-500" />
              <p className="text-sm font-medium">Börja skriva för att söka</p>
              <p className="text-xs mt-1">Sök i leads, kunder, offerter, jobb och mer</p>
            </div>
          )}
        </div>

        {/* Quick Actions */}
        {!query && (
          <div className="border-t border-gray-200 dark:border-gray-700 p-4">
            <div className="text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider mb-3">
              Snabbåtgärder
            </div>
            <div className="grid grid-cols-2 gap-2">
              {[
                { name: 'Ny Order', href: '/ordrar', icon: Package, shortcut: 'G+O' },
                { name: 'Ny Kund', href: '/kunder', icon: Users, shortcut: 'G+K' },
                { name: 'Ny Offert', href: '/offerter', icon: FileText, shortcut: 'G+F' },
                { name: 'Boka Möte', href: '/kalender', icon: Calendar, shortcut: 'G+C' }
              ].map((action) => {
                const Icon = action.icon;
                return (
                  <button
                    key={action.name}
                    onClick={() => {
                      navigate(action.href);
                      onClose();
                    }}
                    className="flex items-center space-x-3 p-3 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors duration-200 text-left"
                  >
                    <Icon className="w-4 h-4 text-gray-500 dark:text-gray-400" />
                    <div className="flex-1">
                      <p className="text-sm font-medium text-gray-900 dark:text-white">{action.name}</p>
                      <p className="text-xs text-gray-500 dark:text-gray-400">{action.shortcut}</p>
                    </div>
                  </button>
                );
              })}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

export default SearchModal;