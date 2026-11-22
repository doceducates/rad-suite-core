'use client';

// Layer 4 (Presentation): Worklist Clinical Logbook & Export Toolbar (<180 lines)
import React, { useState } from 'react';
import { Download, Printer, MessageCircle, Check } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { notify } from '@/services/notification.service';
import type { PacsStudyResult } from '@/types/pacs';

interface WorklistArchiveToolbarProps {
  cases: PacsStudyResult[];
  totalCount: number;
}

export function WorklistArchiveToolbar({ cases, totalCount }: WorklistArchiveToolbarProps) {
  const [copied, setCopied] = useState(false);

  const handleExportCsv = () => {
    if (cases.length === 0) {
      notify.warning('No cases available to export');
      return;
    }

    const headers = ['Accession', 'MRN', 'Patient Name', 'Age', 'Gender', 'Modality', 'Description', 'Scheduled Date', 'Status'];
    const rows = cases.map((c) => [
      `"${c.accessionNumber || ''}"`,
      `"${c.patientMrn || ''}"`,
      `"${(c.patientName || 'PATIENT').replace(/"/g, '""')}"`,
      `"${c.age || ''}"`,
      `"${c.gender || ''}"`,
      `"${c.modality || ''}"`,
      `"${(c.studyDescription || '').replace(/"/g, '""')}"`,
      `"${c.studyDate || ''}"`,
      `"${c.status || 'scheduled'}"`,
    ]);

    const csvContent = [headers.join(','), ...rows.map((r) => r.join(','))].join('\n');
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.setAttribute('download', `radiology_logbook_${new Date().toISOString().slice(0, 10)}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    notify.success('Logbook CSV exported successfully');
  };

  const handlePrintLogbook = () => {
    if (cases.length === 0) {
      notify.warning('No cases to print');
      return;
    }

    const printWin = window.open('', '_blank');
    if (!printWin) {
      notify.error('Popup blocked by browser. Please allow popups.');
      return;
    }

    const dateStr = new Date().toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' });
    const rowsHtml = cases
      .map(
        (c, idx) => `
      <tr>
        <td style="padding: 6px; border: 1px solid #ddd; text-align: center;">${idx + 1}</td>
        <td style="padding: 6px; border: 1px solid #ddd; font-weight: bold;">${c.patientName || 'PATIENT'}</td>
        <td style="padding: 6px; border: 1px solid #ddd; font-family: monospace;">${c.patientMrn || '—'}</td>
        <td style="padding: 6px; border: 1px solid #ddd; text-align: center;">${c.modality || 'MR'}</td>
        <td style="padding: 6px; border: 1px solid #ddd;">${c.studyDescription || '—'}</td>
        <td style="padding: 6px; border: 1px solid #ddd; font-family: monospace;">${c.accessionNumber}</td>
        <td style="padding: 6px; border: 1px solid #ddd; text-align: center; text-transform: uppercase;">${c.status || 'scheduled'}</td>
      </tr>`
      )
      .join('');

    printWin.document.write(`
      <!DOCTYPE html>
      <html>
        <head>
          <title>Radiology Case Logbook — ${dateStr}</title>
          <style>
            body { font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif; font-size: 11px; margin: 20px; color: #111; }
            h2 { margin: 0 0 4px 0; font-size: 16px; }
            p { margin: 0 0 12px 0; color: #555; }
            table { width: 100%; border-collapse: collapse; font-size: 11px; }
            th { background: #f0f0f0; border: 1px solid #bbb; padding: 6px; font-size: 10px; text-transform: uppercase; }
          </style>
        </head>
        <body>
          <h2>Radiology Department — Clinical Case Logbook</h2>
          <p>Generated: ${dateStr} | Total Records: ${cases.length}</p>
          <table>
            <thead>
              <tr>
                <th>#</th>
                <th>Patient Name</th>
                <th>MRN</th>
                <th>Modality</th>
                <th>Study Description</th>
                <th>Accession</th>
                <th>Status</th>
              </tr>
            </thead>
            <tbody>${rowsHtml}</tbody>
          </table>
          <script>window.onload = function() { window.print(); window.close(); }</script>
        </body>
      </html>
    `);
    printWin.document.close();
  };

  const handleCopyWhatsApp = () => {
    if (cases.length === 0) {
      notify.warning('No cases to format for WhatsApp');
      return;
    }

    const dateStr = new Date().toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' });
    let text = `📋 *Radiology Daily Handover — ${dateStr}*\n━━━━━━━━━━━━━━━━━━━━━━\n`;

    cases.forEach((c, idx) => {
      text += `${idx + 1}. *${c.patientName || 'PATIENT'}* | ${c.age ? c.age + 'y' : ''}${c.gender ? '/' + c.gender : ''} | MRN: ${c.patientMrn || '—'}\n`;
      text += `   🔬 ${c.modality || 'MR'} — ${c.studyDescription || 'Exam'} | Acc: ${c.accessionNumber} | *${c.status?.toUpperCase() || 'SCHEDULED'}*\n`;
    });

    text += `\n*Total Records:* ${cases.length}\n`;

    navigator.clipboard.writeText(text);
    setCopied(true);
    notify.success('WhatsApp daily list copied to clipboard!');
    setTimeout(() => setCopied(false), 3000);
  };

  return (
    <div className="flex flex-wrap items-center justify-between gap-2 px-1 text-xs">
      <div className="text-[11px] text-secondary font-medium">
        Showing <span className="font-semibold text-foreground">{cases.length}</span> of{' '}
        <span className="font-semibold text-foreground">{totalCount}</span> cases
      </div>

      <div className="flex items-center gap-1.5 ml-auto">
        <Button
          size="sm"
          variant="outline"
          onClick={handleExportCsv}
          className="h-7 px-2.5 text-[11px] gap-1.5 border-outline-variant/60 text-secondary hover:text-foreground hover:bg-surface-container cursor-pointer shadow-2xs"
          title="Export current filtered cases to CSV spreadsheet"
        >
          <Download className="w-3 h-3" />
          <span className="hidden sm:inline">Export CSV</span>
        </Button>

        <Button
          size="sm"
          variant="outline"
          onClick={handlePrintLogbook}
          className="h-7 px-2.5 text-[11px] gap-1.5 border-outline-variant/60 text-secondary hover:text-foreground hover:bg-surface-container cursor-pointer shadow-2xs"
          title="Print formatted clinical case logbook"
        >
          <Printer className="w-3 h-3" />
          <span className="hidden sm:inline">Print Logbook</span>
        </Button>

        <Button
          size="sm"
          variant="outline"
          onClick={handleCopyWhatsApp}
          className="h-7 px-2.5 text-[11px] gap-1.5 border-emerald-500/30 text-emerald-600 dark:text-emerald-400 hover:bg-emerald-500/10 cursor-pointer shadow-2xs"
          title="Copy formatted clinical summary for WhatsApp handover"
        >
          {copied ? <Check className="w-3 h-3 text-emerald-500" /> : <MessageCircle className="w-3 h-3" />}
          <span className="hidden sm:inline">{copied ? 'Copied Handover!' : 'WhatsApp Handover'}</span>
        </Button>
      </div>
    </div>
  );
}
