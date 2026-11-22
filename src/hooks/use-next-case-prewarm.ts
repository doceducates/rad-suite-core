'use client';

import { useEffect, useRef } from 'react';
import type { PacsStudyResult } from '@/types/pacs';
import { clientManifestCache } from '@/services/client-manifest-cache';
import { dicomCache } from '@/services/dicom-cache.service';

interface UseNextCasePrewarmOptions {
  nextCase?: PacsStudyResult;
  enabled?: boolean;
  idleDelayMs?: number;
}

/**
 * Predictive Next-Case Pre-Warming Hook
 * Automatically pre-warms nextCase metadata & initial DICOM slice during browser idle periods.
 * Enables zero-wait transitions when clicking Next or switching patients according to active sort order.
 */
export function useNextCasePrewarm({
  nextCase,
  enabled = true,
  idleDelayMs = 2000,
}: UseNextCasePrewarmOptions) {
  const prewarmedRef = useRef<string | null>(null);

  useEffect(() => {
    if (!enabled || !nextCase?.accessionNumber) return;
    const acc = nextCase.accessionNumber.trim().toUpperCase();
    if (prewarmedRef.current === acc) return;

    let timeoutId: NodeJS.Timeout | null = null;
    let idleId: any = null;

    const performPrewarm = async () => {
      try {
        prewarmedRef.current = acc;

        // 1. Fetch & warm manifest if not already in client cache
        let manifest = clientManifestCache.get(acc);
        if (!manifest) {
          const res = await fetch(`/api/cases/${encodeURIComponent(acc)}/manifest`);
          if (res.ok) {
            manifest = await res.json();
            if (manifest) {
              clientManifestCache.set(acc, manifest);
            }
          }
        }

        // 2. Pre-warm first slice of primary series into DicomSliceCache
        if (manifest?.series && Array.isArray(manifest.series) && manifest.series.length > 0) {
          const primarySeries = manifest.series[0];
          const seriesNumber = String(primarySeries.seriesNumber || '1');
          await dicomCache.fetchAndCache(acc, seriesNumber, 0);
        }
      } catch {
        // Silently ignore prewarm failures - background speedup enhancement only
      }
    };

    // Schedule prewarm during browser idle time after initial idle delay
    timeoutId = setTimeout(() => {
      if (typeof window !== 'undefined' && 'requestIdleCallback' in window) {
        idleId = (window as any).requestIdleCallback(performPrewarm, { timeout: 3500 });
      } else {
        performPrewarm();
      }
    }, idleDelayMs);

    return () => {
      if (timeoutId) clearTimeout(timeoutId);
      if (idleId && typeof window !== 'undefined' && 'cancelIdleCallback' in window) {
        (window as any).cancelIdleCallback(idleId);
      }
    };
  }, [nextCase?.accessionNumber, enabled, idleDelayMs]);
}
