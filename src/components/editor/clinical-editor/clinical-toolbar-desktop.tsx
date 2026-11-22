'use client';

import React from 'react';
import { Editor } from '@tiptap/core';
import {
  Undo2,
  Redo2,
  Bold,
  Italic,
  Underline,
  Strikethrough,
  Subscript,
  Superscript,
  List,
  ListOrdered,
  Sparkles,
  RemoveFormatting,
} from 'lucide-react';
import { ClinicalToolbarBlockDropdown } from './clinical-toolbar-block-dropdown';

interface ClinicalToolbarDesktopProps {
  editor: Editor | null;
  onAiAction?: (action: string) => void;
  isAiLoading?: boolean;
  compact?: boolean;
}

export function ClinicalToolbarDesktop({
  editor,
  onAiAction,
  isAiLoading = false,
  compact = false,
}: ClinicalToolbarDesktopProps) {
  if (!editor) return null;

  const btnClass = (isActive: boolean) =>
    `p-1.5 rounded transition-colors text-xs flex items-center justify-center cursor-pointer ${
      isActive
        ? 'bg-primary/15 text-primary border border-primary/30'
        : 'text-muted-foreground hover:text-foreground hover:bg-muted/60'
    }`;

  return (
    <div className="sticky top-0 z-20 flex items-center flex-wrap gap-1 px-2.5 py-1.5 bg-card/95 backdrop-blur-xs border-b border-border text-xs select-none shadow-2xs">
      {/* Block Type Selector Dropdown */}
      <ClinicalToolbarBlockDropdown editor={editor} />

      {/* History Group */}
      <div className="flex items-center gap-0.5 border-r border-border/60 pr-1.5 mr-0.5">
        <button
          type="button"
          onMouseDown={(e) => e.preventDefault()}
          onClick={() => editor.chain().focus().undo().run()}
          disabled={!editor.can().undo()}
          className="p-1.5 rounded text-muted-foreground hover:text-foreground hover:bg-muted/60 disabled:opacity-30 disabled:cursor-not-allowed cursor-pointer"
          title="Undo (Ctrl+Z)"
        >
          <Undo2 className="w-3.5 h-3.5" />
        </button>
        <button
          type="button"
          onMouseDown={(e) => e.preventDefault()}
          onClick={() => editor.chain().focus().redo().run()}
          disabled={!editor.can().redo()}
          className="p-1.5 rounded text-muted-foreground hover:text-foreground hover:bg-muted/60 disabled:opacity-30 disabled:cursor-not-allowed cursor-pointer"
          title="Redo (Ctrl+Y)"
        >
          <Redo2 className="w-3.5 h-3.5" />
        </button>
      </div>

      {/* Typography Formatting */}
      <div className="flex items-center gap-0.5 border-r border-border/60 pr-1.5 mr-0.5">
        <button
          type="button"
          onMouseDown={(e) => e.preventDefault()}
          onClick={() => editor.chain().focus().toggleBold().run()}
          className={btnClass(editor.isActive('bold'))}
          title="Bold (Ctrl+B)"
        >
          <Bold className="w-3.5 h-3.5" />
        </button>
        <button
          type="button"
          onMouseDown={(e) => e.preventDefault()}
          onClick={() => editor.chain().focus().toggleItalic().run()}
          className={btnClass(editor.isActive('italic'))}
          title="Italic (Ctrl+I)"
        >
          <Italic className="w-3.5 h-3.5" />
        </button>
        <button
          type="button"
          onMouseDown={(e) => e.preventDefault()}
          onClick={() => editor.chain().focus().toggleUnderline().run()}
          className={btnClass(editor.isActive('underline'))}
          title="Underline (Ctrl+U)"
        >
          <Underline className="w-3.5 h-3.5" />
        </button>
        {!compact && (
          <>
            <button
              type="button"
              onMouseDown={(e) => e.preventDefault()}
              onClick={() => editor.chain().focus().toggleStrike().run()}
              className={btnClass(editor.isActive('strike'))}
              title="Strikethrough"
            >
              <Strikethrough className="w-3.5 h-3.5" />
            </button>
            <button
              type="button"
              onMouseDown={(e) => e.preventDefault()}
              onClick={() => editor.chain().focus().toggleSubscript().run()}
              className={btnClass(editor.isActive('subscript'))}
              title="Subscript (e.g. T1, T2)"
            >
              <Subscript className="w-3.5 h-3.5" />
            </button>
            <button
              type="button"
              onMouseDown={(e) => e.preventDefault()}
              onClick={() => editor.chain().focus().toggleSuperscript().run()}
              className={btnClass(editor.isActive('superscript'))}
              title="Superscript (e.g. cm³, mm²)"
            >
              <Superscript className="w-3.5 h-3.5" />
            </button>
          </>
        )}
      </div>

      {/* Lists Group */}
      <div className="flex items-center gap-0.5 border-r border-border/60 pr-1.5 mr-0.5">
        <button
          type="button"
          onMouseDown={(e) => e.preventDefault()}
          onClick={() => editor.chain().focus().toggleOrderedList().run()}
          className={btnClass(editor.isActive('orderedList'))}
          title="Numbered List"
        >
          <ListOrdered className="w-3.5 h-3.5" />
        </button>
        <button
          type="button"
          onMouseDown={(e) => e.preventDefault()}
          onClick={() => editor.chain().focus().toggleBulletList().run()}
          className={btnClass(editor.isActive('bulletList'))}
          title="Bullet List"
        >
          <List className="w-3.5 h-3.5" />
        </button>
      </div>

      {/* Clear Formatting */}
      <button
        type="button"
        onMouseDown={(e) => e.preventDefault()}
        onClick={() => editor.chain().focus().unsetAllMarks().clearNodes().run()}
        className="p-1.5 rounded text-muted-foreground hover:text-foreground hover:bg-muted/60 cursor-pointer"
        title="Clear Formatting"
      >
        <RemoveFormatting className="w-3.5 h-3.5" />
      </button>

      {/* AI Actions Spacer */}
      <div className="ml-auto flex items-center gap-1.5">
        <button
          type="button"
          onMouseDown={(e) => e.preventDefault()}
          onClick={() => onAiAction?.('standardize')}
          disabled={isAiLoading}
          className="p-1.5 rounded bg-primary/10 text-primary hover:bg-primary/20 transition-colors cursor-pointer disabled:opacity-50 flex items-center justify-center"
          title="Quick polish & standardize phrasing (AI)"
        >
          <Sparkles className={`w-3.5 h-3.5 ${isAiLoading ? 'animate-spin' : ''}`} />
        </button>
      </div>
    </div>
  );
}
