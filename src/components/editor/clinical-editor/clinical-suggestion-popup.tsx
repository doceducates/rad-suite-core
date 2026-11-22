'use client';

import React from 'react';
import { Sparkles, Check, X, CornerDownLeft } from 'lucide-react';
import { ActiveSuggestion } from './clinical-editor-types';

interface ClinicalSuggestionPopupProps {
  suggestion: ActiveSuggestion | null;
  onAccept: () => void;
  onDismiss: () => void;
  isMobile?: boolean;
}

export function ClinicalSuggestionPopup({
  suggestion,
  onAccept,
  onDismiss,
  isMobile = false,
}: ClinicalSuggestionPopupProps) {
  if (!suggestion) return null;

  return (
    <div
      onDoubleClick={onAccept}
      className={`bg-card text-card-foreground border border-primary/40 shadow-xl rounded-lg p-3 z-50 animate-in fade-in slide-in-from-bottom-2 duration-150 select-none ${
        isMobile
          ? 'fixed bottom-14 inset-x-2 border-primary/60'
          : 'relative my-2 border-l-4 border-l-primary'
      }`}
    >
      <div className="flex items-center justify-between pb-1.5 mb-1.5 border-b border-border/50 text-[11px]">
        <div className="flex items-center gap-1.5">
          <span className="p-1 rounded bg-primary/10 text-primary">
            <Sparkles className="w-3.5 h-3.5" />
          </span>
          <span className="font-bold text-foreground">
            AI Structured Suggestion
          </span>
          {suggestion.matchedOrgan && (
            <span className="text-[10px] font-mono bg-muted px-1.5 py-0.5 rounded text-muted-foreground">
              {suggestion.matchedOrgan}
            </span>
          )}
        </div>
        <div className="flex items-center gap-1.5">
          <span className="text-[10px] text-muted-foreground hidden sm:inline">
            Double-click or press <kbd className="font-mono bg-muted px-1 rounded border border-border">Tab</kbd> to accept
          </span>
          <button
            type="button"
            onClick={onDismiss}
            className="p-1 rounded hover:bg-muted text-muted-foreground hover:text-foreground cursor-pointer"
            title="Dismiss (Esc)"
          >
            <X className="w-3.5 h-3.5" />
          </button>
        </div>
      </div>

      {/* Suggested Prose Content */}
      <div
        className="text-xs text-foreground/90 leading-relaxed font-body p-2 rounded bg-primary/5 border border-primary/10 cursor-pointer hover:bg-primary/10 transition-colors"
        onClick={onAccept}
        title="Click or double-click to insert"
      >
        <span className="text-primary font-semibold mr-1">
          Proposed:
        </span>
        {suggestion.text}
      </div>

      {/* Mobile / Direct Action Controls */}
      <div className="flex items-center justify-end gap-2 mt-2 pt-1 border-t border-border/40">
        <button
          type="button"
          onClick={onDismiss}
          className="px-2 py-1 text-[11px] rounded text-muted-foreground hover:bg-muted cursor-pointer"
        >
          Dismiss (Esc)
        </button>
        <button
          type="button"
          onClick={onAccept}
          className="px-2.5 py-1 text-[11px] font-bold rounded bg-primary hover:bg-primary/90 text-on-primary flex items-center gap-1 shadow-sm transition-colors cursor-pointer"
        >
          <Check className="w-3.5 h-3.5" />
          <span>Accept Suggestion</span>
          <CornerDownLeft className="w-3 h-3 opacity-70 ml-0.5 hidden sm:inline" />
        </button>
      </div>
    </div>
  );
}
