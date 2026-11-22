'use client';

import React, { useRef, useState, useEffect } from 'react';
import { useThreeVolumeRenderer, VolumePreset } from '@/hooks/use-three-volume-renderer';
import { buildDicomVolumeData, DicomVolumeData } from '@/services/dicom-volume-builder.service';
import { dicomCache } from '@/services/dicom-cache.service';
import { ParsedDicomFile } from '@/services/dicom-loader.service';
import { Zen3DHud, StudioRenderMode } from './zen-3d-hud';
import { ZenMprView } from './zen-mpr-view';

interface Zen3DVolumeStageProps {
  localCaseId?: string;
  seriesList?: any[];
  activeSeriesIndex?: number;
  onSelectSeries?: (index: number) => void;
  currentSeries: any;
  modality?: string;
  onClose?: () => void;
}

export function Zen3DVolumeStage({
  localCaseId,
  seriesList = [],
  activeSeriesIndex = 0,
  onSelectSeries,
  currentSeries,
  onClose,
}: Zen3DVolumeStageProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);

  const [renderMode, setRenderMode] = useState<StudioRenderMode>('3d-volume');
  const [preset, setPreset] = useState<VolumePreset>('bone');
  const [threshold, setThreshold] = useState(0.22);
  const [volumeData, setVolumeData] = useState<DicomVolumeData | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [loadProgress, setLoadProgress] = useState(0);

  const sNum = currentSeries?.seriesNumber || '1';
  const totalSlices = currentSeries?.sliceCount || currentSeries?.instances?.length || 32;
  const files = currentSeries?.files;

  useEffect(() => {
    let cancelled = false;
    setIsLoading(true);
    setLoadProgress(0);

    async function loadSeriesVolume() {
      const sliceBuffers: (ParsedDicomFile | null)[] = [];
      const width = 256;
      const height = 256;

      for (let i = 0; i < totalSlices; i++) {
        if (cancelled) return;
        let parsed = localCaseId ? dicomCache.get(dicomCache.getSliceKey(localCaseId, sNum, i)) : null;

        if (!parsed && localCaseId) {
          parsed = await dicomCache.fetchAndCache(localCaseId, sNum, i, files?.[i]);
        }

        sliceBuffers.push(parsed);
        setLoadProgress(Math.round(((i + 1) / totalSlices) * 100));
      }

      if (cancelled) return;

      const firstMeta = sliceBuffers.find((s) => s?.meta)?.meta;
      const built = buildDicomVolumeData({
        width: firstMeta?.columns || width,
        height: firstMeta?.rows || height,
        depth: totalSlices,
        slices: sliceBuffers,
        pixelSpacing: firstMeta?.pixelSpacing || [1.0, 1.0],
        sliceThickness: firstMeta?.sliceThickness || 2.0,
      });

      setVolumeData(built);
      setIsLoading(false);
    }

    loadSeriesVolume();

    return () => {
      cancelled = true;
    };
  }, [localCaseId, sNum, totalSlices, files]);

  useThreeVolumeRenderer({
    canvasRef,
    containerRef,
    volumeData: renderMode === '3d-volume' ? volumeData : null,
    preset,
    threshold,
  });

  return (
    <div ref={containerRef} className="relative w-full h-full bg-zinc-950 flex flex-col select-none overflow-hidden">
      {/* Top HUD Toolbar with Mode, Series, and Presets */}
      <Zen3DHud
        renderMode={renderMode}
        onSelectRenderMode={setRenderMode}
        preset={preset}
        onSelectPreset={setPreset}
        seriesList={seriesList}
        activeSeriesIndex={activeSeriesIndex}
        onSelectSeries={onSelectSeries}
        currentSeriesName={currentSeries?.seriesDescription || `Series #${sNum}`}
        totalSlices={totalSlices}
        onClose={onClose}
      />

      {/* Loading Overlay */}
      {isLoading && (
        <div className="absolute inset-0 bg-black/75 backdrop-blur-xs flex flex-col items-center justify-center gap-3 z-40">
          <div className="w-8 h-8 rounded-full border-2 border-primary border-t-transparent animate-spin" />
          <div className="font-mono text-xs text-on-surface">
            Building 3D Voxel Texture ({loadProgress}%)
          </div>
          <div className="w-48 h-1 bg-surface-container rounded-full overflow-hidden">
            <div className="h-full bg-primary transition-all duration-150" style={{ width: `${loadProgress}%` }} />
          </div>
        </div>
      )}

      {/* Mode 1: 3D Volumetric Raymarching View */}
      <div className={`w-full h-full pt-12 ${renderMode === '3d-volume' ? 'block' : 'hidden'}`}>
        <canvas ref={canvasRef} className="w-full h-full cursor-grab active:cursor-grabbing block" />

        {/* Bottom Floating Density Threshold */}
        <div className="absolute bottom-3 left-1/2 -translate-x-1/2 z-30 flex items-center gap-4 bg-surface-container-highest/85 backdrop-blur-md px-4 py-2 rounded-2xl border border-outline-variant/50 shadow-2xl">
          <div className="flex items-center gap-2">
            <span className="font-mono text-[10px] text-secondary font-bold uppercase">Threshold</span>
            <input
              type="range"
              min={0.05}
              max={0.8}
              step={0.01}
              value={threshold}
              onChange={(e) => setThreshold(Number(e.target.value))}
              className="w-28 accent-primary h-1 bg-surface-variant rounded-full cursor-pointer"
            />
            <span className="font-mono text-[10px] text-primary font-bold">{Math.round(threshold * 100)}%</span>
          </div>
          <span className="h-3 w-px bg-outline-variant/60" />
          <div className="font-mono text-[10px] text-secondary hidden sm:block">
            Left Drag: Rotate • Right Drag: Pan • Scroll: Zoom
          </div>
        </div>
      </div>

      {/* Mode 2: Orthogonal Multi-Planar Reconstruction (MPR) */}
      {renderMode === 'mpr-triplanar' && volumeData && (
        <div className="w-full h-full pt-12">
          <ZenMprView volumeData={volumeData} />
        </div>
      )}
    </div>
  );
}
