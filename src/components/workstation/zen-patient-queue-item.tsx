'use client';

import React from 'react';
import { Clock } from 'lucide-react';
import { ReportSectionDots } from './report-section-dots';
import { parseStudyTimestamp } from '@/services/study-sorting';
import type { PacsStudyResult } from '@/types/pacs';

export function formatPatientStudyDateTime(
  studyDate?: string,
  studyTime?: string,
  claimedAt?: string | null
): string {
  const ts = Math.max(
    parseStudyTimestamp(studyDate, studyTime) || 0,
    claimedAt ? parseStudyTimestamp(claimedAt) : 0
  );
  if (!ts || isNaN(ts)) return studyDate || claimedAt || '';

  const d = new Date(ts);
  const now = new Date();
  const todayStart = new Date(now.getFullYear(), now.getMonth(), now.getDate()).getTime();
  const yesterdayStart = todayStart - 86400000;

  let hours = d.getHours();
  const minutes = String(d.getMinutes()).padStart(2, '0');
  const ampm = hours >= 12 ? 'PM' : 'AM';
  hours = hours % 12 || 12;
  const timeFormatted = `${hours}:${minutes} ${ampm}`;

  if (ts >= todayStart) {
    return `Today, ${timeFormatted}`;
  }
  if (ts >= yesterdayStart && ts < todayStart) {
    return `Yesterday, ${timeFormatted}`;
  }

  const day = String(d.getDate()).padStart(2, '0');
  const month = d.toLocaleDateString('en-US', { month: 'short' });
  const year = d.getFullYear() !== now.getFullYear() ? ` ${d.getFullYear()}` : '';
  return `${day} ${month}${year}, ${timeFormatted}`;
}

interface ZenPatientQueueItemProps {
  study: PacsStudyResult;
  isCurrent: boolean;
  onSelect: (study: PacsStudyResult) => void;
}

export function ZenPatientQueueItem({
  study,
  isCurrent,
  onSelect,
}: ZenPatientQueueItemProps) {
  const dateTimeStr = formatPatientStudyDateTime(study.studyDate, study.studyTime, study.claimedAt);

  return (
    <button
      type="button"
      onClick={() => onSelect(study)}
      className={`w-full text-left px-3 py-2 text-xs hover:bg-surface-container text-on-surface flex items-center justify-between gap-2 transition-colors cursor-pointer ${
        isCurrent ? 'bg-primary/10 border-l-3 border-primary font-bold' : ''
      }`}
    >
      <div className="min-w-0 flex-1">
        <div className="font-semibold text-xs text-on-surface flex items-center gap-1.5">
          <span className="text-[9px] px-1 py-0.2 rounded bg-surface-container-high text-primary font-mono font-bold shrink-0">
            {study.modality || 'CT'}
          </span>
          <span className="truncate">{study.patientName}</span>
          {isCurrent && (
            <span className="text-[9px] px-1 rounded bg-primary/20 text-primary font-mono font-bold">
              Active
            </span>
          )}
        </div>
        <div className="text-[10px] text-secondary truncate flex items-center gap-1.5 mt-0.5 font-mono">
          {dateTimeStr && (
            <>
              <span className="text-primary font-semibold flex items-center gap-1 shrink-0">
                <Clock className="w-2.5 h-2.5 text-primary/70 shrink-0" />
                <span>{dateTimeStr}</span>
              </span>
              <span className="text-outline-variant/60">•</span>
            </>
          )}
          <span>ACC: {study.accessionNumber || 'N/A'}</span>
          {study.patientMrn && <span>• MRN: {study.patientMrn}</span>}
        </div>
      </div>

      {/* 3 Section Indicator Dots with Count Badge */}
      <div className="shrink-0 flex items-center">
        <ReportSectionDots sections={study.reportSections} size="xs" showCount />
      </div>
    </button>
  );
}
