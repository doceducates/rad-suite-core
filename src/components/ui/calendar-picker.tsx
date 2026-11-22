'use client';

// Layer 4 (Presentation): Canonical Smart Calendar Date & Range Picker
// Strict File Size Invariant: Target < 250 lines, max 350 lines

import React, { useState } from 'react';
import { ChevronLeft, ChevronRight, RotateCcw } from 'lucide-react';
import { cn } from '@/lib/utils';

export interface CalendarPickerProps {
  mode?: 'single' | 'range';
  selectedDate?: string; // YYYY-MM-DD
  fromDate?: string;     // YYYY-MM-DD
  toDate?: string;       // YYYY-MM-DD
  onSelectDate?: (date: string) => void;
  onSelectRange?: (from?: string, to?: string) => void;
  className?: string;
  showPresets?: boolean;
}

const MONTH_NAMES = [
  'January', 'February', 'March', 'April', 'May', 'June',
  'July', 'August', 'September', 'October', 'November', 'December'
];

const WEEKDAY_NAMES = ['Su', 'Mo', 'Tu', 'We', 'Th', 'Fr', 'Sa'];

function formatDateIso(year: number, month: number, day: number): string {
  const m = String(month + 1).padStart(2, '0');
  const d = String(day).padStart(2, '0');
  return `${year}-${m}-${d}`;
}

export function CalendarPicker({
  mode = 'range',
  selectedDate,
  fromDate,
  toDate,
  onSelectDate,
  onSelectRange,
  className,
  showPresets = true,
}: CalendarPickerProps) {
  const initialDate = fromDate ? new Date(fromDate) : selectedDate ? new Date(selectedDate) : new Date();
  const [currentYear, setCurrentYear] = useState(initialDate.getFullYear() || new Date().getFullYear());
  const [currentMonth, setCurrentMonth] = useState(initialDate.getMonth() || new Date().getMonth());

  const todayIso = formatDateIso(new Date().getFullYear(), new Date().getMonth(), new Date().getDate());

  const handlePrevMonth = () => {
    if (currentMonth === 0) {
      setCurrentMonth(11);
      setCurrentYear((prev) => prev - 1);
    } else {
      setCurrentMonth((prev) => prev - 1);
    }
  };

  const handleNextMonth = () => {
    if (currentMonth === 11) {
      setCurrentMonth(0);
      setCurrentYear((prev) => prev + 1);
    } else {
      setCurrentMonth((prev) => prev + 1);
    }
  };

  const daysInMonth = new Date(currentYear, currentMonth + 1, 0).getDate();
  const firstDayWeekday = new Date(currentYear, currentMonth, 1).getDay();

  const handleDayClick = (day: number) => {
    const clickedIso = formatDateIso(currentYear, currentMonth, day);

    if (mode === 'single') {
      onSelectDate?.(clickedIso);
      return;
    }

    // Range mode
    if (!fromDate || (fromDate && toDate)) {
      onSelectRange?.(clickedIso, undefined);
    } else if (fromDate && !toDate) {
      if (clickedIso < fromDate) {
        onSelectRange?.(clickedIso, fromDate);
      } else {
        onSelectRange?.(fromDate, clickedIso);
      }
    }
  };

  const handlePreset = (preset: 'today' | 'yesterday' | '7d' | '30d') => {
    const now = new Date();
    const todayStr = formatDateIso(now.getFullYear(), now.getMonth(), now.getDate());

    if (preset === 'today') {
      if (mode === 'single') onSelectDate?.(todayStr);
      else onSelectRange?.(todayStr, todayStr);
    } else if (preset === 'yesterday') {
      const y = new Date();
      y.setDate(y.getDate() - 1);
      const yStr = formatDateIso(y.getFullYear(), y.getMonth(), y.getDate());
      if (mode === 'single') onSelectDate?.(yStr);
      else onSelectRange?.(yStr, yStr);
    } else if (preset === '7d') {
      const d7 = new Date();
      d7.setDate(d7.getDate() - 6);
      const d7Str = formatDateIso(d7.getFullYear(), d7.getMonth(), d7.getDate());
      onSelectRange?.(d7Str, todayStr);
    } else if (preset === '30d') {
      const d30 = new Date();
      d30.setDate(d30.getDate() - 29);
      const d30Str = formatDateIso(d30.getFullYear(), d30.getMonth(), d30.getDate());
      onSelectRange?.(d30Str, todayStr);
    }
  };

  return (
    <div className={cn('p-3 bg-surface-container-highest/98 backdrop-blur-xl border border-outline-variant/80 rounded-2xl shadow-xl text-on-surface text-xs font-sans w-72 select-none', className)}>
      {/* Month & Year Navigation */}
      <div className="flex items-center justify-between mb-2.5 px-1">
        <span className="font-bold text-sm text-on-surface tracking-tight">
          {MONTH_NAMES[currentMonth]} {currentYear}
        </span>
        <div className="flex items-center gap-1">
          <button
            type="button"
            onClick={handlePrevMonth}
            className="p-1 rounded-md text-secondary hover:text-on-surface hover:bg-surface-container transition-colors cursor-pointer"
            title="Previous month"
          >
            <ChevronLeft className="w-4 h-4" />
          </button>
          <button
            type="button"
            onClick={handleNextMonth}
            className="p-1 rounded-md text-secondary hover:text-on-surface hover:bg-surface-container transition-colors cursor-pointer"
            title="Next month"
          >
            <ChevronRight className="w-4 h-4" />
          </button>
        </div>
      </div>

      {/* Weekday Headers */}
      <div className="grid grid-cols-7 text-center mb-1 text-[11px] font-semibold text-secondary">
        {WEEKDAY_NAMES.map((w) => (
          <div key={w} className="py-1">{w}</div>
        ))}
      </div>

      {/* Days Grid */}
      <div className="grid grid-cols-7 gap-y-1 text-center text-xs">
        {Array.from({ length: firstDayWeekday }).map((_, i) => (
          <div key={`empty-${i}`} />
        ))}

        {Array.from({ length: daysInMonth }).map((_, i) => {
          const day = i + 1;
          const dayIso = formatDateIso(currentYear, currentMonth, day);
          const isToday = dayIso === todayIso;

          const isSelectedExact = mode === 'single'
            ? dayIso === selectedDate
            : dayIso === fromDate || dayIso === toDate;

          const isInRange = Boolean(
            mode === 'range' && fromDate && toDate && dayIso > fromDate && dayIso < toDate
          );

          return (
            <button
              key={dayIso}
              type="button"
              onClick={() => handleDayClick(day)}
              className={cn(
                'h-7.5 w-7.5 mx-auto rounded-lg flex items-center justify-center font-medium transition-all cursor-pointer relative',
                isSelectedExact && 'bg-primary text-white font-bold shadow-xs scale-105 z-10',
                isInRange && 'bg-primary/15 text-primary font-semibold rounded-none w-full',
                !isSelectedExact && !isInRange && 'hover:bg-surface-container text-on-surface',
                isToday && !isSelectedExact && 'border border-primary/40 font-bold text-primary'
              )}
              title={dayIso}
            >
              <span>{day}</span>
            </button>
          );
        })}
      </div>

      {/* Fast Presets */}
      {showPresets && (
        <div className="mt-3 pt-2.5 border-t border-outline-variant/40 flex items-center justify-between gap-1 text-[10px]">
          <div className="flex items-center gap-1">
            <button
              type="button"
              onClick={() => handlePreset('today')}
              className="px-2 py-1 rounded bg-surface-container hover:bg-surface-container-high text-on-surface font-medium transition-colors cursor-pointer"
            >
              Today
            </button>
            <button
              type="button"
              onClick={() => handlePreset('yesterday')}
              className="px-2 py-1 rounded bg-surface-container hover:bg-surface-container-high text-on-surface font-medium transition-colors cursor-pointer"
            >
              Yesterday
            </button>
            {mode === 'range' && (
              <button
                type="button"
                onClick={() => handlePreset('7d')}
                className="px-2 py-1 rounded bg-surface-container hover:bg-surface-container-high text-on-surface font-medium transition-colors cursor-pointer"
              >
                7d
              </button>
            )}
          </div>

          {(fromDate || toDate || selectedDate) && (
            <button
              type="button"
              onClick={() => {
                onSelectDate?.('');
                onSelectRange?.(undefined, undefined);
              }}
              className="flex items-center gap-0.5 px-1.5 py-1 rounded text-secondary hover:text-error transition-colors cursor-pointer"
              title="Reset selection"
            >
              <RotateCcw className="w-2.5 h-2.5" />
              <span>Reset</span>
            </button>
          )}
        </div>
      )}
    </div>
  );
}
