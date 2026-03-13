import React from 'react';
import { cn } from '@/utils/cn';

interface BadgeProps extends React.HTMLAttributes<HTMLSpanElement> {
  variant?: 'default' | 'success' | 'warning' | 'error' | 'info';
  size?: 'sm' | 'md';
  children: React.ReactNode;
}

export const Badge = React.forwardRef<HTMLSpanElement, BadgeProps>(
  ({ variant = 'default', size = 'md', className, children, ...props }, ref) => {
    return (
      <span
        ref={ref}
        className={cn(
          'inline-flex items-center font-medium rounded-full',
          variant === 'default' && 'bg-gray-100 text-gray-800',
          variant === 'success' && 'bg-green-100 text-green-800',
          variant === 'warning' && 'bg-yellow-100 text-yellow-800',
          variant === 'error' && 'bg-red-100 text-red-800',
          variant === 'info' && 'bg-blue-100 text-blue-800',
          size === 'sm' && 'px-2.5 py-0.5 text-xs',
          size === 'md' && 'px-3 py-1 text-sm',
          className
        )}
        {...props}
      >
        {children}
      </span>
    );
  }
);

Badge.displayName = 'Badge';
