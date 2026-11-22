/**
 * Pure business logic and state machine for smooth cursor-targeted arrow slice navigation.
 */

export interface SmoothScrollController {
  start: (delta: number) => void;
  stop: () => void;
  dispose: () => void;
}

export interface SmoothScrollOptions {
  holdDelayMs?: number;
  tickIntervalMs?: number;
}

export function createSmoothScrollController(
  onStep: (delta: number) => void,
  options?: SmoothScrollOptions
): SmoothScrollController {
  const holdDelayMs = options?.holdDelayMs ?? 180;
  const tickIntervalMs = options?.tickIntervalMs ?? 40;

  let holdTimer: ReturnType<typeof setTimeout> | null = null;
  let scrollInterval: ReturnType<typeof setInterval> | null = null;

  const stop = () => {
    if (holdTimer) {
      clearTimeout(holdTimer);
      holdTimer = null;
    }
    if (scrollInterval) {
      clearInterval(scrollInterval);
      scrollInterval = null;
    }
  };

  const start = (delta: number) => {
    onStep(delta);
    stop();
    holdTimer = setTimeout(() => {
      scrollInterval = setInterval(() => {
        onStep(delta);
      }, tickIntervalMs);
    }, holdDelayMs);
  };

  return {
    start,
    stop,
    dispose: stop,
  };
}

export function parseArrowKeyDelta(key: string): { delta: number; isJump?: 'first' | 'last' } | null {
  if (key === 'ArrowUp' || key === 'ArrowLeft') return { delta: -1 };
  if (key === 'ArrowDown' || key === 'ArrowRight') return { delta: 1 };
  if (key === 'PageUp') return { delta: -5 };
  if (key === 'PageDown') return { delta: 5 };
  if (key === 'Home') return { delta: 0, isJump: 'first' };
  if (key === 'End') return { delta: 0, isJump: 'last' };
  return null;
}

export function isEditableTarget(target: unknown): boolean {
  if (!target || typeof target !== 'object') return false;
  const el = target as Partial<HTMLElement>;
  if (el.tagName === 'INPUT' || el.tagName === 'TEXTAREA' || el.isContentEditable) {
    return true;
  }
  if (typeof el.closest === 'function') {
    return Boolean(el.closest('[contenteditable="true"]'));
  }
  return false;
}
