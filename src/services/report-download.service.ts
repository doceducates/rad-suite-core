// Layer 2 (Domain/Services): Client-side Report Download Helper
import { notify } from './notification.service';
import type { ReportExportDto } from '@/lib/validation';

export async function downloadReportFile(data: ReportExportDto): Promise<boolean> {
  const formatUpper = data.format.toUpperCase();
  const noticeMsg = `Generating ${formatUpper} diagnostic report...`;

  try {
    notify.info(noticeMsg);

    const response = await fetch('/api/reports/export', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(data),
    });

    if (!response.ok) {
      let errorMsg = `Server error (${response.status})`;
      try {
        const errJson = await response.json();
        if (errJson?.error) errorMsg = errJson.error;
      } catch {}
      throw new Error(errorMsg);
    }

    const blob = await response.blob();
    const disposition = response.headers.get('content-disposition');
    let filename = `Report_${data.modality || 'CT'}_${(data.accessionNumber || 'export').replace(/[^a-zA-Z0-9_-]/g, '_')}.${data.format}`;

    if (disposition && disposition.includes('filename=')) {
      const match = disposition.match(/filename="?([^"]+)"?/);
      if (match && match[1]) {
        filename = match[1];
      }
    }

    // Trigger browser file download via Blob URL
    const blobUrl = window.URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = blobUrl;
    link.download = filename;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    window.URL.revokeObjectURL(blobUrl);

    notify.success(`${formatUpper} report downloaded successfully.`);
    return true;
  } catch (err: any) {
    const errorDetails = err?.message || `Failed to export ${formatUpper} report`;
    notify.error(`Export failed: ${errorDetails}`);
    return false;
  }
}
