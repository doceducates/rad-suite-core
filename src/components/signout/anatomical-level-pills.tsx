'use client';

import React from 'react';
import { AnatomicalSection } from '@/types/signout';

interface AnatomicalLevelPillsProps {
  sections: AnatomicalSection[];
  positiveSectionIds: Set<string>;
  focusedSectionId: string | null;
  onSelectSection: (sectionId: string | null) => void;
  className?: string;
}

export function AnatomicalLevelPills({
  sections,
  positiveSectionIds,
  focusedSectionId,
  onSelectSection,
  className = '',
}: AnatomicalLevelPillsProps) {
  return (
    <div className={`flex flex-wrap items-center gap-1.5 select-none ${className}`}>
      {sections.map((sec) => {
        const isPos = positiveSectionIds.has(sec.id);
        const isFocused = focusedSectionId === sec.id;

        return (
          <button
            key={sec.id}
            type="button"
            onClick={() => onSelectSection(isFocused ? null : sec.id)}
            className={`px-2.5 py-1 rounded-md text-[11px] font-semibold border transition-all flex items-center gap-1.5 cursor-pointer active:scale-95 ${
              isFocused
                ? 'bg-primary text-primary-foreground border-primary shadow-sm ring-1 ring-primary/50'
                : isPos
                ? 'bg-amber-500/15 border-amber-500/40 text-amber-300 hover:bg-amber-500/25'
                : 'bg-surface-container border-outline-variant/60 text-secondary hover:text-on-surface hover:bg-surface-container-high'
            }`}
            title={`${sec.heading} — ${isPos ? 'Abnormal (Positive Finding)' : 'Normal Baseline'}`}
          >
            <span>{sec.shortLabel || sec.heading.split('(')[0].trim()}</span>
            {isPos ? (
              <span className="w-1.5 h-1.5 rounded-full bg-amber-400 animate-pulse" />
            ) : (
              <span className="w-1.5 h-1.5 rounded-full bg-emerald-500/60" />
            )}
          </button>
        );
      })}
    </div>
  );
}
