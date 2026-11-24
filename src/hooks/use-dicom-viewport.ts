'use client';

import { useState, useRef, useCallback, useEffect } from 'react';
import type { DicomTool } from '@/components/dicom/dicom-toolbar';
import type { MobileTouchMode } from '@/types/viewport';
import { useDicomTouch } from './use-dicom-touch';

interface UseDicomViewportOptions {
  maxSlices: number;
  initialWw?: number;
  initialWc?: number;
  containerRef?: React.RefObject<HTMLElement | null>;
  onSliceChange?: (slice: number) => void;
  touchMode?: MobileTouchMode;
  externalZoom?: number;
  onZoomChange?: (zoom: number) => void;
  externalPan?: { x: number; y: number };
  onPanChange?: (pan: { x: number; y: number }, delta?: { dx: number; dy: number }) => void;
  onLongPress?: (x: number, y: number) => void;
}

export function useDicomViewport({
  maxSlices,
  initialWw = 350,
  initialWc = 50,
  containerRef,
  onSliceChange,
  touchMode = 'scrub',
  externalZoom,
  onZoomChange,
  externalPan,
  onPanChange,
  onLongPress,
}: UseDicomViewportOptions) {
  const [zoom, setZoom] = useState(1);
  const [pan, setPan] = useState({ x: 0, y: 0 });
  const [slice, setSliceState] = useState(0);
  const [ww, setWw] = useState(initialWw);
  const [wc, setWc] = useState(initialWc);
  const [isSpacePressed, setIsSpacePressed] = useState(false);

  const onZoomChangeRef = useRef(onZoomChange);
  const onPanChangeRef = useRef(onPanChange);
  useEffect(() => {
    onZoomChangeRef.current = onZoomChange;
    onPanChangeRef.current = onPanChange;
  });

  // Synchronize incoming external zoom from linked viewports
  useEffect(() => {
    if (typeof externalZoom === 'number' && externalZoom > 0 && Math.abs(externalZoom - zoom) > 0.005) {
      setZoom(externalZoom);
    }
  }, [externalZoom, zoom]);

  // Synchronize incoming external pan from linked viewports
  useEffect(() => {
    if (externalPan && (externalPan.x !== pan.x || externalPan.y !== pan.y)) {
      setPan(externalPan);
    }
  }, [externalPan, pan.x, pan.y]);

  const sliceRef = useRef(0);
  sliceRef.current = slice;

  const onSliceChangeRef = useRef(onSliceChange);
  useEffect(() => {
    onSliceChangeRef.current = onSliceChange;
  });

  const isDragging = useRef(false);
  const lastPos = useRef<{ x: number; y: number } | null>(null);

  // Spacebar Press-and-Hold for Pan Tool override
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      const target = e.target as HTMLElement;
      if (target?.tagName === 'INPUT' || target?.tagName === 'TEXTAREA' || target?.isContentEditable) return;
      if (e.code === 'Space' && !e.repeat) {
        e.preventDefault();
        setIsSpacePressed(true);
      }
    };
    const handleKeyUp = (e: KeyboardEvent) => {
      if (e.code === 'Space') {
        setIsSpacePressed(false);
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    window.addEventListener('keyup', handleKeyUp);
    return () => {
      window.removeEventListener('keydown', handleKeyDown);
      window.removeEventListener('keyup', handleKeyUp);
    };
  }, []);

  const setSlice = useCallback((val: number | ((prev: number) => number)) => {
    const current = sliceRef.current;
    const next = typeof val === 'function' ? val(current) : val;
    const clamped = Math.max(0, Math.min(Math.max(0, maxSlices - 1), next));
    sliceRef.current = clamped;
    setSliceState(clamped);
  }, [maxSlices]);

  const changeSliceByUser = useCallback((val: number | ((prev: number) => number)) => {
    const current = sliceRef.current;
    const next = typeof val === 'function' ? val(current) : val;
    const clamped = Math.max(0, Math.min(Math.max(0, maxSlices - 1), next));
    sliceRef.current = clamped;
    setSliceState(clamped);
    if (clamped !== current) {
      onSliceChangeRef.current?.(clamped);
    }
  }, [maxSlices]);

  // Global slice stepping event listener (triggered by header buttons << < > >>)
  useEffect(() => {
    const handleSliceStep = (e: Event) => {
      const detail = (e as CustomEvent)?.detail;
      if (!detail) return;
      if (detail.action === 'prev') {
        changeSliceByUser((s) => s - 1);
      } else if (detail.action === 'next') {
        changeSliceByUser((s) => s + 1);
      } else if (detail.action === 'first') {
        changeSliceByUser(0);
      } else if (detail.action === 'last') {
        changeSliceByUser(maxSlices - 1);
      }
    };
    window.addEventListener('zen:dicom:step-slice', handleSliceStep);
    return () => window.removeEventListener('zen:dicom:step-slice', handleSliceStep);
  }, [changeSliceByUser, maxSlices]);

  const resetViewport = useCallback(() => {
    setZoom(1);
    setPan({ x: 0, y: 0 });
  }, []);

  const wheelDeltaAccumulator = useRef(0);
  const lastWheelTimestamp = useRef(0);

  // Precision Focal Cursor Zoom on Trackpad Pinch / Ctrl+Wheel / Zoom Tool
  const handleWheel = useCallback((e: React.WheelEvent | WheelEvent, activeTool: DicomTool) => {
    e.preventDefault();
    if (activeTool === 'zoom' || e.ctrlKey || e.metaKey) {
      let rawDelta = e.deltaY;
      if (e.deltaMode === 1) rawDelta *= 20;
      else if (e.deltaMode === 2) rawDelta *= 60;

      const clampedDelta = Math.max(-60, Math.min(60, rawDelta));
      const zoomFactor = Math.exp(-clampedDelta * 0.002);

      setZoom((prevZoom) => {
        const newZoom = Math.max(0.2, Math.min(10.0, Number((prevZoom * zoomFactor).toFixed(3))));
        if (newZoom !== prevZoom && containerRef?.current) {
          const rect = containerRef.current.getBoundingClientRect();
          const mouseX = e.clientX - (rect.left + rect.width / 2);
          const mouseY = e.clientY - (rect.top + rect.height / 2);
          const zoomRatio = newZoom / prevZoom;
          const nextPan = {
            x: Number((mouseX - (mouseX - pan.x) * zoomRatio).toFixed(1)),
            y: Number((mouseY - (mouseY - pan.y) * zoomRatio).toFixed(1)),
          };
          setPan(nextPan);
          onPanChangeRef.current?.(nextPan);
        }
        onZoomChangeRef.current?.(newZoom);
        return newZoom;
      });
    } else {
      const now = typeof performance !== 'undefined' ? performance.now() : Date.now();
      if (now - lastWheelTimestamp.current > 200) {
        wheelDeltaAccumulator.current = 0;
      }
      lastWheelTimestamp.current = now;

      let delta = e.deltaY;
      if (e.deltaMode === 1) delta *= 33;
      else if (e.deltaMode === 2) delta *= 100;

      wheelDeltaAccumulator.current += delta;
      const THRESHOLD = 60;

      if (Math.abs(wheelDeltaAccumulator.current) >= THRESHOLD) {
        const steps = Math.trunc(wheelDeltaAccumulator.current / THRESHOLD);
        wheelDeltaAccumulator.current -= steps * THRESHOLD;
        const clampedSteps = Math.max(-2, Math.min(2, steps));
        changeSliceByUser((s) => s + clampedSteps);
      }
    }
  }, [changeSliceByUser, containerRef]);

  const handlePointerDown = useCallback((e: React.PointerEvent) => {
    if (e.pointerType === 'touch') return;
    isDragging.current = true;
    lastPos.current = { x: e.clientX, y: e.clientY };
    (e.target as HTMLElement).setPointerCapture?.(e.pointerId);
  }, []);

  const handlePointerMove = useCallback((e: React.PointerEvent, activeTool: DicomTool) => {
    if (e.pointerType === 'touch') return;
    if (!isDragging.current || !lastPos.current) return;
    const dx = e.clientX - lastPos.current.x;
    const dy = e.clientY - lastPos.current.y;
    lastPos.current = { x: e.clientX, y: e.clientY };

    if (isSpacePressed || activeTool === 'pan' || e.buttons === 2 || e.buttons === 4) {
      setPan((p) => {
        const nextPan = { x: p.x + dx, y: p.y + dy };
        onPanChangeRef.current?.(nextPan, { dx, dy });
        return nextPan;
      });
    } else if (activeTool === 'zoom') {
      const zoomFactor = Math.exp(-dy * 0.005);
      setZoom((z) => {
        const nextZoom = Math.max(0.2, Math.min(10.0, Number((z * zoomFactor).toFixed(3))));
        onZoomChangeRef.current?.(nextZoom);
        return nextZoom;
      });
    } else if (activeTool === 'wl') {
      setWw((w) => {
        const sens = Math.max(1, Math.round(w * 0.005));
        return Math.max(1, w + dx * sens);
      });
      setWc((c) => {
        const sens = Math.max(1, Math.round(Math.abs(c || 100) * 0.005));
        return c - dy * sens;
      });
    }
  }, [isSpacePressed]);

  const handlePointerUp = useCallback((e: React.PointerEvent) => {
    if (e.pointerType === 'touch') return;
    isDragging.current = false;
    lastPos.current = null;
    (e.target as HTMLElement).releasePointerCapture?.(e.pointerId);
  }, []);

  const handleEdgeScrub = useCallback((ratio: number) => {
    const clampedRatio = Math.max(0, Math.min(1, ratio));
    const targetSlice = Math.round(clampedRatio * Math.max(0, maxSlices - 1));
    changeSliceByUser(targetSlice);
  }, [changeSliceByUser, maxSlices]);

  const { handleTouchStart, handleTouchMove, handleTouchEnd } = useDicomTouch({
    resetViewport,
    setZoom,
    setPan,
    setWw,
    setWc,
    changeSliceByUser,
    isSpacePressed,
    containerRef,
    touchMode,
    onZoomChange,
    onPanChange,
    onLongPress,
  });

  return {
    zoom,
    setZoom,
    pan,
    setPan,
    slice,
    setSlice,
    changeSliceByUser,
    handleEdgeScrub,
    ww,
    setWw,
    wc,
    setWc,
    isSpacePressed,
    resetViewport,
    handleWheel,
    handlePointerDown,
    handlePointerMove,
    handlePointerUp,
    handleTouchStart,
    handleTouchMove,
    handleTouchEnd,
  };
}
