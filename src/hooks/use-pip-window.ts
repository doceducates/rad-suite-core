'use client';

import { useState, useRef, useCallback, useEffect } from 'react';
import {
  PipRect,
  PipResizeHandle,
  calculatePipResize,
  calculatePipDrag,
  getDefaultPipRect,
} from '@/services/pip-geometry.service';

const STORAGE_KEY_PIP_MINIMIZED = 'radsuite_pip_minimized';

export function usePipWindow(options?: { defaultMinimized?: boolean }) {
  const [rect, setRect] = useState<PipRect>({ x: 1000, y: 500, w: 440, h: 330 });
  const [isMinimized, setIsMinimizedState] = useState<boolean>(() => {
    if (typeof window === 'undefined') return options?.defaultMinimized ?? false;
    const saved = localStorage.getItem(STORAGE_KEY_PIP_MINIMIZED);
    if (saved !== null) return saved === 'true';
    return options?.defaultMinimized ?? false;
  });
  const [isDragging, setIsDragging] = useState(false);
  const [isResizing, setIsResizing] = useState(false);
  const [activeHandle, setActiveHandle] = useState<PipResizeHandle | null>(null);

  const setIsMinimized = useCallback((val: boolean | ((prev: boolean) => boolean)) => {
    setIsMinimizedState((prev) => {
      const next = typeof val === 'function' ? val(prev) : val;
      if (typeof window !== 'undefined') {
        localStorage.setItem(STORAGE_KEY_PIP_MINIMIZED, String(next));
      }
      return next;
    });
  }, []);

  // Sync if defaultMinimized changes only when user hasn't explicitly set a preference
  useEffect(() => {
    if (options?.defaultMinimized !== undefined && typeof window !== 'undefined') {
      const saved = localStorage.getItem(STORAGE_KEY_PIP_MINIMIZED);
      if (saved === null) {
        setIsMinimizedState(options.defaultMinimized);
      }
    }
  }, [options?.defaultMinimized]);

  // Draggable minimized pill position (x, y)
  const [pillPos, setPillPos] = useState<{ x: number; y: number } | null>(null);
  const [isPillDragging, setIsPillDragging] = useState(false);
  const pillStartRef = useRef<{ x: number; y: number }>({ x: 0, y: 0 });
  const pillMouseStartRef = useRef<{ x: number; y: number }>({ x: 0, y: 0 });
  const pillHasDraggedRef = useRef(false);

  const startRectRef = useRef<PipRect>(rect);
  const startMouseRef = useRef<{ x: number; y: number }>({ x: 0, y: 0 });
  const rafIdRef = useRef<number | null>(null);

  // Initialize position on client mount
  useEffect(() => {
    if (typeof window === 'undefined') return;
    const initial = getDefaultPipRect({ width: window.innerWidth, height: window.innerHeight });
    setRect(initial);
    setPillPos({ x: window.innerWidth - 72, y: window.innerHeight - 72 });

    const handleWindowResize = () => {
      const vp = { width: window.innerWidth, height: window.innerHeight };
      setRect((prev) => calculatePipDrag(prev, 0, 0, vp));
      setPillPos((prev) => {
        if (!prev) return { x: vp.width - 72, y: vp.height - 72 };
        return {
          x: Math.max(16, Math.min(vp.width - 64, prev.x)),
          y: Math.max(16, Math.min(vp.height - 64, prev.y)),
        };
      });
    };

    window.addEventListener('resize', handleWindowResize);
    return () => window.removeEventListener('resize', handleWindowResize);
  }, []);

  const resetToDefault = useCallback(() => {
    if (typeof window === 'undefined') return;
    const defaultRect = getDefaultPipRect({ width: window.innerWidth, height: window.innerHeight });
    setRect(defaultRect);
  }, []);

  // Dragging handler for main window
  const handleDragMouseDown = useCallback((e: React.MouseEvent) => {
    if (e.button !== 0) return;
    e.preventDefault();
    setIsDragging(true);
    startRectRef.current = rect;
    startMouseRef.current = { x: e.clientX, y: e.clientY };
    document.body.style.userSelect = 'none';

    const handleMouseMove = (moveEvent: MouseEvent) => {
      if (rafIdRef.current) cancelAnimationFrame(rafIdRef.current);
      rafIdRef.current = requestAnimationFrame(() => {
        const dx = moveEvent.clientX - startMouseRef.current.x;
        const dy = moveEvent.clientY - startMouseRef.current.y;
        const vp = { width: window.innerWidth, height: window.innerHeight };
        setRect(calculatePipDrag(startRectRef.current, dx, dy, vp));
      });
    };

    const handleMouseUp = () => {
      setIsDragging(false);
      document.body.style.userSelect = '';
      if (rafIdRef.current) cancelAnimationFrame(rafIdRef.current);
      window.removeEventListener('mousemove', handleMouseMove);
      window.removeEventListener('mouseup', handleMouseUp);
    };

    window.addEventListener('mousemove', handleMouseMove);
    window.addEventListener('mouseup', handleMouseUp);
  }, [rect]);

  // Resizing handler for main window
  const handleResizeMouseDown = useCallback((handle: PipResizeHandle, e: React.MouseEvent) => {
    if (e.button !== 0) return;
    e.preventDefault();
    e.stopPropagation();
    setIsResizing(true);
    setActiveHandle(handle);
    startRectRef.current = rect;
    startMouseRef.current = { x: e.clientX, y: e.clientY };
    document.body.style.userSelect = 'none';

    const handleMouseMove = (moveEvent: MouseEvent) => {
      if (rafIdRef.current) cancelAnimationFrame(rafIdRef.current);
      rafIdRef.current = requestAnimationFrame(() => {
        const dx = moveEvent.clientX - startMouseRef.current.x;
        const dy = moveEvent.clientY - startMouseRef.current.y;
        const vp = { width: window.innerWidth, height: window.innerHeight };
        setRect(calculatePipResize(startRectRef.current, handle, dx, dy, vp));
      });
    };

    const handleMouseUp = () => {
      setIsResizing(false);
      setActiveHandle(null);
      document.body.style.userSelect = '';
      if (rafIdRef.current) cancelAnimationFrame(rafIdRef.current);
      window.removeEventListener('mousemove', handleMouseMove);
      window.removeEventListener('mouseup', handleMouseUp);
    };

    window.addEventListener('mousemove', handleMouseMove);
    window.addEventListener('mouseup', handleMouseUp);
  }, [rect]);

  // Dragging handler for the minimized pill
  const handlePillMouseDown = useCallback((e: React.MouseEvent) => {
    if (e.button !== 0) return;
    pillHasDraggedRef.current = false;
    const currentPill = pillPos || { x: window.innerWidth - 72, y: window.innerHeight - 72 };
    pillStartRef.current = currentPill;
    pillMouseStartRef.current = { x: e.clientX, y: e.clientY };

    const handleMouseMove = (moveEvent: MouseEvent) => {
      const dx = moveEvent.clientX - pillMouseStartRef.current.x;
      const dy = moveEvent.clientY - pillMouseStartRef.current.y;
      if (Math.abs(dx) > 4 || Math.abs(dy) > 4) {
        pillHasDraggedRef.current = true;
        setIsPillDragging(true);
      }
      if (pillHasDraggedRef.current) {
        const newX = Math.max(12, Math.min(window.innerWidth - 64, pillStartRef.current.x + dx));
        const newY = Math.max(12, Math.min(window.innerHeight - 64, pillStartRef.current.y + dy));
        setPillPos({ x: Math.round(newX), y: Math.round(newY) });
      }
    };

    const handleMouseUp = () => {
      setIsPillDragging(false);
      window.removeEventListener('mousemove', handleMouseMove);
      window.removeEventListener('mouseup', handleMouseUp);
    };

    window.addEventListener('mousemove', handleMouseMove);
    window.addEventListener('mouseup', handleMouseUp);
  }, [pillPos]);

  return {
    rect,
    isMinimized,
    setIsMinimized,
    isDragging,
    isResizing,
    activeHandle,
    handleDragMouseDown,
    handleResizeMouseDown,
    resetToDefault,
    pillPos,
    isPillDragging,
    handlePillMouseDown,
    pillHasDraggedRef,
  };
}
