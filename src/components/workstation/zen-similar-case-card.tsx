'use client';

import React from 'react';
import { SimilarCase } from '@/services/similar-cases.service';
import { BookOpen, ExternalLink } from 'lucide-react';
import { cn } from '@/lib/utils';

interface ZenSimilarCaseCardProps {
  caseItem: SimilarCase;
  onSelect: (c: SimilarCase) => void;
  onInsertText?: (text: string, targetSection: 'findings' | 'impression') => void;
}

export function ZenSimilarCaseCard({
  caseItem,
  onSelect,
}: ZenSimilarCaseCardProps) {
  return (
    <div
      role="button"
      tabIndex={0}
      onClick={() => onSelect(caseItem)}
      onKeyDown={(e) => {
        if (e.key === 'Enter' || e.key === ' ') {
          e.preventDefault();
          onSelect(caseItem);
        }
      }}
      className="p-2 rounded-xl bg-surface-container/70 hover:bg-surface-container border border-outline-variant/40 hover:border-primary/50 cursor-pointer transition-all duration-150 flex flex-col gap-1.5 select-none shadow-2xs group"
    >
      {/* Top Bar: Badges & ID */}
      <div className="flex items-center justify-between gap-1 text-[10px] font-mono">
        <div className="flex items-center gap-1">
          <span className="px-1.5 py-0.5 rounded font-bold bg-primary/15 text-primary">
            {caseItem.modality}
          </span>
          <span className="px-1.5 py-0.5 rounded bg-surface-container-high text-secondary">
            {caseItem.bodyPart}
          </span>
        </div>
        <span className="text-secondary/70 flex items-center gap-0.5 text-[9px]">
          <BookOpen className="w-2.5 h-2.5" />
          Radiopaedia
        </span>
      </div>

      {/* Case Title */}
      <div className="font-semibold text-xs text-on-surface group-hover:text-primary transition-colors leading-snug">
        {caseItem.title}
      </div>

      {/* Patient presentation snippet */}
      <div className="text-[10px] text-secondary line-clamp-1 italic">
        {caseItem.demographics}
      </div>

      {/* Primary Key Finding Preview */}
      <div className="text-[11px] text-on-surface-variant bg-surface-container-low p-1.5 rounded-lg border border-outline-variant/30 leading-relaxed">
        <span className="font-bold text-[9px] text-primary block uppercase tracking-wider">
          Key Finding:
        </span>
        <span className="line-clamp-2">{caseItem.keyFindings[0]}</span>
      </div>

      {/* Footer trigger */}
      <div className="flex items-center justify-end text-[10px] font-mono font-semibold text-primary pt-0.5">
        <span className="group-hover:underline flex items-center gap-0.5">
          View Radiopaedia Details →
        </span>
      </div>
    </div>
  );
}
