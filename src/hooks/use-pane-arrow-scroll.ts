'use client';

import { useEffect, useRef, useState, useCallback, useMemo } from 'react';
import {
  createSmoothScrollController,
  parseArrowKeyDelta,
  isEditableTarget,
} from '@/services/pane-arrow-scroll.service';

interface UsePaneArrowScrollOptions {
  containerRef: React.RefObject<HTMLElement | null>;
  onStepSlice: (delta: number) => void;
  onJumpSlice?: (target: 'first' | 'last') => void;
  enabled?: boolean;
}

export function usePaneArrowScroll({
  containerRef,
  onStepSlice,
  onJumpSlice,
  enabled = true,
}: UsePaneArrowScrollOptions) {
  const [isHovered, setIsHovered] = useState(false);
  const isHoveredRef = useRef(false);
  const onStepSliceRef = useRef(onStepSlice);
  const onJumpSliceRef = useRef(onJumpSlice);
  const activeKeyRef = useRef<string | null>(null);

  useEffect(() => {
    onStepSliceRef.current = onStepSlice;
    onJumpSliceRef.current = onJumpSlice;
  });

  const scrollController = useMemo(
    () => createSmoothScrollController((delta) => onStepSliceRef.current(delta)),
    []
  );

  useEffect(() => {
    return () => scrollController.dispose();
  }, [scrollController]);

  const startSmoothScroll = useCallback(
    (delta: number) => scrollController.start(delta),
    [scrollController]
  );

  const stopSmoothScroll = useCallback(() => {
    scrollController.stop();
    activeKeyRef.current = null;
  }, [scrollController]);

  const handlePointerEnter = useCallback(() => {
    isHoveredRef.current = true;
    setIsHovered(true);
  }, []);

  const handlePointerLeave = useCallback(() => {
    isHoveredRef.current = false;
    setIsHovered(false);
    stopSmoothScroll();
  }, [stopSmoothScroll]);

  useEffect(() => {
    if (!enabled) return;

    const handleKeyDown = (e: KeyboardEvent) => {
      if (isEditableTarget(e.target)) return;

      const isOver = Boolean(
        containerRef.current && (
          isHoveredRef.current ||
          (typeof containerRef.current.matches === 'function' && containerRef.current.matches(':hover'))
        )
      );
      if (!isOver) return;

      const parsed = parseArrowKeyDelta(e.key);
      if (!parsed) return;

      e.preventDefault();
      e.stopPropagation();

      if (parsed.isJump) {
        onJumpSliceRef.current?.(parsed.isJump);
        return;
      }

      if (activeKeyRef.current === e.key) return;
      activeKeyRef.current = e.key;
      startSmoothScroll(parsed.delta);
    };

    const handleKeyUp = (e: KeyboardEvent) => {
      if (activeKeyRef.current === e.key) stopSmoothScroll();
    };

    const handleBlur = () => stopSmoothScroll();

    window.addEventListener('keydown', handleKeyDown, { passive: false });
    window.addEventListener('keyup', handleKeyUp);
    window.addEventListener('blur', handleBlur);

    return () => {
      window.removeEventListener('keydown', handleKeyDown);
      window.removeEventListener('keyup', handleKeyUp);
      window.removeEventListener('blur', handleBlur);
      stopSmoothScroll();
    };
  }, [enabled, containerRef, startSmoothScroll, stopSmoothScroll]);

  return {
    isHovered,
    handlePointerEnter,
    handlePointerLeave,
    startSmoothScroll,
    stopSmoothScroll,
  };
}
