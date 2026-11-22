'use client';

// Layer 4 (Presentation): Positive Findings Cards & Level Chips Ribbon
// Strict File Size Invariant: Target < 250 lines, max 350 lines

import React from 'react';
import { X, CheckCircle2 } from 'lucide-react';
import { ExtractedPositiveSection, AnatomicalSection } from '@/types/signout';
import { AnatomicalAbnormalityChip } from './anatomical-abnormality-chip';

interface PositiveFindingsCardsProps {
  positiveSections: ExtractedPositiveSection[];
  allSections: AnatomicalSection[];
  onTextChange: (sectionId: string, newText: string) => void;
  onMarkNormal: (sectionId: string) => void;
  onSelectAbnormality?: (sectionId: string, text: string, impression?: string) => void;
  onFocusSectionInPatcher?: (sectionId: string) => void;
}

export function PositiveFindingsCards({
  positiveSections,
  allSections,
  onTextChange,
  onMarkNormal,
  onSelectAbnormality,
}: PositiveFindingsCardsProps) {
  const positiveIds = new Set(positiveSections.map((s) => s.id));

  return (
    <div className="flex flex-col h-full space-y-3">
      {/* 1. Quick Anatomical Chips Ribbon */}
      <div className="space-y-1.5 shrink-0">
        <div className="flex items-center justify-between">
          <span className="text-[11px] font-semibold text-secondary tracking-wide uppercase">
            Anatomical Levels
          </span>
          <span className="text-[10px] font-mono text-secondary">
            {positiveSections.length} of {allSections.length} abnormal
          </span>
        </div>

        <div className="flex flex-wrap gap-1.5 p-2 rounded-xl bg-surface-container-low border border-outline-variant/30">
          {allSections.map((sec) => (
            <AnatomicalAbnormalityChip
              key={sec.id}
              section={sec}
              isPositive={positiveIds.has(sec.id)}
              onSelectAbnormality={(text, imp) => onSelectAbnormality?.(sec.id, text, imp)}
              onMarkNormal={() => onMarkNormal(sec.id)}
            />
          ))}
        </div>
      </div>

      {/* 2. Positive Findings Cards List */}
      <div className="flex-1 min-h-0 flex flex-col space-y-2 overflow-y-auto pr-0.5">
        <div className="flex items-center justify-between shrink-0">
          <span className="text-[11px] font-semibold text-secondary tracking-wide uppercase">
            Active Findings {positiveSections.length > 0 && `(${positiveSections.length})`}
          </span>
        </div>

        {positiveSections.length === 0 ? (
          <div className="flex-1 flex flex-col items-center justify-center p-8 text-center rounded-xl border border-dashed border-outline-variant/40 bg-surface-container-lowest/50 text-secondary">
            <CheckCircle2 className="w-7 h-7 text-emerald-400 mb-2 opacity-80" />
            <p className="text-xs font-medium text-on-surface">Unremarkable Baseline</p>
            <p className="text-[11px] text-secondary mt-1 max-w-xs">
              All levels match normal template. Select an abnormality from the chips above or speak/type notes on the right.
            </p>
          </div>
        ) : (
          <div className="space-y-2.5">
            {positiveSections.map((item) => (
              <div
                key={item.id}
                className="p-3 rounded-xl border border-amber-500/30 bg-surface-container-low hover:border-amber-500/50 transition-colors space-y-2"
              >
                {/* Card Header: Level Name & Revert Button */}
                <div className="flex items-center justify-between gap-2">
                  <div className="flex items-center gap-1.5 min-w-0">
                    <span className="w-2 h-2 rounded-full bg-amber-400 shrink-0" />
                    <span className="font-semibold text-xs text-on-surface truncate">
                      {item.heading}
                    </span>
                  </div>

                  <button
                    type="button"
                    onClick={() => onMarkNormal(item.id)}
                    className="inline-flex items-center gap-1 px-2 py-0.5 rounded text-[11px] font-medium text-rose-400 hover:text-rose-300 hover:bg-rose-950/20 transition-colors cursor-pointer shrink-0"
                    title="Revert back to normal template"
                  >
                    <X className="w-3 h-3" />
                    <span>Normal</span>
                  </button>
                </div>

                {/* Editable Textarea for Direct Tweaks */}
                <textarea
                  rows={2}
                  value={item.currentText}
                  onChange={(e) => onTextChange(item.id, e.target.value)}
                  className="w-full rounded-lg p-2 text-xs leading-relaxed border border-outline-variant/40 bg-surface text-on-surface focus:outline-none focus:border-amber-400 resize-y"
                  placeholder="Enter positive finding description..."
                />

                {/* Subtle baseline preview */}
                <div className="text-[10px] text-secondary/60 truncate">
                  Baseline: {item.baselineNormal}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
