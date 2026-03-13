import React, { useState } from 'react';
import { cn } from '@/utils/cn';
import { useAuth } from '@/_core/hooks/useAuth';
import { useLocation, useNavigate } from 'wouter';

interface DashboardLayoutProps {
  children: React.ReactNode;
}

export const DashboardLayout: React.FC<DashboardLayoutProps> = ({ children }) => {
  const [sidebarOpen, setSidebarOpen] = useState(true);
  const { user, logout } = useAuth();
  const [, navigate] = useLocation();

  const menuItems = [
    { label: 'Dashboard', href: '/dashboard', icon: '📊' },
    { label: 'Alerts', href: '/alerts', icon: '🚨' },
    { label: 'Agents', href: '/agents', icon: '🤖' },
    { label: 'Analytics', href: '/analytics', icon: '📈' },
    { label: 'Users', href: '/users', icon: '👥' },
    { label: 'Settings', href: '/settings', icon: '⚙️' },
  ];

  return (
    <div className="flex h-screen bg-gray-50">
      {/* Sidebar */}
      <aside className={cn(
        'bg-white border-r border-gray-200 transition-all duration-300 flex flex-col',
        sidebarOpen ? 'w-64' : 'w-20'
      )}>
        {/* Logo */}
        <div className="px-6 py-4 border-b border-gray-200">
          <div className={cn(
            'font-bold text-xl transition-all duration-300',
            sidebarOpen ? 'text-lg' : 'text-center text-2xl'
          )}>
            {sidebarOpen ? '🏢 Enterprise' : '🏢'}
          </div>
        </div>

        {/* Navigation */}
        <nav className="flex-1 overflow-y-auto py-4">
          {menuItems.map(item => (
            <button
              key={item.href}
              onClick={() => navigate(item.href)}
              className={cn(
                'w-full px-6 py-3 text-left flex items-center gap-3 transition-colors duration-200',
                'hover:bg-gray-100 text-gray-700',
                'border-l-4 border-transparent hover:border-blue-600'
              )}
              title={item.label}
            >
              <span className="text-xl flex-shrink-0">{item.icon}</span>
              {sidebarOpen && <span className="text-sm font-medium">{item.label}</span>}
            </button>
          ))}
        </nav>

        {/* User Profile */}
        <div className="border-t border-gray-200 p-4">
          <button
            onClick={() => setSidebarOpen(!sidebarOpen)}
            className="w-full py-2 px-4 text-gray-600 hover:bg-gray-100 rounded-md text-sm"
          >
            {sidebarOpen ? '← Collapse' : '→'}
          </button>
        </div>
      </aside>

      {/* Main Content */}
      <div className="flex-1 flex flex-col">
        {/* Header */}
        <header className="bg-white border-b border-gray-200 px-6 py-4 flex justify-between items-center">
          <h1 className="text-2xl font-bold text-gray-900">Enterprise Platform</h1>
          <div className="flex items-center gap-4">
            <span className="text-sm text-gray-600">{user?.name}</span>
            <button
              onClick={logout}
              className="px-4 py-2 text-sm font-medium text-white bg-red-600 rounded-md hover:bg-red-700 transition-colors"
            >
              Logout
            </button>
          </div>
        </header>

        {/* Content */}
        <main className="flex-1 overflow-y-auto p-6">
          {children}
        </main>
      </div>
    </div>
  );
};
