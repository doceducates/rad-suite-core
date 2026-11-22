'use client';

import React from 'react';
import {
  X,
  RotateCw,
  FlipHorizontal,
  Contrast,
  RotateCcw,
  Ruler,
  Square,
  SunMoon,
  Hand,
  ZoomIn,
  Link2,
  Link2Off,
  LayoutGrid,
} from 'lucide-react';
import type { DicomTool } from './dicom-toolbar';
import type { ViewportLayoutMode } from '@/types/viewport';
import { cn } from '@/lib/utils';

interface DicomMobileActionsSheetProps {
  isOpen: boolean;
  onClose: () => void;
  activeTool: DicomTool;
  onSelectTool: (tool: DicomTool) => void;
  layout: ViewportLayoutMode;
  onSelectLayout: (layout: ViewportLayoutMode) => void;
  onRotate: () => void;
  onFlip: () => void;
  invert: boolean;
  onToggleInvert: () => void;
  onReset: () => void;
  syncScroll?: boolean;
  onToggleSyncScroll?: () => void;
}

export function DicomMobileActionsSheet({
  isOpen,
  onClose,
  activeTool,
  onSelectTool,
  layout,
  onSelectLayout,
  onRotate,
  onFlip,
  invert,
  onToggleInvert,
  onReset,
  syncScroll,
  onToggleSyncScroll,
}: DicomMobileActionsSheetProps) {
  if (!isOpen) return null;

  const tools: { id: DicomTool; label: string; icon: any }[] = [
    { id: 'wl', label: 'Window/Level', icon: SunMoon },
    { id: 'pan', label: 'Pan', icon: Hand },
    { id: 'zoom', label: 'Zoom', icon: ZoomIn },
    { id: 'length', label: 'Caliper', icon: Ruler },
    { id: 'roi', label: 'ROI Box', icon: Square },
  ];

  const layouts: ViewportLayoutMode[] = ['1x1', '1x2', '2x2', '3x3', '4x4'];

  return (
    <div className="fixed inset-0 z-50 bg-black/75 backdrop-blur-xs flex items-end justify-center select-none animate-in fade-in duration-150">
      <div className="absolute inset-0" onClick={onClose} aria-label="Close sheet overlay" />

      <div className="relative z-10 w-full max-w-lg bg-zinc-950 border-t border-zinc-800 rounded-t-3xl shadow-2xl p-5 space-y-5 animate-in slide-in-from-bottom duration-200">
        {/* Grab bar & Header */}
        <div className="flex flex-col items-center">
          <div className="w-10 h-1 rounded-full bg-zinc-700 mb-3" />
          <div className="flex items-center justify-between w-full">
            <span className="font-bold text-white text-base">Viewer Actions & Tools</span>
            <button
              type="button"
              onClick={onClose}
              className="p-1 rounded-lg text-zinc-400 hover:text-white hover:bg-zinc-800 cursor-pointer"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Section 1: Primary Diagnostic Tools */}
        <div className="space-y-2">
          <span className="text-[11px] font-mono uppercase tracking-wider text-zinc-400">Diagnostic Tools</span>
          <div className="grid grid-cols-5 gap-2">
            {tools.map((t) => {
              const Icon = t.icon;
              const isActive = activeTool === t.id;
              return (
                <button
                  key={t.id}
                  type="button"
                  onClick={() => {
                    onSelectTool(t.id);
                    onClose();
                  }}
                  className={cn(
                    'p-2.5 rounded-xl flex flex-col items-center justify-center gap-1.5 transition-all border cursor-pointer',
                    isActive
                      ? 'bg-primary/20 text-primary border-primary/50 shadow-md font-bold'
                      : 'bg-zinc-900 border-zinc-800 text-zinc-400 hover:bg-zinc-800 hover:text-zinc-200'
                  )}
                >
                  <Icon className="w-5 h-5" />
                  <span className="text-[10px] leading-tight text-center">{t.label}</span>
                </button>
              );
            })}
          </div>
        </div>

        {/* Section 2: Viewport Multi-Pane Layouts */}
        <div className="space-y-2">
          <span className="text-[11px] font-mono uppercase tracking-wider text-zinc-400">Multi-Pane Layout</span>
          <div className="flex items-center gap-2 overflow-x-auto pb-1">
            {layouts.map((mode) => (
              <button
                key={mode}
                type="button"
                onClick={() => {
                  onSelectLayout(mode);
                  onClose();
                }}
                className={cn(
                  'px-3.5 py-2 rounded-xl text-xs font-mono font-bold flex items-center gap-1.5 transition-all border shrink-0 cursor-pointer',
                  layout === mode
                    ? 'bg-primary text-on-primary border-primary shadow-md'
                    : 'bg-zinc-900 border-zinc-800 text-zinc-300 hover:bg-zinc-800'
                )}
              >
                <LayoutGrid className="w-3.5 h-3.5" />
                <span>{mode}</span>
              </button>
            ))}
          </div>
        </div>

        {/* Section 3: Image Transformations & Sync */}
        <div className="space-y-2">
          <span className="text-[11px] font-mono uppercase tracking-wider text-zinc-400">Transformations</span>
          <div className="grid grid-cols-4 gap-2">
            <button
              type="button"
              onClick={onRotate}
              className="p-2.5 rounded-xl bg-zinc-900 border border-zinc-800 hover:bg-zinc-800 text-zinc-300 flex flex-col items-center gap-1 text-[11px] cursor-pointer"
            >
              <RotateCw className="w-4 h-4 text-primary" />
              <span>Rotate 90°</span>
            </button>
            <button
              type="button"
              onClick={onFlip}
              className="p-2.5 rounded-xl bg-zinc-900 border border-zinc-800 hover:bg-zinc-800 text-zinc-300 flex flex-col items-center gap-1 text-[11px] cursor-pointer"
            >
              <FlipHorizontal className="w-4 h-4 text-primary" />
              <span>Flip</span>
            </button>
            <button
              type="button"
              onClick={onToggleInvert}
              className={cn(
                'p-2.5 rounded-xl border flex flex-col items-center gap-1 text-[11px] cursor-pointer transition-colors',
                invert
                  ? 'bg-primary/20 border-primary/40 text-primary font-bold'
                  : 'bg-zinc-900 border-zinc-800 text-zinc-300 hover:bg-zinc-800'
              )}
            >
              <Contrast className="w-4 h-4 text-primary" />
              <span>Invert</span>
            </button>
            {onToggleSyncScroll && (
              <button
                type="button"
                onClick={onToggleSyncScroll}
                className={cn(
                  'p-2.5 rounded-xl border flex flex-col items-center gap-1 text-[11px] cursor-pointer transition-colors',
                  syncScroll
                    ? 'bg-primary/20 border-primary/40 text-primary font-bold'
                    : 'bg-zinc-900 border-zinc-800 text-zinc-300 hover:bg-zinc-800'
                )}
              >
                {syncScroll ? <Link2 className="w-4 h-4 text-primary" /> : <Link2Off className="w-4 h-4 text-zinc-400" />}
                <span>Sync Scroll</span>
              </button>
            )}
          </div>
        </div>

        {/* Section 4: Viewport Reset */}
        <button
          type="button"
          onClick={() => {
            onReset();
            onClose();
          }}
          className="w-full py-2.5 rounded-xl bg-zinc-900 hover:bg-zinc-800 border border-zinc-800 text-zinc-300 font-semibold text-xs flex items-center justify-center gap-2 transition-colors cursor-pointer active:scale-98"
        >
          <RotateCcw className="w-4 h-4" />
          <span>Reset Viewport & Adjustments</span>
        </button>
      </div>
    </div>
  );
}
