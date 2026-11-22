import { describe, it, expect } from 'vitest';
import {
  calculatePipResize,
  calculatePipDrag,
  getDefaultPipRect,
  ViewportSize,
  PipRect,
} from '../pip-geometry.service';

describe('pip-geometry.service', () => {
  const viewport: ViewportSize = { width: 1920, height: 1080 };
  const initialRect: PipRect = { x: 500, y: 300, w: 400, h: 300 };

  it('calculates default position at bottom-right of viewport with margin', () => {
    const rect = getDefaultPipRect(viewport, 440, 330, 24);
    expect(rect.w).toBe(440);
    expect(rect.h).toBe(330);
    expect(rect.x).toBe(1920 - 440 - 24);
    expect(rect.y).toBe(1080 - 330 - 24);
  });

  describe('vertical resizing', () => {
    it('resizes from top (n) edge: expands upward while keeping bottom edge fixed', () => {
      const bottomBefore = initialRect.y + initialRect.h;
      const res = calculatePipResize(initialRect, 'n', 0, -50, viewport);
      expect(res.y).toBe(250);
      expect(res.h).toBe(350);
      expect(res.y + res.h).toBe(bottomBefore);
      expect(res.x).toBe(initialRect.x);
      expect(res.w).toBe(initialRect.w);
    });

    it('resizes from bottom (s) edge: expands downward while keeping top edge fixed', () => {
      const res = calculatePipResize(initialRect, 's', 0, 60, viewport);
      expect(res.y).toBe(initialRect.y);
      expect(res.h).toBe(360);
      expect(res.x).toBe(initialRect.x);
      expect(res.w).toBe(initialRect.w);
    });

    it('enforces minH when resizing from top (n) edge', () => {
      const bottomBefore = initialRect.y + initialRect.h; // 600
      // Try to shrink by 250px (height would be 50px < minH 200)
      const res = calculatePipResize(initialRect, 'n', 0, 250, viewport);
      expect(res.h).toBe(200); // clamped to minH
      expect(res.y + res.h).toBe(bottomBefore);
      expect(res.y).toBe(400);
    });
  });

  describe('horizontal resizing', () => {
    it('resizes from left (w) edge: expands leftward while keeping right edge fixed', () => {
      const rightBefore = initialRect.x + initialRect.w;
      const res = calculatePipResize(initialRect, 'w', -70, 0, viewport);
      expect(res.x).toBe(430);
      expect(res.w).toBe(470);
      expect(res.x + res.w).toBe(rightBefore);
      expect(res.y).toBe(initialRect.y);
    });

    it('resizes from right (e) edge: expands rightward while keeping left edge fixed', () => {
      const res = calculatePipResize(initialRect, 'e', 80, 0, viewport);
      expect(res.x).toBe(initialRect.x);
      expect(res.w).toBe(480);
      expect(res.y).toBe(initialRect.y);
    });

    it('enforces minW when resizing from left (w) edge', () => {
      const rightBefore = initialRect.x + initialRect.w; // 900
      // Try to shrink by 300px (width would be 100px < minW 280)
      const res = calculatePipResize(initialRect, 'w', 300, 0, viewport);
      expect(res.w).toBe(280);
      expect(res.x + res.w).toBe(rightBefore);
      expect(res.x).toBe(620);
    });
  });

  describe('corner resizing', () => {
    it('resizes diagonally from nw corner', () => {
      const rightBefore = initialRect.x + initialRect.w;
      const bottomBefore = initialRect.y + initialRect.h;
      const res = calculatePipResize(initialRect, 'nw', -40, -30, viewport);
      expect(res.x).toBe(460);
      expect(res.y).toBe(270);
      expect(res.w).toBe(440);
      expect(res.h).toBe(330);
      expect(res.x + res.w).toBe(rightBefore);
      expect(res.y + res.h).toBe(bottomBefore);
    });

    it('resizes diagonally from se corner', () => {
      const res = calculatePipResize(initialRect, 'se', 50, 40, viewport);
      expect(res.x).toBe(initialRect.x);
      expect(res.y).toBe(initialRect.y);
      expect(res.w).toBe(450);
      expect(res.h).toBe(340);
    });
  });

  describe('smart dragging & snapping', () => {
    it('translates position accurately without changing dimensions', () => {
      const res = calculatePipDrag(initialRect, 100, 50, viewport);
      expect(res.x).toBe(600);
      expect(res.y).toBe(350);
      expect(res.w).toBe(initialRect.w);
      expect(res.h).toBe(initialRect.h);
    });

    it('magnetically snaps to right margin within threshold', () => {
      // viewport width 1920, rect width 400, margin 16 -> target right edge max = 1920 - 400 - 16 = 1504
      const nearRightRect: PipRect = { x: 1495, y: 300, w: 400, h: 300 };
      const res = calculatePipDrag(nearRightRect, 0, 0, viewport);
      expect(res.x).toBe(1504);
    });

    it('magnetically snaps to bottom margin within threshold', () => {
      // viewport height 1080, rect height 300, margin 16 -> target bottom edge max = 1080 - 300 - 16 = 764
      const nearBottomRect: PipRect = { x: 500, y: 755, w: 400, h: 300 };
      const res = calculatePipDrag(nearBottomRect, 0, 0, viewport);
      expect(res.y).toBe(764);
    });

    it('clamps to boundaries when dragged aggressively past the screen', () => {
      const res = calculatePipDrag(initialRect, -1000, -1000, viewport);
      expect(res.x).toBe(16); // margin
      expect(res.y).toBe(16); // margin
    });
  });
});
