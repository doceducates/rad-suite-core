'use client';

import React, { useState, useRef, useEffect } from 'react';
import { Ruler, ChevronDown, Check, Trash2, Square, Circle } from 'lucide-react';
import type { DicomTool } from '@/components/dicom/dicom-toolbar';
import { cn } from '@/lib/utils';

interface ZenMeasurementFlyoutProps {
  activeTool: DicomTool;
  onSelectTool: (tool: DicomTool) => void;
  onClearAll?: () => void;
  measurementsCount?: number;
  className?: string;
}

const MEASURE_OPTIONS: { id: DicomTool; label: string; icon: string; shortcut: string; desc: string }[] = [
  { id: 'length', label: 'Length Caliper', icon: 'straighten', shortcut: 'L', desc: 'Linear distance in millimeters' },
  { id: 'angle', label: '3-Point Angle', icon: 'square_foot', shortcut: 'A', desc: 'Standard 3-point joint/bone angle' },
  { id: 'cobb', label: 'Cobb Angle', icon: 'format_line_spacing', shortcut: 'C', desc: '4-point scoliosis & kyphosis angle' },
  { id: 'roi', label: 'Ellipse ROI', icon: 'radio_button_unchecked', shortcut: 'E', desc: 'Circular/elliptical density area' },
  { id: 'rect_roi', label: 'Rectangle ROI', icon: 'crop_square', shortcut: 'R', desc: 'Rectangular region of interest' },
];

export function ZenMeasurementFlyout({
  activeTool,
  onSelectTool,
  onClearAll,
  measurementsCount = 0,
  className,
}: ZenMeasurementFlyoutProps) {
  const [isOpen, setIsOpen] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);

  const isMeasureActive = ['length', 'angle', 'cobb', 'roi', 'rect_roi'].includes(activeTool);
  const activeOption = MEASURE_OPTIONS.find((m) => m.id === activeTool) || MEASURE_OPTIONS[0];

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

  return (
    <div ref={containerRef} className={cn('relative inline-flex items-center select-none', className)}>
      <div
        className={cn(
          'inline-flex items-center rounded-lg border transition-all',
          isMeasureActive
            ? 'bg-primary text-white border-primary shadow-xs'
            : 'bg-surface-container-low text-on-surface-variant hover:text-on-surface hover:bg-surface-container border-outline-variant/40'
        )}
      >
        {/* Main Action: Activate selected measurement */}
        <button
          type="button"
          onClick={() => onSelectTool(activeOption.id)}
          className="h-7 px-2 flex items-center gap-1.5 text-[11px] font-medium cursor-pointer"
          title={`${activeOption.label} (${activeOption.shortcut})`}
        >
          <span className="material-symbols-outlined text-[15px]">{activeOption.icon}</span>
          <span className="hidden md:inline">{activeOption.label}</span>
          {measurementsCount > 0 && (
            <span className="px-1 py-0.2 rounded-full text-[9px] font-mono font-bold bg-white/20">
              {measurementsCount}
            </span>
          )}
        </button>

        {/* Dropdown Trigger Chevron */}
        <button
          type="button"
          onClick={() => setIsOpen((v) => !v)}
          className="h-7 px-1 flex items-center justify-center border-l border-white/20 hover:bg-white/10 cursor-pointer"
          title="Choose Measurement Tool"
        >
          <ChevronDown className={cn('w-3 h-3 transition-transform duration-150', isOpen && 'rotate-180')} />
        </button>
      </div>

      {isOpen && (
        <div className="absolute top-full mt-1.5 left-0 z-50 w-56 p-1.5 rounded-xl bg-neutral-950/95 dark:bg-black/95 backdrop-blur-xl border border-white/10 shadow-2xl animate-in fade-in zoom-in-95 duration-150">
          <div className="px-2 py-1 text-[10px] font-bold uppercase tracking-wider text-neutral-400 border-b border-white/10 mb-1">
            Measurement Calipers
          </div>

          <div className="space-y-0.5">
            {MEASURE_OPTIONS.map((opt) => {
              const isSelected = activeTool === opt.id;
              return (
                <button
                  key={opt.id}
                  type="button"
                  onClick={() => {
                    onSelectTool(opt.id);
                    setIsOpen(false);
                  }}
                  className={cn(
                    'w-full px-2 py-1.5 rounded-lg flex items-center justify-between text-left transition-colors cursor-pointer',
                    isSelected
                      ? 'bg-primary text-white'
                      : 'hover:bg-white/10 text-neutral-300 hover:text-white'
                  )}
                >
                  <div className="flex items-center gap-2">
                    <span className="material-symbols-outlined text-[15px]">{opt.icon}</span>
                    <div className="flex flex-col">
                      <span className="text-[11px] font-semibold">{opt.label}</span>
                      <span className="text-[9px] text-neutral-400 line-clamp-1">{opt.desc}</span>
                    </div>
                  </div>
                  <span className="text-[9px] font-mono px-1 rounded bg-white/10 text-neutral-300">
                    {opt.shortcut}
                  </span>
                </button>
              );
            })}
          </div>

          {onClearAll && (
            <div className="border-t border-white/10 mt-1.5 pt-1">
              <button
                type="button"
                onClick={() => {
                  onClearAll();
                  setIsOpen(false);
                }}
                className="w-full px-2 py-1.5 rounded-lg flex items-center gap-2 text-[11px] text-red-400 hover:bg-red-500/15 transition-colors cursor-pointer font-medium"
              >
                <Trash2 className="w-3.5 h-3.5" />
                <span>Clear All Measurements</span>
              </button>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
