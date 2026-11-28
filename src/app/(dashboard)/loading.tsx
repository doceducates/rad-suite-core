import React from 'react';

/**
 * Shared instant route skeleton for all (dashboard) routes.
 * Renders immediately inside DashboardLayoutShell while Server Components stream data.
 */
export default function DashboardGroupLoading() {
  return (
    <div className="max-w-7xl mx-auto space-y-4 animate-pulse" aria-busy="true" aria-label="Loading view">
      <div className="flex items-center justify-between gap-4">
        <div className="space-y-2">
          <div className="h-6 w-52 rounded-lg bg-surface-container-high" />
          <div className="h-3.5 w-80 max-w-full rounded bg-surface-container" />
        </div>
        <div className="flex items-center gap-2">
          <div className="h-8 w-24 rounded-lg bg-surface-container-high" />
          <div className="h-8 w-28 rounded-lg bg-surface-container-high" />
        </div>
      </div>

      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
        {[0, 1, 2, 3].map((i) => (
          <div
            key={i}
            className="h-24 rounded-xl border border-outline-variant/40 bg-surface-container-low p-4 space-y-2.5"
          >
            <div className="h-3 w-20 rounded bg-surface-container-high" />
            <div className="h-6 w-14 rounded bg-surface-container-high" />
            <div className="h-2.5 w-28 rounded bg-surface-container" />
          </div>
        ))}
      </div>

      <div className="rounded-xl border border-outline-variant/40 bg-surface-container-low p-4 space-y-3">
        <div className="h-9 w-full rounded-lg bg-surface-container" />
        {[0, 1, 2, 3, 4, 5].map((row) => (
          <div key={row} className="h-12 w-full rounded-lg bg-surface-container/70" />
        ))}
      </div>
    </div>
  );
}
