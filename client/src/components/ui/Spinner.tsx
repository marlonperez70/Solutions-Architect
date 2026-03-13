import React from 'react';
import { cn } from '@/utils/cn';

interface SpinnerProps {
  size?: 'sm' | 'md' | 'lg';
  color?: 'blue' | 'white' | 'gray';
}

export const Spinner: React.FC<SpinnerProps> = ({ size = 'md', color = 'blue' }) => {
  return (
    <div className={cn(
      'animate-spin rounded-full border-4 border-t-transparent',
      size === 'sm' && 'w-4 h-4',
      size === 'md' && 'w-8 h-8',
      size === 'lg' && 'w-12 h-12',
      color === 'blue' && 'border-blue-600',
      color === 'white' && 'border-white',
      color === 'gray' && 'border-gray-600'
    )} />
  );
};
