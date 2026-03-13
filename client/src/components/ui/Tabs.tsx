import React, { useState } from 'react';
import { cn } from '@/utils/cn';

interface TabProps {
  label: string;
  children: React.ReactNode;
}

interface TabsProps {
  children: React.ReactElement<TabProps>[];
  defaultTab?: number;
}

export const Tabs: React.FC<TabsProps> = ({ children, defaultTab = 0 }) => {
  const [activeTab, setActiveTab] = useState(defaultTab);

  return (
    <div>
      <div className="flex border-b border-gray-200">
        {children.map((tab, idx) => (
          <button
            key={idx}
            onClick={() => setActiveTab(idx)}
            className={cn(
              'px-4 py-3 font-medium transition-colors border-b-2 -mb-[2px]',
              activeTab === idx
                ? 'border-blue-600 text-blue-600'
                : 'border-transparent text-gray-600 hover:text-gray-900'
            )}
          >
            {tab.props.label}
          </button>
        ))}
      </div>
      <div className="py-4">
        {children[activeTab]?.props.children}
      </div>
    </div>
  );
};

export const Tab: React.FC<TabProps> = ({ children }) => <>{children}</>;
