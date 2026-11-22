'use client';

// Layer 4 (Presentation): HMIS Status & Claim Assignment Badge Subcomponent (<70 lines)
import React from 'react';
import { PlusCircle, UserCheck } from 'lucide-react';

interface HmisPatientStatusCellProps {
  isFinalOrPublished: boolean;
  hasDraft: boolean;
  isClaimedByMe: boolean;
  isClaimedByOther: boolean;
  assignedRadiologistName?: string | null;
  accessionNumber: string;
  onReleaseCase: (acc: string) => Promise<boolean>;
}

export function HmisPatientStatusCell({
  isFinalOrPublished,
  hasDraft,
  isClaimedByMe,
  isClaimedByOther,
  assignedRadiologistName,
  accessionNumber,
  onReleaseCase,
}: HmisPatientStatusCellProps) {
  return (
    <td className="py-3 px-3.5 min-w-[140px]" onClick={(e) => e.stopPropagation()}>
      <div className="flex flex-col gap-1.5">
        {isFinalOrPublished ? (
          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold bg-emerald-500/15 text-emerald-600 dark:text-emerald-400 border border-emerald-500/30 w-fit">
            <span className="w-1.5 h-1.5 rounded-full bg-emerald-500"></span>
            Published
          </span>
        ) : hasDraft ? (
          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold bg-amber-500/15 text-amber-600 dark:text-amber-400 border border-amber-500/30 w-fit">
            <span className="w-1.5 h-1.5 rounded-full bg-amber-500"></span>
            Draft Saved
          </span>
        ) : (
          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold bg-emerald-500/10 text-emerald-700 dark:text-emerald-300 border border-emerald-500/25 w-fit whitespace-nowrap">
            <PlusCircle className="w-2.5 h-2.5" />
            Result
          </span>
        )}

        {isClaimedByMe ? (
          <div className="flex items-center gap-1.5 text-[10px]">
            <span className="font-semibold text-amber-600 dark:text-amber-400 flex items-center gap-1">
              <UserCheck className="w-3 h-3" />
              Claimed by You
            </span>
            <button
              type="button"
              onClick={() => onReleaseCase(accessionNumber)}
              className="text-secondary/70 hover:text-rose-500 underline text-[10px] cursor-pointer"
              title="Release back to pool"
            >
              Release
            </button>
          </div>
        ) : isClaimedByOther ? (
          <span className="text-[10px] text-secondary flex items-center gap-1" title={assignedRadiologistName || 'Another doctor'}>
            <UserCheck className="w-3 h-3 text-secondary/60" />
            <span>Claimed: {assignedRadiologistName?.split(' ')[0] || 'Assigned'}</span>
          </span>
        ) : (
          <span className="text-[10px] text-secondary/60 font-medium">
            Unassigned
          </span>
        )}
      </div>
    </td>
  );
}
