'use client';

import { IdentifiedDiscrepancy } from '@/types/dictation';
import { AlertTriangle, AlertCircle, X, ShieldAlert, Zap } from 'lucide-react';
import { Button } from '@/components/ui/button';

interface DiscrepancyPanelProps {
  discrepancies: IdentifiedDiscrepancy[];
  onDismiss: (id: string) => void;
  onClearAll: () => void;
  onApplyFix?: (discrepancy: IdentifiedDiscrepancy) => void;
}

export function DiscrepancyPanel({
  discrepancies,
  onDismiss,
  onClearAll,
  onApplyFix,
}: DiscrepancyPanelProps) {
  if (discrepancies.length === 0) return null;

  return (
    <div className="rounded-xl border border-amber-300 dark:border-amber-800/80 bg-amber-50/70 dark:bg-amber-950/40 p-3 space-y-2 text-xs shadow-sm">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2 font-bold text-amber-900 dark:text-amber-200">
          <ShieldAlert className="w-4 h-4 text-rose-500" />
          <span>Diagnostic Quality & Laterality Alerts ({discrepancies.length})</span>
        </div>
        <Button
          size="sm"
          variant="ghost"
          onClick={onClearAll}
          className="h-6 text-[11px] text-amber-700 dark:text-amber-300 hover:bg-amber-100 dark:hover:bg-amber-900/50 px-2"
        >
          Dismiss All
        </Button>
      </div>

      <div className="space-y-1.5">
        {discrepancies.map((d) => (
          <div
            key={d.id}
            className={`flex items-start justify-between gap-2 p-2 rounded-lg border ${
              d.lateralityConflict
                ? 'bg-rose-50 dark:bg-rose-950/60 border-rose-200 dark:border-rose-900 text-rose-900 dark:text-rose-200'
                : 'bg-white dark:bg-zinc-900 border-amber-200 dark:border-amber-900/40 text-zinc-800 dark:text-zinc-200'
            }`}
          >
            <div className="flex items-start gap-2">
              {d.lateralityConflict ? (
                <AlertTriangle className="w-3.5 h-3.5 text-rose-500 shrink-0 mt-0.5" />
              ) : (
                <AlertCircle className="w-3.5 h-3.5 text-amber-500 shrink-0 mt-0.5" />
              )}
              <div>
                <p className="font-medium leading-tight">{d.description}</p>
                {d.suggestedCorrection && (
                  <p className="text-[10px] text-zinc-500 dark:text-zinc-400 mt-0.5">
                    💡 Suggested: {d.suggestedCorrection}
                  </p>
                )}
              </div>
            </div>

            <div className="flex items-center gap-1 shrink-0">
              {onApplyFix && (
                <Button
                  size="sm"
                  variant="ghost"
                  onClick={() => onApplyFix(d)}
                  className="h-6 text-[10px] px-2 text-primary hover:bg-primary/10 gap-1 font-semibold"
                  title="Apply suggested fix automatically"
                >
                  <Zap className="w-3 h-3 text-primary fill-primary/20" />
                  Quick Fix
                </Button>
              )}
              <button
                type="button"
                onClick={() => onDismiss(d.id)}
                className="text-zinc-400 hover:text-zinc-600 dark:hover:text-zinc-200 p-0.5"
                title="Dismiss alert"
              >
                <X className="w-3.5 h-3.5" />
              </button>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
