'use client';

// Layer 4 (Presentation): WhatsApp Reporting Class Date Picker with Fast Presets
// Strict File Size Invariant: Target < 150 lines

import React, { useState, useRef, useEffect } from 'react';
import { Calendar, ChevronDown } from 'lucide-react';
import { cn } from '@/lib/utils';
import { CalendarPicker } from '@/components/ui/calendar-picker';

export interface WhatsappClassDatePickerProps {
  value: string; // YYYY-MM-DD
  onChange: (date: string) => void;
  className?: string;
}

export function formatHumanClassDate(isoDate: string): string {
  if (!isoDate) return 'Select Date';
  try {
    const parts = isoDate.split('-');
    if (parts.length === 3) {
      const d = new Date(parseInt(parts[0], 10), parseInt(parts[1], 10) - 1, parseInt(parts[2], 10));
      if (!isNaN(d.getTime())) {
        return d.toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' });
      }
    }
  } catch {}
  return isoDate;
}

export function WhatsappClassDatePicker({
  value,
  onChange,
  className,
}: WhatsappClassDatePickerProps) {
  const [isOpen, setIsOpen] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);

  // Close on outside click or Escape
  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (containerRef.current && !containerRef.current.contains(event.target as Node)) {
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

  const displayLabel = formatHumanClassDate(value);

  // Quick check if date is today or yesterday
  const now = new Date();
  const todayStr = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-${String(now.getDate()).padStart(2, '0')}`;
  const y = new Date();
  y.setDate(y.getDate() - 1);
  const yesterdayStr = `${y.getFullYear()}-${String(y.getMonth() + 1).padStart(2, '0')}-${String(y.getDate()).padStart(2, '0')}`;

  const isToday = value === todayStr;
  const isYesterday = value === yesterdayStr;

  return (
    <div className={cn('relative inline-block w-full', className)} ref={containerRef}>
      <button
        type="button"
        onClick={() => setIsOpen((prev) => !prev)}
        aria-expanded={isOpen}
        className={cn(
          'w-full flex items-center justify-between gap-1.5 h-8 px-2.5 rounded-lg border text-xs font-medium transition-all cursor-pointer shadow-2xs select-none bg-surface text-on-surface',
          isOpen
            ? 'border-primary ring-1 ring-primary/40 bg-primary/5'
            : 'border-outline-variant/60 hover:border-outline-variant'
        )}
        title="Pick reporting class session date"
      >
        <div className="flex items-center gap-1.5 min-w-0">
          <Calendar className="w-3.5 h-3.5 text-primary shrink-0" />
          <span className="truncate font-semibold">{displayLabel}</span>
          {isToday && (
            <span className="text-[9px] font-mono px-1 rounded bg-primary/15 text-primary shrink-0">
              Today
            </span>
          )}
          {isYesterday && (
            <span className="text-[9px] font-mono px-1 rounded bg-amber-500/15 text-amber-600 dark:text-amber-400 shrink-0">
              Yesterday
            </span>
          )}
        </div>
        <ChevronDown
          className={cn('w-3.5 h-3.5 text-secondary shrink-0 transition-transform duration-150', isOpen && 'rotate-180')}
        />
      </button>

      {isOpen && (
        <div
          className="absolute right-0 mt-1.5 z-50 animate-in fade-in zoom-in-95 duration-100"
          onClick={(e) => e.stopPropagation()}
        >
          <CalendarPicker
            mode="single"
            selectedDate={value}
            onSelectDate={(newDate) => {
              if (newDate) {
                onChange(newDate);
                setIsOpen(false);
              }
            }}
            showPresets={true}
          />
        </div>
      )}
    </div>
  );
}
