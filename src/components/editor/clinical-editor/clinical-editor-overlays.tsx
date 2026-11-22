'use client';

import React from 'react';
import { Editor } from '@tiptap/core';
import { ClinicalCommentCard } from './clinical-comment-card';
import { ClinicalSearchModal } from './clinical-search-modal';
import { ClinicalContextMenu } from './clinical-context-menu';
import { ClinicalEmptySpaceAi } from './clinical-empty-space-ai';
import { ClinicalSlashMenu } from './clinical-slash-menu';
import { ClinicalBlockGutterComments } from './clinical-block-gutter-comments';
import { ContextMenuState, EmptySpaceAiState } from './use-clinical-context-menu';
import { SlashMenuState } from './clinical-editor-types';
import { ClinicalCommentItem } from './clinical-comment-types';
import { notify } from '@/services/notification.service';

export interface ClinicalEditorOverlaysProps {
  editor: Editor | null;
  containerRef: React.RefObject<HTMLDivElement | null>;
  modality: string;
  isSearchOpen: boolean;
  onCloseSearch: () => void;
  contextMenu: ContextMenuState;
  onCloseContextMenu: () => void;
  onAddComment: (text: string) => void;
  onAddCommentForBlock: (pos: number, text: string) => void;
  onCustomAiPrompt: (prompt: string, text: string) => Promise<void>;
  emptySpaceAi: EmptySpaceAiState;
  onCloseEmptySpaceAi: () => void;
  onEmptySpaceSubmit: (prompt: string) => Promise<void>;
  activeCommentId: string | null;
  commentCoords: { top: number; left: number } | null;
  activeQuotedText: string;
  commentsMap: Record<string, ClinicalCommentItem>;
  setCommentsMap: React.Dispatch<React.SetStateAction<Record<string, ClinicalCommentItem>>>;
  setActiveCommentId: (id: string | null) => void;
  setCommentCoords: (coords: { top: number; left: number } | null) => void;
  setActiveQuotedText: (text: string) => void;
  slashState: SlashMenuState;
  closeSlashMenu: () => void;
  filteredSlashItems: any[];
  readOnly?: boolean;
}

export function ClinicalEditorOverlays({
  editor,
  containerRef,
  modality,
  isSearchOpen,
  onCloseSearch,
  contextMenu,
  onCloseContextMenu,
  onAddComment,
  onAddCommentForBlock,
  onCustomAiPrompt,
  emptySpaceAi,
  onCloseEmptySpaceAi,
  onEmptySpaceSubmit,
  activeCommentId,
  commentCoords,
  activeQuotedText,
  commentsMap,
  setCommentsMap,
  setActiveCommentId,
  setCommentCoords,
  setActiveQuotedText,
  slashState,
  closeSlashMenu,
  filteredSlashItems,
  readOnly = false,
}: ClinicalEditorOverlaysProps) {
  if (!editor) return null;

  const handleResolveComment = (id: string) => {
    editor.commands.unsetComment(id);
    setCommentsMap((prev) => {
      const next = { ...prev };
      delete next[id];
      return next;
    });
    setActiveCommentId(null);
    setCommentCoords(null);
    notify.info('Comment resolved.');
  };

  const handleDeleteComment = (id: string) => {
    editor.commands.unsetComment(id);
    setCommentsMap((prev) => {
      const next = { ...prev };
      delete next[id];
      return next;
    });
    setActiveCommentId(null);
    setCommentCoords(null);
  };

  return (
    <>
      <ClinicalBlockGutterComments
        editor={editor}
        containerRef={containerRef}
        commentsMap={commentsMap}
        readOnly={readOnly}
        onOpenComment={(id, coords, text) => {
          setActiveCommentId(id);
          setCommentCoords(coords);
          setActiveQuotedText(text);
        }}
        onAddCommentForBlock={onAddCommentForBlock}
        onResolveComment={handleResolveComment}
        onDeleteComment={handleDeleteComment}
      />

      <ClinicalSearchModal editor={editor} isOpen={isSearchOpen} onClose={onCloseSearch} />

      <ClinicalContextMenu
        editor={editor}
        isOpen={contextMenu.isOpen}
        coords={contextMenu.coords}
        targetPos={contextMenu.targetPos}
        selectedText={contextMenu.selectedText}
        onClose={onCloseContextMenu}
        onAddComment={onAddComment}
        onAiPrompt={onCustomAiPrompt}
      />

      <ClinicalEmptySpaceAi
        editor={editor}
        isOpen={emptySpaceAi.isOpen}
        pos={emptySpaceAi.pos}
        coords={emptySpaceAi.coords}
        modality={modality}
        onClose={onCloseEmptySpaceAi}
        onSubmit={onEmptySpaceSubmit}
      />

      {activeCommentId && commentCoords && (
        <ClinicalCommentCard
          commentId={activeCommentId}
          quotedText={activeQuotedText}
          existingComment={commentsMap[activeCommentId]}
          coords={commentCoords}
          onSave={(item) => {
            setCommentsMap((prev) => ({ ...prev, [item.id]: item }));
            setActiveCommentId(null);
            setCommentCoords(null);
            notify.success('Consultant discussion note saved.');
          }}
          onResolve={handleResolveComment}
          onDelete={handleDeleteComment}
          onClose={() => {
            setActiveCommentId(null);
            setCommentCoords(null);
          }}
          onApplyToReport={async (instruction, markedText) => {
            await onCustomAiPrompt(
              `You are an expert diagnostic radiologist. Apply this review comment instruction: "${instruction}". Rewrite the sentence/block with high-yield ACR/Punjab HMIS clinical accuracy.`,
              markedText || activeQuotedText || ''
            );
          }}
        />
      )}

      {slashState.isOpen && (
        <div
          className="fixed z-50 animate-in fade-in zoom-in-95 duration-75"
            style={
              slashState.coords
                ? {
                    top: `${Math.min(
                      slashState.coords.top,
                      (typeof window !== 'undefined' ? window.innerHeight : 800) - 340
                    )}px`,
                    left: `${slashState.coords.left}px`,
                  }
                : {
                    top: '25%',
                    left: '50%',
                    transform: 'translateX(-50%)',
                  }
            }
          >
            <ClinicalSlashMenu
              items={filteredSlashItems}
              command={(item) => {
                if (editor && slashState.pos.from <= slashState.pos.to) {
                  editor
                    .chain()
                    .focus()
                    .deleteRange({ from: slashState.pos.from, to: slashState.pos.to })
                    .run();
                }
                item.action(editor);
                closeSlashMenu();
              }}
              onClose={closeSlashMenu}
            />
          </div>
      )}
    </>
  );
}
