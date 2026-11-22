'use client';

import React, { useMemo, useRef, useEffect } from 'react';
import { EditorContent } from '@tiptap/react';
import { ClinicalEditorProps } from './clinical-editor-types';
import { useClinicalEditor } from './use-clinical-editor';
import { useClinicalContextMenu } from './use-clinical-context-menu';
import { ClinicalToolbarDesktop } from './clinical-toolbar-desktop';
import { ClinicalToolbarMobile } from './clinical-toolbar-mobile';
import { ClinicalFloatingBar } from './clinical-floating-bar';
import { getClinicalSlashItems } from './clinical-slash-items';
import { ClinicalBlockHandle } from './clinical-block-handle';
import { ClinicalEditorOverlays } from './clinical-editor-overlays';
import { ClinicalCommentItem, computeSmartCommentCoords } from './clinical-comment-types';
import { getTopLevelBlock } from './clinical-block-helpers';

export function ClinicalEditor(props: ClinicalEditorProps) {
  const {
    viewMode = 'split',
    readOnly = false,
    className = '',
    frameless = false,
    modality = 'CT',
    onAiAction,
    studyId,
    activeSection = 'findings',
  } = props;

  const {
    editor,
    activeSuggestion,
    activeCommentId,
    setActiveCommentId,
    slashState,
    isAiLoading,
    isFocused,
    acceptSuggestion,
    dismissSuggestion,
    closeSlashMenu,
    openSlashMenuManual,
    setIsAiLoading,
  } = useClinicalEditor(props);

  const [isContainerFocused, setIsContainerFocused] = React.useState(false);
  const [isSearchOpen, setIsSearchOpen] = React.useState(false);
  const [commentCoords, setCommentCoords] = React.useState<{ top: number; left: number } | null>(null);
  const [activeQuotedText, setActiveQuotedText] = React.useState('');
  
  const storageKey = `radsuite_comments_${studyId || props.patientContext?.templateId || 'case'}_${activeSection}`;
  const [commentsMap, setCommentsMap] = React.useState<Record<string, ClinicalCommentItem>>(() => {
    if (typeof window === 'undefined') return {};
    try {
      const stored = localStorage.getItem(storageKey);
      return stored ? JSON.parse(stored) : {};
    } catch {
      return {};
    }
  });

  const updateCommentsMap: React.Dispatch<React.SetStateAction<Record<string, ClinicalCommentItem>>> = React.useCallback(
    (action) => {
      setCommentsMap((prev) => {
        const next = typeof action === 'function' ? action(prev) : action;
        if (typeof window !== 'undefined') {
          try {
            localStorage.setItem(storageKey, JSON.stringify(next));
          } catch {}
        }
        return next;
      });
    },
    [storageKey]
  );

  const showToolbar = !readOnly && (isFocused || isContainerFocused);
  const editorContainerRef = useRef<HTMLDivElement>(null);

  React.useEffect(() => {
    if (!activeCommentId || !editor) {
      setCommentCoords(null);
      return;
    }
    try {
      const domEl = editor.view.dom.querySelector(`span[data-comment-id="${activeCommentId}"]`);
      if (domEl) {
        const rect = domEl.getBoundingClientRect();
        setCommentCoords(computeSmartCommentCoords(editorContainerRef.current, rect.top));
        setActiveQuotedText(domEl.textContent || '');
      } else {
        const { from } = editor.state.selection;
        const coords = editor.view.coordsAtPos(from);
        setCommentCoords(computeSmartCommentCoords(editorContainerRef.current, coords ? coords.top : null));
      }
    } catch {
      setCommentCoords(null);
    }
  }, [activeCommentId, editor]);

  const handleAddComment = (selectedText: string) => {
    if (!editor) return;
    const commentId = `cmt_${Date.now()}`;
    editor.commands.setComment(commentId);
    setActiveQuotedText(selectedText);
    setActiveCommentId(commentId);
    try {
      const { from } = editor.state.selection;
      const coords = editor.view.coordsAtPos(from);
      setCommentCoords(computeSmartCommentCoords(editorContainerRef.current, coords ? coords.top : null));
    } catch {}
  };

  const handleAddCommentForBlock = (pos: number, text: string) => {
    if (!editor) return;
    const commentId = `cmt_${Date.now()}`;
    const block = getTopLevelBlock(editor, pos);
    if (block) {
      editor.chain().focus().setTextSelection({ from: block.start, to: block.end }).setComment(commentId).run();
    } else {
      editor.commands.setComment(commentId);
    }
    setActiveQuotedText(text.slice(0, 80));
    setActiveCommentId(commentId);
    try {
      const coords = editor.view.coordsAtPos(pos);
      setCommentCoords(computeSmartCommentCoords(editorContainerRef.current, coords ? coords.top : null));
    } catch {}
  };

  useEffect(() => {
    const handleTriggerCommentEvent = () => {
      if (!editor || readOnly) return;
      const { from, to } = editor.state.selection;
      if (from !== to) {
        const text = editor.state.doc.textBetween(from, to, ' ');
        handleAddComment(text.trim());
      } else {
        const block = getTopLevelBlock(editor, from);
        const text = block?.node?.textContent || '';
        handleAddCommentForBlock(from, text);
      }
    };

    window.addEventListener('clinical-trigger-comment', handleTriggerCommentEvent);
    return () => window.removeEventListener('clinical-trigger-comment', handleTriggerCommentEvent);
  }, [editor, readOnly]);

  const handleCustomAiPrompt = async (prompt: string, selectedText: string) => {
    if (!editor) return;
    setIsAiLoading(true);
    try {
      const res = await fetch('/api/ai/edit-block', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'custom',
          text: selectedText,
          modality,
          customPrompt: prompt,
        }),
      });
      const data = await res.json();
      if (data.success && data.result) {
        editor.chain().focus().insertContent(data.result).run();
      }
    } catch (err) {
      console.error('[ClinicalEditor Custom AI]', err);
    } finally {
      setIsAiLoading(false);
    }
  };

  const {
    contextMenu,
    emptySpaceAi,
    handleContextMenu,
    closeContextMenu,
    closeEmptySpaceAi,
    handleEmptySpaceSubmit,
  } = useClinicalContextMenu(editor, readOnly, handleCustomAiPrompt);

  const handleAiAction = async (action: string) => {
    if (!editor) return;
    onAiAction?.(action);
    const selectedText = editor.state.doc.textBetween(
      editor.state.selection.from,
      editor.state.selection.to,
      ' '
    );
    const fullText = editor.getText();
    const targetText = selectedText.trim() || fullText.trim();
    if (!targetText) return;

    setIsAiLoading(true);
    try {
      const res = await fetch('/api/ai/edit-block', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: action === 'impression' ? 'impression' : 'standardize',
          text: targetText,
          modality,
        }),
      });
      const data = await res.json();
      if (data.success && data.result) {
        if (selectedText.trim()) {
          editor.chain().focus().insertContent(data.result).run();
        } else {
          editor.chain().focus().setContent(data.result).run();
        }
      }
    } catch (err) {
      console.error('[ClinicalEditor AI Action]', err);
    } finally {
      setIsAiLoading(false);
    }
  };

  const slashItems = useMemo(() => {
    if (!editor) return [];
    return getClinicalSlashItems(editor, modality, handleAiAction);
  }, [editor, modality]);

  const filteredSlashItems = useMemo(() => {
    if (!slashState.query.trim()) return slashItems;
    const q = slashState.query.toLowerCase().trim();
    return slashItems.filter(
      (item) =>
        item.title.toLowerCase().includes(q) ||
        item.subtext.toLowerCase().includes(q) ||
        item.aliases?.some((a) => a.toLowerCase().includes(q)) ||
        item.group.toLowerCase().includes(q)
    );
  }, [slashItems, slashState.query]);

  const isCompact = viewMode === 'split' || viewMode === 'floating';

  if (!editor) {
    return (
      <div
        className="w-full rounded-lg border border-border bg-card/40 animate-pulse flex items-center justify-center text-xs text-muted-foreground"
        style={{ minHeight: props.minHeight || '140px' }}
      >
        Initializing Clinical Workstation Editor...
      </div>
    );
  }

  const editorContentNode = (
    <div
      ref={editorContainerRef}
      onContextMenu={handleContextMenu}
      className="relative flex-1 flex flex-col min-h-0 overflow-y-auto"
    >
      <ClinicalBlockHandle
        editor={editor}
        containerRef={editorContainerRef}
        onTriggerAiForBlock={(text) => handleCustomAiPrompt('Polish and refine this clinical block', text)}
        onOpenSlashMenu={openSlashMenuManual}
        onAddCommentForBlock={handleAddComment}
        readOnly={readOnly}
      />
      <EditorContent editor={editor} />
      <ClinicalFloatingBar
        editor={editor}
        onCustomAiPrompt={handleCustomAiPrompt}
        onAddComment={handleAddComment}
        onOpenSearch={() => setIsSearchOpen((prev) => !prev)}
      />
      <ClinicalEditorOverlays
        editor={editor}
        containerRef={editorContainerRef}
        modality={modality}
        isSearchOpen={isSearchOpen}
        onCloseSearch={() => setIsSearchOpen(false)}
        contextMenu={contextMenu}
        onCloseContextMenu={closeContextMenu}
        onAddComment={handleAddComment}
        onAddCommentForBlock={handleAddCommentForBlock}
        onCustomAiPrompt={handleCustomAiPrompt}
        emptySpaceAi={emptySpaceAi}
        onCloseEmptySpaceAi={closeEmptySpaceAi}
        onEmptySpaceSubmit={handleEmptySpaceSubmit}
        activeCommentId={activeCommentId}
        commentCoords={commentCoords}
        activeQuotedText={activeQuotedText}
        commentsMap={commentsMap}
        setCommentsMap={updateCommentsMap}
        setActiveCommentId={setActiveCommentId}
        setCommentCoords={setCommentCoords}
        setActiveQuotedText={setActiveQuotedText}
        slashState={slashState}
        closeSlashMenu={closeSlashMenu}
        filteredSlashItems={filteredSlashItems}
        readOnly={readOnly}
      />
    </div>
  );

  if (frameless) {
    return (
      <div className={`relative w-full flex flex-col ${className}`}>
        {editorContentNode}
        <ClinicalToolbarMobile
          editor={editor}
          onOpenSlashSheet={openSlashMenuManual}
          onTriggerAiSuggestion={() => handleAiAction('standardize')}
          isAiLoading={isAiLoading}
        />
      </div>
    );
  }

  return (
    <div
      onFocus={() => setIsContainerFocused(true)}
      onBlur={(e) => {
        if (!e.currentTarget.contains(e.relatedTarget as Node)) {
          setIsContainerFocused(false);
        }
      }}
      className={`relative rounded-lg border border-border bg-card text-card-foreground shadow-xs overflow-hidden flex flex-col focus-within:border-primary/50 transition-colors ${className}`}
    >
      {!readOnly && (
        <div
          className={`transition-all duration-200 ease-in-out overflow-hidden ${
            showToolbar
              ? 'max-h-16 opacity-100 border-b border-border'
              : 'max-h-0 opacity-0 border-b-0 pointer-events-none'
          }`}
        >
          <ClinicalToolbarDesktop
            editor={editor}
            onAiAction={handleAiAction}
            isAiLoading={isAiLoading}
            compact={isCompact}
          />
        </div>
      )}
      {editorContentNode}
      <ClinicalToolbarMobile
        editor={editor}
        onOpenSlashSheet={openSlashMenuManual}
        onTriggerAiSuggestion={() => handleAiAction('standardize')}
        isAiLoading={isAiLoading}
      />
    </div>
  );
}
