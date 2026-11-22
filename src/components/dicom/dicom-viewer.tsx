'use client';

import { useState, useEffect, useRef, useCallback } from 'react';
import { DicomToolbar, type DicomTool } from './dicom-toolbar';
import { DicomSequenceRail } from './dicom-sequence-rail';
import { DicomTouchDock } from './dicom-touch-dock';
import { DicomHud } from './dicom-hud';
import { DicomGridContainer } from './dicom-grid-container';
import { DicomMobileTopBar } from './dicom-mobile-top-bar';
import { DicomMobileActionsSheet } from './dicom-mobile-actions-sheet';
import { ZenPaneArrowControls } from '@/components/workstation/zen-pane-arrow-controls';
import { ZenDicomScrubber } from '@/components/workstation/zen-dicom-scrubber';
import { useDicomViewport } from '@/hooks/use-dicom-viewport';
import { useIsMobile } from '@/hooks/use-is-mobile';
import { useCaseLoadingProgress } from '@/hooks/use-case-loading-progress';
import { getSyntheticStudyDetail, WINDOW_PRESETS } from '@/services/dicom.service';
import { drawMedicalDicomSlice } from './dicom-canvas-renderer';
import { parseDicomBuffer, type ParsedDicomFile } from '@/services/dicom-loader.service';
import { DicomGlViewport } from './gl/dicom-gl-viewport';
import type { ViewportLayoutMode, MobileTouchMode } from '@/types/viewport';

interface DicomViewerProps {
  accessionNumber: string;
  modality?: string;
}

export function DicomViewer({ accessionNumber, modality = 'CT' }: DicomViewerProps) {
  const isMobile = useIsMobile();
  const [layout, setLayout] = useState<ViewportLayoutMode>('1x1');
  const [tool, setTool] = useState<DicomTool>('wl');
  const [touchMode, setTouchMode] = useState<MobileTouchMode>('scrub');
  const [preset, setPreset] = useState('brain');
  const [cine, setCine] = useState(false);
  const [rotate, setRotate] = useState(0);
  const [flip, setFlip] = useState(false);
  const [invert, setInvert] = useState(false);
  const [seriesIndex, setSeriesIndex] = useState(0);
  const [parsedDicom, setParsedDicom] = useState<ParsedDicomFile | null>(null);
  const [loadingPacs, setLoadingPacs] = useState(false);
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [isActionsSheetOpen, setIsActionsSheetOpen] = useState(false);

  const containerRef = useRef<HTMLDivElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const study = getSyntheticStudyDetail(accessionNumber, modality);
  const currentSeries = study.series[seriesIndex] || study.series[0];
  const maxSlices = currentSeries.instances.length;

  useCaseLoadingProgress(accessionNumber, modality);

  const {
    zoom, setZoom, pan, slice, setSlice, changeSliceByUser, handleEdgeScrub,
    ww, wc, resetViewport,
    handleWheel, handlePointerDown, handlePointerMove, handlePointerUp,
    handleTouchStart, handleTouchMove, handleTouchEnd,
  } = useDicomViewport({
    maxSlices,
    initialWw: WINDOW_PRESETS[preset as keyof typeof WINDOW_PRESETS]?.ww || 350,
    initialWc: WINDOW_PRESETS[preset as keyof typeof WINDOW_PRESETS]?.wc || 50,
    touchMode,
  });

  // Keep preset in sync with series preset
  useEffect(() => {
    if (currentSeries?.windowPreset) setPreset(currentSeries.windowPreset);
  }, [seriesIndex, currentSeries]);

  // Cine playback loop
  useEffect(() => {
    if (!cine || loadingPacs || parsedDicom) return;
    const timer = setInterval(() => setSlice((s) => (s + 1) % maxSlices), 120);
    return () => clearInterval(timer);
  }, [cine, maxSlices, loadingPacs, parsedDicom, setSlice]);

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = (event) => {
      try {
        const buffer = event.target?.result as ArrayBuffer;
        setParsedDicom(parseDicomBuffer(buffer));
      } catch (err) {
        console.error('Failed to parse DICOM:', err);
      }
    };
    reader.readAsArrayBuffer(file);
  };

  const drawCanvas = useCallback(() => {
    if (parsedDicom) return;
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    canvas.width = 640;
    canvas.height = 480;
    drawMedicalDicomSlice({
      ctx,
      width: canvas.width,
      height: canvas.height,
      slice,
      maxSlices,
      modality,
      preset,
      sequenceKey: currentSeries.sequenceKey,
      invert,
      rotate,
      flip,
      zoom,
      pan,
    });
  }, [slice, maxSlices, modality, preset, currentSeries.sequenceKey, invert, rotate, flip, zoom, pan, parsedDicom]);

  useEffect(() => {
    drawCanvas();
  }, [drawCanvas]);

  const toggleFullscreen = () => {
    if (!containerRef.current) return;
    if (!document.fullscreenElement) {
      containerRef.current.requestFullscreen?.().then(() => setIsFullscreen(true)).catch(() => {});
    } else {
      document.exitFullscreen?.().then(() => setIsFullscreen(false)).catch(() => {});
    }
  };

  const handleResetAll = () => {
    resetViewport();
    setRotate(0);
    setFlip(false);
    setInvert(false);
    setParsedDicom(null);
  };

  return (
    <div ref={containerRef} className="flex flex-col h-full bg-zinc-950 text-white relative overflow-hidden rounded-lg select-none">
      <input type="file" ref={fileInputRef} onChange={handleFileUpload} accept=".dcm,application/dicom" className="hidden" />

      {/* Top Header Controls: Mobile Compact vs Desktop Toolbar */}
      {isMobile ? (
        <DicomMobileTopBar
          series={study.series}
          activeSeriesIndex={seriesIndex}
          onSelectSeries={setSeriesIndex}
          preset={preset}
          onSelectPreset={setPreset}
          layout={layout}
          onOpenLayoutModal={() => setIsActionsSheetOpen(true)}
          isFullscreen={isFullscreen}
          onToggleFullscreen={toggleFullscreen}
          onOpenMoreActions={() => setIsActionsSheetOpen(true)}
        />
      ) : (
        <>
          <DicomSequenceRail series={study.series} activeIndex={seriesIndex} onSelectSeries={setSeriesIndex} />
          <DicomToolbar
            activeTool={tool}
            onSelectTool={setTool}
            preset={preset}
            onSelectPreset={setPreset}
            cine={cine}
            onToggleCine={() => setCine(!cine)}
            onRotate={() => setRotate((r) => (r + 90) % 360)}
            onFlip={() => setFlip(!flip)}
            invert={invert}
            onToggleInvert={() => setInvert(!invert)}
            onReset={handleResetAll}
            zoomLevel={zoom}
            onZoomIn={() => setZoom((z) => Math.min(8.0, Number((z + 0.25).toFixed(2))))}
            onZoomOut={() => setZoom((z) => Math.max(0.5, Number((z - 0.25).toFixed(2))))}
            onFit={resetViewport}
            isFullscreen={isFullscreen}
            onToggleFullscreen={toggleFullscreen}
            layout={layout}
            onSelectLayout={setLayout}
          />
        </>
      )}

      {/* Viewport: Multi-View Grid or Single Full Viewport */}
      {layout !== '1x1' ? (
        <div className="flex-1 p-2 bg-black min-h-[380px] overflow-y-auto">
          <DicomGridContainer
            layout={layout}
            seriesList={study.series}
            activeTool={tool}
            modality={modality}
            accessionNumber={accessionNumber}
          />
        </div>
      ) : (
        <>
          {/* Interactive Medical Viewport */}
          <div
            className="relative flex-1 bg-black flex items-center justify-center select-none overflow-hidden touch-none"
            onWheel={(e) => handleWheel(e, tool)}
            onPointerDown={(e) => handlePointerDown(e)}
            onPointerMove={(e) => handlePointerMove(e, tool)}
            onPointerUp={handlePointerUp}
            onTouchStart={handleTouchStart}
            onTouchMove={(e) => handleTouchMove(e, tool)}
            onTouchEnd={handleTouchEnd}
          >
            {parsedDicom ? (
              <DicomGlViewport
                parsedSlice={parsedDicom}
                sliceKey="uploaded_dcm"
                windowWidth={ww}
                windowCenter={wc}
                invert={invert}
                zoom={zoom}
                pan={pan}
                rotate={rotate}
                flip={flip}
                className="w-full h-full object-contain cursor-crosshair"
              />
            ) : (
              <canvas ref={canvasRef} width={640} height={480} className="w-full h-full object-contain cursor-crosshair" />
            )}

            {/* Integrated Medical HUD */}
            <DicomHud
              patientName={parsedDicom ? parsedDicom.meta.patientName : study.patientName}
              patientId={parsedDicom ? parsedDicom.meta.patientId : study.patientId}
              modality={parsedDicom ? parsedDicom.meta.modality : study.modality}
              seriesDescription={parsedDicom ? parsedDicom.meta.studyDescription : currentSeries.description}
              accessionNumber={accessionNumber}
              sliceIndex={slice}
              maxSlices={maxSlices}
              windowWidth={ww}
              windowCenter={wc}
              zoomLevel={zoom}
              isLocalDcm={Boolean(parsedDicom)}
              orientation={currentSeries?.orientation}
              iop={parsedDicom?.meta?.imageOrientationPatient}
              isMobile={isMobile}
            />

            {/* Unified Sleek Right-Edge Arrow Capsule for Desktop & Mobile */}
            <ZenPaneArrowControls
              slice={slice}
              maxSlices={maxSlices}
              startSmoothScroll={(delta) => changeSliceByUser((s) => s + delta)}
              stopSmoothScroll={() => {}}
              visible={true}
              isMobile={isMobile}
              onStepSlice={(delta) => changeSliceByUser((s) => s + delta)}
            />

            {/* Smart Floating Bottom Scrubber (Desktop/Tablet) */}
            {!isMobile && (
              <ZenDicomScrubber
                slice={slice}
                maxSlices={maxSlices}
                onSliceChange={changeSliceByUser}
                isCinePlaying={cine}
                onToggleCine={() => setCine(!cine)}
                floating={true}
              />
            )}

            {/* Touch Dock for Quick Thumb Access on Mobile */}
            {isMobile && (
              <div className="absolute bottom-3 left-1/2 -translate-x-1/2 z-10 max-w-[94%]">
                <DicomTouchDock
                  activeTool={tool}
                  onSelectTool={setTool}
                  touchMode={touchMode}
                  onSelectTouchMode={setTouchMode}
                  onPrevSlice={() => changeSliceByUser((s) => s - 1)}
                  onNextSlice={() => changeSliceByUser((s) => s + 1)}
                  cine={cine}
                  onToggleCine={() => setCine(!cine)}
                  onReset={handleResetAll}
                  sliceIndex={slice}
                  maxSlices={maxSlices}
                />
              </div>
            )}
          </div>
        </>
      )}

      {/* Slide-Up More Actions Bottom Sheet */}
      <DicomMobileActionsSheet
        isOpen={isActionsSheetOpen}
        onClose={() => setIsActionsSheetOpen(false)}
        activeTool={tool}
        onSelectTool={setTool}
        layout={layout}
        onSelectLayout={setLayout}
        onRotate={() => setRotate((r) => (r + 90) % 360)}
        onFlip={() => setFlip(!flip)}
        invert={invert}
        onToggleInvert={() => setInvert(!invert)}
        onReset={handleResetAll}
      />
    </div>
  );
}
