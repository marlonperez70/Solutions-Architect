import React from 'react';

interface AuthLayoutProps {
  children: React.ReactNode;
  title?: string;
  subtitle?: string;
}

export const AuthLayout: React.FC<AuthLayoutProps> = ({ children, title, subtitle }) => {
  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-600 to-blue-800 flex items-center justify-center p-4">
      <div className="w-full max-w-md">
        {/* Logo */}
        <div className="text-center mb-8">
          <div className="text-4xl font-bold text-white mb-2">🏢</div>
          <h1 className="text-3xl font-bold text-white">Enterprise</h1>
          <p className="text-blue-100 mt-2">Platform</p>
        </div>

        {/* Card */}
        <div className="bg-white rounded-lg shadow-xl p-8">
          {title && (
            <>
              <h2 className="text-2xl font-bold text-gray-900 mb-2">{title}</h2>
              {subtitle && <p className="text-gray-600 mb-6">{subtitle}</p>}
            </>
          )}
          {children}
        </div>

        {/* Footer */}
        <p className="text-center text-blue-100 text-sm mt-6">
          © 2026 Enterprise Platform. All rights reserved.
        </p>
      </div>
    </div>
  );
};
