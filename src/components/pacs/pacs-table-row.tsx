'use client';

import React from 'react';
import Link from 'next/link';
import { Clock } from 'lucide-react';
import { CopyButton } from '@/components/ui/copy-button';
import { getModalityColor } from '@/lib/utils';
import type { EnrichedHospitalPacsStudy } from '@/services/pacs-study-enrichment.service';
import { PacsRowActions } from './pacs-table-row-actions';

function formatStudyTime(time?: string | null): string {
  if (!time) return '';
  if (time.includes('T')) {
    try {
      const d = new Date(time);
      if (!isNaN(d.getTime())) {
        return d.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit', hour12: true });
      }
    } catch {}
  }
  const clean = time.trim().replace(/\..*$/, '');
  const match = clean.match(/^(\d{2}):?(\d{2})/);
  if (match) {
    const h = parseInt(match[1], 10);
    const m = match[2];
    const ampm = h >= 12 ? 'PM' : 'AM';
    const h12 = h % 12 || 12;
    return `${String(h12).padStart(2, '0')}:${m} ${ampm}`;
  }
  return clean;
}

function stripHtml(html?: string | null): string {
  if (!html) return '';
  return html.replace(/<[^>]*>/g, ' ').replace(/\s+/g, ' ').trim();
}

interface PacsTableRowProps {
  study: EnrichedHospitalPacsStudy;
  isSelected: boolean;
  onToggleSelect: (accession: string) => void;
  onSingleSync: (accession: string) => void;
  onSinglePull?: (accession: string) => void;
  onStreamAndView: (study: EnrichedHospitalPacsStudy, mode?: 'review' | 'report') => void;
  onClaimCase?: (accession: string) => void;
  onShareCase?: (study: EnrichedHospitalPacsStudy) => void;
  renderS3StatusBadge?: (status?: string | null) => React.ReactNode;
  canPull?: boolean;
  canUpload?: boolean;
  canDownloadZip?: boolean;
}

export function PacsTableRow({
  study: st,
  isSelected,
  onToggleSelect,
  onSingleSync,
  onSinglePull,
  onStreamAndView,
  onClaimCase,
  onShareCase,
  renderS3StatusBadge,
  canPull = false,
  canUpload = false,
  canDownloadZip = true,
}: PacsTableRowProps) {
  const isSynced = st.s3Status === 'synced';
  const cleanImpression = stripHtml(st.impression);
  const formattedTime = formatStudyTime(st.studyTime);

  return (
    <tr
      className={`transition-colors hover:bg-surface-container/40 ${
        isSelected ? 'bg-primary/5 dark:bg-primary/10' : ''
      }`}
    >
      {/* Checkbox */}
      <td className="py-2.5 px-3 text-center">
        <input
          type="checkbox"
          checked={isSelected}
          onChange={() => onToggleSelect(st.accessionNumber)}
          className="rounded border-border text-primary focus:ring-primary cursor-pointer w-3.5 h-3.5"
        />
      </td>

      {/* Patient & Identifiers */}
      <td className="py-2.5 px-3 min-w-[210px]">
        <div className="flex flex-col gap-1">
          {/* Patient Name with 1-click Copy */}
          <div className="flex items-center gap-1.5 flex-wrap">
            <Link
              href={`/workspace/${encodeURIComponent(st.accessionNumber)}`}
              className="font-bold text-foreground hover:text-primary transition-colors hover:underline text-[13px] font-headline"
            >
              {st.patientName || 'PATIENT'}
            </Link>
            <CopyButton
              text={st.patientName || 'PATIENT'}
              label="Patient Name"
              size="xs"
            />
          </div>

          {/* MRN and Accession */}
          <div className="flex items-center gap-2 flex-wrap text-[11px] font-mono text-muted-foreground">
            <div className="flex items-center gap-1">
              <span>MRN:</span>
              <span className="text-foreground">{st.patientMrn || st.patientId || '—'}</span>
              {(st.patientMrn || st.patientId) && (
                <CopyButton text={st.patientMrn || st.patientId || ''} label="MRN" size="xs" />
              )}
            </div>
            <span>•</span>
            <div className="flex items-center gap-1">
              <span>ACC:</span>
              <span className="text-primary font-bold">{st.accessionNumber}</span>
              <CopyButton text={st.accessionNumber} label="Accession" size="xs" />
            </div>
          </div>
        </div>
      </td>

      {/* Modality */}
      <td className="py-2.5 px-3">
        <span className={`inline-block px-1.5 py-0.5 rounded text-[10px] font-bold font-mono ${getModalityColor(st.modality)}`}>
          {st.modality || 'MR'}
        </span>
      </td>

      {/* Study Description */}
      <td className="py-2.5 px-3 text-foreground">
        <div
          className="truncate max-w-[180px]"
          title={st.studyDescription || `${st.modality || 'MR'} Study`}
        >
          {st.studyDescription || `${st.modality || 'MR'} Study`}
        </div>
      </td>

      {/* Series & Slices (RadiAnt Clean Diagnostic Style) */}
      <td className="py-2.5 px-3 whitespace-nowrap">
        <div className="flex flex-col gap-0.5">
          <span className="text-foreground font-mono font-medium text-[11px]">
            {st.numInstances && st.numInstances > 0 ? (
              `${st.numSeries && st.numSeries > 1 ? `${st.numSeries} Ser • ` : ''}${st.numInstances} Slices`
            ) : st.numSeries && st.numSeries > 0 ? (
              `${st.numSeries} Series`
            ) : (
              '1 Series'
            )}
          </span>
          <span className="text-[10px] text-muted-foreground font-sans">
            {st.modality || 'DICOM'} Study
          </span>
        </div>
      </td>

      {/* Clinical Impression / Diagnosis */}
      <td className="py-2.5 px-3">
        {cleanImpression ? (
          <div className="max-w-[180px] space-y-0.5" title={cleanImpression}>
            <p className="truncate text-foreground font-medium text-[11px]">
              {cleanImpression}
            </p>
            {st.reportStatus && (
              <span className={`inline-block text-[9px] px-1.5 py-0.2 rounded font-semibold uppercase tracking-wider ${
                st.reportStatus === 'final'
                  ? 'bg-emerald-500/15 text-emerald-600 dark:text-emerald-400'
                  : 'bg-amber-500/15 text-amber-600 dark:text-amber-400'
              }`}>
                {st.reportStatus}
              </span>
            )}
          </div>
        ) : (
          <span className="text-muted-foreground/50 text-[11px] italic">No report</span>
        )}
      </td>

      {/* Study Date & Time */}
      <td className="py-2.5 px-3 font-mono text-[11px] whitespace-nowrap">
        <div className="flex flex-col">
          <span className="text-foreground">
            {st.studyDate && st.studyDate.length >= 8
              ? `${st.studyDate.slice(0, 4)}-${st.studyDate.slice(4, 6)}-${st.studyDate.slice(6, 8)}`
              : st.studyDate || '—'}
          </span>
          {formattedTime ? (
            <span className="text-muted-foreground text-[10px] flex items-center gap-1 font-sans">
              <Clock className="w-2.5 h-2.5 text-muted-foreground/70 shrink-0" />
              <span>{formattedTime}</span>
            </span>
          ) : null}
        </div>
      </td>

      {/* Actions */}
      <td className="py-2.5 px-3 text-right whitespace-nowrap">
        <PacsRowActions
          study={st}
          isSynced={isSynced}
          onSingleSync={onSingleSync}
          onSinglePull={onSinglePull}
          onStreamAndView={onStreamAndView}
          onClaimCase={onClaimCase}
          onShareCase={onShareCase}
          canPull={canPull}
          canUpload={canUpload}
          canDownloadZip={canDownloadZip}
        />
      </td>
    </tr>
  );
}
