'use client';

import React, { useState } from 'react';
import { Editor } from '@tiptap/core';
import { Plus, GripVertical } from 'lucide-react';
import {
  insertBlockBelow,
  duplicateBlock,
  deleteBlock,
  moveBlockUp,
  moveBlockDown,
  turnBlockInto,
} from './clinical-block-helpers';
import { ClinicalBlockMenu } from './clinical-block-menu';
import { useBlockHandle } from './use-block-handle';

interface ClinicalBlockHandleProps {
  editor: Editor;
  containerRef: React.RefObject<HTMLDivElement | null>;
  onTriggerAiForBlock?: (text: string) => void;
  onOpenSlashMenu?: () => void;
  onAddCommentForBlock?: (text: string) => void;
  readOnly?: boolean;
}

export function ClinicalBlockHandle({
  editor,
  containerRef,
  onTriggerAiForBlock,
  onOpenSlashMenu,
  onAddCommentForBlock,
  readOnly = false,
}: ClinicalBlockHandleProps) {
  const [menuOpen, setMenuOpen] = useState(false);
  const {
    handleState,
    dropIndicator,
    handleRef,
    hideTimeoutRef,
    currentPos,
    handleDragStart,
    handleDragEnd,
  } = useBlockHandle(editor, containerRef, readOnly, menuOpen);

  if (readOnly) return null;

  const handleAiAction = () => {
    const node = editor.state.doc.nodeAt(currentPos);
    const text = node?.textContent || '';
    if (text.trim() && onTriggerAiForBlock) {
      onTriggerAiForBlock(text.trim());
    }
  };

  const handleAddCommentAction = () => {
    const node = editor.state.doc.nodeAt(currentPos);
    const text = node?.textContent || '';
    if (onAddCommentForBlock) {
      onAddCommentForBlock(text.trim());
    }
  };

  const handlePlusClick = () => {
    insertBlockBelow(editor, currentPos);
    onOpenSlashMenu?.();
  };

  return (
    <>
      {dropIndicator && (
        <div
          className="absolute left-6 right-2 h-0.5 bg-primary rounded-full shadow-xs z-40 pointer-events-none transition-all duration-75"
          style={{ top: `${dropIndicator.top}px` }}
        />
      )}

      <div
        ref={handleRef}
        onMouseEnter={() => {
          if (hideTimeoutRef.current) clearTimeout(hideTimeoutRef.current);
        }}
        className={`absolute left-1.5 z-30 flex items-center gap-0.5 select-none transition-opacity duration-150 ${
          handleState.visible || menuOpen ? 'opacity-100 pointer-events-auto' : 'opacity-0 pointer-events-none'
        }`}
        style={{ top: `${handleState.top}px` }}
      >
        {/* Plus button to add block below and open block picker */}
        <button
          type="button"
          onClick={handlePlusClick}
          title="Click to add a block below"
          className="w-5 h-5 rounded hover:bg-muted text-muted-foreground hover:text-foreground flex items-center justify-center cursor-pointer transition-colors"
        >
          <Plus className="w-3.5 h-3.5" />
        </button>

        {/* Grip handle: Drag to move, or click for block menu */}
        <button
          type="button"
          draggable={true}
          onDragStart={(e) => {
            setMenuOpen(false);
            handleDragStart(e);
          }}
          onDragEnd={handleDragEnd}
          onClick={() => setMenuOpen(!menuOpen)}
          title="Drag to move, click to open block menu"
          className={`w-5 h-5 rounded hover:bg-muted flex items-center justify-center cursor-grab active:cursor-grabbing transition-colors ${
            menuOpen ? 'bg-primary/20 text-primary' : 'text-muted-foreground hover:text-foreground'
          }`}
        >
          <GripVertical className="w-3.5 h-3.5" />
        </button>

        <ClinicalBlockMenu
          isOpen={menuOpen}
          onClose={() => setMenuOpen(false)}
          onTurnInto={(type, attrs) => turnBlockInto(editor, currentPos, type, attrs)}
          onMoveUp={() => moveBlockUp(editor, currentPos)}
          onMoveDown={() => moveBlockDown(editor, currentPos)}
          onDuplicate={() => duplicateBlock(editor, currentPos)}
          onDelete={() => deleteBlock(editor, currentPos)}
          onAiAction={handleAiAction}
          onAddComment={handleAddCommentAction}
        />
      </div>
    </>
  );
}
