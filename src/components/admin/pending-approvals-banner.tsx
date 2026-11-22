'use client';

import React from 'react';
import { Button } from '@/components/ui/button';
import { ShieldAlert, ArrowRight } from 'lucide-react';

interface PendingApprovalsBannerProps {
  count: number;
  onReview: () => void;
}

export function PendingApprovalsBanner({ count, onReview }: PendingApprovalsBannerProps) {
  if (count <= 0) return null;

  return (
    <div className="p-3.5 sm:p-4 rounded-xl bg-amber-500/10 border border-amber-500/30 flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-xs shadow-xs">
      <div className="flex items-center gap-3">
        <div className="w-9 h-9 rounded-lg bg-amber-500/20 flex items-center justify-center text-amber-500 shrink-0">
          <ShieldAlert className="w-5 h-5" />
        </div>
        <div>
          <div className="font-bold text-on-surface text-sm flex items-center gap-2">
            <span>{count} Clinician Account{count > 1 ? 's' : ''} Awaiting Approval</span>
            <span className="px-1.5 py-0.5 rounded-full bg-amber-500 text-white text-[10px] font-mono">
              Action Required
            </span>
          </div>
          <div className="text-[11px] text-secondary">
            Clinicians who signed in with Google or registered are held in the waitlist until an administrator activates them.
          </div>
        </div>
      </div>
      <Button
        size="sm"
        onClick={onReview}
        className="shrink-0 bg-amber-600 hover:bg-amber-700 text-white font-semibold text-xs h-8 gap-1.5 shadow-xs"
      >
        <span>Review Pending Requests ({count})</span>
        <ArrowRight className="w-3.5 h-3.5" />
      </Button>
    </div>
  );
}
