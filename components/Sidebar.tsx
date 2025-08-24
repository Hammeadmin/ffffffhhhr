import React, { useState } from 'react';
import { Link, useLocation } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import {
  Home,
  Users,
  FileText,
  Package,
  Calendar,
  TrendingUp,
  Receipt,
  Users2,
  Settings,
  BarChart3,
  MessageSquare,
  ChevronLeft,
  ChevronRight,
  Building,
  ChevronDown,
  LogOut,
  User
} from 'lucide-react';

interface SidebarProps {
  collapsed: boolean;
  onToggle: () => void;
}

interface TooltipState {
  visible: boolean;
  content: string;
  top: number;
}

function Sidebar({ collapsed, onToggle }: SidebarProps) {
  const location = useLocation();
  const { signOut, user } = useAuth();
  const [showOrgSwitcher, setShowOrgSwitcher] = useState(false);

  const navigation = [
    { name: 'Dashboard', href: '/', icon: Home, shortcut: 'G+D' },
    { name: 'Ordrar', href: '/ordrar', icon: Package, shortcut: 'G+O' },
    { name: 'Kunder', href: '/kunder', icon: Users, shortcut: 'G+K' },
    { name: 'Offerter', href: '/offerter', icon: FileText, shortcut: 'G+F' },
    { name: 'Kalender', href: '/kalender', icon: Calendar, shortcut: 'G+C' },
    { name: 'Fakturor', href: '/fakturor', icon: Receipt, shortcut: 'G+I' },
    { name: 'Kommunikation', href: '/kommunikation', icon: MessageSquare, shortcut: 'G+M' },
    { name: 'Team', href: '/team', icon: Users2, shortcut: 'G+T' },
    { name: 'Analys', href: '/analys', icon: BarChart3, shortcut: 'G+A' },
    { name: 'Inställningar', href: '/installningar', icon: Settings, shortcut: 'G+S' },
  ];

  const organizations = [
    { id: '1', name: 'Momentum AB', current: true },
    { id: '2', name: 'Acme Solutions', current: false },
    { id: '3', name: 'Nordic Tech', current: false }
  ];

  const currentOrg = organizations.find(org => org.current);

  const handleSignOut = async () => {
    await signOut();
  };

  const [tooltip, setTooltip] = useState<TooltipState>({
    visible: false,
    content: '',
    top: 0,
  });

  const handleMouseEnter = (e: React.MouseEvent<HTMLDivElement>, item: any) => {
    const { top, height } = e.currentTarget.getBoundingClientRect();
    setTooltip({
      visible: true,
      // Combine name and shortcut for the content
      content: `${item.name} (${item.shortcut})`,
      // Position tooltip in the middle of the icon
      top: top + height / 2,
    });
  };

  const handleMouseLeave = () => {
    setTooltip({ visible: false, content: '', top: 0 });
  };

  return (
    <>
    <div className={`fixed left-0 top-0 h-full bg-white dark:bg-gray-800 border-r border-gray-200 dark:border-gray-700 shadow-xl z-30 transition-all duration-300 ease-in-out ${
      collapsed ? 'w-16' : 'w-64'
    }`}>
      <div className="flex flex-col h-full">
        {/* Logo and Toggle */}
        <div className="flex items-center justify-between h-16 px-4 border-b border-gray-200 dark:border-gray-700 bg-gradient-to-r from-primary-600 to-primary-700 relative overflow-hidden">
          <div className="absolute inset-0 bg-gradient-to-br from-accent-400/20 to-transparent"></div>
          
          {!collapsed && (
            <div className="flex items-center relative z-10">
              <div className="w-8 h-8 bg-white/90 backdrop-blur-sm rounded-xl flex items-center justify-center mr-3 shadow-lg">
                <TrendingUp className="w-5 h-5 text-primary-600" />
              </div>
              <h1 className="text-xl font-bold text-white font-primary tracking-tight">Momentum</h1>
            </div>
          )}
          
          <button
            onClick={onToggle}
            className="p-2 rounded-lg text-white hover:bg-white/20 transition-colors duration-200 relative z-10"
            title={collapsed ? 'Expandera sidebar' : 'Kollaps sidebar'}
          >
            {collapsed ? <ChevronRight className="w-4 h-4" /> : <ChevronLeft className="w-4 h-4" />}
          </button>
        </div>

        {/* User Profile Section */}
        <div className="p-4 border-b border-gray-200 dark:border-gray-700">
          {!collapsed ? (
            <div className="space-y-3">
              {/* Organization Switcher */}
              <div className="relative">
                <button
                  onClick={() => setShowOrgSwitcher(!showOrgSwitcher)}
                  className="w-full flex items-center justify-between p-3 bg-gray-50 dark:bg-gray-700 rounded-xl hover:bg-gray-100 dark:hover:bg-gray-600 transition-colors duration-200"
                >
                  <div className="flex items-center space-x-3">
                    <div className="w-8 h-8 bg-gradient-to-br from-blue-500 to-blue-600 rounded-lg flex items-center justify-center">
                      <Building className="w-4 h-4 text-white" />
                    </div>
                    <div className="text-left">
                      <p className="text-sm font-medium text-gray-900 dark:text-white truncate">
                        {currentOrg?.name}
                      </p>
                      <p className="text-xs text-gray-500 dark:text-gray-400">Organisation</p>
                    </div>
                  </div>
                  <ChevronDown className="w-4 h-4 text-gray-400" />
                </button>

                {/* Organization Dropdown */}
                {showOrgSwitcher && (
                  <>
                    <div 
                      className="fixed inset-0 z-10"
                      onClick={() => setShowOrgSwitcher(false)}
                    />
                    <div className="absolute top-full left-0 right-0 mt-2 bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-xl shadow-lg z-20 py-2">
                      {organizations.map((org) => (
                        <button
                          key={org.id}
                          onClick={() => {
                            setShowOrgSwitcher(false);
                            // Handle organization switch
                          }}
                          className={`w-full px-4 py-3 text-left hover:bg-gray-50 dark:hover:bg-gray-700 flex items-center space-x-3 ${
                            org.current ? 'bg-blue-50 dark:bg-blue-900/20' : ''
                          }`}
                        >
                          <div className="w-6 h-6 bg-gradient-to-br from-blue-500 to-blue-600 rounded-lg flex items-center justify-center">
                            <Building className="w-3 h-3 text-white" />
                          </div>
                          <span className="text-sm font-medium text-gray-900 dark:text-white">
                            {org.name}
                          </span>
                          {org.current && (
                            <div className="w-2 h-2 bg-green-500 rounded-full ml-auto"></div>
                          )}
                        </button>
                      ))}
                    </div>
                  </>
                )}
              </div>

              {/* User Profile */}
              <div className="flex items-center space-x-3 p-3 bg-gray-50 dark:bg-gray-700 rounded-xl">
                <div className="w-10 h-10 bg-gradient-to-br from-primary-500 to-primary-600 rounded-xl flex items-center justify-center shadow-md">
                  <User className="w-5 h-5 text-white" />
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium text-gray-900 dark:text-white truncate">
                    {user?.email?.split('@')[0] || 'Användare'}
                  </p>
                  <p className="text-xs text-gray-500 dark:text-gray-400">Online</p>
                </div>
              </div>
            </div>
          ) : (
            <div className="flex flex-col items-center space-y-3">
              <div className="w-10 h-10 bg-gradient-to-br from-blue-500 to-blue-600 rounded-xl flex items-center justify-center">
                <Building className="w-5 h-5 text-white" />
              </div>
              <div className="w-10 h-10 bg-gradient-to-br from-primary-500 to-primary-600 rounded-xl flex items-center justify-center shadow-md">
                <User className="w-5 h-5 text-white" />
              </div>
            </div>
          )}
        </div>

        {/* Navigation */}
        <nav className="flex-1 px-3 py-4 space-y-1 overflow-y-auto scrollbar-thin"
          onMouseLeave={handleMouseLeave}
          >
          
          {navigation.map((item) => {
            const isActive = location.pathname === item.href;
            const Icon = item.icon;
            
            return (
               <div
                  key={item.name}
                  className="relative group"
                  onMouseEnter={(e) => handleMouseEnter(e, item)}
                >
                  <Link
                    to={item.href}
                    className={`flex items-center py-3 ...`}
                  >
                  
                  <Icon className={`h-5 w-5 transition-colors ${
                    isActive ? 'text-white' : 'text-gray-500 dark:text-gray-400'
                  } ${collapsed ? '' : 'mr-3'}`} />
                  
                  {!collapsed && (
                    <span className="truncate">{item.name}</span>
                  )}
                  
                  {!collapsed && item.shortcut && (
                    <span className="ml-auto text-xs opacity-60 bg-white/20 px-2 py-1 rounded-md">
                      {item.shortcut}
                    </span>
                  )}
                </Link>
              </div>            
            );
          })}

          {/* =========== TEMPORARY TEST LINK =========== */}
          <div className="relative group mt-4 pt-4 border-t border-gray-200 dark:border-gray-700">
            <Link
                to="/quote-accept/qINR8Sl-5SPmMeUHwFuuQkErXqqVMLgAS-wINZO4L-o"
                className="flex items-center py-3 px-4 text-sm font-medium text-yellow-400 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors"
            >
                <FileText className="h-5 w-5 mr-3" />
                <span className="truncate">Test Quote Page</span>
            </Link>
          </div>
          {/* =========================================== */}
        </nav>

        {/* Footer */}
        {!collapsed && (
          <div className="p-4 border-t border-gray-200 dark:border-gray-700">
            <button
              onClick={handleSignOut}
              className="w-full flex items-center px-3 py-3 text-sm font-medium text-gray-700 dark:text-gray-300 hover:bg-red-50 dark:hover:bg-red-900/20 hover:text-red-600 dark:hover:text-red-400 rounded-xl transition-all duration-200"
            >
              <LogOut className="w-5 h-5 mr-3" />
              Logga ut
            </button>
          </div>
        )}

        {collapsed && (
          <div className="p-3 border-t border-gray-200 dark:border-gray-700">
            <div className="relative group">
              <button
                onClick={handleSignOut}
                className="w-full flex items-center justify-center p-3 text-gray-700 dark:text-gray-300 hover:bg-red-50 dark:hover:bg-red-900/20 hover:text-red-600 dark:hover:text-red-400 rounded-xl transition-all duration-200"
              >
                <LogOut className="w-5 h-5" />
              </button>
              
              {/* Tooltip */}
              <div className="absolute left-full ml-2 top-1/2 transform -translate-y-1/2 opacity-0 group-hover:opacity-100 transition-opacity duration-200 pointer-events-none z-50">
                <div className="bg-gray-900 dark:bg-gray-700 text-white text-sm px-3 py-2 rounded-lg shadow-lg whitespace-nowrap">
                  Logga ut
                  <div className="absolute left-0 top-1/2 transform -translate-x-1 -translate-y-1/2 w-0 h-0 border-r-4 border-r-gray-900 dark:border-r-gray-700 border-y-4 border-y-transparent"></div>
                </div>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>

    {collapsed && (
        <div
          className="fixed left-20 w-auto min-w-max transition-opacity duration-200 pointer-events-none z-[60]"
          style={{
            // Use the state to set the position and visibility
            top: `${tooltip.top}px`,
            opacity: tooltip.visible ? 1 : 0,
            // Apply a transform to vertically center it
            transform: 'translateY(-50%)',
          }}
        >
          <div className="relative bg-gray-900 text-white text-sm px-3 py-2 rounded-lg shadow-xl">
            {tooltip.content}
            <div className="absolute left-0 top-1/2 -translate-y-1/2 -translate-x-full w-0 h-0 border-t-4 border-t-transparent border-b-4 border-b-transparent border-r-4 border-r-gray-900"></div>
          </div>
        </div>
      )}
    </>
  );
}


export default Sidebar;