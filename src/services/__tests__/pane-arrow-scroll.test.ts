import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import {
  createSmoothScrollController,
  parseArrowKeyDelta,
  isEditableTarget,
} from '../pane-arrow-scroll.service';

describe('Pane Arrow Scroll Service', () => {
  beforeEach(() => {
    vi.useFakeTimers();
  });

  afterEach(() => {
    vi.clearAllTimers();
    vi.useRealTimers();
  });

  describe('parseArrowKeyDelta', () => {
    it('correctly maps arrow keys to slice delta steps', () => {
      expect(parseArrowKeyDelta('ArrowUp')).toEqual({ delta: -1 });
      expect(parseArrowKeyDelta('ArrowLeft')).toEqual({ delta: -1 });
      expect(parseArrowKeyDelta('ArrowDown')).toEqual({ delta: 1 });
      expect(parseArrowKeyDelta('ArrowRight')).toEqual({ delta: 1 });
      expect(parseArrowKeyDelta('PageUp')).toEqual({ delta: -5 });
      expect(parseArrowKeyDelta('PageDown')).toEqual({ delta: 5 });
    });

    it('correctly maps Home and End to jump operations', () => {
      expect(parseArrowKeyDelta('Home')).toEqual({ delta: 0, isJump: 'first' });
      expect(parseArrowKeyDelta('End')).toEqual({ delta: 0, isJump: 'last' });
    });

    it('returns null for unrelated keys', () => {
      expect(parseArrowKeyDelta('a')).toBeNull();
      expect(parseArrowKeyDelta('Enter')).toBeNull();
      expect(parseArrowKeyDelta('Escape')).toBeNull();
      expect(parseArrowKeyDelta('Space')).toBeNull();
    });
  });

  describe('isEditableTarget', () => {
    it('detects input and textarea elements as editable', () => {
      expect(isEditableTarget({ tagName: 'INPUT' })).toBe(true);
      expect(isEditableTarget({ tagName: 'TEXTAREA' })).toBe(true);
      expect(isEditableTarget({ tagName: 'DIV', isContentEditable: true })).toBe(true);
    });

    it('detects elements nested inside contenteditable as editable', () => {
      const mockChild = {
        tagName: 'P',
        isContentEditable: false,
        closest: (sel: string) => (sel === '[contenteditable="true"]' ? {} : null),
      };
      expect(isEditableTarget(mockChild)).toBe(true);
    });

    it('returns false for non-editable canvas or viewer elements', () => {
      const mockCanvas = {
        tagName: 'CANVAS',
        isContentEditable: false,
        closest: () => null,
      };
      expect(isEditableTarget(mockCanvas)).toBe(false);
      expect(isEditableTarget(null)).toBe(false);
      expect(isEditableTarget(undefined)).toBe(false);
    });
  });

  describe('createSmoothScrollController', () => {
    it('steps immediately on first trigger', () => {
      const onStep = vi.fn();
      const controller = createSmoothScrollController(onStep);

      controller.start(1);
      expect(onStep).toHaveBeenCalledTimes(1);
      expect(onStep).toHaveBeenCalledWith(1);

      controller.dispose();
    });

    it('smoothly repeats stepping when held past delay threshold', () => {
      const onStep = vi.fn();
      const controller = createSmoothScrollController(onStep, {
        holdDelayMs: 180,
        tickIntervalMs: 40,
      });

      controller.start(-1);
      expect(onStep).toHaveBeenCalledTimes(1);
      expect(onStep).toHaveBeenCalledWith(-1);

      // Advance 180ms to trigger repeat interval
      vi.advanceTimersByTime(180);

      // Advance 120ms (3 ticks of 40ms)
      vi.advanceTimersByTime(120);

      // 1 immediate + 3 interval ticks = 4 calls
      expect(onStep).toHaveBeenCalledTimes(4);

      // Stop scrolling
      controller.stop();

      // Further time does not trigger more steps
      vi.advanceTimersByTime(200);
      expect(onStep).toHaveBeenCalledTimes(4);

      controller.dispose();
    });

    it('cancels previous scroll when starting a new direction', () => {
      const onStep = vi.fn();
      const controller = createSmoothScrollController(onStep, {
        holdDelayMs: 180,
        tickIntervalMs: 40,
      });

      controller.start(1);
      expect(onStep).toHaveBeenCalledWith(1);

      // Immediately switch direction to -1
      controller.start(-1);
      expect(onStep).toHaveBeenCalledWith(-1);
      expect(onStep).toHaveBeenCalledTimes(2);

      // Advance 180ms + 40ms = 1 tick of the new direction (-1)
      vi.advanceTimersByTime(220);
      expect(onStep).toHaveBeenCalledWith(-1);
      expect(onStep).toHaveBeenCalledTimes(3);

      controller.dispose();
    });
  });
});
