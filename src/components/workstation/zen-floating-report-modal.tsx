'use client';

import React, { useState, useRef, useCallback } from 'react';
import { ReportingMode } from '@/hooks/use-reporting-layout';
import { ReportEditorState, ReportSyncStatus } from '@/hooks/use-report-editor-actions';
import { ZenReportCanvas } from './zen-report-canvas';

interface ZenFloatingReportModalProps {
  onSelectMode: (mode: ReportingMode) => void;
  report: ReportEditorState;
  setReport: React.Dispatch<React.SetStateAction<ReportEditorState>>;
  studyId: string;
  modality?: string;
  pgrName: string;
  onOpenCommandPalette: () => void;
  onStructure: () => void;
  structuring: boolean;
  onSave: () => void;
  syncStatus?: ReportSyncStatus;
  savedTime?: string | null;
  currentVersion?: number;
  onVersionChange?: (version: number) => void;
}

export function ZenFloatingReportModal({
  onSelectMode,
  report,
  setReport,
  studyId,
  modality,
  pgrName,
  onOpenCommandPalette,
  onStructure,
  structuring,
  onSave,
  syncStatus,
  savedTime,
  currentVersion,
  onVersionChange,
}: ZenFloatingReportModalProps) {
  // Draggable window coordinates
  const [pos, setPos] = useState({ x: 24, y: 72 });
  const isDraggingRef = useRef(false);
  const dragStartRef = useRef<{ startX: number; startY: number; posX: number; posY: number }>({
    startX: 0,
    startY: 0,
    posX: 24,
    posY: 72,
  });

  const handleHeaderPointerDown = useCallback((e: React.PointerEvent) => {
    // Only drag from header, ignore buttons/inputs
    if ((e.target as HTMLElement).closest('button, input')) return;
    isDraggingRef.current = true;
    dragStartRef.current = {
      startX: e.clientX,
      startY: e.clientY,
      posX: pos.x,
      posY: pos.y,
    };

    const onPointerMove = (moveEvt: PointerEvent) => {
      if (!isDraggingRef.current) return;
      const dx = moveEvt.clientX - dragStartRef.current.startX;
      const dy = moveEvt.clientY - dragStartRef.current.startY;
      // Allow positioning anywhere within viewport
      const newX = Math.max(10, Math.min(window.innerWidth - 300, dragStartRef.current.posX - dx));
      const newY = Math.max(50, Math.min(window.innerHeight - 200, dragStartRef.current.posY + dy));
      setPos({ x: newX, y: newY });
    };

    const onPointerUp = () => {
      isDraggingRef.current = false;
      window.removeEventListener('pointermove', onPointerMove);
      window.removeEventListener('pointerup', onPointerUp);
    };

    window.addEventListener('pointermove', onPointerMove);
    window.addEventListener('pointerup', onPointerUp);
  }, [pos]);

  return (
    <div
      style={{ right: `${pos.x}px`, top: `${pos.y}px` }}
      className="fixed z-40 w-[520px] max-w-[92vw] h-[640px] max-h-[82vh] bg-surface/95 backdrop-blur-xl border border-outline-variant/60 shadow-2xl rounded-2xl flex flex-col overflow-hidden animate-in fade-in zoom-in-95 duration-150"
    >
      {/* Draggable Title Chrome Bar */}
      <div
        onPointerDown={handleHeaderPointerDown}
        className="h-10 px-3 bg-surface-container-low border-b border-outline-variant/50 flex items-center justify-between cursor-move select-none shrink-0"
      >
        <div className="flex items-center gap-2">
          <span className="material-symbols-outlined text-primary text-[18px]">
            picture_in_picture
          </span>
          <span className="font-headline text-[12px] font-bold text-on-surface">
            Floating Report Palette
          </span>
          <span className="font-mono text-[10px] text-tertiary bg-surface-container px-2 py-0.5 rounded-full border border-outline-variant/40">
            {report.status}
          </span>
        </div>

        {/* Modal Window Controls */}
        <div className="flex items-center gap-1">
          <button
            type="button"
            onClick={() => onSelectMode('fab')}
            className="w-6 h-6 rounded-md flex items-center justify-center text-secondary hover:text-on-surface hover:bg-surface-container transition-colors cursor-pointer"
            title="Minimize to Floating Button (Alt+1)"
          >
            <span className="material-symbols-outlined text-[15px]">remove</span>
          </button>
          <button
            type="button"
            onClick={() => onSelectMode('split')}
            className="w-6 h-6 rounded-md flex items-center justify-center text-secondary hover:text-on-surface hover:bg-surface-container transition-colors cursor-pointer"
            title="Dock to Split Screen (Alt+2)"
          >
            <span className="material-symbols-outlined text-[15px]">vertical_split</span>
          </button>
          <button
            type="button"
            onClick={() => onSelectMode('full')}
            className="w-6 h-6 rounded-md flex items-center justify-center text-secondary hover:text-on-surface hover:bg-surface-container transition-colors cursor-pointer"
            title="Maximize to Full Studio (Alt+4)"
          >
            <span className="material-symbols-outlined text-[15px]">open_in_full</span>
          </button>
        </div>
      </div>

      {/* Embedded Report Canvas */}
      <div className="flex-1 min-h-0 overflow-hidden flex flex-col">
        <ZenReportCanvas
          report={report}
          setReport={setReport}
          studyId={studyId}
          modality={modality}
          pgrName={pgrName}
          onOpenCommandPalette={onOpenCommandPalette}
          onStructure={onStructure}
          structuring={structuring}
          onMaximizeNotion={() => onSelectMode('full')}
          onSave={onSave}
          syncStatus={syncStatus}
          savedTime={savedTime}
          currentVersion={currentVersion}
          onVersionChange={onVersionChange}
        />
      </div>
    </div>
  );
}
