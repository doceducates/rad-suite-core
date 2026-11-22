'use client';

import { useState, useEffect, useCallback, useRef } from 'react';
import {
  CompanionTab,
  isValidCompanionTab,
  normalizeCompanionTab,
} from '@/services/companion-tab.service';

export type RightColTab = CompanionTab;
export type WorkstationCenterView = 'report' | 'images';

interface ThreeColumnLayoutState {
  leftColWidth: number;
  setLeftColWidth: (w: number) => void;
  isLeftCollapsed: boolean;
  setIsLeftCollapsed: (c: boolean | ((prev: boolean) => boolean)) => void;
  toggleLeftCollapsed: () => void;
  rightColWidth: number;
  setRightColWidth: (w: number) => void;
  isRightCollapsed: boolean;
  setIsRightCollapsed: (c: boolean | ((prev: boolean) => boolean)) => void;
  toggleRightCollapsed: () => void;
  rightColTab: CompanionTab;
  setRightColTab: (tab: CompanionTab) => void;
  openRightColTab: (tab: CompanionTab) => void;
  centerView: WorkstationCenterView;
  setCenterView: (view: WorkstationCenterView) => void;
  toggleCenterView: () => void;
  isStageMaximized: boolean;
  setIsStageMaximized: (m: boolean | ((prev: boolean) => boolean)) => void;
  toggleStageMaximize: () => void;
  isDraggingDivider: 'left' | 'right' | null;
  startLeftResize: (e: React.MouseEvent) => void;
  startRightResize: (e: React.MouseEvent) => void;
}

export function useThreeColumnLayout(): ThreeColumnLayoutState {
  const [leftColWidth, setLeftColWidth] = useState(240);
  const [isLeftCollapsed, setIsLeftCollapsed] = useState(false);
  const [rightColWidth, setRightColWidth] = useState(340);
  const [isRightCollapsed, setIsRightCollapsed] = useState(false);
  const [rightColTab, setRightColTabState] = useState<CompanionTab>('insights_ddx');
  const [centerView, setCenterViewState] = useState<WorkstationCenterView>('report');
  const [isStageMaximized, setIsStageMaximized] = useState(false);
  const [isDraggingDivider, setIsDraggingDivider] = useState<'left' | 'right' | null>(null);

  const startXRef = useRef(0);
  const startWidthRef = useRef(0);

  // Load persisted widths, tab, and centerView from localStorage on mount
  useEffect(() => {
    try {
      const savedLeft = localStorage.getItem('rad_suite_left_col_w');
      if (savedLeft) setLeftColWidth(Math.max(160, Math.min(380, Number(savedLeft))));
      const savedRight = localStorage.getItem('rad_suite_right_col_w');
      if (savedRight) setRightColWidth(Math.max(240, Math.min(850, Number(savedRight))));
      const savedLeftCollapsed = localStorage.getItem('rad_suite_left_col_collapsed');
      if (savedLeftCollapsed !== null) setIsLeftCollapsed(savedLeftCollapsed === 'true');
      const savedRightCollapsed = localStorage.getItem('rad_suite_right_col_collapsed');
      if (savedRightCollapsed !== null) setIsRightCollapsed(savedRightCollapsed === 'true');
      const savedTab = localStorage.getItem('rad_suite_right_col_tab');
      if (savedTab) setRightColTabState(normalizeCompanionTab(savedTab));
      const savedCenter = localStorage.getItem('rad_suite_center_view');
      if (savedCenter === 'report' || savedCenter === 'images') setCenterViewState(savedCenter);
    } catch {}
  }, []);

  const setRightColTab = useCallback((tab: CompanionTab) => {
    setRightColTabState(tab);
    try { localStorage.setItem('rad_suite_right_col_tab', tab); } catch {}
  }, []);

  const openRightColTab = useCallback((tab: CompanionTab) => {
    setRightColTabState(tab);
    setIsRightCollapsed(false);
    try {
      localStorage.setItem('rad_suite_right_col_tab', tab);
      localStorage.setItem('rad_suite_right_col_collapsed', 'false');
    } catch {}
  }, []);

  const setCenterView = useCallback((view: WorkstationCenterView) => {
    setCenterViewState(view);
    try { localStorage.setItem('rad_suite_center_view', view); } catch {}
  }, []);

  const toggleCenterView = useCallback(() => {
    setCenterViewState((prev) => {
      const next: WorkstationCenterView = prev === 'report' ? 'images' : 'report';
      try { localStorage.setItem('rad_suite_center_view', next); } catch {}
      // Sync right companion tab intelligently
      setRightColTabState((currentTab) => {
        let updatedTab = currentTab;
        if (next === 'images' && currentTab === 'images') {
          updatedTab = 'report';
        } else if (next === 'report' && currentTab === 'report') {
          updatedTab = 'images';
        }
        try { localStorage.setItem('rad_suite_right_col_tab', updatedTab); } catch {}
        return updatedTab;
      });
      return next;
    });
  }, []);

  const toggleStageMaximize = useCallback(() => {
    setIsStageMaximized((prev) => !prev);
  }, []);

  const toggleLeftCollapsed = useCallback(() => {
    setIsLeftCollapsed((prev) => {
      const next = !prev;
      try { localStorage.setItem('rad_suite_left_col_collapsed', String(next)); } catch {}
      return next;
    });
  }, []);

  const toggleRightCollapsed = useCallback(() => {
    setIsRightCollapsed((prev) => {
      const next = !prev;
      try { localStorage.setItem('rad_suite_right_col_collapsed', String(next)); } catch {}
      return next;
    });
  }, []);

  const startLeftResize = useCallback((e: React.MouseEvent) => {
    e.preventDefault();
    setIsDraggingDivider('left');
    startXRef.current = e.clientX;
    startWidthRef.current = leftColWidth;
    document.body.style.cursor = 'col-resize';
    document.body.style.userSelect = 'none';

    const handleMouseMove = (moveEvent: MouseEvent) => {
      const delta = moveEvent.clientX - startXRef.current;
      const newWidth = Math.max(160, Math.min(450, startWidthRef.current + delta));
      setLeftColWidth(newWidth);
      try { localStorage.setItem('rad_suite_left_col_w', String(newWidth)); } catch {}
    };

    const handleMouseUp = () => {
      setIsDraggingDivider(null);
      document.body.style.cursor = '';
      document.body.style.userSelect = '';
      window.removeEventListener('mousemove', handleMouseMove);
      window.removeEventListener('mouseup', handleMouseUp);
    };

    window.addEventListener('mousemove', handleMouseMove);
    window.addEventListener('mouseup', handleMouseUp);
  }, [leftColWidth]);

  const startRightResize = useCallback((e: React.MouseEvent) => {
    e.preventDefault();
    setIsDraggingDivider('right');
    startXRef.current = e.clientX;
    startWidthRef.current = rightColWidth;
    document.body.style.cursor = 'col-resize';
    document.body.style.userSelect = 'none';

    const handleMouseMove = (moveEvent: MouseEvent) => {
      const delta = startXRef.current - moveEvent.clientX;
      const maxW = typeof window !== 'undefined' ? Math.min(850, Math.round(window.innerWidth * 0.65)) : 600;
      const newWidth = Math.max(240, Math.min(maxW, startWidthRef.current + delta));
      setRightColWidth(newWidth);
      try { localStorage.setItem('rad_suite_right_col_w', String(newWidth)); } catch {}
    };

    const handleMouseUp = () => {
      setIsDraggingDivider(null);
      document.body.style.cursor = '';
      document.body.style.userSelect = '';
      window.removeEventListener('mousemove', handleMouseMove);
      window.removeEventListener('mouseup', handleMouseUp);
    };

    window.addEventListener('mousemove', handleMouseMove);
    window.addEventListener('mouseup', handleMouseUp);
  }, [rightColWidth]);

  return {
    leftColWidth,
    setLeftColWidth,
    isLeftCollapsed,
    setIsLeftCollapsed,
    toggleLeftCollapsed,
    rightColWidth,
    setRightColWidth,
    isRightCollapsed,
    setIsRightCollapsed,
    toggleRightCollapsed,
    rightColTab,
    setRightColTab,
    openRightColTab,
    centerView,
    setCenterView,
    toggleCenterView,
    isStageMaximized,
    setIsStageMaximized,
    toggleStageMaximize,
    isDraggingDivider,
    startLeftResize,
    startRightResize,
  };
}
