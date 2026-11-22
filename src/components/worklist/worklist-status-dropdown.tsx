'use client';

import React, { useState, useRef, useEffect } from 'react';
import { ChevronDown, Check } from 'lucide-react';

export interface WorklistStatusDropdownProps {
  value: string;
  onChange: (status: string) => void;
  className?: string;
  align?: 'left' | 'right';
}

interface StatusOption {
  id: string;
  label: string;
  shortLabel: string;
  badgeClass?: string;
}

const STATUS_OPTIONS: StatusOption[] = [
  { id: 'all', label: 'All Statuses', shortLabel: 'Status' },
  {
    id: 'scheduled',
    label: '⏳ Ready to Report',
    shortLabel: '⏳ Ready',
    badgeClass: 'border-amber-500/50 bg-amber-500/10 text-amber-600 dark:text-amber-400 font-bold',
  },
  {
    id: 'preliminary',
    label: '🎙️ Prelim (PGR Done)',
    shortLabel: '🎙️ Prelim',
    badgeClass: 'border-purple-500/50 bg-purple-500/10 text-purple-600 dark:text-purple-400 font-bold',
  },
  {
    id: 'pending',
    label: '⚠️ Pending / Hold',
    shortLabel: '⚠️ Pending',
    badgeClass: 'border-yellow-500/50 bg-yellow-500/10 text-yellow-600 dark:text-yellow-400 font-bold',
  },
  {
    id: 'submitted',
    label: '📤 Submitted (Awaiting Sign-off)',
    shortLabel: '📤 Submitted',
    badgeClass: 'border-indigo-500/50 bg-indigo-500/10 text-indigo-600 dark:text-indigo-400 font-bold',
  },
  {
    id: 'final',
    label: '✅ Published on HMIS',
    shortLabel: '✅ Published',
    badgeClass: 'border-emerald-500/50 bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 font-bold',
  },
  {
    id: 'amended',
    label: '🔄 Amended',
    shortLabel: '🔄 Amended',
    badgeClass: 'border-orange-500/50 bg-orange-500/10 text-orange-600 dark:text-orange-400 font-bold',
  },
];

export function WorklistStatusDropdown({
  value = 'all',
  onChange,
  className = '',
  align = 'left',
}: WorklistStatusDropdownProps) {
  const [isOpen, setIsOpen] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    }
    if (isOpen) {
      document.addEventListener('mousedown', handleClickOutside);
      return () => document.removeEventListener('mousedown', handleClickOutside);
    }
  }, [isOpen]);

  const activeOption = STATUS_OPTIONS.find((s) => s.id === value) || STATUS_OPTIONS[0];
  const isFiltered = value && value !== 'all';

  return (
    <div className={`relative inline-block text-xs font-sans ${className}`} ref={dropdownRef}>
      <button
        type="button"
        onClick={() => setIsOpen((prev) => !prev)}
        className={`flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg border text-xs font-medium transition-all cursor-pointer shadow-2xs select-none ${
          isFiltered && activeOption.badgeClass
            ? `${activeOption.badgeClass} ring-1 ring-primary/30`
            : isFiltered
            ? 'border-primary/60 bg-primary/10 text-primary font-bold ring-1 ring-primary/40'
            : 'border-border bg-card text-foreground hover:bg-surface-container'
        }`}
        title="Filter by case workflow status (Awaiting, Draft, In Review, Finalized)"
      >
        <span className="truncate max-w-[120px]">{activeOption.shortLabel}</span>
        <ChevronDown
          className={`w-3.5 h-3.5 text-muted-foreground transition-transform shrink-0 ${
            isOpen ? 'rotate-180' : ''
          }`}
        />
      </button>

      {isOpen && (
        <div
          className={`absolute ${
            align === 'right' ? 'right-0' : 'left-0'
          } mt-1.5 w-56 p-1.5 bg-card border border-border rounded-xl shadow-lg z-50 animate-in fade-in zoom-in-95 duration-150 text-foreground`}
        >
          {STATUS_OPTIONS.map((st) => {
            const isSelected = value === st.id;
            return (
              <button
                key={st.id}
                type="button"
                onClick={() => {
                  onChange(st.id);
                  setIsOpen(false);
                }}
                className={`w-full flex items-center justify-between px-2.5 py-1.5 rounded-lg text-xs transition-colors cursor-pointer text-left mb-0.5 last:mb-0 ${
                  isSelected
                    ? 'bg-primary text-on-primary font-bold'
                    : 'hover:bg-surface-container text-foreground'
                }`}
              >
                <span>{st.label}</span>
                {isSelected && <Check className="w-3.5 h-3.5 shrink-0" />}
              </button>
            );
          })}
        </div>
      )}
    </div>
  );
}
