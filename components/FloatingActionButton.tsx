import React, { useState } from 'react';
import { Plus, Package, Users, FileText, Calendar, Receipt, X } from 'lucide-react';
import { useNavigate, useLocation } from 'react-router-dom';

interface FloatingAction {
  icon: React.ComponentType<any>;
  label: string;
  href: string;
  color: string;
  shortcut?: string;
}

function FloatingActionButton() {
  const [isOpen, setIsOpen] = useState(false);
  const navigate = useNavigate();
  const location = useLocation();

  const actions: FloatingAction[] = [
    {
      icon: Package,
      label: 'Ny Order',
      href: '/ordrar',
      color: 'from-blue-500 to-blue-600',
      shortcut: 'G+O'
    },
    {
      icon: Users,
      label: 'Ny Kund',
      href: '/kunder',
      color: 'from-green-500 to-green-600',
      shortcut: 'G+K'
    },
    {
      icon: FileText,
      label: 'Ny Offert',
      href: '/offerter',
      color: 'from-purple-500 to-purple-600',
      shortcut: 'G+F'
    },
    {
      icon: Calendar,
      label: 'Boka Möte',
      href: '/kalender',
      color: 'from-indigo-500 to-indigo-600',
      shortcut: 'G+C'
    },
    {
      icon: Receipt,
      label: 'Ny Faktura',
      href: '/fakturor',
      color: 'from-red-500 to-red-600',
      shortcut: 'G+I'
    }
  ];

  const handleActionClick = (href: string) => {
    navigate(href);
    setIsOpen(false);
  };

  // Don't show on mobile (we have bottom nav) or on login page
  if (window.innerWidth < 1024 || location.pathname === '/login') {
    return null;
  }

  return (
    <div className="fixed bottom-8 right-8 z-40">
      {/* Action Menu */}
      <div className={`absolute bottom-20 right-0 space-y-3 transition-all duration-300 ${
        isOpen ? 'opacity-100 translate-y-0 pointer-events-auto' : 'opacity-0 translate-y-4 pointer-events-none'
      }`}>
        {actions.map((action, index) => {
          const Icon = action.icon;
          return (
            <div
              key={action.href}
              className="flex items-center space-x-3 transform transition-all duration-300"
              style={{
                transitionDelay: isOpen ? `${index * 50}ms` : '0ms',
                transform: isOpen ? 'translateX(0)' : 'translateX(100%)'
              }}
            >
              {/* Label */}
              <div className="bg-gray-900 dark:bg-gray-700 text-white text-sm px-3 py-2 rounded-lg shadow-lg whitespace-nowrap opacity-0 group-hover:opacity-100 transition-opacity duration-200">
                <div className="flex items-center space-x-2">
                  <span>{action.label}</span>
                  {action.shortcut && (
                    <kbd className="px-2 py-1 text-xs bg-gray-800 dark:bg-gray-600 rounded border border-gray-700 dark:border-gray-500">
                      {action.shortcut}
                    </kbd>
                  )}
                </div>
              </div>
              
              {/* Action Button */}
              <button
                onClick={() => handleActionClick(action.href)}
                className={`group w-14 h-14 bg-gradient-to-r ${action.color} rounded-full shadow-lg hover:shadow-xl flex items-center justify-center text-white transition-all duration-300 hover:scale-110 backdrop-blur-sm border border-white/20`}
              >
                <Icon className="w-6 h-6" />
              </button>
            </div>
          );
        })}
      </div>

      {/* Main FAB */}
      <button
        onClick={() => setIsOpen(!isOpen)}
        className={`w-16 h-16 bg-gradient-to-r from-primary-500 to-primary-600 rounded-full shadow-2xl hover:shadow-primary-500/25 flex items-center justify-center text-white transition-all duration-300 hover:scale-110 backdrop-blur-sm border border-white/20 ${
          isOpen ? 'rotate-45' : 'rotate-0'
        }`}
      >
        {isOpen ? (
          <X className="w-8 h-8" />
        ) : (
          <Plus className="w-8 h-8" />
        )}
      </button>

      {/* Backdrop */}
      {isOpen && (
        <div 
          className="fixed inset-0 bg-black bg-opacity-20 backdrop-blur-sm -z-10"
          onClick={() => setIsOpen(false)}
        />
      )}
    </div>
  );
}

export default FloatingActionButton;