'use client';

import React, { useState, useEffect, useRef } from 'react';
import { Editor } from '@tiptap/core';
import {
  ChevronDown,
  Type,
  Heading2,
  Heading3,
  List,
  ListOrdered,
  AlertTriangle,
  Lightbulb,
} from 'lucide-react';

interface ClinicalToolbarBlockDropdownProps {
  editor: Editor;
}

export function ClinicalToolbarBlockDropdown({ editor }: ClinicalToolbarBlockDropdownProps) {
  const [open, setOpen] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!open) return;

    const handleClickOutside = (e: MouseEvent | TouchEvent) => {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        setOpen(false);
      }
    };

    const handleScroll = (e: Event) => {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        setOpen(false);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    document.addEventListener('touchstart', handleClickOutside);
    window.addEventListener('scroll', handleScroll, { passive: true, capture: true });

    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
      document.removeEventListener('touchstart', handleClickOutside);
      window.removeEventListener('scroll', handleScroll, { capture: true });
    };
  }, [open]);

  let currentBlockLabel = 'Paragraph';
  if (editor.isActive('heading', { level: 2 })) currentBlockLabel = 'Heading 2';
  else if (editor.isActive('heading', { level: 3 })) currentBlockLabel = 'Heading 3';
  else if (editor.isActive('bulletList')) currentBlockLabel = 'Bullet List';
  else if (editor.isActive('orderedList')) currentBlockLabel = 'Numbered List';
  else if (editor.isActive('callout', { type: 'critical' })) currentBlockLabel = 'Critical Box';
  else if (editor.isActive('callout', { type: 'recommendation' })) currentBlockLabel = 'Recommendation';

  return (
    <div ref={containerRef} className="relative border-r border-border/60 pr-1.5 mr-0.5">
      <button
        type="button"
        onMouseDown={(e) => e.preventDefault()}
        onClick={() => setOpen(!open)}
        className="h-6 px-2 rounded flex items-center gap-1.5 text-[11px] font-medium bg-muted/80 hover:bg-muted text-foreground border border-border/60 transition-colors cursor-pointer"
        title="Turn block into..."
      >
        <span className="truncate max-w-[90px]">{currentBlockLabel}</span>
        <ChevronDown className="w-3 h-3 text-muted-foreground shrink-0" />
      </button>

      {open && (
        <div className="absolute left-0 top-7 z-40 w-48 rounded-lg border border-border bg-card shadow-xl p-1 text-xs animate-in fade-in duration-75">
            <button
              type="button"
              onClick={() => {
                editor.chain().focus().clearNodes().setParagraph().run();
                setOpen(false);
              }}
              className="w-full text-left px-2 py-1.5 rounded flex items-center gap-2 hover:bg-muted transition-colors cursor-pointer"
            >
              <Type className="w-3.5 h-3.5 text-muted-foreground" />
              <span>Text Paragraph</span>
            </button>
            <button
              type="button"
              onClick={() => {
                editor.chain().focus().clearNodes().setHeading({ level: 2 }).run();
                setOpen(false);
              }}
              className="w-full text-left px-2 py-1.5 rounded flex items-center gap-2 hover:bg-muted transition-colors cursor-pointer"
            >
              <Heading2 className="w-3.5 h-3.5 text-primary" />
              <span>Heading 2 (Organ)</span>
            </button>
            <button
              type="button"
              onClick={() => {
                editor.chain().focus().clearNodes().setHeading({ level: 3 }).run();
                setOpen(false);
              }}
              className="w-full text-left px-2 py-1.5 rounded flex items-center gap-2 hover:bg-muted transition-colors cursor-pointer"
            >
              <Heading3 className="w-3.5 h-3.5 text-secondary" />
              <span>Heading 3 (Sub-section)</span>
            </button>
            <button
              type="button"
              onClick={() => {
                editor.chain().focus().clearNodes().toggleBulletList().run();
                setOpen(false);
              }}
              className="w-full text-left px-2 py-1.5 rounded flex items-center gap-2 hover:bg-muted transition-colors cursor-pointer"
            >
              <List className="w-3.5 h-3.5 text-muted-foreground" />
              <span>Bullet List</span>
            </button>
            <button
              type="button"
              onClick={() => {
                editor.chain().focus().clearNodes().toggleOrderedList().run();
                setOpen(false);
              }}
              className="w-full text-left px-2 py-1.5 rounded flex items-center gap-2 hover:bg-muted transition-colors cursor-pointer"
            >
              <ListOrdered className="w-3.5 h-3.5 text-amber-500" />
              <span>Numbered List</span>
            </button>
            <button
              type="button"
              onClick={() => {
                editor.chain().focus().clearNodes().toggleCallout({ type: 'critical' }).run();
                setOpen(false);
              }}
              className="w-full text-left px-2 py-1.5 rounded flex items-center gap-2 hover:bg-rose-500/10 text-rose-500 transition-colors cursor-pointer"
            >
              <AlertTriangle className="w-3.5 h-3.5" />
              <span>Critical Finding Box</span>
            </button>
            <button
              type="button"
              onClick={() => {
                editor.chain().focus().clearNodes().toggleCallout({ type: 'recommendation' }).run();
                setOpen(false);
              }}
              className="w-full text-left px-2 py-1.5 rounded flex items-center gap-2 hover:bg-secondary/10 text-secondary transition-colors cursor-pointer"
            >
              <Lightbulb className="w-3.5 h-3.5" />
              <span>Recommendation Box</span>
            </button>
          </div>
      )}
    </div>
  );
}
