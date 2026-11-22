'use client';

// Layer 4: Atlas Global & Study Navigation Hook (<140 lines)
import { useState, useRef, useEffect, useCallback } from 'react';
import type { AnatomyModuleDetails, AnatomySeries } from '@/types';

interface UseAtlasNavigationProps {
  activeCode: string;
  setActiveCode: (code: string) => void;
  activeSeriesId: number;
  setActiveSeriesId: (id: number) => void;
  currentSeries: AnatomySeries | null;
  moduleDetails: AnatomyModuleDetails | null;
  setCurrentSliceIndex: (idx: number) => void;
  setSelectedStructureId: (id: number | null) => void;
  setShowPins: (show: boolean) => void;
  setIsSelectorOpen: (open: boolean) => void;
}

export function useAtlasNavigation({
  activeCode,
  setActiveCode,
  activeSeriesId,
  setActiveSeriesId,
  currentSeries,
  moduleDetails,
  setCurrentSliceIndex,
  setSelectedStructureId,
  setShowPins,
  setIsSelectorOpen,
}: UseAtlasNavigationProps) {
  const [isGlobalSearchOpen, setIsGlobalSearchOpen] = useState(false);
  const pendingNavRef = useRef<{
    moduleCode: string;
    seriesId?: number;
    sliceSort?: number;
    sliceId?: number;
    structureId?: number;
  } | null>(null);

  // Global search shortcut listener (Ctrl+K, Cmd+K, /)
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 'k') {
        e.preventDefault();
        setIsGlobalSearchOpen((v) => !v);
      } else if (
        e.key === '/' &&
        document.activeElement?.tagName !== 'INPUT' &&
        document.activeElement?.tagName !== 'TEXTAREA'
      ) {
        e.preventDefault();
        setIsGlobalSearchOpen(true);
      }
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, []);

  // When moduleDetails finishes loading, consume any pending navigation
  useEffect(() => {
    const pending = pendingNavRef.current;
    if (!pending || !moduleDetails || moduleDetails.code !== pending.moduleCode) return;
    pendingNavRef.current = null;

    if (pending.seriesId) {
      setActiveSeriesId(pending.seriesId);
    }
    const se = moduleDetails.series.find((s) => s.id === (pending.seriesId || activeSeriesId)) || moduleDetails.series[0];
    if (se && se.slices) {
      const idx = se.slices.findIndex((sl) => sl.id === pending.sliceId || sl.sort_order === pending.sliceSort);
      setCurrentSliceIndex(idx !== -1 ? idx : 0);
    }
    if (pending.structureId) {
      setSelectedStructureId(pending.structureId);
      setShowPins(true);
    }
  }, [moduleDetails, activeSeriesId, setActiveSeriesId, setCurrentSliceIndex, setSelectedStructureId, setShowPins]);

  // Navigate within study (from sidebar structure search)
  const handleNavigateToSlice = useCallback(
    (target: { seriesId?: number; sliceSort?: number; sliceId?: number; structureId: number }) => {
      if (target.seriesId && target.seriesId !== activeSeriesId) {
        setActiveSeriesId(target.seriesId);
      }
      const se =
        moduleDetails?.series.find((s) => s.id === (target.seriesId || activeSeriesId)) || currentSeries;
      if (se && se.slices) {
        const idx = se.slices.findIndex((s) => s.id === target.sliceId || s.sort_order === target.sliceSort);
        if (idx !== -1) {
          setCurrentSliceIndex(idx);
        }
      }
      setSelectedStructureId(target.structureId);
      setShowPins(true);
    },
    [activeSeriesId, currentSeries, moduleDetails, setActiveSeriesId, setCurrentSliceIndex, setSelectedStructureId, setShowPins]
  );

  // Navigate across all studies (from global search dialog)
  const handleGlobalNavigate = useCallback(
    (target: {
      moduleCode: string;
      seriesId?: number;
      sliceSort?: number;
      sliceId?: number;
      structureId?: number;
    }) => {
      setIsSelectorOpen(false);
      if (target.moduleCode !== activeCode) {
        pendingNavRef.current = target;
        setActiveCode(target.moduleCode);
        return;
      }
      if (target.seriesId && target.seriesId !== activeSeriesId) {
        setActiveSeriesId(target.seriesId);
      }
      const se =
        moduleDetails?.series.find((s) => s.id === (target.seriesId || activeSeriesId)) || currentSeries;
      if (se && se.slices) {
        const idx = se.slices.findIndex((s) => s.id === target.sliceId || s.sort_order === target.sliceSort);
        if (idx !== -1) {
          setCurrentSliceIndex(idx);
        }
      }
      if (target.structureId) {
        setSelectedStructureId(target.structureId);
        setShowPins(true);
      }
    },
    [activeCode, activeSeriesId, currentSeries, moduleDetails, setActiveCode, setActiveSeriesId, setCurrentSliceIndex, setIsSelectorOpen, setSelectedStructureId, setShowPins]
  );

  return {
    isGlobalSearchOpen,
    setIsGlobalSearchOpen,
    handleNavigateToSlice,
    handleGlobalNavigate,
  };
}
