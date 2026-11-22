'use client';

import React from 'react';
import { getOrientationMarkers } from '@/services/dicom-geometry.service';

interface DicomHudProps {
  patientName: string;
  patientId: string;
  modality: string;
  seriesDescription: string;
  accessionNumber: string;
  sliceIndex: number;
  maxSlices: number;
  windowWidth: number;
  windowCenter: number;
  zoomLevel: number;
  isLocalDcm?: boolean;
  orientation?: string;
  iop?: number[];
  isMobile?: boolean;
}

export function DicomHud({
  patientName,
  patientId,
  modality,
  seriesDescription,
  accessionNumber,
  sliceIndex,
  maxSlices,
  windowWidth,
  windowCenter,
  zoomLevel,
  isLocalDcm = false,
  orientation,
  iop,
  isMobile = false,
}: DicomHudProps) {
  const markers = orientation || iop ? getOrientationMarkers(orientation, iop) : null;

  return (
    <>
      {/* Top Left Metadata */}
      <div className="absolute top-2.5 left-2.5 max-w-[45%] text-[10px] sm:text-[11px] font-mono leading-tight text-primary drop-shadow pointer-events-none select-none bg-black/60 backdrop-blur-xs px-2 py-1 rounded-lg border border-white/5">
        <div className="font-bold text-zinc-100 truncate">{patientName}</div>
        <div className="text-zinc-400 truncate">{patientId}</div>
        {!isMobile && (
          <div className="text-zinc-500 text-[9px] sm:text-[10px] truncate">
            {modality} • {seriesDescription}
          </div>
        )}
      </div>

      {/* Top Right Technical Telemetry */}
      <div className="absolute top-2.5 right-8 sm:right-3 max-w-[45%] text-[10px] sm:text-[11px] font-mono leading-tight text-right text-zinc-400 drop-shadow pointer-events-none select-none bg-black/60 backdrop-blur-xs px-2 py-1 rounded-lg border border-white/5">
        <div className="text-zinc-200 font-semibold truncate">{accessionNumber}</div>
        <div className="text-primary font-semibold truncate">
          W: {Math.round(windowWidth)} C: {Math.round(windowCenter)}
        </div>
        {!isMobile && (
          <div>{isLocalDcm ? 'Local DICOM File' : `Slice: ${sliceIndex + 1} / ${maxSlices}`}</div>
        )}
        <div className="text-zinc-400 text-[9px] sm:text-[10px]">
          Zoom: {Math.round(zoomLevel * 100)}%
        </div>
      </div>

      {/* Direction Markers */}
      {markers && (
        <>
          <span className="absolute top-2 left-1/2 -translate-x-1/2 font-mono text-[10px] sm:text-[11px] font-bold text-neutral-400 drop-shadow-md pointer-events-none select-none">
            {markers.top}
          </span>
          <span className="absolute bottom-16 sm:bottom-2 left-1/2 -translate-x-1/2 font-mono text-[10px] sm:text-[11px] font-bold text-neutral-400 drop-shadow-md pointer-events-none select-none">
            {markers.bottom}
          </span>
          <span className="absolute left-2.5 top-1/2 -translate-y-1/2 font-mono text-[10px] sm:text-[11px] font-bold text-neutral-400 drop-shadow-md pointer-events-none select-none">
            {markers.left}
          </span>
          <span className="absolute right-9 sm:right-2.5 top-1/2 -translate-y-1/2 font-mono text-[10px] sm:text-[11px] font-bold text-neutral-400 drop-shadow-md pointer-events-none select-none">
            {markers.right}
          </span>
        </>
      )}
    </>
  );
}
