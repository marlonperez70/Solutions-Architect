import React from 'react';
import { cn } from '@/utils/cn';

interface AlertProps extends React.HTMLAttributes<HTMLDivElement> {
  variant?: 'info' | 'success' | 'warning' | 'error';
  title?: string;
  children: React.ReactNode;
  onClose?: () => void;
}

export const Alert = React.forwardRef<HTMLDivElement, AlertProps>(
  ({ variant = 'info', title, children, onClose, className, ...props }, ref) => {
    return (
      <div
        ref={ref}
        className={cn(
          'rounded-md p-4 border',
          variant === 'info' && 'bg-blue-50 border-blue-200 text-blue-800',
          variant === 'success' && 'bg-green-50 border-green-200 text-green-800',
          variant === 'warning' && 'bg-yellow-50 border-yellow-200 text-yellow-800',
          variant === 'error' && 'bg-red-50 border-red-200 text-red-800',
          className
        )}
        {...props}
      >
        <div className="flex justify-between items-start">
          <div>
            {title && <h3 className="font-semibold mb-1">{title}</h3>}
            <div className="text-sm">{children}</div>
          </div>
          {onClose && (
            <button
              onClick={onClose}
              className="text-current opacity-50 hover:opacity-100 transition-opacity"
              aria-label="Close alert"
            >
              ✕
            </button>
          )}
        </div>
      </div>
    );
  }
);

Alert.displayName = 'Alert';
