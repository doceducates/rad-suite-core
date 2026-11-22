'use client';

import React, { useState, useEffect, useRef, useMemo } from 'react';
import { useDicomViewport } from '@/hooks/use-dicom-viewport';
import { useDicomSliceLoader } from '@/hooks/use-dicom-slice-loader';
import { useDicomHuHover } from '@/hooks/use-dicom-hu-hover';
import { useDicomCanvasRenderer } from '@/hooks/use-dicom-canvas-renderer';
import { getSyntheticStudyDetail } from '@/services/dicom.service';
import type { SliceGeometry, ProjectedScoutLine } from '@/services/dicom-geometry.service';
import { useZenViewerSync } from '@/hooks/use-zen-viewer-sync';
import { DicomTool } from '@/components/dicom/dicom-toolbar';
import { ZenDicomHud } from './zen-dicom-hud';
import { type DicomMeasurement } from './zen-caliper-overlay';
import { type DicomAngleMeasurement } from './zen-angle-overlay';
import { type DicomCobbAngleMeasurement } from './zen-cobb-angle-overlay';
import { type DicomRoiMeasurement } from './zen-roi-overlay';
import { ZenDicomScrubber } from './zen-dicom-scrubber';
import { ZenDicomCanvasStage } from './zen-dicom-canvas-stage';
import { ZenPaneArrowControls } from './zen-pane-arrow-controls';
import { usePaneArrowScroll } from '@/hooks/use-pane-arrow-scroll';
import { useZenPointerEvents } from '@/hooks/use-zen-pointer-events';
import { useIsMobile } from '@/hooks/use-is-mobile';
import { useVitreaViewportInteractions } from '@/hooks/use-vitrea-viewport-interactions';
import { VitreaHudMenu } from './vitrea-hud-menu';
import { DicomPresetDropdown } from '@/components/dicom/dicom-preset-dropdown';
import { ZenTouchReticle } from './zen-touch-reticle';
import { getPresetsForModality, type ClinicalPreset } from '@/services/clinical-presets.service';

export interface LocalSeriesMeta {
  seriesNumber: string;
  seriesDescription: string;
  orientation: 'AXIAL' | 'SAGITTAL' | 'CORONAL';
  sliceCount: number;
}

interface ZenDicomViewerProps {
  accessionNumber: string;
  modality?: string;
  isLocalCase?: boolean;
  localCaseId?: string;
  localSeries?: LocalSeriesMeta[];
  activeSeriesIndex?: number;
  tool?: DicomTool;
  preset?: string;
  colormapId?: string;
  isCinePlaying?: boolean;
  onToggleCine?: () => void;
  invert?: boolean;
  externalSlice?: number;
  resetKey?: number;
  onSliceChange?: (sl: number) => void;
  scoutLines?: ProjectedScoutLine[];
  onSelectScoutSlice?: (seriesNumber: string | number, sliceIndex: number) => void;
  onGeometryUpdate?: (geom: SliceGeometry) => void;
  source?: 'local' | 's3' | 'pacs' | 'edge';
  active3DPoint?: [number, number, number] | null;
  onPoint3DSelect?: (pt: [number, number, number]) => void;
  isCrosshairVisible?: boolean;
  onClear3DPoint?: () => void;
}

export function ZenDicomViewer({
  accessionNumber,
  modality = 'CT',
  isLocalCase = false,
  localCaseId,
  localSeries = [],
  activeSeriesIndex = 0,
  tool = 'wl',
  preset = 'soft',
  colormapId = 'grayscale',
  isCinePlaying = false,
  onToggleCine,
  invert = false,
  externalSlice,
  resetKey,
  onSliceChange,
  scoutLines = [],
  onSelectScoutSlice,
  onGeometryUpdate,
  source,
  active3DPoint,
  onPoint3DSelect,
  isCrosshairVisible = true,
  onClear3DPoint,
}: ZenDicomViewerProps) {
  const [activeTool, setActiveTool] = useState<DicomTool>(tool);
  const [activePresetId, setActivePresetId] = useState(preset);
  const [measurements, setMeasurements] = useState<DicomMeasurement[]>([]);
  const [angleMeasurements, setAngleMeasurements] = useState<DicomAngleMeasurement[]>([]);
  const [cobbMeasurements, setCobbMeasurements] = useState<DicomCobbAngleMeasurement[]>([]);
  const [roiMeasurements, setRoiMeasurements] = useState<DicomRoiMeasurement[]>([]);
  const [glEnabled, setGlEnabled] = useState(false);
  const isMobile = useIsMobile();
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => { setActiveTool(tool); }, [tool]);
  useEffect(() => { setActivePresetId(preset); }, [preset]);

  const demoStudy = getSyntheticStudyDetail(accessionNumber, modality);
  const isRealDcm = isLocalCase && localSeries.length > 0;
  const currentSeries = isRealDcm
    ? localSeries[activeSeriesIndex] || localSeries[0]
    : demoStudy.series[activeSeriesIndex] || demoStudy.series[0];
  const maxSlices = isRealDcm
    ? (currentSeries as LocalSeriesMeta).sliceCount
    : (currentSeries as any)?.instances?.length || 32;

  const {
    zoom, setZoom, pan, setPan, slice, setSlice, changeSliceByUser, ww, setWw, wc, setWc, isSpacePressed, resetViewport,
    handleWheel, handlePointerDown: basePointerDown, handlePointerMove: basePointerMove, handlePointerUp: basePointerUp,
    handleTouchStart, handleTouchMove, handleTouchEnd,
  } = useDicomViewport({ maxSlices, initialWw: 380, initialWc: 40, containerRef, onSliceChange });

  const { isHovered, handlePointerEnter, handlePointerLeave, startSmoothScroll, stopSmoothScroll } = usePaneArrowScroll({
    containerRef,
    onStepSlice: (delta) => changeSliceByUser((s) => s + delta),
    onJumpSlice: (target) => changeSliceByUser(target === 'first' ? 0 : maxSlices - 1),
  });

  const { parsedSlice, sliceKey, defaultWl } = useDicomSliceLoader({
    isRealDcm, localCaseId, currentSeries, slice, setWw, setWc,
  });

  const { hoverHu, handlePointerMoveWithHu, clearHoverHu } = useDicomHuHover({
    canvasRef, parsedSlice, modality, tool: activeTool, onPointerMove: basePointerMove,
  });

  const { hudOpen, hudPos, openHud, closeHud, reticle, handlePointerDown: vitreaPointerDown, handlePointerMove: vitreaPointerMove, handlePointerUp: vitreaPointerUp } =
    useVitreaViewportInteractions({
      activeTool,
      onStepSlice: (d) => changeSliceByUser((s) => s + d),
      ww, wc, setWw, setWc, setPan, setZoom, isMobile,
    });

  useDicomCanvasRenderer({
    canvasRef, isRealDcm, parsedSlice, slice, maxSlices, modality, preset: activePresetId, zoom, pan, ww, wc, invert,
    enabled: !glEnabled || !isRealDcm || !parsedSlice,
  });

  const { seriesLabel, orient, seriesNum, currentGeometry } = useZenViewerSync({
    slice, maxSlices, setSlice, externalSlice, activeSeriesIndex, preset: activePresetId, setWw, setWc,
    resetKey, resetViewport, defaultWl, isCinePlaying, currentSeries, parsedSlice, onGeometryUpdate,
  });

  const { handlePointerDownCombined, handlePointerMoveCombined } = useZenPointerEvents({
    tool: activeTool, isSpacePressed, canvasRef, currentGeometry, onPoint3DSelect,
    handlePointerDown: (e) => { vitreaPointerDown(e); basePointerDown(e); },
    handlePointerMoveWithHu: (e) => { vitreaPointerMove(e); handlePointerMoveWithHu(e); },
  });

  // Keyboard 1-9 shortcuts for instant clinical presets
  useEffect(() => {
    const presetsList = getPresetsForModality(modality);
    const onKey = (e: KeyboardEvent) => {
      const idx = parseInt(e.key, 10) - 1;
      if (idx >= 0 && idx < presetsList.length) {
        const p = presetsList[idx];
        setActivePresetId(p.id);
        setWw(p.ww);
        setWc(p.wc);
      }
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [modality, setWc, setWw]);

  const seriesMeta = useMemo(() => ({
    seriesDescription: (currentSeries as any)?.seriesDescription || (currentSeries as any)?.description || parsedSlice?.meta.seriesDescription,
    protocolName: parsedSlice?.meta.protocolName,
    sequenceName: parsedSlice?.meta.sequenceName,
    inversionTime: parsedSlice?.meta.inversionTime,
    repetitionTime: parsedSlice?.meta.repetitionTime,
    echoTime: parsedSlice?.meta.echoTime,
    headerWc: parsedSlice?.meta.windowCenter,
    headerWw: parsedSlice?.meta.windowWidth,
  }), [currentSeries, parsedSlice]);

  return (
    <div
      ref={containerRef}
      onPointerEnter={handlePointerEnter}
      onPointerLeave={handlePointerLeave}
      onContextMenu={(e) => { e.preventDefault(); openHud(e.clientX, e.clientY); }}
      className="relative w-full h-full bg-black select-none overflow-hidden group"
    >
      <div
        className="relative w-full h-full bg-black flex items-center justify-center overflow-hidden touch-none select-none cursor-crosshair"
        onWheel={(e) => { if (e.ctrlKey || e.metaKey || activeTool === 'zoom') return; handleWheel(e, activeTool); }}
        onPointerDown={
          (!['length', 'angle', 'cobb', 'roi', 'rect_roi'].includes(activeTool)) || isSpacePressed
            ? handlePointerDownCombined
            : undefined
        }
        onPointerMove={handlePointerMoveCombined}
        onPointerUp={(e) => { vitreaPointerUp(e); basePointerUp(e); }}
        onPointerLeave={clearHoverHu}
        onTouchStart={handleTouchStart}
        onTouchMove={(e) => handleTouchMove(e, activeTool)}
        onTouchEnd={handleTouchEnd}
        onTouchCancel={handleTouchEnd}
      >
        <ZenDicomCanvasStage
          canvasRef={canvasRef} isRealDcm={isRealDcm} parsedSlice={parsedSlice} sliceKey={sliceKey}
          ww={ww} wc={wc} invert={invert} colormapId={colormapId} pan={pan} zoom={zoom} glEnabled={glEnabled}
          onGlFallback={() => setGlEnabled(false)} tool={activeTool} measurements={measurements}
          onAddMeasurement={(m) => setMeasurements((prev) => [...prev, m])}
          onDeleteMeasurement={(id) => setMeasurements((prev) => prev.filter((m) => m.id !== id))}
          onClearMeasurements={() => setMeasurements([])}
          angleMeasurements={angleMeasurements}
          onAddAngleMeasurement={(m) => setAngleMeasurements((prev) => [...prev, m])}
          onDeleteAngleMeasurement={(id) => setAngleMeasurements((prev) => prev.filter((m) => m.id !== id))}
          onClearAngleMeasurements={() => setAngleMeasurements([])}
          cobbMeasurements={cobbMeasurements}
          onAddCobbMeasurement={(m) => setCobbMeasurements((prev) => [...prev, m])}
          onDeleteCobbMeasurement={(id) => setCobbMeasurements((prev) => prev.filter((m) => m.id !== id))}
          onClearCobbMeasurements={() => setCobbMeasurements([])}
          roiMeasurements={roiMeasurements}
          onAddRoiMeasurement={(m) => setRoiMeasurements((prev) => [...prev, m])}
          onDeleteRoiMeasurement={(id) => setRoiMeasurements((prev) => prev.filter((m) => m.id !== id))}
          onClearRoiMeasurements={() => setRoiMeasurements([])}
          scoutLines={scoutLines} onSelectScoutSlice={onSelectScoutSlice}
          active3DPoint={active3DPoint} currentGeometry={currentGeometry}
          isCrosshairVisible={isCrosshairVisible} onClear3DPoint={onClear3DPoint}
        />

        <ZenTouchReticle visible={reticle.visible} x={reticle.x} y={reticle.y} text={reticle.text} />

        <ZenPaneArrowControls
          slice={slice} maxSlices={maxSlices}
          startSmoothScroll={startSmoothScroll} stopSmoothScroll={stopSmoothScroll}
          visible={isHovered} isMobile={isMobile}
          onStepSlice={(delta) => changeSliceByUser((s) => s + delta)}
        />

        <ZenDicomHud
          patientName={parsedSlice?.meta.patientName || demoStudy.patientName}
          patientId={parsedSlice?.meta.patientId || accessionNumber}
          modality={modality} seriesLabel={seriesLabel} seriesNumber={seriesNum}
          slice={slice} maxSlices={maxSlices} orient={orient} iop={parsedSlice?.meta.imageOrientationPatient}
          ww={ww} wc={wc} zoom={zoom} hoverHu={hoverHu} source={source}
        />

        {/* Responsive Clinical Preset Dropdown Menu */}
        <div className="absolute top-2 left-2 z-20">
          <DicomPresetDropdown
            modality={modality}
            activePresetId={activePresetId}
            pixelData={parsedSlice?.pixelData}
            seriesMeta={seriesMeta}
            currentWw={ww}
            currentWc={wc}
            onSelectPreset={(p: ClinicalPreset) => {
              setActivePresetId(p.id);
              setWw(p.ww);
              setWc(p.wc);
            }}
          />
        </div>

        <ZenDicomScrubber
          seriesNumber={seriesNum} slice={slice} maxSlices={maxSlices}
          pixelSpacing={parsedSlice?.meta.pixelSpacing?.[0]}
          onSliceChange={changeSliceByUser}
          startSmoothScroll={startSmoothScroll} stopSmoothScroll={stopSmoothScroll}
          isCinePlaying={isCinePlaying} onToggleCine={onToggleCine}
          caseId={localCaseId} orientation={orient || currentSeries?.orientation}
          floating={true}
        />

        {/* Vitrea 3x5 Floating Right-Click HUD Menu */}
        <VitreaHudMenu
          isOpen={hudOpen}
          onClose={closeHud}
          position={hudPos}
          activeTool={activeTool}
          onSelectTool={setActiveTool}
          canUndo={measurements.length > 0 || angleMeasurements.length > 0}
          canRedo={false}
          onUndo={() => {
            if (measurements.length > 0) setMeasurements((prev) => prev.slice(0, -1));
            else if (angleMeasurements.length > 0) setAngleMeasurements((prev) => prev.slice(0, -1));
          }}
          onReset={resetViewport}
          modality={modality}
        />
      </div>
    </div>
  );
}
