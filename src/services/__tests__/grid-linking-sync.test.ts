import { describe, it, expect } from 'vitest';
import { propagateZoom, propagatePan } from '@/hooks/use-grid-linking-sync';

describe('useGridLinkingSync Propagation Logic', () => {
  describe('propagateZoom', () => {
    it('propagates zoom to all linked panes while preserving unlinked panes', () => {
      const unlinkedPanes = new Set<number>([2]);
      const initialZoomMap: Record<number, number> = {};

      const updated = propagateZoom(0, 1.75, 4, unlinkedPanes, initialZoomMap);

      // Pane 0, 1, 3 are linked and receive 1.75
      expect(updated[0]).toBe(1.75);
      expect(updated[1]).toBe(1.75);
      expect(updated[3]).toBe(1.75);

      // Pane 2 is unlinked and receives nothing
      expect(updated[2]).toBeUndefined();
    });

    it('does not propagate zoom when source pane itself is unlinked', () => {
      const unlinkedPanes = new Set<number>([1]);
      const initialZoomMap: Record<number, number> = { 0: 1.0, 2: 1.0 };

      const updated = propagateZoom(1, 2.5, 3, unlinkedPanes, initialZoomMap);

      // Pane 1 updates itself
      expect(updated[1]).toBe(2.5);

      // Other panes remain at their initial zoom
      expect(updated[0]).toBe(1.0);
      expect(updated[2]).toBe(1.0);
    });
  });

  describe('propagatePan', () => {
    it('propagates pan translation delta across linked panes', () => {
      const unlinkedPanes = new Set<number>([1]);
      const initialPanMap: Record<number, { x: number; y: number }> = {
        0: { x: 10, y: 10 },
        2: { x: 5, y: 5 },
      };

      const updated = propagatePan(
        0,
        { x: 30, y: 20 },
        { dx: 20, dy: 10 },
        3,
        unlinkedPanes,
        initialPanMap
      );

      // Source pane updates to absolute coordinates
      expect(updated[0]).toEqual({ x: 30, y: 20 });
      // Linked pane 2 receives translation delta: 5 + 20, 5 + 10 -> (25, 15)
      expect(updated[2]).toEqual({ x: 25, y: 15 });
      // Unlinked pane 1 receives no delta
      expect(updated[1]).toBeUndefined();
    });

    it('isolates unlinked pane when it is moved', () => {
      const unlinkedPanes = new Set<number>([1]);
      const initialPanMap: Record<number, { x: number; y: number }> = {
        0: { x: 0, y: 0 },
        2: { x: 0, y: 0 },
      };

      const updated = propagatePan(
        1,
        { x: 100, y: 50 },
        { dx: 100, dy: 50 },
        3,
        unlinkedPanes,
        initialPanMap
      );

      expect(updated[1]).toEqual({ x: 100, y: 50 });
      expect(updated[0]).toEqual({ x: 0, y: 0 });
      expect(updated[2]).toEqual({ x: 0, y: 0 });
    });
  });
});
