'use client';

import { useState, useEffect, useCallback } from 'react';
import type { ReleaseInfo } from '@/services/release.service';
import { notify } from '@/services/notification.service';

const CURRENT_DESKTOP_VERSION = '1.0.0';

export function useDesktopUpdate() {
  const [updateAvailable, setUpdateAvailable] = useState(false);
  const [latestRelease, setLatestRelease] = useState<ReleaseInfo | null>(null);
  const [isChecking, setIsChecking] = useState(false);
  const [dismissed, setDismissed] = useState(false);

  const compareVersions = (vA: string, vB: string): number => {
    const cleanA = vA.replace(/^v/i, '').trim();
    const cleanB = vB.replace(/^v/i, '').trim();
    const partsA = cleanA.split('.').map((p) => parseInt(p, 10) || 0);
    const partsB = cleanB.split('.').map((p) => parseInt(p, 10) || 0);
    const len = Math.max(partsA.length, partsB.length);
    for (let i = 0; i < len; i++) {
      const a = partsA[i] || 0;
      const b = partsB[i] || 0;
      if (a > b) return 1;
      if (a < b) return -1;
    }
    return 0;
  };

  const checkForUpdates = useCallback(async (manual = false) => {
    setIsChecking(true);
    try {
      const res = await fetch('/api/releases/latest', { cache: 'no-store' });
      if (!res.ok) throw new Error('Failed to fetch latest release metadata');
      const data = await res.json();
      if (data.success && data.release) {
        const rel: ReleaseInfo = data.release;
        setLatestRelease(rel);

        const hasNew = compareVersions(rel.version, CURRENT_DESKTOP_VERSION) > 0;
        setUpdateAvailable(hasNew);

        if (manual) {
          if (hasNew) {
            notify.info(`Rad Suite v${rel.version} is available for download!`);
          } else {
            notify.success(`Rad Suite is up to date (v${CURRENT_DESKTOP_VERSION})`);
          }
        }
      }
    } catch (err: any) {
      if (manual) {
        notify.error('Could not check for updates. Check internet connection.');
      }
    } finally {
      setIsChecking(false);
    }
  }, []);

  useEffect(() => {
    if (typeof window === 'undefined') return;

    // Check on startup
    checkForUpdates(false);

    // Periodic check every 4 hours
    const interval = setInterval(() => {
      checkForUpdates(false);
    }, 4 * 60 * 60 * 1000);

    return () => clearInterval(interval);
  }, [checkForUpdates]);

  const dismissUpdate = () => setDismissed(true);

  return {
    updateAvailable: updateAvailable && !dismissed,
    latestRelease,
    currentVersion: CURRENT_DESKTOP_VERSION,
    isChecking,
    checkForUpdates,
    dismissUpdate,
  };
}
