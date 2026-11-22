'use client';

// Layer 4 (Presentation): HMIS Patient Actions Cell Subcomponent (<90 lines)
import React from 'react';
import { Button } from '@/components/ui/button';
import {
  FileEdit,
  PlusCircle,
  Eye,
  Compass,
  UserPlus,
  Trash2,
  RefreshCw,
  Share2,
} from 'lucide-react';
import type { PacsStudyResult } from '@/types/pacs';

interface HmisPatientActionsCellProps {
  study: PacsStudyResult;
  isClaimedByMe: boolean;
  isFinalOrPublished: boolean;
  hasDraft: boolean;
  onResultClick: (e: React.MouseEvent) => void;
  onClaimCase: (acc: string) => Promise<boolean>;
  onTrackCase: (acc: string) => Promise<void>;
  trackingCase?: boolean;
  onDeleteCase?: (st: PacsStudyResult) => void;
  onShareCase?: (st: PacsStudyResult) => void;
}

export function HmisPatientActionsCell({
  study,
  isClaimedByMe,
  isFinalOrPublished,
  hasDraft,
  onResultClick,
  onClaimCase,
  onTrackCase,
  trackingCase,
  onDeleteCase,
  onShareCase,
}: HmisPatientActionsCellProps) {
  return (
    <td className="py-3 px-3.5 text-right w-[150px]" onClick={(e) => e.stopPropagation()}>
      <div className="flex items-center justify-end gap-1.5">
        <Button
          size="sm"
          variant={isFinalOrPublished ? 'secondary' : hasDraft ? 'outline' : 'primary'}
          onClick={onResultClick}
          title={isClaimedByMe ? 'Open Report Editor' : 'Claim case & Open Report Editor'}
          className="gap-1 text-xs px-2 py-1 font-semibold cursor-pointer shadow-2xs whitespace-nowrap"
        >
          {isFinalOrPublished ? (
            <>
              <Eye className="w-3.5 h-3.5" />
              <span>View</span>
            </>
          ) : hasDraft ? (
            <>
              <FileEdit className="w-3.5 h-3.5 text-amber-500" />
              <span>Edit</span>
            </>
          ) : (
            <>
              <PlusCircle className="w-3.5 h-3.5" />
              <span>Result</span>
            </>
          )}
        </Button>

        {onShareCase && (
          <button
            type="button"
            onClick={() => onShareCase(study)}
            title="Share case with supervising consultant (Password-protected review link)"
            className="p-1.5 h-7 w-7 rounded-lg border border-outline-variant/60 text-secondary hover:text-emerald-600 dark:hover:text-emerald-400 hover:border-emerald-500/40 hover:bg-emerald-500/10 flex items-center justify-center transition-colors cursor-pointer"
          >
            <Share2 className="w-3.5 h-3.5" />
          </button>
        )}

        {!study.assignedRadiologistId && (
          <Button
            size="sm"
            variant="outline"
            onClick={() => onClaimCase(study.accessionNumber)}
            title="Claim this case to My Cases"
            className="p-1.5 h-7 w-7 border-outline-variant/60 text-secondary hover:text-primary hover:border-primary/40 cursor-pointer"
          >
            <UserPlus className="w-3.5 h-3.5" />
          </Button>
        )}

        <Button
          size="sm"
          variant="ghost"
          onClick={() => onTrackCase(study.accessionNumber)}
          title="Trace patient journey on HMIS portal"
          className="p-1.5 h-7 w-7 text-secondary hover:text-on-surface cursor-pointer"
        >
          {trackingCase ? (
            <RefreshCw className="w-3.5 h-3.5 animate-spin text-primary" />
          ) : (
            <Compass className="w-3.5 h-3.5" />
          )}
        </Button>

        {onDeleteCase && study.isManual && (
          <button
            type="button"
            onClick={() => onDeleteCase(study)}
            title="Delete manual test entry"
            className="p-1.5 text-secondary hover:text-rose-500 transition-colors cursor-pointer"
          >
            <Trash2 className="w-3.5 h-3.5" />
          </button>
        )}
      </div>
    </td>
  );
}
