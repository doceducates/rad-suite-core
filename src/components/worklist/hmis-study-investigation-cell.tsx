'use client';

// Layer 4 (Presentation): Clean HMIS Investigation & Multi-Study Cell
// Strict File Size Invariant: Target < 120 lines

import React from 'react';
import Link from 'next/link';
import { getModalityColor } from '@/lib/utils';
import { CopyButton } from '@/components/ui/copy-button';
import type { PacsStudyResult } from '@/types/pacs';

interface HmisStudyInvestigationCellProps {
  study: PacsStudyResult;
}

export function HmisStudyInvestigationCell({ study }: HmisStudyInvestigationCellProps) {
  const isMulti = Boolean(study.isMultiStudy && study.studies && study.studies.length > 1);
  const studiesList = isMulti ? study.studies! : [study];

  if (!isMulti) {
    return (
      <td className="py-3 px-3.5 min-w-[180px] max-w-[240px]">
        <div className="flex items-center gap-1.5 mb-1">
          <span className={`text-[10px] font-bold px-1.5 py-0.5 rounded border ${getModalityColor(study.modality)}`}>
            {study.modality}
          </span>
          {study.priority && study.priority.toLowerCase() === 'stat' && (
            <span className="px-1.5 py-0.5 rounded bg-rose-500/15 text-rose-600 border border-rose-500/30 text-[10px] font-bold animate-pulse">
              STAT
            </span>
          )}
        </div>
        <div className="font-medium text-on-surface text-[11px] truncate" title={study.studyDescription}>
          {study.studyDescription || 'Diagnostic Scan'}
        </div>
        <div className="flex items-center gap-1.5 mt-1 font-mono text-[10px] text-secondary" onClick={(e) => e.stopPropagation()}>
          <span>Acc: <strong className="text-on-surface">{study.accessionNumber}</strong></span>
          <CopyButton text={study.accessionNumber} size="xs" title="Copy Accession" />
        </div>
      </td>
    );
  }

  // Multi-Study Order (e.g. Cervical Spine + Lumbar Spine under same patient)
  return (
    <td className="py-2.5 px-3.5 min-w-[210px] max-w-[280px]">
      <div className="flex items-center gap-1.5 mb-1.5 flex-wrap">
        <span className="text-[10px] font-bold px-1.5 py-0.5 rounded bg-sky-500/15 text-sky-700 dark:text-sky-300 border border-sky-500/30">
          📚 {studiesList.length} Studies Order
        </span>
        {study.priority && study.priority.toLowerCase() === 'stat' && (
          <span className="px-1.5 py-0.5 rounded bg-rose-500/15 text-rose-600 border border-rose-500/30 text-[10px] font-bold animate-pulse">
            STAT
          </span>
        )}
      </div>

      <div className="space-y-1.5">
        {studiesList.map((s) => (
          <div
            key={s.accessionNumber}
            className="p-1.5 rounded-lg bg-surface-container/60 hover:bg-surface-container-high border border-outline-variant/40 transition-colors"
          >
            <div className="flex items-center gap-1.5 flex-wrap">
              {s.isFilmCharges ? (
                <span className="text-[9px] font-bold px-1.5 py-0.2 rounded border bg-amber-500/10 text-amber-600 dark:text-amber-400 border-amber-500/30">
                  BILL
                </span>
              ) : (
                <span className={`text-[9px] font-bold px-1.5 py-0.2 rounded border ${getModalityColor(s.modality)}`}>
                  {s.modality}
                </span>
              )}
              <span
                className={`font-semibold text-[11px] truncate flex-1 min-w-[90px] max-w-[180px] ${
                  s.isFilmCharges ? 'text-secondary italic' : 'text-on-surface'
                }`}
                title={s.studyDescription || s.scanType}
              >
                {s.studyDescription || s.scanType || 'Diagnostic Scan'}
              </span>
            </div>

            <div
              className="flex items-center justify-between gap-1.5 mt-1 font-mono text-[10px] text-secondary"
              onClick={(e) => e.stopPropagation()}
            >
              <div className="flex items-center gap-1">
                <span>Acc:</span>
                <Link
                  href={`/workspace/${encodeURIComponent(s.accessionNumber)}`}
                  className="font-bold text-primary hover:underline"
                  title="Open in Workspace"
                >
                  {s.accessionNumber}
                </Link>
                <CopyButton text={s.accessionNumber} size="xs" title="Copy Accession" />
              </div>
              {s.status && s.status !== 'scheduled' && (
                <span className="text-[9px] px-1 rounded bg-surface-container-highest text-secondary capitalize font-sans">
                  {s.status}
                </span>
              )}
            </div>
          </div>
        ))}
      </div>
    </td>
  );
}
