'use client';

import React, { useEffect, useRef, useState } from 'react';
import { StitchSeriesItem } from './stitch-filmstrip';
import { parseDicomBuffer, renderDicomPixelsToImageData } from '@/services/dicom-loader.service';
import { drawMedicalDicomSlice } from '@/components/dicom/dicom-canvas-renderer';
import { getAutoWlForSeries } from '@/services/dicom-wl-presets.service';

interface ZenSeriesThumbnailProps {
  series: StitchSeriesItem;
  index: number;
  modality?: string;
  isLocalCase?: boolean;
  localCaseId?: string;
  width?: number;
  height?: number;
  invert?: boolean;
}

// Global in-memory cache for rendered thumbnails to avoid repeated decoding
const thumbnailCache = new Map<string, string>();

export function ZenSeriesThumbnail({
  series,
  index,
  modality = 'CT',
  isLocalCase = false,
  localCaseId,
  width = 120,
  height = 120,
  invert = false,
}: ZenSeriesThumbnailProps) {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const [hasRendered, setHasRendered] = useState(false);
  const [isLoading, setIsLoading] = useState(false);

  const orient = series.orientation || 'AXIAL';
  const midSlice = Math.floor((series.sliceCount || 24) / 2);
  const sNum = series.seriesNumber || String(index + 1);
  const cacheKey = isLocalCase && localCaseId
    ? `${localCaseId}_${sNum}_${midSlice}_inv${invert ? 1 : 0}`
    : `demo_${orient}_${modality}_inv${invert ? 1 : 0}`;

  useEffect(() => {
    let cancelled = false;
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    // Check if thumbnail image was already cached
    const cachedDataUrl = thumbnailCache.get(cacheKey);
    if (cachedDataUrl) {
      const img = new Image();
      img.onload = () => {
        if (cancelled || !canvasRef.current) return;
        ctx.clearRect(0, 0, width, height);
        ctx.drawImage(img, 0, 0, width, height);
        setHasRendered(true);
      };
      img.src = cachedDataUrl;
      return;
    }

    // Real DICOM series from local storage
    if (isLocalCase && localCaseId) {
      setIsLoading(true);
      fetch(`/api/cases/slice?caseId=${encodeURIComponent(localCaseId)}&series=${sNum}&index=${midSlice}`)
        .then(async (res) => {
          if (!res.ok) throw new Error('Slice fetch failed');
          return res.arrayBuffer();
        })
        .then((buf) => {
          if (cancelled || !canvasRef.current) return;
          const parsed = parseDicomBuffer(buf);

          // Use real calibrated metadata W/L or Vitrea sequence-adaptive calibration
          const hasValidMetaWl =
            parsed.meta.windowWidth &&
            parsed.meta.windowCenter &&
            parsed.meta.windowWidth > 20 &&
            parsed.meta.windowWidth <= 65535;

          const autoWl = getAutoWlForSeries({
            seriesDescription: series.seriesDescription || parsed.meta.seriesDescription,
            protocolName: parsed.meta.protocolName,
            sequenceName: parsed.meta.sequenceName,
            inversionTime: parsed.meta.inversionTime,
            repetitionTime: parsed.meta.repetitionTime,
            echoTime: parsed.meta.echoTime,
            modality: series.modality || modality,
            headerWw: parsed.meta.windowWidth,
            headerWc: parsed.meta.windowCenter,
          });

          const ww = hasValidMetaWl ? parsed.meta.windowWidth : autoWl.ww;
          const wc = hasValidMetaWl ? parsed.meta.windowCenter : autoWl.wc;

          // Render into offscreen buffer at native resolution
          const offscreen = document.createElement('canvas');
          offscreen.width = parsed.meta.columns;
          offscreen.height = parsed.meta.rows;
          const offCtx = offscreen.getContext('2d');
          if (!offCtx) return;

          const imgData = renderDicomPixelsToImageData(
            offCtx,
            parsed.pixelData,
            parsed.meta,
            ww,
            wc,
            invert
          );
          offCtx.putImageData(imgData, 0, 0);

          // Draw scaled thumbnail to display canvas
          ctx.clearRect(0, 0, width, height);
          ctx.drawImage(offscreen, 0, 0, width, height);

          // Save to in-memory cache
          try {
            thumbnailCache.set(cacheKey, canvas.toDataURL('image/jpeg', 0.85));
          } catch {}
          setHasRendered(true);
          setIsLoading(false);
        })
        .catch(() => {
          if (cancelled || !canvasRef.current) return;
          fallbackRender(ctx);
          setIsLoading(false);
        });
    } else {
      // Synthetic / Demo / PACS study fallback rendering
      fallbackRender(ctx);
    }

    function fallbackRender(renderCtx: CanvasRenderingContext2D) {
      drawMedicalDicomSlice({
        ctx: renderCtx,
        width,
        height,
        slice: 12,
        maxSlices: 24,
        modality: series.modality || modality,
        preset: 'soft',
        sequenceKey: orient === 'SAGITTAL' ? 'sagittal' : orient === 'CORONAL' ? 'coronal' : 'axial-std',
        invert,
        rotate: 0,
        flip: false,
      });
      if (canvasRef.current) {
        try {
          thumbnailCache.set(cacheKey, canvasRef.current.toDataURL('image/jpeg', 0.8));
        } catch {}
      }
      setHasRendered(true);
    }

    return () => {
      cancelled = true;
    };
  }, [cacheKey, isLocalCase, localCaseId, sNum, midSlice, width, height, orient, modality, series.seriesDescription, series.modality, invert]);

  return (
    <div className="relative w-full h-full bg-black flex items-center justify-center overflow-hidden">
      <canvas
        ref={canvasRef}
        width={width}
        height={height}
        className={`w-full h-full object-cover transition-opacity duration-200 ${
          hasRendered ? 'opacity-100' : 'opacity-0'
        }`}
      />
      {(!hasRendered || isLoading) && (
        <div className="absolute inset-0 bg-neutral-900 animate-pulse flex items-center justify-center">
          <span className="text-[10px] font-mono font-bold text-neutral-400">
            {orient.slice(0, 3)}
          </span>
        </div>
      )}
    </div>
  );
}
