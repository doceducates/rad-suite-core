'use client';

// Layer 4 (Presentation): AI Impression Style Cycler (Left/Right Arrows)
// Invariant: Target < 250 lines, max 350 lines.

import React from 'react';
import { ChevronLeft, ChevronRight, Loader2, Sparkles } from 'lucide-react';
import { ImpressionFlavor } from '@/services/two-tier-impression.service';
import { cn } from '@/lib/utils';

export interface ImpressionStyleOption {
  id: ImpressionFlavor;
  label: string;
  shortLabel: string;
  description: string;
}

export const AVAILABLE_IMPRESSION_STYLES: ImpressionStyleOption[] = [
  {
    id: 'local_high_yield',
    label: 'Local High-Yield (LGH)',
    shortLabel: 'High-Yield (LGH)',
    description: '1-2 concise synthesized bullets for surgical/ward teams',
  },
  {
    id: 'international_structured',
    label: 'Academic ACR Structured',
    shortLabel: 'Academic ACR',
    description: 'Formal ACR/RSNA itemized taxonomy with stenosis grading',
  },
  {
    id: 'concise_bullets',
    label: 'Concise Bulleted',
    shortLabel: 'Concise Bullets',
    description: 'High-impact atomic bullets focusing strictly on positive findings',
  },
];

interface ImpressionStyleCyclerProps {
  currentStyle: ImpressionFlavor;
  onCycle: (direction: 'next' | 'prev') => void;
  loading?: boolean;
  disabled?: boolean;
  className?: string;
}

export function ImpressionStyleCycler({
  currentStyle,
  onCycle,
  loading = false,
  disabled = false,
  className,
}: ImpressionStyleCyclerProps) {
  const currentIndex = AVAILABLE_IMPRESSION_STYLES.findIndex((s) => s.id === currentStyle);
  const activeStyle = AVAILABLE_IMPRESSION_STYLES[currentIndex !== -1 ? currentIndex : 0];
  const displayIndex = currentIndex !== -1 ? currentIndex + 1 : 1;

  return (
    <div
      onClick={(e) => e.stopPropagation()}
      className={cn(
        'inline-flex items-center gap-1 rounded-lg border border-outline-variant/40 bg-surface-container-low p-0.5 text-xs shadow-2xs select-none',
        className
      )}
      title="Cycle through different AI-generated impression styles"
    >
      <button
        type="button"
        disabled={disabled || loading}
        onClick={() => onCycle('prev')}
        className="p-1 rounded text-secondary hover:text-primary hover:bg-surface-container transition-colors disabled:opacity-40 cursor-pointer"
        title="Previous impression style (Left arrow)"
        aria-label="Previous impression style"
      >
        <ChevronLeft className="w-3.5 h-3.5" />
      </button>

      <div
        className="flex items-center gap-1.5 px-2 py-0.5 rounded bg-surface-container font-medium text-[11px] text-on-surface cursor-default"
        title={`${activeStyle.label}: ${activeStyle.description}`}
      >
        {loading ? (
          <Loader2 className="w-3 h-3 text-primary animate-spin" />
        ) : (
          <Sparkles className="w-3 h-3 text-primary" />
        )}
        <span className="font-semibold text-primary font-mono text-[10px]">
          {displayIndex}/{AVAILABLE_IMPRESSION_STYLES.length}
        </span>
        <span className="truncate max-w-[110px] sm:max-w-none text-secondary">
          {activeStyle.shortLabel}
        </span>
      </div>

      <button
        type="button"
        disabled={disabled || loading}
        onClick={() => onCycle('next')}
        className="p-1 rounded text-secondary hover:text-primary hover:bg-surface-container transition-colors disabled:opacity-40 cursor-pointer"
        title="Next impression style (Right arrow)"
        aria-label="Next impression style"
      >
        <ChevronRight className="w-3.5 h-3.5" />
      </button>
    </div>
  );
}
