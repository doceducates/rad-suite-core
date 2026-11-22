'use client';

// Layer 4 (Presentation): Reusable Workflow Status Action Dropdown Menu
// Strict File Size Invariant: Target < 250 lines, max 350 lines

import React from 'react';
import { DropdownMenu, type DropdownMenuItem } from '@/components/ui/dropdown-menu';
import { ChevronDown, Tag } from 'lucide-react';
import { cn } from '@/lib/utils';

export interface WorklistStatusActionMenuProps {
  value?: string;
  onChange: (status: string) => void;
  direction?: 'auto' | 'up' | 'down';
  align?: 'auto' | 'left' | 'right' | 'center';
  disabled?: boolean;
  triggerMode?: 'badge' | 'button';
  placeholder?: string;
  className?: string;
}

export function getStatusBadgeClass(status?: string) {
  switch (status) {
    case 'scheduled':
      return 'border-amber-500/50 bg-amber-500/10 text-amber-600 dark:text-amber-400';
    case 'pending':
      return 'border-yellow-500/50 bg-yellow-500/10 text-yellow-600 dark:text-yellow-400';
    case 'draft':
      return 'border-blue-500/50 bg-blue-500/10 text-blue-600 dark:text-blue-400';
    case 'preliminary':
      return 'border-purple-500/50 bg-purple-500/10 text-purple-600 dark:text-purple-400';
    case 'submitted':
      return 'border-indigo-500/50 bg-indigo-500/10 text-indigo-600 dark:text-indigo-400';
    case 'final':
      return 'border-emerald-500/50 bg-emerald-500/10 text-emerald-600 dark:text-emerald-400';
    case 'amended':
      return 'border-orange-500/50 bg-orange-500/10 text-orange-600 dark:text-orange-400';
    default:
      return 'border-outline-variant bg-surface-container text-secondary';
  }
}

export const WORKFLOW_STATUS_CONFIG = [
  { id: 'scheduled', label: 'Ready', icon: '⏳', sublabel: 'Ready for PGR review & reporting' },
  { id: 'preliminary', label: 'Prelim', icon: '🎙️', sublabel: 'PGR provisional findings drafted' },
  { id: 'pending', label: 'Pending', icon: '⚠️', sublabel: 'On hold: history, blur, or repeats' },
  { id: 'submitted', label: 'Submitted', icon: '📤', sublabel: 'Submitted on HMIS, awaiting consultant' },
  { id: 'final', label: 'Published', icon: '✅', sublabel: 'Consultant signed off on HMIS' },
  { id: 'amended', label: 'Amended', icon: '🔄', sublabel: 'Addendum or revision issued' },
];

export function WorklistStatusActionMenu({
  value,
  onChange,
  direction = 'auto',
  align = 'auto',
  disabled = false,
  triggerMode = 'badge',
  placeholder = 'Status...',
  className,
}: WorklistStatusActionMenuProps) {
  const currentConfig = WORKFLOW_STATUS_CONFIG.find((c) => c.id === value);

  const items: DropdownMenuItem[] = WORKFLOW_STATUS_CONFIG.map((cfg) => ({
    id: cfg.id,
    label: `${cfg.icon} ${cfg.label}`,
    sublabel: cfg.sublabel,
    active: cfg.id === value,
  }));

  const trigger =
    triggerMode === 'badge' ? (
      <button
        type="button"
        disabled={disabled}
        className={cn(
          'inline-flex items-center gap-1 text-[11px] font-semibold rounded px-2 py-0.5 border cursor-pointer select-none transition-colors shadow-2xs hover:opacity-90',
          getStatusBadgeClass(value),
          disabled && 'opacity-50 cursor-not-allowed pointer-events-none',
          className
        )}
        title="Change study reporting status"
      >
        <span>
          {currentConfig ? `${currentConfig.icon} ${currentConfig.label}` : placeholder}
        </span>
        <ChevronDown className="w-3 h-3 opacity-60 ml-0.5" />
      </button>
    ) : (
      <button
        type="button"
        disabled={disabled}
        className={cn(
          'inline-flex items-center gap-1.5 h-7.5 sm:h-8 px-2 sm:px-2.5 rounded-lg border border-outline-variant/60 bg-surface-container hover:bg-surface-container-high text-xs font-medium text-on-surface cursor-pointer select-none transition-all shadow-2xs',
          disabled && 'opacity-50 cursor-not-allowed pointer-events-none',
          className
        )}
        title="Change status for all selected cases"
      >
        <Tag className="w-3.5 h-3.5 text-secondary shrink-0" />
        <span>{placeholder}</span>
        <ChevronDown className="w-3 h-3 text-secondary/60 ml-0.5" />
      </button>
    );

  return (
    <DropdownMenu
      trigger={trigger}
      items={items}
      onSelect={onChange}
      direction={direction}
      align={align}
      header="Set Workflow Status"
      disabled={disabled}
    />
  );
}
