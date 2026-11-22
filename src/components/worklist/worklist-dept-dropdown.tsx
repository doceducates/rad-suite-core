'use client';

import React, { useState, useRef, useEffect } from 'react';
import { ChevronDown, Check } from 'lucide-react';

export interface WorklistDeptDropdownProps {
  value: string;
  onChange: (dept: 'all' | 'er' | 'opd' | 'ward') => void;
  className?: string;
  align?: 'left' | 'right';
}

const DEPT_OPTIONS = [
  { id: 'all', label: 'All Departments', shortLabel: 'Dept', icon: '🏥' },
  { id: 'er', label: 'Emergency (ER)', shortLabel: 'ER', icon: '🚨', isUrgent: true },
  { id: 'opd', label: 'Outpatient (OPD)', shortLabel: 'OPD', icon: '🏥' },
  { id: 'ward', label: 'Inpatient (Ward)', shortLabel: 'Ward', icon: '🛏️' },
] as const;

export function WorklistDeptDropdown({
  value = 'all',
  onChange,
  className = '',
  align = 'left',
}: WorklistDeptDropdownProps) {
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

  const activeOption = DEPT_OPTIONS.find((d) => d.id === value) || DEPT_OPTIONS[0];
  const isFiltered = value && value !== 'all';
  const isErActive = value === 'er';

  return (
    <div className={`relative inline-block text-xs font-sans ${className}`} ref={dropdownRef}>
      <button
        type="button"
        onClick={() => setIsOpen((prev) => !prev)}
        className={`flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg border text-xs font-medium transition-all cursor-pointer shadow-2xs select-none ${
          isErActive
            ? 'border-rose-500/60 bg-rose-500/15 text-rose-600 dark:text-rose-400 font-bold ring-1 ring-rose-500/40'
            : isFiltered
            ? 'border-primary/60 bg-primary/10 text-primary font-bold ring-1 ring-primary/40'
            : 'border-border bg-card text-foreground hover:bg-surface-container'
        }`}
        title="Filter by hospital department (ER, OPD, Inpatient Ward)"
      >
        <span className="shrink-0">{activeOption.icon}</span>
        <span className="truncate max-w-[110px]">{activeOption.shortLabel}</span>
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
          } mt-1.5 w-52 p-1.5 bg-card border border-border rounded-xl shadow-lg z-50 animate-in fade-in zoom-in-95 duration-150 text-foreground`}
        >
          {DEPT_OPTIONS.map((dept) => {
            const isSelected = value === dept.id;
            return (
              <button
                key={dept.id}
                type="button"
                onClick={() => {
                  onChange(dept.id);
                  setIsOpen(false);
                }}
                className={`w-full flex items-center justify-between px-2.5 py-1.5 rounded-lg text-xs transition-colors cursor-pointer text-left mb-0.5 last:mb-0 ${
                  isSelected
                    ? dept.id === 'er'
                      ? 'bg-rose-600 text-white font-bold'
                      : 'bg-primary text-on-primary font-bold'
                    : dept.id === 'er'
                    ? 'hover:bg-rose-500/10 text-rose-600 dark:text-rose-400 font-medium'
                    : 'hover:bg-surface-container text-foreground'
                }`}
              >
                <div className="flex items-center gap-2">
                  <span>{dept.icon}</span>
                  <span>{dept.label}</span>
                </div>
                {isSelected && <Check className="w-3.5 h-3.5 shrink-0" />}
              </button>
            );
          })}
        </div>
      )}
    </div>
  );
}
