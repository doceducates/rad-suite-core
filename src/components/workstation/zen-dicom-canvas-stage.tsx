'use client';

import React from 'react';
import { DicomGlViewport } from '@/components/dicom/gl/dicom-gl-viewport';
import { ZenCaliperOverlay, DicomMeasurement } from './zen-caliper-overlay';
import { ZenAngleOverlay, DicomAngleMeasurement } from './zen-angle-overlay';
import { ZenCobbAngleOverlay, DicomCobbAngleMeasurement } from './zen-cobb-angle-overlay';
import { ZenRoiOverlay, DicomRoiMeasurement } from './zen-roi-overlay';
import { ZenScoutLines } from './zen-scout-lines';
import { Zen3DCrosshair } from './zen-3d-crosshair';
import { ZenAnatomyPinOverlay } from './zen-anatomy-pin-overlay';
import { SliceGeometry, ProjectedScoutLine } from '@/services/dicom-geometry.service';
import type { ParsedDicomFile } from '@/services/dicom-loader.service';
import type { AnatomyAnnotationPoint } from '@/types';

interface ZenDicomCanvasStageProps {
  canvasRef: React.RefObject<HTMLCanvasElement | null>;
  isRealDcm: boolean;
  parsedSlice: ParsedDicomFile | null;
  sliceKey: string;
  ww: number;
  wc: number;
  invert: boolean;
  colormapId?: string;
  pan: { x: number; y: number };
  zoom: number;
  glEnabled: boolean;
  onGlFallback: () => void;
  tool: string;
  measurements: DicomMeasurement[];
  onAddMeasurement: (m: DicomMeasurement) => void;
  onDeleteMeasurement: (id: string) => void;
  onClearMeasurements: () => void;
  angleMeasurements?: DicomAngleMeasurement[];
  onAddAngleMeasurement?: (m: DicomAngleMeasurement) => void;
  onDeleteAngleMeasurement?: (id: string) => void;
  onClearAngleMeasurements?: () => void;
  cobbMeasurements?: DicomCobbAngleMeasurement[];
  onAddCobbMeasurement?: (m: DicomCobbAngleMeasurement) => void;
  onDeleteCobbMeasurement?: (id: string) => void;
  onClearCobbMeasurements?: () => void;
  roiMeasurements?: DicomRoiMeasurement[];
  onAddRoiMeasurement?: (m: DicomRoiMeasurement) => void;
  onDeleteRoiMeasurement?: (id: string) => void;
  onClearRoiMeasurements?: () => void;
  scoutLines: ProjectedScoutLine[];
  onSelectScoutSlice?: (seriesNumber: string | number, sliceIndex: number) => void;
  active3DPoint?: [number, number, number] | null;
  currentGeometry: SliceGeometry;
  isCrosshairVisible?: boolean;
  onClear3DPoint?: () => void;
  anatomyPoints?: AnatomyAnnotationPoint[];
  showAnatomyPins?: boolean;
  anatomyLanguage?: 'en' | 'la';
}

export function ZenDicomCanvasStage({
  canvasRef,
  isRealDcm,
  parsedSlice,
  sliceKey,
  ww,
  wc,
  invert,
  colormapId = 'grayscale',
  pan,
  zoom,
  glEnabled,
  onGlFallback,
  tool,
  measurements,
  onAddMeasurement,
  onDeleteMeasurement,
  onClearMeasurements,
  angleMeasurements = [],
  onAddAngleMeasurement,
  onDeleteAngleMeasurement,
  onClearAngleMeasurements,
  cobbMeasurements = [],
  onAddCobbMeasurement,
  onDeleteCobbMeasurement,
  onClearCobbMeasurements,
  roiMeasurements = [],
  onAddRoiMeasurement,
  onDeleteRoiMeasurement,
  onClearRoiMeasurements,
  scoutLines,
  onSelectScoutSlice,
  active3DPoint,
  currentGeometry,
  isCrosshairVisible = true,
  onClear3DPoint,
  anatomyPoints = [],
  showAnatomyPins = false,
  anatomyLanguage = 'en',
}: ZenDicomCanvasStageProps) {
  return (
    <div
      className="relative max-w-full max-h-full flex items-center justify-center will-change-transform"
      style={{
        transform: `translate3d(${pan.x}px, ${pan.y}px, 0) scale(${zoom})`,
        transformOrigin: 'center center',
      }}
    >
      {isRealDcm && parsedSlice && glEnabled ? (
        <DicomGlViewport
          key="dicom-gl-viewport"
          canvasRef={canvasRef}
          parsedSlice={parsedSlice}
          sliceKey={sliceKey}
          windowWidth={ww}
          windowCenter={wc}
          invert={invert}
          colormapId={colormapId}
          className="max-w-full max-h-full object-contain filter contrast-125 block"
          onFallback={onGlFallback}
        />
      ) : (
        <canvas
          key="2d-fallback-canvas"
          ref={canvasRef}
          className="max-w-full max-h-full object-contain filter contrast-125 block"
        />
      )}

      <ZenCaliperOverlay
        isActive={tool === 'length'}
        pixelSpacing={parsedSlice?.meta.pixelSpacing || [0.7, 0.7]}
        measurements={measurements}
        onAddMeasurement={onAddMeasurement}
        onDeleteMeasurement={onDeleteMeasurement}
        onClearMeasurements={onClearMeasurements}
      />

      <ZenAngleOverlay
        isActive={tool === 'angle'}
        measurements={angleMeasurements}
        onAddMeasurement={onAddAngleMeasurement || (() => {})}
        onDeleteMeasurement={onDeleteAngleMeasurement}
        onClearMeasurements={onClearAngleMeasurements || (() => {})}
      />

      <ZenCobbAngleOverlay
        isActive={tool === 'cobb'}
        measurements={cobbMeasurements}
        onAddMeasurement={onAddCobbMeasurement || (() => {})}
        onDeleteMeasurement={onDeleteCobbMeasurement}
        onClearMeasurements={onClearCobbMeasurements}
      />

      <ZenRoiOverlay
        isActive={tool === 'roi' || tool === 'rect_roi'}
        roiType={tool === 'rect_roi' ? 'rectangle' : 'ellipse'}
        pixelSpacing={parsedSlice?.meta.pixelSpacing || [0.7, 0.7]}
        measurements={roiMeasurements}
        onAddMeasurement={onAddRoiMeasurement || (() => {})}
        onDeleteMeasurement={onDeleteRoiMeasurement}
        onClearMeasurements={onClearRoiMeasurements}
      />

      <ZenScoutLines lines={scoutLines} onSelectScoutSlice={onSelectScoutSlice} />

      <Zen3DCrosshair
        point3D={active3DPoint ?? null}
        geometry={currentGeometry}
        active={isCrosshairVisible}
        onClear={onClear3DPoint}
      />

      <ZenAnatomyPinOverlay
        visible={showAnatomyPins}
        points={anatomyPoints}
        language={anatomyLanguage}
      />
    </div>
  );
}
