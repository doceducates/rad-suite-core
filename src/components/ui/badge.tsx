import * as React from 'react';
import { cn } from '@/lib/utils';

export interface BadgeProps extends React.HTMLAttributes<HTMLSpanElement> {
  variant?: 'default' | 'outline' | 'success' | 'warning' | 'danger' | 'info';
}

export function Badge({ className, variant = 'default', ...props }: BadgeProps) {
  const variants = {
    default: 'bg-surface-container-high text-on-surface border-outline-variant/60',
    outline: 'bg-transparent text-secondary border-outline-variant',
    success: 'bg-primary/15 text-primary border-primary/30',
    warning: 'bg-tertiary-container/30 text-tertiary border-tertiary/40',
    danger: 'bg-error-container/30 text-error border-error/40',
    info: 'bg-primary/10 text-primary border-primary/20',
  };

  return (
    <span
      className={cn(
        'inline-flex items-center px-2 py-0.5 rounded-md text-xs font-medium border transition-colors',
        variants[variant],
        className
      )}
      {...props}
    />
  );
}
