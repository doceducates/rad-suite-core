'use client';

import React from 'react';
import { Volume2, X, Info, Sparkles } from 'lucide-react';
import { useAtlasStore } from '../state/atlasStore';
import { AnatomicalDictionary } from '../data/dictionary';

export const AnatomicalInfoBox: React.FC = () => {
  const { selectedStructureId, selectStructure, hideStructure, isolateStructure } = useAtlasStore();

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

  return (
    <div className="bg-slate-900/95 backdrop-blur-md border border-slate-800 rounded-xl p-4 shadow-2xl text-slate-100 w-84 max-w-sm flex flex-col gap-3 animate-in fade-in slide-in-from-right-4 duration-200">
      {/* Header */}
      <div className="flex items-start justify-between gap-2 border-b border-slate-800 pb-2.5">
        <div>
          <span className="text-[10px] font-mono tracking-wider uppercase text-cyan-400 bg-cyan-950/60 px-1.5 py-0.5 rounded border border-cyan-800/40">
            {struct.system} • {struct.region}
          </span>
          <h3 className="text-base font-bold text-white mt-1 leading-snug">{struct.name}</h3>
          <p className="text-xs italic text-slate-400 font-serif">{struct.latinName}</p>
        </div>
        <button
          onClick={() => selectStructure(null)}
          className="text-slate-400 hover:text-white p-1 rounded-md transition"
        >
          <X className="w-4 h-4" />
        </button>
      </div>

      {/* Audio Pronunciation */}
      <button
        onClick={playPronunciation}
        className="flex items-center justify-center gap-2 text-xs font-medium bg-slate-800 hover:bg-slate-700 text-cyan-300 py-1.5 px-3 rounded-lg border border-slate-700/60 transition"
      >
        <Volume2 className="w-4 h-4" />
        <span>Pronounce Structure</span>
      </button>

      {/* Description */}
      <p className="text-xs text-slate-300 leading-relaxed bg-slate-950/50 p-2.5 rounded-lg border border-slate-800/60">
        {struct.description}
      </p>

      {/* Actions */}
      <div className="flex items-center gap-2 pt-1">
        <button
          onClick={() => isolateStructure(struct.id)}
          className="flex-1 text-xs py-1.5 rounded-lg bg-cyan-500/20 hover:bg-cyan-500/30 text-cyan-300 border border-cyan-500/30 transition font-medium flex items-center justify-center gap-1.5"
        >
          <Sparkles className="w-3.5 h-3.5" /> Isolate
        </button>
        <button
          onClick={() => hideStructure(struct.id)}
          className="flex-1 text-xs py-1.5 rounded-lg bg-red-500/20 hover:bg-red-500/30 text-red-300 border border-red-500/30 transition font-medium"
        >
          Hide Structure
        </button>
      </div>
    </div>
  );
};
