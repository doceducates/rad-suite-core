'use client';

import React from 'react';

export interface ReportSectionsState {
  history?: boolean;
  findings?: boolean;
  impression?: boolean;
}

export function isSectionFilled(content?: string | null): boolean {
  if (!content) return false;
  const plainText = content
    .replace(/<[^>]*>/g, ' ')
    .replace(/&(?:nbsp|#160|#xa0|ZeroWidthSpace|#8203);/gi, ' ')
    .replace(/\s+/g, ' ')
    .trim();
  return plainText.length > 0;
}

interface ReportSectionDotsProps {
  sections?: ReportSectionsState;
  size?: 'xs' | 'sm' | 'md';
  showLabels?: boolean;
  showCount?: boolean;
  className?: string;
}

export function ReportSectionDots({
  sections,
  size = 'sm',
  showLabels = false,
  showCount = false,
  className = '',
}: ReportSectionDotsProps) {
  const hasHistory = Boolean(sections?.history);
  const hasFindings = Boolean(sections?.findings);
  const hasImpression = Boolean(sections?.impression);
  const filledCount = [hasHistory, hasFindings, hasImpression].filter(Boolean).length;

  const dotSize =
    size === 'xs'
      ? 'w-1 h-1'
      : size === 'md'
      ? 'w-2 h-2'
      : 'w-1.5 h-1.5';

  const dotClass = (filled: boolean) =>
    filled
      ? `${dotSize} rounded-full bg-emerald-500 shadow-[0_0_3px_rgba(16,185,129,0.5)] shrink-0 transition-all duration-200`
      : `${dotSize} rounded-full border border-outline-variant/80 bg-transparent shrink-0 transition-all duration-200`;

  const tooltip = `History: ${hasHistory ? 'Written' : 'Empty'} • Findings: ${hasFindings ? 'Written' : 'Empty'} • Impression: ${hasImpression ? 'Written' : 'Empty'} (${filledCount}/3 sections filled)`;

  return (
    <div
      className={`inline-flex items-center gap-1 select-none ${className}`}
      title={tooltip}
      aria-label={tooltip}
    >
      {showLabels && (
        <span className="text-[8px] font-mono font-bold text-secondary uppercase tracking-wider">
          HFI
        </span>
      )}

      <div className="flex items-center gap-0.5 px-1 py-0.5 rounded-full bg-surface-container-high/40 border border-outline-variant/30">
        {/* Dot 1: History */}
        <span
          className={dotClass(hasHistory)}
          title={`History: ${hasHistory ? 'Written' : 'Empty'}`}
        />
        {/* Dot 2: Findings */}
        <span
          className={dotClass(hasFindings)}
          title={`Findings: ${hasFindings ? 'Written' : 'Empty'}`}
        />
        {/* Dot 3: Impression */}
        <span
          className={dotClass(hasImpression)}
          title={`Impression: ${hasImpression ? 'Written' : 'Empty'}`}
        />
      </div>

      {showCount && (
        <span
          className={`text-[9px] font-mono font-bold px-1 py-0.2 rounded ${
            filledCount === 3
              ? 'bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border border-emerald-500/20'
              : filledCount > 0
              ? 'bg-amber-500/10 text-amber-600 dark:text-amber-400 border border-amber-500/20'
              : 'bg-surface-container text-secondary border border-outline-variant/40'
          }`}
        >
          {filledCount}/3
        </span>
      )}
    </div>
  );
}
