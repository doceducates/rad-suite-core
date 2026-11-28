'use client';

import React, { useState, useEffect } from 'react';
import { Atlas3DViewport } from './Atlas3DViewport';
import { SystemsTray } from './SystemsTray';
import { VitreaClippingPanel } from './VitreaClippingPanel';
import { AnatomicalInfoBox } from './AnatomicalInfoBox';
import { Atlas3DCameraControls } from './Atlas3DCameraControls';
import { useAtlasStore } from '../state/atlasStore';
import type { AnatomicalSystemId } from '../data/schema';
import { isStandaloneModelCategory } from '../core/3d/AnatomyModelLoader';
import { Layers, Slice, ChevronLeft, ChevronRight, SlidersHorizontal, Sparkles, Box } from 'lucide-react';
import { AtlasModelLibraryModal } from './AtlasModelLibraryModal';
import { cn } from '@/lib/utils';

interface AtlasContainerProps {
  className?: string;
  showControls?: boolean;
}

interface RegionCategory {
  id: string;
  label: string;
  shortLabel: string;
  systems: AnatomicalSystemId[];
}

const REGION_CATEGORIES: RegionCategory[] = [
  { id: 'skeletal', label: 'Full Skeleton (939 Bones)', shortLabel: 'Skeleton', systems: ['skeletal'] },
  { id: 'muscles', label: 'Musculature (747 Muscles)', shortLabel: 'Muscles', systems: ['skeletal', 'muscular'] },
  { id: 'circulatory', label: 'Cardiovascular (1,186 Vessels)', shortLabel: 'Cardio', systems: ['skeletal', 'circulatory'] },
  { id: 'nervous', label: 'Nervous System (1,332 Nerves)', shortLabel: 'Nerves', systems: ['skeletal', 'nervous'] },
  { id: 'brain', label: 'Encephalon & Brain (3D Neuro)', shortLabel: 'Brain', systems: ['nervous'] },
  { id: 'skull_exploded', label: 'Exploded Cranium', shortLabel: 'Exploded Skull', systems: ['skeletal'] },
  { id: 'visceral', label: 'Visceral Organs (Lungs, GI, Renal)', shortLabel: 'Viscera', systems: ['skeletal', 'respiratory', 'digestive', 'urinary', 'endocrine'] },
  { id: 'integumentary', label: 'Surface Anatomy & Skin', shortLabel: 'Surface', systems: ['integumentary', 'skeletal'] },
  { id: 'skull_head', label: 'Cranium & Skull Focus', shortLabel: 'Cranium', systems: ['skeletal'] },
];

export const AtlasContainer: React.FC<AtlasContainerProps> = ({
  className = 'w-full h-full min-h-[600px]',
  showControls = true,
}) => {
  const { viewportMode, setViewportMode, setVisibleSystems, visibleSystems } = useAtlasStore();
  const [activeCategory, setActiveCategory] = useState<string>('skeletal');
  const [isPanelOpen, setIsPanelOpen] = useState<boolean>(true);
  const [activeTab, setActiveTab] = useState<'systems' | 'slicing'>('systems');
  const [isLibraryModalOpen, setIsLibraryModalOpen] = useState<boolean>(false);

  // Automatically start collapsed on small mobile devices to give full canvas space
  useEffect(() => {
    if (typeof window !== 'undefined' && window.innerWidth < 768) {
      setIsPanelOpen(false);
    }
  }, []);

  const handleSelectCategory = (cat: RegionCategory) => {
    setActiveCategory(cat.id);
    setVisibleSystems(new Set(cat.systems));
  };

  return (
    <div className={cn('relative w-full h-full overflow-hidden bg-slate-950 font-sans select-none', className)}>
      {/* 3D WebGL Canvas */}
      <Atlas3DViewport className="w-full h-full" activeCategory={activeCategory} />

      {/* Floating HUD Controls */}
      {showControls && (
        <>
          {/* Top Region Preset Bar */}
          <div className="absolute top-3 left-1/2 -translate-x-1/2 z-20 flex items-center gap-1 bg-slate-950/85 backdrop-blur-xl p-1 rounded-xl border border-emerald-500/25 shadow-2xl overflow-x-auto max-w-[92vw] sm:max-w-2xl scrollbar-none">
            <span className="text-[10px] font-mono font-bold text-emerald-400 px-2 flex items-center gap-1 shrink-0 uppercase tracking-wider">
              <Sparkles className="w-3 h-3" /> Region:
            </span>
            {REGION_CATEGORIES.map((cat) => {
              const isActive = activeCategory === cat.id;
              return (
                <button
                  key={cat.id}
                  onClick={() => handleSelectCategory(cat)}
                  className={cn(
                    'text-[11px] px-2.5 py-1 rounded-lg font-medium transition whitespace-nowrap cursor-pointer',
                    isActive
                      ? 'bg-emerald-500 text-slate-950 font-bold shadow-md shadow-emerald-500/20'
                      : 'text-slate-400 hover:text-white hover:bg-slate-900/60'
                  )}
                >
                  <span className="hidden sm:inline">{cat.label}</span>
                  <span className="sm:hidden">{cat.shortLabel}</span>
                </button>
              );
            })}

            {/* 120+ Model Library Launcher */}
            <button
              onClick={() => setIsLibraryModalOpen(true)}
              className="flex items-center gap-1.5 px-3 py-1 rounded-lg bg-emerald-500/20 hover:bg-emerald-500/30 text-emerald-300 border border-emerald-500/40 text-[11px] font-bold transition whitespace-nowrap cursor-pointer shadow-xs ml-1"
            >
              <Box className="w-3.5 h-3.5 text-emerald-400" />
              <span>120+ Model Library</span>
            </button>
          </div>

          {/* Top-Right Mode Switcher */}
          <div className="absolute top-3 right-3 sm:right-4 z-20 hidden md:flex items-center gap-1 bg-slate-950/85 backdrop-blur-xl p-1 rounded-xl border border-emerald-500/25 shadow-xl">
            <button
              onClick={() => setViewportMode('3d')}
              className={cn(
                'text-xs px-2.5 py-1 rounded-lg font-medium transition cursor-pointer',
                viewportMode === '3d'
                  ? 'bg-emerald-500 text-slate-950 font-bold'
                  : 'text-slate-400 hover:text-white'
              )}
            >
              3D Atlas
            </button>
            <button
              onClick={() => setViewportMode('split')}
              className={cn(
                'text-xs px-2.5 py-1 rounded-lg font-medium transition cursor-pointer',
                viewportMode === 'split'
                  ? 'bg-emerald-500 text-slate-950 font-bold'
                  : 'text-slate-400 hover:text-white'
              )}
            >
              Split View
            </button>
          </div>

          {/* Left Drawer Toggle & Panel */}
          <div className="absolute top-16 left-3 sm:left-4 z-20 flex items-start gap-2">
            {isPanelOpen ? (
              <div className="bg-slate-950/90 backdrop-blur-xl border border-emerald-500/25 rounded-2xl p-3 shadow-2xl flex flex-col gap-2.5 text-slate-100 w-76 sm:w-80 max-h-[calc(100vh-120px)] overflow-hidden animate-in fade-in slide-in-from-left-4 duration-200">
                {/* Panel Navigation Tabs */}
                <div className="flex items-center justify-between border-b border-emerald-500/20 pb-2">
                  <div className="flex items-center gap-1 bg-slate-900/90 p-0.5 rounded-xl border border-emerald-500/15">
                    <button
                      type="button"
                      onClick={() => setActiveTab('systems')}
                      className={cn(
                        'flex items-center gap-1 px-2.5 py-1 rounded-lg text-[11px] font-medium transition cursor-pointer',
                        activeTab === 'systems'
                          ? 'bg-emerald-500 text-slate-950 font-bold shadow-xs'
                          : 'text-slate-400 hover:text-white'
                      )}
                    >
                      <Layers className="w-3 h-3" />
                      <span>Systems</span>
                    </button>
                    <button
                      type="button"
                      onClick={() => setActiveTab('slicing')}
                      className={cn(
                        'flex items-center gap-1 px-2.5 py-1 rounded-lg text-[11px] font-medium transition cursor-pointer',
                        activeTab === 'slicing'
                          ? 'bg-emerald-500 text-slate-950 font-bold shadow-xs'
                          : 'text-slate-400 hover:text-white'
                      )}
                    >
                      <Slice className="w-3 h-3" />
                      <span>MPR Cut</span>
                    </button>
                  </div>

                  <button
                    type="button"
                    onClick={() => setIsPanelOpen(false)}
                    className="p-1 text-slate-400 hover:text-white rounded-lg hover:bg-slate-800/60 transition cursor-pointer"
                    title="Collapse Panel"
                  >
                    <ChevronLeft className="w-4 h-4" />
                  </button>
                </div>

                {/* Tab Content */}
                <div className="overflow-y-auto scrollbar-thin pr-0.5">
                  {activeTab === 'systems' ? <SystemsTray /> : <VitreaClippingPanel />}
                </div>
              </div>
            ) : (
              <button
                type="button"
                onClick={() => setIsPanelOpen(true)}
                className="flex items-center gap-2 px-3 py-2 rounded-xl bg-slate-950/85 hover:bg-slate-900 backdrop-blur-xl border border-emerald-500/30 text-emerald-400 hover:text-emerald-300 shadow-2xl transition cursor-pointer animate-in fade-in"
                title="Expand Anatomical Systems & Slicing"
              >
                <Layers className="w-4 h-4" />
                <span className="text-xs font-semibold font-mono hidden sm:inline">Anatomy Systems ({visibleSystems.size})</span>
                <ChevronRight className="w-3.5 h-3.5" />
              </button>
            )}
          </div>

          {/* Right Floating Camera Dock */}
          <Atlas3DCameraControls className="absolute top-16 right-3 sm:right-4 z-20" />

          {/* Bottom Dock: Selected Anatomical Structure InfoBox */}
          <div className="absolute bottom-4 left-3 right-3 sm:left-auto sm:right-4 z-30 pointer-events-none">
            <div className="pointer-events-auto">
              <AnatomicalInfoBox />
            </div>
          </div>
        </>
      )}

      {/* 3D Model Library Modal */}
      <AtlasModelLibraryModal
        isOpen={isLibraryModalOpen}
        onClose={() => setIsLibraryModalOpen(false)}
        activeModelId={activeCategory}
        onSelectModel={(item) => {
          setActiveCategory(item.id);
          if (!isStandaloneModelCategory(item.id)) {
            setVisibleSystems(
              new Set(['skeletal', 'nervous', 'circulatory', 'muscular', 'respiratory', 'digestive', 'urinary', 'integumentary'])
            );
          }
        }}
      />
    </div>
  );
};
