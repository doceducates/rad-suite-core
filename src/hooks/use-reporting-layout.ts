'use client';

import { useState, useEffect, useCallback, useRef } from 'react';

export type ReportingMode = 'fab' | 'split' | 'modal' | 'full';

const STORAGE_KEY_MODE = 'radsuite_reporting_mode';
const STORAGE_KEY_SPLIT = 'radsuite_split_percent';

export function useReportingLayout() {
  // Stable initial state matching SSR to prevent hydration mismatch; hydrated in useEffect
  const [reportingMode, setReportingModeState] = useState<ReportingMode>('split');
  const [splitPercent, setSplitPercentState] = useState<number>(50);

  const [isDragging, setIsDragging] = useState<boolean>(false);
  const containerRef = useRef<HTMLDivElement | null>(null);

  // Hydrate from localStorage on client mount, tailoring default to screen size
  useEffect(() => {
    if (typeof window === 'undefined') return;
    const isMobile = window.innerWidth < 768;
    const savedMode = localStorage.getItem(STORAGE_KEY_MODE) as ReportingMode;
    if (savedMode && ['fab', 'split', 'modal', 'full'].includes(savedMode)) {
      setReportingModeState(isMobile && savedMode === 'split' ? 'fab' : savedMode);
    }
    const savedSplit = localStorage.getItem(STORAGE_KEY_SPLIT);
    if (savedSplit) {
      const parsed = parseFloat(savedSplit);
      if (!isNaN(parsed) && parsed >= 25 && parsed <= 75) {
        setSplitPercentState(parsed);
      }
    }
  }, []);

  const setReportingMode = useCallback((mode: ReportingMode) => {
    setReportingModeState(mode);
    if (typeof window !== 'undefined') {
      localStorage.setItem(STORAGE_KEY_MODE, mode);
    }
  }, []);

  const setSplitPercent = useCallback((percent: number) => {
    const clamped = Math.max(25, Math.min(75, Math.round(percent * 10) / 10));
    setSplitPercentState(clamped);
    if (typeof window !== 'undefined') {
      localStorage.setItem(STORAGE_KEY_SPLIT, clamped.toString());
    }
  }, []);

  const resetSplit = useCallback(() => {
    setSplitPercent(50);
  }, [setSplitPercent]);

  // Global Alt+1, Alt+2, Alt+3, Alt+4 shortcuts for fast mode switching
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      const target = e.target as HTMLElement;
      if (target?.tagName === 'INPUT' || target?.tagName === 'TEXTAREA' || target?.isContentEditable) return;
      if (e.altKey) {
        if (e.key === '1') { e.preventDefault(); setReportingMode('fab'); }
        else if (e.key === '2') { e.preventDefault(); setReportingMode('split'); }
        else if (e.key === '3') { e.preventDefault(); setReportingMode('modal'); }
        else if (e.key === '4') { e.preventDefault(); setReportingMode('full'); }
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [setReportingMode]);

  return {
    reportingMode,
    setReportingMode,
    splitPercent,
    setSplitPercent,
    resetSplit,
    isDragging,
    setIsDragging,
    containerRef,
  };
}
