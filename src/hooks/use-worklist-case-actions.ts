'use client';

// Layer 4 (Presentation/Hooks): Worklist Case Mutation Actions & State Reducers (<160 lines)
import React from 'react';
import type { PacsStudyResult } from '@/types/pacs';
import {
  executeClaimCase,
  executeBatchClaim,
  executeReleaseCase,
  executeStatusChange,
  executeTrackCase,
  executeBatchDelete,
} from './worklist-actions';
import { notify } from '@/services/notification.service';

export function useWorklistCaseActions(
  setCases: React.Dispatch<React.SetStateAction<PacsStudyResult[]>>,
  setTotalCount: React.Dispatch<React.SetStateAction<number>>,
  setUpdatingId: React.Dispatch<React.SetStateAction<string | null>>,
  setTrackingId: React.Dispatch<React.SetStateAction<string | null>>
) {
  const handleClaimCase = async (accessionNumber: string) => {
    const res = await executeClaimCase(accessionNumber);
    if (res.success && res.claim) {
      setCases((prev) =>
        prev.map((c) =>
          c.accessionNumber === accessionNumber
            ? {
                ...c,
                assignedRadiologistId: res.claim.assignedRadiologistId ?? c.assignedRadiologistId,
                assignedRadiologistName: res.claim.assignedRadiologistName ?? c.assignedRadiologistName,
                claimedAt: res.claim.claimedAt ?? new Date().toISOString(),
              }
            : c
        )
      );
    } else {
      if (res.code === 'GOOGLE_DRIVE_REQUIRED') {
        notify.warning('Personal Google Drive connection is required for saving cases. Please connect Google Drive in Settings.');
      } else {
        notify.error(res.error || 'Failed to claim case');
      }
    }
  };

  const handleBatchClaimCases = async (accessionNumbers: string[]) => {
    if (!accessionNumbers.length) return;
    const res = await executeBatchClaim(accessionNumbers);
    if (res.success && res.claimed.length > 0) {
      const claimMap = new Map(res.claimed.map((cl: any) => [cl.accessionNumber, cl]));
      setCases((prev) =>
        prev.map((c) => {
          const cl = claimMap.get(c.accessionNumber);
          if (!cl) return c;
          return {
            ...c,
            assignedRadiologistId: cl.assignedRadiologistId ?? c.assignedRadiologistId,
            assignedRadiologistName: cl.assignedRadiologistName ?? c.assignedRadiologistName,
            claimedAt: cl.claimedAt ?? new Date().toISOString(),
          };
        })
      );
    }
    if (res.conflicts && res.conflicts.length > 0) {
      notify.warning(`${res.claimed.length} cases claimed. ${res.conflicts.length} cases were locked by another radiologist.`);
    } else if (!res.success) {
      notify.error(res.error || 'Failed to batch claim cases');
    }
    return res;
  };

  const handleReleaseCase = async (accessionNumber: string) => {
    const res = await executeReleaseCase(accessionNumber);
    if (!res.success) {
      notify.error(res.error || 'Failed to release case');
      return;
    }
    const releasedAccs = res.releasedAccessions || [accessionNumber];
    const releasedSet = new Set(releasedAccs.map((a: string) => a.toLowerCase()));
    notify.info(
      releasedAccs.length > 1
        ? `Patient unassigned: ${releasedAccs.length} companion studies released to pool.`
        : `Case ${accessionNumber} released back to worklist pool.`
    );
    setCases((prev) =>
      prev.map((c) =>
        releasedSet.has(c.accessionNumber.toLowerCase())
          ? { ...c, assignedRadiologistId: null, assignedRadiologistName: null, claimedAt: null }
          : c
      )
    );
  };

  const handleStatusChange = async (reportId?: string, studyId?: string, newStatus?: string, accessionNumber?: string) => {
    if (!newStatus) return;
    setUpdatingId(studyId || accessionNumber || 'updating');
    const res = await executeStatusChange(reportId, studyId, newStatus, accessionNumber);
    if (res.success) {
      setCases((prev) =>
        prev.map((c) => {
          const isMatch = (studyId && c.studyId === studyId) || (accessionNumber && c.accessionNumber === accessionNumber);
          return isMatch ? { ...c, status: newStatus as any, reportId: res.reportId || c.reportId } : c;
        })
      );
    } else {
      notify.error(res.error || 'Failed updating report status.');
    }
    setUpdatingId(null);
  };

  const handleTrackCase = async (accessionNumber: string) => {
    setTrackingId(accessionNumber);
    const res = await executeTrackCase(accessionNumber);
    if (res.success && res.tracking) {
      setCases((prev) =>
        prev.map((c) =>
          c.accessionNumber.toLowerCase() === accessionNumber.toLowerCase()
            ? {
                ...c,
                hmisStatus: res.tracking.hmisStatus,
                hmisLastCheckedAt: res.tracking.checkedAt,
                hmisMilestonesJson: JSON.stringify(res.tracking.milestones),
              }
            : c
        )
      );
    }
    setTrackingId(null);
  };

  const handleBatchDeleteCases = async (accessionNumbers: string[]) => {
    const res = await executeBatchDelete(accessionNumbers, { preserveReported: true, unassignedOnly: false });
    if (res.success) {
      const deletedSet = new Set(accessionNumbers.map((a) => a.toUpperCase()));
      setCases((prev) => prev.filter((c) => !deletedSet.has(c.accessionNumber.toUpperCase())));
      setTotalCount((t) => Math.max(0, t - (res.deletedCount || 0)));
      const msg =
        (res.skippedCount ?? 0) > 0
          ? `Removed ${res.deletedCount} cases (${res.skippedCount} protected cases kept)`
          : `Removed ${res.deletedCount} cases from index`;
      notify.success(msg);
    } else {
      notify.error(res.error || 'Failed to remove cases from index');
    }
    return res;
  };

  return {
    handleClaimCase,
    handleBatchClaimCases,
    handleReleaseCase,
    handleStatusChange,
    handleTrackCase,
    handleBatchDeleteCases,
  };
}
