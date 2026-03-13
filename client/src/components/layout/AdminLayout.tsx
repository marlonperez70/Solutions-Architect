import React from 'react';
import { DashboardLayout } from './DashboardLayout';

interface AdminLayoutProps {
  children: React.ReactNode;
}

export const AdminLayout: React.FC<AdminLayoutProps> = ({ children }) => {
  return (
    <DashboardLayout>
      <div className="max-w-7xl mx-auto">
        {children}
      </div>
    </DashboardLayout>
  );
};
