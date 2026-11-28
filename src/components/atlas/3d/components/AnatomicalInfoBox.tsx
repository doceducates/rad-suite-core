'use client';

import React from 'react';
import { Volume2, X, Sparkles, EyeOff, Compass, Eye } from 'lucide-react';
import { useAtlasStore } from '../state/atlasStore';
import { AnatomicalDictionary } from '../data/dictionary';
import { AtlasNavBus } from '../vitrea/AtlasNavBus';
import { cn } from '@/lib/utils';

interface AnatomicalInfoBoxProps {
  className?: string;
}

export const AnatomicalInfoBox: React.FC<AnatomicalInfoBoxProps> = ({ className }) => {
  const {
    selectedStructureId,
    fadeOthersExceptId,
    selectStructure,
    hideStructure,
    fadeStructure,
    fadeOthers,
    isolateStructure,
  } = useAtlasStore();

  if (!selectedStructureId) return null;

  const struct = AnatomicalDictionary.getById(selectedStructureId);
  if (!struct) return null;

  const playPronunciation = () => {
    if ('speechSynthesis' in window) {
      window.speechSynthesis.cancel();
      const utterance = new SpeechSynthesisUtterance(struct.name);
      utterance.rate = 0.85;
      utterance.lang = 'en-US';
      window.speechSynthesis.speak(utterance);
    }
  };

  const handleFocus = () => {
    AtlasNavBus.emitCameraCommand({ type: 'focus', structureId: struct.id });
  };

  return (
    <div
      className={cn(
        'bg-slate-950/90 backdrop-blur-xl border border-emerald-500/30 rounded-2xl p-4 shadow-2xl text-slate-100 flex flex-col gap-3 animate-in fade-in slide-in-from-bottom-2 md:slide-in-from-right-4 duration-300 w-full sm:w-84 max-w-sm',
        className
      )}
    >
      <div className="flex items-start justify-between gap-2 border-b border-emerald-500/20 pb-2.5">
        <div className="min-w-0">
          <div className="flex items-center gap-1.5 flex-wrap">
            <span className="text-[10px] font-mono tracking-wider uppercase text-emerald-400 bg-emerald-500/10 px-2 py-0.5 rounded-full border border-emerald-500/30 font-bold">
              {struct.system} › {struct.region}
            </span>
          </div>
          <h3 className="text-base font-bold text-white mt-1.5 leading-snug truncate">{struct.name}</h3>
          <p className="text-xs italic text-emerald-300/80 font-serif">{struct.latinName}</p>
        </div>
        <button
          onClick={() => selectStructure(null)}
          className="text-slate-400 hover:text-white p-1 rounded-lg hover:bg-slate-800 transition cursor-pointer"
          title="Deselect"
        >
          <X className="w-4 h-4" />
        </button>
      </div>

      <div className="flex items-center gap-2">
        <button
          type="button"
          onClick={playPronunciation}
          className="flex-1 flex items-center justify-center gap-1.5 text-xs font-medium bg-slate-900 hover:bg-slate-800 text-emerald-300 py-1.5 px-3 rounded-xl border border-emerald-500/20 transition cursor-pointer"
        >
          <Volume2 className="w-3.5 h-3.5" />
          <span>Pronounce</span>
        </button>
        <button
          type="button"
          onClick={handleFocus}
          className="flex items-center justify-center gap-1.5 text-xs font-medium bg-slate-900 hover:bg-slate-800 text-slate-300 hover:text-white py-1.5 px-3 rounded-xl border border-slate-800 transition cursor-pointer"
          title="Align Camera View"
        >
          <Compass className="w-3.5 h-3.5 text-emerald-400" />
          <span>Center</span>
        </button>
      </div>

      <p className="text-xs text-slate-300/90 leading-relaxed bg-slate-900/60 p-2.5 rounded-xl border border-slate-800/80 max-h-32 overflow-y-auto scrollbar-thin">
        {struct.description}
      </p>

      <div className="grid grid-cols-2 gap-1.5 pt-0.5">
        <button
          type="button"
          onClick={() => isolateStructure(struct.id)}
          className="text-xs py-1.5 rounded-xl bg-emerald-500/15 hover:bg-emerald-500/25 text-emerald-300 border border-emerald-500/30 transition font-medium flex items-center justify-center gap-1.5 cursor-pointer shadow-xs"
        >
          <Sparkles className="w-3.5 h-3.5" />
          <span>Isolate</span>
        </button>
        <button
          type="button"
          onClick={() => fadeOthers(struct.id)}
          className={cn(
            'text-xs py-1.5 rounded-xl border transition font-medium flex items-center justify-center gap-1.5 cursor-pointer',
            fadeOthersExceptId === struct.id
              ? 'bg-emerald-500 text-slate-950 border-emerald-400 font-bold'
              : 'bg-slate-900 hover:bg-slate-800 text-slate-200 border-slate-700'
          )}
        >
          <Eye className="w-3.5 h-3.5" />
          <span>Fade Others</span>
        </button>
        <button
          type="button"
          onClick={() => fadeStructure(struct.id)}
          className="text-xs py-1.5 rounded-xl bg-amber-500/15 hover:bg-amber-500/25 text-amber-300 border border-amber-500/30 transition font-medium cursor-pointer"
        >
          Fade (25%)
        </button>
        <button
          type="button"
          onClick={() => hideStructure(struct.id)}
          className="text-xs py-1.5 rounded-xl bg-red-500/15 hover:bg-red-500/25 text-red-300 border border-red-500/30 transition font-medium flex items-center justify-center gap-1.5 cursor-pointer"
        >
          <EyeOff className="w-3.5 h-3.5" />
          <span>Hide</span>
        </button>
      </div>
    </div>
  );
};
