'use client';

import { useMemo } from 'react';
import { X, Check, RotateCcw, GitCompare, GraduationCap } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';

interface MorningRoundsDiffProps {
  isOpen: boolean;
  onClose: () => void;
  pgrDraftFindings: string;
  consultantFindings: string;
  pgrDraftImpression: string;
  consultantImpression: string;
  onApproveAndLock: () => void;
  onRevertToPgr: () => void;
}

function renderWordDiff(oldText: string, newText: string) {
  const cleanOld = oldText.replace(/<[^>]*>/g, ' ').replace(/\s+/g, ' ').trim();
  const cleanNew = newText.replace(/<[^>]*>/g, ' ').replace(/\s+/g, ' ').trim();

  if (cleanOld === cleanNew) {
    return <span className="text-zinc-700 dark:text-zinc-300">{cleanNew || 'No text entered.'}</span>;
  }

  const oldWords = cleanOld.split(' ').filter(Boolean);
  const newWords = cleanNew.split(' ').filter(Boolean);

  const oldSet = new Set(oldWords.map((w) => w.toLowerCase()));
  const newSet = new Set(newWords.map((w) => w.toLowerCase()));

  return (
    <div className="space-y-2">
      <div className="text-xs leading-relaxed">
        {newWords.map((word, idx) => {
          const isAdded = !oldSet.has(word.toLowerCase());
          return isAdded ? (
            <span key={idx} className="bg-emerald-100 dark:bg-emerald-950/70 text-emerald-800 dark:text-emerald-300 font-semibold px-1 py-0.5 rounded mr-1">
              +{word}
            </span>
          ) : (
            <span key={idx} className="mr-1 text-zinc-800 dark:text-zinc-200">
              {word}
            </span>
          );
        })}
      </div>

      {oldWords.some((w) => !newSet.has(w.toLowerCase())) && (
        <div className="pt-2 border-t border-zinc-200 dark:border-zinc-800 text-[11px] text-zinc-500">
          <span className="font-semibold text-rose-600 dark:text-rose-400 mr-1.5">Removed by Consultant:</span>
          {oldWords.map((word, idx) => {
            const isRemoved = !newSet.has(word.toLowerCase());
            return isRemoved ? (
              <span key={idx} className="line-through bg-rose-100 dark:bg-rose-950/60 text-rose-700 dark:text-rose-300 px-1 py-0.5 rounded mr-1">
                {word}
              </span>
            ) : null;
          })}
        </div>
      )}
    </div>
  );
}

export function MorningRoundsDiff({
  isOpen,
  onClose,
  pgrDraftFindings,
  consultantFindings,
  pgrDraftImpression,
  consultantImpression,
  onApproveAndLock,
  onRevertToPgr,
}: MorningRoundsDiffProps) {
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-xs p-4 text-xs">
      <div className="w-full max-w-3xl bg-white dark:bg-slate-900 rounded-2xl border border-zinc-200 dark:border-zinc-800 shadow-2xl flex flex-col max-h-[90vh] overflow-hidden">
        {/* Header */}
        <div className="flex items-center justify-between p-4 border-b border-zinc-200 dark:border-zinc-800 bg-zinc-50 dark:bg-zinc-950">
          <div className="flex items-center gap-2.5">
            <div className="p-1.5 rounded-lg bg-indigo-600 text-white">
              <GraduationCap className="w-4 h-4" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h3 className="font-bold text-sm text-zinc-900 dark:text-zinc-100">
                  Morning Rounds Discussion & Track-Changes
                </h3>
                <Badge variant="outline" className="text-[10px] text-indigo-500 border-indigo-500/30">
                  PGR $\leftrightarrow$ Consultant Diff
                </Badge>
              </div>
              <p className="text-[11px] text-zinc-500">Live red/green review comparing Resident draft to Consultant adjustments</p>
            </div>
          </div>
          <button onClick={onClose} className="text-zinc-400 hover:text-zinc-600 dark:hover:text-zinc-200">
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Content */}
        <div className="p-4 space-y-4 overflow-y-auto flex-1">
          <div className="p-3 rounded-xl border border-zinc-200 dark:border-zinc-800 bg-zinc-50/50 dark:bg-zinc-950/40">
            <span className="font-bold uppercase tracking-wider text-[10px] text-zinc-500 dark:text-zinc-400 block mb-1.5">
              Findings (Comparison & Additions)
            </span>
            {renderWordDiff(pgrDraftFindings, consultantFindings)}
          </div>

          <div className="p-3 rounded-xl border border-zinc-200 dark:border-zinc-800 bg-zinc-50/50 dark:bg-zinc-950/40">
            <span className="font-bold uppercase tracking-wider text-[10px] text-zinc-500 dark:text-zinc-400 block mb-1.5">
              Impression & Conclusion Diff
            </span>
            {renderWordDiff(pgrDraftImpression, consultantImpression)}
          </div>
        </div>

        {/* Footer */}
        <div className="flex items-center justify-between p-3 border-t border-zinc-200 dark:border-zinc-800 bg-zinc-50 dark:bg-zinc-950">
          <Button size="sm" variant="ghost" onClick={onRevertToPgr} className="gap-1 text-xs text-rose-500 hover:bg-rose-50 dark:hover:bg-rose-950/40">
            <RotateCcw className="w-3.5 h-3.5" /> Revert to PGR Draft
          </Button>

          <div className="flex items-center gap-2">
            <Button size="sm" variant="outline" onClick={onClose}>
              Continue Editing
            </Button>
            <Button size="sm" variant="primary" onClick={() => { onApproveAndLock(); onClose(); }} className="gap-1 font-semibold">
              <Check className="w-3.5 h-3.5" /> Approve & Lock for HMIS
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
}
