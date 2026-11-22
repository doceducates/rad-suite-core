'use client';

import { useState, useEffect, useCallback, useRef } from 'react';
import { notify } from '@/services/notification.service';
import type { SyncStatusSummary } from '@/services/sync/case-sync-types';

export interface UseOfflineSyncReturn {
  isOnline: boolean;
  isSyncing: boolean;
  status: SyncStatusSummary | null;
  syncNow: () => Promise<void>;
  refreshStatus: () => Promise<void>;
}

export function useOfflineSync(): UseOfflineSyncReturn {
  const [isOnline, setIsOnline] = useState<boolean>(() => {
    return typeof navigator !== 'undefined' ? navigator.onLine : true;
  });
  const [isSyncing, setIsSyncing] = useState<boolean>(false);
  const [status, setStatus] = useState<SyncStatusSummary | null>(null);
  const previousOnlineRef = useRef(isOnline);

  const refreshStatus = useCallback(async () => {
    try {
      const res = await fetch('/api/v1/sync/cases/status', { cache: 'no-store' });
      if (!res.ok) return;
      const data = await res.json();
      if (data.success) {
        setStatus({
          configured: data.configured,
          vpsUrl: data.vpsUrl,
          pendingCount: data.pendingCount,
          failedCount: data.failedCount,
          syncedCount: data.syncedCount,
          lastSyncedAt: data.lastSyncedAt,
          lastError: data.lastError,
        });
      }
    } catch {}
  }, []);

  const syncNow = useCallback(async () => {
    if (isSyncing || (typeof navigator !== 'undefined' && !navigator.onLine)) {
      return;
    }

    setIsSyncing(true);
    let taskId: string | undefined;

    try {
      taskId = notify.progress({
        title: 'Synchronizing Cases',
        statusText: 'Connecting to VPS and synchronizing case queue...',
        current: 0,
        total: 100,
      });

      const res = await fetch('/api/v1/sync/cases/status', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'sync-now' }),
      });

      const data = await res.json();
      if (data.success) {
        const pushed = data.push?.synced || 0;
        const pulled = data.pull?.received || 0;
        const conflicts = (data.push?.conflicts || 0) + (data.pull?.conflicts || 0);

        if (taskId) {
          notify.updateProgress(taskId, {
            current: 100,
            total: 100,
            statusText: `Synced ${pushed} local cases, received ${pulled} remote updates.`,
          });
          setTimeout(() => {
            if (taskId) notify.dismiss(taskId);
          }, 1500);
        }

        if (pushed > 0 || pulled > 0) {
          notify.success(`Sync Complete: ${pushed} pushed, ${pulled} pulled${conflicts > 0 ? ` (${conflicts} conflicts archived)` : ''}`);
        }

        if (data.summary) {
          setStatus(data.summary);
        }
      } else {
        if (taskId) notify.dismiss(taskId);
        notify.warning('Sync Notice', { description: data.error || 'Failed synchronizing cases' });
      }
    } catch (err: any) {
      if (taskId) notify.dismiss(taskId);
      console.warn('[OFFLINE_SYNC_ERROR]', err);
    } finally {
      setIsSyncing(false);
      await refreshStatus();
    }
  }, [isSyncing, refreshStatus]);

  // Online / Offline Window Listeners
  useEffect(() => {
    if (typeof window === 'undefined') return;

    const handleOnline = () => {
      setIsOnline(true);
      notify.info('Network connection restored. Preparing case sync...');
      // Small pause to let DNS/sockets settle
      setTimeout(() => {
        syncNow();
      }, 1500);
    };

    const handleOffline = () => {
      setIsOnline(false);
      notify.warning('Working Offline: All case edits are safely saved in local SQLite vault.');
    };

    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);

    // Initial status fetch
    refreshStatus();

    // Periodic status poll (every 30s)
    const interval = setInterval(() => {
      refreshStatus();
    }, 30000);

    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
      clearInterval(interval);
    };
  }, [refreshStatus, syncNow]);

  return {
    isOnline,
    isSyncing,
    status,
    syncNow,
    refreshStatus,
  };
}
