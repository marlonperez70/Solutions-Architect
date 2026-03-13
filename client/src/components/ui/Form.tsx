import React from 'react';
import { cn } from '@/utils/cn';

interface FormProps extends React.FormHTMLAttributes<HTMLFormElement> {
  children: React.ReactNode;
}

export const Form: React.FC<FormProps> = ({ children, className, ...props }) => (
  <form className={cn('space-y-4', className)} {...props}>
    {children}
  </form>
);

interface FormGroupProps {
  children: React.ReactNode;
}

export const FormGroup: React.FC<FormGroupProps> = ({ children }) => (
  <div className="space-y-2">
    {children}
  </div>
);

interface FormLabelProps extends React.LabelHTMLAttributes<HTMLLabelElement> {
  required?: boolean;
  children: React.ReactNode;
}

export const FormLabel: React.FC<FormLabelProps> = ({ required, children, className, ...props }) => (
  <label className={cn('block text-sm font-medium text-gray-700', className)} {...props}>
    {children}
    {required && <span className="text-red-500 ml-1">*</span>}
  </label>
);

interface FormErrorProps {
  children: React.ReactNode;
}

export const FormError: React.FC<FormErrorProps> = ({ children }) => (
  <p className="text-red-500 text-sm mt-1">{children}</p>
);
