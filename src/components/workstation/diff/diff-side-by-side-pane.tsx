'use client';

// Layer 4 (Presentation): Side-by-side and unified level diff display
// Invariant: Target < 250 lines, max 350 lines.

import React from 'react';
import { Badge } from '@/components/ui/badge';
import { cleanHtmlText, LevelDiffItem, DiffToken } from '@/lib/clinical-diff-engine';

interface DiffSideBySidePaneProps {
  viewLayout: 'side_by_side' | 'unified';
  titleA: string;
  titleB: string;
  oldImpression: string;
  impressionTokens: DiffToken[];
  findingsLevelDiffs: LevelDiffItem[];
}

export function DiffSideBySidePane({
  viewLayout,
  titleA,
  titleB,
  oldImpression,
  impressionTokens,
  findingsLevelDiffs,
}: DiffSideBySidePaneProps) {
  if (viewLayout === 'side_by_side') {
    return (
      <div className="space-y-4">
        <div className="grid grid-cols-2 gap-3 pb-2 border-b border-outline-variant/30 font-semibold text-xs">
          <div className="text-secondary">{titleA}</div>
          <div className="text-primary">{titleB}</div>
        </div>

        {/* Findings by Level */}
        <div className="space-y-2">
          <span className="font-bold uppercase tracking-wider text-[10px] text-primary block">Findings by Level</span>
          {findingsLevelDiffs.map((item) => (
            <div key={item.level} className="grid grid-cols-2 gap-3 p-2 rounded-lg border border-outline-variant/20 bg-surface-container-low text-xs">
              <div>
                <span className="font-bold text-secondary block mb-0.5">{item.level}</span>
                <p className="text-on-surface leading-relaxed">{item.oldText || <em className="text-secondary/50">Unspecified</em>}</p>
              </div>
              <div>
                <span className="font-bold text-primary block mb-0.5">{item.level}</span>
                <p className="leading-relaxed">
                  {item.tokens.map((tok, i) => (
                    tok.type === 'added' ? (
                      <span key={i} className="bg-emerald-500/20 text-emerald-400 font-semibold px-0.5 rounded mr-1">+{tok.value}</span>
                    ) : tok.type === 'removed' ? (
                      <span key={i} className="line-through bg-rose-500/20 text-rose-400 px-0.5 rounded mr-1">{tok.value}</span>
                    ) : (
                      <span key={i} className="text-on-surface mr-1">{tok.value}</span>
                    )
                  ))}
                </p>
              </div>
            </div>
          ))}
        </div>

        {/* Impression Section */}
        <div className="space-y-2 pt-2 border-t border-outline-variant/30">
          <span className="font-bold uppercase tracking-wider text-[10px] text-primary block">Impression Comparison</span>
          <div className="grid grid-cols-2 gap-3 p-2 rounded-lg border border-outline-variant/20 bg-surface-container-low text-xs">
            <div>
              <p className="text-on-surface leading-relaxed whitespace-pre-line">{cleanHtmlText(oldImpression) || 'None recorded'}</p>
            </div>
            <div>
              <p className="leading-relaxed">
                {impressionTokens.map((tok, i) => (
                  tok.type === 'added' ? (
                    <span key={i} className="bg-emerald-500/20 text-emerald-400 font-semibold px-0.5 rounded mr-1">+{tok.value}</span>
                  ) : tok.type === 'removed' ? (
                    <span key={i} className="line-through bg-rose-500/20 text-rose-400 px-0.5 rounded mr-1">{tok.value}</span>
                  ) : (
                    <span key={i} className="text-on-surface mr-1">{tok.value}</span>
                  )
                ))}
              </p>
            </div>
          </div>
        </div>
      </div>
    );
  }

  // Unified / Inline View
  return (
    <div className="space-y-4">
      <span className="font-bold uppercase tracking-wider text-[10px] text-primary block">Unified Inline Changes</span>
      {findingsLevelDiffs.map((item) => (
        <div key={item.level} className="p-2 rounded-lg border border-outline-variant/20 bg-surface-container-low text-xs space-y-1">
          <div className="flex items-center justify-between">
            <span className="font-bold text-on-surface">{item.level}</span>
            <Badge variant="outline" className={`text-[10px] ${item.status === 'modified' ? 'text-amber-400' : item.status === 'added' ? 'text-emerald-400' : item.status === 'removed' ? 'text-rose-400' : 'text-secondary'}`}>
              {item.status}
            </Badge>
          </div>
          <p className="leading-relaxed pt-1">
            {item.tokens.map((tok, i) => (
              tok.type === 'added' ? (
                <span key={i} className="bg-emerald-500/20 text-emerald-400 font-semibold px-0.5 rounded mr-1">+{tok.value}</span>
              ) : tok.type === 'removed' ? (
                <span key={i} className="line-through bg-rose-500/20 text-rose-400 px-0.5 rounded mr-1">{tok.value}</span>
              ) : (
                <span key={i} className="text-on-surface mr-1">{tok.value}</span>
              )
            ))}
          </p>
        </div>
      ))}
    </div>
  );
}
