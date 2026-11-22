'use client';

import { useEffect, useCallback, RefObject } from 'react';
import { ParsedDicomFile, renderDicomPixelsToImageData } from '@/services/dicom-loader.service';
import { drawMedicalDicomSlice } from '@/components/dicom/dicom-canvas-renderer';

interface UseDicomCanvasRendererOptions {
  canvasRef: RefObject<HTMLCanvasElement | null>;
  isRealDcm: boolean;
  parsedSlice: ParsedDicomFile | null;
  slice: number;
  maxSlices: number;
  modality: string;
  preset: string;
  zoom: number;
  pan: { x: number; y: number };
  ww: number;
  wc: number;
  invert: boolean;
  enabled?: boolean;
}

export function useDicomCanvasRenderer({
  canvasRef,
  isRealDcm,
  parsedSlice,
  slice,
  maxSlices,
  modality,
  preset,
  zoom,
  pan,
  ww,
  wc,
  invert,
  enabled = true,
}: UseDicomCanvasRendererOptions) {
  const renderCanvas = useCallback(() => {
    if (!enabled) return;
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    if (isRealDcm && parsedSlice) {
      canvas.width = parsedSlice.meta.columns;
      canvas.height = parsedSlice.meta.rows;
      const imgData = renderDicomPixelsToImageData(
        ctx,
        parsedSlice.pixelData,
        parsedSlice.meta,
        ww,
        wc,
        invert
      );
      ctx.putImageData(imgData, 0, 0);
    } else {
      canvas.width = 640;
      canvas.height = 480;
      drawMedicalDicomSlice({
        ctx,
        width: 640,
        height: 480,
        slice,
        maxSlices,
        modality,
        preset,
        sequenceKey: 'axial-std',
        invert,
        rotate: 0,
        flip: false,
        zoom,
        pan,
      });
    }
  }, [enabled, isRealDcm, parsedSlice, slice, maxSlices, modality, preset, zoom, pan, ww, wc, invert, canvasRef]);

  useEffect(() => {
    renderCanvas();
  }, [renderCanvas]);
}
