'use client';

import { useState, useRef, useCallback } from 'react';
import { resolveChord, VitreaInteractionChord } from '@/services/vitrea-chording.service';
import type { DicomTool } from '@/components/dicom/dicom-toolbar';

interface UseVitreaViewportInteractionsOptions {
  activeTool: DicomTool;
  onSelectTool?: (tool: DicomTool) => void;
  onStepSlice: (delta: number) => void;
  ww: number;
  wc: number;
  setWw: (val: number | ((prev: number) => number)) => void;
  setWc: (val: number | ((prev: number) => number)) => void;
  setPan: React.Dispatch<React.SetStateAction<{ x: number; y: number }>>;
  setZoom: React.Dispatch<React.SetStateAction<number>>;
  isMobile?: boolean;
}

export function useVitreaViewportInteractions({
  activeTool,
  onStepSlice,
  ww,
  wc,
  setWw,
  setWc,
  setPan,
  setZoom,
  isMobile = false,
}: UseVitreaViewportInteractionsOptions) {
  const [hudOpen, setHudOpen] = useState(false);
  const [hudPos, setHudPos] = useState<{ x: number; y: number } | null>(null);
  const [reticle, setReticle] = useState<{ visible: boolean; x: number; y: number; text?: string }>({
    visible: false,
    x: 0,
    y: 0,
  });

  const dragRef = useRef<{
    chord: VitreaInteractionChord;
    startX: number;
    startY: number;
    lastX: number;
    lastY: number;
    moved: boolean;
    startWw: number;
    startWc: number;
    startZoom: number;
    accumY: number;
    isRightCandidate: boolean;
  } | null>(null);

  const longPressTimerRef = useRef<any>(null);

  const handlePointerDown = useCallback((e: React.PointerEvent) => {
    if (e.pointerType === 'touch') {
      // Disambiguation: do not open HUD if a measurement caliper or ROI tool is active
      if (['length', 'angle', 'cobb', 'roi', 'rect_roi'].includes(activeTool)) {
        return;
      }
      clearTimeout(longPressTimerRef.current);
      const startX = e.clientX;
      const startY = e.clientY;
      longPressTimerRef.current = setTimeout(() => {
        setHudPos({ x: startX, y: startY });
        setHudOpen(true);
      }, 450);
      return;
    }

    const buttons = e.buttons;
    const chord = resolveChord({
      buttons,
      alt: e.altKey,
      shift: e.shiftKey,
      ctrl: e.ctrlKey,
      meta: e.metaKey,
      activeTool,
    });

    dragRef.current = {
      chord,
      startX: e.clientX,
      startY: e.clientY,
      lastX: e.clientX,
      lastY: e.clientY,
      moved: false,
      startWw: ww,
      startWc: wc,
      startZoom: 1,
      accumY: 0,
      isRightCandidate: (buttons & 2) !== 0,
    };
  }, [activeTool, ww, wc]);

  const handlePointerMove = useCallback((e: React.PointerEvent) => {
    if (e.pointerType === 'touch') {
      clearTimeout(longPressTimerRef.current);
      return;
    }

    const drag = dragRef.current;
    if (!drag) return;

    const dx = e.clientX - drag.lastX;
    const dy = e.clientY - drag.lastY;
    drag.lastX = e.clientX;
    drag.lastY = e.clientY;

    if (Math.abs(e.clientX - drag.startX) + Math.abs(e.clientY - drag.startY) > 4) {
      drag.moved = true;
    }

    // Dynamic chording update (e.g. user pressed another button while dragging)
    const currentChord = resolveChord({
      buttons: e.buttons,
      alt: e.altKey,
      shift: e.shiftKey,
      ctrl: e.ctrlKey,
      meta: e.metaKey,
      activeTool,
    });

    if (currentChord === 'wl' || drag.chord === 'wl') {
      const totalX = e.clientX - drag.startX;
      const totalY = e.clientY - drag.startY;
      setWw(Math.max(1, Math.round(drag.startWw + totalX * 2)));
      setWc(Math.round(drag.startWc - totalY * 2));
    } else if (currentChord === 'scroll' || drag.chord === 'scroll') {
      drag.accumY += dy;
      const step = Math.trunc(drag.accumY / 12);
      if (step !== 0) {
        drag.accumY -= step * 12;
        onStepSlice(-step);
      }
    } else if (currentChord === 'pan' || drag.chord === 'pan') {
      setPan((p) => ({ x: p.x + dx, y: p.y + dy }));
    } else if (currentChord === 'zoom' || drag.chord === 'zoom') {
      const factor = Math.exp(-dy * 0.005);
      setZoom((z) => Math.max(0.2, Math.min(10.0, Number((z * factor).toFixed(3)))));
    }
  }, [activeTool, onStepSlice, setPan, setWc, setWw, setZoom]);

  const handlePointerUp = useCallback((e: React.PointerEvent) => {
    clearTimeout(longPressTimerRef.current);
    const drag = dragRef.current;
    if (!drag) return;

    // If right-clicked without dragging, summon HUD menu
    if (drag.isRightCandidate && !drag.moved) {
      setHudPos({ x: e.clientX, y: e.clientY });
      setHudOpen(true);
    }

    dragRef.current = null;
  }, []);

  const openHud = useCallback((x?: number, y?: number) => {
    setHudPos(x !== undefined && y !== undefined ? { x, y } : null);
    setHudOpen(true);
  }, []);

  const closeHud = useCallback(() => {
    setHudOpen(false);
  }, []);

  return {
    hudOpen,
    hudPos,
    openHud,
    closeHud,
    reticle,
    setReticle,
    handlePointerDown,
    handlePointerMove,
    handlePointerUp,
  };
}
