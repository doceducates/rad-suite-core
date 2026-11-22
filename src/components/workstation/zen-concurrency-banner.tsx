'use client';

import React from 'react';
import { Eye, Lock, CheckCircle2 } from 'lucide-react';
import { Button } from '@/components/ui/button';

interface ZenConcurrencyBannerProps {
  accessionNumber?: string;
  isTakenUpByMe?: boolean;
  isClaimedByOther?: boolean;
  claimedByName?: string;
  onClaimCase?: () => void;
  claimingCase?: boolean;
}

export function ZenConcurrencyBanner({
  accessionNumber,
  isTakenUpByMe,
  isClaimedByOther,
  claimedByName,
  onClaimCase,
  claimingCase,
}: ZenConcurrencyBannerProps) {
  if (!accessionNumber) return null;

  if (isClaimedByOther) {
    return (
      <div className="mx-4 my-2 p-2.5 rounded-xl border border-amber-500/30 bg-amber-500/10 flex items-center justify-between shrink-0 shadow-xs animate-in fade-in duration-200">
        <div className="flex items-center gap-2.5">
          <div className="w-7 h-7 rounded-lg bg-amber-500/20 text-amber-500 flex items-center justify-center shrink-0">
            <Lock className="w-4 h-4" />
          </div>
          <div>
            <div className="text-xs font-bold text-amber-600 dark:text-amber-400">
              Locked by Dr. {claimedByName || 'Another Radiologist'}
            </div>
            <div className="text-[11px] text-muted-foreground">
              This case is claimed and currently being reported. Your viewport is in View-Only observation mode.
            </div>
          </div>
        </div>
      </div>
    );
  }

  if (!isTakenUpByMe) {
    return (
      <div className="mx-4 my-2 p-2.5 rounded-xl border border-primary/30 bg-primary/5 flex items-center justify-between shrink-0 shadow-xs animate-in fade-in duration-200">
        <div className="flex items-center gap-2.5">
          <div className="w-7 h-7 rounded-lg bg-primary/10 text-primary flex items-center justify-center shrink-0">
            <Eye className="w-4 h-4" />
          </div>
          <div>
            <div className="text-xs font-bold text-foreground">
              Observation Mode (Unclaimed Case)
            </div>
            <div className="text-[11px] text-muted-foreground">
              You can inspect DICOM series freely. Click Take Up Case to begin dictating and editing this report.
            </div>
          </div>
        </div>

        {onClaimCase && (
          <Button
            size="sm"
            onClick={onClaimCase}
            isLoading={claimingCase}
            className="h-8 text-xs px-3.5 font-bold gap-1.5 shrink-0 shadow-xs"
          >
            <CheckCircle2 className="w-3.5 h-3.5" />
            <span>Take Up Case</span>
          </Button>
        )}
      </div>
    );
  }

  return null;
}
