'use client';

// Layer 4 (Presentation): Worklist More Filters Dropdown with Submenus (<200 lines)
import React, { useState, useRef, useEffect } from 'react';
import {
  SlidersHorizontal,
  ArrowDownUp,
  User,
  HardDrive,
  AlertTriangle,
  ChevronDown,
  RotateCcw,
} from 'lucide-react';
import type { AdvancedFilterValues } from './worklist-advanced-drawer';
import {
  SORT_OPTIONS,
  GENDER_OPTIONS,
  SOURCE_OPTIONS,
} from './worklist-more-dropdown-options';
import { WorklistMoreSubmenuItem } from './worklist-more-submenu-item';

export interface WorklistMoreDropdownProps {
  filters: AdvancedFilterValues;
  onChange: (patch: Partial<AdvancedFilterValues>) => void;
  className?: string;
  align?: 'left' | 'right';
}

export function WorklistMoreDropdown({
  filters,
  onChange,
  className = '',
  align = 'right',
}: WorklistMoreDropdownProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [openSubmenu, setOpenSubmenu] = useState<'sort' | 'gender' | 'source' | null>(null);
  const dropdownRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setIsOpen(false);
        setOpenSubmenu(null);
      }
    }
    function handleKeyDown(event: KeyboardEvent) {
      if (event.key === 'Escape') {
        setIsOpen(false);
        setOpenSubmenu(null);
      }
    }
    if (isOpen) {
      document.addEventListener('mousedown', handleClickOutside);
      document.addEventListener('keydown', handleKeyDown);
      return () => {
        document.removeEventListener('mousedown', handleClickOutside);
        document.removeEventListener('keydown', handleKeyDown);
      };
    }
  }, [isOpen]);

  let activeAdvCount = 0;
  if (filters.gender !== 'all') activeAdvCount++;
  if (filters.source !== 'all') activeAdvCount++;
  if (filters.sortBy !== 'date_desc') activeAdvCount++;
  if (filters.criticalOnly) activeAdvCount++;

  const currentSort = SORT_OPTIONS.find((s) => s.id === filters.sortBy) || SORT_OPTIONS[0];
  const currentGender = GENDER_OPTIONS.find((g) => g.id === filters.gender) || GENDER_OPTIONS[0];
  const currentSource = SOURCE_OPTIONS.find((src) => src.id === filters.source) || SOURCE_OPTIONS[0];

  const handleReset = () => {
    onChange({
      gender: 'all',
      source: 'all',
      sortBy: 'date_desc',
      criticalOnly: false,
    });
    setOpenSubmenu(null);
  };

  return (
    <div className={`relative inline-block text-xs font-sans ${className}`} ref={dropdownRef}>
      {/* Trigger Button */}
      <button
        type="button"
        onClick={() => {
          setIsOpen((prev) => !prev);
          if (isOpen) setOpenSubmenu(null);
        }}
        className={`h-8 inline-flex items-center gap-1.5 px-2.5 rounded-lg border text-xs font-semibold transition-all cursor-pointer shadow-2xs select-none ${
          isOpen || activeAdvCount > 0
            ? 'border-primary text-primary bg-primary/10 font-bold ring-1 ring-primary/40'
            : 'border-border bg-card text-muted-foreground hover:text-foreground hover:bg-surface-container'
        }`}
        title="More filters: sort order, patient gender, source archive, and clinical safety"
        aria-expanded={isOpen}
      >
        <SlidersHorizontal className="w-3.5 h-3.5" />
        <span className="hidden md:inline">More</span>
        {activeAdvCount > 0 ? (
          <span className="w-4 h-4 rounded-full bg-primary text-on-primary text-[10px] flex items-center justify-center font-bold">
            {activeAdvCount}
          </span>
        ) : (
          <ChevronDown
            className={`w-3 h-3 opacity-60 transition-transform ${isOpen ? 'rotate-180' : ''}`}
          />
        )}
      </button>

      {/* Popover Dropdown Menu */}
      {isOpen && (
        <div
          onClick={(e) => e.stopPropagation()}
          className={`absolute ${
            align === 'right' ? 'right-0' : 'left-0'
          } mt-1.5 w-64 p-1.5 bg-surface-container-highest/98 backdrop-blur-xl border border-outline-variant/80 rounded-xl shadow-2xl z-50 animate-in fade-in zoom-in-95 duration-100 text-on-surface`}
        >
          {/* Header */}
          <div className="px-2.5 py-1 text-[10px] font-semibold text-secondary uppercase tracking-wider border-b border-outline-variant/40 mb-1 flex items-center justify-between">
            <span>More Filters</span>
            {activeAdvCount > 0 && (
              <span className="text-[9px] font-mono font-bold text-primary">
                {activeAdvCount} Active
              </span>
            )}
          </div>

          <div className="flex flex-col gap-0.5">
            {/* 1. Sort Order Submenu */}
            <WorklistMoreSubmenuItem
              label="Sort Order"
              icon={<ArrowDownUp className="w-3.5 h-3.5 text-primary" />}
              isOpen={openSubmenu === 'sort'}
              onToggle={() => setOpenSubmenu((prev) => (prev === 'sort' ? null : 'sort'))}
              selectedOption={currentSort}
              options={SORT_OPTIONS}
              selectedValue={filters.sortBy}
              onSelect={(id) => {
                onChange({ sortBy: id });
                setOpenSubmenu(null);
              }}
              isCustomActive={filters.sortBy !== 'date_desc'}
            />

            {/* 2. Gender Submenu */}
            <WorklistMoreSubmenuItem
              label="Gender"
              icon={<User className="w-3.5 h-3.5 text-primary" />}
              isOpen={openSubmenu === 'gender'}
              onToggle={() => setOpenSubmenu((prev) => (prev === 'gender' ? null : 'gender'))}
              selectedOption={currentGender}
              options={GENDER_OPTIONS}
              selectedValue={filters.gender}
              onSelect={(id) => {
                onChange({ gender: id });
                setOpenSubmenu(null);
              }}
              isCustomActive={filters.gender !== 'all'}
            />

            {/* 3. Archive Source Submenu */}
            <WorklistMoreSubmenuItem
              label="Archive Source"
              icon={<HardDrive className="w-3.5 h-3.5 text-primary" />}
              isOpen={openSubmenu === 'source'}
              onToggle={() => setOpenSubmenu((prev) => (prev === 'source' ? null : 'source'))}
              selectedOption={currentSource}
              options={SOURCE_OPTIONS}
              selectedValue={filters.source}
              onSelect={(id) => {
                onChange({ source: id });
                setOpenSubmenu(null);
              }}
              isCustomActive={filters.source !== 'all'}
            />

            {/* 4. Critical Findings Toggle */}
            <button
              type="button"
              onClick={() => onChange({ criticalOnly: !filters.criticalOnly })}
              className={`w-full flex items-center justify-between px-2.5 py-1.5 rounded-lg text-xs font-medium transition-colors cursor-pointer select-none ${
                filters.criticalOnly
                  ? 'bg-rose-500/15 text-rose-600 dark:text-rose-400 font-bold'
                  : 'hover:bg-surface-container text-on-surface'
              }`}
            >
              <div className="flex items-center gap-2">
                <AlertTriangle className="w-3.5 h-3.5 text-rose-500 shrink-0" />
                <span>Critical Findings</span>
              </div>
              <input
                type="checkbox"
                checked={Boolean(filters.criticalOnly)}
                onChange={() => {}}
                className="rounded border-outline-variant text-rose-500 focus:ring-rose-500 h-3.5 w-3.5 pointer-events-none"
              />
            </button>
          </div>

          {/* 5. Reset Action */}
          {activeAdvCount > 0 && (
            <div className="pt-1.5 mt-1 border-t border-outline-variant/40">
              <button
                type="button"
                onClick={handleReset}
                className="w-full flex items-center justify-center gap-1.5 py-1 px-2 rounded-lg text-[11px] text-secondary hover:text-on-surface hover:bg-surface-container cursor-pointer transition-colors"
              >
                <RotateCcw className="w-3 h-3" />
                <span>Reset More Filters</span>
              </button>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
