'use client';

import { ArrowUpRight } from 'lucide-react';
import { cn } from '@/lib/utils';

type Variant = 'warning' | 'success' | 'error' | 'neutral';

const styles: Record<Variant, { wrap: string; chip: string; text: string }> = {
  warning: {
    wrap: 'bg-amber-50 dark:bg-amber-500/10',
    chip: 'bg-amber-100 text-amber-700 dark:bg-amber-500/20 dark:text-amber-300',
    text: 'text-amber-700 dark:text-amber-300',
  },
  success: {
    wrap: 'bg-emerald-50 dark:bg-emerald-500/10',
    chip: 'bg-emerald-100 text-emerald-700 dark:bg-emerald-500/20 dark:text-emerald-300',
    text: 'text-emerald-700 dark:text-emerald-300',
  },
  error: {
    wrap: 'bg-rose-50 dark:bg-rose-500/10',
    chip: 'bg-rose-100 text-rose-700 dark:bg-rose-500/20 dark:text-rose-300',
    text: 'text-rose-700 dark:text-rose-300',
  },
  neutral: {
    wrap: 'bg-surface-2',
    chip: 'bg-surface text-muted',
    text: 'text-muted',
  },
};

/** Pill status badge — label chip + message, optional trailing arrow. */
export function StatusBadge({
  variant = 'neutral',
  label,
  children,
  withArrow = true,
  className,
}: {
  variant?: Variant;
  label: string;
  children: React.ReactNode;
  withArrow?: boolean;
  className?: string;
}) {
  const s = styles[variant];
  return (
    <span
      className={cn(
        'inline-flex items-center gap-2 rounded-full py-1 pl-1 pr-3 text-sm font-medium',
        s.wrap,
        className,
      )}
    >
      <span className={cn('rounded-full px-2.5 py-0.5 text-xs font-semibold', s.chip)}>
        {label}
      </span>
      <span className={cn('inline-flex items-center gap-1', s.text)}>
        {children}
        {withArrow && <ArrowUpRight className="h-3.5 w-3.5" />}
      </span>
    </span>
  );
}
