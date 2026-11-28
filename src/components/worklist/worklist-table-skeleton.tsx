import React from 'react';

export function WorklistTableSkeleton() {
  return (
    <div className="space-y-3 max-w-7xl mx-auto animate-pulse" aria-busy="true">
      {/* Cockpit header + tabs */}
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="space-y-1.5">
          <div className="h-6 w-48 rounded-lg bg-surface-container-high" />
          <div className="h-3.5 w-72 rounded bg-surface-container" />
        </div>
        <div className="flex gap-2">
          <div className="h-8 w-24 rounded-lg bg-surface-container-high" />
          <div className="h-8 w-28 rounded-lg bg-surface-container-high" />
        </div>
      </div>

      {/* Filter bar */}
      <div className="h-12 rounded-xl border border-outline-variant/40 bg-surface-container-low px-3 flex items-center gap-2">
        <div className="h-7 flex-1 max-w-sm rounded-lg bg-surface-container" />
        <div className="h-7 w-24 rounded-lg bg-surface-container" />
        <div className="h-7 w-24 rounded-lg bg-surface-container hidden sm:block" />
        <div className="h-7 w-24 rounded-lg bg-surface-container hidden md:block" />
      </div>

      {/* Rows */}
      <div className="rounded-xl border border-outline-variant/40 bg-surface-container-low divide-y divide-outline-variant/30">
        <div className="h-9 bg-surface-container/60 rounded-t-xl" />
        {[0, 1, 2, 3, 4, 5, 6, 7].map((i) => (
          <div key={i} className="h-14 px-4 flex items-center justify-between gap-4">
            <div className="flex items-center gap-3 flex-1 min-w-0">
              <div className="h-4 w-4 rounded bg-surface-container-high shrink-0" />
              <div className="space-y-1.5 flex-1">
                <div className="h-3.5 w-44 rounded bg-surface-container-high" />
                <div className="h-2.5 w-64 rounded bg-surface-container" />
              </div>
            </div>
            <div className="h-6 w-20 rounded-full bg-surface-container-high shrink-0" />
          </div>
        ))}
      </div>
    </div>
  );
}
