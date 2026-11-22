'use client';

import { useState, useEffect } from 'react';
import { notify } from '@/services/notification.service';
import { clientManifestCache } from '@/services/client-manifest-cache';

export interface PacsRetrievalState {
  status: 'idle' | 'retrieving' | 'success' | 'offline';
  message?: string;
}

export function usePacsStudyRetrieval(
  accessionNumber?: string,
  isLocalCase = false,
  onSeriesLoaded?: (series: any[], caseId: string) => void
) {
  const [pacsRetrieval, setPacsRetrieval] = useState<PacsRetrievalState>({ status: 'idle' });
  const [showPacsNotice, setShowPacsNotice] = useState(false);

  useEffect(() => {
    if (isLocalCase || !accessionNumber) return;

    let isMounted = true;
    const fetchPacsAndCloud = async () => {
      setPacsRetrieval({ status: 'retrieving' });

      // 1. Check pre-warmed client manifest memory cache for 0ms instant transition
      const cachedManifest = clientManifestCache.get(accessionNumber);
      if (cachedManifest?.series && Array.isArray(cachedManifest.series) && cachedManifest.series.length > 0) {
        if (!isMounted) return;
        setPacsRetrieval({ status: 'success', message: `DICOM series loaded (${cachedManifest.series.length} series)` });
        onSeriesLoaded?.(cachedManifest.series, accessionNumber);
        return;
      }

      // 2. Check cloud/VPS manifest in background
      try {
        const manifestRes = await fetch(`/api/cases/${encodeURIComponent(accessionNumber)}/manifest`);
        if (manifestRes.ok) {
          const manifest = await manifestRes.json();
          if (manifest?.series && Array.isArray(manifest.series) && manifest.series.length > 0) {
            clientManifestCache.set(accessionNumber, manifest);
            if (!isMounted) return;
            setPacsRetrieval({ status: 'success', message: `DICOM series loaded (${manifest.series.length} series)` });
            onSeriesLoaded?.(manifest.series, accessionNumber);
            notify.success(`Loaded ${manifest.series.length} DICOM series from cloud storage`);
            return;
          }
        }
      } catch {
        // Fall through to hospital PACS retrieval
      }

      // 2. Check Hospital PACS via DIMSE retrieval
      try {
        const res = await fetch('/api/pacs/retrieve', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ accessionNumber }),
        });
        const data = await res.json();
        if (!isMounted) return;

        if (data.reachable && data.success && (data.instancesRetrieved || 0) > 0) {
          setPacsRetrieval({ status: 'success', message: data.message });
          const mRes = await fetch(`/api/cases/${encodeURIComponent(accessionNumber)}/manifest`).catch(() => null);
          if (mRes?.ok) {
            const m = await mRes.json();
            if (m?.series?.length > 0) {
              clientManifestCache.set(accessionNumber, m);
              onSeriesLoaded?.(m.series, accessionNumber);
            }
          }
          notify.success(data.message || 'DICOM study retrieved from PACS');
        } else {
          setPacsRetrieval({
            status: 'offline',
            message: 'No DICOM images found for this study.',
          });
          notify.info('No DICOM images found for this study. Reporting mode active.', {
            id: `pacs-notice-${accessionNumber}`,
          });
        }
      } catch {
        if (!isMounted) return;
        setPacsRetrieval({
          status: 'offline',
          message: 'No DICOM images available for this study.',
        });
        notify.info('No DICOM images found for this study. Reporting mode active.', {
          id: `pacs-notice-${accessionNumber}`,
        });
      }
    };

    fetchPacsAndCloud();
    return () => {
      isMounted = false;
    };
  }, [isLocalCase, accessionNumber, onSeriesLoaded]);

  return {
    pacsRetrieval,
    showPacsNotice,
    setShowPacsNotice,
  };
}
