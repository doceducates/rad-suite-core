'use client';

// Layer 4 (Presentation): Unified Worklist Status & Clinical Lifecycle Cell
// Strict File Size Invariant: Target < 250 lines, max 350 lines

import React, { useState } from 'react';
import { WorklistStatusActionMenu } from './worklist-status-action-menu';
import { WorklistStatusConflictModal } from './worklist-status-conflict-modal';
import { WorklistPendingBadge } from './worklist-badges';
import { UserMinus, FileText, ExternalLink } from 'lucide-react';
import { isSameRadiologistUser } from '@/services/unified-case-filters';
import type { PacsStudyResult } from '@/types/pacs';

export interface WorklistLifecycleCellProps {
  study: PacsStudyResult;
  currentStatus: string;
  updatingStatus?: boolean;
  isMyCases?: boolean;
  currentUserId?: string;
  onStatusChange?: (
    reportId: string | undefined,
    studyId: string | undefined,
    newStatus: string,
    accessionNumber?: string
  ) => void;
  onOpenPendingModal?: (study: PacsStudyResult) => void;
  onReleaseCase?: (accession: string) => void;
  onClaimCase?: (accession: string) => void;
}

export function WorklistLifecycleCell({
  study,
  currentStatus,
  updatingStatus = false,
  isMyCases = false,
  currentUserId,
  onStatusChange,
  onOpenPendingModal,
  onReleaseCase,
  onClaimCase,
}: WorklistLifecycleCellProps) {
  const isPendingAck =
    study.hmisStatus === 'pending_tech_ack' ||
    (study.hmisStatus?.toLowerCase().includes('pending') && study.status === 'scheduled');

  const isPublished =
    currentStatus === 'final' ||
    currentStatus === 'finalized' ||
    study.hmisStatus === 'published' ||
    study.hmisStatus === 'verified';

  // Base64 encoded investigation ID or numeric ID for signed PDF direct link
  const pdfId = study.hmisInvestigationId
    ? Buffer.from(study.hmisInvestigationId).toString('base64')
    : null;

  // Conflict Resolution State
  const [conflictTarget, setConflictTarget] = useState<string | null>(null);

  const handleStatusSelect = (next: string) => {
    const isHmisPublished = study.hmisStatus === 'published';
    const isTargetNonFinal = next !== 'final' && next !== 'amended';

    // Conflict 1: Case is Published on HMIS portal, but user is changing local status to Prelim/Pending/etc.
    if (isHmisPublished && isTargetNonFinal) {
      setConflictTarget(next);
      return;
    }

    // Conflict 2: Case is NOT published on HMIS, but user is selecting Published / Final
    if (!isHmisPublished && next === 'final' && currentStatus !== 'final') {
      setConflictTarget(next);
      return;
    }

    // No conflict: proceed directly
    if (next === 'pending' && onOpenPendingModal) {
      onOpenPendingModal(study);
    } else if (onStatusChange) {
      onStatusChange(study.reportId, study.studyId, next, study.accessionNumber);
    }
  };

  const handleConfirmConflict = () => {
    if (!conflictTarget) return;
    const target = conflictTarget;
    setConflictTarget(null);

    if (target === 'pending' && onOpenPendingModal) {
      onOpenPendingModal(study);
    } else if (onStatusChange) {
      onStatusChange(study.reportId, study.studyId, target, study.accessionNumber);
    }
  };

  return (
    <div className="flex flex-col gap-1 items-start min-w-[150px]" onClick={(e) => e.stopPropagation()}>
      {/* 1. Primary Reporting Lifecycle Action / Badge */}
      <div className="flex items-center gap-1.5 flex-wrap">
        {onStatusChange ? (
          <WorklistStatusActionMenu
            value={currentStatus}
            disabled={updatingStatus}
            triggerMode="badge"
            onChange={handleStatusSelect}
          />
        ) : (
          <span className="px-2 py-0.5 rounded border font-semibold text-[11px] bg-surface-container text-secondary">
            {currentStatus}
          </span>
        )}

        {/* Radiographer Intake Warning: Stuck at Intake */}
        {isPendingAck && (
          <span
            className="inline-flex items-center gap-0.5 px-1.5 py-0.5 rounded text-[10px] font-bold bg-amber-500/15 text-amber-700 dark:text-amber-400 border border-amber-500/30"
            title="Radiographer has not acknowledged yet in HMIS intake. Patient cannot receive report until acknowledged."
          >
            <span>⚠️ No Ack</span>
          </span>
        )}

        {/* 1-Click Signed PDF Link when Published */}
        {isPublished && (
          <a
            href={
              pdfId
                ? `https://hmis.punjab.gov.pk/radiology/published-report-pdf/${pdfId}`
                : `/api/hmis/published/pdf/${study.accessionNumber}`
            }
            target="_blank"
            rel="noreferrer"
            title="Open official signed HMIS PDF"
            className="inline-flex items-center gap-0.5 px-1.5 py-0.5 rounded text-[10px] font-bold bg-emerald-500/15 text-emerald-700 dark:text-emerald-400 border border-emerald-500/30 hover:bg-emerald-500/25 transition-colors cursor-pointer"
          >
            <FileText className="w-3 h-3" />
            <span>PDF</span>
          </a>
        )}
      </div>

      {/* Clinical Hold / Pending Reason */}
      {(currentStatus === 'pending' || Boolean(study.pendingReason)) && (
        <div className="mt-0.5">
          <WorklistPendingBadge
            study={study}
            onClick={onOpenPendingModal ? () => onOpenPendingModal(study) : undefined}
          />
        </div>
      )}

      {/* 2. Claim State & Ownership */}
      <div className="flex items-center gap-1.5 text-[10px] text-secondary">
        {isMyCases ? (
          <div className="flex items-center gap-1">
            <span className="font-semibold text-amber-600 dark:text-amber-400">⭐ Yours</span>
            {onReleaseCase && (
              <>
                <span className="text-secondary/40">·</span>
                <button
                  type="button"
                  onClick={() => onReleaseCase(study.accessionNumber)}
                  title="Release case back to general hospital worklist pool"
                  className="hover:text-amber-600 hover:underline cursor-pointer"
                >
                  Release
                </button>
              </>
            )}
          </div>
        ) : study.assignedRadiologistId ? (
          <div className="flex items-center gap-1">
            {isSameRadiologistUser(study.assignedRadiologistId, currentUserId) ? (
              <span className="font-semibold text-amber-600 dark:text-amber-400">⭐ Claimed by You</span>
            ) : (
              <span className="text-secondary/80">🔒 {study.assignedRadiologistName || 'Assigned'}</span>
            )}
            {(!currentUserId || isSameRadiologistUser(study.assignedRadiologistId, currentUserId)) && onReleaseCase && (
              <>
                <span className="text-secondary/40">·</span>
                <button
                  type="button"
                  onClick={() => onReleaseCase(study.accessionNumber)}
                  title="Release case back to pool"
                  className="hover:text-amber-600 hover:underline cursor-pointer"
                >
                  Release
                </button>
              </>
            )}
          </div>
        ) : onClaimCase ? (
          <button
            type="button"
            onClick={() => onClaimCase(study.accessionNumber)}
            title="Claim case to My Cases"
            className="text-secondary/60 hover:text-primary hover:underline cursor-pointer"
          >
            + Claim Case
          </button>
        ) : (
          <span className="text-secondary/50">Unclaimed</span>
        )}
      </div>

      {/* 3. Status Conflict Resolution Dialog */}
      {conflictTarget && (
        <WorklistStatusConflictModal
          isOpen={Boolean(conflictTarget)}
          onClose={() => setConflictTarget(null)}
          study={study}
          targetStatus={conflictTarget}
          onConfirm={handleConfirmConflict}
        />
      )}
    </div>
  );
}
