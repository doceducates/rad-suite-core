'use client';

import { ArrowRight, ListOrdered } from 'lucide-react';
import type { DifferentialItem } from '@/types/case-insights';

interface RankedDifferentialsCardProps {
  differentials: DifferentialItem[];
  onInsertDifferential: (item: DifferentialItem) => void;
  onInsertAllDifferentials?: () => void;
}

export function RankedDifferentialsCard({
  differentials,
  onInsertDifferential,
  onInsertAllDifferentials,
}: RankedDifferentialsCardProps) {
  const getLikelihoodBadge = (likelihood: DifferentialItem['likelihood']) => {
    switch (likelihood) {
      case 'High':
        return 'bg-emerald-500/15 text-emerald-600 dark:text-emerald-400 border-emerald-500/30';
      case 'Moderate':
        return 'bg-amber-500/15 text-amber-600 dark:text-amber-400 border-amber-500/30';
      default:
        return 'bg-purple-500/15 text-purple-600 dark:text-purple-400 border-purple-500/30';
    }
  };

  if (!differentials || differentials.length === 0) return null;

  return (
    <div className="space-y-2">
      <div className="flex items-center justify-between gap-1 px-0.5">
        <span className="text-[10px] font-bold uppercase tracking-wider text-secondary flex items-center gap-1">
          <ListOrdered className="w-3 h-3 text-primary" />
          Ranked Considerations
        </span>
        {onInsertAllDifferentials && differentials.length > 1 && (
          <button
            type="button"
            onClick={onInsertAllDifferentials}
            className="text-[10px] font-semibold text-primary hover:underline cursor-pointer flex items-center gap-0.5"
            title="Append all ranked differentials into the impression"
          >
            <span>+ Insert All to Impression</span>
            <ArrowRight className="w-2.5 h-2.5" />
          </button>
        )}
      </div>

      <div className="space-y-2">
        {differentials.map((item, idx) => (
          <div
            key={idx}
            className="p-2.5 rounded-lg bg-surface-container border border-outline-variant/50 hover:border-primary/40 transition-colors space-y-1.5"
          >
            <div className="flex items-center justify-between gap-1.5">
              <span className="font-bold text-on-surface text-xs leading-snug">
                {idx + 1}. {item.diagnosis}
              </span>
              <span
                className={`text-[9px] font-mono font-bold px-1.5 py-0.5 rounded border shrink-0 ${getLikelihoodBadge(
                  item.likelihood
                )}`}
              >
                {item.likelihood}
              </span>
            </div>

            <p className="text-secondary text-[11px] leading-relaxed">
              {item.rationale}
            </p>

            {item.discriminativeFeatures && (
              <p className="text-[10px] text-primary italic leading-snug">
                <span className="font-semibold not-italic">Rule out / Verify: </span>
                {item.discriminativeFeatures}
              </p>
            )}

            <div className="pt-1 flex justify-end">
              <button
                type="button"
                onClick={() => onInsertDifferential(item)}
                className="text-[10px] font-semibold text-primary hover:underline cursor-pointer flex items-center gap-0.5"
                title={`Insert "${item.diagnosis}" into Impression`}
              >
                <span>+ Insert to Impression</span>
                <ArrowRight className="w-2.5 h-2.5" />
              </button>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
