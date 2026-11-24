'use client';

import { useRef, useCallback } from 'react';
import type { DicomTool } from '@/components/dicom/dicom-toolbar';
import type { MobileTouchMode } from '@/types/viewport';

interface UseDicomTouchOptions {
  resetViewport: () => void;
  setZoom: React.Dispatch<React.SetStateAction<number>>;
  setPan: React.Dispatch<React.SetStateAction<{ x: number; y: number }>>;
  setWw: React.Dispatch<React.SetStateAction<number>>;
  setWc: React.Dispatch<React.SetStateAction<number>>;
  changeSliceByUser: (val: number | ((prev: number) => number)) => void;
  isSpacePressed: boolean;
  containerRef?: React.RefObject<HTMLElement | null>;
  touchMode?: MobileTouchMode;
  onZoomChange?: (z: number) => void;
  onPanChange?: (p: { x: number; y: number }, delta?: { dx: number; dy: number }) => void;
  onLongPress?: (x: number, y: number) => void;
}

export function useDicomTouch({
  resetViewport,
  setZoom,
  setPan,
  setWw,
  setWc,
  changeSliceByUser,
  isSpacePressed,
  containerRef,
  touchMode = 'scrub',
  onZoomChange,
  onPanChange,
  onLongPress,
}: UseDicomTouchOptions) {
  const pinchDist = useRef<number | null>(null);
  const pinchMidpoint = useRef<{ x: number; y: number } | null>(null);
  const lastPos = useRef<{ x: number; y: number; time: number } | null>(null);
  const lastTap = useRef<number>(0);
  const lastTapPos = useRef<{ x: number; y: number } | null>(null);
  const sliceAccumulator = useRef<number>(0);

  // Robust Multi-touch State Machine
  const isPinching = useRef<boolean>(false);
  const pinchCooldownUntil = useRef<number>(0);
  const singleTouchStartTime = useRef<number>(0);
  const singleTouchStartPos = useRef<{ x: number; y: number } | null>(null);
  const longPressTimer = useRef<NodeJS.Timeout | null>(null);

  const clearLongPress = useCallback(() => {
    if (longPressTimer.current) {
      clearTimeout(longPressTimer.current);
      longPressTimer.current = null;
    }
  }, []);

  const handleTouchStart = useCallback(
    (e: React.TouchEvent) => {
      const now = Date.now();
      if (e.touches.length >= 2) {
        clearLongPress();
        // Multi-touch initialization (2-finger zoom/pan)
        isPinching.current = true;
        const t0 = e.touches[0];
        const t1 = e.touches[1];
        const dx = t0.clientX - t1.clientX;
        const dy = t0.clientY - t1.clientY;
        pinchDist.current = Math.hypot(dx, dy);
        pinchMidpoint.current = {
          x: (t0.clientX + t1.clientX) / 2,
          y: (t0.clientY + t1.clientY) / 2,
        };
        lastPos.current = null;
        sliceAccumulator.current = 0;
      } else if (e.touches.length === 1) {
        const t = e.touches[0];
        // If within 300ms post-pinch cooldown, do not initiate single touch drag
        if (now < pinchCooldownUntil.current) {
          return;
        }

        isPinching.current = false;
        singleTouchStartTime.current = now;
        singleTouchStartPos.current = { x: t.clientX, y: t.clientY };

        clearLongPress();
        longPressTimer.current = setTimeout(() => {
          onLongPress?.(t.clientX, t.clientY);
        }, 500);

        const prevTapPos = lastTapPos.current;
        const distFromLastTap = prevTapPos
          ? Math.hypot(t.clientX - prevTapPos.x, t.clientY - prevTapPos.y)
          : 999;

        // Double-tap toggle: Fit to Viewport (1.0x) vs 2.0x High Resolution
        if (now - lastTap.current < 350 && distFromLastTap < 35) {
          setZoom((prevZoom) => {
            if (prevZoom > 1.05) {
              setPan({ x: 0, y: 0 });
              return 1.0;
            }
            if (containerRef?.current) {
              const rect = containerRef.current.getBoundingClientRect();
              const focalX = t.clientX - (rect.left + rect.width / 2);
              const focalY = t.clientY - (rect.top + rect.height / 2);
              setPan({ x: -focalX * 0.8, y: -focalY * 0.8 });
            }
            return 2.0;
          });
          lastTap.current = 0;
          lastTapPos.current = null;
        } else {
          lastTap.current = now;
          lastTapPos.current = { x: t.clientX, y: t.clientY };
        }

        lastPos.current = { x: t.clientX, y: t.clientY, time: now };
        sliceAccumulator.current = 0;
        pinchDist.current = null;
        pinchMidpoint.current = null;
      }
    },
    [containerRef, setPan, setZoom]
  );

  const handleTouchMove = useCallback(
    (e: React.TouchEvent, activeTool: DicomTool) => {
      // 1. Two-Finger Focal Pinch-to-Zoom & Pan (STRICTLY NO SCROLLING)
      if (e.touches.length >= 2 && pinchDist.current && pinchMidpoint.current) {
        isPinching.current = true;
        const t0 = e.touches[0];
        const t1 = e.touches[1];
        const dx = t0.clientX - t1.clientX;
        const dy = t0.clientY - t1.clientY;
        const newDist = Math.hypot(dx, dy);
        const newMidpoint = {
          x: (t0.clientX + t1.clientX) / 2,
          y: (t0.clientY + t1.clientY) / 2,
        };

        const panDx = newMidpoint.x - pinchMidpoint.current.x;
        const panDy = newMidpoint.y - pinchMidpoint.current.y;
        const ratio = newDist / pinchDist.current;

        setZoom((prevZoom) => {
          const nextZoom = Math.max(0.2, Math.min(10.0, Number((prevZoom * ratio).toFixed(3))));
          onZoomChange?.(nextZoom);
          if (containerRef?.current && nextZoom !== prevZoom) {
            const rect = containerRef.current.getBoundingClientRect();
            const focalX = newMidpoint.x - (rect.left + rect.width / 2);
            const focalY = newMidpoint.y - (rect.top + rect.height / 2);
            const zoomRatio = nextZoom / prevZoom;

            setPan((p) => {
              const nextPan = {
                x: Number((focalX - (focalX - (p.x + panDx)) * zoomRatio).toFixed(1)),
                y: Number((focalY - (focalY - (p.y + panDy)) * zoomRatio).toFixed(1)),
              };
              onPanChange?.(nextPan, { dx: panDx, dy: panDy });
              return nextPan;
            });
          } else {
            setPan((p) => {
              const nextPan = { x: p.x + panDx, y: p.y + panDy };
              onPanChange?.(nextPan, { dx: panDx, dy: panDy });
              return nextPan;
            });
          }
          return nextZoom;
        });

        pinchDist.current = newDist;
        pinchMidpoint.current = newMidpoint;
        return; // Zero slice scrolling
      }

      // 2. Single-Finger Drag & Actions
      if (e.touches.length === 1 && lastPos.current) {
        clearLongPress();
        const now = Date.now();

        // STRICT COOLDOWN: Discard any single-finger move within 300ms of pinch release
        if (isPinching.current || now < pinchCooldownUntil.current) {
          return;
        }

        const t = e.touches[0];
        // Pre-pinch gate: wait 40ms or 8px before scrolling so landing second finger isn't missed
        if (singleTouchStartPos.current) {
          const moveDist = Math.hypot(
            t.clientX - singleTouchStartPos.current.x,
            t.clientY - singleTouchStartPos.current.y
          );
          if (now - singleTouchStartTime.current < 45 && moveDist < 8) {
            return;
          }
        }

        const dx = t.clientX - lastPos.current.x;
        const dy = t.clientY - lastPos.current.y;
        const dt = Math.max(1, now - lastPos.current.time);
        lastPos.current = { x: t.clientX, y: t.clientY, time: now };

        // Explicit tool overrides
        if (isSpacePressed || activeTool === 'pan') {
          setPan((p) => {
            const nextPan = { x: p.x + dx, y: p.y + dy };
            onPanChange?.(nextPan, { dx, dy });
            return nextPan;
          });
          return;
        }
        if (activeTool === 'zoom') {
          const factor = Math.exp(-dy * 0.008);
          setZoom((z) => {
            const nextZoom = Math.max(0.2, Math.min(10.0, Number((z * factor).toFixed(3))));
            onZoomChange?.(nextZoom);
            return nextZoom;
          });
          return;
        }

        // Window/Level mode (either active tool is 'wl' or touchMode is 'wl')
        if (activeTool === 'wl' || touchMode === 'wl') {
          setWw((w) => {
            const sens = Math.max(1, Math.round(w * 0.006));
            return Math.max(1, w + dx * sens);
          });
          setWc((c) => {
            const sens = Math.max(1, Math.round(Math.abs(c || 100) * 0.006));
            return c - dy * sens;
          });
          return;
        }

        // Default: Velocity-aware slice scrubbing
        if (touchMode === 'scrub' || !activeTool || activeTool === 'roi') {
          sliceAccumulator.current += dy;
          const velocity = Math.abs(dy / dt);
          const threshold = velocity > 1.2 ? 6 : velocity > 0.6 ? 9 : 12;

          if (Math.abs(sliceAccumulator.current) >= threshold) {
            const rawSteps = Math.trunc(sliceAccumulator.current / threshold);
            sliceAccumulator.current -= rawSteps * threshold;
            const steps = Math.max(-6, Math.min(6, rawSteps));
            changeSliceByUser((s) => s + steps);
          }
        }
      }
    },
    [changeSliceByUser, containerRef, isSpacePressed, setPan, setWc, setWw, setZoom, touchMode, onZoomChange, onPanChange, clearLongPress]
  );

  const handleTouchEnd = useCallback((e: React.TouchEvent) => {
    clearLongPress();
    if (isPinching.current || e.touches.length > 0) {
      // Transition from pinch or partial release: enforce 300ms cooldown window
      pinchCooldownUntil.current = Date.now() + 300;
    }
    isPinching.current = false;
    pinchDist.current = null;
    pinchMidpoint.current = null;
    lastPos.current = null;
    sliceAccumulator.current = 0;
  }, [clearLongPress]);

  return { handleTouchStart, handleTouchMove, handleTouchEnd };
}

