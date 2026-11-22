'use client';

// Layer 4 (Presentation): Wide-mode stacked discussion cards in right margin
// Strict File Size Invariant: Target < 120 lines, max 350 lines

import React from 'react';
import { User, Paperclip, Volume2 } from 'lucide-react';
import { COMMENT_COLOR_PALETTES, ClinicalCommentItem } from './clinical-comment-types';
import { ClinicalInlineConfirmBtn } from './clinical-inline-confirm-btn';
import { computeSmartCommentCoords } from './clinical-comment-types';

export interface BlockCommentMeta {
  blockIndex: number;
  pos: number;
  top: number;
  lineClientTop: number;
  text: string;
  comments: ClinicalCommentItem[];
}

interface ClinicalGutterStackedCardsProps {
  isWideMode: boolean;
  blocks: BlockCommentMeta[];
  spaceToRight: number;
  containerRight: number;
  containerRef: React.RefObject<HTMLDivElement | null>;
  elevatedCommentId: string | null;
  setElevatedCommentId: (id: string | null) => void;
  onOpenComment: (id: string, coords: any, quotedText: string) => void;
  onResolveComment: (id: string) => void;
  onDeleteComment: (id: string) => void;
}

export function ClinicalGutterStackedCards({
  isWideMode,
  blocks,
  spaceToRight,
  containerRight,
  containerRef,
  elevatedCommentId,
  setElevatedCommentId,
  onOpenComment,
  onResolveComment,
  onDeleteComment,
}: ClinicalGutterStackedCardsProps) {
  if (!isWideMode) return null;

  return (
    <>
      {blocks.map((block) => {
        if (block.comments.length === 0) return null;
        const safeTop = Math.max(
          75,
          Math.min(block.lineClientTop, (typeof window !== 'undefined' ? window.innerHeight : 800) - 220)
        );
        const cardWidth = Math.min(280, Math.max(200, spaceToRight - 28));

        return (
          <div
            key={`pinned-margin-card-${block.blockIndex}`}
            style={{
              position: 'fixed',
              top: `${safeTop}px`,
              left: `${containerRight + 14}px`,
              width: `${cardWidth}px`,
            }}
            className="z-30 pointer-events-auto flex flex-col relative select-none"
          >
            {block.comments.map((cmt, idx) => {
              const isElevated = elevatedCommentId === cmt.id;
              const palette = COMMENT_COLOR_PALETTES[cmt.color || 'indigo'];
              const stackOffset = isElevated ? 0 : idx * 4;
              const scale = isElevated ? 1 : Math.max(0.94, 1 - idx * 0.02);

              return (
                <div
                  key={cmt.id}
                  onClick={() => {
                    setElevatedCommentId(cmt.id);
                    const coords = computeSmartCommentCoords(containerRef.current, block.lineClientTop);
                    onOpenComment(cmt.id, coords, cmt.quotedText || block.text);
                  }}
                  style={{
                    marginTop: idx > 0 ? (isElevated ? '6px' : '-24px') : '0',
                    transform: `translateY(${stackOffset}px) scale(${scale})`,
                    zIndex: isElevated ? 50 : 30 - idx,
                  }}
                  className={`clinical-stacked-comment-card group rounded-xl border ${
                    isElevated ? `${palette.border} ring-2 ${palette.ring}` : 'border-border/80'
                  } bg-card/95 hover:bg-card p-2.5 text-xs shadow-lg backdrop-blur-md transition-all duration-200 cursor-pointer`}
                >
                  <div className="flex items-center justify-between gap-1 text-[10px] text-muted-foreground mb-1">
                    <div className="flex items-center gap-1 font-semibold text-foreground truncate">
                      <User className={`w-3 h-3 ${palette.text} shrink-0`} />
                      <span className="truncate">{cmt.authorName || 'Consultant Note'}</span>
                      {block.comments.length > 1 && (
                        <span className="text-[9px] px-1 rounded bg-muted text-muted-foreground font-mono">
                          {idx + 1}/{block.comments.length}
                        </span>
                      )}
                    </div>
                    <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                      <ClinicalInlineConfirmBtn
                        actionType="resolve"
                        onConfirm={() => onResolveComment(cmt.id)}
                        title="Resolve & release note"
                      />
                      <ClinicalInlineConfirmBtn
                        actionType="delete"
                        onConfirm={() => onDeleteComment(cmt.id)}
                        title="Delete note"
                      />
                    </div>
                  </div>

                  {cmt.quotedText && (
                    <div
                      className={`text-[10px] italic text-muted-foreground border-l-2 ${palette.border} pl-1.5 mb-1.5 truncate`}
                    >
                      &ldquo;{cmt.quotedText}&rdquo;
                    </div>
                  )}

                  <div className="text-foreground line-clamp-2 leading-relaxed font-sans">
                    {cmt.comment ? (
                      cmt.comment
                    ) : (
                      <span className={`${palette.text} italic text-[11px]`}>Click to add note...</span>
                    )}
                  </div>

                  {cmt.attachment && (
                    <div className="mt-1.5 flex items-center gap-1.5 text-[9px] text-primary bg-primary/10 px-2 py-1 rounded-md truncate">
                      {cmt.attachment.type.startsWith('audio/') ? (
                        <Volume2 className="w-3 h-3 shrink-0 text-rose-500" />
                      ) : (
                        <Paperclip className="w-3 h-3 shrink-0" />
                      )}
                      <span className="truncate font-medium">{cmt.attachment.name}</span>
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        );
      })}
    </>
  );
}
