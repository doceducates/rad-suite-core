'use client';

import React, { useCallback } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { cn } from '@/lib/utils';
import { NavItemDef } from './nav-items';
import { LinkPendingSpinner } from '@/components/ui/link-pending-indicator';

const prefetchedRoutes = new Map<string, number>();
const PREFETCH_COOLDOWN_MS = 60_000;

interface NavItemRowProps {
  item: NavItemDef;
  isActive: boolean;
  collapsed: boolean;
}

export function NavItemRow({ item, isActive, collapsed }: NavItemRowProps) {
  const Icon = item.icon;
  const router = useRouter();

  const handleHoverPrefetch = useCallback(() => {
    const now = Date.now();
    const last = prefetchedRoutes.get(item.href) || 0;
    if (now - last < PREFETCH_COOLDOWN_MS) return;
    prefetchedRoutes.set(item.href, now);
    router.prefetch(item.href);
  }, [item.href, router]);

  if (collapsed) {
    return (
      <div className="relative flex justify-center group my-0.5">
        <Link
          href={item.href}
          prefetch={false}
          onMouseEnter={handleHoverPrefetch}
          onFocus={handleHoverPrefetch}
          aria-label={item.label}
          className={cn(
            'w-10 h-10 rounded-xl flex items-center justify-center transition-all cursor-pointer relative active:scale-95',
            isActive
              ? 'bg-primary/15 text-primary font-semibold shadow-2xs border border-primary/30'
              : 'text-on-surface-variant hover:text-on-surface hover:bg-surface-container'
          )}
        >
          {isActive && (
            <span className="absolute left-0 top-1/2 -translate-y-1/2 w-1 h-5 bg-primary rounded-r-full shadow-xs" />
          )}
          <Icon className={cn('w-4 h-4 shrink-0 transition-colors', isActive ? 'text-primary' : 'text-secondary group-hover:text-primary')} />
          <LinkPendingSpinner className="absolute bottom-1 right-1 w-2.5 h-2.5" />
          {item.badge && (
            <span className="absolute top-1.5 right-1.5 w-2 h-2 rounded-full bg-primary ring-2 ring-surface-container-low" />
          )}
        </Link>

        {/* Floating Clinical Tooltip for Collapsed State */}
        <div className="absolute left-full ml-3 top-1/2 -translate-y-1/2 px-2.5 py-1.5 rounded-lg bg-surface-container-high border border-outline-variant/80 text-on-surface text-xs font-medium whitespace-nowrap shadow-md pointer-events-none opacity-0 group-hover:opacity-100 transition-opacity duration-150 z-50 flex items-center gap-2">
          <span>{item.label}</span>
          {item.shortcut && (
            <span className="font-mono text-[10px] px-1.5 py-0.5 rounded bg-surface-container text-secondary border border-outline-variant/40">
              ⌥{item.shortcut}
            </span>
          )}
          {item.badge && (
            <span className="text-[10px] px-1.5 py-0.2 rounded bg-primary/20 text-primary font-mono font-semibold">
              {item.badge}
            </span>
          )}
        </div>
      </div>
    );
  }

  return (
    <Link
      href={item.href}
      prefetch={false}
      onMouseEnter={handleHoverPrefetch}
      onFocus={handleHoverPrefetch}
      className={cn(
        'flex items-center justify-between px-3 py-2 rounded-xl text-sm font-medium transition-all group my-0.5 relative active:scale-[0.98]',
        isActive
          ? 'bg-primary/15 text-primary border border-primary/30 font-semibold shadow-2xs'
          : 'text-on-surface-variant hover:text-on-surface hover:bg-surface-container'
      )}
    >
      {isActive && (
        <span className="absolute left-0 top-1/2 -translate-y-1/2 w-1 h-5 bg-primary rounded-r-full shadow-xs" />
      )}
      <div className="flex items-center gap-3 min-w-0">
        <Icon className={cn('w-4 h-4 shrink-0 transition-colors', isActive ? 'text-primary' : 'text-secondary group-hover:text-primary')} />
        <span className="truncate text-[13px]">{item.label}</span>
      </div>

      <div className="flex items-center gap-1.5 shrink-0 ml-2">
        <LinkPendingSpinner />
        {item.badge && (
          <span className={cn(
            'text-[10px] px-1.5 py-0.5 rounded font-mono font-semibold',
            isActive ? 'bg-primary/20 text-primary' : 'bg-surface-container text-secondary'
          )}>
            {item.badge}
          </span>
        )}
      </div>
    </Link>
  );
}
