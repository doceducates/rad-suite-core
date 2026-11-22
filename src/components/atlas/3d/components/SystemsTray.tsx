'use client';

import React from 'react';
import { Eye, EyeOff, RotateCcw, Scissors } from 'lucide-react';
import { useAtlasStore } from '../state/atlasStore';
import { ANATOMICAL_SYSTEMS } from '../data/systems';
import type { AnatomicalSystemId } from '../data/schema';

export const SystemsTray: React.FC = () => {
  const {
    visibleSystems,
    systemOpacities,
    toggleSystem,
    setSystemOpacity,
    selectedStructureId,
    hideStructure,
    isolateStructure,
    restoreHiddenStructures,
    resetAll,
  } = useAtlasStore();

  const systems = Object.values(ANATOMICAL_SYSTEMS);

  return (
    <div className="bg-slate-900/90 backdrop-blur-md border border-slate-800 rounded-xl p-3 shadow-2xl flex flex-col gap-3 text-slate-100 max-w-xs">
      <div className="flex items-center justify-between border-b border-slate-800 pb-2">
        <span className="text-xs font-semibold tracking-wider uppercase text-cyan-400">
          Anatomical Systems
        </span>
        <button
          onClick={resetAll}
          title="Reset All Layers"
          className="text-slate-400 hover:text-white transition-colors"
        >
          <RotateCcw className="w-3.5 h-3.5" />
        </button>
      </div>

      {/* Dissection Actions Bar */}
      {selectedStructureId && (
        <div className="flex items-center gap-1.5 bg-slate-800/80 p-1.5 rounded-lg border border-slate-700/50">
          <button
            onClick={() => hideStructure(selectedStructureId)}
            className="flex-1 flex items-center justify-center gap-1 text-[11px] bg-red-500/20 hover:bg-red-500/30 text-red-300 py-1 rounded transition"
          >
            <Scissors className="w-3 h-3" /> Hide
          </button>
          <button
            onClick={() => isolateStructure(selectedStructureId)}
            className="flex-1 text-[11px] bg-cyan-500/20 hover:bg-cyan-500/30 text-cyan-300 py-1 rounded transition"
          >
            Isolate
          </button>
          <button
            onClick={restoreHiddenStructures}
            className="flex-1 text-[11px] bg-slate-700 hover:bg-slate-600 text-slate-200 py-1 rounded transition"
          >
            Unhide All
          </button>
        </div>
      )}

      {/* Systems Layer List */}
      <div className="flex flex-col gap-1.5 max-h-80 overflow-y-auto pr-1">
        {systems.map((sys) => {
          const isVisible = visibleSystems.has(sys.id as AnatomicalSystemId);
          const opacity = systemOpacities[sys.id as AnatomicalSystemId] ?? 1.0;

          return (
            <div
              key={sys.id}
              data-system-id={sys.id}
              className={`flex items-center justify-between gap-2 p-1.5 rounded-md transition ${
                isVisible ? 'bg-slate-800/60' : 'bg-slate-900/40 opacity-50'
              }`}
            >
              <div className="flex items-center gap-2 flex-1 min-w-0">
                <span
                  className="w-2.5 h-2.5 rounded-full flex-shrink-0"
                  style={{ backgroundColor: sys.colorHex }}
                />
                <span className="text-xs truncate font-medium">{sys.name}</span>
              </div>

              {/* Opacity slider & Eye toggle */}
              <div className="flex items-center gap-1.5 flex-shrink-0">
                {isVisible && (
                  <input
                    type="range"
                    min="0.1"
                    max="1"
                    step="0.05"
                    value={opacity}
                    onChange={(e) =>
                      setSystemOpacity(sys.id as AnatomicalSystemId, parseFloat(e.target.value))
                    }
                    className="w-12 h-1 accent-cyan-400 bg-slate-700 rounded cursor-pointer"
                  />
                )}
                <button
                  data-testid={`toggle-${sys.id}`}
                  aria-label={`Toggle ${sys.name}`}
                  onClick={() => toggleSystem(sys.id as AnatomicalSystemId)}
                  className="text-slate-400 hover:text-white p-0.5"
                >
                  {isVisible ? <Eye className="w-3.5 h-3.5" /> : <EyeOff className="w-3.5 h-3.5" />}
                </button>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
};
