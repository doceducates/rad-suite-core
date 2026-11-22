'use client';

import React from 'react';
import { GitMerge, Loader2 } from 'lucide-react';
import { Button } from '@/components/ui/button';

export interface ConflictInfo {
  accessionNumber: string;
  patientName?: string;
  patientMrn?: string;
  scanType?: string;
  message?: string;
}

interface ConflictMergeBannerProps {
  conflictInfo: ConflictInfo;
  merging: boolean;
  onMerge: (targetAccession: string) => void;
}

export function ConflictMergeBanner({ conflictInfo, merging, onMerge }: ConflictMergeBannerProps) {
  return (
    <div className="p-3.5 rounded-xl bg-amber-500/10 text-amber-700 dark:text-amber-300 border border-amber-500/30 text-xs space-y-2">
      <div className="flex items-center gap-2 font-bold">
        <GitMerge className="w-4 h-4 text-amber-600 shrink-0" />
        <span>Existing Study Conflict Detected ({conflictInfo.accessionNumber})</span>
      </div>
      <p className="text-[11px] leading-relaxed">
        {conflictInfo.message || `An existing case with accession "${conflictInfo.accessionNumber}" was found.`}
      </p>
      <div className="flex items-center gap-2 pt-1 flex-wrap">
        <Button
          type="button"
          size="sm"
          disabled={merging}
          onClick={() => onMerge(conflictInfo.accessionNumber)}
          className="gap-1.5 bg-amber-600 hover:bg-amber-700 text-white text-xs font-semibold cursor-pointer shadow-xs"
        >
          {merging ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <GitMerge className="w-3.5 h-3.5" />}
          <span>Shift Report to {conflictInfo.accessionNumber}</span>
        </Button>
      </div>
    </div>
  );
}
