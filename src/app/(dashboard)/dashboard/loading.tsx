import React from 'react';

export default function DashboardCommandCenterLoading() {
  return (
    <div className="space-y-4 sm:space-y-5 max-w-7xl mx-auto pb-10 animate-pulse" aria-busy="true">
      {/* Header shimmer */}
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="space-y-2">
          <div className="h-6 w-64 rounded-lg bg-surface-container-high" />
          <div className="h-3.5 w-48 rounded bg-surface-container" />
        </div>
        <div className="flex items-center gap-2">
          <div className="h-8 w-24 rounded-lg bg-surface-container-high" />
          <div className="h-8 w-32 rounded-lg bg-surface-container-high" />
        </div>
      </div>

      {/* Active Case Hero shimmer */}
      <div className="h-28 rounded-2xl border border-outline-variant/40 bg-surface-container-low p-4 flex items-center justify-between">
        <div className="space-y-2.5">
          <div className="h-3.5 w-32 rounded bg-surface-container-high" />
          <div className="h-5 w-72 max-w-full rounded bg-surface-container-high" />
          <div className="h-3 w-56 rounded bg-surface-container" />
        </div>
        <div className="h-9 w-28 rounded-xl bg-surface-container-high hidden sm:block" />
      </div>

      {/* 4-pillar KPI grid */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4">
        {[0, 1, 2, 3].map((i) => (
          <div key={i} className="h-24 rounded-2xl border border-outline-variant/40 bg-surface-container-low p-4 space-y-2">
            <div className="h-3 w-24 rounded bg-surface-container-high" />
            <div className="h-7 w-16 rounded bg-surface-container-high" />
            <div className="h-2.5 w-32 rounded bg-surface-container" />
          </div>
        ))}
      </div>

      {/* Asymmetric bento grid */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-4 sm:gap-5">
        <div className="lg:col-span-7 space-y-4">
          <div className="h-64 rounded-2xl border border-outline-variant/40 bg-surface-container-low" />
          <div className="h-44 rounded-2xl border border-outline-variant/40 bg-surface-container-low" />
        </div>
        <div className="lg:col-span-5 space-y-4">
          <div className="h-56 rounded-2xl border border-outline-variant/40 bg-surface-container-low" />
          <div className="h-52 rounded-2xl border border-outline-variant/40 bg-surface-container-low" />
        </div>
      </div>
    </div>
  );
}
