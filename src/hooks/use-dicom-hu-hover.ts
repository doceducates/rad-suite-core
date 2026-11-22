'use client';

import { useState, useCallback, useRef, RefObject } from 'react';
import { samplePixelValue } from '@/services/dicom-hu.service';
import { ParsedDicomFile } from '@/services/dicom-loader.service';
import { DicomTool } from '@/components/dicom/dicom-toolbar';

export interface HoverHuInfo {
  hu: number;
  raw: number;
  px: number;
  py: number;
  tissueLabel: string;
  tissueColor: string;
}

interface UseDicomHuHoverOptions {
  canvasRef: RefObject<HTMLCanvasElement | null>;
  parsedSlice: ParsedDicomFile | null;
  modality: string;
  tool: DicomTool;
  onPointerMove: (e: React.PointerEvent, tool: DicomTool) => void;
}

export function useDicomHuHover({
  canvasRef,
  parsedSlice,
  modality,
  tool,
  onPointerMove,
}: UseDicomHuHoverOptions) {
  const [hoverHu, setHoverHu] = useState<HoverHuInfo | null>(null);
  const rafIdRef = useRef<number | null>(null);

  const handlePointerMoveWithHu = useCallback(
    (e: React.PointerEvent) => {
      if (tool !== 'length') onPointerMove(e, tool);

      // Skip heavy HU sampling during active mouse drags (chording W/L, Cine, Pan)
      if (e.buttons !== 0) return;

      const canvas = canvasRef.current;
      if (!canvas || !parsedSlice) return;

      const clientX = e.clientX;
      const clientY = e.clientY;

      if (rafIdRef.current !== null) return;

      rafIdRef.current = requestAnimationFrame(() => {
        rafIdRef.current = null;
        if (!canvasRef.current || !parsedSlice) return;

        const rect = canvasRef.current.getBoundingClientRect();
        const sample = samplePixelValue(
          clientX - rect.left,
          clientY - rect.top,
          rect.width,
          rect.height,
          parsedSlice.pixelData,
          parsedSlice.meta.columns,
          parsedSlice.meta.rows,
          parsedSlice.meta.rescaleSlope,
          parsedSlice.meta.rescaleIntercept,
          modality
        );

        if (sample) {
          setHoverHu({
            hu: sample.hu,
            raw: sample.raw,
            px: sample.px,
            py: sample.py,
            tissueLabel: sample.tissue.label,
            tissueColor: sample.tissue.color,
          });
        } else {
          setHoverHu(null);
        }
      });
    },
    [canvasRef, parsedSlice, modality, tool, onPointerMove]
  );

  const clearHoverHu = useCallback(() => {
    if (rafIdRef.current !== null) {
      cancelAnimationFrame(rafIdRef.current);
      rafIdRef.current = null;
    }
    setHoverHu(null);
  }, []);

  return { hoverHu, handlePointerMoveWithHu, clearHoverHu };
}
