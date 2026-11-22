'use client';

import React, { useMemo } from 'react';
import { FileText, CheckCircle2, Stethoscope, Layers, UserCheck, Copy, Sparkles } from 'lucide-react';
import { CopyButton } from '@/components/ui/copy-button';
import { formatFullClinicalReport } from '@/lib/clinical-format';
import type { PacsStudyResult } from '@/types/pacs';

interface WorklistReportModalReaderProps {
  study: PacsStudyResult;
  history: string;
  technique: string;
  findings: string;
  findingsHtml?: string;
  impression: string;
  impressionHtml?: string;
  pgrName?: string;
  consultantName?: string;
  onSwitchToEdit?: () => void;
}

/**
 * Converts plain text clinical findings into clean semantic HTML with bold anatomical levels
 * if the text is not already formatted as HTML.
 */
function ensureFormattedClinicalHtml(content: string): string {
  if (!content || typeof content !== 'string') return '';
  const trimmed = content.trim();
  if (!trimmed || /<[a-z][\s\S]*>/i.test(trimmed)) return trimmed;

  const lines = trimmed.split('\n');
  const out: string[] = [];
  let inList = false;

  for (const line of lines) {
    const l = line.trim();
    if (!l) {
      if (inList) { out.push('</ul>'); inList = false; }
      continue;
    }

    const isBullet = /^[•\-\*]\s*/.test(l) || /^\d+[\.\)]\s*/.test(l);
    let text = l.replace(/^[•\-\*]\s*/, '').replace(/^\d+[\.\)]\s*/, '');
    text = text.replace(
      /^((?:[CLSTD]\d-[CLSTD]\d|[CLSTD]\d|\bSpinal Alignment\b|\bIntervertebral Discs\b|\bConus & Thecal Sac\b|\bPosterior Elements\b|[A-Za-z0-9\s&/]+):)(.*)/i,
      '<strong>$1</strong>$2'
    );

    if (isBullet) {
      if (!inList) { out.push('<ul class="space-y-1">'); inList = true; }
      out.push(`<li>${text}</li>`);
    } else {
      if (inList) { out.push('</ul>'); inList = false; }
      out.push(`<p>${text}</p>`);
    }
  }
  if (inList) out.push('</ul>');
  return out.join('');
}

export function WorklistReportModalReader({
  study,
  history,
  technique,
  findings,
  findingsHtml,
  impression,
  impressionHtml,
  pgrName = 'Reporting Radiologist',
  consultantName = '',
}: WorklistReportModalReaderProps) {
  // Format HTML representations for high-fidelity rendering
  const renderedHistoryHtml = useMemo(() => {
    return ensureFormattedClinicalHtml(history);
  }, [history]);

  const renderedFindingsHtml = useMemo(() => {
    return ensureFormattedClinicalHtml(findingsHtml || findings);
  }, [findingsHtml, findings]);

  const renderedImpressionHtml = useMemo(() => {
    return ensureFormattedClinicalHtml(impressionHtml || impression);
  }, [impressionHtml, impression]);

  const fullReportText = useMemo(() => {
    return formatFullClinicalReport({
      patientName: study.patientName,
      patientMrn: study.patientMrn || study.patientId,
      accessionNumber: study.accessionNumber,
      modality: study.modality,
      studyDescription: study.studyDescription,
      studyDate: study.studyDate,
      clinicalHistory: history,
      technique,
      findings: renderedFindingsHtml,
      impression: renderedImpressionHtml,
      authorName: pgrName,
      consultantName,
    });
  }, [study, history, technique, renderedFindingsHtml, renderedImpressionHtml, pgrName, consultantName]);

  return (
    <div className="p-5 overflow-y-auto space-y-4 flex-1 text-xs select-text">
      {/* 1. Quick Copy Toolbar for Split-Screen HMIS Workflow */}
      <div className="flex flex-wrap items-center justify-between gap-2 p-2.5 rounded-xl bg-surface-container-high/70 border border-outline-variant/60">
        <span className="text-[11px] font-bold text-primary flex items-center gap-1.5 uppercase tracking-wider">
          <Sparkles className="w-3.5 h-3.5 text-primary" /> HMIS Copy Actions:
        </span>
        <div className="flex flex-wrap items-center gap-1.5">
          {history && (
            <CopyButton
              text={renderedHistoryHtml}
              richHtml
              size="xs"
              variant="outline"
              label="History"
              title="Copy Rich Formatted Clinical History for HMIS"
              className="border-outline-variant/80 hover:border-primary font-bold text-primary"
            />
          )}
          {renderedFindingsHtml && (
            <CopyButton
              text={renderedFindingsHtml}
              richHtml
              size="xs"
              variant="outline"
              label="Findings"
              title="Copy Rich Formatted Findings for HMIS"
              className="border-outline-variant/80 hover:border-primary font-bold text-primary"
            />
          )}
          {renderedImpressionHtml && (
            <CopyButton
              text={renderedImpressionHtml}
              richHtml
              size="xs"
              variant="outline"
              label="Impression"
              title="Copy Rich Formatted Impression for HMIS"
              className="border-outline-variant/80 hover:border-primary font-bold text-primary"
            />
          )}
          <CopyButton
            text={fullReportText}
            size="xs"
            variant="outline"
            label="Full Report"
            title="Copy Complete Consultation Report"
            className="border-primary/40 bg-primary/10 text-primary font-bold hover:bg-primary/20"
          />
        </div>
      </div>

      {/* 2. Clinical History Card */}
      {history && (
        <div className="p-3.5 rounded-xl border border-outline-variant/60 bg-surface-container-lowest space-y-1.5 shadow-2xs">
          <div className="flex items-center justify-between pb-1.5 border-b border-outline-variant/30">
            <span className="text-[10px] font-bold text-secondary uppercase tracking-wider flex items-center gap-1.5">
              <Stethoscope className="w-3.5 h-3.5 text-primary" /> Clinical Indication / History
            </span>
            <CopyButton text={renderedHistoryHtml} richHtml size="xs" title="Copy Clinical History for HMIS" />
          </div>
          <div
            className="clinical-prose text-xs text-on-surface leading-relaxed select-text"
            dangerouslySetInnerHTML={{ __html: renderedHistoryHtml }}
          />
        </div>
      )}

      {/* 3. Formatted Findings Document Sheet */}
      <div className="p-4 sm:p-5 rounded-2xl border border-outline-variant/60 bg-surface-container-lowest shadow-2xs space-y-2">
        <div className="flex items-center justify-between pb-2 border-b border-outline-variant/40">
          <div className="flex items-center gap-2">
            <FileText className="w-4 h-4 text-primary" />
            <span className="text-xs font-bold text-primary uppercase tracking-wider">Findings</span>
          </div>
          <CopyButton
            text={renderedFindingsHtml}
            richHtml
            size="xs"
            label="Copy Findings"
            title="Copy Formatted Findings to Clipboard"
          />
        </div>
        <div
          className="clinical-prose tiptap text-[13px] text-on-surface leading-relaxed select-text"
          dangerouslySetInnerHTML={{ __html: renderedFindingsHtml || '<p class="text-secondary italic">No findings documented.</p>' }}
        />
      </div>

      {/* 4. Formatted Impression Highlight Card */}
      <div className="p-4 sm:p-5 rounded-2xl border-2 border-primary/30 bg-primary/5 dark:bg-primary/10 shadow-2xs space-y-2">
        <div className="flex items-center justify-between pb-2 border-b border-primary/20">
          <div className="flex items-center gap-2">
            <CheckCircle2 className="w-4 h-4 text-primary" />
            <span className="text-xs font-bold text-primary uppercase tracking-wider">Impression / Conclusion</span>
          </div>
          <CopyButton
            text={renderedImpressionHtml}
            richHtml
            size="xs"
            label="Copy Impression"
            title="Copy Formatted Impression to Clipboard"
          />
        </div>
        <div
          className="clinical-prose tiptap text-[13px] text-on-surface font-medium leading-relaxed select-text"
          dangerouslySetInnerHTML={{ __html: renderedImpressionHtml || '<p class="text-secondary italic">No impression documented.</p>' }}
        />
        {pgrName && (
          <div className="pt-2 mt-2 border-t border-primary/15 flex items-center justify-between text-[11px] text-secondary">
            <span className="flex items-center gap-1 font-semibold text-primary">
              <UserCheck className="w-3.5 h-3.5" /> {pgrName}
            </span>
            <span className="italic text-[10px]">Verified Consultation Record</span>
          </div>
        )}
      </div>
    </div>
  );
}
