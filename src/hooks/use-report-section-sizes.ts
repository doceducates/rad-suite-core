'use client';

import { useState, useCallback } from 'react';

const DEFAULT_HISTORY_HEIGHT = 90;
const DEFAULT_IMPRESSION_HEIGHT = 150;
const MIN_HISTORY_HEIGHT = 45;
const MAX_HISTORY_HEIGHT = 260;
const MIN_IMPRESSION_HEIGHT = 70;
const MAX_IMPRESSION_HEIGHT = 360;

export function useReportSectionSizes() {
  const [historyHeight, setHistoryHeight] = useState(DEFAULT_HISTORY_HEIGHT);
  const [impressionHeight, setImpressionHeight] = useState(DEFAULT_IMPRESSION_HEIGHT);
  const [isHistoryCollapsed, setIsHistoryCollapsed] = useState(false);
  const [isFindingsCollapsed, setIsFindingsCollapsed] = useState(false);
  const [isImpressionCollapsed, setIsImpressionCollapsed] = useState(false);

  const resizeHistory = useCallback((deltaY: number) => {
    setHistoryHeight((prev) => Math.max(MIN_HISTORY_HEIGHT, Math.min(MAX_HISTORY_HEIGHT, prev + deltaY)));
  }, []);

  const resizeImpression = useCallback((deltaY: number) => {
    // Dragging handle up (negative deltaY) increases Impression height
    setImpressionHeight((prev) => Math.max(MIN_IMPRESSION_HEIGHT, Math.min(MAX_IMPRESSION_HEIGHT, prev - deltaY)));
  }, []);

  const resetSizes = useCallback(() => {
    setHistoryHeight(DEFAULT_HISTORY_HEIGHT);
    setImpressionHeight(DEFAULT_IMPRESSION_HEIGHT);
    setIsHistoryCollapsed(false);
    setIsFindingsCollapsed(false);
    setIsImpressionCollapsed(false);
  }, []);

  const toggleHistoryCollapse = useCallback(() => {
    setIsHistoryCollapsed((prev) => !prev);
  }, []);

  const toggleFindingsCollapse = useCallback(() => {
    setIsFindingsCollapsed((prev) => !prev);
  }, []);

  const toggleImpressionCollapse = useCallback(() => {
    setIsImpressionCollapsed((prev) => !prev);
  }, []);

  return {
    historyHeight,
    impressionHeight,
    isHistoryCollapsed,
    isFindingsCollapsed,
    isImpressionCollapsed,
    toggleHistoryCollapse,
    toggleFindingsCollapse,
    toggleImpressionCollapse,
    resizeHistory,
    resizeImpression,
    resetSizes,
  };
}
