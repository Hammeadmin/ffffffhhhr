import React from 'react';
import { Link, useLocation } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import {
  Home,
  Users,
  Package,
  FileText,
  Calendar,
  Receipt,
  Users2,
  Settings,
  Menu,
  X,
  LogOut,
  BarChart3
} from 'lucide-react';

interface MobileNavigationProps {
  isOpen: boolean;
  setIsOpen: (isOpen: boolean) => void;
}

function MobileNavigation({ isOpen, setIsOpen }: MobileNavigationProps) {
  const location = useLocation();
  const { signOut, user } = useAuth();

  const navigation = [
    { name: 'Dashboard', href: '/', icon: Home },
    { name: 'Ordrar', href: '/ordrar', icon: Package },
    { name: 'Kunder', href: '/kunder', icon: Users },
    { name: 'Offerter', href: '/offerter', icon: FileText },
    { name: 'Kalender', href: '/kalender', icon: Calendar },
    { name: 'Fakturor', href: '/fakturor', icon: Receipt },
    { name: 'Team', href: '/team', icon: Users2 },
    { name: 'Analys', href: '/analys', icon: BarChart3 },
    { name: 'Inställningar', href: '/installningar', icon: Settings },
  ];

  const handleSignOut = async () => {
    await signOut();
  };

  return (
    <>
      {/* Mobile overlay */}
      {isOpen && (
        <div 
          className="fixed inset-0 z-40 bg-black bg-opacity-50 lg:hidden"
          onClick={() => setIsOpen(false)}
        />
      )}

      {/* Mobile navigation drawer */}
      <div className={`
        fixed inset-y-0 left-0 z-50 w-80 bg-white dark:bg-gray-800 shadow-2xl transform transition-transform duration-300 ease-in-out lg:hidden
        ${isOpen ? 'translate-x-0' : '-translate-x-full'}
      `}>
        <div className="flex flex-col h-full">
          {/* Header */}
          <div className="flex items-center justify-between p-6 relative overflow-hidden">
            <div className="absolute inset-0 bg-gradient-to-r from-primary-600 to-primary-700"></div>
            <div className="absolute inset-0 bg-gradient-to-br from-accent-400/20 to-transparent"></div>
            <div className="flex items-center">
              <div className="w-10 h-10 bg-white/90 backdrop-blur-sm rounded-xl flex items-center justify-center mr-3 shadow-lg relative z-10">
                <TrendingUp className="w-5 h-5 text-primary-600" />
              </div>
              <h1 className="text-xl font-bold text-white font-primary tracking-tight relative z-10">Momentum</h1>
            </div>
            <button
              onClick={() => setIsOpen(false)}
              className="p-2 rounded-xl text-white hover:bg-white/20 transition-colors duration-200 relative z-10"
            >
              <X size={20} />
            </button>
          </div>

          {/* Navigation */}
          <nav className="flex-1 px-4 py-6 space-y-1 overflow-y-auto scrollbar-thin">
            {navigation.map((item) => {
              const isActive = location.pathname === item.href;
              const Icon = item.icon;
              
              return (
                <Link
                  key={item.name}
                  to={item.href}
                  onClick={() => setIsOpen(false)}
                  className={`nav-item text-base ${isActive ? 'active' : ''}`}
                >
                  <Icon className={`mr-4 h-6 w-6 transition-colors ${
                    isActive ? 'text-white' : 'text-gray-500 dark:text-gray-400'
                  }`} />
                  {item.name}
                </Link>
              );
            })}
          </nav>

          {/* Footer */}
          <div className="p-4 border-t border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-700/30">
            <div className="flex items-center justify-between mb-4">
              <div className="flex items-center">
                <div className="w-12 h-12 bg-gradient-to-br from-primary-500 to-primary-600 rounded-xl flex items-center justify-center shadow-md">
                  <Users className="w-6 h-6 text-white" />
                </div>
                <div className="ml-3">
                  <p className="text-sm font-medium text-gray-800 dark:text-gray-200 font-secondary">Användare</p>
                  <p className="text-xs text-gray-600 dark:text-gray-400 truncate max-w-32 font-secondary">{user?.email}</p>
                </div>
              </div>
              <button
                onClick={handleSignOut}
                className="p-2 text-gray-400 dark:text-gray-500 hover:text-red-600 dark:hover:text-red-400 hover:bg-red-50 dark:hover:bg-red-900/20 rounded-xl transition-all duration-300 focus-ring"
                title="Logga ut"
              >
                <LogOut className="w-5 h-5" />
              </button>
            </div>
          </div>
        </div>
      </div>
    </>
  );
}

export default MobileNavigation;