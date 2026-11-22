'use client';

import React, { useEffect, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import {
  SunMoon,
  Crosshair,
  Ruler,
  Maximize2,
  Circle,
  PenTool,
  Type,
  ArrowUpRight,
  Camera,
  Undo2,
  Redo2,
  RotateCcw,
  Scissors,
  Bone,
  Heart,
  Activity,
  X,
} from 'lucide-react';
import { cn } from '@/lib/utils';
import type { DicomTool } from '@/components/dicom/dicom-toolbar';

export interface VitreaHudMenuProps {
  isOpen: boolean;
  onClose: () => void;
  position?: { x: number; y: number } | null;
  activeTool: DicomTool;
  onSelectTool: (tool: DicomTool) => void;
  canUndo?: boolean;
  canRedo?: boolean;
  onUndo?: () => void;
  onRedo?: () => void;
  onReset?: () => void;
  onSnapshot?: () => void;
  modality?: string;
}

const FIXED_TOOLS: { id: DicomTool; label: string; icon: any }[] = [
  { id: 'pan', label: 'Pan', icon: Maximize2 },
  { id: 'wl', label: 'W/L', icon: SunMoon },
  { id: 'crosshair', label: 'Cross', icon: Crosshair },
  { id: 'length', label: 'Ruler', icon: Ruler },
  { id: 'angle', label: 'Angle', icon: Maximize2 },
  { id: 'roi', label: 'ROI', icon: Circle },
  { id: 'freehand', label: 'Free', icon: PenTool },
  { id: 'annotation', label: 'Text', icon: Type },
  { id: 'arrow', label: 'Arrow', icon: ArrowUpRight },
  { id: 'snap', label: 'Snap', icon: Camera },
];

export function VitreaHudMenu({
  isOpen,
  onClose,
  position,
  activeTool,
  onSelectTool,
  canUndo = false,
  canRedo = false,
  onUndo,
  onRedo,
  onReset,
  onSnapshot,
  modality = 'CT',
}: VitreaHudMenuProps) {
  const menuRef = useRef<HTMLDivElement>(null);
  const [coords, setCoords] = useState<{ x: number; y: number }>({ x: 100, y: 100 });
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  useEffect(() => {
    if (!isOpen || !position) return;
    const menuW = 240;
    const menuH = 260;
    const screenW = typeof window !== 'undefined' ? window.innerWidth : 1024;
    const screenH = typeof window !== 'undefined' ? window.innerHeight : 768;

    const clampedX = Math.max(8, Math.min(screenW - menuW - 8, position.x));
    const clampedY = Math.max(8, Math.min(screenH - menuH - 8, position.y));
    setCoords({ x: clampedX, y: clampedY });
  }, [isOpen, position]);

  useEffect(() => {
    if (!isOpen) return;
    const handleOutside = (e: MouseEvent | TouchEvent) => {
      if (menuRef.current && !menuRef.current.contains(e.target as Node)) {
        onClose();
      }
    };
    const handleKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    document.addEventListener('mousedown', handleOutside);
    document.addEventListener('touchstart', handleOutside);
    window.addEventListener('keydown', handleKey);
    return () => {
      document.removeEventListener('mousedown', handleOutside);
      document.removeEventListener('touchstart', handleOutside);
      window.removeEventListener('keydown', handleKey);
    };
  }, [isOpen, onClose]);

  if (!isOpen || !mounted) return null;

  const isMr = modality.toUpperCase() === 'MR' || modality.toUpperCase() === 'MRI';
  const contextTools = isMr
    ? [
        { id: 'sculpt', label: 'Sculpt', icon: Scissors },
        { id: 'organ', label: 'Organ', icon: Activity },
        { id: 'cardiac', label: 'Flow', icon: Heart },
        { id: 'visible', label: 'ROI', icon: Circle },
      ]
    : [
        { id: 'sculpt', label: 'Sculpt', icon: Scissors },
        { id: 'bone', label: 'Bone', icon: Bone },
        { id: 'vessel', label: 'Vessel', icon: Activity },
        { id: 'organ', label: 'Organ', icon: Circle },
      ];

  const handleToolClick = (toolId: string) => {
    if (toolId === 'snap') {
      onSnapshot?.();
    } else {
      onSelectTool(toolId as DicomTool);
    }
    onClose();
  };

  const menu = (
    <div
      ref={menuRef}
      className="fixed z-50 w-60 bg-zinc-950/95 border border-zinc-800 rounded-xl shadow-2xl p-2 select-none text-white text-xs animate-in fade-in zoom-in-95 duration-100"
      style={{
        left: `${coords.x}px`,
        top: `${coords.y}px`,
      }}
    >
      {/* Title bar */}
      <div className="flex items-center justify-between px-1 pb-1 border-b border-zinc-800/80 mb-1.5">
        <span className="text-[10px] font-mono font-bold uppercase text-zinc-400 tracking-wider">Vitrea HUD (3x5)</span>
        <button
          type="button"
          onClick={onClose}
          className="p-0.5 text-zinc-500 hover:text-white rounded hover:bg-zinc-800 cursor-pointer"
        >
          <X className="w-3.5 h-3.5" />
        </button>
      </div>

      {/* Row 1: Protocol Context Tools */}
      <div className="mb-1.5">
        <div className="text-[9px] font-mono uppercase text-zinc-500 px-1 mb-1">Context</div>
        <div className="grid grid-cols-4 gap-1">
          {contextTools.map((t) => {
            const Icon = t.icon;
            return (
              <button
                key={t.id}
                type="button"
                onClick={() => handleToolClick(t.id)}
                className="flex flex-col items-center justify-center p-1 rounded-lg bg-zinc-900/80 hover:bg-zinc-800 border border-zinc-800 hover:border-zinc-700 transition-all cursor-pointer"
              >
                <Icon className="w-3.5 h-3.5 text-primary mb-0.5" />
                <span className="text-[9px] text-zinc-300 truncate w-full text-center">{t.label}</span>
              </button>
            );
          })}
        </div>
      </div>

      {/* Rows 2 & 3: Fixed Vitrea Tools (5x2 grid) */}
      <div className="mb-2">
        <div className="text-[9px] font-mono uppercase text-zinc-500 px-1 mb-1">Core Tools</div>
        <div className="grid grid-cols-5 gap-1">
          {FIXED_TOOLS.map((t) => {
            const Icon = t.icon;
            const isActive = activeTool === t.id;
            return (
              <button
                key={t.id}
                type="button"
                onClick={() => handleToolClick(t.id)}
                className={cn(
                  'flex flex-col items-center justify-center p-1 rounded-lg border transition-all cursor-pointer',
                  isActive
                    ? 'bg-primary text-on-primary font-bold border-primary shadow-xs'
                    : 'bg-zinc-900/60 hover:bg-zinc-800 border-zinc-800/60 text-zinc-300 hover:text-white'
                )}
                title={t.label}
              >
                <Icon className="w-3.5 h-3.5 mb-0.5" />
                <span className="text-[8px] truncate w-full text-center">{t.label}</span>
              </button>
            );
          })}
        </div>
      </div>

      {/* Bottom Bar: Undo, Redo, Fit */}
      <div className="pt-1.5 border-t border-zinc-800/80 flex items-center justify-between">
        <div className="flex items-center gap-1">
          <button
            type="button"
            disabled={!canUndo}
            onClick={() => { onUndo?.(); onClose(); }}
            className={cn(
              'px-2 py-0.5 rounded text-[10px] font-semibold flex items-center gap-1 border transition-all',
              canUndo
                ? 'bg-zinc-900 text-zinc-200 border-zinc-700 hover:bg-zinc-800 cursor-pointer'
                : 'text-zinc-600 border-zinc-900 opacity-40 cursor-not-allowed'
            )}
            title="Undo"
          >
            <Undo2 className="w-3 h-3" />
            <span>Undo</span>
          </button>
          <button
            type="button"
            disabled={!canRedo}
            onClick={() => { onRedo?.(); onClose(); }}
            className={cn(
              'px-2 py-0.5 rounded text-[10px] font-semibold flex items-center gap-1 border transition-all',
              canRedo
                ? 'bg-zinc-900 text-zinc-200 border-zinc-700 hover:bg-zinc-800 cursor-pointer'
                : 'text-zinc-600 border-zinc-900 opacity-40 cursor-not-allowed'
            )}
            title="Redo"
          >
            <Redo2 className="w-3 h-3" />
            <span>Redo</span>
          </button>
        </div>

        <button
          type="button"
          onClick={() => { onReset?.(); onClose(); }}
          className="px-2 py-0.5 rounded text-[10px] font-semibold flex items-center gap-1 bg-zinc-900 hover:bg-zinc-800 text-zinc-300 border border-zinc-800 cursor-pointer"
          title="Fit / Reset"
        >
          <RotateCcw className="w-3 h-3" />
          <span>Fit</span>
        </button>
      </div>
    </div>
  );

  return createPortal(menu, document.body);
}
