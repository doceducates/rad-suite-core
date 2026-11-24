'use client';

// Layer 4 (Presentation): Universal Reporting & Impression Style Selector
// Invariant: Target < 250 lines, max 350 lines.

import React from 'react';
import {
  useReportingPreferences,
  FindingsStyle,
  ImpressionStyle,
} from '@/services/reporting-preferences.service';
import { AlignLeft, List, Zap, Globe, Sparkles } from 'lucide-react';
import { cn } from '@/lib/utils';

export interface ReportingStylePickerProps {
  mode?: 'all' | 'findings_only' | 'impression_only';
  compact?: boolean;
  className?: string;
  onStyleChange?: (findingsStyle: FindingsStyle, impressionStyle: ImpressionStyle) => void;
}

export function ReportingStylePicker({
  mode = 'all',
  compact = false,
  className,
  onStyleChange,
}: ReportingStylePickerProps) {
  const { findingsStyle, impressionStyle, setFindingsStyle, setImpressionStyle } =
    useReportingPreferences();

  const handleSelectFindings = (style: FindingsStyle) => {
    setFindingsStyle(style);
    onStyleChange?.(style, impressionStyle);
  };

  const handleSelectImpression = (flavor: ImpressionStyle) => {
    setImpressionStyle(flavor);
    onStyleChange?.(findingsStyle, flavor);
  };

  return (
    <div
      className={cn(
        'inline-flex items-center gap-2 p-1 rounded-xl bg-surface-container-low border border-outline-variant/40 text-xs shadow-2xs select-none',
        className
      )}
    >
      {/* Findings Style Segment (Mutually Exclusive: With Headings vs Without Headings) */}
      {(mode === 'all' || mode === 'findings_only') && (
        <div className="flex items-center gap-1">
          {!compact && (
            <span className="text-[10px] font-bold uppercase tracking-wider text-secondary font-mono mr-0.5 hidden sm:inline">
              Findings:
            </span>
          )}
          <div className="inline-flex items-center rounded-lg bg-surface-container p-0.5 border border-outline-variant/30">
            <button
              type="button"
              onClick={() => handleSelectFindings('with_headings')}
              className={cn(
                'flex items-center gap-1 px-2 py-1 rounded-md text-[11px] font-semibold transition-all cursor-pointer',
                findingsStyle === 'with_headings'
                  ? 'bg-primary text-on-primary shadow-xs'
                  : 'text-secondary hover:text-on-surface hover:bg-surface-container-high'
              )}
              title="Findings with bold anatomical colon subheadings (e.g. Liver: Normal...)"
            >
              <AlignLeft className="w-3 h-3" />
              <span>With Headings</span>
            </button>

            <button
              type="button"
              onClick={() => handleSelectFindings('without_headings')}
              className={cn(
                'flex items-center gap-1 px-2 py-1 rounded-md text-[11px] font-semibold transition-all cursor-pointer',
                findingsStyle === 'without_headings'
                  ? 'bg-primary text-on-primary shadow-xs'
                  : 'text-secondary hover:text-on-surface hover:bg-surface-container-high'
              )}
              title="Findings with pure continuous bullets without subheadings (LGH 2-Heading Standard)"
            >
              <List className="w-3 h-3" />
              <span>Without Headings</span>
            </button>
          </div>
        </div>
      )}

      {/* Separator if both modes shown */}
      {mode === 'all' && (
        <span className="w-px h-4 bg-outline-variant/40 hidden md:inline-block" />
      )}

      {/* Impression Style Segment (Mutually Exclusive: Local High-Yield vs Academic ACR) */}
      {(mode === 'all' || mode === 'impression_only') && (
        <div className="flex items-center gap-1">
          {!compact && (
            <span className="text-[10px] font-bold uppercase tracking-wider text-secondary font-mono mr-0.5 hidden sm:inline">
              Impression:
            </span>
          )}
          <div className="inline-flex items-center rounded-lg bg-surface-container p-0.5 border border-outline-variant/30">
            <button
              type="button"
              onClick={() => handleSelectImpression('local_high_yield')}
              className={cn(
                'flex items-center gap-1 px-2 py-1 rounded-md text-[11px] font-semibold transition-all cursor-pointer',
                impressionStyle === 'local_high_yield'
                  ? 'bg-primary text-on-primary shadow-xs'
                  : 'text-secondary hover:text-on-surface hover:bg-surface-container-high'
              )}
              title="Local High-Yield: 1-2 concise synthesized bullets for ward/surgical teams"
            >
              <Zap className="w-3 h-3" />
              <span className="hidden sm:inline">Local High-Yield</span>
              <span className="sm:hidden">High-Yield</span>
            </button>

            <button
              type="button"
              onClick={() => handleSelectImpression('international_structured')}
              className={cn(
                'flex items-center gap-1 px-2 py-1 rounded-md text-[11px] font-semibold transition-all cursor-pointer',
                impressionStyle === 'international_structured'
                  ? 'bg-primary text-on-primary shadow-xs'
                  : 'text-secondary hover:text-on-surface hover:bg-surface-container-high'
              )}
              title="Academic ACR: Formal itemized compartment breakdown"
            >
              <Globe className="w-3 h-3" />
              <span className="hidden sm:inline">Academic ACR</span>
              <span className="sm:hidden">ACR</span>
            </button>

            <button
              type="button"
              onClick={() => handleSelectImpression('concise_bullets')}
              className={cn(
                'flex items-center gap-1 px-2 py-1 rounded-md text-[11px] font-semibold transition-all cursor-pointer',
                impressionStyle === 'concise_bullets'
                  ? 'bg-primary text-on-primary shadow-xs'
                  : 'text-secondary hover:text-on-surface hover:bg-surface-container-high'
              )}
              title="Concise Bullets: High-impact atomic bullets focusing strictly on positive findings"
            >
              <Sparkles className="w-3 h-3" />
              <span className="hidden sm:inline">Concise Bullets</span>
              <span className="sm:hidden">Bullets</span>
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
