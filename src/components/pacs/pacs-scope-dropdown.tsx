'use client';

import React, { useState, useRef, useEffect } from 'react';
import { ChevronDown, Check } from 'lucide-react';

export type PacsSearchFieldScope = 'all' | 'accession' | 'mrn' | 'name' | 'description';

export interface PacsScopeDropdownProps {
  value: PacsSearchFieldScope;
  onChange: (scope: PacsSearchFieldScope) => void;
  className?: string;
  align?: 'left' | 'right';
}

const SCOPE_OPTIONS: { id: PacsSearchFieldScope; label: string; shortLabel: string; icon: string }[] = [
  { id: 'all', label: 'All Fields', shortLabel: 'Scope: All', icon: '🎯' },
  { id: 'accession', label: 'Accession Number', shortLabel: 'Accession', icon: '🏷️' },
  { id: 'mrn', label: 'Patient MRN', shortLabel: 'MRN', icon: '🪪' },
  { id: 'name', label: 'Patient Name', shortLabel: 'Name', icon: '👤' },
  { id: 'description', label: 'Study Description', shortLabel: 'Description', icon: '📝' },
];

export function PacsScopeDropdown({
  value = 'all',
  onChange,
  className = '',
  align = 'left',
}: PacsScopeDropdownProps) {
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

  const activeOption = SCOPE_OPTIONS.find((s) => s.id === value) || SCOPE_OPTIONS[0];
  const isFiltered = value && value !== 'all';

  return (
    <div className={`relative inline-block text-xs font-sans ${className}`} ref={dropdownRef}>
      <button
        type="button"
        onClick={() => setIsOpen((prev) => !prev)}
        className={`flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg border text-xs font-medium transition-all cursor-pointer shadow-2xs select-none ${
          isFiltered
            ? 'border-primary/60 bg-primary/10 text-primary font-bold ring-1 ring-primary/40'
            : 'border-border bg-card text-foreground hover:bg-surface-container'
        }`}
        title="Restrict search to specific field"
      >
        <span className="shrink-0">{activeOption.icon}</span>
        <span className="truncate max-w-[100px]">{activeOption.shortLabel}</span>
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
          } mt-1.5 w-48 p-1.5 bg-card border border-border rounded-xl shadow-lg z-50 animate-in fade-in zoom-in-95 duration-150 text-foreground`}
        >
          {SCOPE_OPTIONS.map((opt) => {
            const isSelected = opt.id === value || (opt.id === 'all' && (!value || value === 'all'));
            return (
              <button
                key={opt.id}
                type="button"
                onClick={() => {
                  onChange(opt.id);
                  setIsOpen(false);
                }}
                className={`w-full flex items-center justify-between px-2.5 py-1.5 rounded-lg text-xs transition-colors cursor-pointer text-left mb-0.5 last:mb-0 ${
                  isSelected
                    ? 'bg-primary text-on-primary font-bold'
                    : 'hover:bg-surface-container text-foreground'
                }`}
              >
                <div className="flex items-center gap-2">
                  <span>{opt.icon}</span>
                  <span>{opt.label}</span>
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
