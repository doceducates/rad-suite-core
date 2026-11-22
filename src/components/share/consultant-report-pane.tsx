'use client';

// Layer 4 (Presentation): Consultant Read-Only Official Report Pane (<180 lines)
import React, { useState } from 'react';
import { FileText, Copy, Check, UserCheck, ShieldAlert, AlertTriangle } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { notify } from '@/services/notification.service';

interface ConsultantReportPaneProps {
  study: any;
  patient: any;
  report: any;
}

export function ConsultantReportPane({ study, patient, report }: ConsultantReportPaneProps) {
  const [copied, setCopied] = useState(false);

  const handleCopyText = async () => {
    try {
      const tempDiv = document.createElement('div');
      tempDiv.innerHTML = `
        PATIENT: ${patient.fullName} (MRN: ${patient.mrNumber})
        AGE/SEX: ${patient.age}Y / ${patient.gender}
        ACCESSION: ${study.accessionNumber}
        EXAMINATION: ${study.modality} ${study.scanType}

        ${report.technique || ''}
        ${report.findings || ''}
        <h3><strong>Impression</strong></h3>
        ${report.impression || ''}

        REPORTED BY: ${report.authorName || 'Resident Radiologist'}
      `;
      const plainText = tempDiv.innerText || tempDiv.textContent || '';
      await navigator.clipboard.writeText(plainText.trim());
      setCopied(true);
      notify.success('Report copied to clipboard!');
      setTimeout(() => setCopied(false), 2500);
    } catch {
      notify.error('Failed to copy report text');
    }
  };

  return (
    <div className="h-full flex flex-col bg-surface border-l border-outline-variant/60 overflow-hidden text-on-surface">
      {/* Pane Header */}
      <div className="px-4 py-3 bg-surface-container border-b border-outline-variant/60 flex items-center justify-between shrink-0">
        <div className="flex items-center gap-2">
          <FileText className="w-4 h-4 text-primary" />
          <h3 className="font-bold text-xs uppercase tracking-wider text-on-surface">
            Drafted Clinical Report
          </h3>
          {report.status && (
            <Badge variant={report.status === 'final' ? 'success' : 'warning'} className="text-[10px] uppercase">
              {report.status}
            </Badge>
          )}
        </div>

        <Button
          size="sm"
          variant="outline"
          onClick={handleCopyText}
          className="h-7 text-xs px-2.5 gap-1.5 border-outline-variant/60 cursor-pointer"
        >
          {copied ? <Check className="w-3.5 h-3.5 text-emerald-500" /> : <Copy className="w-3.5 h-3.5" />}
          <span className="hidden sm:inline">{copied ? 'Copied' : 'Copy Text'}</span>
        </Button>
      </div>

      {/* Critical Flag Alert */}
      {report.criticalFinding && (
        <div className="px-4 py-2 bg-rose-500/15 border-b border-rose-500/30 flex items-center gap-2 text-rose-600 dark:text-rose-400 text-xs font-bold">
          <ShieldAlert className="w-4 h-4 shrink-0 animate-pulse" />
          <span>🚨 AI Critical Flagged Finding — Immediate Consultant Attention</span>
        </div>
      )}

      {/* Report Body */}
      <div className="flex-1 overflow-y-auto p-5 space-y-5 text-xs font-sans leading-relaxed select-text">
        {/* Patient Demographics Banner */}
        <div className="p-3 rounded-xl bg-surface-container border border-outline-variant/50 grid grid-cols-2 gap-2 text-[11px]">
          <div>
            <span className="text-secondary block text-[10px]">Patient</span>
            <span className="font-bold">{patient.fullName}</span>
          </div>
          <div>
            <span className="text-secondary block text-[10px]">MRN / Accession</span>
            <span className="font-mono">{patient.mrNumber || study.accessionNumber}</span>
          </div>
          <div>
            <span className="text-secondary block text-[10px]">Demographics</span>
            <span>{patient.age}Y • {patient.gender}</span>
          </div>
          <div>
            <span className="text-secondary block text-[10px]">Modality / Protocol</span>
            <span className="font-semibold">{study.modality} • {study.scanType}</span>
          </div>
        </div>

        {/* Clinical History */}
        {study.clinicalHistory && (
          <div className="space-y-1">
            <h4 className="font-bold text-[11px] uppercase tracking-wider text-secondary">
              Clinical History &amp; Indication
            </h4>
            <p className="p-2.5 rounded-lg bg-surface-container/60 text-secondary italic">
              {study.clinicalHistory}
            </p>
          </div>
        )}

        {/* Technique */}
        {report.technique && (
          <div className="space-y-1">
            <div
              className="prose prose-sm dark:prose-invert max-w-none text-on-surface [&_h3]:text-xs [&_h3]:font-bold [&_h3]:text-secondary [&_h3]:uppercase [&_h3]:tracking-wider [&_h3]:mb-1 [&_p]:text-xs [&_p]:text-secondary"
              dangerouslySetInnerHTML={{ __html: report.technique }}
            />
          </div>
        )}

        {/* Findings */}
        {report.findings && (
          <div className="space-y-1.5">
            <div
              className="prose prose-sm dark:prose-invert max-w-none text-on-surface [&_h3]:text-xs [&_h3]:font-bold [&_h3]:text-secondary [&_h3]:uppercase [&_h3]:tracking-wider [&_h3]:mb-1.5 [&_ul]:list-disc [&_ul]:pl-5 [&_ul]:space-y-1 [&_li]:text-xs [&_strong]:text-primary"
              dangerouslySetInnerHTML={{ __html: report.findings }}
            />
          </div>
        )}

        {/* Impression (Two-Tier Synthesized) */}
        {report.impression && (
          <div className="p-4 rounded-xl bg-surface-container border-2 border-primary/20 space-y-1.5">
            <h4 className="font-bold text-xs uppercase tracking-wider text-primary flex items-center gap-1.5">
              <span>Impression</span>
            </h4>
            <div
              className="prose prose-sm dark:prose-invert max-w-none text-on-surface font-semibold text-xs leading-relaxed [&_p]:text-xs [&_p]:leading-relaxed"
              dangerouslySetInnerHTML={{ __html: report.impression }}
            />
          </div>
        )}

        {/* Attribution & PGR Signature */}
        <div className="pt-4 border-t border-outline-variant/50 flex items-center justify-between text-secondary text-[11px]">
          <div className="flex items-center gap-1.5">
            <UserCheck className="w-3.5 h-3.5 text-emerald-500" />
            <span>Reported by: <strong className="text-on-surface">{report.authorName}</strong></span>
          </div>
          {report.signedAt && (
            <span className="font-mono text-[10px]">
              Signed: {new Date(report.signedAt).toLocaleDateString()}
            </span>
          )}
        </div>
      </div>
    </div>
  );
}
