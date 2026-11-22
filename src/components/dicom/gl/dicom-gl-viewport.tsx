'use client';

import { useEffect, useRef, useCallback } from 'react';
import { DicomGlPipeline, type RenderUniforms } from './dicom-gl-pipeline';
import type { ParsedDicomFile } from '@/services/dicom-loader.service';
import { buildVtkColorLut } from '@/services/vtk-colormaps.service';

interface DicomGlViewportProps {
  parsedSlice: ParsedDicomFile;
  sliceKey: string;
  windowWidth: number;
  windowCenter: number;
  invert: boolean;
  colormapId?: string;
  zoom?: number;
  pan?: { x: number; y: number };
  rotate?: number;
  flip?: boolean;
  className?: string;
  canvasRef?: React.RefObject<HTMLCanvasElement | null>;
  onFallback?: () => void;
}

export function DicomGlViewport({
  parsedSlice,
  sliceKey,
  windowWidth,
  windowCenter,
  invert,
  colormapId = 'grayscale',
  zoom = 1,
  pan = { x: 0, y: 0 },
  rotate = 0,
  flip = false,
  className = 'w-full h-full object-contain cursor-crosshair',
  canvasRef: externalCanvasRef,
  onFallback,
}: DicomGlViewportProps) {
  const internalCanvasRef = useRef<HTMLCanvasElement>(null);
  const canvasRef = externalCanvasRef || internalCanvasRef;
  const pipelineRef = useRef<DicomGlPipeline | null>(null);
  const rafIdRef = useRef<number | null>(null);

  // Keep latest uniforms in ref to render immediately on RAF without re-binding effects
  const latestPropsRef = useRef({
    parsedSlice,
    windowWidth,
    windowCenter,
    invert,
    colormapId,
    zoom,
    pan,
    rotate,
    flip,
  });

  useEffect(() => {
    latestPropsRef.current = {
      parsedSlice,
      windowWidth,
      windowCenter,
      invert,
      colormapId,
      zoom,
      pan,
      rotate,
      flip,
    };
  });

  // High-performance RAF-throttled GPU render (capped at monitor refresh, e.g. 120/144 FPS)
  const scheduleRender = useCallback(() => {
    if (rafIdRef.current !== null) return;

    rafIdRef.current = requestAnimationFrame(() => {
      rafIdRef.current = null;
      const pipeline = pipelineRef.current;
      const canvas = canvasRef.current;
      const { parsedSlice: slice, windowWidth: ww, windowCenter: wc, invert: inv, colormapId: cmap, zoom: z, pan: p, rotate: r, flip: f } =
        latestPropsRef.current;

      if (!pipeline || !slice || !canvas) return;

      const { meta } = slice;
      if (canvas.width !== meta.columns) canvas.width = meta.columns;
      if (canvas.height !== meta.rows) canvas.height = meta.rows;

      const uniforms: RenderUniforms = {
        windowWidth: ww,
        windowCenter: wc,
        invert: inv,
        colormapId: cmap,
        zoom: z,
        pan: p,
        rotate: r,
        flip: f,
      };

      pipeline.render(meta, uniforms);
    });
  }, [canvasRef]);

  // 1. Initialize WebGL2 Pipeline STRICTLY ONCE on canvas mount
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    try {
      const gl = canvas.getContext('webgl2', {
        alpha: false,
        depth: false,
        antialias: false,
        preserveDrawingBuffer: true,
        powerPreference: 'high-performance',
      });

      if (!gl) {
        console.warn('WebGL2 not supported, falling back to 2D canvas.');
        onFallback?.();
        return;
      }

      const pipeline = new DicomGlPipeline(gl);
      pipelineRef.current = pipeline;

      if (colormapId && colormapId !== 'grayscale') {
        pipeline.uploadLutTexture(buildVtkColorLut(colormapId), colormapId);
      }

      if (parsedSlice) {
        pipeline.uploadSliceTexture(parsedSlice.pixelData, parsedSlice.meta, sliceKey);
        scheduleRender();
      }

      return () => {
        if (rafIdRef.current !== null) {
          cancelAnimationFrame(rafIdRef.current);
          rafIdRef.current = null;
        }
        pipeline.destroy();
        pipelineRef.current = null;
      };
    } catch (err) {
      console.error('Failed to initialize WebGL2 DICOM pipeline:', err);
      onFallback?.();
    }
  }, [canvasRef, onFallback]); // Strictly runs on mount/unmount!

  // 2. Upload slice texture ONLY when the slice data / key changes
  useEffect(() => {
    if (!pipelineRef.current || !parsedSlice) return;
    pipelineRef.current.uploadSliceTexture(parsedSlice.pixelData, parsedSlice.meta, sliceKey);
    scheduleRender();
  }, [parsedSlice, sliceKey, scheduleRender]);

  // 2b. Upload Colormap LUT ONLY when colormapId changes
  useEffect(() => {
    if (!pipelineRef.current) return;
    if (colormapId && colormapId !== 'grayscale') {
      pipelineRef.current.uploadLutTexture(buildVtkColorLut(colormapId), colormapId);
    }
    scheduleRender();
  }, [colormapId, scheduleRender]);

  // 3. Render GPU frame when uniforms change (throttled via RAF)
  useEffect(() => {
    scheduleRender();
  }, [windowWidth, windowCenter, invert, colormapId, zoom, pan, rotate, flip, scheduleRender]);

  return (
    <canvas
      key="webgl2-dicom-canvas"
      ref={canvasRef}
      className={className}
    />
  );
}
