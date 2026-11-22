'use client';

import React, { useState, useEffect, useRef } from 'react';
import { Editor } from '@tiptap/core';
import { Sparkles, ArrowRight, X, FileText, CheckCircle2 } from 'lucide-react';

interface ClinicalEmptySpaceAiProps {
  editor: Editor | null;
  isOpen: boolean;
  pos: number;
  coords: { top: number; left: number } | null;
  modality?: string;
  onClose: () => void;
  onSubmit: (prompt: string) => Promise<void>;
}

export function ClinicalEmptySpaceAi({
  editor,
  isOpen,
  pos,
  coords,
  modality = 'CT',
  onClose,
  onSubmit,
}: ClinicalEmptySpaceAiProps) {
  const [prompt, setPrompt] = useState('');
  const [loading, setLoading] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (isOpen) {
      setTimeout(() => inputRef.current?.focus(), 50);
    } else {
      setPrompt('');
      setLoading(false);
    }
  }, [isOpen]);

  useEffect(() => {
    if (!isOpen) return;

    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };

    const handleClickOutside = (e: MouseEvent | TouchEvent) => {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        onClose();
      }
    };

    const handleWindowScroll = (e: Event) => {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
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

  if (!isOpen || !editor) return null;

  const handleRun = async (textToRun: string) => {
    if (!textToRun.trim() || loading) return;
    setLoading(true);
    try {
      await onSubmit(textToRun.trim());
      onClose();
    } finally {
      setLoading(false);
    }
  };

  const isMr = modality.toUpperCase().includes('MR');

  const defaultTemplates = isMr
    ? [
        { label: 'Normal Lumbar Spine MRI', prompt: 'Draft a standard normal MRI Lumbar Spine report findings section' },
        { label: 'Normal Cervical Spine MRI', prompt: 'Draft a standard normal MRI Cervical Spine report findings section' },
        { label: 'Normal Brain MRI', prompt: 'Draft a standard normal MRI Brain Plain report findings section' },
      ]
    : [
        { label: 'Normal Brain Plain CT', prompt: 'Draft a standard normal CT Brain Plain report findings section' },
        { label: 'Normal Chest Plain CT', prompt: 'Draft a standard normal CT Chest report findings section' },
        { label: 'Normal Abdomen CT', prompt: 'Draft a standard normal CT Abdomen & Pelvis report findings section' },
      ];

  const style: React.CSSProperties = coords
    ? {
        top: `${Math.min(coords.top, (typeof window !== 'undefined' ? window.innerHeight : 800) - 220)}px`,
        left: `${Math.max(16, Math.min(coords.left, (typeof window !== 'undefined' ? window.innerWidth : 1200) - 400))}px`,
      }
    : { top: '30%', left: '50%', transform: 'translateX(-50%)' };

  return (
    <div
      ref={containerRef}
      style={style}
      className="fixed z-50 w-96 rounded-xl border border-border bg-card/95 backdrop-blur-md text-card-foreground shadow-2xl p-2.5 text-xs animate-in fade-in zoom-in-95 duration-100 flex flex-col gap-2"
    >
        <div className="flex items-center gap-1.5 border-b border-border/50 pb-2">
          <Sparkles className="w-4 h-4 text-primary shrink-0 animate-pulse" />
          <input
            ref={inputRef}
            type="text"
            value={prompt}
            onChange={(e) => setPrompt(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === 'Enter') {
                e.preventDefault();
                handleRun(prompt || defaultTemplates[0].prompt);
              } else if (e.key === 'Escape') {
                onClose();
              }
            }}
            placeholder="Ask AI to draft, synthesize, or template..."
            className="flex-1 bg-transparent border-none outline-none text-foreground placeholder:text-muted-foreground text-xs"
          />
          <button
            type="button"
            onClick={() => handleRun(prompt || defaultTemplates[0].prompt)}
            disabled={loading}
            className="p-1 rounded bg-primary text-on-primary hover:bg-primary/90 disabled:opacity-50 cursor-pointer"
          >
            <ArrowRight className="w-3.5 h-3.5" />
          </button>
          <button
            type="button"
            onClick={onClose}
            className="p-1 text-muted-foreground hover:text-foreground cursor-pointer"
          >
            <X className="w-3.5 h-3.5" />
          </button>
        </div>

        {/* Quick Clinical Templates */}
        <div className="flex flex-col gap-1">
          <div className="text-[10px] uppercase font-bold tracking-wider text-muted-foreground px-1">
            Quick Clinical Starters
          </div>
          {defaultTemplates.map((t) => (
            <button
              key={t.label}
              type="button"
              onClick={() => handleRun(t.prompt)}
              disabled={loading}
              className="w-full text-left px-2 py-1.5 rounded-lg hover:bg-muted text-foreground flex items-center justify-between transition-colors cursor-pointer"
            >
              <div className="flex items-center gap-2">
                <FileText className="w-3.5 h-3.5 text-primary" />
                <span className="font-medium">{t.label}</span>
              </div>
              <span className="text-[10px] text-muted-foreground">Draft</span>
            </button>
          ))}
          <button
            type="button"
            onClick={() => handleRun('Synthesize all recorded clinical findings into a cohesive diagnostic report')}
            disabled={loading}
            className="w-full text-left px-2 py-1.5 rounded-lg hover:bg-primary/10 text-primary flex items-center justify-between transition-colors cursor-pointer"
          >
            <div className="flex items-center gap-2">
              <CheckCircle2 className="w-3.5 h-3.5" />
              <span className="font-medium">Synthesize Findings Section</span>
            </div>
            <span className="text-[10px] opacity-75">AI Draft</span>
          </button>
        </div>
      </div>
  );
}
