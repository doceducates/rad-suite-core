'use client';

// Layer 4 (Presentation): Clinical Comment Card Header with Semantic Color Palette Dots
import React from 'react';
import { MessageSquare, X } from 'lucide-react';
import { ClinicalCommentColor, COMMENT_COLOR_PALETTES } from './clinical-comment-types';

interface ClinicalCommentCardHeaderProps {
  color: ClinicalCommentColor;
  onSelectColor: (c: ClinicalCommentColor) => void;
  onClose: () => void;
}

const PALETTE_COLORS: ClinicalCommentColor[] = ['indigo', 'teal', 'rose', 'amber', 'sky'];

export function ClinicalCommentCardHeader({
  color,
  onSelectColor,
  onClose,
}: ClinicalCommentCardHeaderProps) {
  const currentPalette = COMMENT_COLOR_PALETTES[color] || COMMENT_COLOR_PALETTES.indigo;

  return (
    <div className="flex items-center justify-between gap-1.5 border-b border-border/50 pb-2">
      <div className="flex items-center gap-1.5 min-w-0">
        <span className={`p-1 rounded-md ${currentPalette.bg} ${currentPalette.text} shrink-0`}>
          <MessageSquare className="w-3.5 h-3.5" />
        </span>
        <span className={`text-[11px] font-bold tracking-tight ${currentPalette.text} uppercase`}>
          Consultant Note
        </span>
      </div>

      <div className="flex items-center gap-1">
        {/* Color Palette Selector Dots */}
        <div className="flex items-center gap-1 px-1 py-0.5 rounded-full bg-muted/50 border border-border/40">
          {PALETTE_COLORS.map((c) => (
            <button
              key={c}
              type="button"
              onClick={() => onSelectColor(c)}
              className={`w-2.5 h-2.5 rounded-full ${COMMENT_COLOR_PALETTES[c].dot} transition-transform ${
                color === c ? 'scale-125 ring-2 ring-foreground/40' : 'opacity-60 hover:opacity-100'
              }`}
              title={COMMENT_COLOR_PALETTES[c].label}
            />
          ))}
        </div>

        <button
          type="button"
          onClick={onClose}
          className="p-1 rounded hover:bg-muted text-muted-foreground hover:text-foreground transition-colors cursor-pointer"
          title="Close Note"
        >
          <X className="w-3.5 h-3.5" />
        </button>
      </div>
    </div>
  );
}
