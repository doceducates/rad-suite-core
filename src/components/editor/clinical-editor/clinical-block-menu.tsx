'use client';

import React, { useEffect, useRef } from 'react';
import {
  Type,
  Heading2,
  Heading3,
  List,
  ListOrdered,
  AlertTriangle,
  Lightbulb,
  Info,
  Copy,
  Trash2,
  ArrowUp,
  ArrowDown,
  Sparkles,
  MessageSquare,
} from 'lucide-react';
import { CalloutType } from './clinical-callout-extension';

interface ClinicalBlockMenuProps {
  isOpen: boolean;
  onClose: () => void;
  onTurnInto: (
    type: 'paragraph' | 'heading' | 'bulletList' | 'orderedList' | 'callout',
    attrs?: { level?: 2 | 3; calloutType?: CalloutType }
  ) => void;
  onMoveUp: () => void;
  onMoveDown: () => void;
  onDuplicate: () => void;
  onDelete: () => void;
  onAiAction: () => void;
  onAddComment?: () => void;
}

export function ClinicalBlockMenu({
  isOpen,
  onClose,
  onTurnInto,
  onMoveUp,
  onMoveDown,
  onDuplicate,
  onDelete,
  onAiAction,
  onAddComment,
}: ClinicalBlockMenuProps) {
  const menuRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!isOpen) return;

    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };

    const handleClickOutside = (e: MouseEvent | TouchEvent) => {
      if (menuRef.current && !menuRef.current.contains(e.target as Node)) {
        onClose();
      }
    };

    const handleWindowScroll = (e: Event) => {
      if (menuRef.current && !menuRef.current.contains(e.target as Node)) {
        onClose();
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    document.addEventListener('mousedown', handleClickOutside);
    document.addEventListener('touchstart', handleClickOutside);
    window.addEventListener('scroll', handleWindowScroll, { passive: true, capture: true });

    return () => {
      window.removeEventListener('keydown', handleKeyDown);
      document.removeEventListener('mousedown', handleClickOutside);
      document.removeEventListener('touchstart', handleClickOutside);
      window.removeEventListener('scroll', handleWindowScroll, { capture: true });
    };
  }, [isOpen, onClose]);

  if (!isOpen) return null;

  return (
    <div
      ref={menuRef}
      onWheel={(e) => e.stopPropagation()}
      onTouchMove={(e) => e.stopPropagation()}
      onPointerDown={(e) => e.stopPropagation()}
      className="absolute left-12 -top-2 z-50 w-60 max-h-[min(360px,75vh)] overflow-y-auto overscroll-contain rounded-xl border border-border bg-card/98 backdrop-blur-md text-card-foreground shadow-2xl p-1 text-xs animate-in fade-in zoom-in-95 duration-100 select-none scrollbar-thin"
    >
        <div className="px-2 py-1 text-[10px] font-bold uppercase tracking-wider text-muted-foreground border-b border-border/50 mb-1">
          Turn Into
        </div>

        <div className="space-y-0.5">
          <button
            type="button"
            onClick={() => {
              onTurnInto('paragraph');
              onClose();
            }}
            className="w-full text-left px-2 py-1.5 rounded flex items-center gap-2 hover:bg-muted transition-colors cursor-pointer"
          >
            <Type className="w-3.5 h-3.5 text-muted-foreground" />
            <span>Text Paragraph</span>
          </button>

          <button
            type="button"
            onClick={() => {
              onTurnInto('heading', { level: 2 });
              onClose();
            }}
            className="w-full text-left px-2 py-1.5 rounded flex items-center gap-2 hover:bg-muted transition-colors cursor-pointer"
          >
            <Heading2 className="w-3.5 h-3.5 text-primary" />
            <span>Heading 2 (Organ Title)</span>
          </button>

          <button
            type="button"
            onClick={() => {
              onTurnInto('heading', { level: 3 });
              onClose();
            }}
            className="w-full text-left px-2 py-1.5 rounded flex items-center gap-2 hover:bg-muted transition-colors cursor-pointer"
          >
            <Heading3 className="w-3.5 h-3.5 text-secondary" />
            <span>Heading 3 (Sub-section)</span>
          </button>

          <button
            type="button"
            onClick={() => {
              onTurnInto('bulletList');
              onClose();
            }}
            className="w-full text-left px-2 py-1.5 rounded flex items-center gap-2 hover:bg-muted transition-colors cursor-pointer"
          >
            <List className="w-3.5 h-3.5 text-muted-foreground" />
            <span>Bullet List</span>
          </button>

          <button
            type="button"
            onClick={() => {
              onTurnInto('orderedList');
              onClose();
            }}
            className="w-full text-left px-2 py-1.5 rounded flex items-center gap-2 hover:bg-muted transition-colors cursor-pointer"
          >
            <ListOrdered className="w-3.5 h-3.5 text-amber-500" />
            <span>Numbered List</span>
          </button>

          <button
            type="button"
            onClick={() => {
              onTurnInto('callout', { calloutType: 'critical' });
              onClose();
            }}
            className="w-full text-left px-2 py-1.5 rounded flex items-center gap-2 hover:bg-rose-500/10 text-rose-600 dark:text-rose-400 transition-colors cursor-pointer"
          >
            <AlertTriangle className="w-3.5 h-3.5" />
            <span>Critical Finding Box</span>
          </button>

          <button
            type="button"
            onClick={() => {
              onTurnInto('callout', { calloutType: 'recommendation' });
              onClose();
            }}
            className="w-full text-left px-2 py-1.5 rounded flex items-center gap-2 hover:bg-secondary/10 text-secondary transition-colors cursor-pointer"
          >
            <Lightbulb className="w-3.5 h-3.5" />
            <span>Recommendation Box</span>
          </button>

          <button
            type="button"
            onClick={() => {
              onTurnInto('callout', { calloutType: 'info' });
              onClose();
            }}
            className="w-full text-left px-2 py-1.5 rounded flex items-center gap-2 hover:bg-primary/10 text-primary transition-colors cursor-pointer"
          >
            <Info className="w-3.5 h-3.5" />
            <span>Clinical Note Box</span>
          </button>
        </div>

        <div className="border-t border-border/50 my-1" />

        <div className="px-2 py-1 text-[10px] font-bold uppercase tracking-wider text-muted-foreground mb-0.5">
          Actions
        </div>

        <div className="space-y-0.5">
          {onAddComment && (
            <button
              type="button"
              onClick={() => {
                onAddComment();
                onClose();
              }}
              className="w-full text-left px-2 py-1.5 rounded flex items-center gap-2 hover:bg-amber-500/15 text-amber-600 dark:text-amber-400 transition-colors cursor-pointer"
            >
              <MessageSquare className="w-3.5 h-3.5" />
              <span>Add Discussion Note</span>
            </button>
          )}

          <button
            type="button"
            onClick={() => {
              onAiAction();
              onClose();
            }}
            className="w-full text-left px-2 py-1.5 rounded flex items-center gap-2 hover:bg-primary/15 text-primary transition-colors cursor-pointer"
          >
            <Sparkles className="w-3.5 h-3.5" />
            <span>AI Polish This Block</span>
          </button>

          <button
            type="button"
            onClick={() => {
              onMoveUp();
              onClose();
            }}
            className="w-full text-left px-2 py-1.5 rounded flex items-center gap-2 hover:bg-muted transition-colors cursor-pointer"
          >
            <ArrowUp className="w-3.5 h-3.5 text-muted-foreground" />
            <span>Move Up</span>
          </button>

          <button
            type="button"
            onClick={() => {
              onMoveDown();
              onClose();
            }}
            className="w-full text-left px-2 py-1.5 rounded flex items-center gap-2 hover:bg-muted transition-colors cursor-pointer"
          >
            <ArrowDown className="w-3.5 h-3.5 text-muted-foreground" />
            <span>Move Down</span>
          </button>

          <button
            type="button"
            onClick={() => {
              onDuplicate();
              onClose();
            }}
            className="w-full text-left px-2 py-1.5 rounded flex items-center gap-2 hover:bg-muted transition-colors cursor-pointer"
          >
            <Copy className="w-3.5 h-3.5 text-muted-foreground" />
            <span>Duplicate</span>
          </button>

          <button
            type="button"
            onClick={() => {
              onDelete();
              onClose();
            }}
            className="w-full text-left px-2 py-1.5 rounded flex items-center gap-2 hover:bg-rose-500/10 text-rose-500 transition-colors cursor-pointer"
          >
            <Trash2 className="w-3.5 h-3.5" />
            <span>Delete Block</span>
          </button>
        </div>
      </div>
  );
}
