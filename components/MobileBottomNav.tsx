import React from 'react';
import { Link, useLocation } from 'react-router-dom';
import {
  Home,
  Package,
  Users,
  Calendar,
  Plus,
  FileText,
  Briefcase,
  Receipt,
  Users2,
  Settings,
  BarChart3,
  MessageSquare,
  X
} from 'lucide-react';

function MobileBottomNav() {
  const location = useLocation();

  const navigation = [
    { name: 'Dashboard', href: '/', icon: Home },
    { name: 'Ordrar', href: '/ordrar', icon: Package },
    { name: 'Kunder', href: '/kunder', icon: Users },
    { name: 'Kalender', href: '/kalender', icon: Calendar }
  ];

  const quickActions = [
    { name: 'Ny Order', href: '/ordrar?action=create', icon: Package, color: 'from-blue-500 to-blue-600' },
    { name: 'Ny Kund', href: '/kunder?action=create', icon: Users, color: 'from-green-500 to-green-600' },
    { name: 'Ny Offert', href: '/offerter?action=create', icon: FileText, color: 'from-purple-500 to-purple-600' },
    { name: 'Boka Möte', href: '/kalender?action=create', icon: Calendar, color: 'from-orange-500 to-orange-600' }
  ];

  const allPages = [
    { name: 'Dashboard', href: '/', icon: Home },
    { name: 'Ordrar', href: '/ordrar', icon: Package },
    { name: 'Kunder', href: '/kunder', icon: Users },
    { name: 'Offerter', href: '/offerter', icon: FileText },
    { name: 'Kalender', href: '/kalender', icon: Calendar },
    { name: 'Fakturor', href: '/fakturor', icon: Receipt },
    { name: 'Team', href: '/team', icon: Users2 },
    { name: 'Kommunikation', href: '/kommunikation', icon: MessageSquare },
    { name: 'Analys', href: '/analys', icon: BarChart3 },
    { name: 'Inställningar', href: '/installningar', icon: Settings }
  ];

  const [showQuickActions, setShowQuickActions] = React.useState(false);
  const [showAllPages, setShowAllPages] = React.useState(false);

  return (
    <>
      {/* Quick Actions Overlay */}
      {showQuickActions && (
        <div className="fixed inset-0 bg-black bg-opacity-50 z-40 lg:hidden" onClick={() => setShowQuickActions(false)}>
          <div className="absolute bottom-20 left-1/2 transform -translate-x-1/2 space-y-3" onClick={(e) => e.stopPropagation()}>
            <div className="text-center mb-4">
              <span className="bg-white dark:bg-gray-800 text-gray-700 dark:text-gray-300 px-3 py-1 rounded-full text-sm font-medium shadow-lg">
                Snabbåtgärder
              </span>
            </div>
            {quickActions.map((action, index) => {
              const Icon = action.icon;
              return (
                <div
                  key={action.href}
                  className="flex items-center space-x-3"
                  style={{
                    animationDelay: `${index * 50}ms`,
                    animation: 'slideUp 0.3s ease-out forwards'
                  }}
                >
                  <div className="bg-white dark:bg-gray-800 rounded-lg px-3 py-2 shadow-lg">
                    <span className="text-sm font-medium text-gray-700 dark:text-gray-300 whitespace-nowrap">
                      {action.name}
                    </span>
                  </div>
                  <Link
                    to={action.href}
                    onClick={() => setShowQuickActions(false)}
                    className={`flex items-center justify-center w-14 h-14 bg-gradient-to-r ${action.color} rounded-full shadow-lg hover:shadow-xl transition-all duration-300 transform hover:scale-110`}
                  >
                    <Icon className="w-6 h-6 text-white" />
                  </Link>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* All Pages Navigation Overlay */}
      {showAllPages && (
        <div className="fixed inset-0 bg-black bg-opacity-50 z-40 lg:hidden" onClick={() => setShowAllPages(false)}>
          <div className="absolute bottom-20 left-4 right-4" onClick={(e) => e.stopPropagation()}>
            <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-2xl border border-gray-200 dark:border-gray-700 overflow-hidden">
              <div className="p-4 border-b border-gray-200 dark:border-gray-700 bg-gradient-to-r from-primary-500 to-primary-600">
                <div className="flex items-center justify-between">
                  <h3 className="text-lg font-semibold text-white">Navigation</h3>
                  <button
                    onClick={() => setShowAllPages(false)}
                    className="text-white hover:bg-white/20 rounded-lg p-1 transition-colors"
                  >
                    <X className="w-5 h-5" />
                  </button>
                </div>
              </div>
              <div className="grid grid-cols-2 gap-2 p-4 max-h-80 overflow-y-auto">
                {allPages.map((page) => {
                  const Icon = page.icon;
                  const isActive = location.pathname === page.href;
                  return (
                    <Link
                      key={page.href}
                      to={page.href}
                      onClick={() => setShowAllPages(false)}
                      className={`flex items-center space-x-3 p-3 rounded-xl transition-all duration-200 ${
                        isActive
                          ? 'bg-primary-100 dark:bg-primary-900/30 text-primary-700 dark:text-primary-300'
                          : 'hover:bg-gray-100 dark:hover:bg-gray-700 text-gray-700 dark:text-gray-300'
                      }`}
                    >
                      <div className={`w-10 h-10 rounded-lg flex items-center justify-center ${
                        isActive 
                          ? 'bg-primary-200 dark:bg-primary-800' 
                          : 'bg-gray-100 dark:bg-gray-600'
                      }`}>
                        <Icon className="w-5 h-5" />
                      </div>
                      <span className="font-medium text-sm">{page.name}</span>
                    </Link>
                  );
                })}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Bottom Navigation Bar */}
      <div className="fixed bottom-0 left-0 right-0 bg-white dark:bg-gray-800 border-t border-gray-200 dark:border-gray-700 z-30 lg:hidden">
        <div className="grid grid-cols-6 h-16">
          {navigation.map((item) => {
            const isActive = location.pathname === item.href;
            const Icon = item.icon;
            
            return (
              <Link
                key={item.name}
                to={item.href}
                className={`flex flex-col items-center justify-center space-y-1 transition-all duration-200 ${
                  isActive
                    ? 'text-primary-600 dark:text-primary-400'
                    : 'text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-300'
                }`}
              >
                <div className={`p-1 rounded-lg transition-all duration-200 ${
                  isActive ? 'bg-primary-100 dark:bg-primary-900/30' : ''
                }`}>
                  <Icon className="w-5 h-5" />
                </div>
                <span className="text-xs font-medium">{item.name}</span>
                
                {/* Active indicator */}
                {isActive && (
                  <div className="absolute top-0 left-1/2 transform -translate-x-1/2 w-8 h-1 bg-primary-600 dark:bg-primary-400 rounded-b-full"></div>
                )}
              </Link>
            );
          })}

          {/* All Pages Button */}
          <button
            onClick={() => setShowAllPages(!showAllPages)}
            className="flex flex-col items-center justify-center space-y-1 transition-all duration-200 text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-300"
          >
            <div className="p-1 rounded-lg transition-all duration-200">
              <Settings className="w-5 h-5" />
            </div>
            <span className="text-xs font-medium">Mer</span>
          </button>

          {/* Floating Action Button */}
          <button
            onClick={() => setShowQuickActions(!showQuickActions)}
            className={`flex flex-col items-center justify-center transition-all duration-300 relative ${
              showQuickActions ? 'transform rotate-45' : ''
            }`}
          >
            <div className="w-12 h-12 bg-gradient-to-r from-primary-500 to-primary-600 rounded-full flex items-center justify-center shadow-lg hover:shadow-xl transition-all duration-300 hover:scale-110">
              <Plus className="w-6 h-6 text-white" />
            </div>
            <span className="text-xs font-medium text-gray-500 dark:text-gray-400 mt-1">Skapa</span>
          </button>
        </div>
      </div>

      <style jsx>{`
        @keyframes slideUp {
          from {
            opacity: 0;
            transform: translateY(20px) scale(0.8);
          }
          to {
            opacity: 1;
            transform: translateY(0) scale(1);
          }
        }
      `}</style>
    </>
  );
}

export default MobileBottomNav;