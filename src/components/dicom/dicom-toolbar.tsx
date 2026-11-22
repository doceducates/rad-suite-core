import {
  SunMoon,
  Hand,
  ZoomIn,
  ZoomOut,
  Ruler,
  Square,
  RotateCw,
  FlipHorizontal,
  Contrast,
  Play,
  Pause,
  RotateCcw,
  Maximize2,
  Minimize2,
  Scan,
} from 'lucide-react';
import { WINDOW_PRESETS } from '@/services/dicom.service';
import { cn } from '@/lib/utils';

import type { ViewportLayoutMode } from '@/types/viewport';

export type DicomTool =
  | 'wl'
  | 'pan'
  | 'zoom'
  | 'length'
  | 'angle'
  | 'cobb'
  | 'roi'
  | 'rect_roi'
  | 'crosshair'
  | 'freehand'
  | 'annotation'
  | 'arrow'
  | 'snap'
  | 'sculpt'
  | 'bone'
  | 'vessel'
  | 'organ'
  | 'cardiac'
  | 'visible';

interface DicomToolbarProps {
  activeTool: DicomTool;
  onSelectTool: (tool: DicomTool) => void;
  preset: string;
  onSelectPreset: (preset: string) => void;
  cine: boolean;
  onToggleCine: () => void;
  onRotate: () => void;
  onFlip: () => void;
  invert: boolean;
  onToggleInvert: () => void;
  onReset: () => void;
  zoomLevel?: number;
  onZoomIn?: () => void;
  onZoomOut?: () => void;
  onFit?: () => void;
  isFullscreen?: boolean;
  onToggleFullscreen?: () => void;
  layout?: ViewportLayoutMode;
  onSelectLayout?: (layout: ViewportLayoutMode) => void;
}

export function DicomToolbar({
  activeTool,
  onSelectTool,
  preset,
  onSelectPreset,
  cine,
  onToggleCine,
  onRotate,
  onFlip,
  invert,
  onToggleInvert,
  onReset,
  zoomLevel = 1,
  onZoomIn,
  onZoomOut,
  onFit,
  isFullscreen,
  onToggleFullscreen,
  layout = '1x1',
  onSelectLayout,
}: DicomToolbarProps) {
  const tools: { key: DicomTool; icon: any; label: string }[] = [
    { key: 'wl', icon: SunMoon, label: 'W/L' },
    { key: 'pan', icon: Hand, label: 'Pan' },
    { key: 'zoom', icon: ZoomIn, label: 'Zoom' },
    { key: 'length', icon: Ruler, label: 'Measure' },
    { key: 'roi', icon: Square, label: 'ROI' },
  ];

  return (
    <div className="p-2 border-b border-zinc-200 dark:border-zinc-800/80 bg-zinc-50/80 dark:bg-zinc-900/60 flex flex-wrap items-center justify-between gap-2 text-xs">
      <div className="flex items-center gap-1">
        {tools.map((t) => {
          const Icon = t.icon;
          const isActive = activeTool === t.key;
          return (
            <button
              key={t.key}
              type="button"
              onClick={() => onSelectTool(t.key)}
              className={cn(
                "px-2.5 py-1.5 rounded-lg flex items-center gap-1.5 transition-colors cursor-pointer",
                isActive
                  ? "bg-primary/15 text-primary font-medium border border-primary/30"
                  : "text-zinc-600 dark:text-zinc-400 hover:bg-zinc-200/60 dark:hover:bg-zinc-800/60 border border-transparent"
              )}
            >
              <Icon className="w-3.5 h-3.5" /> {t.label}
            </button>
          );
        })}

        <div className="h-4 w-[1px] bg-zinc-300 dark:bg-zinc-700 mx-1 hidden sm:block" />

        {/* Quick Zoom In/Out/Fit */}
        <div className="flex items-center gap-0.5">
          <button
            type="button"
            onClick={onZoomOut}
            title="Zoom Out"
            className="p-1.5 rounded text-zinc-600 dark:text-zinc-400 hover:bg-zinc-200 dark:hover:bg-zinc-800 cursor-pointer"
          >
            <ZoomOut className="w-3.5 h-3.5" />
          </button>
          <button
            type="button"
            onClick={onFit}
            title="Fit to Screen (100%)"
            className="px-1.5 py-1 rounded text-[11px] font-mono text-zinc-600 dark:text-zinc-400 hover:bg-zinc-200 dark:hover:bg-zinc-800 cursor-pointer flex items-center gap-1"
          >
            <Scan className="w-3 h-3" />
            <span>{Math.round(zoomLevel * 100)}%</span>
          </button>
          <button
            type="button"
            onClick={onZoomIn}
            title="Zoom In"
            className="p-1.5 rounded text-zinc-600 dark:text-zinc-400 hover:bg-zinc-200 dark:hover:bg-zinc-800 cursor-pointer"
          >
            <ZoomIn className="w-3.5 h-3.5" />
          </button>
        </div>

        {/* Layout Grid Switcher */}
        {onSelectLayout && (
          <div className="flex items-center gap-0.5 bg-zinc-200/80 dark:bg-zinc-800/80 p-0.5 rounded-md text-[10px] font-mono">
            {(['1x1', '1x2', '2x2', '3x3', '4x4'] as const).map((mode) => (
              <button
                key={mode}
                type="button"
                onClick={() => onSelectLayout(mode)}
                className={cn(
                  "px-1.5 py-0.5 rounded font-semibold transition-all cursor-pointer",
                  layout === mode
                    ? "bg-primary text-on-primary shadow-xs"
                    : "text-zinc-600 dark:text-zinc-400 hover:text-zinc-900 dark:hover:text-zinc-100"
                )}
                title={`Switch to ${mode} Viewport Grid`}
              >
                {mode}
              </button>
            ))}
          </div>
        )}
      </div>

      <div className="flex items-center gap-1.5">
        <select
          value={preset}
          onChange={(e) => onSelectPreset(e.target.value)}
          className="px-2 py-1 rounded-md border border-zinc-300 dark:border-zinc-700 bg-white dark:bg-zinc-800 text-zinc-900 dark:text-zinc-100 text-xs focus:outline-none cursor-pointer max-w-[130px] sm:max-w-none truncate"
        >
          {Object.entries(WINDOW_PRESETS).map(([key, val]) => (
            <option key={key} value={key}>{val.label}</option>
          ))}
        </select>

        <button
          type="button"
          onClick={onToggleCine}
          className={cn(
            "p-1.5 rounded-md border cursor-pointer",
            cine
              ? "bg-primary/20 text-primary border-primary/40"
              : "border-zinc-300 dark:border-zinc-700 text-zinc-600 dark:text-zinc-300 hover:bg-zinc-200 dark:hover:bg-zinc-800"
          )}
          title={cine ? 'Pause Cine' : 'Play Cine Loop'}
        >
          {cine ? <Pause className="w-3.5 h-3.5" /> : <Play className="w-3.5 h-3.5" />}
        </button>

        <button type="button" onClick={onRotate} className="p-1.5 rounded-md hover:bg-zinc-200 dark:hover:bg-zinc-800 border border-zinc-300 dark:border-zinc-700 text-zinc-600 dark:text-zinc-300 cursor-pointer" title="Rotate 90°">
          <RotateCw className="w-3.5 h-3.5" />
        </button>
        <button type="button" onClick={onFlip} className="p-1.5 rounded-md hover:bg-zinc-200 dark:hover:bg-zinc-800 border border-zinc-300 dark:border-zinc-700 text-zinc-600 dark:text-zinc-300 cursor-pointer" title="Flip Horizontal">
          <FlipHorizontal className="w-3.5 h-3.5" />
        </button>
        <button
          type="button"
          onClick={onToggleInvert}
          className={cn(
            "p-1.5 rounded-md border cursor-pointer",
            invert
              ? "bg-primary/20 text-primary border-primary/40"
              : "border-zinc-300 dark:border-zinc-700 text-zinc-600 dark:text-zinc-300 hover:bg-zinc-200 dark:hover:bg-zinc-800"
          )}
          title="Invert Grayscale"
        >
          <Contrast className="w-3.5 h-3.5" />
        </button>
        <button type="button" onClick={onReset} className="p-1.5 rounded-md hover:bg-zinc-200 dark:hover:bg-zinc-800 border border-zinc-300 dark:border-zinc-700 text-zinc-600 dark:text-zinc-300 cursor-pointer" title="Reset Viewport">
          <RotateCcw className="w-3.5 h-3.5" />
        </button>

        {onToggleFullscreen && (
          <button
            type="button"
            onClick={onToggleFullscreen}
            className="p-1.5 rounded-md hover:bg-zinc-200 dark:hover:bg-zinc-800 border border-zinc-300 dark:border-zinc-700 text-zinc-600 dark:text-zinc-300 cursor-pointer"
            title={isFullscreen ? "Exit Fullscreen" : "Enter Fullscreen"}
          >
            {isFullscreen ? <Minimize2 className="w-3.5 h-3.5" /> : <Maximize2 className="w-3.5 h-3.5" />}
          </button>
        )}
      </div>
    </div>
  );
}
