'use client';

// Layer 4 (Presentation): Floating In-Editor Search & Replace Toolbar
import React, { useState, useEffect } from 'react';
import { Search, ChevronDown, ChevronUp, Replace, X } from 'lucide-react';
import { Editor } from '@tiptap/react';

interface ClinicalSearchModalProps {
  editor: Editor | null;
  isOpen: boolean;
  onClose: () => void;
}

export function ClinicalSearchModal({ editor, isOpen, onClose }: ClinicalSearchModalProps) {
  const [searchTerm, setSearchTerm] = useState('');
  const [replaceTerm, setReplaceTerm] = useState('');
  const [caseSensitive, setCaseSensitive] = useState(false);

  useEffect(() => {
    if (!editor || !isOpen) return;
    editor.commands.setSearchTerm(searchTerm);
  }, [editor, searchTerm, isOpen]);

  useEffect(() => {
    if (!editor || !isOpen) return;
    editor.commands.setReplaceTerm(replaceTerm);
  }, [editor, replaceTerm, isOpen]);

  useEffect(() => {
    if (!editor || !isOpen) return;
    editor.commands.setCaseSensitive(caseSensitive);
  }, [editor, caseSensitive, isOpen]);

  if (!isOpen || !editor) return null;

  const storage = (editor.storage as any)?.searchAndReplace;
  const matchCount = storage?.results?.length ?? 0;
  const currentIndex = matchCount > 0 ? (storage?.resultIndex ?? 0) + 1 : 0;

  const handleClose = () => {
    editor.commands.clearSearch?.();
    onClose();
  };

  return (
    <div className="absolute top-2 right-4 z-40 bg-card/95 backdrop-blur-md border border-border shadow-xl rounded-xl p-2 flex flex-col gap-1.5 text-xs animate-in fade-in slide-in-from-top-2 duration-150 w-80">
      {/* Search Input Row */}
      <div className="flex items-center gap-1">
        <Search className="w-3.5 h-3.5 text-muted-foreground shrink-0 ml-1" />
        <input
          type="text"
          autoFocus
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
          placeholder="Find in report..."
          className="flex-1 bg-muted/40 border border-border rounded-md px-2 py-1 text-xs focus:outline-none focus:border-primary text-foreground"
          onKeyDown={(e) => {
            if (e.key === 'Enter') {
              e.preventDefault();
              if (e.shiftKey) editor.commands.previousSearchResult();
              else editor.commands.nextSearchResult();
            } else if (e.key === 'Escape') {
              handleClose();
            }
          }}
        />

        <span className="text-[10px] text-muted-foreground font-mono shrink-0 px-1">
          {matchCount > 0 ? `${currentIndex}/${matchCount}` : '0/0'}
        </span>

        <button
          type="button"
          onClick={() => editor.commands.previousSearchResult()}
          disabled={matchCount === 0}
          className="p-1 rounded hover:bg-muted text-muted-foreground hover:text-foreground disabled:opacity-40"
          title="Previous Match (Shift+Enter)"
        >
          <ChevronUp className="w-3.5 h-3.5" />
        </button>
        <button
          type="button"
          onClick={() => editor.commands.nextSearchResult()}
          disabled={matchCount === 0}
          className="p-1 rounded hover:bg-muted text-muted-foreground hover:text-foreground disabled:opacity-40"
          title="Next Match (Enter)"
        >
          <ChevronDown className="w-3.5 h-3.5" />
        </button>

        <button
          type="button"
          onClick={handleClose}
          className="p-1 rounded hover:bg-muted text-muted-foreground hover:text-foreground"
          title="Close Search"
        >
          <X className="w-3.5 h-3.5" />
        </button>
      </div>

      {/* Replace Input Row */}
      <div className="flex items-center gap-1">
        <Replace className="w-3.5 h-3.5 text-muted-foreground shrink-0 ml-1" />
        <input
          type="text"
          value={replaceTerm}
          onChange={(e) => setReplaceTerm(e.target.value)}
          placeholder="Replace with..."
          className="flex-1 bg-muted/40 border border-border rounded-md px-2 py-1 text-xs focus:outline-none focus:border-primary text-foreground"
          onKeyDown={(e) => {
            if (e.key === 'Enter') {
              e.preventDefault();
              editor.commands.replace();
            }
          }}
        />

        <button
          type="button"
          onClick={() => editor.commands.replace()}
          disabled={matchCount === 0}
          className="px-2 py-1 rounded bg-muted hover:bg-muted/80 text-foreground text-[10px] font-semibold disabled:opacity-40"
        >
          Replace
        </button>
        <button
          type="button"
          onClick={() => editor.commands.replaceAll()}
          disabled={matchCount === 0}
          className="px-2 py-1 rounded bg-muted hover:bg-muted/80 text-foreground text-[10px] font-semibold disabled:opacity-40"
        >
          All
        </button>
      </div>
    </div>
  );
}
