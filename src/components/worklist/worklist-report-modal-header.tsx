'use client';

import React from 'react';
import Link from 'next/link';
import { X, ExternalLink, Copy, Check, Edit3, Eye, Printer, Layers, FileText } from 'lucide-react';
import { CopyButton } from '@/components/ui/copy-button';
import { formatPatientSummary } from '@/lib/clipboard';
import { getModalityColor, formatDicomDob, cn } from '@/lib/utils';
import type { PacsStudyResult } from '@/types/pacs';

interface CompanionStudyItem {
  accessionNumber: string;
  studyDescription: string;
  modality?: string;
  status?: string;
}

interface WorklistReportModalHeaderProps {
  study: PacsStudyResult;
  copied: boolean;
  onCopyReport: () => void;
  onPrintOfficialReport?: () => void;
  onEditPatient?: () => void;
  onClose: () => void;
  viewMode?: 'read' | 'edit';
  onViewModeChange?: (mode: 'read' | 'edit') => void;
  companionStudies?: CompanionStudyItem[];
  activeAccession?: string;
  onSelectStudy?: (accessionNumber: string) => void;
}

export function WorklistReportModalHeader({
  study,
  copied,
  onCopyReport,
  onPrintOfficialReport,
  onEditPatient,
  onClose,
  viewMode = 'read',
  onViewModeChange,
  companionStudies = [],
  activeAccession,
  onSelectStudy,
}: WorklistReportModalHeaderProps) {
  // Aggregate primary study with companion studies without duplicates
  const allStudies: CompanionStudyItem[] = React.useMemo(() => {
    const list: CompanionStudyItem[] = [
      {
        accessionNumber: study.accessionNumber,
        studyDescription: study.studyDescription,
        modality: study.modality,
        status: study.status,
      },
    ];
    for (const cs of companionStudies) {
      if (cs.accessionNumber !== study.accessionNumber && !list.some((it) => it.accessionNumber === cs.accessionNumber)) {
        list.push(cs);
      }
    }
    return list;
  }, [study, companionStudies]);

  const currentAcc = activeAccession || study.accessionNumber;

  return (
    <div className="border-b border-outline-variant/60 bg-surface-container flex flex-col">
      {/* 1. Top Bar: Patient Demographics + Isolated Close Button */}
      <div className="px-5 py-3 flex items-center justify-between gap-3 border-b border-outline-variant/30">
        <div className="flex flex-wrap items-center gap-2.5 min-w-0">
          <span className={`px-2 py-0.5 rounded font-bold text-xs border shrink-0 ${getModalityColor(study.modality)}`}>
            {study.modality}
          </span>
          <div className="min-w-0">
            <div className="flex items-center gap-2 flex-wrap">
              <span className="font-bold text-sm text-on-surface truncate">{study.patientName}</span>
              <CopyButton
                text={() =>
                  formatPatientSummary({
                    patientName: study.patientName,
                    mrn: study.patientId || study.patientMrn,
                    accessionNumber: study.accessionNumber,
                    age: study.age,
                    gender: study.gender,
                    modality: study.modality,
                    studyDescription: study.studyDescription,
                    studyDate: study.studyDate,
                    studyTime: study.studyTime,
                    dateOfBirth: study.dateOfBirth,
                    department: study.department,
                  })
                }
                title="Copy full patient & exam details"
                ariaLabel={`Copy full details for ${study.patientName}`}
                size="xs"
              />
              {onEditPatient && (
                <button
                  type="button"
                  onClick={onEditPatient}
                  title="Edit patient & study details"
                  className="p-1 rounded text-secondary hover:text-primary hover:bg-surface-container-high transition-colors cursor-pointer"
                >
                  <Edit3 className="w-3 h-3" />
                </button>
              )}
              <span className="text-[11px] text-secondary font-mono">
                ({study.age > 0 ? `${study.age}y` : 'Age N/A'}, {study.gender})
              </span>
            </div>
            <div className="text-[10px] text-secondary font-mono flex items-center gap-2 mt-0.5 flex-wrap">
              <span className="flex items-center gap-1">
                Acc: {study.accessionNumber}
                <CopyButton text={study.accessionNumber} title="Copy Accession" size="xs" />
              </span>
              <span>•</span>
              <span className="flex items-center gap-1">
                MRN: {study.patientId || study.patientMrn || 'N/A'}
                {(study.patientId || study.patientMrn) && (
                  <CopyButton
                    text={study.patientId || study.patientMrn || ''}
                    title="Copy MRN"
                    size="xs"
                  />
                )}
              </span>
              {study.dateOfBirth && (
                <>
                  <span>•</span>
                  <span>DOB: {formatDicomDob(study.dateOfBirth)}</span>
                </>
              )}
            </div>
          </div>
        </div>

        {/* Dedicated Close Button */}
        <button
          type="button"
          onClick={onClose}
          aria-label="Close report modal (Esc)"
          title="Close modal (Esc)"
          className="p-1.5 rounded-full text-secondary hover:text-on-surface hover:bg-surface-container-highest transition-colors cursor-pointer border border-transparent hover:border-outline-variant/60 shrink-0"
        >
          <X className="w-5 h-5" />
        </button>
      </div>

      {/* 2. Sub-Header Toolbar: Multi-Study Switcher & Clinical Controls */}
      <div className="px-5 py-2 bg-surface-container-low flex flex-wrap items-center justify-between gap-3">
        {/* Left: Companion Studies Switcher or Study Description */}
        <div className="flex items-center gap-2 min-w-0">
          {allStudies.length > 1 ? (
            <div className="flex items-center gap-1.5 overflow-x-auto py-0.5 scrollbar-none">
              <span className="text-[10px] font-bold text-secondary uppercase tracking-wider shrink-0 flex items-center gap-1">
                <Layers className="w-3.5 h-3.5 text-primary" />
                Studies ({allStudies.length}):
              </span>
              {allStudies.map((st) => {
                const isActive = currentAcc === st.accessionNumber;
                return (
                  <button
                    key={st.accessionNumber}
                    type="button"
                    onClick={() => onSelectStudy?.(st.accessionNumber)}
                    className={cn(
                      'flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-xs font-semibold transition-all cursor-pointer whitespace-nowrap',
                      isActive
                        ? 'bg-primary text-primary-foreground shadow-xs'
                        : 'bg-surface-container hover:bg-surface-container-high text-secondary hover:text-on-surface border border-outline-variant/60'
                    )}
                    title={`Switch to ${st.studyDescription} (${st.accessionNumber})`}
                  >
                    <span>{st.studyDescription || st.accessionNumber}</span>
                    <span className={cn('text-[10px] font-mono', isActive ? 'text-primary-foreground/80' : 'text-secondary/70')}>
                      ({st.accessionNumber.slice(-5)})
                    </span>
                  </button>
                );
              })}
            </div>
          ) : (
            <div className="text-xs font-semibold text-secondary flex items-center gap-1.5 truncate">
              <FileText className="w-3.5 h-3.5 text-primary shrink-0" />
              <span className="truncate">{study.studyDescription || 'Diagnostic Examination'}</span>
            </div>
          )}
        </div>

        {/* Right: Mode Switcher & Quick Export Actions */}
        <div className="flex items-center gap-2 shrink-0">
          {onViewModeChange && (
            <div className="flex items-center bg-surface-container-high p-0.5 rounded-lg border border-outline-variant/60">
              <button
                type="button"
                onClick={() => onViewModeChange('read')}
                className={cn(
                  'flex items-center gap-1 px-2.5 py-1 rounded-md text-[11px] font-semibold transition-all cursor-pointer',
                  viewMode === 'read'
                    ? 'bg-surface text-primary shadow-xs'
                    : 'text-secondary hover:text-on-surface'
                )}
                title="Formatted Clinical Report View"
              >
                <Eye className="w-3.5 h-3.5" />
                <span>Formatted</span>
              </button>
              <button
                type="button"
                onClick={() => onViewModeChange('edit')}
                className={cn(
                  'flex items-center gap-1 px-2.5 py-1 rounded-md text-[11px] font-semibold transition-all cursor-pointer',
                  viewMode === 'edit'
                    ? 'bg-surface text-primary shadow-xs'
                    : 'text-secondary hover:text-on-surface'
                )}
                title="Edit Report Fields"
              >
                <Edit3 className="w-3.5 h-3.5" />
                <span>Edit</span>
              </button>
            </div>
          )}

          {onPrintOfficialReport && (
            <button
              type="button"
              onClick={onPrintOfficialReport}
              className="flex items-center gap-1.5 px-2.5 py-1 rounded-lg border border-emerald-500/40 bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 hover:bg-emerald-500/20 text-[11px] font-semibold transition-colors cursor-pointer"
              title="Print Official LGH / PGMI Stationery Report for Patient"
            >
              <Printer className="w-3.5 h-3.5" />
              <span className="hidden sm:inline">Print</span>
            </button>
          )}

          <button
            type="button"
            onClick={onCopyReport}
            className="flex items-center gap-1.5 px-2.5 py-1 rounded-lg border border-outline-variant text-[11px] text-on-surface hover:bg-surface-container-high transition-colors cursor-pointer"
            title="Copy formatted consultation report"
          >
            {copied ? <Check className="w-3.5 h-3.5 text-emerald-500" /> : <Copy className="w-3.5 h-3.5 text-secondary" />}
            <span className="hidden sm:inline">{copied ? 'Copied' : 'Copy'}</span>
          </button>

          <Link
            href={`/workspace/${encodeURIComponent(study.accessionNumber)}`}
            className="flex items-center gap-1 px-2.5 py-1 rounded-lg border border-outline-variant text-[11px] text-primary hover:bg-surface-container-high transition-colors"
            title="Open Full Workspace"
          >
            <ExternalLink className="w-3.5 h-3.5" />
            <span className="hidden sm:inline">Workspace</span>
          </Link>
        </div>
      </div>
    </div>
  );
}
