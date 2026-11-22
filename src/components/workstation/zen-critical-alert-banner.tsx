'use client';

import React from 'react';
import { AlertOctagon, Copy, Check } from 'lucide-react';
import { CriticalFindingMatch, formatUrgentErHandover } from '@/lib/critical-findings';
import { notify } from '@/services/notification.service';

interface ZenCriticalAlertBannerProps {
  criticalMatches: CriticalFindingMatch[];
  patientName?: string;
  patientMrn?: string;
  accessionNumber?: string;
  modality?: string;
  doctorName?: string;
}

export function ZenCriticalAlertBanner({
  criticalMatches,
  patientName,
  patientMrn,
  accessionNumber,
  modality = 'CT',
  doctorName,
}: ZenCriticalAlertBannerProps) {
  const [copied, setCopied] = React.useState(false);

  if (!criticalMatches || criticalMatches.length === 0) return null;

  const handleCopyUrgentHandover = async () => {
    const alertMsg = formatUrgentErHandover({
      patientName: patientName || 'Patient',
      mrn: patientMrn || accessionNumber || 'N/A',
      modality,
      criticalMatches,
      doctorName,
    });

    try {
      await navigator.clipboard.writeText(alertMsg);
    } catch {
      const ta = document.createElement('textarea');
      ta.value = alertMsg;
      document.body.appendChild(ta);
      ta.select();
      document.execCommand('copy');
      document.body.removeChild(ta);
    }

    setCopied(true);
    notify.success('Copied Urgent WhatsApp ER Handover Alert!');
    setTimeout(() => setCopied(false), 2000);
  };

  const findingsText = criticalMatches.map((m) => m.finding).join(', ');

  return (
    <div
      role="alert"
      className="mx-3 my-1 px-3 py-1.5 rounded-lg bg-rose-500/15 border border-rose-500/40 text-rose-300 flex items-center justify-between text-xs font-semibold shadow-xs select-none transition-all animate-in fade-in slide-in-from-top-1"
    >
      <div className="flex items-center gap-2 truncate">
        <span className="flex h-2 w-2 relative shrink-0">
          <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-rose-400 opacity-75"></span>
          <span className="relative inline-flex rounded-full h-2 w-2 bg-rose-500"></span>
        </span>
        <AlertOctagon className="w-3.5 h-3.5 text-rose-400 shrink-0" />
        <span className="truncate">
          <strong className="text-rose-200">Critical Alert:</strong> {findingsText}
        </span>
      </div>

      <button
        type="button"
        onClick={handleCopyUrgentHandover}
        className="ml-2 px-2.5 py-0.5 rounded bg-rose-600 hover:bg-rose-500 text-white text-[11px] font-bold flex items-center gap-1 shrink-0 transition-colors cursor-pointer shadow-2xs"
        title="Copy formatted emergency alert for WhatsApp / SMS ER clinical handover"
      >
        {copied ? <Check className="w-3 h-3 text-emerald-200" /> : <Copy className="w-3 h-3" />}
        <span>{copied ? 'Copied' : 'Copy ER Alert'}</span>
      </button>
    </div>
  );
}
