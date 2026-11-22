'use client';

import React from 'react';
import { formatTime, formatDicomDateTime } from '@/lib/utils';
import type { PacsStudyResult } from '@/types/pacs';

export function WorklistSourceBadge({
  source,
  hmisStatus,
  currentStatus,
}: {
  source?: string | null;
  hmisStatus?: string | null;
  currentStatus?: string | null;
}) {
  const normHmis = (hmisStatus || '').toLowerCase();
  const normCurrent = (currentStatus || '').toLowerCase();

  if (normHmis === 'published' || normCurrent === 'final' || normCurrent === 'finalized') {
    return (
      <span
        className="text-[10px] font-mono px-1.5 py-0.5 rounded bg-emerald-500/15 text-emerald-600 dark:text-emerald-400 border border-emerald-500/30 font-semibold"
        title="Verified & Published on HMIS Portal"
      >
        Published
      </span>
    );
  }
  if (normHmis === 'verified') {
    return (
      <span
        className="text-[10px] font-mono px-1.5 py-0.5 rounded bg-teal-500/15 text-teal-600 dark:text-teal-400 border border-teal-500/30 font-semibold"
        title="Consultant Verified on HMIS Portal"
      >
        Verified
      </span>
    );
  }
  if (normHmis === 'pending_tech_ack') {
    return (
      <span
        className="text-[10px] font-mono px-1.5 py-0.5 rounded bg-amber-500/15 text-amber-600 dark:text-amber-400 border border-amber-500/30 font-semibold"
        title="Pending Console Technologist Acknowledgment"
      >
        Tech Ack
      </span>
    );
  }
  if (source === 'manual') {
    return <span className="text-[10px] font-mono px-1.5 py-0.5 rounded bg-amber-500/10 text-amber-600 dark:text-amber-400 border border-amber-500/20">Manual Entry</span>;
  }
  if (source === 's3') {
    return <span className="text-[10px] font-mono px-1.5 py-0.5 rounded bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border border-emerald-500/20">S3 Cloud</span>;
  }
  if (source === 'local_archive' || source === 'local') {
    return <span className="text-[10px] font-mono px-1.5 py-0.5 rounded bg-blue-500/10 text-blue-600 dark:text-blue-400 border border-blue-500/20">Local Disk</span>;
  }
  if (source === 'hospital_pacs' || source === 'pacs') {
    return <span className="text-[10px] font-mono px-1.5 py-0.5 rounded bg-teal-500/10 text-teal-600 dark:text-teal-400 border border-teal-500/20">PACS Archive</span>;
  }
  if (source === 'hmis') {
    return <span className="text-[10px] font-mono px-1.5 py-0.5 rounded bg-sky-500/10 text-sky-600 dark:text-sky-400 border border-sky-500/20">HMIS Portal</span>;
  }
  return <span className="text-[10px] font-mono px-1.5 py-0.5 rounded bg-purple-500/10 text-purple-600 dark:text-purple-400 border border-purple-500/20">Worklist DB</span>;
}

export function WorklistDepartmentBadge({ department }: { department?: string }) {
  if (!department) return null;
  const dept = department.toLowerCase();
  if (dept.includes('er') || dept.includes('emergency')) {
    return (
      <span className="text-[10px] font-semibold px-1.5 py-0.5 rounded bg-rose-500/15 text-rose-600 dark:text-rose-400 border border-rose-500/30">
        🚨 ER
      </span>
    );
  }
  if (dept.includes('opd') || dept.includes('outpatient')) {
    return (
      <span className="text-[10px] font-semibold px-1.5 py-0.5 rounded bg-blue-500/15 text-blue-600 dark:text-blue-400 border border-blue-500/30">
        🏥 OPD
      </span>
    );
  }
  if (dept.includes('ward') || dept.includes('indoor') || dept.includes('inpatient')) {
    return (
      <span className="text-[10px] font-semibold px-1.5 py-0.5 rounded bg-amber-500/15 text-amber-600 dark:text-amber-400 border border-amber-500/30">
        🛏️ Ward
      </span>
    );
  }
  return (
    <span className="text-[10px] font-semibold px-1.5 py-0.5 rounded bg-surface-container-high text-secondary border border-outline-variant/60">
      {department}
    </span>
  );
}

export function WorklistHmisStatusBadge({ study }: { study: PacsStudyResult }) {
  if (!study.hmisStatus) {
    if (study.source === 'hospital_pacs' || study.source === 'local_archive') {
      return (
        <span className="text-[9px] font-mono text-secondary/60">
          Unlinked to HMIS
        </span>
      );
    }
    return null;
  }

  const s = study.hmisStatus.toLowerCase();
  let color = 'bg-surface-container-high text-secondary border-outline-variant/60';
  let label = study.hmisStatus;

  if (s.includes('published') || s.includes('verified')) {
    color = 'bg-emerald-500/15 text-emerald-600 dark:text-emerald-400 border-emerald-500/30';
    label = 'HMIS: Published';
  } else if (s.includes('draft')) {
    color = 'bg-amber-500/15 text-amber-600 dark:text-amber-400 border-amber-500/30';
    label = 'HMIS: Draft';
  } else if (s.includes('pending') || s.includes('performed') || s.includes('scheduled') || s.includes('proceeded') || s.includes('awaiting')) {
    color = 'bg-sky-500/15 text-sky-600 dark:text-sky-400 border-sky-500/30';
    label = 'HMIS: Awaiting Report';
  } else if (s.includes('reject')) {
    color = 'bg-rose-500/15 text-rose-600 dark:text-rose-400 border-rose-500/30';
    label = 'HMIS: Rejected';
  }

  return (
    <span
      className={`text-[9px] font-mono px-1.5 py-0.5 rounded border inline-block ${color}`}
      title={study.hmisLastCheckedAt ? `Last tracking sync: ${formatTime(study.hmisLastCheckedAt)}` : undefined}
    >
      {label}
    </span>
  );
}

export function WorklistManualBadge({ isManual }: { isManual?: boolean }) {
  if (!isManual) return null;
  return (
    <span
      className="text-[9px] font-semibold px-1.5 py-0.5 rounded bg-amber-500/15 text-amber-700 dark:text-amber-400 border border-amber-500/30 inline-flex items-center gap-1 shadow-2xs"
      title="Manually added case"
    >
      <span>✍️</span>
      <span>Manual Entry</span>
    </span>
  );
}

export function WorklistFilmChargeBadge() {
  return (
    <span
      className="text-[9px] font-semibold px-1.5 py-0.5 rounded bg-amber-500/15 text-amber-700 dark:text-amber-400 border border-amber-500/30 inline-flex items-center gap-1 shadow-2xs"
      title="Billing item for film charges. Not a diagnostic scan."
    >
      <span>🧾</span>
      <span>Film Charges</span>
    </span>
  );
}

export { WorklistMultiStudyBadge, type WorklistMultiStudyBadgeProps } from './worklist-multi-study-badge';

export function WorklistDuplicateMrnBadge({
  count,
  onMergeClick,
}: {
  count?: number;
  onMergeClick?: () => void;
}) {
  return (
    <button
      type="button"
      onClick={(e) => {
        if (onMergeClick) {
          e.stopPropagation();
          onMergeClick();
        }
      }}
      className="text-[9px] font-semibold px-1.5 py-0.5 rounded bg-sky-500/15 text-sky-700 dark:text-sky-300 border border-sky-500/30 inline-flex items-center gap-1 cursor-pointer hover:bg-sky-500/25 transition-colors shadow-2xs"
      title={`${count || 2} orders for this patient.`}
    >
      <span>📚</span>
      <span>{count || 2} Studies</span>
    </button>
  );
}

export function WorklistImagesBadge({ study }: { study: PacsStudyResult }) {
  const isReady = Boolean(
    study.hasImages ||
    Boolean(study.folderPath) ||
    study.isDownloaded === true ||
    (typeof study.numInstances === 'number' && study.numInstances > 1)
  );

  if (isReady) {
    return (
      <span
        className="inline-flex items-center justify-center w-5 h-5 rounded bg-emerald-500/15 text-emerald-600 dark:text-emerald-400 border border-emerald-500/30 text-xs shadow-2xs font-bold shrink-0 cursor-default"
        title={`PACS Images Ready (${study.numSeries && study.numSeries > 1 ? `${study.numSeries} series • ` : ''}${study.numInstances || 1} slices)`}
      >
        📷
      </span>
    );
  }

  return (
    <span
      className="inline-flex items-center justify-center w-5 h-5 rounded bg-amber-500/10 text-amber-600 dark:text-amber-400 border border-amber-500/20 text-xs shrink-0 cursor-default"
      title="Awaiting PACS DICOM imaging transfer"
    >
      ⏳
    </span>
  );
}

export function WorklistPendingBadge({
  study,
  onClick,
}: {
  study: PacsStudyResult;
  onClick?: () => void;
}) {
  const reasonMap: Record<string, string> = {
    missing_history_form: 'Missing History Form',
    technologist_ack_pending: 'HMIS Tech Ack Pending',
    pacs_transfer_pending: 'PACS Transfer Pending',
    awaiting_prior_images: 'Awaiting Prior Films',
    awaiting_prior_films: 'Awaiting Prior Films',
    awaiting_lab_creatinine: 'Awaiting Creatinine',
    awaiting_lab_results: 'Awaiting Labs',
    motion_artifact_repeat: 'Motion / Repeat Scan',
    artefact_repeat_needed: 'Repeat Scan Needed',
    awaiting_clinical_history: 'Awaiting History/Indication',
    awaiting_clinician_clarification: 'Awaiting Clinician',
    second_opinion_subspecialty: 'Subspecialty / MDT Review',
    study_case: 'Study Case',
    contrast_reaction_query: 'Contrast Query',
    protocol_clarification: 'Protocol Issue',
    other: 'Case On Hold',
  };

  const reasonLabel = (study.pendingReason && reasonMap[study.pendingReason]) || study.pendingReason || 'Case On Hold';
  const tooltipParts = [
    `Hold Reason: ${reasonLabel}`,
    study.pendingNotes ? `Notes: ${study.pendingNotes}` : '',
    study.pendingAt ? `Since: ${formatDicomDateTime(study.pendingAt)}` : '',
    study.pendingBy ? `Logged By: ${study.pendingBy}` : '',
    onClick ? 'Click to review or edit pending notes' : '',
  ].filter(Boolean);

  return (
    <button
      type="button"
      onClick={(e) => {
        if (onClick) {
          e.stopPropagation();
          onClick();
        }
      }}
      disabled={!onClick}
      className={`text-[9px] font-semibold px-1.5 py-0.5 rounded bg-rose-500/15 text-rose-700 dark:text-rose-400 border border-rose-500/30 inline-flex items-center gap-1 shadow-2xs ${
        onClick ? 'cursor-pointer hover:bg-rose-500/25 transition-colors' : 'cursor-default'
      }`}
      title={tooltipParts.join(' • ')}
    >
      <span>⚠️</span>
      <span className="truncate max-w-[130px]">{reasonLabel}</span>
      {study.pendingNotes && <span className="text-[8px] font-mono">📝</span>}
    </button>
  );
}


