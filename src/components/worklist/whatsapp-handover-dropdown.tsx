'use client';

// Layer 4 (Presentation): Responsive WhatsApp Handover Format & Fields Dropdown
// Strict File Size Invariant: Target < 200 lines

import React, { useState, useRef, useEffect } from 'react';
import { SlidersHorizontal, ChevronDown, Sparkles, RotateCcw, Check } from 'lucide-react';
import { cn } from '@/lib/utils';
import {
  HandoverFieldsConfig,
  DEFAULT_HANDOVER_FIELDS,
  SIMPLE_HANDOVER_FIELDS,
  FIELD_DEFINITIONS,
  FieldItemDef,
} from '@/lib/whatsapp-handover-fields';

export interface WhatsappHandoverDropdownProps {
  fields: HandoverFieldsConfig;
  onChange: (fields: HandoverFieldsConfig) => void;
  className?: string;
}

export function WhatsappHandoverDropdown({
  fields,
  onChange,
  className,
}: WhatsappHandoverDropdownProps) {
  const [isOpen, setIsOpen] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);

  // Close on outside click or Escape
  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    }
    function handleKeyDown(event: KeyboardEvent) {
      if (event.key === 'Escape') setIsOpen(false);
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

  const activeCount = FIELD_DEFINITIONS.filter((f) => Boolean(fields[f.key])).length;
  const totalCount = FIELD_DEFINITIONS.length;

  const handleToggle = (key: keyof HandoverFieldsConfig) => {
    onChange({ ...fields, [key]: !fields[key] });
  };

  const handleToggleAll = (enabled: boolean) => {
    const updated = { ...fields };
    FIELD_DEFINITIONS.forEach((f) => {
      updated[f.key] = enabled;
    });
    onChange(updated);
  };

  const renderGroup = (groupKey: FieldItemDef['group'], title: string, isFirst = false) => {
    const items = FIELD_DEFINITIONS.filter((f) => f.group === groupKey);
    return (
      <div key={groupKey}>
        <div className={cn('text-[9px] font-bold text-secondary uppercase tracking-wider px-1.5 mb-0.5', !isFirst && 'border-t border-outline-variant/30 pt-1.5')}>
          {title}
        </div>
        <div className="space-y-0.5">
          {items.map((item) => {
            const isChecked = Boolean(fields[item.key]);
            return (
              <label
                key={item.key}
                className={cn(
                  'flex items-start gap-2 px-2 py-1 rounded-lg cursor-pointer select-none transition-colors group',
                  isChecked ? 'hover:bg-primary/10' : 'hover:bg-surface-container opacity-70'
                )}
              >
                <input
                  type="checkbox"
                  checked={isChecked}
                  onChange={() => handleToggle(item.key)}
                  className="mt-0.5 rounded border-outline-variant text-primary focus:ring-primary h-3.5 w-3.5 cursor-pointer shrink-0"
                />
                <div className="flex flex-col min-w-0">
                  <span className={cn('text-xs font-semibold leading-snug', isChecked ? 'text-on-surface' : 'text-secondary')}>
                    {item.label}
                  </span>
                  {item.description && (
                    <span className="text-[10px] text-secondary/70 leading-tight">
                      {item.description}
                    </span>
                  )}
                </div>
              </label>
            );
          })}
        </div>
      </div>
    );
  };

  return (
    <div className={cn('relative inline-block text-xs', className)} ref={dropdownRef}>
      {/* Trigger Button */}
      <button
        type="button"
        onClick={() => setIsOpen((prev) => !prev)}
        aria-expanded={isOpen}
        className={cn(
          'inline-flex items-center gap-1.5 h-8 px-2.5 rounded-lg border text-xs font-semibold transition-all cursor-pointer shadow-2xs select-none',
          isOpen
            ? 'border-primary/50 bg-primary/10 text-primary ring-1 ring-primary/40'
            : 'border-outline-variant/60 bg-surface-container hover:bg-surface-container-high text-on-surface'
        )}
        title="Customize fields and information included in WhatsApp handover"
      >
        <SlidersHorizontal className="w-3.5 h-3.5 text-primary shrink-0" />
        <span>Fields & Format</span>
        <span className="px-1.5 py-0.5 rounded-full text-[10px] font-mono font-bold bg-primary/15 text-primary">
          {activeCount}/{totalCount}
        </span>
        <ChevronDown
          className={cn('w-3.5 h-3.5 text-secondary transition-transform duration-150', isOpen && 'rotate-180')}
        />
      </button>

      {/* Responsive Popover Checklist */}
      {isOpen && (
        <div
          className="absolute left-0 mt-1.5 w-76 sm:w-84 max-w-[calc(100vw-3rem)] p-2.5 bg-card/98 backdrop-blur-xl border border-outline-variant/80 rounded-2xl shadow-2xl z-50 text-on-surface animate-in fade-in zoom-in-95 duration-150 flex flex-col max-h-[380px]"
          onClick={(e) => e.stopPropagation()}
        >
          {/* Popover Header & Fast Actions */}
          <div className="pb-2 mb-1.5 border-b border-outline-variant/40 shrink-0">
            <div className="flex items-center justify-between mb-1.5">
              <span className="text-[11px] font-bold text-on-surface uppercase tracking-wider">
                Included Information
              </span>
              <span className="text-[10px] font-mono text-secondary">
                {activeCount} active
              </span>
            </div>

            <div className="flex items-center gap-1 flex-wrap">
              <button
                type="button"
                onClick={() => handleToggleAll(true)}
                disabled={activeCount === totalCount}
                className="px-2 py-0.5 rounded text-[10px] font-medium border border-outline-variant/50 hover:bg-surface-container cursor-pointer disabled:opacity-40 disabled:cursor-default"
              >
                Select All
              </button>
              <button
                type="button"
                onClick={() => handleToggleAll(false)}
                disabled={activeCount === 0}
                className="px-2 py-0.5 rounded text-[10px] font-medium border border-outline-variant/50 hover:bg-surface-container cursor-pointer disabled:opacity-40 disabled:cursor-default"
              >
                Clear All
              </button>
              <div className="w-px h-3 bg-outline-variant/50 mx-0.5" />
              <button
                type="button"
                onClick={() => onChange(SIMPLE_HANDOVER_FIELDS)}
                className="px-2 py-0.5 rounded text-[10px] font-semibold bg-emerald-500/15 text-emerald-600 dark:text-emerald-400 hover:bg-emerald-500/25 cursor-pointer flex items-center gap-1"
                title="Minimal: Consultant, Date, Resident, Patient Name, Accession, Status only"
              >
                <Sparkles className="w-2.5 h-2.5" />
                Simple
              </button>
              <button
                type="button"
                onClick={() => onChange(DEFAULT_HANDOVER_FIELDS)}
                className="px-2 py-0.5 rounded text-[10px] font-semibold bg-primary/15 text-primary hover:bg-primary/25 cursor-pointer flex items-center gap-1"
                title="Reset to Full standard template"
              >
                <RotateCcw className="w-2.5 h-2.5" />
                Full
              </button>
            </div>
          </div>

          {/* Scrollable Checklist */}
          <div className="overflow-y-auto flex-1 pr-1 space-y-2.5">
            {renderGroup('header', 'Header & Overview', true)}
            {renderGroup('case', 'Per-Case Information')}
            {renderGroup('footer', 'Footer & Notes')}
          </div>

          {/* Popover Footer with Persistence Status */}
          <div className="pt-2 mt-1.5 border-t border-outline-variant/40 shrink-0 flex items-center justify-between text-[10px]">
            <span className="flex items-center gap-1 text-emerald-600 dark:text-emerald-400 font-semibold">
              <Check className="w-3 h-3 text-emerald-500" /> Auto-saved for all classes
            </span>
            <span className="font-mono text-secondary">{activeCount}/{totalCount} active</span>
          </div>
        </div>
      )}
    </div>
  );
}
