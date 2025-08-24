import React, { useState, useRef, useEffect } from 'react';
import { Search, X, Clock, Package, Users, FileText } from 'lucide-react';
import { useNavigate } from 'react-router-dom';

interface SearchResult {
  id: string;
  type: 'order' | 'customer' | 'quote' | 'invoice';
  title: string;
  subtitle?: string;
  url: string;
}

interface SearchBarProps {
  placeholder?: string;
  onSearch?: (query: string) => void;
  className?: string;
}

function SearchBar({ placeholder = 'Sök ordrar, kunder, offerter...', onSearch, className = '' }: SearchBarProps) {
  const [query, setQuery] = useState('');
  const [isOpen, setIsOpen] = useState(false);
  const [results, setResults] = useState<SearchResult[]>([]);
  const [recentSearches, setRecentSearches] = useState<string[]>([]);
  const [loading, setLoading] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);
  const navigate = useNavigate();

  // Mock search function - in real app, this would call your API
  const performSearch = async (searchQuery: string): Promise<SearchResult[]> => {
    if (!searchQuery.trim()) return [];

    // Simulate API delay
    await new Promise(resolve => setTimeout(resolve, 300));

    // Mock results
    const mockResults: SearchResult[] = [
      {
        id: '1',
        type: 'order',
        title: 'Webbsida för Acme AB',
        subtitle: 'Order • Öppen • 150 000 kr',
        url: '/ordrar'
      },
      {
        id: '2',
        type: 'customer',
        title: 'Acme AB',
        subtitle: 'Kund • Stockholm • 5 aktiva projekt',
        url: '/kunder'
      },
      {
        id: '3',
        type: 'quote',
        title: 'Offert #2024-001',
        subtitle: 'Offert • Skickad • 75 000 kr',
        url: '/offerter'
      },
      {
        id: '4',
        type: 'order',
        title: 'E-handelslösning',
        subtitle: 'Order • Bokad & Bekräftad • Deadline: 2024-02-15',
        url: '/ordrar'
      }
    ];

    return mockResults.filter(result => 
      result.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
      result.subtitle?.toLowerCase().includes(searchQuery.toLowerCase())
    );
  };

  useEffect(() => {
    const searchTimeout = setTimeout(async () => {
      if (query.trim()) {
        setLoading(true);
        const searchResults = await performSearch(query);
        setResults(searchResults);
        setLoading(false);
        if (onSearch) onSearch(query);
      } else {
        setResults([]);
      }
    }, 300);

    return () => clearTimeout(searchTimeout);
  }, [query, onSearch]);

  useEffect(() => {
    // Load recent searches from localStorage
    const saved = localStorage.getItem('recentSearches');
    if (saved) {
      setRecentSearches(JSON.parse(saved));
    }
  }, []);

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setQuery(e.target.value);
    setIsOpen(true);
  };

  const handleResultClick = (result: SearchResult) => {
    // Save to recent searches
    const newRecentSearches = [query, ...recentSearches.filter(s => s !== query)].slice(0, 5);
    setRecentSearches(newRecentSearches);
    localStorage.setItem('recentSearches', JSON.stringify(newRecentSearches));

    navigate(result.url);
    setIsOpen(false);
    setQuery('');
  };

  const handleRecentSearchClick = (search: string) => {
    setQuery(search);
    setIsOpen(true);
    inputRef.current?.focus();
  };

  const clearQuery = () => {
    setQuery('');
    setResults([]);
    inputRef.current?.focus();
  };

  const getTypeIcon = (type: string) => {
    switch (type) {
      case 'order': return Package;
      case 'customer': return Users;
      case 'quote': return FileText;
      default: return FileText;
    }
  };

  const getTypeLabel = (type: string) => {
    switch (type) {
      case 'order': return 'Order';
      case 'customer': return 'Kund';
      case 'quote': return 'Offert';
      case 'invoice': return 'Faktura';
      default: return type;
    }
  };

  const getTypeColor = (type: string) => {
    switch (type) {
      case 'order': return 'text-blue-600 bg-blue-100';
      case 'customer': return 'text-green-600 bg-green-100';
      case 'quote': return 'text-purple-600 bg-purple-100';
      case 'invoice': return 'text-red-600 bg-red-100';
      default: return 'text-gray-600 bg-gray-100';
    }
  };

  return (
    <div className={`relative ${className}`}>
      <div className="relative">
        <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-4 h-4" />
        <input
          ref={inputRef}
          type="text"
          value={query}
          onChange={handleInputChange}
          onFocus={() => setIsOpen(true)}
          className="input-premium pl-10 pr-10 py-2.5 rounded-xl shadow-subtle font-secondary"
          placeholder={placeholder}
        />
        {query && (
          <button
            onClick={clearQuery}
            className="absolute right-3 top-1/2 transform -translate-y-1/2 text-gray-400 hover:text-gray-600 transition-colors duration-200"
          >
            <X className="w-4 h-4" />
          </button>
        )}
      </div>

      {/* Search Results Dropdown */}
      {isOpen && (
        <>
          <div 
            className="fixed inset-0 z-10"
            onClick={() => setIsOpen(false)}
          />
          <div className="absolute top-full left-0 right-0 mt-2 bg-white border border-gray-200 rounded-xl shadow-large z-20 max-h-96 overflow-y-auto scrollbar-thin animate-scale-in">
            {loading ? (
              <div className="p-4 text-center">
                <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-primary-600 mx-auto"></div>
                <p className="text-sm text-gray-500 mt-2 font-secondary">Söker...</p>
              </div>
            ) : query.trim() ? (
              results.length > 0 ? (
                <div className="py-2">
                  {results.map((result) => {
                    const Icon = getTypeIcon(result.type);
                    return (
                      <button
                        key={result.id}
                        onClick={() => handleResultClick(result)}
                        className="w-full px-4 py-3 text-left hover:bg-gray-50 flex items-center space-x-3 transition-colors duration-200"
                      >
                        <div className={`w-10 h-10 rounded-xl flex items-center justify-center ${getTypeColor(result.type)} shadow-sm`}>
                          <Icon className="w-4 h-4" />
                        </div>
                        <div className="flex-1 min-w-0">
                          <p className="text-sm font-medium text-gray-900 truncate font-secondary">
                            {result.title}
                          </p>
                          {result.subtitle && (
                            <p className="text-xs text-gray-500 truncate font-secondary">
                              {result.subtitle}
                            </p>
                          )}
                        </div>
                        <span className={`px-3 py-1 text-xs font-medium rounded-full ${getTypeColor(result.type)} font-secondary`}>
                          {getTypeLabel(result.type)}
                        </span>
                      </button>
                    );
                  })}
                </div>
              ) : (
                <div className="p-4 text-center text-gray-500">
                  <Search className="w-8 h-8 mx-auto mb-2 text-gray-400" />
                  <p className="text-sm font-secondary">Inga resultat för "{query}"</p>
                </div>
              )
            ) : recentSearches.length > 0 ? (
              <div className="py-2">
                <div className="px-4 py-2 text-xs font-medium text-gray-500 uppercase tracking-wider font-secondary">
                  Senaste sökningar
                </div>
                {recentSearches.map((search, index) => (
                  <button
                    key={index}
                    onClick={() => handleRecentSearchClick(search)}
                    className="w-full px-4 py-2 text-left hover:bg-gray-50 flex items-center space-x-3 transition-colors duration-200"
                  >
                    <Clock className="w-4 h-4 text-gray-400" />
                    <span className="text-sm text-gray-700 font-secondary">{search}</span>
                  </button>
                ))}
              </div>
            ) : (
              <div className="p-4 text-center text-gray-500">
                <Search className="w-8 h-8 mx-auto mb-2 text-gray-400" />
                <p className="text-sm font-secondary">Börja skriva för att söka</p>
              </div>
            )}
          </div>
        </>
      )}
    </div>
  );
}

export default SearchBar;