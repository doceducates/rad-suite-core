'use client';

import React, { useState } from 'react';
import { BookOpen, ExternalLink, ArrowRight, CheckCircle2 } from 'lucide-react';
import type { KnowledgePearl } from '@/services/ai-differential.service';

interface CopilotGuidanceTabProps {
  pearls?: KnowledgePearl[];
  onInsertImpression: (text: string) => void;
  modality?: string;
}

const STATIC_GUIDELINES = [
  {
    title: 'Fleischner Society 2017',
    category: 'Pulmonary Nodules',
    summary: 'Solid nodule < 6 mm (low risk: no follow-up; high risk: optional CT at 12m). Solid 6-8 mm: CT at 6-12m. Subsolid > 6 mm: CT at 3-6m.',
    impressionText: 'In accordance with Fleischner Society 2017 criteria, follow-up chest CT is recommended in 6-12 months.',
  },
  {
    title: 'Bosniak Classification v2019',
    category: 'Renal Cystic Masses',
    summary: 'Class I/II: Benign (no follow-up). Class IIF: Minimally complex (CT/MRI follow-up at 6 & 12m). Class III/IV: Surgical consideration or active surveillance.',
    impressionText: 'Cystic renal lesion categorized as Bosniak IIF; dedicated renal protocol CT follow-up recommended at 6 and 12 months.',
  },
  {
    title: 'ACR TI-RADS',
    category: 'Thyroid Ultrasound',
    summary: 'TR1: Benign (0 pt). TR2: Not suspicious (2 pt). TR3: Mildly suspicious (3 pt, FNA if >= 2.5cm). TR4: Moderately suspicious (4-6 pt, FNA if >= 1.5cm). TR5: Highly suspicious (>= 7 pt, FNA if >= 1.0cm).',
    impressionText: 'Thyroid nodule features are consistent with ACR TI-RADS 4 (moderately suspicious); fine-needle aspiration (FNA) biopsy is recommended.',
  },
  {
    title: 'LI-RADS v2018',
    category: 'Hepatic Observations (High-Risk)',
    summary: 'LR-1: Definitely benign. LR-3: Intermediate probability of HCC. LR-4: Probably HCC. LR-5: Definitely HCC (arterial phase hyperenhancement + washout/capsule/threshold growth).',
    impressionText: 'Hepatic observation meets criteria for LI-RADS 4 (probably HCC); multidisciplinary tumor board discussion recommended.',
  },
];

export function CopilotGuidanceTab({
  pearls,
  onInsertImpression,
  modality = 'CT',
}: CopilotGuidanceTabProps) {
  const [selectedGuideline, setSelectedGuideline] = useState<number | null>(null);

  return (
    <div className="flex-1 overflow-y-auto p-3 space-y-3 text-xs">
      {/* Dynamic Pearls from Study */}
      {pearls && pearls.length > 0 && (
        <div className="space-y-1.5">
          <span className="text-[10px] font-bold uppercase tracking-wider text-primary flex items-center gap-1">
            <CheckCircle2 className="w-3 h-3" />
            Study-Specific Diagnostic Pearls
          </span>
          {pearls.map((pearl, idx) => (
            <div
              key={idx}
              className="p-2.5 rounded-lg bg-primary/10 border border-primary/20 space-y-1 text-foreground"
            >
              <div className="font-bold text-[11px] text-primary">
                {pearl.system}
              </div>
              <p className="text-[11px] leading-relaxed text-muted-foreground">{pearl.guidance}</p>
              {pearl.recommendation && (
                <div className="pt-1 flex items-center justify-between text-[10px]">
                  <span className="italic text-foreground">{pearl.recommendation}</span>
                  <button
                    type="button"
                    onClick={() => onInsertImpression(pearl.recommendation)}
                    className="font-bold text-primary hover:underline flex items-center gap-0.5 cursor-pointer shrink-0 ml-2"
                  >
                    <span>+ Insert</span>
                    <ArrowRight className="w-2.5 h-2.5" />
                  </button>
                </div>
              )}
            </div>
          ))}
        </div>
      )}

      {/* Standard Academic Reference Guidelines */}
      <div className="space-y-2">
        <span className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground flex items-center gap-1">
          <BookOpen className="w-3 h-3 text-primary" />
          Academic Reference Standards
        </span>
        {STATIC_GUIDELINES.map((guide, idx) => (
          <div
            key={idx}
            className="p-2.5 rounded-lg bg-muted/40 border border-border/60 hover:border-primary/40 transition-colors space-y-1.5"
          >
            <div className="flex items-center justify-between">
              <span className="font-bold text-foreground text-xs">{guide.title}</span>
              <span className="text-[9px] font-mono px-1.5 py-0.5 rounded bg-surface-container text-secondary">
                {guide.category}
              </span>
            </div>
            <p className="text-[11px] text-muted-foreground leading-relaxed">{guide.summary}</p>
            <div className="pt-1 flex justify-end">
              <button
                type="button"
                onClick={() => onInsertImpression(guide.impressionText)}
                className="text-[10px] font-semibold text-primary hover:underline cursor-pointer flex items-center gap-0.5"
              >
                <span>+ Insert Recommendation</span>
                <ArrowRight className="w-2.5 h-2.5" />
              </button>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
