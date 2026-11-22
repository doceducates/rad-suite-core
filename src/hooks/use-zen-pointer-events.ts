'use client';

import { useCallback } from 'react';
import type { DicomTool } from '@/components/dicom/dicom-toolbar';
import type { SliceGeometry } from '@/services/dicom-geometry.service';
import { projectPixelTo3DPoint } from '@/services/dicom-3d-point.service';

interface UseZenPointerEventsProps {
  tool: DicomTool;
  isSpacePressed: boolean;
  canvasRef: React.RefObject<HTMLCanvasElement | null>;
  currentGeometry?: SliceGeometry;
  onPoint3DSelect?: (pt: [number, number, number]) => void;
  handlePointerDown: (e: React.PointerEvent) => void;
  handlePointerMoveWithHu: (e: React.PointerEvent) => void;
}

export function useZenPointerEvents({
  tool,
  isSpacePressed,
  canvasRef,
  currentGeometry,
  onPoint3DSelect,
  handlePointerDown,
  handlePointerMoveWithHu,
}: UseZenPointerEventsProps) {
  const trigger3DPoint = useCallback(
    (e: React.PointerEvent) => {
      const canvas = canvasRef.current;
      if (!canvas || !onPoint3DSelect || !currentGeometry) return;
      const rect = canvas.getBoundingClientRect();
      const pctX = Math.max(0, Math.min(100, ((e.clientX - rect.left) / rect.width) * 100));
      const pctY = Math.max(0, Math.min(100, ((e.clientY - rect.top) / rect.height) * 100));
      const pt = projectPixelTo3DPoint(pctX, pctY, currentGeometry);
      if (pt) onPoint3DSelect(pt);
    },
    [currentGeometry, onPoint3DSelect, canvasRef]
  );

  const handlePointerDownCombined = useCallback(
    (e: React.PointerEvent) => {
      if (tool === 'crosshair' && !isSpacePressed) {
        trigger3DPoint(e);
        return;
      }
      if (tool !== 'length' || isSpacePressed) handlePointerDown(e);
    },
    [tool, trigger3DPoint, handlePointerDown, isSpacePressed]
  );

  const handlePointerMoveCombined = useCallback(
    (e: React.PointerEvent) => {
      handlePointerMoveWithHu(e);
      if (tool === 'crosshair' && !isSpacePressed && e.buttons === 1) trigger3DPoint(e);
    },
    [handlePointerMoveWithHu, tool, trigger3DPoint, isSpacePressed]
  );

  return {
    handlePointerDownCombined,
    handlePointerMoveCombined,
  };
}
