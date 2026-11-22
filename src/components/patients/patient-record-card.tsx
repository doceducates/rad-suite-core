'use client';

import { useState } from 'react';
import { CopyButton } from '@/components/ui/copy-button';
import { getModalityColor, getPriorityColor, formatDate } from '@/lib/utils';
import { ChevronDown, ChevronUp, AlertTriangle } from 'lucide-react';
import type { PatientRecordRow } from '@/services/patient-records.service';
import { formatPatientSummary } from '@/lib/clipboard';
import { formatFullClinicalReport } from '@/lib/clinical-format';

interface PatientRecordCardProps {
  row: PatientRecordRow;
  index: number;
  selected: boolean;
  onToggleSelect: () => void;
}

export function PatientRecordCard({ row, index, selected, onToggleSelect }: PatientRecordCardProps) {
  const [expanded, setExpanded] = useState(false);
  const { patient, study, report } = row;
  const status = report?.status || study.status;

  const initials = patient.fullName
    .split(' ')
    .slice(0, 2)
    .map((w) => w[0])
    .join('')
    .toUpperCase();

  const getFullReportText = () =>
    formatFullClinicalReport({
      patientName: patient.fullName,
      patientMrn: patient.mrNumber,
      accessionNumber: study.accessionNumber,
      modality: study.modality,
      studyDescription: study.scanType,
      findings: report?.findings || 'N/A',
      impression: report?.impression || 'N/A',
    });

  return (
    <div className={`rounded-xl border transition-all ${selected ? 'border-primary bg-primary/5' : 'border-border bg-card'}`}>
      <div className="flex items-start gap-3 p-3">
        {/* Checkbox */}
        <input
          type="checkbox"
          checked={selected}
          onChange={onToggleSelect}
          className="mt-1.5 h-4 w-4 rounded border-border text-primary focus:ring-primary cursor-pointer accent-primary"
        />

        {/* Avatar */}
        <div className="w-9 h-9 rounded-full bg-primary/15 border border-primary/30 flex items-center justify-center text-primary text-xs font-bold shrink-0">
          {initials}
        </div>

        {/* Content */}
        <div className="flex-1 min-w-0">
          <div className="flex items-center justify-between gap-2">
            <div className="flex items-center gap-1.5 min-w-0">
              <span className="font-semibold text-sm text-foreground truncate">
                {index + 1}. {patient.fullName}
              </span>
              <CopyButton
                text={() =>
                  formatPatientSummary({
                    patientName: patient.fullName,
                    mrn: patient.mrNumber,
                    accessionNumber: study.accessionNumber,
                    age: patient.age,
                    gender: patient.gender,
                    modality: study.modality,
                    studyDescription: study.scanType,
                  })
                }
                size="xs"
                title="Copy Full Patient Details"
              />
            </div>
            <div className="flex items-center gap-1.5 shrink-0">
              {report?.criticalFinding && (
                <span title="🚨 Critical Finding (AI Flagged)">
                  <AlertTriangle className="w-3.5 h-3.5 text-rose-500 animate-pulse" />
                </span>
              )}
              <span className={`text-[10px] font-bold px-1.5 py-0.5 rounded border uppercase ${status === 'final' ? 'bg-emerald-500/15 text-emerald-600 dark:text-emerald-400 border-emerald-500/30' : status === 'preliminary' ? 'bg-amber-500/15 text-amber-600 dark:text-amber-400 border-amber-500/30' : 'bg-muted text-muted-foreground border-border'}`}>
                {status}
              </span>
            </div>
          </div>

          <div className="text-[11px] text-muted-foreground mt-0.5 flex flex-wrap items-center gap-x-2 gap-y-0.5">
            <span>{patient.age}y / {patient.gender}</span>
            <span>•</span>
            <span className="flex items-center gap-1">
              MRN: <span className="font-mono text-foreground">{patient.mrNumber}</span>
              <CopyButton text={patient.mrNumber} size="xs" title="Copy MRN" />
            </span>
            {study.accessionNumber && (
              <>
                <span>•</span>
                <span className="flex items-center gap-1">
                  Acc: <span className="font-mono text-foreground">{study.accessionNumber}</span>
                  <CopyButton text={study.accessionNumber} size="xs" title="Copy Accession" />
                </span>
              </>
            )}
          </div>

          <div className="flex items-center gap-2 mt-1.5">
            <span className={`text-[10px] font-semibold px-1.5 py-0.5 rounded border ${getModalityColor(study.modality)}`}>
              {study.modality}
            </span>
            <span className="text-[11px] text-foreground truncate">{study.scanType}</span>
            {study.priority !== 'routine' && (
              <span className={`text-[10px] font-bold px-1.5 py-0.5 rounded border ${getPriorityColor(study.priority)}`}>
                {study.priority}
              </span>
            )}
          </div>

          {/* Expand / Actions */}
          <div className="flex items-center gap-2 mt-2">
            <button
              onClick={() => setExpanded(!expanded)}
              className="flex items-center gap-1 text-[11px] text-primary hover:underline cursor-pointer"
            >
              {expanded ? <ChevronUp className="w-3 h-3" /> : <ChevronDown className="w-3 h-3" />}
              <span>{expanded ? 'Collapse' : 'Show Report'}</span>
            </button>
            <CopyButton
              text={getFullReportText}
              variant="ghost"
              size="xs"
              label="Copy Report"
              copiedLabel="Copied"
              title="Copy formatted consultation report"
            />
          </div>
        </div>
      </div>

      {/* Expanded Report */}
      {expanded && (
        <div className="px-4 pb-3 pt-1 border-t border-border text-[11px] space-y-2">
          {report?.findings && (
            <div>
              <div className="flex items-center justify-between mb-0.5">
                <span className="font-semibold text-muted-foreground">Findings:</span>
                <CopyButton text={report.findings} htmlContent size="xs" title="Copy Findings" />
              </div>
              <p className="text-foreground leading-relaxed whitespace-pre-wrap">{report.findings}</p>
            </div>
          )}
          {report?.impression && (
            <div>
              <div className="flex items-center justify-between mb-0.5">
                <span className="font-semibold text-muted-foreground">Impression:</span>
                <CopyButton text={report.impression} htmlContent size="xs" title="Copy Impression" />
              </div>
              <p className="text-foreground leading-relaxed whitespace-pre-wrap">{report.impression}</p>
            </div>
          )}
          {!report?.findings && !report?.impression && (
            <p className="text-muted-foreground italic">No report data available yet.</p>
          )}
        </div>
      )}
    </div>
  );
}
