// Layer 4 (Presentation): Reusable Worklist Export & Clinical Handover Utilities (<140 lines)
import { notify } from '@/services/notification.service';
import type { PacsStudyResult } from '@/types/pacs';

export function exportCasesCsv(cases: PacsStudyResult[]): void {
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
}

export function printCasesLogbook(cases: PacsStudyResult[]): void {
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
}

export function copyWhatsAppHandover(cases: PacsStudyResult[]): boolean {
  if (cases.length === 0) {
    notify.warning('No cases to format for WhatsApp');
    return false;
  }

  const dateStr = new Date().toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' });
  let text = `📋 *Radiology Daily Handover — ${dateStr}*\n━━━━━━━━━━━━━━━━━━━━━━\n`;

  cases.forEach((c, idx) => {
    text += `${idx + 1}. *${c.patientName || 'PATIENT'}* | ${c.age ? c.age + 'y' : ''}${c.gender ? '/' + c.gender : ''} | MRN: ${c.patientMrn || '—'}\n`;
    text += `   🔬 ${c.modality || 'MR'} — ${c.studyDescription || 'Exam'} | Acc: ${c.accessionNumber} | *${c.status?.toUpperCase() || 'SCHEDULED'}*\n`;
  });

  text += `\n*Total Records:* ${cases.length}\n`;

  if (typeof navigator !== 'undefined' && navigator.clipboard) {
    navigator.clipboard.writeText(text);
    notify.success('WhatsApp daily list copied to clipboard!');
    return true;
  }
  return false;
}
