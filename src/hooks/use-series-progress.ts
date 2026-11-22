'use client';

import { useState, useEffect } from 'react';
import { dicomCache } from '@/services/dicom-cache.service';

export type SeriesOrientationType = 'AXIAL' | 'SAGITTAL' | 'CORONAL' | 'LOCALIZER';

export interface OrientationBadgeConfig {
  type: SeriesOrientationType;
  label: 'AX' | 'SAG' | 'COR' | 'LOC';
  badgeClassName: string;
}

export const ORIENTATION_BADGE_MAP: Record<SeriesOrientationType, OrientationBadgeConfig> = {
  SAGITTAL: {
    type: 'SAGITTAL',
    label: 'SAG',
    badgeClassName: 'bg-purple-500/15 text-purple-600 dark:text-purple-400 border-purple-500/30',
  },
  CORONAL: {
    type: 'CORONAL',
    label: 'COR',
    badgeClassName: 'bg-amber-500/15 text-amber-600 dark:text-amber-400 border-amber-500/30',
  },
  AXIAL: {
    type: 'AXIAL',
    label: 'AX',
    badgeClassName: 'bg-sky-500/15 text-sky-600 dark:text-sky-400 border-sky-500/30',
  },
  LOCALIZER: {
    type: 'LOCALIZER',
    label: 'LOC',
    badgeClassName: 'bg-emerald-500/15 text-emerald-600 dark:text-emerald-400 border-emerald-500/30',
  },
};

/**
 * Resolves standard anatomical orientation or localizer type from explicit tag or series description.
 */
export function resolveSeriesOrientation(
  orientation?: string,
  description?: string
): SeriesOrientationType {
  const normOrient = (orientation || '').trim().toUpperCase();
  const normDesc = (description || '').trim().toUpperCase();

  // 1. Direct match on orientation
  if (normOrient) {
    if (
      normOrient === 'LOCALIZER' ||
      normOrient === 'LOC' ||
      normOrient === 'SCOUT' ||
      normOrient === 'SURVEY' ||
      normOrient === 'TOPOGRAM'
    ) {
      return 'LOCALIZER';
    }
    if (normOrient === 'SAGITTAL' || normOrient === 'SAG') {
      return 'SAGITTAL';
    }
    if (normOrient === 'CORONAL' || normOrient === 'COR') {
      return 'CORONAL';
    }
    if (normOrient === 'AXIAL' || normOrient === 'AX') {
      return 'AXIAL';
    }
  }

  // 2. Fallback to description heuristics
  if (normDesc) {
    if (
      /(^|[\s_/-])(LOCALIZER|SCOUT|SURVEY|TOPOGRAM|SCANOGRAM)($|[\s_/-0-9])/.test(normDesc) ||
      normDesc === 'LOC' ||
      normDesc.startsWith('LOC ') ||
      normDesc.endsWith(' LOC')
    ) {
      return 'LOCALIZER';
    }
    if (/(^|[\s_/-])(SAG|SG|SAGITTAL)($|[\s_/-0-9])/.test(normDesc)) {
      return 'SAGITTAL';
    }
    if (/(^|[\s_/-])(COR|CO|CORONAL)($|[\s_/-0-9])/.test(normDesc)) {
      return 'CORONAL';
    }
    if (/(^|[\s_/-])(AX|AXIAL)($|[\s_/-0-9])/.test(normDesc)) {
      return 'AXIAL';
    }
  }

  // 3. Fallback to substring in orientation
  if (normOrient.includes('SAG')) return 'SAGITTAL';
  if (normOrient.includes('COR')) return 'CORONAL';
  if (normOrient.includes('LOC') || normOrient.includes('SCOUT')) return 'LOCALIZER';

  return 'AXIAL';
}

/**
 * Returns badge configuration (label, theme classes) for a given series orientation and description.
 */
export function resolveOrientationBadge(
  orientation?: string,
  description?: string
): OrientationBadgeConfig {
  const orient = resolveSeriesOrientation(orientation, description);
  return ORIENTATION_BADGE_MAP[orient];
}

export interface SeriesProgress {
  loaded: number;
  total: number;
  percent: number;
  isComplete: boolean;
}

/**
 * Computes an instantaneous snapshot of slice cache progress for a given case and series.
 */
export function getSeriesProgressSnapshot(
  caseId?: string,
  series?: string,
  totalSlices: number = 0
): SeriesProgress {
  const safeTotal = Math.max(0, totalSlices || 0);
  if (!caseId || !series || safeTotal <= 0) {
    return {
      loaded: 0,
      total: safeTotal,
      percent: 0,
      isComplete: false,
    };
  }

  const res = dicomCache.getSeriesProgress(caseId, series, safeTotal);
  return {
    loaded: res.loaded,
    total: res.total,
    percent: res.percent,
    isComplete: res.total > 0 && res.loaded >= res.total,
  };
}

/**
 * Reactive hook that queries DICOM cache progress and updates dynamically as new slices are cached.
 */
export function useSeriesProgress(
  caseId?: string,
  series?: string,
  totalSlices: number = 0
): SeriesProgress {
  const [progress, setProgress] = useState<SeriesProgress>(() =>
    getSeriesProgressSnapshot(caseId, series, totalSlices)
  );

  useEffect(() => {
    const current = getSeriesProgressSnapshot(caseId, series, totalSlices);
    setProgress(current);

    if (!caseId || !series || totalSlices <= 0) {
      return;
    }

    const unsubscribe = dicomCache.subscribe((event) => {
      if (event.caseId === caseId && event.series === series) {
        const next = getSeriesProgressSnapshot(caseId, series, totalSlices);
        setProgress((prev) => {
          if (
            prev.loaded === next.loaded &&
            prev.total === next.total &&
            prev.percent === next.percent &&
            prev.isComplete === next.isComplete
          ) {
            return prev;
          }
          return next;
        });
      }
    });

    return unsubscribe;
  }, [caseId, series, totalSlices]);

  return progress;
}
