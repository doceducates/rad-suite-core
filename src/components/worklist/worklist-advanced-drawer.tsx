'use client';

import React from 'react';
import { User, ArrowDownUp, AlertTriangle } from 'lucide-react';

export interface AdvancedFilterValues {
  dateRange: string;
  dateFrom: string;
  dateTo: string;
  bodyPart: string;
  gender: string;
  source: string;
  sortBy: string;
  criticalOnly: boolean;
  imagesReadyOnly?: boolean;
}

interface WorklistAdvancedDrawerProps {
  filters: AdvancedFilterValues;
  onChange: (patch: Partial<AdvancedFilterValues>) => void;
  isOpen: boolean;
}

export function WorklistAdvancedDrawer({ filters, onChange, isOpen }: WorklistAdvancedDrawerProps) {
  if (!isOpen) return null;

  return (
    <div className="p-3 bg-surface-container-low rounded-xl border border-outline-variant/60 shadow-xs text-xs animate-in fade-in duration-150">
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
        {/* 1. Patient Demographics & Origin */}
        <div className="space-y-1">
          <label className="text-[10px] font-semibold text-secondary flex items-center gap-1">
            <User className="w-3 h-3 text-primary" /> Patient Demographics & Origin
          </label>
          <div className="grid grid-cols-2 gap-1.5">
            <select
              value={filters.gender}
              onChange={(e) => onChange({ gender: e.target.value })}
              className="w-full px-2 py-1.5 rounded-lg border border-outline-variant/60 bg-surface-container-lowest text-xs text-on-surface cursor-pointer focus:border-primary outline-none"
              title="Filter by patient gender"
            >
              <option value="all">Any Gender</option>
              <option value="Male">Male</option>
              <option value="Female">Female</option>
            </select>
            <select
              value={filters.source}
              onChange={(e) => onChange({ source: e.target.value })}
              className="w-full px-2 py-1.5 rounded-lg border border-outline-variant/60 bg-surface-container-lowest text-xs text-on-surface cursor-pointer focus:border-primary outline-none"
              title="Filter by storage archive source"
            >
              <option value="all">All Sources</option>
              <option value="local">Local Disk</option>
              <option value="pacs">Hospital PACS</option>
              <option value="worklist">Database</option>
            </select>
          </div>
        </div>

        {/* 2. Sort Sequence */}
        <div className="space-y-1">
          <label className="text-[10px] font-semibold text-secondary flex items-center gap-1">
            <ArrowDownUp className="w-3 h-3 text-primary" /> Sort Order
          </label>
          <select
            value={filters.sortBy}
            onChange={(e) => onChange({ sortBy: e.target.value })}
            className="w-full px-2.5 py-1.5 rounded-lg border border-outline-variant/60 bg-surface-container-lowest text-xs text-on-surface cursor-pointer focus:border-primary outline-none"
          >
            <option value="date_desc">Newest Acquired First</option>
            <option value="date_asc">Oldest Acquired First (FIFO)</option>
            <option value="priority">STAT Emergency First</option>
            <option value="patient_name">Patient Name (A-Z)</option>
          </select>
        </div>

        {/* 3. Safety Alerts */}
        <div className="space-y-1 sm:pl-2 sm:border-l sm:border-outline-variant/40 flex flex-col justify-center">
          <label className="text-[10px] font-semibold text-secondary flex items-center gap-1">
            <AlertTriangle className="w-3 h-3 text-rose-500" /> Clinical Safety Flag
          </label>
          <label className="flex items-center gap-2 pt-1 cursor-pointer select-none">
            <input
              type="checkbox"
              checked={filters.criticalOnly}
              onChange={(e) => onChange({ criticalOnly: e.target.checked })}
              className="rounded border-outline-variant text-rose-500 focus:ring-rose-500"
            />
            <span className="text-[11px] font-medium text-rose-600 dark:text-rose-400">
              Critical Findings Only
            </span>
          </label>
        </div>
      </div>
    </div>
  );
}
