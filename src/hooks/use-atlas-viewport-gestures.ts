'use client';

// Layer 2: Atlas Viewport Shortcuts, RAF Cine Scrub & Pinch-to-Zoom (<250 lines)
import { useEffect, useRef, useState } from 'react';

interface UseAtlasViewportGesturesOptions {
  containerRef: React.RefObject<HTMLDivElement | null>;
  currentSliceIndex: number;
  totalSlices: number;
  onSliceChange: (index: number) => void;
  toolMode: 'scrub' | 'pan';
  setToolMode: (mode: 'scrub' | 'pan') => void;
  zoom: number;
  setZoom: React.Dispatch<React.SetStateAction<number>>;
  pan: { x: number; y: number };
  setPan: React.Dispatch<React.SetStateAction<{ x: number; y: number }>>;
  onTogglePlay?: () => void;
  onTogglePins?: () => void;
  onToggleMask?: () => void;
  onToggleQuiz?: () => void;
  onToggleLanguage?: () => void;
  onSelectStructure?: (id: number | null) => void;
  onCycleTextSize?: () => void;
  onToggleFullscreen?: () => void;
}

export function useAtlasViewportGestures({
  containerRef,
  currentSliceIndex,
  totalSlices,
  onSliceChange,
  toolMode,
  setToolMode,
  zoom,
  setZoom,
  pan,
  setPan,
  onTogglePlay,
  onTogglePins,
  onToggleMask,
  onToggleQuiz,
  onToggleLanguage,
  onSelectStructure,
  onCycleTextSize,
  onToggleFullscreen,
}: UseAtlasViewportGesturesOptions) {
  const [dragStartPos, setDragStartPos] = useState<{ x: number; y: number } | null>(null);
  const [dragStartSlice, setDragStartSlice] = useState<number>(0);
  const [dragStartPan, setDragStartPan] = useState<{ x: number; y: number }>({ x: 0, y: 0 });
  const [activeDragButton, setActiveDragButton] = useState<number>(0);

  // Multi-touch pinch tracking & RAF coalescing
  const touchStartDistRef = useRef<number | null>(null);
  const touchStartZoomRef = useRef<number>(1.0);
  const touchStartCenterRef = useRef<{ x: number; y: number }>({ x: 0, y: 0 });
  const touchStartPanRef = useRef<{ x: number; y: number }>({ x: 0, y: 0 });
  const wheelAccumulatorRef = useRef<number>(0);
  const latestMoveRef = useRef<{ clientX: number; clientY: number } | null>(null);
  const animFrameIdRef = useRef<number | null>(null);

  // 1. Keyboard Shortcuts
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      const target = e.target as HTMLElement;
      if (target?.tagName === 'INPUT' || target?.tagName === 'TEXTAREA' || target?.isContentEditable) return;

      switch (e.key.toLowerCase()) {
        case 's': setToolMode('scrub'); break;
        case 'p': case 'h': setToolMode('pan'); break;
        case 'z':
          setZoom((prev) => (prev < 1.4 ? 1.6 : prev < 2.2 ? 2.4 : 1.0));
          setPan({ x: 0, y: 0 });
          break;
        case '+': case '=': setZoom((z) => Math.min(3.5, +(z + 0.25).toFixed(2))); break;
        case '-': case '_': setZoom((z) => Math.max(0.75, +(z - 0.25).toFixed(2))); break;
        case '0': case 'r': setZoom(1.0); setPan({ x: 0, y: 0 }); break;
        case 'm': onToggleMask?.(); break;
        case 'e': onTogglePins?.(); break;
        case 'q': onToggleQuiz?.(); break;
        case 'l': onToggleLanguage?.(); break;
        case ' ': e.preventDefault(); onTogglePlay?.(); break;
        case 'arrowleft': case 'arrowup':
          e.preventDefault();
          onSliceChange(Math.max(0, currentSliceIndex - 1));
          break;
        case 'arrowright': case 'arrowdown':
          e.preventDefault();
          onSliceChange(Math.min(totalSlices - 1, currentSliceIndex + 1));
          break;
        case 't': onCycleTextSize?.(); break;
        case 'f': onToggleFullscreen?.(); break;
        case 'escape': onSelectStructure?.(null); break;
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [
    currentSliceIndex, totalSlices, onSliceChange, setToolMode, setZoom, setPan,
    onToggleMask, onTogglePins, onToggleQuiz, onToggleLanguage, onTogglePlay,
    onCycleTextSize, onSelectStructure, onToggleFullscreen,
  ]);

  // 2. Non-passive Wheel Navigation (respects sequence dock and Ctrl+wheel zoom)
  useEffect(() => {
    const el = containerRef.current;
    if (!el) return;

    const onWheel = (e: WheelEvent) => {
      const target = e.target as HTMLElement;
      if (target?.closest('[data-scrollable="true"]') || target?.closest('.overflow-y-auto') || target?.closest('aside')) return;

      e.preventDefault();
      e.stopPropagation();

      // Ctrl + Wheel = Smooth Calibrated Zoom (fine 0.04-0.08 steps)
      if (e.ctrlKey || e.metaKey) {
        const zoomStep = Math.min(0.08, Math.max(0.03, Math.abs(e.deltaY) * 0.0006));
        const factor = e.deltaY < 0 ? zoomStep : -zoomStep;
        setZoom((z) => Math.min(3.5, Math.max(0.75, +(z + factor).toFixed(2))));
        return;
      }

      // Plain Wheel = Smooth Accumulated Slices (Eliminates runaway)
      const WHEEL_THRESHOLD = 45;
      wheelAccumulatorRef.current += e.deltaY;
      if (Math.abs(wheelAccumulatorRef.current) >= WHEEL_THRESHOLD) {
        const step = Math.sign(wheelAccumulatorRef.current);
        wheelAccumulatorRef.current = 0;
        const nextIndex = Math.min(Math.max(0, currentSliceIndex + step), totalSlices - 1);
        if (nextIndex !== currentSliceIndex) onSliceChange(nextIndex);
      }
    };

    el.addEventListener('wheel', onWheel, { passive: false });
    return () => el.removeEventListener('wheel', onWheel);
  }, [containerRef, currentSliceIndex, totalSlices, onSliceChange, setZoom]);

  // 3. Pointer Handlers with RAF Coalescing (14px per slice step for ultra-smooth cine scrub)
  const handlePointerDown = (e: React.PointerEvent) => {
    if (e.button !== 0 && e.button !== 1) return;
    const target = e.target as HTMLElement;
    if (target.closest('button') || target.closest('input') || target.closest('g') || target.closest('[data-scrollable="true"]') || target.closest('aside')) return;

    if (e.button === 0) onSelectStructure?.(null);

    setActiveDragButton(e.button);
    setDragStartPos({ x: e.clientX, y: e.clientY });
    setDragStartSlice(currentSliceIndex);
    setDragStartPan(pan);
    (e.currentTarget as HTMLElement).setPointerCapture(e.pointerId);
  };

  const handlePointerMove = (e: React.PointerEvent) => {
    if (!dragStartPos) return;
    latestMoveRef.current = { clientX: e.clientX, clientY: e.clientY };

    if (animFrameIdRef.current === null) {
      animFrameIdRef.current = requestAnimationFrame(() => {
        animFrameIdRef.current = null;
        if (!dragStartPos || !latestMoveRef.current) return;
        const { clientX, clientY } = latestMoveRef.current;

        if (activeDragButton === 1 || toolMode === 'pan') {
          const deltaX = clientX - dragStartPos.x;
          const deltaY = clientY - dragStartPos.y;
          setPan({ x: dragStartPan.x + deltaX, y: dragStartPan.y + deltaY });
        } else {
          // 14px per slice step: identical to IMAIOS / Vitrea scrub feel
          const deltaY = clientY - dragStartPos.y;
          const SCRUB_STEP_PX = 14;
          const stepDelta = Math.round(deltaY / SCRUB_STEP_PX);
          const nextIndex = Math.min(Math.max(0, dragStartSlice + stepDelta), totalSlices - 1);
          if (nextIndex !== currentSliceIndex) onSliceChange(nextIndex);
        }
      });
    }
  };

  const handlePointerUp = (e: React.PointerEvent) => {
    if (animFrameIdRef.current !== null) {
      cancelAnimationFrame(animFrameIdRef.current);
      animFrameIdRef.current = null;
    }
    setDragStartPos(null);
    latestMoveRef.current = null;
    try {
      (e.currentTarget as HTMLElement).releasePointerCapture(e.pointerId);
    } catch {}
  };

  // 4. Double Click Cycle
  const handleDoubleClick = (e: React.MouseEvent) => {
    if ((e.target as HTMLElement).closest('button') || (e.target as HTMLElement).closest('input')) return;
    setZoom((prev) => (prev < 1.4 ? 1.6 : prev < 2.2 ? 2.4 : 1.0));
    setPan({ x: 0, y: 0 });
  };

  // 5. Mobile & Tablet Touch Pinch-to-Zoom
  const handleTouchStart = (e: React.TouchEvent) => {
    if (e.touches.length === 2) {
      const t0 = e.touches[0];
      const t1 = e.touches[1];
      touchStartDistRef.current = Math.hypot(t1.clientX - t0.clientX, t1.clientY - t0.clientY);
      touchStartZoomRef.current = zoom;
      touchStartCenterRef.current = { x: (t0.clientX + t1.clientX) / 2, y: (t0.clientY + t1.clientY) / 2 };
      touchStartPanRef.current = pan;
    }
  };

  const handleTouchMove = (e: React.TouchEvent) => {
    if (e.touches.length === 2 && touchStartDistRef.current) {
      e.preventDefault();
      const t0 = e.touches[0];
      const t1 = e.touches[1];
      const currentDist = Math.hypot(t1.clientX - t0.clientX, t1.clientY - t0.clientY);
      const rawRatio = currentDist / touchStartDistRef.current;
      const dampedRatio = 1 + (rawRatio - 1) * 0.85;
      const nextZoom = Math.min(3.5, Math.max(0.75, +(touchStartZoomRef.current * dampedRatio).toFixed(2)));
      setZoom(nextZoom);

      const currentCenter = { x: (t0.clientX + t1.clientX) / 2, y: (t0.clientY + t1.clientY) / 2 };
      const dx = currentCenter.x - touchStartCenterRef.current.x;
      const dy = currentCenter.y - touchStartCenterRef.current.y;
      setPan({ x: touchStartPanRef.current.x + dx, y: touchStartPanRef.current.y + dy });
    }
  };

  const handleTouchEnd = (e: React.TouchEvent) => {
    if (e.touches.length < 2) touchStartDistRef.current = null;
  };

  useEffect(() => {
    return () => {
      if (animFrameIdRef.current !== null) cancelAnimationFrame(animFrameIdRef.current);
    };
  }, []);

  return {
    handlePointerDown,
    handlePointerMove,
    handlePointerUp,
    handleDoubleClick,
    handleTouchStart,
    handleTouchMove,
    handleTouchEnd,
    isDragging: Boolean(dragStartPos),
  };
}
