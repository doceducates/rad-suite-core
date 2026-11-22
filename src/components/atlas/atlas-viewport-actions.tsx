'use client';

import React from 'react';
import { Globe, Eye, EyeOff, HelpCircle } from 'lucide-react';

interface AtlasViewportActionsProps {
  language: 'en' | 'la';
  onToggleLanguage: () => void;
  showPins: boolean;
  onTogglePins: () => void;
  isQuizMode: boolean;
  onToggleQuiz: () => void;
}

export function AtlasViewportActions({
  language,
  onToggleLanguage,
  showPins,
  onTogglePins,
  isQuizMode,
  onToggleQuiz,
}: AtlasViewportActionsProps) {
  return (
    <div className="absolute top-3 right-3 sm:top-4 sm:right-4 z-30 flex items-center gap-1 rounded-xl border border-white/15 bg-black/80 p-1 shadow-2xl backdrop-blur-md">
      {/* Nomenclature Toggle (EN / Latin) */}
      <button
        type="button"
        onClick={onToggleLanguage}
        title="Switch Nomenclature (English / Latin Terminologia Anatomica)"
        className="flex items-center gap-1 rounded-lg px-2 py-1 text-[11px] font-medium text-white/70 transition-colors hover:bg-white/10 hover:text-white cursor-pointer"
      >
        <Globe className="h-3.5 w-3.5 text-primary" />
        <span className="font-mono text-[10px] uppercase font-semibold">
          {language === 'la' ? 'Latin' : 'EN'}
        </span>
      </button>

      {/* Pin Visibility Toggle */}
      <button
        type="button"
        onClick={onTogglePins}
        title={showPins ? 'Hide annotation pins' : 'Show annotation pins'}
        className={`flex items-center gap-1 rounded-lg px-2 py-1 text-[11px] font-medium transition-colors cursor-pointer ${
          showPins
            ? 'text-primary hover:bg-primary/10'
            : 'text-amber-400 bg-amber-400/10'
        }`}
      >
        {showPins ? <Eye className="h-3.5 w-3.5" /> : <EyeOff className="h-3.5 w-3.5" />}
        <span className="hidden sm:inline">{showPins ? 'Pins' : 'Off'}</span>
      </button>

      {/* Self-Quiz / Practice Mode */}
      <button
        type="button"
        onClick={onToggleQuiz}
        title="Toggle Practice Challenge & Self-Quiz Mode"
        className={`flex items-center gap-1 rounded-lg px-2.5 py-1 text-[11px] font-medium transition-all cursor-pointer ${
          isQuizMode
            ? 'bg-amber-600 text-white font-semibold shadow-xs'
            : 'text-white/70 hover:bg-white/10 hover:text-white'
        }`}
      >
        <HelpCircle className="h-3.5 w-3.5" />
        <span className="hidden sm:inline">{isQuizMode ? 'Exit Practice' : 'Practice'}</span>
      </button>
    </div>
  );
}
