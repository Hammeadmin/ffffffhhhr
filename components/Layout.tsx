import React, { useState, useEffect } from 'react';
import Sidebar from './Sidebar';
import Header from './Header';
import MobileBottomNav from './MobileBottomNav';
import ToastContainer from './ToastContainer';
import SearchModal from './SearchModal';
import NotificationPanel from './NotificationPanel';
import UserGuide from './UserGuide';
import KeyboardShortcuts from './KeyboardShortcuts';
import FAQ from './FAQ';
import ErrorBoundary from './ErrorBoundary';
import { useToast } from '../hooks/useToast';
import { useNotifications } from '../hooks/useNotifications';
import useKeyboardShortcuts from '../hooks/useKeyboardShortcuts';

interface LayoutProps {
  children: React.ReactNode;
}

function Layout({ children }: LayoutProps) {
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);
  const [showSearch, setShowSearch] = useState(false);
  const [showNotifications, setShowNotifications] = useState(false);
  const [showGuide, setShowGuide] = useState(false);
  const [showShortcuts, setShowShortcuts] = useState(false);
  const [showFAQ, setShowFAQ] = useState(false);
  const [theme, setTheme] = useState<'light' | 'dark'>('light');
  const { toasts, removeToast } = useToast();
  const { error: notificationError, clearError, renderToastNotifications } = useNotifications();

  // Check for saved sidebar state
  useEffect(() => {
    const savedState = localStorage.getItem('sidebarCollapsed');
    if (savedState) {
      setSidebarCollapsed(JSON.parse(savedState));
    }
  }, []);

  // Save sidebar state
  useEffect(() => {
    localStorage.setItem('sidebarCollapsed', JSON.stringify(sidebarCollapsed));
  }, [sidebarCollapsed]);

  // Keyboard shortcuts
  useKeyboardShortcuts({
    onOpenSearch: () => setShowSearch(true),
    onOpenHelp: () => setShowShortcuts(true),
    onOpenGuide: () => setShowGuide(true),
    onEscape: () => {
      setShowSearch(false);
      setShowNotifications(false);
      setShowGuide(false);
      setShowShortcuts(false);
      setShowFAQ(false);
    }
  });

  // Handle theme toggle
  const toggleTheme = () => {
    const newTheme = theme === 'light' ? 'dark' : 'light';
    setTheme(newTheme);
    localStorage.setItem('theme', newTheme);
    document.documentElement.classList.toggle('dark', newTheme === 'dark');
  };

  // Load saved theme
  useEffect(() => {
    const savedTheme = localStorage.getItem('theme') as 'light' | 'dark' || 'light';
    setTheme(savedTheme);
    document.documentElement.classList.toggle('dark', savedTheme === 'dark');
  }, []);

  // Show notification errors as toasts
  useEffect(() => {
    if (notificationError) {
      // Show error toast but don't auto-remove it
      const toastId = Math.random().toString(36).substr(2, 9);
      const errorToast = {
        id: toastId,
        type: 'error' as const,
        title: 'Notifieringsfel',
        message: notificationError,
        duration: 0 // Don't auto-remove
      };
      
      // Add to toasts manually
      setTimeout(() => {
        clearError();
        removeToast(toastId);
      }, 5000);
    }
  }, [notificationError, clearError, removeToast]);
  return (
    <div className="flex h-screen bg-gray-50 dark:bg-gray-900 overflow-hidden">
      {/* Desktop Sidebar */}
      <div className="hidden lg:block">
        <Sidebar 
          collapsed={sidebarCollapsed} 
          onToggle={() => setSidebarCollapsed(!sidebarCollapsed)} 
        />
      </div>
      
      <div className={`flex-1 flex flex-col overflow-hidden transition-all duration-300 ${
        sidebarCollapsed ? 'lg:ml-16' : 'lg:ml-64'
      }`}>
        {/* Header */}
        <Header
          onToggleSidebar={() => setSidebarCollapsed(!sidebarCollapsed)}
          onOpenSearch={() => setShowSearch(true)}
          onToggleNotifications={() => setShowNotifications(!showNotifications)}
          onToggleTheme={toggleTheme}
          theme={theme}
          showNotifications={showNotifications}
        />

        {/* Main Content */}
        <main className="flex-1 overflow-x-hidden overflow-y-auto bg-gray-50 dark:bg-gray-900">
          <ErrorBoundary>
            <div className="p-4 lg:p-6 pb-20 lg:pb-6">
              {children}
            </div>
          </ErrorBoundary>
        </main>
      </div>

      {/* Mobile Bottom Navigation */}
      <div className="lg:hidden">
        <MobileBottomNav />
      </div>

      {/* Modals and Overlays */}
      <SearchModal 
        isOpen={showSearch} 
        onClose={() => setShowSearch(false)} 
      />
      
      <NotificationPanel 
        isOpen={showNotifications} 
        onClose={() => setShowNotifications(false)} 
      />
      
      <UserGuide 
        isOpen={showGuide} 
        onClose={() => setShowGuide(false)} 
      />
      
      <KeyboardShortcuts 
        isOpen={showShortcuts} 
        onClose={() => setShowShortcuts(false)} 
      />
      
      <FAQ 
        isOpen={showFAQ} 
        onClose={() => setShowFAQ(false)} 
      />
      
      {/* Toast Container */}
      <ToastContainer toasts={toasts} onRemove={removeToast} />
      
      {/* Real-time Notification Toasts */}
      {renderToastNotifications()}
    </div>
  );
}

export default Layout;