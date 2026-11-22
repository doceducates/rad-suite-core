'use client';

// Layer 4 (Presentation): Gutter Quick-Add and Pinned Badges Column (<100 lines)
import React from 'react';
import { MessageSquare, Plus } from 'lucide-react';
import { COMMENT_COLOR_PALETTES, computeSmartCommentCoords } from './clinical-comment-types';
import type { BlockCommentMeta } from './clinical-gutter-stacked-cards';

export interface ClinicalGutterBadgesColumnProps {
  blocks: BlockCommentMeta[];
  hoveredBlockIndex: number | null;
  onHoverBlock: (index: number | null) => void;
  containerRef: React.RefObject<HTMLDivElement | null>;
  onOpenComment: (commentId: string, coords: { top: number; left: number }, quotedText: string) => void;
  onAddCommentForBlock: (pos: number, text: string) => void;
}

export function ClinicalGutterBadgesColumn({
  blocks,
  hoveredBlockIndex,
  onHoverBlock,
  containerRef,
  onOpenComment,
  onAddCommentForBlock,
}: ClinicalGutterBadgesColumnProps) {
  return (
    <div className="clinical-gutter-column absolute right-1.5 top-0 bottom-0 w-8 pointer-events-none z-20 select-none">
      {blocks.map((block) => {
        const count = block.comments.length;
        const isHovered = hoveredBlockIndex === block.blockIndex;
        const firstComment = block.comments[0];
        const palette = firstComment?.color
          ? COMMENT_COLOR_PALETTES[firstComment.color]
          : COMMENT_COLOR_PALETTES.indigo;

        return (
          <div
            key={`gutter-block-${block.blockIndex}`}
            style={{ top: `${block.top + 2}px` }}
            onMouseEnter={() => onHoverBlock(block.blockIndex)}
            onMouseLeave={() => onHoverBlock(null)}
            className="absolute right-0 flex items-center justify-end w-8 h-6 pointer-events-auto"
          >
            {count > 0 ? (
              <div className="flex items-center gap-0.5">
                <button
                  type="button"
                  onClick={() => {
                    const coords = computeSmartCommentCoords(containerRef.current, block.lineClientTop);
                    onOpenComment(firstComment.id, coords, firstComment.quotedText || block.text);
                  }}
                  className={`h-5 min-w-[20px] px-1 rounded-full ${palette.bg} ${palette.border} border ${palette.text} font-bold text-[10px] flex items-center justify-center gap-0.5 shadow-2xs hover:scale-105 active:scale-95 transition-all cursor-pointer`}
                  title={`${count} consultant note${count > 1 ? 's' : ''} on this block`}
                >
                  <MessageSquare className="w-2.5 h-2.5" />
                  <span>{count}</span>
                </button>

                {isHovered && (
                  <button
                    type="button"
                    onClick={() => onAddCommentForBlock(block.pos, block.text)}
                    className="w-4 h-4 rounded-full bg-muted/80 hover:bg-muted text-muted-foreground hover:text-foreground flex items-center justify-center text-[10px] shadow-2xs transition-all cursor-pointer animate-in fade-in zoom-in-75 duration-100"
                    title="Add another note on this block"
                  >
                    <Plus className="w-2.5 h-2.5" />
                  </button>
                )}
              </div>
            ) : (
              <button
                type="button"
                onClick={() => onAddCommentForBlock(block.pos, block.text)}
                className={`h-5 px-1.5 rounded-full bg-muted/80 hover:bg-primary/20 text-muted-foreground hover:text-primary border border-border/80 flex items-center gap-0.5 text-[10px] font-medium shadow-2xs transition-all duration-100 cursor-pointer ${
                  isHovered
                    ? 'opacity-100 scale-100 pointer-events-auto'
                    : 'opacity-0 scale-90 pointer-events-none'
                }`}
                title="Add consultant note on this block"
              >
                <Plus className="w-3 h-3" />
                <MessageSquare className="w-2.5 h-2.5 opacity-60" />
              </button>
            )}
          </div>
        );
      })}
    </div>
  );
}
