'use client';

// Layer 4 (Presentation): Clean Patient Cell with 1-Click Fast Identifiers
// Strict File Size Invariant: Target < 250 lines

import React, { useState } from 'react';
import Link from 'next/link';
import { Edit3, Phone } from 'lucide-react';
import { notify } from '@/services/notification.service';
import { WorklistMultiStudyBadge, WorklistManualBadge } from './worklist-badges';
import { WorklistPriorBadge } from './worklist-prior-badge';
import { AgeDiscrepancyPopover } from './age-discrepancy-popover';
import type { PacsStudyResult } from '@/types/pacs';

interface WorklistPatientCellProps {
  study: PacsStudyResult;
  isMyCases?: boolean;
  onRefresh?: () => void;
  onEditPatient?: (study: PacsStudyResult) => void;
  onOpenMergeModal?: (study: PacsStudyResult) => void;
  onFilterPatientMrn?: (mrn: string) => void;
}

export function WorklistPatientCell({
  study,
  isMyCases = false,
  onRefresh,
  onEditPatient,
  onOpenMergeModal,
  onFilterPatientMrn,
}: WorklistPatientCellProps) {
  const [showFullAcc, setShowFullAcc] = useState(false);
  const [showFullMrn, setShowFullMrn] = useState(false);
  const [copiedField, setCopiedField] = useState<'acc' | 'mrn' | null>(null);

  const patientMrn = study.patientId || study.patientMrn || '';
  const phone = study.patientPhone || (study as any).phone || '';
  const workstationHref = `/workspace/${encodeURIComponent(study.accessionNumber)}`;

  // Last 5 characters for ultra-compact display
  const acc5 = study.accessionNumber.length > 5 ? study.accessionNumber.slice(-5) : study.accessionNumber;
  const mrn5 = patientMrn.length > 5 ? patientMrn.slice(-5) : patientMrn;

  const copyToClipboard = async (text: string, field: 'acc' | 'mrn', label: string) => {
    try {
      await navigator.clipboard.writeText(text);
    } catch {
      const ta = document.createElement('textarea');
      ta.value = text;
      document.body.appendChild(ta);
      ta.select();
      document.execCommand('copy');
      document.body.removeChild(ta);
    }
    setCopiedField(field);
    notify.info(`Copied ${label}: ${text}`);
    setTimeout(() => setCopiedField(null), 1500);
  };

  const handleToggleAcc = () => {
    const next = !showFullAcc;
    setShowFullAcc(next);
    copyToClipboard(study.accessionNumber, 'acc', 'Accession');
  };

  const handleToggleMrn = () => {
    if (!patientMrn) return;
    const next = !showFullMrn;
    setShowFullMrn(next);
    copyToClipboard(patientMrn, 'mrn', 'MRN');
  };

  return (
    <td className="py-2.5 px-4 min-w-[200px]">
      {/* Line 1: Patient Name (Workstation Link), Age/Gender, Edit, Multi-Study Badge */}
      <div className="flex items-center gap-1.5 flex-wrap">
        <Link
          href={workstationHref}
          className="font-bold text-on-surface hover:text-primary transition-colors hover:underline text-[13px] font-headline"
          onClick={(e) => e.stopPropagation()}
        >
          {study.patientName || 'Unnamed Patient'}
        </Link>
        <span className="text-[11px] font-medium text-secondary inline-flex items-center">
          {study.age > 0 ? `${study.age}y` : 'Age N/A'} • {study.gender || 'O'}
          {isMyCases && study.ageDiscrepancy && (
            <AgeDiscrepancyPopover study={study} onRefresh={onRefresh} />
          )}
        </span>
        {onEditPatient && (
          <button
            type="button"
            onClick={(e) => {
              e.stopPropagation();
              onEditPatient(study);
            }}
            title={`Edit details for ${study.patientName}`}
            className="p-1 rounded text-secondary hover:text-primary hover:bg-surface-container transition-colors cursor-pointer"
          >
            <Edit3 className="w-3 h-3" />
          </button>
        )}
        {(study.isMultiStudy || study.hasDuplicateMrn) && (
          <WorklistMultiStudyBadge
            count={study.duplicateCount}
            companionStudies={study.companionStudies}
            onSelectMrn={patientMrn && onFilterPatientMrn ? () => onFilterPatientMrn(patientMrn) : undefined}
          />
        )}
        {study.priorStudies && study.priorStudies.length > 0 && (
          <WorklistPriorBadge
            priorStudies={study.priorStudies}
            onSelectMrn={patientMrn && onFilterPatientMrn ? () => onFilterPatientMrn(patientMrn) : undefined}
          />
        )}
      </div>

      {/* Line 2: Seamless ACC: XXXXX • MR: XXXXX Capsule (Click reveals full number & copies) */}
      <div className="flex items-center gap-1.5 flex-wrap mt-0.5 text-[11px] font-mono text-secondary" onClick={(e) => e.stopPropagation()}>
        <div className="inline-flex items-center gap-1.5 px-2 py-0.5 rounded-md bg-surface-container/50 border border-outline-variant/30 text-[11px] font-mono">
          {/* Accession Segment */}
          <button
            type="button"
            onClick={handleToggleAcc}
            className={`transition-all cursor-pointer rounded px-1 -mx-0.5 ${
              showFullAcc
                ? 'bg-primary/10 text-primary font-bold shadow-2xs'
                : 'hover:text-primary text-secondary hover:bg-surface-container-high font-medium'
            } ${copiedField === 'acc' ? '!text-emerald-600 dark:!text-emerald-400 !bg-emerald-500/10' : ''}`}
            title={showFullAcc ? `Full Accession (Click to collapse to ACC: ${acc5})` : `Full: ${study.accessionNumber} (Click to show full & copy)`}
          >
            {showFullAcc ? (
              <span>{study.accessionNumber}</span>
            ) : (
              <span>
                <span className="text-secondary/60 font-sans text-[10px] mr-1">ACC:</span>
                <span className="text-on-surface font-semibold">{acc5}</span>
              </span>
            )}
          </button>

          {patientMrn && (
            <>
              <span className="text-secondary/30 select-none">•</span>
              {/* MRN Segment */}
              <button
                type="button"
                onClick={handleToggleMrn}
                className={`transition-all cursor-pointer rounded px-1 -mx-0.5 ${
                  showFullMrn
                    ? 'bg-primary/10 text-primary font-bold shadow-2xs'
                    : 'hover:text-on-surface text-secondary hover:bg-surface-container-high font-medium'
                } ${copiedField === 'mrn' ? '!text-emerald-600 dark:!text-emerald-400 !bg-emerald-500/10' : ''}`}
                title={showFullMrn ? `Full MRN (Click to collapse to MR: ${mrn5})` : `Full MRN: ${patientMrn} (Click to show full & copy)`}
              >
                {showFullMrn ? (
                  <span>{patientMrn}</span>
                ) : (
                  <span>
                    <span className="text-secondary/60 font-sans text-[10px] mr-1">MR:</span>
                    <span className="text-on-surface font-semibold">{mrn5}</span>
                  </span>
                )}
              </button>
            </>
          )}
        </div>

        {phone && (
          <a
            href={`tel:${phone}`}
            className="inline-flex items-center gap-0.5 text-[10px] text-emerald-600 dark:text-emerald-400 hover:underline px-1.5 py-0.5 rounded bg-emerald-500/10 border border-emerald-500/20"
            title={`Call patient: ${phone}`}
          >
            <Phone className="w-2.5 h-2.5 shrink-0" />
            <span>{phone}</span>
          </a>
        )}

        <WorklistManualBadge isManual={study.isManual} />
      </div>
    </td>
  );
}
