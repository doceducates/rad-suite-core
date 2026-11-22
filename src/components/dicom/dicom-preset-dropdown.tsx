'use client';

import React, { useState, useRef, useEffect, useMemo } from 'react';
import { ChevronDown, Check } from 'lucide-react';
import { cn } from '@/lib/utils';
import {
  getPresetsForSeries,
  type ClinicalPreset,
  type DicomSequenceMeta,
} from '@/services/clinical-presets.service';

export interface DicomPresetDropdownProps {
  modality?: string;
  activePresetId: string;
  onSelectPreset: (preset: ClinicalPreset) => void;
  className?: string;
  pixelData?: ArrayLike<number>;
  seriesMeta?: DicomSequenceMeta;
  currentWw?: number;
  currentWc?: number;
}

export function DicomPresetDropdown({
  modality = 'CT',
  activePresetId,
  onSelectPreset,
  className = '',
  pixelData,
  seriesMeta = {},
  currentWw,
  currentWc,
}: DicomPresetDropdownProps) {
  const [isOpen, setIsOpen] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);

  const meta: DicomSequenceMeta = useMemo(
    () => ({ ...seriesMeta, modality: seriesMeta.modality || modality }),
    [seriesMeta.seriesDescription, seriesMeta.protocolName, seriesMeta.sequenceName, seriesMeta.modality, modality]
  );

  const presets = useMemo(
    () => getPresetsForSeries(meta, pixelData),
    [meta, pixelData]
  );

  const currentPreset =
    presets.find((p) => p.id === activePresetId || p.name.toLowerCase() === activePresetId?.toLowerCase()) ||
    presets[0];

  const displayWc = currentWc !== undefined ? Math.round(currentWc) : currentPreset.wc;
  const displayWw = currentWw !== undefined ? Math.round(currentWw) : currentPreset.ww;

  useEffect(() => {
    if (!isOpen) return;
    const handleOutside = (e: MouseEvent | TouchEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target as Node)) {
        setIsOpen(false);
      }
    };
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') setIsOpen(false);
    };
    document.addEventListener('mousedown', handleOutside);
    document.addEventListener('touchstart', handleOutside);
    window.addEventListener('keydown', handleKeyDown);
    return () => {
      document.removeEventListener('mousedown', handleOutside);
      document.removeEventListener('touchstart', handleOutside);
      window.removeEventListener('keydown', handleKeyDown);
    };
  }, [isOpen]);

  const isMr = String(modality).toUpperCase().startsWith('MR');

  return (
    <div ref={dropdownRef} className={cn('relative inline-block text-left select-none z-30', className)}>
      {/* Compact Dropdown Trigger Button */}
      <button
        type="button"
        onClick={() => setIsOpen((prev) => !prev)}
        className="flex items-center gap-1.5 px-2.5 py-1 bg-zinc-900/90 hover:bg-zinc-800 text-zinc-200 border border-zinc-700/80 hover:border-zinc-500 rounded-lg text-xs font-semibold shadow-md transition-all cursor-pointer backdrop-blur-md"
        title="Select Clinical Window/Level Preset"
      >
        <span className="text-[11px] font-medium text-zinc-100">{currentPreset.name}</span>
        <span className="text-[10px] font-mono text-primary font-bold">
          {displayWc}/{displayWw}
        </span>
        <ChevronDown className={cn('w-3.5 h-3.5 text-zinc-400 transition-transform duration-150', isOpen && 'rotate-180')} />
      </button>

      {/* Floating Popover Menu (No full-screen blocking) */}
      {isOpen && (
        <div className="absolute left-0 top-full mt-1.5 w-64 max-h-80 overflow-y-auto bg-zinc-950 border border-zinc-800 rounded-xl shadow-2xl p-1 text-white text-xs divide-y divide-zinc-900 animate-in fade-in zoom-in-95 duration-100 [scrollbar-width:thin]">
          <div className="py-1">
            <div className="px-2 py-1 text-[10px] font-mono uppercase tracking-wider text-zinc-500 font-bold">
              {isMr ? 'MRI Adaptive Presets' : 'CT Modality Presets'}
            </div>
            {presets.map((p, idx) => {
              const isSelected = p.id === currentPreset.id;
              return (
                <button
                  key={p.id}
                  type="button"
                  onClick={() => {
                    onSelectPreset(p);
                    setIsOpen(false);
                  }}
                  className={cn(
                    'w-full flex items-center justify-between px-2.5 py-1.5 rounded-lg text-left transition-colors cursor-pointer',
                    isSelected
                      ? 'bg-primary/20 text-primary font-bold border border-primary/30'
                      : 'hover:bg-zinc-900 text-zinc-300 hover:text-white'
                  )}
                >
                  <div className="flex items-center gap-2 truncate">
                    {isSelected && <Check className="w-3.5 h-3.5 shrink-0 text-primary" />}
                    <span className={cn('text-xs truncate', !isSelected && 'pl-5')}>{p.name}</span>
                  </div>
                  <div className="flex items-center gap-1.5 shrink-0 font-mono text-[10px] text-zinc-400">
                    <span>{p.wc}/{p.ww}</span>
                    {idx < 9 && (
                      <span className="w-4 h-4 rounded bg-zinc-900 border border-zinc-800 flex items-center justify-center text-[9px] text-zinc-400">
                        {idx + 1}
                      </span>
                    )}
                  </div>
                </button>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
}
