'use client';

import { useState, useEffect, useMemo } from 'react';
import type {
  AnatomyModuleSummary,
  AnatomyModuleDetails,
  AnatomySeries,
  AnatomySliceAnnotations,
} from '@/types';

interface UseAtlasCompanionOptions {
  modality?: string;
  studyDescription?: string;
}

export function useAtlasCompanion({
  modality = 'CT',
  studyDescription = '',
}: UseAtlasCompanionOptions) {
  const [modules, setModules] = useState<AnatomyModuleSummary[]>([]);
  const [activeCode, setActiveCode] = useState<string>('');
  const [moduleDetails, setModuleDetails] = useState<AnatomyModuleDetails | null>(null);
  const [activeSeriesId, setActiveSeriesId] = useState<number>(0);
  const [currentSliceIndex, setCurrentSliceIndex] = useState<number>(0);
  const [annotations, setAnnotations] = useState<AnatomySliceAnnotations>({ points: [], scout_lines: [] });

  // 1. Fetch modules & auto-match against study
  useEffect(() => {
    async function loadModules() {
      try {
        const res = await fetch('/api/anatomy/modules');
        if (!res.ok) return;
        const json = await res.json();
        const mods: AnatomyModuleSummary[] = json.modules || [];
        setModules(mods);

        if (mods.length === 0) return;

        const text = `${studyDescription} ${modality}`.toLowerCase();
        let matched = mods[0].code;

        if (/brain|head|neuro|stroke|skull/i.test(text)) {
          const m = mods.find((x) => x.code.includes('brain') || x.code.includes('head'));
          if (m) matched = m.code;
        } else if (/chest|thorax|lung|mediastin/i.test(text)) {
          const m = mods.find((x) => x.code.includes('chest') || x.code.includes('thorax'));
          if (m) matched = m.code;
        } else if (/spine|lumbar|cervical|vertebra/i.test(text)) {
          const m = mods.find((x) => x.code.includes('spine') || x.code.includes('rachis'));
          if (m) matched = m.code;
        } else if (/abdomen|pelvis|liver|kidney/i.test(text)) {
          const m = mods.find((x) => x.code.includes('abdomen') || x.code.includes('pelvis'));
          if (m) matched = m.code;
        } else if (/knee|shoulder|hip|wrist|ankle/i.test(text)) {
          const m = mods.find((x) => x.code.includes('knee') || x.code.includes('shoulder') || x.code.includes('hip'));
          if (m) matched = m.code;
        }

        setActiveCode(matched);
      } catch (err) {
        console.error('[useAtlasCompanion] loadModules error:', err);
      }
    }
    loadModules();
  }, [modality, studyDescription]);

  // 2. Fetch Module Details
  useEffect(() => {
    if (!activeCode) return;
    async function loadDetails() {
      try {
        const res = await fetch(`/api/anatomy/module/${activeCode}`);
        if (!res.ok) return;
        const json = await res.json();
        if (json.module) {
          setModuleDetails(json.module);
          if (json.module.series.length > 0) {
            setActiveSeriesId(json.module.series[0].id);
            setCurrentSliceIndex(0);
          }
        }
      } catch (err) {
        console.error('[useAtlasCompanion] loadDetails error:', err);
      }
    }
    loadDetails();
  }, [activeCode]);

  // 3. Current Series & Slices
  const currentSeries = useMemo(() => {
    if (!moduleDetails) return null;
    return moduleDetails.series.find((s) => s.id === activeSeriesId) || moduleDetails.series[0] || null;
  }, [moduleDetails, activeSeriesId]);

  const totalSlices = currentSeries?.slices.length || 1;
  const currentSlice = currentSeries?.slices[currentSliceIndex] || { sort_order: 1 };

  // 4. Fetch Slice Annotations
  useEffect(() => {
    if (!currentSeries || !currentSeries.slices[currentSliceIndex]) return;
    const sliceId = currentSeries.slices[currentSliceIndex].id;
    async function loadSlice() {
      try {
        const res = await fetch(`/api/anatomy/slice/${sliceId}`);
        if (!res.ok) return;
        const json = await res.json();
        setAnnotations({ points: json.points || [], scout_lines: json.scout_lines || [] });
      } catch (err) {
        console.error('[useAtlasCompanion] loadSlice error:', err);
      }
    }
    loadSlice();
  }, [currentSeries, currentSliceIndex]);

  return {
    modules,
    activeCode,
    setActiveCode,
    moduleDetails,
    activeSeriesId,
    setActiveSeriesId,
    currentSeries,
    currentSliceIndex,
    setCurrentSliceIndex,
    currentSlice,
    totalSlices,
    annotations,
  };
}
