'use client';

import React from 'react';
import Link from 'next/link';
import { cn } from '@/lib/utils';

export interface RadSuiteLogoProps {
  variant?: 'icon' | 'full' | 'compact';
  size?: 'sm' | 'md' | 'lg' | 'xl';
  showBadge?: boolean;
  href?: string;
  className?: string;
}

export function RadSuiteLogo({
  variant = 'full',
  size = 'md',
  showBadge = true,
  href,
  className,
}: RadSuiteLogoProps) {
  const sizeMap = {
    sm: { icon: 'w-7 h-7', text: 'text-[14px]', badge: 'text-[9px] px-1 py-0.2' },
    md: { icon: 'w-8 h-8', text: 'text-[15px]', badge: 'text-[10px] px-1.5 py-0.5' },
    lg: { icon: 'w-10 h-10', text: 'text-xl', badge: 'text-[11px] px-2 py-0.5' },
    xl: { icon: 'w-14 h-14', text: 'text-2xl', badge: 'text-xs px-2.5 py-0.5' },
  };

  const currentSize = sizeMap[size];

  const content = (
    <div className={cn('flex items-center gap-2.5 group select-none', className)}>
      {/* Icon Mark SVG */}
      <div
        className={cn(
          'relative rounded-xl overflow-hidden shrink-0 flex items-center justify-center transition-transform group-hover:scale-105 shadow-xs',
          currentSize.icon
        )}
      >
        {/* Single Source of Truth Brand Icon */}
        <img
          src="/brand/radsuite-icon.svg"
          alt="Rad Suite"
          className="w-full h-full object-contain select-none pointer-events-none"
          draggable={false}
        />
      </div>

      {/* Typography */}
      {variant !== 'icon' && (
        <div className="flex items-center gap-2">
          <span className={cn('font-bold tracking-tight text-foreground font-sans', currentSize.text)}>
            Rad <span className="text-primary">Suite</span>
          </span>
          {showBadge && (
            <span
              className={cn(
                'font-mono font-bold rounded-md bg-primary/10 text-primary border border-primary/20 uppercase tracking-wider',
                currentSize.badge
              )}
            >
              Alpha
            </span>
          )}
        </div>
      )}
    </div>
  );

  if (href) {
    return (
      <Link href={href} className="inline-flex items-center">
        {content}
      </Link>
    );
  }

  return content;
}
