'use client';

import React from 'react';
import { SunMoon, Hand, ZoomIn, Ruler, RotateCcw } from 'lucide-react';
import { DicomTool } from '@/components/dicom/dicom-toolbar';

interface ZenDicomToolbarProps {
  activeTool: DicomTool;
  onSelectTool: (tool: DicomTool) => void;
  onReset: () => void;
}

export function ZenDicomToolbar({ activeTool, onSelectTool, onReset }: ZenDicomToolbarProps) {
  const tools: { id: DicomTool; label: string; icon: React.ElementType }[] = [
    { id: 'wl', label: 'W/L', icon: SunMoon },
    { id: 'pan', label: 'Pan', icon: Hand },
    { id: 'zoom', label: 'Zoom', icon: ZoomIn },
    { id: 'length', label: 'Measure', icon: Ruler },
  ];

  return (
    <div className="absolute top-3 left-1/2 -translate-x-1/2 z-20 flex items-center gap-5 px-4 py-1.5 rounded-xl bg-zinc-900/85 backdrop-blur-md border border-zinc-700/60 shadow-2xl select-none">
      {tools.map((t) => {
        const isSel = activeTool === t.id;
        const Icon = t.icon;
        return (
          <button
            key={t.id}
            type="button"
            onClick={() => onSelectTool(t.id)}
            className={`flex flex-col items-center gap-0.5 transition-colors cursor-pointer ${
              isSel ? 'text-primary font-bold' : 'text-zinc-400 hover:text-zinc-200'
            }`}
          >
            <Icon className="w-4 h-4" />
            <span className="text-[10px] font-medium tracking-tight">{t.label}</span>
          </button>
        );
      })}

      <div className="w-px h-5 bg-zinc-700/80" />

      <button
        type="button"
        onClick={onReset}
        title="Reset zoom, pan, and window"
        className="flex flex-col items-center gap-0.5 text-zinc-400 hover:text-zinc-200 transition-colors cursor-pointer"
      >
        <RotateCcw className="w-4 h-4" />
        <span className="text-[10px] font-medium tracking-tight">Reset</span>
      </button>
    </div>
  );
}
