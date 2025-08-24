import React, { useState } from 'react';
import { useLocation, Link } from 'react-router-dom';
import {
  Search,
  Bell,
  Menu,
  Sun,
  Moon,
  User,
  Settings,
  LogOut,
  ChevronRight,
  ChevronDown,
  Command
} from 'lucide-react';
import { useAuth } from '../contexts/AuthContext';
import { useNotifications } from '../hooks/useNotifications';

interface HeaderProps {
  onToggleSidebar: () => void;
  onOpenSearch: () => void;
  onToggleNotifications: () => void;
  onToggleTheme: () => void;
  theme: 'light' | 'dark';
  showNotifications: boolean;
}

function Header({ 
  onToggleSidebar, 
  onOpenSearch, 
  onToggleNotifications, 
  onToggleTheme, 
  theme,
  showNotifications 
}: HeaderProps) {
  const location = useLocation();
  const { user, signOut } = useAuth();
  const { unreadCount } = useNotifications();
  const [showUserMenu, setShowUserMenu] = useState(false);

  // Generate breadcrumbs from current path
  const generateBreadcrumbs = () => {
    const pathMap: Record<string, string> = {
      '/': 'Dashboard',
      '/ordrar': 'Ordrar',
      '/kunder': 'Kunder',
      '/offerter': 'Offerter',
      '/kalender': 'Kalender',
      '/fakturor': 'Fakturor',
      '/team': 'Team',
      '/analys': 'Analys',
      '/installningar': 'Inställningar'
    };

    const pathSegments = location.pathname.split('/').filter(Boolean);
    const breadcrumbs = [{ name: 'Dashboard', href: '/' }];

    let currentPath = '';
    pathSegments.forEach((segment) => {
      currentPath += `/${segment}`;
      const name = pathMap[currentPath] || segment;
      breadcrumbs.push({ name, href: currentPath });
    });

    return breadcrumbs.length > 1 ? breadcrumbs : [{ name: pathMap[location.pathname] || 'Dashboard', href: location.pathname }];
  };

  const breadcrumbs = generateBreadcrumbs();

  return (
    <header className="bg-white dark:bg-gray-800 border-b border-gray-200 dark:border-gray-700 shadow-sm">
      <div className="flex items-center justify-between h-16 px-4 lg:px-6">
        {/* Left Section */}
        <div className="flex items-center space-x-4">
          {/* Mobile Menu Button */}
          <button
            onClick={onToggleSidebar}
            className="lg:hidden p-2 rounded-lg text-gray-500 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors duration-200"
          >
            <Menu className="w-5 h-5" />
          </button>

          {/* Breadcrumbs */}
          <nav className="hidden sm:flex items-center space-x-2 text-sm">
            {breadcrumbs.map((crumb, index) => (
              <div key={crumb.href} className="flex items-center">
                {index > 0 && (
                  <ChevronRight className="w-4 h-4 text-gray-400 dark:text-gray-500 mx-2" />
                )}
                {index === breadcrumbs.length - 1 ? (
                  <span className="font-medium text-gray-900 dark:text-white">
                    {crumb.name}
                  </span>
                ) : (
                  <Link
                    to={crumb.href}
                    className="text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-300 transition-colors duration-200"
                  >
                    {crumb.name}
                  </Link>
                )}
              </div>
            ))}
          </nav>
        </div>

        {/* Right Section */}
        <div className="flex items-center space-x-3">
          {/* Search Button */}
          <button
            onClick={onOpenSearch}
            className="hidden sm:flex items-center space-x-2 px-4 py-2 bg-gray-100 dark:bg-gray-700 text-gray-500 dark:text-gray-400 rounded-xl hover:bg-gray-200 dark:hover:bg-gray-600 transition-colors duration-200 min-w-64"
          >
            <Search className="w-4 h-4" />
            <span className="text-sm">Sök...</span>
            <div className="ml-auto flex items-center space-x-1">
              <kbd className="px-2 py-1 text-xs bg-white dark:bg-gray-800 border border-gray-300 dark:border-gray-600 rounded shadow-sm">
                <Command className="w-3 h-3 inline mr-1" />K
              </kbd>
            </div>
          </button>

          {/* Mobile Search Button */}
          <button
            onClick={onOpenSearch}
            className="sm:hidden p-2 rounded-lg text-gray-500 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors duration-200"
          >
            <Search className="w-5 h-5" />
          </button>

          {/* Theme Toggle */}
          <button
            onClick={onToggleTheme}
            className="p-2 rounded-lg text-gray-500 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors duration-200"
            title={theme === 'light' ? 'Växla till mörkt tema' : 'Växla till ljust tema'}
          >
            {theme === 'light' ? (
              <Moon className="w-5 h-5" />
            ) : (
              <Sun className="w-5 h-5" />
            )}
          </button>

          {/* Notifications */}
          <div className="relative">
            <button
              onClick={onToggleNotifications}
              className={`p-2 rounded-lg transition-colors duration-200 relative ${
                showNotifications
                  ? 'bg-blue-100 dark:bg-blue-900/30 text-blue-600 dark:text-blue-400'
                  : 'text-gray-500 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-700'
              }`}
              title="Notifieringar"
            >
              <Bell className="w-5 h-5" />
              {unreadCount > 0 && (
                <div className="absolute -top-1 -right-1 w-5 h-5 bg-red-500 text-white text-xs rounded-full flex items-center justify-center animate-pulse">
                  {unreadCount > 9 ? '9+' : unreadCount}
                </div>
              )}
            </button>
          </div>

          {/* User Menu */}
          <div className="relative">
            <button
              onClick={() => setShowUserMenu(!showUserMenu)}
              className={`flex items-center space-x-2 p-2 rounded-lg transition-colors duration-200 ${
                showUserMenu
                  ? 'bg-gray-100 dark:bg-gray-700'
                  : 'hover:bg-gray-100 dark:hover:bg-gray-700'
              }`}
            >
              <div className="w-8 h-8 bg-gradient-to-br from-primary-500 to-primary-600 rounded-lg flex items-center justify-center">
                <User className="w-4 h-4 text-white" />
              </div>
              <ChevronDown className="w-4 h-4 text-gray-500 dark:text-gray-400" />
            </button>

            {/* User Dropdown */}
            {showUserMenu && (
              <>
                <div 
                  className="fixed inset-0 z-10"
                  onClick={() => setShowUserMenu(false)}
                />
                <div className="absolute right-0 mt-2 w-64 bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-xl shadow-lg z-20 py-2">
                  {/* User Info */}
                  <div className="px-4 py-3 border-b border-gray-200 dark:border-gray-700">
                    <div className="flex items-center space-x-3">
                      <div className="w-10 h-10 bg-gradient-to-br from-primary-500 to-primary-600 rounded-xl flex items-center justify-center">
                        <User className="w-5 h-5 text-white" />
                      </div>
                      <div>
                        <p className="text-sm font-medium text-gray-900 dark:text-white">
                          {user?.email?.split('@')[0] || 'Användare'}
                        </p>
                        <p className="text-xs text-gray-500 dark:text-gray-400">
                          {user?.email}
                        </p>
                      </div>
                    </div>
                  </div>

                  {/* Menu Items */}
                  <div className="py-2">
                    <Link
                      to="/installningar"
                      onClick={() => setShowUserMenu(false)}
                      className="flex items-center px-4 py-3 text-sm text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors duration-200"
                    >
                      <Settings className="w-4 h-4 mr-3" />
                      Inställningar
                    </Link>
                    
                    <button
                      onClick={() => {
                        setShowUserMenu(false);
                        signOut();
                      }}
                      className="w-full flex items-center px-4 py-3 text-sm text-red-600 dark:text-red-400 hover:bg-red-50 dark:hover:bg-red-900/20 transition-colors duration-200"
                    >
                      <LogOut className="w-4 h-4 mr-3" />
                      Logga ut
                    </button>
                  </div>
                </div>
              </>
            )}
          </div>
        </div>
      </div>
    </header>
  );
}

export default Header;