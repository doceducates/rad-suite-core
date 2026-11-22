'use client';

import { useEditor } from '@tiptap/react';
import StarterKit from '@tiptap/starter-kit';
import Underline from '@tiptap/extension-underline';
import Highlight from '@tiptap/extension-highlight';
import Subscript from '@tiptap/extension-subscript';
import Superscript from '@tiptap/extension-superscript';
import Placeholder from '@tiptap/extension-placeholder';
import { useState, useEffect, useRef, useCallback } from 'react';
import { ClinicalEditorProps, ActiveSuggestion, SlashMenuState } from './clinical-editor-types';
import { ClinicalCalloutExtension } from './clinical-callout-extension';
import { InlineDiffExtension } from './inline-diff-extension';
import { ClinicalCommentExtension } from './clinical-comment-mark';
import { ClinicalSearchReplace } from './clinical-search-replace';
import { ClinicalKeyboardNav } from './clinical-keyboard-nav';

export function useClinicalEditor({
  content,
  onChange,
  placeholder,
  minHeight = '140px',
  modality = 'CT',
  patientContext,
  activeSection = 'findings',
  readOnly = false,
}: ClinicalEditorProps) {
  const [activeSuggestion, setActiveSuggestion] = useState<ActiveSuggestion | null>(null);
  const [activeCommentId, setActiveCommentId] = useState<string | null>(null);
  const [slashState, setSlashState] = useState<SlashMenuState>({
    isOpen: false,
    query: '',
    pos: { from: 0, to: 0 },
    coords: null,
  });
  const [isAiLoading, setIsAiLoading] = useState(false);
  const [isFocused, setIsFocused] = useState(false);
  const blurTimerRef = useRef<NodeJS.Timeout | null>(null);
  const debounceTimerRef = useRef<NodeJS.Timeout | null>(null);
  const activeSuggestionRef = useRef<ActiveSuggestion | null>(null);
  activeSuggestionRef.current = activeSuggestion;
  const slashStateRef = useRef<SlashMenuState>(slashState);
  slashStateRef.current = slashState;
  const editorRef = useRef<any>(null);

  const dismissSuggestion = useCallback(() => {
    setActiveSuggestion(null);
    if (editorRef.current) {
      editorRef.current.commands.setAiDiffSuggestion(null);
    }
  }, []);

  const closeSlashMenu = useCallback(() => {
    setSlashState((prev) => ({ ...prev, isOpen: false }));
  }, []);

  const acceptSuggestion = useCallback(() => {
    const ed = editorRef.current;
    if (!ed || !activeSuggestionRef.current) return;
    const { text, pos } = activeSuggestionRef.current;
    ed.commands.setAiDiffSuggestion(null);
    ed.chain()
      .focus()
      .deleteRange({ from: pos.from, to: pos.to })
      .insertContent(text + ' ')
      .run();
    setActiveSuggestion(null);
  }, []);

  const checkSlashTrigger = useCallback((ed: any) => {
    if (readOnly) return;
    const { from, to } = ed.state.selection;
    if (from !== to) {
      if (slashStateRef.current.isOpen) {
        setSlashState((prev) => ({ ...prev, isOpen: false }));
      }
      return;
    }

    const $from = ed.state.selection.$from;
    const textBefore = $from.parent.textBetween(0, $from.parentOffset, '\n', '\0');

    // Match slash command or dot-phrase at start of line or after whitespace
    const slashMatch = textBefore.match(/(?:^|\s)[\/\.]([a-zA-Z0-9_-]*)$/);
    if (slashMatch) {
      const query = slashMatch[1] || '';
      const matchOffset = slashMatch.index! + (slashMatch[0].startsWith(' ') ? 1 : 0);
      const slashStart = $from.start() + matchOffset;

      let coords: { top: number; left: number } | null = null;
      try {
        const viewCoords = ed.view.coordsAtPos(from);
        if (viewCoords) {
          coords = {
            top: viewCoords.bottom + 6,
            left: Math.max(16, Math.min(viewCoords.left, (typeof window !== 'undefined' ? window.innerWidth : 800) - 340)),
          };
        }
      } catch {}

      setSlashState({
        isOpen: true,
        query,
        pos: { from: slashStart, to: from },
        coords,
      });
    } else {
      if (slashStateRef.current.isOpen) {
        setSlashState((prev) => ({ ...prev, isOpen: false }));
      }
    }
  }, [readOnly]);

  const openSlashMenuManual = useCallback(() => {
    if (!editorRef.current) return;
    const ed = editorRef.current;
    const { from } = ed.state.selection;
    let coords: { top: number; left: number } | null = null;
    try {
      const posCoords = ed.view.coordsAtPos(from);
      if (posCoords) {
        coords = {
          top: posCoords.bottom + 6,
          left: Math.max(16, Math.min(posCoords.left, (typeof window !== 'undefined' ? window.innerWidth : 800) - 340)),
        };
      }
    } catch {}
    setSlashState({
      isOpen: true,
      query: '',
      pos: { from, to: from },
      coords,
    });
  }, []);

  const requestAiCompletion = useCallback(async (ed: any) => {
    if (readOnly) return;
    const { from, to } = ed.state.selection;
    let draftText = '';
    let replaceFrom = from;

    if (from !== to) {
      draftText = ed.state.doc.textBetween(from, to, ' ');
      replaceFrom = from;
    } else {
      const $from = ed.state.selection.$from;
      const textBeforeCursor = $from.parent.textBetween(0, $from.parentOffset, '\n');
      draftText = textBeforeCursor;
      replaceFrom = from - textBeforeCursor.length;
    }
    
    if (!draftText.trim()) return;

    try {
      setIsAiLoading(true);
      const res = await fetch('/api/ai/suggest-report', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          draftText: draftText.trim(),
          modality: modality || patientContext?.modality || 'CT',
          clinicalHistory: patientContext?.clinicalHistory,
          templateId: patientContext?.templateId,
          patientAge: patientContext?.age,
          patientGender: patientContext?.gender,
          activeSection,
        }),
      });
      const data = await res.json();
      if (data.success && data.suggestion) {
        const newSuggestion: ActiveSuggestion = {
          text: data.suggestion,
          matchedOrgan: data.matchedOrgan,
          category: data.category || 'structured_finding',
          draftPrefix: draftText.trim(),
          pos: { from: replaceFrom, to: from },
        };
        setActiveSuggestion(newSuggestion);
        ed.commands.setAiDiffSuggestion(newSuggestion);
      }
    } catch {
      // Non-blocking
    } finally {
      setIsAiLoading(false);
    }
  }, [readOnly, modality, patientContext, activeSection]);

  const defaultPlaceholder = ({ node }: any) => {
    if (node.type.name === 'heading') return 'Heading...';
    if (placeholder) return placeholder;
    return "Press 'space' for AI, '/' for templates & commands...";
  };

  const editor = useEditor({
    immediatelyRender: false,
    editable: !readOnly,
    extensions: [
      StarterKit.configure({
        heading: { levels: [2, 3] },
      }),
      Underline,
      Highlight.configure({ multicolor: true }),
      Subscript,
      Superscript,
      Placeholder.configure({
        placeholder: defaultPlaceholder,
        emptyEditorClass: 'is-editor-empty',
        emptyNodeClass: 'is-empty',
      }),
      ClinicalCalloutExtension,
      ClinicalCommentExtension.configure({
        onCommentActivated: (id) => setActiveCommentId(id),
      }),
      ClinicalSearchReplace,
      InlineDiffExtension.configure({
        onAccept: () => acceptSuggestion(),
        onDismiss: () => dismissSuggestion(),
      }),
      ClinicalKeyboardNav.configure({
        isSlashOpen: () => slashStateRef.current.isOpen,
        hasActiveSuggestion: () => !!activeSuggestionRef.current,
        onAcceptSuggestion: () => acceptSuggestion(),
        onDismissSuggestion: () => dismissSuggestion(),
        onCloseSlash: () => closeSlashMenu(),
        onRequestAiCompletion: () => editorRef.current && requestAiCompletion(editorRef.current),
        readOnly,
      }),
    ],
    content: content || '',
    editorProps: {
      clipboardTextSerializer: (slice) => slice.content.textBetween(0, slice.content.size, '\n\n'),
      attributes: {
        class:
          'focus:outline-none p-3 pl-12 pr-14 text-xs leading-relaxed text-foreground prose prose-sm dark:prose-invert max-w-none select-text',
        style: `min-height: ${minHeight};`,
      },
    },
    onSelectionUpdate: ({ editor: ed }) => {
      checkSlashTrigger(ed);
    },
    onFocus: () => {
      if (blurTimerRef.current) clearTimeout(blurTimerRef.current);
      setIsFocused(true);
    },
    onBlur: () => {
      if (blurTimerRef.current) clearTimeout(blurTimerRef.current);
      blurTimerRef.current = setTimeout(() => {
        setIsFocused(false);
      }, 250);
    },
    onUpdate: ({ editor: ed }) => {
      const html = ed.getHTML();
      onChange(html);
      checkSlashTrigger(ed);

      if (activeSuggestionRef.current) {
        setActiveSuggestion(null);
        ed.commands.setAiDiffSuggestion(null);
      }

      if (readOnly) return;
      if (debounceTimerRef.current) clearTimeout(debounceTimerRef.current);

      debounceTimerRef.current = setTimeout(() => {
        const { from } = ed.state.selection;
        const currentLine = ed.state.doc.textBetween(
          Math.max(0, from - 120),
          from,
          '\n'
        );
        
        // Smart trigger: ending line with an anatomical colon plus space (e.g., 'gb: ')
        if (currentLine.match(/^[a-zA-Z\s]+:\s$/)) {
          requestAiCompletion(ed);
        }
      }, 300);
    },
  });

  editorRef.current = editor;

  useEffect(() => {
    if (editor && content !== editor.getHTML()) {
      if (editor.getText() === '' && content) {
        editor.commands.setContent(content);
      }
    }
  }, [content, editor]);

  return {
    editor,
    activeSuggestion,
    activeCommentId,
    setActiveCommentId,
    slashState,
    isAiLoading,
    isFocused,
    setIsFocused,
    acceptSuggestion,
    dismissSuggestion,
    closeSlashMenu,
    openSlashMenuManual,
    setIsAiLoading,
  };
}
