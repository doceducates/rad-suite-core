'use client';

import React from 'react';
import { useOfflineSync } from '@/hooks/useOfflineSync';
import { RefreshCw, Cloud, CloudOff, AlertCircle, CheckCircle } from 'lucide-react';

export function SyncStatusBadge() {
  const { isOnline, isSyncing, status, syncNow } = useOfflineSync();

  const pendingCount = status?.pendingCount || 0;
  const failedCount = status?.failedCount || 0;
  const isConfigured = status?.configured ?? false;

  // If sync is not configured, show unconfigured indicator
  if (!isConfigured) {
    return (
      <div
        className="hidden md:inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-[11px] font-medium bg-surface-container text-secondary border border-outline-variant/40"
        title="VPS Database Sync is not configured. Cases are stored in local SQLite vault."
      >
        <Cloud className="w-3.5 h-3.5 opacity-60" />
        <span>Local Vault</span>
      </div>
    );
  }

  // Offline Mode
  if (!isOnline) {
    return (
      <div
        className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-[11px] font-medium bg-amber-500/10 text-amber-700 dark:text-amber-300 border border-amber-500/30"
        title="No network connection. Case edits are saved safely in local SQLite."
      >
        <CloudOff className="w-3.5 h-3.5 animate-pulse" />
        <span>Offline</span>
        {pendingCount > 0 && (
          <span className="px-1.5 py-0.2 rounded-full bg-amber-500/20 text-[10px] font-mono font-bold">
            {pendingCount}
          </span>
        )}
      </div>
    );
  }

  // Active Syncing State
  if (isSyncing) {
    return (
      <div
        className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-[11px] font-semibold bg-sky-500/10 text-sky-700 dark:text-sky-300 border border-sky-500/30"
        title="Syncing case database with VPS..."
      >
        <RefreshCw className="w-3.5 h-3.5 animate-spin text-sky-500" />
        <span>Syncing...</span>
      </div>
    );
  }

  // Failed / Sync Alert State
  if (failedCount > 0) {
    return (
      <button
        type="button"
        onClick={syncNow}
        className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-[11px] font-semibold bg-rose-500/10 hover:bg-rose-500/20 text-rose-700 dark:text-rose-300 border border-rose-500/40 transition-colors cursor-pointer"
        title={`Sync error: ${status?.lastError || 'Retry synchronization'}. Click to retry.`}
      >
        <AlertCircle className="w-3.5 h-3.5 text-rose-500" />
        <span>Sync Alert</span>
        <span className="px-1.5 py-0.2 rounded-full bg-rose-500/20 text-[10px] font-mono font-bold">
          {failedCount}
        </span>
      </button>
    );
  }

  // Pending Items Queue
  if (pendingCount > 0) {
    return (
      <button
        type="button"
        onClick={syncNow}
        className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-[11px] font-semibold bg-amber-500/10 hover:bg-amber-500/20 text-amber-700 dark:text-amber-300 border border-amber-500/40 transition-colors cursor-pointer group"
        title={`${pendingCount} offline case(s) queued for sync. Click to sync now.`}
      >
        <Cloud className="w-3.5 h-3.5 text-amber-500 group-hover:scale-110 transition-transform" />
        <span>Pending</span>
        <span className="px-1.5 py-0.2 rounded-full bg-amber-500/20 text-[10px] font-mono font-bold">
          {pendingCount}
        </span>
      </button>
    );
  }

  // Synced / All Up to Date
  return (
    <button
      type="button"
      onClick={syncNow}
      className="hidden sm:inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-[11px] font-medium bg-emerald-500/10 hover:bg-emerald-500/20 text-emerald-700 dark:text-emerald-300 border border-emerald-500/30 transition-colors cursor-pointer group"
      title="All local cases are synchronized with VPS. Click to check for remote updates."
    >
      <CheckCircle className="w-3.5 h-3.5 text-emerald-500 group-hover:scale-110 transition-transform" />
      <span>Synced</span>
    </button>
  );
}
