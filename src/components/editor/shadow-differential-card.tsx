'use client';

import { Lightbulb, Plus } from 'lucide-react';
import { Button } from '@/components/ui/button';

interface ShadowDifferentialCardProps {
  shadowDifferentials: string[];
  onInsertToImpression?: (text: string) => void;
}

export function ShadowDifferentialCard({
  shadowDifferentials,
  onInsertToImpression,
}: ShadowDifferentialCardProps) {
  if (!shadowDifferentials || shadowDifferentials.length === 0) return null;

  return (
    <div className="rounded-xl border border-indigo-200 dark:border-indigo-900/60 bg-indigo-50/40 dark:bg-indigo-950/30 p-3 space-y-2 text-xs shadow-sm">
      <div className="flex items-center gap-1.5 font-bold text-indigo-950 dark:text-indigo-200">
        <Lightbulb className="w-3.5 h-3.5 text-indigo-500" />
        <span>Cognitive Shadow-Differentials & Counter-Checks</span>
      </div>

      <div className="space-y-1.5">
        {shadowDifferentials.map((item, idx) => (
          <div
            key={idx}
            className="flex items-center justify-between gap-2 p-2 rounded-lg bg-white dark:bg-zinc-900 border border-indigo-100 dark:border-indigo-900/40"
          >
            <p className="text-[11px] text-zinc-800 dark:text-zinc-200 leading-tight flex-1">
              • {item}
            </p>
            {onInsertToImpression && (
              <Button
                size="sm"
                variant="ghost"
                onClick={() => onInsertToImpression(item)}
                className="h-6 text-[10px] text-indigo-600 dark:text-indigo-400 hover:bg-indigo-50 dark:hover:bg-indigo-950 px-2 gap-1 shrink-0"
              >
                <Plus className="w-3 h-3" /> Add to Impression
              </Button>
            )}
          </div>
        ))}
      </div>
    </div>
  );
}
