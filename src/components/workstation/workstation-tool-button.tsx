'use client';

import React from 'react';
import { cn } from '@/lib/utils';

export interface WorkstationToolButtonProps {
  onClick?: () => void;
  isActive?: boolean;
  icon: React.ComponentType<{ className?: string }>;
  label: string;
  badge?: string;
  collapsed: boolean;
}

export function WorkstationToolButton({
  onClick,
  isActive,
  icon: Icon,
  label,
  badge,
  collapsed,
}: WorkstationToolButtonProps) {
  return (
    <div className="relative group">
      <button
        type="button"
        onClick={onClick}
        aria-label={label}
        className={cn(
          'w-full flex items-center rounded-xl text-sm font-medium transition-all cursor-pointer relative',
          collapsed ? 'justify-center h-10 w-10 mx-auto' : 'justify-between px-3 py-2',
          isActive
            ? 'bg-primary/20 text-primary border border-primary/40 font-semibold shadow-xs'
            : 'text-on-surface-variant hover:text-on-surface hover:bg-surface-container'
        )}
      >
        {isActive && (
          <span className="absolute left-0 top-1/2 -translate-y-1/2 w-1 h-5 bg-primary rounded-r-full shadow-xs" />
        )}
        <div className="flex items-center gap-3 min-w-0">
          <Icon className={cn('w-4 h-4 shrink-0', isActive ? 'text-primary' : 'text-secondary')} />
          {!collapsed && <span className="truncate text-[13px]">{label}</span>}
        </div>
        {!collapsed && badge && (
          <span className={cn(
            'text-[10px] px-1.5 py-0.5 rounded font-mono font-semibold',
            isActive ? 'bg-primary/20 text-primary' : 'bg-surface-container text-secondary'
          )}>
            {badge}
          </span>
        )}
      </button>
      {collapsed && (
        <div className="absolute left-full ml-3 top-1/2 -translate-y-1/2 px-2.5 py-1.5 rounded-lg bg-surface-container-high border border-outline-variant/80 text-on-surface text-xs font-medium whitespace-nowrap shadow-md pointer-events-none opacity-0 group-hover:opacity-100 transition-opacity duration-150 z-50 flex items-center gap-2">
          <span>{label}</span>
          {badge && (
            <span className="text-[10px] px-1.5 py-0.2 rounded bg-primary/20 text-primary font-mono">{badge}</span>
          )}
        </div>
      )}
    </div>
  );
}
