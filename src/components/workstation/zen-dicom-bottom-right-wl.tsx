'use client';

import React, { useState, useRef, useEffect, useMemo } from 'react';
import { ChevronDown, SlidersHorizontal, Check, X, RotateCcw } from 'lucide-react';
import {
  getPresetsForSeries,
  ClinicalPreset,
  DicomSequenceMeta,
} from '@/services/clinical-presets.service';
import { cn } from '@/lib/utils';

export interface ZenDicomBottomRightWlProps {
  ww: number;
  wc: number;
  zoom: number;
  modality?: string;
  activePresetId?: string;
  pixelData?: ArrayLike<number>;
  seriesMeta?: DicomSequenceMeta;
  onSelectPreset?: (preset: ClinicalPreset) => void;
  onWwWcChange?: (ww: number, wc: number) => void;
  onToggleInvert?: () => void;
  invert?: boolean;
}

export function ZenDicomBottomRightWl({
  ww,
  wc,
  zoom,
  modality = 'CT',
  activePresetId = '',
  pixelData,
  seriesMeta = {},
  onSelectPreset,
  onWwWcChange,
  onToggleInvert,
  invert = false,
}: ZenDicomBottomRightWlProps) {
  const [isOpen, setIsOpen] = useState(false);
  const popoverRef = useRef<HTMLDivElement>(null);

  const presets = useMemo(() => {
    return getPresetsForSeries({ ...seriesMeta, modality }, pixelData);
  }, [modality, pixelData, seriesMeta]);

  // Close on clicking outside
  useEffect(() => {
    if (!isOpen) return;
    const handlePointerDown = (e: MouseEvent | TouchEvent) => {
      if (popoverRef.current && !popoverRef.current.contains(e.target as Node)) {
        setIsOpen(false);
      }
    };
    window.addEventListener('mousedown', handlePointerDown);
    window.addEventListener('touchstart', handlePointerDown);
    return () => {
      window.removeEventListener('mousedown', handlePointerDown);
      window.removeEventListener('touchstart', handlePointerDown);
    };
  }, [isOpen]);

  const activePreset = presets.find((p) => p.id === activePresetId);

  return (
    <div
      ref={popoverRef}
      className="absolute bottom-[calc(0.75rem+env(safe-area-inset-bottom,0px))] right-3 z-30 flex flex-col items-end pointer-events-auto select-none"
    >
      {/* Vitrea Bottom-Right Popover */}
      {isOpen && (
        <div className="mb-2 w-72 bg-surface-container-high/95 backdrop-blur-md border border-outline-variant/80 rounded-xl shadow-2xl p-3 flex flex-col gap-2.5 font-sans text-xs text-foreground animate-in fade-in slide-in-from-bottom-2 duration-150">
          <div className="flex items-center justify-between border-b border-outline-variant/50 pb-1.5">
            <div className="flex items-center gap-1.5">
              <SlidersHorizontal className="w-3.5 h-3.5 text-primary" />
              <span className="font-bold text-xs tracking-wide">Vitrea Window / Level</span>
              <span className="px-1.5 py-0.2 rounded text-[10px] font-mono font-bold bg-primary/20 text-primary border border-primary/30">
                {modality}
              </span>
            </div>
            <button
              type="button"
              onClick={() => setIsOpen(false)}
              className="p-1 rounded-md hover:bg-surface-container-highest text-muted-foreground hover:text-foreground transition-colors cursor-pointer"
            >
              <X className="w-3.5 h-3.5" />
            </button>
          </div>

          {/* Current Values Indicator */}
          <div className="flex items-center justify-between px-2 py-1 bg-surface-container/80 rounded-lg border border-outline-variant/40 font-mono text-[11px]">
            <span className="text-secondary font-semibold">
              W: <strong className="text-foreground">{Math.round(ww)}</strong>
            </span>
            <span className="text-secondary font-semibold">
              L: <strong className="text-foreground">{Math.round(wc)}</strong>
            </span>
            <span className="text-muted-foreground text-[10px]">
              {activePreset ? activePreset.name : 'Custom'}
            </span>
          </div>

          {/* Clinical Presets Grid */}
          <div className="flex flex-col gap-1 max-h-48 overflow-y-auto no-scrollbar pr-0.5">
            <span className="text-[10px] font-semibold tracking-wider text-muted-foreground uppercase px-1">
              Clinical Presets
            </span>
            <div className="grid grid-cols-2 gap-1">
              {presets.map((preset) => {
                const isActive = preset.id === activePresetId;
                return (
                  <button
                    key={preset.id}
                    type="button"
                    onClick={() => {
                      onSelectPreset?.(preset);
                      onWwWcChange?.(preset.ww, preset.wc);
                    }}
                    className={cn(
                      'px-2 py-1.5 rounded-lg text-left transition-colors cursor-pointer border flex flex-col',
                      isActive
                        ? 'bg-primary/20 border-primary/50 text-primary font-bold shadow-2xs'
                        : 'bg-surface-container/60 hover:bg-surface-container-highest border-outline-variant/40 text-foreground hover:border-outline-variant'
                    )}
                  >
                    <div className="flex items-center justify-between text-[11px] leading-tight">
                      <span className="truncate">{preset.name}</span>
                      {isActive && <Check className="w-3 h-3 text-primary shrink-0" />}
                    </div>
                    <span className="text-[9px] font-mono text-muted-foreground mt-0.5">
                      {preset.ww} / {preset.wc}
                    </span>
                  </button>
                );
              })}
            </div>
          </div>

          {/* Quick Step Buttons & Invert */}
          <div className="pt-1.5 border-t border-outline-variant/40 flex items-center justify-between gap-1 text-[11px]">
            <div className="flex items-center gap-1 font-mono">
              <span className="text-[10px] text-muted-foreground">W:</span>
              <button
                type="button"
                onClick={() => onWwWcChange?.(Math.max(10, ww - 50), wc)}
                className="px-1.5 py-0.5 rounded bg-surface-container hover:bg-surface-container-highest border border-outline-variant/60 cursor-pointer font-bold"
              >
                -
              </button>
              <button
                type="button"
                onClick={() => onWwWcChange?.(ww + 50, wc)}
                className="px-1.5 py-0.5 rounded bg-surface-container hover:bg-surface-container-highest border border-outline-variant/60 cursor-pointer font-bold"
              >
                +
              </button>
              <span className="text-[10px] text-muted-foreground ml-1">L:</span>
              <button
                type="button"
                onClick={() => onWwWcChange?.(ww, wc - 10)}
                className="px-1.5 py-0.5 rounded bg-surface-container hover:bg-surface-container-highest border border-outline-variant/60 cursor-pointer font-bold"
              >
                -
              </button>
              <button
                type="button"
                onClick={() => onWwWcChange?.(ww, wc + 10)}
                className="px-1.5 py-0.5 rounded bg-surface-container hover:bg-surface-container-highest border border-outline-variant/60 cursor-pointer font-bold"
              >
                +
              </button>
            </div>
            {onToggleInvert && (
              <button
                type="button"
                onClick={onToggleInvert}
                className={cn(
                  'px-2 py-0.5 rounded text-[10px] font-semibold border transition-colors cursor-pointer',
                  invert
                    ? 'bg-amber-500/20 text-amber-300 border-amber-500/50'
                    : 'bg-surface-container hover:bg-surface-container-highest border-outline-variant/60 text-muted-foreground'
                )}
                title="Invert Image Contrast (I)"
              >
                Invert
              </button>
            )}
          </div>
        </div>
      )}

      {/* Interactive Bottom-Right Pill Trigger */}
      <button
        type="button"
        onClick={() => setIsOpen((prev) => !prev)}
        className={cn(
          'group px-2 py-1 rounded-md font-mono text-[10px] leading-tight drop-shadow-[0_1px_3px_rgba(0,0,0,0.9)] cursor-pointer transition-all flex items-center gap-1.5 border',
          isOpen
            ? 'bg-black/90 border-primary text-primary shadow-lg ring-1 ring-primary/40'
            : 'bg-black/75 hover:bg-black/90 border-white/15 hover:border-primary/50 text-tertiary-fixed'
        )}
        title="Click to select Window / Level Presets (Vitrea Standard)"
      >
        <span className="font-semibold tracking-tight">
          W: {Math.round(ww)}  L: {Math.round(wc)}
        </span>
        <ChevronDown className={cn('w-3 h-3 text-neutral-400 group-hover:text-primary transition-transform', isOpen && 'rotate-180 text-primary')} />
      </button>
      <span className="text-neutral-400 font-mono text-[9px] mt-0.5 drop-shadow-[0_1px_2px_rgba(0,0,0,0.9)]">
        {Math.round(zoom * 100)}%
      </span>
    </div>
  );
}
