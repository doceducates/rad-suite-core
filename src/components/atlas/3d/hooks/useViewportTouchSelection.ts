import { useRef } from 'react';
import type React from 'react';
import type { AtlasScene } from '../core/3d/AtlasScene';
import type { AnatomyNodeManager } from '../core/3d/AnatomyNodeManager';
import { AtlasNavBus } from '../vitrea/AtlasNavBus';

interface UseViewportTouchSelectionOptions {
  canvasRef: React.RefObject<HTMLCanvasElement | null>;
  sceneRef: React.RefObject<AtlasScene | null>;
  nodeMgrRef: React.RefObject<AnatomyNodeManager | null>;
  selectStructure: (id: string | null) => void;
  hoverStructure: (id: string | null) => void;
  onStructureClick?: (id: string) => void;
}

/**
 * Mobile & Desktop Pointer Interaction Hook:
 * - Ignores multi-touch pinch/pan releases cleanly
 * - Uses 12px touch slop (vs 6px mouse)
 * - Supports double-tap / double-click smooth camera focus on tapped structure
 */
export function useViewportTouchSelection({
  canvasRef,
  sceneRef,
  nodeMgrRef,
  selectStructure,
  hoverStructure,
  onStructureClick,
}: UseViewportTouchSelectionOptions) {
  const activePointersRef = useRef<Set<number>>(new Set());
  const wasMultiTouchRef = useRef<boolean>(false);
  const pointerStartPos = useRef<{ x: number; y: number }>({ x: 0, y: 0 });
  const lastTapRef = useRef<{ time: number; id: string | null }>({ time: 0, id: null });

  const handlePointerDown = (e: React.PointerEvent<HTMLCanvasElement>) => {
    activePointersRef.current.add(e.pointerId);
    if (activePointersRef.current.size > 1) {
      wasMultiTouchRef.current = true;
    } else if (activePointersRef.current.size === 1) {
      wasMultiTouchRef.current = false;
      pointerStartPos.current = { x: e.clientX, y: e.clientY };
    }
  };

  const handlePointerUp = (e: React.PointerEvent<HTMLCanvasElement>) => {
    activePointersRef.current.delete(e.pointerId);
    if (wasMultiTouchRef.current || activePointersRef.current.size > 0) {
      if (activePointersRef.current.size === 0) wasMultiTouchRef.current = false;
      return;
    }
    if (!canvasRef.current || !sceneRef.current || !nodeMgrRef.current) return;

    const slop = e.pointerType === 'touch' ? 12 : 6;
    const dist = Math.hypot(
      e.clientX - pointerStartPos.current.x,
      e.clientY - pointerStartPos.current.y
    );
    if (dist < slop) {
      const hitId = nodeMgrRef.current.raycast(
        e.nativeEvent,
        sceneRef.current.camera,
        canvasRef.current
      );
      selectStructure(hitId);
      if (hitId) {
        onStructureClick?.(hitId);
        AtlasNavBus.emitStructureSelect({
          structureId: hitId,
          name: hitId.replace(/_/g, ' '),
          source: 'atlas_3d',
        });

        const now = performance.now();
        if (lastTapRef.current.id === hitId && now - lastTapRef.current.time < 300) {
          const bounds = nodeMgrRef.current.getStructureBounds(hitId);
          if (bounds) sceneRef.current.focusOnBox(bounds, 1.35);
          lastTapRef.current = { time: 0, id: null };
        } else {
          lastTapRef.current = { time: now, id: hitId };
        }
      }
    }
  };

  const handlePointerCancel = (e: React.PointerEvent<HTMLCanvasElement>) => {
    activePointersRef.current.delete(e.pointerId);
    if (activePointersRef.current.size === 0) wasMultiTouchRef.current = false;
  };

  const handlePointerMove = (e: React.PointerEvent<HTMLCanvasElement>) => {
    if (e.pointerType === 'touch' || !canvasRef.current || !sceneRef.current || !nodeMgrRef.current) {
      return;
    }
    const hitId = nodeMgrRef.current.raycast(
      e.nativeEvent,
      sceneRef.current.camera,
      canvasRef.current
    );
    hoverStructure(hitId);
  };

  return {
    handlePointerDown,
    handlePointerUp,
    handlePointerCancel,
    handlePointerMove,
  };
}
