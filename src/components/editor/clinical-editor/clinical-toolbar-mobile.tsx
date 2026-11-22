'use client';

import React from 'react';
import { Editor } from '@tiptap/core';
import {
  Undo2,
  Redo2,
  Bold,
  Italic,
  ListOrdered,
  Sparkles,
  Command,
  AlertTriangle,
} from 'lucide-react';

interface ClinicalToolbarMobileProps {
  editor: Editor | null;
  onOpenSlashSheet: () => void;
  onTriggerAiSuggestion: () => void;
  isAiLoading?: boolean;
}

export function ClinicalToolbarMobile({
  editor,
  onOpenSlashSheet,
  onTriggerAiSuggestion,
  isAiLoading = false,
}: ClinicalToolbarMobileProps) {
  if (!editor) return null;

  return (
    <div className="sticky bottom-0 inset-x-0 bg-background/95 backdrop-blur-md border-t border-border px-2 py-1.5 flex items-center justify-between z-40 select-none shadow-lg sm:hidden">
      {/* Undo & Redo */}
      <div className="flex items-center gap-1">
        <button
          type="button"
          onClick={() => editor.chain().focus().undo().run()}
          disabled={!editor.can().undo()}
          className="w-9 h-9 rounded flex items-center justify-center text-muted-foreground hover:text-foreground active:bg-muted disabled:opacity-30"
          title="Undo"
        >
          <Undo2 className="w-4 h-4" />
        </button>
        <button
          type="button"
          onClick={() => editor.chain().focus().redo().run()}
          disabled={!editor.can().redo()}
          className="w-9 h-9 rounded flex items-center justify-center text-muted-foreground hover:text-foreground active:bg-muted disabled:opacity-30"
          title="Redo"
        >
          <Redo2 className="w-4 h-4" />
        </button>
      </div>

      {/* Quick Formatting */}
      <div className="flex items-center gap-1">
        <button
          type="button"
          onClick={() => editor.chain().focus().toggleBold().run()}
          className={`w-9 h-9 rounded flex items-center justify-center text-xs font-bold ${
            editor.isActive('bold')
              ? 'bg-primary/20 text-primary'
              : 'text-muted-foreground active:bg-muted'
          }`}
          title="Bold"
        >
          <Bold className="w-4 h-4" />
        </button>
        <button
          type="button"
          onClick={() => editor.chain().focus().toggleItalic().run()}
          className={`w-9 h-9 rounded flex items-center justify-center text-xs ${
            editor.isActive('italic')
              ? 'bg-primary/20 text-primary'
              : 'text-muted-foreground active:bg-muted'
          }`}
          title="Italic"
        >
          <Italic className="w-4 h-4" />
        </button>
        <button
          type="button"
          onClick={() => editor.chain().focus().toggleOrderedList().run()}
          className={`w-9 h-9 rounded flex items-center justify-center text-xs ${
            editor.isActive('orderedList')
              ? 'bg-primary/20 text-primary'
              : 'text-muted-foreground active:bg-muted'
          }`}
          title="Numbered List"
        >
          <ListOrdered className="w-4 h-4" />
        </button>
        <button
          type="button"
          onClick={() => {
            if (editor.isActive('highlight', { color: '#fecaca' })) {
              editor.chain().focus().unsetHighlight().run();
            } else {
              editor.chain().focus().setHighlight({ color: '#fecaca' }).run();
            }
          }}
          className="w-9 h-9 rounded flex items-center justify-center text-rose-500 active:bg-rose-500/20"
          title="Critical Alert"
        >
          <AlertTriangle className="w-4 h-4" />
        </button>
      </div>

      {/* Quick Actions (Slash & AI) */}
      <div className="flex items-center gap-1">
        <button
          type="button"
          onClick={onOpenSlashSheet}
          className="h-9 px-2.5 rounded bg-muted/60 text-foreground flex items-center gap-1 text-xs font-medium active:bg-muted"
          title="Templates & Slash Commands"
        >
          <Command className="w-3.5 h-3.5" />
          <span>/</span>
        </button>
        <button
          type="button"
          onClick={onTriggerAiSuggestion}
          disabled={isAiLoading}
          className="h-9 px-3 rounded bg-primary/20 text-primary flex items-center gap-1.5 text-xs font-semibold active:bg-primary/30 disabled:opacity-50"
          title="AI Suggestion"
        >
          <Sparkles className="w-3.5 h-3.5 animate-pulse" />
          <span>{isAiLoading ? '...' : 'AI'}</span>
        </button>
      </div>
    </div>
  );
}
