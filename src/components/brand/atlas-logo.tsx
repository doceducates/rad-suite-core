'use client';

import React from 'react';
import Link from 'next/link';
import { cn } from '@/lib/utils';

export interface AtlasLogoProps {
  variant?: 'icon' | 'full' | 'compact';
  size?: 'sm' | 'md' | 'lg' | 'xl';
  showBadge?: boolean;
  href?: string;
  className?: string;
}

export function AtlasLogo({
  variant = 'full',
  size = 'md',
  showBadge = true,
  href,
  className,
}: AtlasLogoProps) {
  const sizeMap = {
    sm: { icon: 'w-7 h-7', text: 'text-[14px]', badge: 'text-[9px] px-1 py-0.2' },
    md: { icon: 'w-8 h-8', text: 'text-[15px]', badge: 'text-[10px] px-1.5 py-0.5' },
    lg: { icon: 'w-10 h-10', text: 'text-xl', badge: 'text-[11px] px-2 py-0.5' },
    xl: { icon: 'w-14 h-14', text: 'text-2xl', badge: 'text-xs px-2.5 py-0.5' },
  };

  const currentSize = sizeMap[size];

  const content = (
    <div className={cn('flex items-center gap-2.5 group select-none', className)}>
      {/* Icon Mark: Anatomical Multi-Planar Layers & Cross-Section Pin */}
      <div
        className={cn(
          'relative rounded-xl overflow-hidden shrink-0 flex items-center justify-center transition-transform group-hover:scale-105 shadow-xs bg-linear-to-br from-emerald-500/20 via-teal-500/10 to-sky-500/20 border border-emerald-500/30',
          currentSize.icon
        )}
      >
        <svg
          viewBox="0 0 128 128"
          className="w-full h-full p-1.5"
          fill="none"
          xmlns="http://www.w3.org/2000/svg"
        >
          {/* Outer Cross-Section Ring */}
          <circle cx="64" cy="64" r="54" stroke="currentColor" strokeWidth="3" className="text-emerald-500/40" strokeDasharray="6 4" />
          {/* Middle Axial Anatomical Boundary */}
          <circle cx="64" cy="64" r="40" stroke="currentColor" strokeWidth="2.5" className="text-teal-400" />
          {/* Scout Crosshairs */}
          <line x1="64" y1="12" x2="64" y2="116" stroke="currentColor" strokeWidth="2" className="text-emerald-500/30" />
          <line x1="12" y1="64" x2="116" y2="64" stroke="currentColor" strokeWidth="2" className="text-emerald-500/30" />
          {/* Core Anatomical Kernel */}
          <path
            d="M64 36 C48 36 38 48 38 64 C38 80 48 92 64 92 C80 92 90 80 90 64 C90 48 80 36 64 36 Z"
            fill="currentColor"
            className="text-emerald-500/15"
            stroke="currentColor"
            strokeWidth="2"
          />
          {/* Target Precision Pin */}
          <circle cx="64" cy="64" r="7" fill="#10b981" />
          <circle cx="64" cy="64" r="13" stroke="#10b981" strokeWidth="2" strokeDasharray="4 2" />
        </svg>
      </div>

      {/* Typography */}
      {variant !== 'icon' && (
        <div className="flex items-center gap-2">
          <span className={cn('font-bold tracking-tight text-foreground font-sans', currentSize.text)}>
            DocEducates <span className="text-emerald-500 dark:text-emerald-400 font-black">Atlas</span>
          </span>
          {showBadge && (
            <span
              className={cn(
                'font-mono font-bold rounded-md bg-emerald-500/15 text-emerald-600 dark:text-emerald-400 border border-emerald-500/30 uppercase tracking-wider',
                currentSize.badge
              )}
            >
              Academy
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
