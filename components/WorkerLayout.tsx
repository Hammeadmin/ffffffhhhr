import React, { useState } from 'react';
import WorkerNavigation from './WorkerNavigation';
import ToastContainer from './ToastContainer';
import { useToast } from '../hooks/useToast';

interface WorkerLayoutProps {
  children: React.ReactNode;
}

function WorkerLayout({ children }: WorkerLayoutProps) {
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);
  const { toasts, removeToast } = useToast();

  return (
    <div className="flex h-screen bg-gray-50 overflow-hidden">
      {/* Worker Sidebar */}
      <WorkerNavigation 
        collapsed={sidebarCollapsed} 
        onToggle={() => setSidebarCollapsed(!sidebarCollapsed)} 
      />
      
      {/* Main Content */}
      <div className={`flex-1 flex flex-col overflow-hidden transition-all duration-300 ${
        sidebarCollapsed ? 'ml-16' : 'ml-64'
      }`}>
        <main className="flex-1 overflow-x-hidden overflow-y-auto">
          {children}
        </main>
      </div>

      {/* Toast Container */}
      <ToastContainer toasts={toasts} onRemove={removeToast} />
    </div>
  );
}

export default WorkerLayout;