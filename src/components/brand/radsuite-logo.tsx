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
        <svg
          viewBox="0 0 128 128"
          className="w-full h-full"
          fill="none"
          xmlns="http://www.w3.org/2000/svg"
        >
          <rect width="128" height="128" rx="28" fill="#101419" stroke="#252b35" strokeWidth="2" />
          <circle cx="64" cy="64" r="48" stroke="#8ecf9e" strokeWidth="2" strokeDasharray="8 6" strokeOpacity="0.4" />
          <circle cx="64" cy="64" r="38" stroke="#4a7c59" strokeWidth="2.5" strokeOpacity="0.45" strokeDasharray="20 10 5 10" />
          <line x1="64" y1="16" x2="64" y2="28" stroke="#8ecf9e" strokeWidth="3" strokeLinecap="round" />
          <line x1="64" y1="100" x2="64" y2="112" stroke="#8ecf9e" strokeWidth="3" strokeLinecap="round" />
          <line x1="16" y1="64" x2="28" y2="64" stroke="#8ecf9e" strokeWidth="3" strokeLinecap="round" />
          <line x1="100" y1="64" x2="112" y2="64" stroke="#8ecf9e" strokeWidth="3" strokeLinecap="round" />
          <path d="M44 38 C44 36.3 45.3 35 47 35 H52 C53.7 35 55 36.3 55 38 V90 C55 91.7 53.7 93 52 93 H47 C45.3 93 44 91.7 44 90 Z" fill="#8ecf9e" />
          <path d="M52 35 H72 C81.9 35 90 42.2 90 51 C90 59.8 81.9 67 72 67 H54 V56 H71 C76 56 80 53.8 80 51 C80 48.2 76 46 71 46 H52 Z" fill="#8ecf9e" />
          <path d="M68 64 L86.5 89.5 C87.6 91 86.8 93 84.8 93 H74.2 C73.1 93 72.1 92.4 71.4 91.5 L56 67 H69 Z" fill="#4a7c59" />
          <circle cx="70" cy="51" r="5" fill="#ffffff" />
          <circle cx="70" cy="51" r="7.5" stroke="#8ecf9e" strokeWidth="1.5" strokeOpacity="0.8" />
        </svg>
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
