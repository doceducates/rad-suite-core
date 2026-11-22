'use client';

import { useState, useEffect, useCallback, useRef } from 'react';
import { notify } from '@/services/notification.service';

export interface DesktopUpdaterState {
  isDesktop: boolean;
  isChecking: boolean;
  updateAvailable: boolean;
  updateVersion: string | null;
  updateNotes: string | null;
  isDownloading: boolean;
  downloadProgress: number;
  isReadyToRestart: boolean;
  checkForUpdates: () => Promise<void>;
  downloadAndInstall: () => Promise<void>;
  dismissBanner: () => void;
}

export function useDesktopUpdater(autoCheck: boolean = true): DesktopUpdaterState {
  const [isDesktop, setIsDesktop] = useState(false);
  const [isChecking, setIsChecking] = useState(false);
  const [updateAvailable, setUpdateAvailable] = useState(false);
  const [updateVersion, setUpdateVersion] = useState<string | null>(null);
  const [updateNotes, setUpdateNotes] = useState<string | null>(null);
  const [isDownloading, setIsDownloading] = useState(false);
  const [downloadProgress, setDownloadProgress] = useState(0);
  const [isReadyToRestart, setIsReadyToRestart] = useState(false);

  const pendingUpdateRef = useRef<any>(null);

  // Detect Tauri runtime environment safely
  useEffect(() => {
    if (typeof window !== 'undefined') {
      const isTauriApp =
        '__TAURI_INTERNALS__' in window ||
        '__TAURI__' in window ||
        Boolean((window as any).__TAURI_POST_MESSAGE__);
      setIsDesktop(Boolean(isTauriApp));
    }
  }, []);

  const checkForUpdates = useCallback(async () => {
    if (typeof window === 'undefined') return;

    const isTauriApp =
      '__TAURI_INTERNALS__' in window ||
      '__TAURI__' in window ||
      Boolean((window as any).__TAURI_POST_MESSAGE__);

    if (!isTauriApp) return;

    setIsChecking(true);
    try {
      // 1. Try native Tauri updater plugin
      const { check } = await import('@tauri-apps/plugin-updater');
      const update = await check();

      if (update && update.available) {
        pendingUpdateRef.current = update;
        setUpdateAvailable(true);
        setUpdateVersion(update.version);
        setUpdateNotes(update.body || null);
        return;
      }
    } catch {
      // 2. Fallback: HTTP check against /api/releases/latest
      try {
        const res = await fetch('/api/releases/latest', { cache: 'no-store' });
        if (res.ok) {
          const data = await res.json();
          if (data.success && data.release) {
            const rel = data.release;
            const current = '1.0.0';
            const partsRel = rel.version.split('.').map((n: string) => parseInt(n, 10) || 0);
            const partsCur = current.split('.').map((n: string) => parseInt(n, 10) || 0);
            let isNewer = false;
            for (let i = 0; i < Math.max(partsRel.length, partsCur.length); i++) {
              if ((partsRel[i] || 0) > (partsCur[i] || 0)) { isNewer = true; break; }
              if ((partsRel[i] || 0) < (partsCur[i] || 0)) { break; }
            }
            if (isNewer) {
              setUpdateAvailable(true);
              setUpdateVersion(rel.version);
              setUpdateNotes(Array.isArray(rel.releaseNotes) ? rel.releaseNotes.join('\n') : rel.releaseNotes);
              return;
            }
          }
        }
      } catch {}
    } finally {
      setIsChecking(false);
    }
  }, []);

  const downloadAndInstall = useCallback(async () => {
    if (!pendingUpdateRef.current) {
      if (typeof window !== 'undefined') {
        window.location.href = '/api/download/desktop';
      }
      return;
    }

    setIsDownloading(true);
    setDownloadProgress(10);

    let progressId: string | undefined;
    try {
      progressId = notify.progress({
        title: 'Downloading Rad Suite Update',
        statusText: `Downloading Alpha version ${updateVersion || ''}...`,
        current: 10,
        total: 100,
      });

      const update = pendingUpdateRef.current;
      let downloaded = 0;
      let contentLength = 0;

      await update.downloadAndInstall((event: any) => {
        if (event.event === 'Started') {
          contentLength = event.data.contentLength || 100;
        } else if (event.event === 'Progress') {
          downloaded += event.data.chunkLength;
          if (contentLength > 0) {
            const pct = Math.round((downloaded / contentLength) * 100);
            setDownloadProgress(pct);
            if (progressId) {
              notify.updateProgress(progressId, {
                current: pct,
                total: 100,
                statusText: `Downloading: ${pct}%`,
              });
            }
          }
        } else if (event.event === 'Finished') {
          setDownloadProgress(100);
          if (progressId) notify.dismiss(progressId);
        }
      });

      setIsReadyToRestart(true);
      notify.success('Update Downloaded', {
        description: 'Restarting Rad Suite to apply the new version...',
      });

      // Restart process via tauri process plugin
      const { relaunch } = await import('@tauri-apps/plugin-process');
      await relaunch();
    } catch (err: any) {
      if (progressId) notify.dismiss(progressId);
      notify.error('Update Failed', {
        description: err.message || 'Could not complete update installation.',
      });
      setIsDownloading(false);
    }
  }, [updateVersion]);

  const dismissBanner = useCallback(() => {
    setUpdateAvailable(false);
  }, []);

  useEffect(() => {
    if (isDesktop && autoCheck) {
      // Check for updates 3 seconds after launch to not delay startup
      const timer = setTimeout(() => {
        checkForUpdates();
      }, 3500);
      return () => clearTimeout(timer);
    }
  }, [isDesktop, autoCheck, checkForUpdates]);

  return {
    isDesktop,
    isChecking,
    updateAvailable,
    updateVersion,
    updateNotes,
    isDownloading,
    downloadProgress,
    isReadyToRestart,
    checkForUpdates,
    downloadAndInstall,
    dismissBanner,
  };
}
