import { type ClassValue, clsx } from 'clsx';
import { twMerge } from 'tailwind-merge';

/** Merge Tailwind classes safely (conditional + dedupe). */
export function cn(...inputs: ClassValue[]): string {
  return twMerge(clsx(inputs));
}
