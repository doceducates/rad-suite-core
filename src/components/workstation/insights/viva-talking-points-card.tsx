'use client';

import React, { useState } from 'react';
import { GraduationCap, Copy, Check, Sparkles, AlertCircle, HelpCircle } from 'lucide-react';
import type { VivaBriefing } from '@/types/case-insights';
import { notify } from '@/services/notification.service';

interface VivaTalkingPointsCardProps {
  viva: VivaBriefing;
  primaryDiagnosis?: string;
}

export function VivaTalkingPointsCard({
  viva,
  primaryDiagnosis = 'Primary Finding',
}: VivaTalkingPointsCardProps) {
  const [copied, setCopied] = useState(false);

  const handleCopyViva = () => {
    const lines = [
      `VIVA / CLASS BRIEFING: ${primaryDiagnosis}`,
      `• Demographics: ${viva.demographics}`,
      `• Hallmark Signs: ${viva.hallmarkSigns.join(', ')}`,
      `• Discriminative Criteria: ${viva.discriminativeFeatures.join('; ')}`,
      viva.narrowingQuestions?.length ? `• Key Questions to Ask: ${viva.narrowingQuestions.join('; ')}` : '',
      viva.examinerTraps?.length ? `• Examiner Traps: ${viva.examinerTraps.join('; ')}` : '',
      viva.guidelinePearl ? `• Guideline Pearl: ${viva.guidelinePearl}` : '',
    ]
      .filter(Boolean)
      .join('\n');

    if (typeof navigator !== 'undefined' && navigator.clipboard) {
      navigator.clipboard.writeText(lines).then(() => {
        setCopied(true);
        notify.success('Viva briefing copied to clipboard');
        setTimeout(() => setCopied(false), 2000);
      });
    }
  };

  return (
    <div className="p-3 rounded-lg bg-surface-container border border-outline-variant/50 space-y-2.5">
      <div className="flex items-center justify-between gap-1">
        <span className="text-[10px] font-bold uppercase tracking-wider text-primary flex items-center gap-1">
          <GraduationCap className="w-3.5 h-3.5 text-primary" />
          Clinical Viva / Case Presentation
        </span>
        <button
          type="button"
          onClick={handleCopyViva}
          className="p-1 rounded text-secondary hover:text-primary hover:bg-surface-container-high transition-colors cursor-pointer flex items-center gap-1 text-[10px]"
          title="Copy talking points to clipboard"
        >
          {copied ? <Check className="w-3 h-3 text-emerald-400" /> : <Copy className="w-3 h-3" />}
          <span>{copied ? 'Copied' : 'Copy'}</span>
        </button>
      </div>

      {/* Demographics & Risk Profile */}
      {viva.demographics && (
        <div className="text-[11px] leading-relaxed">
          <span className="font-semibold text-on-surface">Demographics: </span>
          <span className="text-secondary">{viva.demographics}</span>
        </div>
      )}

      {/* Hallmark Signs */}
      {viva.hallmarkSigns && viva.hallmarkSigns.length > 0 && (
        <div className="space-y-1">
          <span className="text-[10px] font-bold uppercase tracking-wider text-secondary flex items-center gap-1">
            <Sparkles className="w-2.5 h-2.5 text-primary" />
            Hallmark Signs & Features
          </span>
          <div className="flex flex-wrap gap-1">
            {viva.hallmarkSigns.map((sign, idx) => (
              <span
                key={idx}
                className="text-[10px] font-medium px-2 py-0.5 rounded-md bg-surface-container-high text-on-surface border border-outline-variant/40"
              >
                {sign}
              </span>
            ))}
          </div>
        </div>
      )}

      {/* Discriminative Criteria / Examiner Questions */}
      {viva.discriminativeFeatures && viva.discriminativeFeatures.length > 0 && (
        <div className="space-y-1 pt-0.5">
          <span className="text-[10px] font-bold text-on-surface block">
            Discriminative Features & Examiner Queries:
          </span>
          <ul className="list-disc list-inside space-y-0.5 text-[11px] text-secondary leading-relaxed pl-1">
            {viva.discriminativeFeatures.map((feat, idx) => (
              <li key={idx}>{feat}</li>
            ))}
          </ul>
        </div>
      )}

      {/* Questions to Ask to Narrow Differentials */}
      {viva.narrowingQuestions && viva.narrowingQuestions.length > 0 && (
        <div className="p-2.5 rounded-lg bg-sky-500/10 border border-sky-500/25 text-[10px] space-y-1">
          <span className="font-bold text-sky-600 dark:text-sky-400 flex items-center gap-1 uppercase tracking-wider text-[9px]">
            <HelpCircle className="w-3.5 h-3.5 shrink-0 text-sky-500" />
            Questions to Ask to Narrow Differentials
          </span>
          <ul className="list-disc list-inside space-y-1 text-[11px] text-secondary leading-relaxed pl-0.5">
            {viva.narrowingQuestions.map((q, idx) => (
              <li key={idx} className="marker:text-sky-500/80">{q}</li>
            ))}
          </ul>
        </div>
      )}

      {/* Common Examiner Traps */}
      {viva.examinerTraps && viva.examinerTraps.length > 0 && (
        <div className="p-2 rounded bg-amber-500/10 border border-amber-500/20 text-[10px] space-y-0.5">
          <span className="font-bold text-amber-600 dark:text-amber-400 flex items-center gap-1">
            <AlertCircle className="w-3 h-3 shrink-0" />
            Classic Examiner Trap
          </span>
          <p className="text-secondary">{viva.examinerTraps.join(' ')}</p>
        </div>
      )}

      {/* Academic Guideline Pearl */}
      {viva.guidelinePearl && (
        <div className="p-2 rounded bg-primary/10 border border-primary/20 text-[10px] text-secondary">
          <span className="font-bold text-primary block mb-0.5">Guideline Standard:</span>
          <span>{viva.guidelinePearl}</span>
        </div>
      )}
    </div>
  );
}
