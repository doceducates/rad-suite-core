'use client';

import React from 'react';
import type { AnatomyFilter } from '@/types';

interface AtlasCategoryFilterListProps {
  filters: AnatomyFilter[];
  activeFilterIds: Set<number>;
  categoryCounts: Map<number, number>;
  onToggleFilter: (filterId: number) => void;
  onSelectAllFilters: () => void;
  onDeselectAllFilters: () => void;
  onSoloFilter: (filterId: number) => void;
}

export function AtlasCategoryFilterList({
  filters,
  activeFilterIds,
  categoryCounts,
  onToggleFilter,
  onSelectAllFilters,
  onDeselectAllFilters,
  onSoloFilter,
}: AtlasCategoryFilterListProps) {
  const allFiltersActive = filters.length > 0 && activeFilterIds.size === filters.length;

  return (
    <div className="flex flex-1 flex-col overflow-hidden">
      {/* Category Section Header */}
      <div className="flex items-center justify-between border-b border-border/40 px-3 py-2 bg-muted/10">
        <span className="text-[11px] font-semibold text-muted-foreground uppercase tracking-wider">
          Anatomical Parts
        </span>
        <button
          onClick={allFiltersActive ? onDeselectAllFilters : onSelectAllFilters}
          className="text-[11px] font-medium text-primary hover:underline cursor-pointer"
        >
          {allFiltersActive ? 'Deselect all' : 'Select all'}
        </button>
      </div>

      {/* Categories with Toggle Switches */}
      <div className="flex-1 overflow-y-auto p-2 space-y-1">
        {filters.map((f) => {
          const isChecked = activeFilterIds.has(f.id);
          const count = categoryCounts.get(f.id) || 0;

          return (
            <div
              key={f.id}
              onDoubleClick={() => onSoloFilter(f.id)}
              className="group flex items-center justify-between rounded-lg p-2 hover:bg-muted/50 transition border border-transparent hover:border-border/40"
              title="Double-click to isolate this category"
            >
              <div className="flex items-center gap-2 min-w-0 flex-1">
                {f.icon ? (
                  <>
                    <img
                      src={`/api/anatomy/icon/${f.icon}`}
                      alt={f.name_en}
                      className="h-4 w-4 shrink-0 object-contain opacity-90 group-hover:opacity-100"
                      onError={(e) => {
                        // Fallback to dot if icon load fails
                        e.currentTarget.style.display = 'none';
                        const fallback = e.currentTarget.parentElement?.querySelector(
                          '.filter-dot-fallback'
                        ) as HTMLElement | null;
                        if (fallback) fallback.style.display = 'inline-block';
                      }}
                    />
                    <span className="filter-dot-fallback hidden h-2.5 w-2.5 rounded-full bg-primary shrink-0" />
                  </>
                ) : (
                  <span className="h-2.5 w-2.5 rounded-full bg-primary shrink-0" />
                )}
                <span className="text-xs font-medium text-foreground truncate">
                  {f.name_en}
                </span>
                {count > 0 && (
                  <span className="rounded bg-muted px-1.5 py-0.2 text-[10px] font-mono text-muted-foreground">
                    {count}
                  </span>
                )}
              </div>

              <div className="flex items-center gap-2 shrink-0">
                <button
                  onClick={() => onSoloFilter(f.id)}
                  className="rounded px-1.5 py-0.5 text-[10px] font-semibold text-muted-foreground hover:bg-primary/20 hover:text-primary transition cursor-pointer"
                  title="Isolate this category"
                >
                  Solo
                </button>
                {/* Themed Toggle Switch */}
                <label className="relative inline-flex items-center cursor-pointer">
                  <input
                    type="checkbox"
                    checked={isChecked}
                    onChange={() => onToggleFilter(f.id)}
                    className="sr-only peer"
                  />
                  <div className="w-8 h-4 bg-muted peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-border after:border after:rounded-full after:h-3 after:w-3 after:transition-all peer-checked:bg-primary" />
                </label>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
