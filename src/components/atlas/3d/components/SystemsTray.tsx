'use client';

import React from 'react';
import { Eye, EyeOff, RotateCcw, Scissors, Sparkles, Layers, Sliders, User } from 'lucide-react';
import { useAtlasStore } from '../state/atlasStore';
import { ANATOMICAL_SYSTEMS } from '../data/systems';
import type { AnatomicalSystemId } from '../data/schema';
import { cn } from '@/lib/utils';

interface SystemsTrayProps {
  className?: string;
}

export const SystemsTray: React.FC<SystemsTrayProps> = ({ className }) => {
  const {
    activeGender,
    setGender,
    showGhostBody,
    toggleGhostBody,
    visibleSystems,
    systemOpacities,
    toggleSystem,
    setVisibleSystems,
    setSystemOpacity,
    selectedStructureId,
    fadeOthersExceptId,
    hideStructure,
    fadeStructure,
    fadeOthers,
    isolateStructure,
    restoreHiddenStructures,
    resetAll,
  } = useAtlasStore();

  const systems = Object.values(ANATOMICAL_SYSTEMS);

  const handleLayerPeel = (level: number) => {
    if (level === 0) setVisibleSystems(new Set(['skeletal']));
    else if (level === 1) setVisibleSystems(new Set(['skeletal', 'respiratory', 'digestive', 'urinary', 'endocrine']));
    else if (level === 3) setVisibleSystems(new Set(['skeletal', 'muscular', 'circulatory', 'nervous']));
    else setVisibleSystems(new Set(systems.map((s) => s.id as AnatomicalSystemId)));
  };

  return (
    <div className={cn('flex flex-col gap-2.5 text-slate-100 select-none', className)}>
      <div className="flex items-center justify-between border-b border-emerald-500/20 pb-2">
        <div className="flex items-center gap-1.5">
          <Layers className="w-3.5 h-3.5 text-emerald-400" />
          <span className="text-xs font-semibold tracking-wider uppercase text-emerald-400 font-mono">
            Anatomical Systems
          </span>
        </div>
        <button
          onClick={resetAll}
          title="Reset All Layers"
          className="text-slate-400 hover:text-emerald-300 p-1 rounded-md hover:bg-slate-800/60 transition cursor-pointer"
        >
          <RotateCcw className="w-3.5 h-3.5" />
        </button>
      </div>

      {/* Male / Female Switch & Ghost Reference Shell */}
      <div className="flex items-center gap-1.5">
        <div className="flex-1 grid grid-cols-2 gap-1 bg-slate-950 p-1 rounded-xl border border-emerald-500/15">
          {(['male', 'female'] as const).map((sex) => (
            <button
              key={sex}
              type="button"
              onClick={() => setGender(sex)}
              className={cn(
                'text-[11px] py-1 rounded-lg font-semibold capitalize transition flex items-center justify-center gap-1 cursor-pointer',
                activeGender === sex
                  ? 'bg-emerald-500 text-slate-950 shadow'
                  : 'text-slate-400 hover:text-white'
              )}
            >
              <User className="w-3 h-3" /> {sex}
            </button>
          ))}
        </div>
        <button
          type="button"
          onClick={toggleGhostBody}
          title="Toggle Glass Body Reference Outline"
          className={cn(
            'text-[11px] px-2.5 py-1.5 rounded-xl border font-medium transition flex items-center gap-1 cursor-pointer',
            showGhostBody
              ? 'bg-emerald-500/20 text-emerald-300 border-emerald-500/40'
              : 'bg-slate-950 text-slate-400 border-slate-800 hover:text-white'
          )}
        >
          <Layers className="w-3 h-3" /> Ghost
        </button>
      </div>

      {/* Quick Peeling Layer Stepper */}
      <div className="bg-slate-950/70 p-2 rounded-xl border border-emerald-500/15 flex flex-col gap-1.5">
        <div className="flex items-center justify-between text-[10px] text-muted-foreground font-mono">
          <span className="flex items-center gap-1">
            <Sliders className="w-3 h-3 text-emerald-400" />
            <span>Master Depth Peel</span>
          </span>
          <span className="text-emerald-400">{visibleSystems.size} Systems</span>
        </div>
        <div className="grid grid-cols-4 gap-1 text-[10px] font-medium text-center">
          <button type="button" onClick={() => handleLayerPeel(0)} className="py-1 rounded bg-slate-800/80 hover:bg-emerald-500/20 hover:text-emerald-300 text-slate-300 transition cursor-pointer">Bone</button>
          <button type="button" onClick={() => handleLayerPeel(1)} className="py-1 rounded bg-slate-800/80 hover:bg-emerald-500/20 hover:text-emerald-300 text-slate-300 transition cursor-pointer">Organs</button>
          <button type="button" onClick={() => handleLayerPeel(3)} className="py-1 rounded bg-slate-800/80 hover:bg-emerald-500/20 hover:text-emerald-300 text-slate-300 transition cursor-pointer">Muscles</button>
          <button type="button" onClick={() => handleLayerPeel(4)} className="py-1 rounded bg-slate-800/80 hover:bg-emerald-500/20 hover:text-emerald-300 text-slate-300 transition cursor-pointer">Full</button>
        </div>
      </div>

      {/* Dissection Actions Bar */}
      {selectedStructureId && (
        <div className="flex flex-col gap-1 bg-emerald-950/30 p-1.5 rounded-xl border border-emerald-500/30 animate-in fade-in duration-200">
          <div className="flex items-center gap-1">
            <button onClick={() => hideStructure(selectedStructureId)} className="flex-1 flex items-center justify-center gap-1 text-[11px] bg-red-500/20 hover:bg-red-500/30 text-red-300 py-1 rounded-lg transition font-medium cursor-pointer">
              <Scissors className="w-3 h-3" /> Hide
            </button>
            <button onClick={() => fadeStructure(selectedStructureId)} className="flex-1 text-[11px] bg-amber-500/20 hover:bg-amber-500/30 text-amber-300 py-1 rounded-lg transition font-medium cursor-pointer">
              Fade
            </button>
            <button onClick={() => isolateStructure(selectedStructureId)} className="flex-1 text-[11px] bg-emerald-500/20 hover:bg-emerald-500/30 text-emerald-300 py-1 rounded-lg transition font-medium cursor-pointer flex items-center justify-center gap-1">
              <Sparkles className="w-3 h-3" /> Isolate
            </button>
          </div>
          <div className="flex items-center gap-1">
            <button
              onClick={() => fadeOthers(selectedStructureId)}
              className={cn(
                'flex-1 text-[11px] py-1 rounded-lg transition font-medium cursor-pointer',
                fadeOthersExceptId === selectedStructureId
                  ? 'bg-emerald-500 text-slate-950 font-bold'
                  : 'bg-slate-800 hover:bg-slate-700 text-slate-200'
              )}
            >
              Fade Others
            </button>
            <button onClick={restoreHiddenStructures} className="flex-1 text-[11px] bg-slate-800 hover:bg-slate-700 text-slate-200 py-1 rounded-lg transition font-medium cursor-pointer">
              Restore All
            </button>
          </div>
        </div>
      )}

      {/* Systems Layer List */}
      <div className="flex flex-col gap-1 max-h-68 overflow-y-auto pr-1 scrollbar-thin">
        {systems.map((sys) => {
          const isVisible = visibleSystems.has(sys.id as AnatomicalSystemId);
          const opacity = systemOpacities[sys.id as AnatomicalSystemId] ?? 1.0;

          return (
            <div
              key={sys.id}
              data-system-id={sys.id}
              className={cn(
                'flex items-center justify-between gap-2 p-1.5 rounded-lg transition border',
                isVisible ? 'bg-slate-900/80 border-slate-800/80' : 'bg-slate-950/40 border-transparent opacity-45'
              )}
            >
              <div className="flex items-center gap-2 flex-1 min-w-0">
                <span className="w-2.5 h-2.5 rounded-full flex-shrink-0 shadow-xs" style={{ backgroundColor: sys.colorHex }} />
                <span className="text-xs truncate font-medium text-slate-200">{sys.name}</span>
              </div>
              <div className="flex items-center gap-1.5 flex-shrink-0">
                {isVisible && (
                  <input
                    type="range"
                    min="0.1"
                    max="1"
                    step="0.05"
                    value={opacity}
                    onChange={(e) => setSystemOpacity(sys.id as AnatomicalSystemId, parseFloat(e.target.value))}
                    className="w-10 h-1 accent-emerald-400 bg-slate-700 rounded cursor-pointer"
                    title={`Opacity: ${Math.round(opacity * 100)}%`}
                  />
                )}
                <button
                  data-testid={`toggle-${sys.id}`}
                  aria-label={`Toggle ${sys.name}`}
                  onClick={() => toggleSystem(sys.id as AnatomicalSystemId)}
                  className="text-slate-400 hover:text-emerald-300 p-1 rounded transition cursor-pointer"
                >
                  {isVisible ? <Eye className="w-3.5 h-3.5 text-emerald-400" /> : <EyeOff className="w-3.5 h-3.5 text-slate-500" />}
                </button>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
};
