'use client';

import React from 'react';
import { ArrowUp, ArrowDown, ArrowUpDown } from 'lucide-react';

interface WorklistSortHeaderProps {
  label: string;
  field: string;
  activeField: string;
  direction: 'asc' | 'desc';
  onSort: (field: string) => void;
  className?: string;
  align?: 'left' | 'right' | 'center';
}

export function WorklistSortHeader({
  label,
  field,
  activeField,
  direction,
  onSort,
  className = '',
  align = 'left',
}: WorklistSortHeaderProps) {
  const isActive = activeField === field;

  return (
    <th
      onClick={() => onSort(field)}
      className={`py-3 px-4 select-none cursor-pointer group hover:bg-surface-container/70 transition-colors ${className}`}
      title={`Sort by ${label} (${
        isActive
          ? direction === 'asc'
            ? 'Currently Ascending — click for Descending'
            : 'Currently Descending — click for Ascending'
          : 'Click to sort ascending'
      })`}
    >
      <div
        className={`flex items-center gap-1.5 ${
          align === 'right' ? 'justify-end' : align === 'center' ? 'justify-center' : 'justify-start'
        }`}
      >
        <span className={isActive ? 'text-primary font-bold' : ''}>{label}</span>
        <span className="shrink-0 transition-opacity">
          {isActive ? (
            direction === 'asc' ? (
              <ArrowUp className="w-3.5 h-3.5 text-primary stroke-[2.5]" />
            ) : (
              <ArrowDown className="w-3.5 h-3.5 text-primary stroke-[2.5]" />
            )
          ) : (
            <ArrowUpDown className="w-3 h-3 text-secondary/35 opacity-0 group-hover:opacity-100 transition-opacity" />
          )}
        </span>
      </div>
    </th>
  );
}
