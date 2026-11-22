'use client';

import React, { useRef, useEffect } from 'react';
import { Contrast, Camera, RotateCcw, Play, Pause } from 'lucide-react';
import type { DicomTool } from '@/components/dicom/dicom-toolbar';
import type { DicomToolDefinition } from './zen-dicom-toolbar-definitions';
import { cn } from '@/lib/utils';

export interface ZenDicomOverflowMenuProps {
  isOpen: boolean;
  onClose: () => void;
  overflowTools: DicomToolDefinition[];
  activeTool: DicomTool;
  onSelectTool: (tool: DicomTool) => void;
  showInvert?: boolean;
  invert?: boolean;
  onToggleInvert?: () => void;
  showActions?: boolean;
  isCinePlaying?: boolean;
  onToggleCine?: () => void;
  onResetViewport?: () => void;
  onSnapshot?: () => void;
}

export function ZenDicomOverflowMenu({
  isOpen,
  onClose,
  overflowTools,
  activeTool,
  onSelectTool,
  showInvert = false,
  invert = false,
  onToggleInvert,
  showActions = false,
  isCinePlaying = false,
  onToggleCine,
  onResetViewport,
  onSnapshot,
}: ZenDicomOverflowMenuProps) {
  const menuRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!isOpen) return;
    const handleOutside = (e: MouseEvent | TouchEvent) => {
      if (menuRef.current && !menuRef.current.contains(e.target as Node)) {
        onClose();
      }
    };
    document.addEventListener('mousedown', handleOutside);
    document.addEventListener('touchstart', handleOutside);
    return () => {
      document.removeEventListener('mousedown', handleOutside);
      document.removeEventListener('touchstart', handleOutside);
    };
  }, [isOpen, onClose]);

  if (!isOpen) return null;

  const hasExtraActions = (showInvert && onToggleInvert) || (showActions && (onToggleCine || onResetViewport)) || !!onSnapshot;

  return (
    <div
      ref={menuRef}
      className="absolute right-0 top-full mt-1.5 z-50 w-52 rounded-xl border border-outline-variant/80 bg-surface-container-high/95 backdrop-blur-md p-1.5 shadow-2xl text-[11px] flex flex-col gap-0.5 animate-in fade-in zoom-in-95 duration-100"
    >
      {overflowTools.length > 0 && (
        <>
          <span className="px-2 py-1 text-[10px] font-bold uppercase tracking-wider text-muted-foreground">
            Additional Tools
          </span>
          {overflowTools.map((t) => {
            const Icon = t.icon;
            const isSelected = activeTool === t.id;
            return (
              <button
                key={t.id}
                type="button"
                onClick={() => {
                  onSelectTool(t.id);
                  onClose();
                }}
                className={cn(
                  'px-2 py-1.5 rounded-lg flex items-center gap-2 transition-colors cursor-pointer text-left',
                  isSelected
                    ? 'bg-primary text-primary-foreground font-semibold shadow-xs'
                    : 'text-foreground hover:bg-surface-container-highest'
                )}
              >
                <Icon className="w-3.5 h-3.5 shrink-0" />
                <span className="truncate">{t.label}</span>
              </button>
            );
          })}
        </>
      )}

      {hasExtraActions && overflowTools.length > 0 && (
        <div className="w-full h-px bg-outline-variant/50 my-1" />
      )}

      {showInvert && onToggleInvert && (
        <button
          type="button"
          onClick={() => {
            onToggleInvert();
            onClose();
          }}
          className="px-2 py-1.5 rounded-lg flex items-center gap-2 hover:bg-surface-container-highest text-foreground cursor-pointer text-left"
        >
          <Contrast className="w-3.5 h-3.5" />
          <span>{invert ? 'Normal Contrast' : 'Invert Contrast (I)'}</span>
        </button>
      )}

      {showActions && onToggleCine && (
        <button
          type="button"
          onClick={() => {
            onToggleCine();
            onClose();
          }}
          className="px-2 py-1.5 rounded-lg flex items-center gap-2 hover:bg-surface-container-highest text-foreground cursor-pointer text-left"
        >
          {isCinePlaying ? <Pause className="w-3.5 h-3.5" /> : <Play className="w-3.5 h-3.5" />}
          <span>{isCinePlaying ? 'Pause Cine Loop' : 'Play Cine Loop (Space)'}</span>
        </button>
      )}

      {showActions && onResetViewport && (
        <button
          type="button"
          onClick={() => {
            onResetViewport();
            onClose();
          }}
          className="px-2 py-1.5 rounded-lg flex items-center gap-2 hover:bg-surface-container-highest text-foreground cursor-pointer text-left"
        >
          <RotateCcw className="w-3.5 h-3.5" />
          <span>Reset Viewport (Home)</span>
        </button>
      )}

      {onSnapshot && (
        <button
          type="button"
          onClick={() => {
            onSnapshot();
            onClose();
          }}
          className="px-2 py-1.5 rounded-lg flex items-center gap-2 hover:bg-surface-container-highest text-foreground cursor-pointer text-left"
        >
          <Camera className="w-3.5 h-3.5" />
          <span>Capture Snapshot (S)</span>
        </button>
      )}
    </div>
  );
}
