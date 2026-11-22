'use client';

// Layer 4: Smart Responsive Canvas HUD & Collapsible Transparent FAB (<260 lines)
import React, { useState, useEffect, useRef } from 'react';
import {
  Hand,
  MoveVertical,
  ZoomIn,
  ZoomOut,
  RotateCcw,
  Eye,
  EyeOff,
  Layers,
  Wrench,
  PanelRightOpen,
  HelpCircle,
  Type,
  Maximize2,
  Minimize2,
  X,
} from 'lucide-react';

export interface AtlasCanvasHudProps {
  toolMode: 'scrub' | 'pan';
  onToolModeChange: (mode: 'scrub' | 'pan') => void;
  zoom: number;
  onZoomIn: () => void;
  onZoomOut: () => void;
  onResetView: () => void;
  showPins: boolean;
  onTogglePins: () => void;
  hasActiveMask: boolean;
  hasMasksAvailable?: boolean;
  onToggleMask?: () => void;
  maskOpacity: number;
  onMaskOpacityChange?: (opacity: number) => void;
  onToggleSidebar?: () => void;
  language?: 'en' | 'la';
  onToggleLanguage?: () => void;
  isQuizMode?: boolean;
  onToggleQuiz?: () => void;
  textSize?: 'sm' | 'md' | 'lg';
  onCycleTextSize?: () => void;
  isFullscreen?: boolean;
  onToggleFullscreen?: () => void;
}

export function AtlasCanvasHud({
  toolMode, onToolModeChange, zoom, onZoomIn, onZoomOut, onResetView,
  showPins, onTogglePins, hasActiveMask, hasMasksAvailable = false,
  onToggleMask, maskOpacity, onMaskOpacityChange, onToggleSidebar,
  language = 'en', onToggleLanguage, isQuizMode = false, onToggleQuiz,
  textSize = 'md', onCycleTextSize, isFullscreen, onToggleFullscreen,
}: AtlasCanvasHudProps) {
  const [isFabExpanded, setIsFabExpanded] = useState(false);
  const [showMaskSlider, setShowMaskSlider] = useState(false);
  const [isFocused, setIsFocused] = useState(false);
  const [isHovered, setIsHovered] = useState(false);
  const hudRef = useRef<HTMLDivElement>(null);
  const clusterScrollRef = useRef<HTMLDivElement>(null);

  // Directly scroll tool cluster on mouse wheel without bubbling interference
  const handleClusterWheel = (e: React.WheelEvent<HTMLDivElement>) => {
    e.stopPropagation();
    if (clusterScrollRef.current) {
      clusterScrollRef.current.scrollTop += e.deltaY;
    }
  };

  // Click outside to drop focus, collapse FAB on mobile, and close mask slider
  useEffect(() => {
    const handlePointerDownOutside = (e: PointerEvent) => {
      const target = e.target as HTMLElement;
      if (hudRef.current && !hudRef.current.contains(target)) {
        setIsFocused(false);
        setIsFabExpanded(false);
        setShowMaskSlider(false);
      }
    };

    document.addEventListener('pointerdown', handlePointerDownOutside);
    return () => {
      document.removeEventListener('pointerdown', handlePointerDownOutside);
    };
  }, []);

  const isNormallyVisible = isFocused || isHovered || isFabExpanded || showMaskSlider;

  return (
    <div
      ref={hudRef}
      data-scrollable="true"
      onWheel={(e) => e.stopPropagation()}
      onPointerDown={() => setIsFocused(true)}
      onMouseEnter={() => setIsHovered(true)}
      onMouseLeave={() => setIsHovered(false)}
      className="absolute right-2 sm:right-4 top-1/2 -translate-y-1/2 z-30 select-none"
    >
      {/* 1. Mobile-only Collapsed FAB Trigger */}
      <div className="sm:hidden">
        {!isFabExpanded && (
          <button
            type="button"
            onClick={(e) => {
              e.stopPropagation();
              setIsFabExpanded(true);
              setIsFocused(true);
            }}
            className={`flex h-10 w-10 items-center justify-center rounded-full border shadow-2xl backdrop-blur-md transition-all cursor-pointer ${
              isNormallyVisible
                ? 'border-white/25 bg-black/90 text-white opacity-100'
                : 'border-white/15 bg-black/50 text-white/80 opacity-45 hover:opacity-100 hover:bg-black/90'
            }`}
            title="Open Diagnostic Tools"
          >
            <Wrench className="h-4 w-4 text-primary" />
          </button>
        )}
      </div>

      {/* 2. Tool Cluster — Responsively sized: full on desktop, smart scroll on smaller screens */}
      <div
        ref={clusterScrollRef}
        data-scrollable="true"
        onWheel={handleClusterWheel}
        onTouchStart={(e) => e.stopPropagation()}
        onTouchMove={(e) => e.stopPropagation()}
        onTouchEnd={(e) => e.stopPropagation()}
        className={`${
          isFabExpanded ? 'flex' : 'hidden sm:flex'
        } flex-col items-center gap-1 rounded-2xl border p-1.5 shadow-2xl backdrop-blur-md max-h-[50vh] sm:max-h-[62vh] lg:max-h-[82vh] overflow-y-auto overflow-x-hidden touch-pan-y scrollbar-thin [scrollbar-width:thin] [scrollbar-color:rgba(255,255,255,0.35)_rgba(0,0,0,0.3)] [&::-webkit-scrollbar]:w-1.5 [&::-webkit-scrollbar-track]:bg-black/20 [&::-webkit-scrollbar-thumb]:bg-white/30 hover:[&::-webkit-scrollbar-thumb]:bg-white/60 [&::-webkit-scrollbar-thumb]:rounded-full transition-all ${
          isNormallyVisible
            ? 'border-white/25 bg-black/90 opacity-100'
            : 'border-white/10 bg-black/50 opacity-40 sm:opacity-50 hover:opacity-100 hover:bg-black/90 focus-within:opacity-100 focus-within:bg-black/90'
        }`}
      >
        {/* Mobile-only Close FAB Button */}
        {isFabExpanded && (
          <button
            type="button"
            onClick={(e) => { e.stopPropagation(); setIsFabExpanded(false); }}
            className="sm:hidden p-1 rounded-lg text-white/60 hover:text-white hover:bg-white/10 cursor-pointer"
            title="Close Tools"
          >
            <X className="h-3.5 w-3.5" />
          </button>
        )}

        {/* --- TIER 1: CORE NAVIGATION & VIEWPORT MANIPULATION --- */}
        {/* Cine Scrub Tool */}
        <button
          type="button"
          onClick={(e) => { e.stopPropagation(); onToolModeChange('scrub'); }}
          title="Slice Scrub Mode (Drag up/down)"
          className={`flex h-8 w-8 items-center justify-center rounded-xl transition-colors cursor-pointer ${
            toolMode === 'scrub' ? 'bg-primary/30 text-primary border border-primary/50 shadow-sm' : 'text-white/70 hover:bg-white/10 hover:text-white'
          }`}
        >
          <MoveVertical className="h-4 w-4" />
        </button>

        {/* Pan / Drag Tool */}
        <button
          type="button"
          onClick={(e) => { e.stopPropagation(); onToolModeChange('pan'); }}
          title="Pan / Drag Canvas Mode"
          className={`flex h-8 w-8 items-center justify-center rounded-xl transition-colors cursor-pointer ${
            toolMode === 'pan' ? 'bg-primary/30 text-primary border border-primary/50 shadow-sm' : 'text-white/70 hover:bg-white/10 hover:text-white'
          }`}
        >
          <Hand className="h-4 w-4" />
        </button>

        <div className="my-0.5 h-px w-5 bg-white/15" />

        {/* Zoom In */}
        <button
          type="button"
          onClick={(e) => { e.stopPropagation(); onZoomIn(); }}
          disabled={zoom >= 3.0}
          title={`Zoom In (${Math.round(zoom * 100)}%)`}
          className="flex h-8 w-8 items-center justify-center rounded-xl text-white/70 transition-colors hover:bg-white/10 hover:text-white disabled:opacity-30 disabled:pointer-events-none cursor-pointer"
        >
          <ZoomIn className="h-4 w-4" />
        </button>

        {/* Zoom Out */}
        <button
          type="button"
          onClick={(e) => { e.stopPropagation(); onZoomOut(); }}
          disabled={zoom <= 0.75}
          title={`Zoom Out (${Math.round(zoom * 100)}%)`}
          className="flex h-8 w-8 items-center justify-center rounded-xl text-white/70 transition-colors hover:bg-white/10 hover:text-white disabled:opacity-30 disabled:pointer-events-none cursor-pointer"
        >
          <ZoomOut className="h-4 w-4" />
        </button>

        {/* Reset / Fit View */}
        <button
          type="button"
          onClick={(e) => { e.stopPropagation(); onResetView(); }}
          title="Reset Pan & Zoom (100% Fit)"
          className="flex h-8 w-8 items-center justify-center rounded-xl text-white/70 transition-colors hover:bg-white/10 hover:text-white cursor-pointer"
        >
          <RotateCcw className="h-3.5 w-3.5" />
        </button>

        <div className="my-0.5 h-px w-5 bg-white/15" />

        {/* --- TIER 2: CORE DIAGNOSTIC ANATOMY & LAYERS --- */}
        {/* Pins Toggle */}
        <button
          type="button"
          onClick={(e) => { e.stopPropagation(); onTogglePins(); }}
          title={showPins ? 'Hide Annotation Pins' : 'Show Annotation Pins'}
          className={`flex h-8 w-8 items-center justify-center rounded-xl transition-colors cursor-pointer ${
            showPins ? 'text-primary bg-primary/15 border border-primary/30' : 'text-white/40 hover:bg-white/10 hover:text-white'
          }`}
        >
          {showPins ? <Eye className="h-4 w-4" /> : <EyeOff className="h-4 w-4" />}
        </button>

        {/* Smart Mask Layer Toggle */}
        {(hasActiveMask || hasMasksAvailable) && (
          <div className="relative">
            <button
              type="button"
              onClick={(e) => {
                e.stopPropagation();
                if (onToggleMask) onToggleMask();
                else setShowMaskSlider(!showMaskSlider);
              }}
              title={hasActiveMask ? 'Disable Mask Overlay' : 'Enable Mask Overlay'}
              className={`flex h-8 w-8 items-center justify-center rounded-xl transition-colors cursor-pointer ${
                hasActiveMask
                  ? 'bg-primary/25 text-primary border border-primary/40'
                  : 'text-white/50 hover:bg-white/10 hover:text-white'
              }`}
            >
              <Layers className="h-4 w-4" />
            </button>

            {/* Mask Transparency Slider Popover */}
            {hasActiveMask && showMaskSlider && onMaskOpacityChange && (
              <div
                onClick={(e) => e.stopPropagation()}
                className="absolute right-10 top-1/2 -translate-y-1/2 flex items-center gap-2 rounded-xl border border-white/20 bg-black/90 px-3 py-2 shadow-2xl backdrop-blur-md z-40"
              >
                <span className="text-[11px] font-medium text-white/70 whitespace-nowrap">
                  Mask {maskOpacity}%
                </span>
                <input
                  type="range"
                  min="0"
                  max="100"
                  value={maskOpacity}
                  onChange={(e) => onMaskOpacityChange(Number(e.target.value))}
                  className="h-1.5 w-24 cursor-pointer accent-primary bg-white/20 rounded-lg"
                />
              </div>
            )}
          </div>
        )}

        {/* 1-Tap Anatomy Structures Panel Trigger */}
        {onToggleSidebar && (
          <button
            type="button"
            onClick={(e) => { e.stopPropagation(); onToggleSidebar(); }}
            title="Open Anatomy Structures Panel"
            className="flex h-8 w-8 items-center justify-center rounded-xl text-white/70 hover:bg-primary/20 hover:text-primary transition-colors cursor-pointer"
          >
            <PanelRightOpen className="h-4 w-4" />
          </button>
        )}

        <div className="my-0.5 h-px w-5 bg-white/15" />

        {/* --- TIER 3: VIEWPORT & NOMENCLATURE PREFERENCES --- */}
        {/* Text Size Adjustment Tool */}
        {onCycleTextSize && (
          <button
            type="button"
            onClick={(e) => { e.stopPropagation(); onCycleTextSize(); }}
            title={`Annotation Text Size: ${textSize === 'sm' ? 'Small (9px)' : textSize === 'lg' ? 'Large (12.5px)' : 'Medium (10.5px)'} — Click to cycle`}
            className="relative flex h-8 w-8 items-center justify-center rounded-xl text-white/70 transition-colors hover:bg-white/10 hover:text-white cursor-pointer"
          >
            <Type className="h-4 w-4" />
            <span className="absolute bottom-1 right-1 text-[7px] font-bold font-mono text-primary leading-none uppercase">
              {textSize === 'sm' ? 'S' : textSize === 'lg' ? 'L' : 'M'}
            </span>
          </button>
        )}

        {/* Nomenclature Language Toggle (LA / EN) */}
        {onToggleLanguage && (
          <button
            type="button"
            onClick={(e) => { e.stopPropagation(); onToggleLanguage(); }}
            title={`Nomenclature: ${language === 'la' ? 'Latin' : 'English'} (Terminologia Anatomica)`}
            className="flex h-8 w-8 items-center justify-center rounded-xl text-white/70 transition-colors hover:bg-white/10 hover:text-white cursor-pointer"
          >
            <span className="font-mono text-[9px] font-bold px-1 py-0.5 rounded border border-primary/40 bg-primary/10 text-primary">
              {language === 'la' ? 'LA' : 'EN'}
            </span>
          </button>
        )}

        {/* Practice Self-Quiz Mode */}
        {onToggleQuiz && (
          <button
            type="button"
            onClick={(e) => { e.stopPropagation(); onToggleQuiz(); }}
            title={isQuizMode ? 'Exit Practice Quiz' : 'Start Practice Quiz'}
            className={`flex h-8 w-8 items-center justify-center rounded-xl transition-colors cursor-pointer ${
              isQuizMode ? 'bg-amber-500/30 text-amber-300 border border-amber-500/50 shadow-xs' : 'text-white/60 hover:bg-white/10 hover:text-white'
            }`}
          >
            <HelpCircle className="h-4 w-4" />
          </button>
        )}

        {/* Full Screen Mode (F) */}
        {onToggleFullscreen && (
          <button
            type="button"
            onClick={(e) => { e.stopPropagation(); onToggleFullscreen(); }}
            title={isFullscreen ? 'Exit Full Screen (Esc / F)' : 'Enter Full Screen (F)'}
            className={`flex h-8 w-8 items-center justify-center rounded-xl transition-colors cursor-pointer ${
              isFullscreen ? 'bg-primary/25 text-primary border border-primary/40' : 'text-white/70 hover:bg-white/10 hover:text-white'
            }`}
          >
            {isFullscreen ? <Minimize2 className="h-4 w-4" /> : <Maximize2 className="h-4 w-4" />}
          </button>
        )}
      </div>
    </div>
  );
}
