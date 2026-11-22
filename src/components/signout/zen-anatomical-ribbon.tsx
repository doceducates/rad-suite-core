'use client';

import React, { useMemo } from 'react';
import { Stethoscope, AlertCircle, CheckCircle2 } from 'lucide-react';
import { findSignoutTemplate, isSectionPositive } from '@/services/templates/signout-templates.data';
import { SignoutTemplate } from '@/types/signout';

interface ZenAnatomicalRibbonProps {
  modality?: string;
  studyDescription?: string;
  findings?: string;
  onOpenSignout?: (sectionId?: string) => void;
  className?: string;
}

export function ZenAnatomicalRibbon({
  modality = 'MRI',
  studyDescription = 'MRI Lumbosacral Spine',
  findings = '',
  onOpenSignout,
  className = '',
}: ZenAnatomicalRibbonProps) {
  const template: SignoutTemplate | null = useMemo(() => {
    return findSignoutTemplate(`${modality} ${studyDescription}`);
  }, [modality, studyDescription]);

  // Extract positive findings from current findings HTML
  const { positiveCount, levelStatus } = useMemo(() => {
    if (!template) return { positiveCount: 0, levelStatus: {} };
    let positives = 0;
    const statusMap: Record<string, boolean> = {};

    template.sections.forEach((sec) => {
      let secText = sec.normalStandardized;
      if (findings) {
        const regex = new RegExp(`(?:<strong>)?${sec.heading}:?(?:<\\/strong>)?\\s*([^<]+)`, 'i');
        const match = findings.match(regex);
        if (match) {
          secText = match[1].trim();
        }
      }
      const isPos = isSectionPositive(secText, sec);
      statusMap[sec.id] = isPos;
      if (isPos) positives++;
    });

    return { positiveCount: positives, levelStatus: statusMap };
  }, [template, findings]);

  if (!template) return null;

  return (
    <div
      className={`flex items-center justify-between gap-2 px-3 py-1.5 rounded-xl bg-surface-container-low border border-outline-variant/50 text-xs select-none ${className}`}
    >
      {/* Left: Scrollable Level Pills */}
      <div className="flex items-center gap-1.5 overflow-x-auto no-scrollbar py-0.5 min-w-0 flex-1">
        <span className="font-mono text-[10px] text-secondary uppercase tracking-wider shrink-0 font-bold hidden sm:inline">
          {template.title.split(' ')[1] || 'Levels'}:
        </span>

        {template.sections.map((sec) => {
          const isPos = levelStatus[sec.id];
          return (
            <button
              key={sec.id}
              type="button"
              onClick={() => onOpenSignout?.(sec.id)}
              className={`px-2 py-0.5 rounded-md text-[11px] font-semibold border transition-all flex items-center gap-1 shrink-0 cursor-pointer active:scale-95 ${
                isPos
                  ? 'bg-amber-500/20 border-amber-500/50 text-amber-300 hover:bg-amber-500/30 shadow-2xs'
                  : 'bg-surface-container border-outline-variant/40 text-secondary hover:text-on-surface hover:bg-surface-container-high'
              }`}
              title={`${sec.heading} — ${isPos ? 'Abnormal (Positive Finding)' : 'Normal Baseline'}. Click to edit in Sign-Out rounds.`}
            >
              <span>{sec.shortLabel || sec.heading.split('(')[0].trim()}</span>
              {isPos ? (
                <span className="w-1.5 h-1.5 rounded-full bg-amber-400 animate-pulse" />
              ) : (
                <span className="w-1.5 h-1.5 rounded-full bg-emerald-500/50" />
              )}
            </button>
          );
        })}
      </div>

      {/* Right: Quick Launch Sign-Out Button */}
      {onOpenSignout && (
        <button
          type="button"
          onClick={() => onOpenSignout()}
          className="flex items-center gap-1.5 px-2.5 py-1 rounded-lg border border-amber-500/40 bg-amber-500/10 hover:bg-amber-500/20 text-amber-300 font-mono text-[11px] font-bold shrink-0 transition-all cursor-pointer active:scale-95 shadow-2xs"
          title="Open Consultant Sign-Out Rounds Workspace (Alt+R)"
        >
          <Stethoscope className="w-3.5 h-3.5 text-amber-400" />
          <span className="hidden md:inline">Sign-Out (Alt+R)</span>
          {positiveCount > 0 ? (
            <span className="px-1.5 py-0.2 rounded-full bg-amber-500 text-slate-950 text-[10px] font-black">
              {positiveCount}
            </span>
          ) : (
            <span className="text-[10px] text-emerald-400 font-medium">All Normal</span>
          )}
        </button>
      )}
    </div>
  );
}
