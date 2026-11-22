'use client';

import React from 'react';
import { useRouter } from 'next/navigation';
import { Clock, RefreshCw, UserMinus } from 'lucide-react';
import { formatDicomDateTime, formatTime } from '@/lib/utils';
import {
  WorklistSourceBadge,
  WorklistPendingBadge,
} from './worklist-badges';
import { WorklistPatientCell } from './worklist-patient-cell';
import { WorklistMultiStudyList } from './worklist-multi-study-list';
import { WorklistRowActions } from './worklist-row-actions';
import { WorklistLifecycleCell } from './worklist-lifecycle-cell';
import type { PacsStudyResult } from '@/types/pacs';

interface WorklistRowItemProps {
  study: PacsStudyResult;
  isMyCases?: boolean;
  isSelected?: boolean;
  onToggleSelect?: (accessionNumber: string) => void;
  onStatusChange?: (reportId: string | undefined, studyId: string | undefined, newStatus: string, accessionNumber?: string) => void;
  onOpenReportModal?: (study: PacsStudyResult) => void;
  onOpenOfficialReport?: (study: PacsStudyResult) => void;
  onOpenMergeModal?: (study: PacsStudyResult) => void;
  onOpenPendingModal?: (study: PacsStudyResult) => void;
  onEditPatient?: (study: PacsStudyResult) => void;
  onDeleteCase?: (study: PacsStudyResult) => void;
  onShareCase?: (study: PacsStudyResult) => void;
  onFilterPatientMrn?: (mrn: string) => void;
  onClaimCase?: (accessionNumber: string) => void;
  onReleaseCase?: (accessionNumber: string) => void;
  onTrackCase?: (accessionNumber: string) => void;
  trackingCase?: boolean;
  currentUserId?: string;
  currentUserName?: string;
  updatingStatus?: boolean;
  onRefresh?: () => void;
}

export function WorklistRowItem({
  study,
  isMyCases = false,
  isSelected,
  onToggleSelect,
  onStatusChange,
  onOpenReportModal,
  onOpenOfficialReport,
  onOpenMergeModal,
  onOpenPendingModal,
  onEditPatient,
  onDeleteCase,
  onShareCase,
  onFilterPatientMrn,
  onClaimCase,
  onReleaseCase,
  onTrackCase,
  trackingCase,
  currentUserId,
  currentUserName,
  updatingStatus,
  onRefresh,
}: WorklistRowItemProps) {
  const router = useRouter();
  const isStat = (study.priority || '').toLowerCase() === 'stat';
  const currentStatus = study.status || 'scheduled';

  return (
    <tr
      onClick={() => router.push(`/workstation/${encodeURIComponent(study.accessionNumber)}`)}
      className={`hover:bg-surface-container/60 transition-colors group cursor-pointer text-xs ${
        isSelected ? 'bg-primary/5 dark:bg-primary/10' : ''
      }`}
    >
      {/* 1. Selection Checkbox */}
      <td className="py-2.5 px-3 text-center w-10" onClick={(e) => e.stopPropagation()}>
        <input
          type="checkbox"
          checked={Boolean(isSelected)}
          onChange={() => onToggleSelect?.(study.accessionNumber)}
          className="rounded border-outline-variant text-primary focus:ring-primary h-4 w-4 cursor-pointer align-middle"
          aria-label={`Select case ${study.accessionNumber}`}
        />
      </td>

      {/* 2. Patient & Identifiers (Consolidated) */}
      <WorklistPatientCell
        study={study}
        isMyCases={isMyCases}
        onRefresh={onRefresh}
        onEditPatient={onEditPatient}
        onOpenMergeModal={onOpenMergeModal}
        onFilterPatientMrn={onFilterPatientMrn}
      />

      {/* 3. Study & Modality (Single or Multi-Study Order) */}
      <td className="py-2.5 px-4 w-[220px] max-w-[250px] min-w-[160px]">
        <WorklistMultiStudyList study={study} isStat={isStat} />
      </td>

      {/* 4. Date (Taken & Scan) */}
      <td className="py-2.5 px-4 min-w-[130px] whitespace-nowrap" onClick={(e) => e.stopPropagation()}>
        {study.claimedAt || isMyCases ? (
          <div>
            <div className="text-on-surface font-medium text-[11px] font-mono flex items-center gap-1.5">
              <span className="text-[10px] font-semibold text-primary font-sans">Taken:</span>
              <span>{formatDicomDateTime(study.claimedAt || study.studyDate)}</span>
            </div>
            <div className="text-secondary text-[10px] font-mono mt-0.5 flex items-center gap-1.5" title="Original HMIS / Study Acquisition Date">
              <span className="text-[10px] text-secondary/70 font-sans">Scan:</span>
              <span>{formatDicomDateTime(study.studyDate, study.studyTime)}</span>
            </div>
          </div>
        ) : (
          <div className="text-on-surface font-medium text-[11px] font-mono">
            {formatDicomDateTime(study.studyDate, study.studyTime)}
          </div>
        )}
        <div className="mt-1">
          <WorklistSourceBadge
            source={study.source}
            hmisStatus={study.hmisStatus}
            currentStatus={currentStatus}
          />
        </div>
      </td>

      {/* 5. Status & Lifecycle */}
      <td className="py-2.5 px-4 min-w-[150px]" onClick={(e) => e.stopPropagation()}>
        <WorklistLifecycleCell
          study={study}
          currentStatus={currentStatus}
          updatingStatus={updatingStatus}
          isMyCases={isMyCases}
          currentUserId={currentUserId}
          onStatusChange={onStatusChange}
          onOpenPendingModal={onOpenPendingModal}
          onReleaseCase={onReleaseCase}
          onClaimCase={onClaimCase}
        />
      </td>

      {/* 6. Actions */}
      <td className="py-3 px-4 text-right w-[150px]">
        <WorklistRowActions
          study={study}
          isMyCases={isMyCases}
          onRefresh={onRefresh}
          currentUserId={currentUserId}
          currentUserName={currentUserName}
          onOpenReportModal={onOpenReportModal}
          onOpenOfficialReport={onOpenOfficialReport}
          onDeleteCase={onDeleteCase}
          onShareCase={onShareCase}
        />
      </td>
    </tr>
  );
}
