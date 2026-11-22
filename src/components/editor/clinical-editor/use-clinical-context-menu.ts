'use client';

import React, { useState, useEffect, useCallback } from 'react';
import { Editor } from '@tiptap/core';

export interface ContextMenuState {
  isOpen: boolean;
  coords: { x: number; y: number } | null;
  targetPos: number;
  selectedText: string;
}

export interface EmptySpaceAiState {
  isOpen: boolean;
  pos: number;
  coords: { top: number; left: number } | null;
}

export function useClinicalContextMenu(
  editor: Editor | null,
  readOnly: boolean,
  onCustomAiPrompt?: (prompt: string, text: string) => Promise<void>
) {
  const [contextMenu, setContextMenu] = useState<ContextMenuState>({
    isOpen: false,
    coords: null,
    targetPos: 0,
    selectedText: '',
  });

  const [emptySpaceAi, setEmptySpaceAi] = useState<EmptySpaceAiState>({
    isOpen: false,
    pos: 0,
    coords: null,
  });

  const handleContextMenu = useCallback(
    (e: React.MouseEvent) => {
      if (readOnly || !editor) return;

      // Mobile Touch Safeguard: Long-press on touch screens triggers contextmenu.
      // Calling e.preventDefault() blocks the mobile OS's native text selection loupe & drag handles.
      // We skip the desktop context menu for touch gestures so native mobile selection functions cleanly.
      const nativeEvent = e.nativeEvent as any;
      const isTouch =
        nativeEvent?.pointerType === 'touch' ||
        (typeof window !== 'undefined' &&
          window.matchMedia?.('(pointer: coarse)').matches &&
          'ontouchstart' in window);

      if (isTouch) {
        return; // Allow native mobile text selection handles to appear
      }

      e.preventDefault();
      const { from, to } = editor.state.selection;
      const hasSelection = from !== to;
      const selectedText = hasSelection ? editor.state.doc.textBetween(from, to, ' ') : '';
      let targetPos = from;

      if (!hasSelection) {
        try {
          const posAtMouse = editor.view.posAtCoords({ left: e.clientX, top: e.clientY });
          if (posAtMouse) targetPos = posAtMouse.pos;
        } catch {}
      }

      setContextMenu({
        isOpen: true,
        coords: { x: e.clientX, y: e.clientY },
        targetPos,
        selectedText,
      });
    },
    [editor, readOnly]
  );

  const closeContextMenu = useCallback(() => {
    setContextMenu((prev) => ({ ...prev, isOpen: false }));
  }, []);

  const closeEmptySpaceAi = useCallback(() => {
    setEmptySpaceAi((prev) => ({ ...prev, isOpen: false }));
  }, []);

  useEffect(() => {
    const handleEmptySpaceEvent = (e: Event) => {
      if (readOnly || !editor) return;
      const detail = (e as CustomEvent).detail;
      const pos = detail?.pos || editor.state.selection.from;
      try {
        const coords = editor.view.coordsAtPos(pos);
        setEmptySpaceAi({
          isOpen: true,
          pos,
          coords: coords ? { top: coords.bottom + 6, left: coords.left } : null,
        });
      } catch {
        setEmptySpaceAi({ isOpen: true, pos, coords: null });
      }
    };

    window.addEventListener('clinical-empty-space-ai', handleEmptySpaceEvent);
    return () => window.removeEventListener('clinical-empty-space-ai', handleEmptySpaceEvent);
  }, [editor, readOnly]);

  const handleEmptySpaceSubmit = useCallback(
    async (prompt: string) => {
      if (!editor) return;
      await onCustomAiPrompt?.(prompt, '');
    },
    [editor, onCustomAiPrompt]
  );

  return {
    contextMenu,
    emptySpaceAi,
    handleContextMenu,
    closeContextMenu,
    closeEmptySpaceAi,
    handleEmptySpaceSubmit,
  };
}
