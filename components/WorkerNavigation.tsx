import React from 'react';
import { Link, useLocation } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import {
  Home,
  Calendar,
  Clock,
  User,
  LogOut,
  TrendingUp
} from 'lucide-react';

interface WorkerNavigationProps {
  collapsed: boolean;
  onToggle: () => void;
}

function WorkerNavigation({ collapsed, onToggle }: WorkerNavigationProps) {
  const location = useLocation();
  const { signOut, user } = useAuth();

  const navigation = [
    { name: 'Dashboard', href: '/worker-dashboard', icon: Home },
    { name: 'Mitt Schema', href: '/worker-schedule', icon: Calendar },
    { name: 'Tidrapport', href: '/worker-timesheet', icon: Clock },
    { name: 'Min Profil', href: '/installningar', icon: User }
  ];

  const handleSignOut = async () => {
    await signOut();
  };

  return (
    <div className={`fixed left-0 top-0 h-full bg-white border-r border-gray-200 shadow-xl z-30 transition-all duration-300 ease-in-out ${
      collapsed ? 'w-16' : 'w-64'
    }`}>
      <div className="flex flex-col h-full">
        {/* Logo */}
        <div className="flex items-center justify-center h-16 px-4 border-b border-gray-200 bg-gradient-to-r from-blue-600 to-blue-700">
          {!collapsed && (
            <div className="flex items-center">
              <div className="w-8 h-8 bg-white/90 rounded-xl flex items-center justify-center mr-3">
                <TrendingUp className="w-5 h-5 text-blue-600" />
              </div>
              <h1 className="text-xl font-bold text-white">Momentum</h1>
            </div>
          )}
          {collapsed && (
            <div className="w-8 h-8 bg-white/90 rounded-xl flex items-center justify-center">
              <TrendingUp className="w-5 h-5 text-blue-600" />
            </div>
          )}
        </div>

        {/* User Info */}
        {!collapsed && (
          <div className="p-4 border-b border-gray-200">
            <div className="flex items-center space-x-3 p-3 bg-blue-50 rounded-xl">
              <div className="w-10 h-10 bg-blue-600 rounded-xl flex items-center justify-center">
                <User className="w-5 h-5 text-white" />
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-sm font-medium text-gray-900 truncate">
                  {user?.email?.split('@')[0] || 'Medarbetare'}
                </p>
                <p className="text-xs text-blue-600">Arbetare</p>
              </div>
            </div>
          </div>
        )}

        {/* Navigation */}
        <nav className="flex-1 px-3 py-4 space-y-1">
          {navigation.map((item) => {
            const isActive = location.pathname === item.href;
            const Icon = item.icon;
            
            return (
              <Link
                key={item.name}
                to={item.href}
                className={`flex items-center px-4 py-3 text-sm font-medium rounded-lg transition-all duration-200 ${
                  isActive
                    ? 'bg-blue-600 text-white shadow-md'
                    : 'text-gray-700 hover:bg-gray-100 hover:text-gray-900'
                }`}
              >
                <Icon className={`h-5 w-5 ${collapsed ? '' : 'mr-3'}`} />
                {!collapsed && <span>{item.name}</span>}
              </Link>
            );
          })}
        </nav>

        {/* Sign Out */}
        <div className="p-3 border-t border-gray-200">
          <button
            onClick={handleSignOut}
            className={`w-full flex items-center px-4 py-3 text-sm font-medium text-gray-700 hover:bg-red-50 hover:text-red-600 rounded-lg transition-all duration-200 ${
              collapsed ? 'justify-center' : ''
            }`}
          >
            <LogOut className={`w-5 h-5 ${collapsed ? '' : 'mr-3'}`} />
            {!collapsed && <span>Logga ut</span>}
          </button>
        </div>
      </div>
    </div>
  );
}

export default WorkerNavigation;