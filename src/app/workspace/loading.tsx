import React from 'react';

export default function WorkspaceLoading() {
  return (
    <div className="h-screen h-dvh w-screen bg-background flex flex-col overflow-hidden animate-pulse" aria-busy="true">
      <div className="h-12 border-b border-outline-variant/50 bg-surface-container-low px-4 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="h-6 w-6 rounded-md bg-surface-container-high" />
          <div className="h-4 w-48 rounded bg-surface-container-high" />
        </div>
        <div className="flex items-center gap-2">
          <div className="h-7 w-24 rounded-lg bg-surface-container-high" />
          <div className="h-7 w-24 rounded-lg bg-surface-container-high" />
        </div>
      </div>
      <div className="flex-1 flex min-h-0">
        <div className="w-14 border-r border-outline-variant/40 bg-surface-container-low hidden sm:block" />
        <div className="flex-1 bg-surface-container-lowest/40 m-3 rounded-xl border border-outline-variant/30" />
        <div className="w-96 border-l border-outline-variant/40 bg-surface-container-low p-4 space-y-3 hidden lg:block">
          <div className="h-5 w-40 rounded bg-surface-container-high" />
          <div className="h-24 w-full rounded-xl bg-surface-container" />
          <div className="h-48 w-full rounded-xl bg-surface-container" />
        </div>
      </div>
    </div>
  );
}
