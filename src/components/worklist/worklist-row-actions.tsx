'use client';

import React from 'react';
import Link from 'next/link';
import { Eye, MonitorPlay, Trash2, Printer, Share2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { WorklistQuickHmisButton } from './worklist-quick-hmis-button';
import { WorklistSyncDemographicsButton } from './worklist-sync-demographics-button';
import { isSameRadiologistUser } from '@/services/unified-case-filters';
import type { PacsStudyResult } from '@/types/pacs';

interface WorklistRowActionsProps {
  study: PacsStudyResult;
  isMyCases?: boolean;
  onRefresh?: () => void;
  currentUserId?: string;
  currentUserName?: string;
  onEditPatient?: (study: PacsStudyResult) => void;
  onOpenReportModal?: (study: PacsStudyResult) => void;
  onOpenOfficialReport?: (study: PacsStudyResult) => void;
  onDeleteCase?: (study: PacsStudyResult) => void;
  onShareCase?: (study: PacsStudyResult) => void;
}

export function WorklistRowActions({
  study,
  isMyCases = false,
  onRefresh,
  currentUserId,
  currentUserName,
  onOpenReportModal,
  onOpenOfficialReport,
  onDeleteCase,
  onShareCase,
}: WorklistRowActionsProps) {
  const isTakenUpByMe = Boolean(
    isMyCases || isSameRadiologistUser(study.assignedRadiologistId, currentUserId)
  );

  return (
    <div className="flex items-center justify-end gap-1.5" onClick={(e) => e.stopPropagation()}>
      {isTakenUpByMe && (
        <WorklistSyncDemographicsButton
          study={study}
          onRefresh={onRefresh}
        />
      )}

      {isTakenUpByMe && (
        <WorklistQuickHmisButton
          study={study}
          onSuccess={onRefresh}
          currentUserName={currentUserName}
        />
      )}

      {onShareCase && (
        <button
          type="button"
          onClick={() => onShareCase(study)}
          title={`Share study ${study.accessionNumber} with consultant`}
          className="p-1.5 rounded-lg border border-outline-variant/60 text-secondary hover:text-emerald-600 dark:hover:text-emerald-400 hover:border-emerald-500/40 hover:bg-emerald-500/10 transition-colors cursor-pointer"
        >
          <Share2 className="w-3.5 h-3.5" />
        </button>
      )}

      {onDeleteCase && (
        <button
          type="button"
          onClick={() => onDeleteCase(study)}
          title={`Delete study ${study.accessionNumber} from local index`}
          className="p-1.5 rounded-lg border border-outline-variant/60 text-secondary hover:text-rose-600 hover:border-rose-500/40 hover:bg-rose-500/10 transition-colors cursor-pointer"
        >
          <Trash2 className="w-3.5 h-3.5" />
        </button>
      )}

      {onOpenOfficialReport && (
        <Button
          size="sm"
          variant="outline"
          onClick={() => onOpenOfficialReport(study)}
          title="Print Official Report for Patient"
          className="gap-1 text-xs px-2 py-1 border-emerald-500/30 text-emerald-600 dark:text-emerald-400 hover:bg-emerald-500/10 cursor-pointer"
        >
          <Printer className="w-3.5 h-3.5" />
          <span className="hidden xl:inline text-[11px]">Print</span>
        </Button>
      )}

      <Button
        size="sm"
        variant="secondary"
        onClick={() => onOpenReportModal?.(study)}
        title="Open Quick Report Modal"
        className="gap-1 text-xs px-2.5 py-1 cursor-pointer hover:bg-surface-container-high"
      >
        <Eye className="w-3.5 h-3.5 text-primary" />
        <span>Read</span>
      </Button>

      <Link href={`/workspace/${encodeURIComponent(study.accessionNumber)}?mode=report`}>
        <Button
          size="sm"
          variant="outline"
          title="Open Full Workspace"
          className="gap-1 text-xs px-2 py-1 border-outline-variant/60 cursor-pointer"
        >
          <MonitorPlay className="w-3.5 h-3.5 text-secondary hover:text-primary" />
          <span className="hidden lg:inline text-[11px]">Open</span>
        </Button>
      </Link>
    </div>
  );
}
