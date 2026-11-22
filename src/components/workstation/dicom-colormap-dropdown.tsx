'use client';

import React, { useState, useRef, useEffect } from 'react';
import { Palette, Check, Sparkles } from 'lucide-react';
import { VTK_COLORMAPS, getColormapCssGradient, type VtkColormapPreset } from '@/services/vtk-colormaps.service';
import { cn } from '@/lib/utils';

interface DicomColormapDropdownProps {
  activeColormapId: string;
  onSelectColormap: (id: string) => void;
  className?: string;
}

export function DicomColormapDropdown({
  activeColormapId = 'grayscale',
  onSelectColormap,
  className,
}: DicomColormapDropdownProps) {
  const [isOpen, setIsOpen] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!isOpen) return;
    const handleOutside = (e: MouseEvent | TouchEvent) => {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        setIsOpen(false);
      }
    };
    const handleKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') setIsOpen(false);
    };
    document.addEventListener('mousedown', handleOutside);
    document.addEventListener('touchstart', handleOutside);
    window.addEventListener('keydown', handleKey);
    return () => {
      document.removeEventListener('mousedown', handleOutside);
      document.removeEventListener('touchstart', handleOutside);
      window.removeEventListener('keydown', handleKey);
    };
  }, [isOpen]);

  const activePreset = VTK_COLORMAPS[activeColormapId] || VTK_COLORMAPS.grayscale;
  const colormapsList = Object.values(VTK_COLORMAPS);

  return (
    <div ref={containerRef} className={cn('relative inline-block select-none', className)}>
      <button
        type="button"
        onClick={() => setIsOpen((v) => !v)}
        className={cn(
          'h-7 px-2 flex items-center gap-1.5 rounded-lg text-[11px] font-medium transition-all cursor-pointer border',
          activeColormapId !== 'grayscale'
            ? 'bg-primary/15 text-primary border-primary/40 shadow-xs'
            : 'bg-surface-container-low text-on-surface-variant hover:text-on-surface hover:bg-surface-container border-outline-variant/40'
        )}
        title="OHIF & vtk.js Color Scales / LUTs"
      >
        <Palette className="w-3.5 h-3.5 shrink-0" />
        <span className="truncate max-w-[85px] hidden sm:inline">{activePreset.name}</span>
        {activeColormapId !== 'grayscale' && (
          <span
            className="w-2.5 h-2.5 rounded-full border border-white/20 shrink-0"
            style={{ background: getColormapCssGradient(activeColormapId) }}
          />
        )}
      </button>

      {isOpen && (
        <div className="absolute top-full mt-1.5 left-0 z-50 w-64 p-1.5 rounded-xl bg-neutral-950/95 dark:bg-black/95 backdrop-blur-xl border border-white/10 shadow-2xl animate-in fade-in zoom-in-95 duration-150">
          <div className="px-2 py-1 flex items-center justify-between border-b border-white/10 mb-1">
            <span className="text-[10px] font-bold uppercase tracking-wider text-neutral-400 flex items-center gap-1">
              <Sparkles className="w-3 h-3 text-primary" />
              OHIF / vtk.js Color Scales
            </span>
            <span className="text-[9px] font-mono text-neutral-500">WebGL2 LUT</span>
          </div>

          <div className="max-h-72 overflow-y-auto space-y-1 [scrollbar-width:thin]">
            {colormapsList.map((cmap: VtkColormapPreset) => {
              const isSelected = cmap.id === activeColormapId;
              const gradient = getColormapCssGradient(cmap.id);

              return (
                <button
                  key={cmap.id}
                  type="button"
                  onClick={() => {
                    onSelectColormap(cmap.id);
                    setIsOpen(false);
                  }}
                  className={cn(
                    'w-full p-1.5 rounded-lg flex flex-col gap-1 text-left transition-all cursor-pointer border',
                    isSelected
                      ? 'bg-primary/20 border-primary/50 text-white'
                      : 'hover:bg-white/10 border-transparent text-neutral-300'
                  )}
                >
                  <div className="flex items-center justify-between">
                    <span className="text-[11px] font-semibold flex items-center gap-1.5">
                      {cmap.name}
                      {isSelected && <Check className="w-3 h-3 text-primary" />}
                    </span>
                    <span className="text-[9px] uppercase font-mono px-1 rounded bg-white/10 text-neutral-400">
                      {cmap.category}
                    </span>
                  </div>

                  {/* Visual gradient swatch bar */}
                  <div
                    className="w-full h-2.5 rounded-sm border border-white/15"
                    style={{ background: gradient }}
                  />

                  <span className="text-[9px] text-neutral-400 line-clamp-1">
                    {cmap.description}
                  </span>
                </button>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
}
