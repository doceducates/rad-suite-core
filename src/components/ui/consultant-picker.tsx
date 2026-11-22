'use client';

// Layer 4 (Presentation): Reusable Canonical Consultant Picker Dropdown & Write-in
// Strict File Size Invariant: Target < 200 lines
// Design Consistency: Follows Invariants 4 & 8 using semantic theme variables

import React, { useState, useEffect, useRef } from 'react';
import { Stethoscope, ChevronDown, Check, UserPlus, X } from 'lucide-react';
import { FACULTY_CONSULTANTS, RadiologyConsultant } from '@/lib/consultants';
import { cn } from '@/lib/utils';

interface ConsultantPickerProps {
  value: string;
  onChange: (value: string, designation?: string) => void;
  placeholder?: string;
  className?: string;
  compact?: boolean;
}

const STORAGE_KEY = 'radsuite_last_consultant';

export function ConsultantPicker({
  value,
  onChange,
  placeholder = 'Select Supervising Consultant...',
  className = '',
  compact = false,
}: ConsultantPickerProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [isCustomMode, setIsCustomMode] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  // Auto-fill from localStorage on initial render if value is empty
  useEffect(() => {
    if (!value && typeof window !== 'undefined') {
      const saved = localStorage.getItem(STORAGE_KEY);
      if (saved) {
        onChange(saved);
      }
    }
  }, [value, onChange]);

  // Click outside to close
  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    }
    if (isOpen) {
      document.addEventListener('mousedown', handleClickOutside);
    }
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [isOpen]);

  const handleSelect = (consultant: RadiologyConsultant) => {
    onChange(consultant.name, consultant.designation);
    if (typeof window !== 'undefined') {
      localStorage.setItem(STORAGE_KEY, consultant.name);
    }
    setIsOpen(false);
    setIsCustomMode(false);
    setSearchQuery('');
  };

  const handleClear = (e: React.MouseEvent) => {
    e.stopPropagation();
    onChange('');
    if (typeof window !== 'undefined') {
      localStorage.removeItem(STORAGE_KEY);
    }
  };

  const filtered = FACULTY_CONSULTANTS.filter((c) => {
    if (!searchQuery.trim()) return true;
    const q = searchQuery.toLowerCase();
    return (
      c.name.toLowerCase().includes(q) ||
      c.designation.toLowerCase().includes(q) ||
      c.qualifications.toLowerCase().includes(q)
    );
  });

  return (
    <div className={cn('relative w-full', className)} ref={dropdownRef}>
      {/* Primary Display Trigger */}
      <div
        onClick={() => {
          setIsOpen((prev) => !prev);
          setTimeout(() => inputRef.current?.focus(), 50);
        }}
        className={cn(
          'flex items-center justify-between gap-1.5 px-2.5 rounded-lg border border-outline-variant/70 bg-surface-container-lowest text-on-surface cursor-pointer hover:border-primary/60 transition-colors shadow-2xs',
          compact ? 'h-7 text-[11px]' : 'h-8 text-xs'
        )}
      >
        <div className="flex items-center gap-1.5 min-w-0 flex-1">
          <Stethoscope className="w-3.5 h-3.5 text-emerald-500 shrink-0" />
          <span className="truncate font-semibold text-on-surface">
            {value || <span className="text-secondary font-normal">{placeholder}</span>}
          </span>
        </div>
        <div className="flex items-center gap-0.5 shrink-0 text-secondary">
          {value && (
            <button
              type="button"
              onClick={handleClear}
              className="p-0.5 hover:text-on-surface rounded-full transition-colors cursor-pointer"
              title="Clear consultant"
            >
              <X className="w-3 h-3" />
            </button>
          )}
          <ChevronDown className={cn('w-3.5 h-3.5 transition-transform duration-150', isOpen && 'rotate-180')} />
        </div>
      </div>

      {/* Dropdown Menu */}
      {isOpen && (
        <div className="absolute z-50 left-0 right-0 mt-1 rounded-xl border border-outline-variant/80 bg-surface-container-high/95 backdrop-blur-md shadow-xl text-xs overflow-hidden animate-in fade-in zoom-in-95 duration-100 max-h-72 flex flex-col">
          {/* Search / Manual Input Bar */}
          <div className="p-1.5 border-b border-outline-variant/40 bg-surface-container shrink-0">
            <input
              ref={inputRef}
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search doctor or type custom name..."
              className="w-full px-2 py-1 text-xs rounded-md border border-outline-variant/60 bg-surface text-on-surface placeholder:text-secondary focus:outline-none focus:ring-1 focus:ring-primary"
              onClick={(e) => e.stopPropagation()}
            />
          </div>

          {/* Quick Manual Entry Option if user types a custom name */}
          {searchQuery.trim() && (
            <div
              onClick={() => {
                const custom = searchQuery.trim();
                onChange(custom);
                if (typeof window !== 'undefined') localStorage.setItem(STORAGE_KEY, custom);
                setIsOpen(false);
                setSearchQuery('');
              }}
              className="flex items-center gap-2 px-3 py-1.5 text-primary bg-primary/10 hover:bg-primary/20 cursor-pointer border-b border-outline-variant/30 font-medium"
            >
              <UserPlus className="w-3.5 h-3.5 shrink-0" />
              <span className="truncate">Use &quot;{searchQuery.trim()}&quot; (Custom Name)</span>
            </div>
          )}

          {/* Consultants List */}
          <div className="overflow-y-auto flex-1 divide-y divide-outline-variant/20 p-1">
            {filtered.length === 0 ? (
              <div className="p-3 text-center text-secondary text-[11px]">
                No matching consultant. Press Enter or click &quot;Custom Name&quot; above to use your typed name.
              </div>
            ) : (
              filtered.map((c) => {
                const isSelected = value.toLowerCase().includes(c.name.toLowerCase());
                return (
                  <div
                    key={c.id}
                    onClick={() => handleSelect(c)}
                    className={cn(
                      'flex items-center justify-between px-2.5 py-1.5 rounded-lg cursor-pointer transition-colors',
                      isSelected
                        ? 'bg-primary/15 text-primary font-semibold'
                        : 'hover:bg-surface-container text-on-surface'
                    )}
                  >
                    <div className="min-w-0 pr-2">
                      <div className="font-semibold text-xs leading-tight">{c.name}</div>
                      <div className="text-[10px] text-secondary flex items-center gap-1.5 leading-tight mt-0.5">
                        <span className="font-medium text-emerald-600 dark:text-emerald-400">{c.designation}</span>
                        <span>•</span>
                        <span className="font-mono">{c.qualifications}</span>
                      </div>
                    </div>
                    {isSelected && <Check className="w-3.5 h-3.5 text-primary shrink-0" />}
                  </div>
                );
              })
            )}
          </div>
        </div>
      )}
    </div>
  );
}
