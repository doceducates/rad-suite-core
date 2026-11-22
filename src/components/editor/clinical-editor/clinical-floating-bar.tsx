'use client';

// Layer 4 (Presentation): TipTap Floating Selection Bubble Menu with Notion Skills & Comment Toolkit
import React, { useState } from 'react';
import { BubbleMenu, Editor } from '@tiptap/react';
import {
  Bold,
  Italic,
  Underline,
  Sparkles,
  AlertTriangle,
  ArrowRight,
  X,
  MessageSquare,
  Search,
  HelpCircle,
  CheckCircle2,
  Scale,
  AlignLeft,
  ChevronDown,
} from 'lucide-react';

interface ClinicalFloatingBarProps {
  editor: Editor | null;
  onCustomAiPrompt?: (prompt: string, selectedText: string) => Promise<void>;
  onAddComment?: (selectedText: string) => void;
  onOpenSearch?: () => void;
}

export function ClinicalFloatingBar({
  editor,
  onCustomAiPrompt,
  onAddComment,
  onOpenSearch,
}: ClinicalFloatingBarProps) {
  const [viewState, setViewState] = useState<'bar' | 'skills' | 'customPrompt'>('bar');
  const [customPrompt, setCustomPrompt] = useState('');
  const [loading, setLoading] = useState(false);

  if (!editor) return null;

  const handleApplyAi = async (promptText: string) => {
    const { from, to } = editor.state.selection;
    const selectedText = editor.state.doc.textBetween(from, to, ' ');
    if (!selectedText.trim()) return;

    setLoading(true);
    try {
      await onCustomAiPrompt?.(promptText, selectedText);
      setViewState('bar');
      setCustomPrompt('');
    } finally {
      setLoading(false);
    }
  };

  const handleTriggerComment = () => {
    const { from, to } = editor.state.selection;
    const selectedText = editor.state.doc.textBetween(from, to, ' ');
    onAddComment?.(selectedText.trim());
  };

  return (
    <BubbleMenu
      editor={editor}
      tippyOptions={{ duration: 150, placement: 'top-start' }}
      className="bg-card text-card-foreground border border-border shadow-2xl rounded-xl p-1 flex flex-col gap-1 z-50 animate-in fade-in zoom-in-95 duration-150 backdrop-blur-md max-w-sm"
    >
      {viewState === 'bar' && (
        <div className="flex items-center gap-0.5 text-xs">
          <button
            type="button"
            onClick={() => editor.chain().focus().toggleBold().run()}
            className={`p-1.5 rounded-lg hover:bg-muted ${
              editor.isActive('bold') ? 'bg-primary/20 text-primary' : 'text-muted-foreground'
            }`}
            title="Bold"
          >
            <Bold className="w-3.5 h-3.5" />
          </button>
          <button
            type="button"
            onClick={() => editor.chain().focus().toggleItalic().run()}
            className={`p-1.5 rounded-lg hover:bg-muted ${
              editor.isActive('italic') ? 'bg-primary/20 text-primary' : 'text-muted-foreground'
            }`}
            title="Italic"
          >
            <Italic className="w-3.5 h-3.5" />
          </button>
          <button
            type="button"
            onClick={() => editor.chain().focus().toggleUnderline().run()}
            className={`p-1.5 rounded-lg hover:bg-muted ${
              editor.isActive('underline') ? 'bg-primary/20 text-primary' : 'text-muted-foreground'
            }`}
            title="Underline"
          >
            <Underline className="w-3.5 h-3.5" />
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
            className="p-1.5 rounded-lg hover:bg-muted text-rose-500"
            title="Critical Alert"
          >
            <AlertTriangle className="w-3.5 h-3.5" />
          </button>

          <div className="h-4 w-px bg-border/60 mx-1" />

          {/* Add Consultant Comment */}
          <button
            type="button"
            onClick={handleTriggerComment}
            className="px-2 py-1 rounded-lg bg-amber-500/15 text-amber-500 hover:bg-amber-500/25 flex items-center gap-1 font-semibold text-[11px] cursor-pointer transition-colors"
            title="Add Consultant Discussion Note"
          >
            <MessageSquare className="w-3.5 h-3.5" />
            <span>Note</span>
          </button>

          {/* Notion AI Skills Trigger */}
          <button
            type="button"
            onClick={() => setViewState('skills')}
            className="px-2 py-1 rounded-lg bg-primary/15 text-primary hover:bg-primary/25 flex items-center gap-1 font-semibold text-[11px] cursor-pointer transition-colors"
            title="Open AI Skills (Improve, Proofread, Explain, DDx)"
          >
            <Sparkles className="w-3.5 h-3.5" />
            <span>Skills</span>
            <ChevronDown className="w-2.5 h-2.5 opacity-70" />
          </button>

          {/* Find */}
          {onOpenSearch && (
            <button
              type="button"
              onClick={onOpenSearch}
              className="p-1.5 rounded-lg hover:bg-muted text-muted-foreground hover:text-foreground"
              title="Search & Replace"
            >
              <Search className="w-3.5 h-3.5" />
            </button>
          )}
        </div>
      )}

      {viewState === 'skills' && (
        <div className="flex flex-col gap-0.5 p-1 w-64 text-xs">
          <div className="flex items-center justify-between px-2 py-1 text-[10px] uppercase font-bold text-muted-foreground border-b border-border/50 mb-0.5">
            <span>Skills</span>
            <button
              type="button"
              onClick={() => setViewState('bar')}
              className="hover:text-foreground cursor-pointer"
            >
              <X className="w-3 h-3" />
            </button>
          </div>

          <button
            type="button"
            onClick={() => handleApplyAi('Improve writing, clarity, and standardize radiological terminology')}
            disabled={loading}
            className="w-full text-left px-2 py-1.5 rounded-lg hover:bg-muted flex items-center gap-2 cursor-pointer transition-colors text-foreground"
          >
            <Sparkles className="w-3.5 h-3.5 text-primary" />
            <span>Improve writing</span>
          </button>

          <button
            type="button"
            onClick={() => handleApplyAi('Proofread findings for spelling, anatomical accuracy, and laterality')}
            disabled={loading}
            className="w-full text-left px-2 py-1.5 rounded-lg hover:bg-muted flex items-center gap-2 cursor-pointer transition-colors text-foreground"
          >
            <CheckCircle2 className="w-3.5 h-3.5 text-emerald-500" />
            <span>Proofread</span>
          </button>

          <button
            type="button"
            onClick={() => handleApplyAi('Explain this finding, anatomical significance, and clinical relevance')}
            disabled={loading}
            className="w-full text-left px-2 py-1.5 rounded-lg hover:bg-muted flex items-center gap-2 cursor-pointer transition-colors text-foreground"
          >
            <HelpCircle className="w-3.5 h-3.5 text-primary" />
            <span>Explain</span>
          </button>

          <button
            type="button"
            onClick={() => handleApplyAi('Reformat into standardized spinal levels or concise bullet points')}
            disabled={loading}
            className="w-full text-left px-2 py-1.5 rounded-lg hover:bg-muted flex items-center gap-2 cursor-pointer transition-colors text-foreground"
          >
            <AlignLeft className="w-3.5 h-3.5 text-secondary" />
            <span>Reformat</span>
          </button>

          <button
            type="button"
            onClick={() => handleApplyAi('Suggest a prioritized differential diagnosis (DDx) with discriminator features')}
            disabled={loading}
            className="w-full text-left px-2 py-1.5 rounded-lg hover:bg-muted flex items-center gap-2 cursor-pointer transition-colors text-amber-600 dark:text-amber-400 font-medium"
          >
            <Scale className="w-3.5 h-3.5" />
            <span>Suggest DDx</span>
          </button>

          <div className="border-t border-border/50 my-0.5" />

          <button
            type="button"
            onClick={() => setViewState('customPrompt')}
            className="w-full text-left px-2 py-1.5 rounded-lg bg-primary/10 hover:bg-primary/20 text-primary flex items-center gap-2 cursor-pointer font-medium"
          >
            <Sparkles className="w-3.5 h-3.5" />
            <span>Edit with AI...</span>
          </button>
        </div>
      )}

      {viewState === 'customPrompt' && (
        <div className="flex flex-col gap-1.5 p-1 w-72 text-xs">
          <div className="flex items-center gap-1">
            <input
              type="text"
              autoFocus
              value={customPrompt}
              onChange={(e) => setCustomPrompt(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === 'Enter') {
                  e.preventDefault();
                  handleApplyAi(customPrompt || 'Refine and polish');
                } else if (e.key === 'Escape') {
                  setViewState('bar');
                }
              }}
              placeholder="Ask AI to rephrase, fix laterality..."
              className="flex-1 px-2 py-1 text-xs rounded-lg border border-border bg-muted/40 focus:outline-none focus:border-primary text-foreground"
            />
            <button
              type="button"
              onClick={() => handleApplyAi(customPrompt || 'Refine and polish')}
              disabled={loading}
              className="p-1.5 rounded-lg bg-primary text-on-primary hover:bg-primary/90 disabled:opacity-50 cursor-pointer"
            >
              <ArrowRight className="w-3 h-3" />
            </button>
            <button
              type="button"
              onClick={() => setViewState('bar')}
              className="p-1 text-muted-foreground hover:text-foreground cursor-pointer"
            >
              <X className="w-3 h-3" />
            </button>
          </div>
        </div>
      )}
    </BubbleMenu>
  );
}
