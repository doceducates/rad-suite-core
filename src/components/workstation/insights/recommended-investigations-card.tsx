'use client';

import React from 'react';
import { Microscope, Activity, ArrowRight } from 'lucide-react';
import type { RecommendedInvestigation } from '@/types/case-insights';

interface RecommendedInvestigationsCardProps {
  investigations: RecommendedInvestigation[];
  onInsertRecommendations?: (investigations: RecommendedInvestigation[]) => void;
}

export function RecommendedInvestigationsCard({
  investigations,
  onInsertRecommendations,
}: RecommendedInvestigationsCardProps) {
  if (!investigations || investigations.length === 0) return null;

  return (
    <div className="p-3 rounded-lg bg-surface-container border border-outline-variant/50 space-y-2">
      <div className="flex items-center justify-between gap-1">
        <span className="text-[10px] font-bold uppercase tracking-wider text-secondary flex items-center gap-1">
          <Activity className="w-3.5 h-3.5 text-primary" />
          Recommended Next Investigations
        </span>
        {onInsertRecommendations && (
          <button
            type="button"
            onClick={() => onInsertRecommendations(investigations)}
            className="text-[10px] font-semibold text-primary hover:underline cursor-pointer flex items-center gap-0.5"
            title="Append recommendations to report"
          >
            <span>+ Insert</span>
            <ArrowRight className="w-2.5 h-2.5" />
          </button>
        )}
      </div>

      <div className="space-y-1.5">
        {investigations.map((inv, idx) => (
          <div
            key={idx}
            className="p-2 rounded-md bg-surface-container-high/60 border border-outline-variant/30 text-[11px] space-y-0.5"
          >
            <div className="flex items-center justify-between gap-1">
              <span className="font-semibold text-on-surface flex items-center gap-1.5">
                <Microscope className="w-3 h-3 text-secondary shrink-0" />
                {inv.name}
              </span>
              <span className="text-[9px] font-mono uppercase px-1 py-0.2 rounded bg-surface-container text-secondary shrink-0">
                {inv.type}
              </span>
            </div>
            <p className="text-secondary text-[10px] leading-relaxed pl-4.5">
              {inv.rationale}
            </p>
          </div>
        ))}
      </div>
    </div>
  );
}
