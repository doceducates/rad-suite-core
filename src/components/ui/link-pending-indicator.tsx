'use client';

import React from 'react';
import { useLinkStatus } from 'next/link';
import { cn } from '@/lib/utils';

interface LinkPendingIndicatorProps {
  children: React.ReactNode;
  pendingClassName?: string;
  spinnerClassName?: string;
  className?: string;
}

/**
 * Must be rendered as a descendant of Next.js `<Link>`.
 * Gives instant visual confirmation when a navigation link is clicked.
 */
export function LinkPendingIndicator({
  children,
  pendingClassName,
  spinnerClassName,
  className,
}: LinkPendingIndicatorProps) {
  const { pending } = useLinkStatus();

  return (
    <span className={cn('inline-flex items-center gap-1.5', pending && pendingClassName, className)}>
      {children}
      {pending && (
        <span
          aria-label="Navigating"
          className={cn(
            'inline-block w-3 h-3 border-2 border-current border-t-transparent rounded-full animate-spin shrink-0 opacity-85',
            spinnerClassName
          )}
        />
      )}
    </span>
  );
}

/**
 * Standalone pending spinner for NavItemRow slots (replaces badge or sits at trailing edge).
 */
export function LinkPendingSpinner({ className }: { className?: string }) {
  const { pending } = useLinkStatus();
  if (!pending) return null;

  return (
    <span
      aria-label="Loading route"
      className={cn(
        'inline-block w-3 h-3 border-2 border-primary border-t-transparent rounded-full animate-spin shrink-0',
        className
      )}
    />
  );
}
