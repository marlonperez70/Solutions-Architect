import { clsx, type ClassValue } from 'clsx';
import { twMerge } from 'tailwind-merge';

/**
 * Merge Tailwind CSS classes with clsx
 * Handles conflicts by giving Tailwind classes priority
 */
export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}
