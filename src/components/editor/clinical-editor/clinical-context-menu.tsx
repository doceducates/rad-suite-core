'use client';

import React, { useEffect, useRef, useState } from 'react';
import { Editor } from '@tiptap/core';
import {
  Sparkles,
  MessageSquare,
  Type,
  Heading2,
  Heading3,
  List,
  AlertTriangle,
  Lightbulb,
  Copy,
  ClipboardCheck,
  Trash2,
  HelpCircle,
  CheckCircle2,
  Scale,
  AlignLeft,
} from 'lucide-react';
import {
  getTopLevelBlock,
  turnBlockInto,
  duplicateBlock,
  deleteBlock,
} from './clinical-block-helpers';
import { htmlToClinicalText, stripClinicalCommentMarks } from '@/lib/clinical-format';
import { notify } from '@/services/notification.service';

export interface ClinicalContextMenuProps {
  editor: Editor | null;
  isOpen: boolean;
  coords: { x: number; y: number } | null;
  targetPos: number;
  selectedText: string;
  onClose: () => void;
  onAddComment: (text: string) => void;
  onAiPrompt: (prompt: string, text: string) => void;
}

export function ClinicalContextMenu({
  editor,
  isOpen,
  coords,
  targetPos,
  selectedText,
  onClose,
  onAddComment,
  onAiPrompt,
}: ClinicalContextMenuProps) {
  const menuRef = useRef<HTMLDivElement>(null);
  const [viewportDims, setViewportDims] = useState({ width: 1200, height: 800 });

  useEffect(() => {
    if (typeof window !== 'undefined') {
      const updateDims = () => setViewportDims({ width: window.innerWidth, height: window.innerHeight });
      updateDims();
      window.addEventListener('resize', updateDims);
      return () => window.removeEventListener('resize', updateDims);
    }
  }, []);

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
      // Gracefully dismiss context menu on scroll without blocking wheel/touch scroll
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

  if (!isOpen || !coords || !editor) return null;

  const blockInfo = getTopLevelBlock(editor, targetPos);
  const targetText = selectedText.trim() || blockInfo?.node?.textContent?.trim() || '';

  const handleCopyCleanHmis = async () => {
    if (!targetText) return;
    const clean = htmlToClinicalText(stripClinicalCommentMarks(targetText));
    try {
      await navigator.clipboard.writeText(clean);
      notify.success('Clean clinical text copied for HMIS');
    } catch {
      notify.error('Failed to copy to clipboard');
    }
    onClose();
  };

  const handleCopyRaw = async () => {
    if (!targetText) return;
    try {
      await navigator.clipboard.writeText(targetText);
      notify.info('Copied to clipboard');
    } catch {}
    onClose();
  };

  const menuWidth = 240;
  const maxMenuHeight = Math.min(480, viewportDims.height - 32);
  const safeLeft = Math.max(12, Math.min(coords.x, viewportDims.width - menuWidth - 16));
  const safeTop = Math.max(12, Math.min(coords.y, viewportDims.height - maxMenuHeight - 16));

  const menuStyle: React.CSSProperties = {
    top: `${safeTop}px`,
    left: `${safeLeft}px`,
    maxHeight: `${maxMenuHeight}px`,
  };

  return (
    <div
      ref={menuRef}
      style={menuStyle}
      className="fixed z-50 w-60 rounded-xl border border-border bg-card/95 backdrop-blur-md text-card-foreground shadow-2xl p-1 text-xs select-none animate-in fade-in zoom-in-95 duration-75 flex flex-col overflow-y-auto overscroll-contain"
    >
        {/* Context Header */}
        <div className="px-2.5 py-1.5 text-[10px] font-semibold text-muted-foreground border-b border-border/50 truncate flex items-center justify-between shrink-0">
          <span>{selectedText ? 'Selected Text' : blockInfo?.node?.type?.name || 'Block'}</span>
          <span className="text-[9px] opacity-70">Esc to close</span>
        </div>

        {/* Primary Action: Add Discussion Note */}
        <div className="p-1 space-y-0.5 shrink-0">
          <button
            type="button"
            onClick={() => { onAddComment(targetText); onClose(); }}
            className="w-full text-left px-2 py-1.5 rounded-lg flex items-center gap-2 hover:bg-amber-500/15 text-amber-600 dark:text-amber-400 font-medium transition-colors cursor-pointer"
          >
            <MessageSquare className="w-3.5 h-3.5" />
            <span>Add Discussion Note</span>
          </button>
        </div>

        {/* Skills & AI Actions */}
        <div className="px-2 py-0.5 text-[9px] font-bold uppercase tracking-wider text-muted-foreground border-t border-border/50 pt-1 shrink-0">
          Skills & AI
        </div>
        <div className="p-1 space-y-0.5 shrink-0">
          <button
            type="button"
            onClick={() => { onAiPrompt('Explain this finding, clinical significance, and recommended follow-up', targetText); onClose(); }}
            className="w-full text-left px-2 py-1.5 rounded-lg flex items-center gap-2 hover:bg-primary/10 text-primary font-medium cursor-pointer transition-colors"
          >
            <HelpCircle className="w-3.5 h-3.5" />
            <span>Ask AI About This Block</span>
          </button>

          <button
            type="button"
            onClick={() => { onAiPrompt('Improve writing and standardize radiological terminology', targetText); onClose(); }}
            className="w-full text-left px-2 py-1 rounded-lg flex items-center gap-2 hover:bg-muted text-foreground cursor-pointer transition-colors"
          >
            <Sparkles className="w-3.5 h-3.5 text-primary" />
            <span>Improve Writing & Polish</span>
          </button>

          <button
            type="button"
            onClick={() => { onAiPrompt('Proofread findings and verify anatomical laterality consistency', targetText); onClose(); }}
            className="w-full text-left px-2 py-1 rounded-lg flex items-center gap-2 hover:bg-muted text-foreground cursor-pointer transition-colors"
          >
            <CheckCircle2 className="w-3.5 h-3.5 text-emerald-500" />
            <span>Proofread & Check Laterality</span>
          </button>

          <button
            type="button"
            onClick={() => { onAiPrompt('Provide a ranked differential diagnosis (DDx) with key discriminating features', targetText); onClose(); }}
            className="w-full text-left px-2 py-1 rounded-lg flex items-center gap-2 hover:bg-muted text-foreground cursor-pointer transition-colors"
          >
            <Scale className="w-3.5 h-3.5 text-amber-500" />
            <span>Suggest Differential (DDx)</span>
          </button>

          <button
            type="button"
            onClick={() => { onAiPrompt('Reformat into standardized spinal levels or organ subheadings', targetText); onClose(); }}
            className="w-full text-left px-2 py-1 rounded-lg flex items-center gap-2 hover:bg-muted text-foreground cursor-pointer transition-colors"
          >
            <AlignLeft className="w-3.5 h-3.5 text-secondary" />
            <span>Reformat Level-Wise</span>
          </button>
        </div>

        {/* Turn Into Subgroup */}
        <div className="px-2 py-0.5 text-[9px] font-bold uppercase tracking-wider text-muted-foreground border-t border-border/50 pt-1 shrink-0">
          Turn into
        </div>
        <div className="p-1 space-y-0.5 shrink-0">
          <button
            type="button"
            onClick={() => { turnBlockInto(editor, targetPos, 'paragraph'); onClose(); }}
            className="w-full text-left px-2 py-1 rounded-lg flex items-center gap-2 hover:bg-muted text-muted-foreground hover:text-foreground cursor-pointer"
          >
            <Type className="w-3 h-3" />
            <span>Text Paragraph</span>
          </button>

          <button
            type="button"
            onClick={() => { turnBlockInto(editor, targetPos, 'heading', { level: 2 }); onClose(); }}
            className="w-full text-left px-2 py-1 rounded-lg flex items-center gap-2 hover:bg-muted text-primary cursor-pointer"
          >
            <Heading2 className="w-3 h-3" />
            <span>Heading 2 (Section)</span>
          </button>

          <button
            type="button"
            onClick={() => { turnBlockInto(editor, targetPos, 'heading', { level: 3 }); onClose(); }}
            className="w-full text-left px-2 py-1 rounded-lg flex items-center gap-2 hover:bg-muted text-secondary cursor-pointer"
          >
            <Heading3 className="w-3 h-3" />
            <span>Heading 3 (Sub-level)</span>
          </button>

          <button
            type="button"
            onClick={() => { turnBlockInto(editor, targetPos, 'bulletList'); onClose(); }}
            className="w-full text-left px-2 py-1 rounded-lg flex items-center gap-2 hover:bg-muted text-muted-foreground hover:text-foreground cursor-pointer"
          >
            <List className="w-3 h-3" />
            <span>Bullet List</span>
          </button>

          <button
            type="button"
            onClick={() => { turnBlockInto(editor, targetPos, 'callout', { calloutType: 'critical' }); onClose(); }}
            className="w-full text-left px-2 py-1 rounded-lg flex items-center gap-2 hover:bg-rose-500/10 text-rose-500 cursor-pointer"
          >
            <AlertTriangle className="w-3 h-3" />
            <span>Critical Finding Box</span>
          </button>

          <button
            type="button"
            onClick={() => { turnBlockInto(editor, targetPos, 'callout', { calloutType: 'recommendation' }); onClose(); }}
            className="w-full text-left px-2 py-1 rounded-lg flex items-center gap-2 hover:bg-secondary/10 text-secondary cursor-pointer"
          >
            <Lightbulb className="w-3 h-3" />
            <span>Recommendation Box</span>
          </button>
        </div>

        {/* Clipboard & Operations */}
        <div className="border-t border-border/50 p-1 space-y-0.5 shrink-0">
          <button
            type="button"
            onClick={handleCopyCleanHmis}
            className="w-full text-left px-2 py-1.5 rounded-lg flex items-center gap-2 hover:bg-muted text-foreground cursor-pointer font-medium"
          >
            <ClipboardCheck className="w-3.5 h-3.5 text-primary" />
            <span>Copy Clean for HMIS</span>
          </button>

          <button
            type="button"
            onClick={handleCopyRaw}
            className="w-full text-left px-2 py-1 rounded-lg flex items-center gap-2 hover:bg-muted text-muted-foreground hover:text-foreground cursor-pointer"
          >
            <Copy className="w-3 h-3" />
            <span>Copy Text</span>
          </button>

          <button
            type="button"
            onClick={() => { duplicateBlock(editor, targetPos); onClose(); }}
            className="w-full text-left px-2 py-1 rounded-lg flex items-center gap-2 hover:bg-muted text-muted-foreground hover:text-foreground cursor-pointer"
          >
            <Copy className="w-3 h-3 text-muted-foreground" />
            <span>Duplicate Block</span>
          </button>

          <button
            type="button"
            onClick={() => { deleteBlock(editor, targetPos); onClose(); }}
            className="w-full text-left px-2 py-1 rounded-lg flex items-center gap-2 hover:bg-rose-500/15 text-rose-500 cursor-pointer"
          >
            <Trash2 className="w-3 h-3" />
            <span>Delete Block</span>
          </button>
        </div>
      </div>
  );
}
