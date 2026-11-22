'use client';

import React, { useState } from 'react';
import { Atlas3DViewport } from './Atlas3DViewport';
import { SystemsTray } from './SystemsTray';
import { VitreaClippingPanel } from './VitreaClippingPanel';
import { AnatomicalInfoBox } from './AnatomicalInfoBox';
import { useAtlasStore } from '../state/atlasStore';
import type { AnatomicalSystemId } from '../data/schema';
import { Layers } from 'lucide-react';

interface AtlasContainerProps {
  className?: string;
  showControls?: boolean;
}

interface RegionCategory {
  id: string;
  label: string;
  systems: AnatomicalSystemId[];
}

const REGION_CATEGORIES: RegionCategory[] = [
  { id: 'skeletal', label: 'Full Skeleton (939 Bones & Ligaments)', systems: ['skeletal'] },
  { id: 'muscles', label: 'Musculature (747 Muscles)', systems: ['skeletal', 'muscular'] },
  { id: 'circulatory', label: 'Cardiovascular (1,186 Vessels)', systems: ['skeletal', 'circulatory'] },
  { id: 'nervous', label: 'Nervous System (1,332 Nerves)', systems: ['skeletal', 'nervous'] },
  { id: 'visceral', label: 'Visceral Organs (Lungs, GI, Renal)', systems: ['skeletal', 'respiratory', 'digestive', 'urinary', 'endocrine'] },
  { id: 'integumentary', label: 'Surface Anatomy & Skin', systems: ['integumentary', 'skeletal'] },
  { id: 'skull_head', label: 'Cranium & Skull Focus', systems: ['skeletal'] },
];

export const AtlasContainer: React.FC<AtlasContainerProps> = ({
  className = 'w-full h-full min-h-[600px]',
  showControls = true,
}) => {
  const { viewportMode, setViewportMode, setVisibleSystems } = useAtlasStore();
  const [activeCategory, setActiveCategory] = useState<string>('skeletal');

  const handleSelectCategory = (cat: RegionCategory) => {
    setActiveCategory(cat.id);
    setVisibleSystems(new Set(cat.systems));
  };

  return (
    <div className={`relative overflow-hidden bg-slate-950 font-sans select-none ${className}`}>
      {/* Real 3D Viewport with loaded anatomical meshes */}
      <Atlas3DViewport className="w-full h-full" activeCategory={activeCategory} />

      {/* Floating HUD Controls */}
      {showControls && (
        <>
          {/* Top Bar: Anatomical Region / Preset Selector */}
          <div className="absolute top-4 left-1/2 -translate-x-1/2 z-30 flex items-center gap-1 bg-slate-900/90 backdrop-blur-md p-1.5 rounded-xl border border-slate-800 shadow-2xl overflow-x-auto max-w-2xl">
            <span className="text-[11px] font-semibold text-cyan-400 px-2 flex items-center gap-1 flex-shrink-0">
              <Layers className="w-3.5 h-3.5" /> Region:
            </span>
            {REGION_CATEGORIES.map((cat) => (
              <button
                key={cat.id}
                onClick={() => handleSelectCategory(cat)}
                className={`text-[11px] px-2.5 py-1 rounded-lg font-medium transition whitespace-nowrap ${
                  activeCategory === cat.id
                    ? 'bg-cyan-500 text-slate-950 font-bold shadow-md'
                    : 'text-slate-400 hover:text-white hover:bg-slate-800/60'
                }`}
              >
                {cat.label}
              </button>
            ))}
          </div>

          {/* Top-Right Mode Bar */}
          <div className="absolute top-4 right-4 z-20 flex items-center gap-1.5 bg-slate-900/90 backdrop-blur-md p-1.5 rounded-xl border border-slate-800 shadow-xl">
            <button
              onClick={() => setViewportMode('3d')}
              className={`text-xs px-2.5 py-1 rounded-lg font-medium transition ${
                viewportMode === '3d'
                  ? 'bg-cyan-500 text-slate-950 font-bold'
                  : 'text-slate-400 hover:text-white'
              }`}
            >
              3D Atlas
            </button>
            <button
              onClick={() => setViewportMode('split')}
              className={`text-xs px-2.5 py-1 rounded-lg font-medium transition ${
                viewportMode === 'split'
                  ? 'bg-cyan-500 text-slate-950 font-bold'
                  : 'text-slate-400 hover:text-white'
              }`}
            >
              Split View
            </button>
          </div>

          {/* Left HUD: Systems Tray */}
          <div className="absolute top-16 left-4 z-20">
            <SystemsTray />
          </div>

          {/* Bottom-Left HUD: Vitrea MPR Slicing Panel */}
          <div className="absolute bottom-4 left-4 z-20">
            <VitreaClippingPanel />
          </div>

          {/* Bottom-Right HUD: Anatomical InfoBox */}
          <div className="absolute bottom-4 right-4 z-20">
            <AnatomicalInfoBox />
          </div>
        </>
      )}
    </div>
  );
};
