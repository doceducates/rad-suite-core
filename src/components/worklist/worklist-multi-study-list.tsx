'use client';

// Layer 4 (Presentation): Smart Study & Modality Stack for Single and Multi-Study Cases
import React from 'react';
import Link from 'next/link';
import { AlertTriangle } from 'lucide-react';
import { CopyButton } from '@/components/ui/copy-button';
import { getModalityColor, getPriorityColor } from '@/lib/utils';
import {
  WorklistDepartmentBadge,
  WorklistImagesBadge,
  WorklistFilmChargeBadge,
} from './worklist-badges';
import { WorklistDiagnosisBadge } from './worklist-diagnosis-badge';
import type { PacsStudyResult } from '@/types/pacs';

interface WorklistMultiStudyListProps {
  study: PacsStudyResult;
  isStat?: boolean;
}

export function WorklistMultiStudyList({ study, isStat }: WorklistMultiStudyListProps) {
  const isMulti = Boolean(study.isMultiStudy && study.studies && study.studies.length > 1);
  const studiesList = isMulti ? study.studies! : [study];

  if (!isMulti) {
    return (
      <div className="space-y-1 max-w-[230px]">
        <div className="flex items-center gap-1.5 flex-wrap">
          <span className={`inline-block text-xs font-semibold px-2 py-0.5 rounded border ${getModalityColor(study.modality)}`}>
            {study.modality}
          </span>
          {study.priority && study.priority.toLowerCase() !== 'routine' && (
            <span
              className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full font-bold text-[10px] border shadow-2xs ${getPriorityColor(
                study.priority
              )}`}
            >
              {isStat && <AlertTriangle className="w-3 h-3 animate-pulse" />}
              {study.priority.toUpperCase()}
            </span>
          )}
          <WorklistDepartmentBadge department={study.department} />
          <WorklistImagesBadge study={study} />
          {study.isFilmCharges && <WorklistFilmChargeBadge />}
        </div>
        <div className="text-on-surface font-medium max-w-[220px] truncate" title={study.studyDescription}>
          {study.studyDescription || 'Diagnostic Scan'}
        </div>
        {study.diagnosisHighlight && (
          <div className="pt-0.5">
            <WorklistDiagnosisBadge highlight={study.diagnosisHighlight} status={study.status} />
          </div>
        )}
        <div className="text-[10px] text-secondary">
          {study.hasImages || (study.numInstances > 0 && (study.folderPath || study.isDownloaded))
            ? `${study.numSeries && study.numSeries > 1 ? `${study.numSeries} series • ` : ''}${study.numInstances || 1} slices`
            : 'Awaiting PACS DICOM transfer'}
        </div>
      </div>
    );
  }

  // Multi-Study Case (e.g. Cervical, Dorsal, Lumbosacral Spine under same patient)
  return (
    <div className="space-y-1.5 py-0.5 max-w-[240px]">
      <div className="flex items-center gap-1.5 flex-wrap mb-1">
        <span className="text-[10px] font-bold px-1.5 py-0.5 rounded bg-sky-500/15 text-sky-700 dark:text-sky-300 border border-sky-500/30">
          📚 {studiesList.length} Studies Order
        </span>
        {isStat && (
          <span className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded-full font-bold text-[10px] border bg-rose-500/15 text-rose-600 border-rose-500/30">
            <AlertTriangle className="w-2.5 h-2.5 animate-pulse" />
            STAT
          </span>
        )}
        <WorklistDepartmentBadge department={study.department} />
      </div>

      <div className="space-y-1">
        {studiesList.map((s) => (
          <div
            key={s.accessionNumber}
            className="p-1.5 rounded-lg bg-surface-container/50 hover:bg-surface-container-high/70 border border-outline-variant/30 transition-colors"
          >
            <div className="flex items-center gap-1.5 flex-wrap">
              <span className={`text-[10px] font-bold px-1.5 py-0.5 rounded border ${getModalityColor(s.modality)}`}>
                {s.modality}
              </span>
              <span className="font-semibold text-on-surface text-[11px] truncate flex-1 min-w-[90px] max-w-[160px]" title={s.studyDescription}>
                {s.studyDescription || s.scanType || 'Diagnostic Exam'}
              </span>
            </div>

            {s.diagnosisHighlight && (
              <div className="pt-0.5">
                <WorklistDiagnosisBadge highlight={s.diagnosisHighlight} status={s.status} />
              </div>
            )}

            <div className="flex items-center gap-2 text-[10px] text-secondary font-mono mt-1" onClick={(e) => e.stopPropagation()}>
              <div className="flex items-center gap-1">
                <Link
                  href={`/workspace/${encodeURIComponent(s.accessionNumber)}`}
                  className="text-primary hover:underline font-bold"
                  title="Open this specific study in workspace"
                >
                  {s.accessionNumber}
                </Link>
                <CopyButton text={s.accessionNumber} title="Copy Accession" size="xs" />
              </div>
              <span className="text-outline-variant">•</span>
              <span className="font-sans text-[10px]">
                {s.hasImages || (s.numInstances > 0 && (s.folderPath || s.isDownloaded))
                  ? `${s.numSeries && s.numSeries > 1 ? `${s.numSeries}s / ` : ''}${s.numInstances || 1}i`
                  : 'Awaiting PACS'}
              </span>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
