'use client';

import React from 'react';
import Link from 'next/link';
import { cn } from '@/lib/utils';
import type { PluginSlotContribution } from '@/lib/plugins/plugin-types';
import {
  Puzzle,
  Send,
  Building2,
  Sparkles,
  Layers,
  Bot,
  Activity,
  FileText,
  BookOpen,
  Radio,
  Cpu,
  Server,
  HardDrive,
  type LucideIcon,
} from 'lucide-react';

const ICON_MAP: Record<string, LucideIcon> = {
  Send,
  Building2,
  Sparkles,
  Layers,
  Bot,
  Activity,
  FileText,
  BookOpen,
  Radio,
  Cpu,
  Server,
  HardDrive,
  Puzzle,
};

interface PluginSidebarItemProps {
  contribution: PluginSlotContribution;
  collapsed: boolean;
  pathname: string;
}

export function PluginSidebarItem({
  contribution,
  collapsed,
  pathname,
}: PluginSidebarItemProps) {
  const Icon = (contribution.icon && ICON_MAP[contribution.icon]) || Puzzle;
  const href = contribution.actionUrl || '#';
  const isActive = pathname === href || (href !== '/' && pathname.startsWith(href));

  if (collapsed) {
    return (
      <div className="relative flex justify-center group my-0.5">
        <Link
          href={href}
          aria-label={contribution.title}
          className={cn(
            'w-10 h-10 rounded-xl flex items-center justify-center transition-all cursor-pointer relative',
            isActive
              ? 'bg-primary/15 text-primary font-semibold shadow-2xs border border-primary/30'
              : 'text-on-surface-variant hover:text-on-surface hover:bg-surface-container'
          )}
        >
          {isActive && (
            <span className="absolute left-0 top-1/2 -translate-y-1/2 w-1 h-5 bg-primary rounded-r-full shadow-xs" />
          )}
          <Icon className={cn('w-4 h-4 shrink-0 transition-colors', isActive ? 'text-primary' : 'text-secondary group-hover:text-primary')} />
          <span className="absolute top-1.5 right-1.5 w-2 h-2 rounded-full bg-emerald-500 ring-2 ring-surface-container-low" />
        </Link>

        {/* Floating Tooltip */}
        <div className="absolute left-full ml-3 top-1/2 -translate-y-1/2 px-2.5 py-1.5 rounded-lg bg-surface-container-high border border-outline-variant/80 text-on-surface text-xs font-medium whitespace-nowrap shadow-md pointer-events-none opacity-0 group-hover:opacity-100 transition-opacity duration-150 z-50 flex items-center gap-2">
          <span>{contribution.title}</span>
          <span className="text-[9px] font-mono px-1 py-0.2 rounded bg-primary/20 text-primary uppercase">
            Plugin
          </span>
        </div>
      </div>
    );
  }

  return (
    <Link
      href={href}
      className={cn(
        'flex items-center justify-between px-3 py-2 rounded-xl text-sm font-medium transition-all group my-0.5 relative',
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
        <span className="truncate text-[13px]">{contribution.title}</span>
      </div>

      <div className="flex items-center gap-1.5 shrink-0 ml-2">
        <span className="text-[9px] font-mono px-1.5 py-0.5 rounded bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border border-emerald-500/20 uppercase font-semibold">
          Plugin
        </span>
      </div>
    </Link>
  );
}
