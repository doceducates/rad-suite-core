import { formatDate } from '@/lib/utils';

export interface PatientRecordRow {
  patient: {
    id: string;
    mrNumber: string;
    fullName: string;
    age: number;
    gender: string;
    phone?: string | null;
    guardianName?: string | null;
  };
  study: {
    id: string;
    accessionNumber: string;
    modality: string;
    scanType: string;
    bodyPart: string;
    priority: string;
    status: string;
    scheduledAt: string | Date;
    referringDoctor?: string | null;
    clinicalHistory?: string | null;
  };
  report: {
    id: string;
    status: string;
    findings?: string | null;
    impression?: string | null;
    criticalFinding?: boolean;
    signedAt?: string | Date | null;
  } | null;
}

const getStatusIcon = (status: string): string => {
  switch (status.toLowerCase()) {
    case 'final': return '✅';
    case 'draft': return '📝';
    case 'preliminary': return '🔍';
    case 'cancelled': return '❌';
    default: return '➡️';
  }
};

export const formatWhatsAppDailyList = (rows: PatientRecordRow[], date: Date): string => {
  const headerDate = Intl.DateTimeFormat('en-GB', { day: 'numeric', month: 'short', year: 'numeric' }).format(date);
  
  let msg = `📋 *Radiology Daily Report — ${headerDate}*\n━━━━━━━━━━━━━━━━━━━━━━\n`;
  
  let finalCount = 0;
  let pendingCount = 0;

  rows.forEach((row, idx) => {
    const { patient, study, report } = row;
    const gender = patient.gender.substring(0, 1).toUpperCase();
    const statusText = report?.status ? report.status : study.status;
    const icon = getStatusIcon(statusText);
    
    msg += `${idx + 1}. *${patient.fullName}* | ${patient.age}${gender} | MRN: ${patient.mrNumber}\n`;
    msg += `   🔬 ${study.modality} ${study.scanType} ${study.bodyPart} | ${icon} ${statusText}\n`;
    
    if (statusText.toLowerCase() === 'final') {
      finalCount++;
    } else if (statusText.toLowerCase() !== 'cancelled') {
      pendingCount++;
    }
  });

  msg += `━━━━━━━━━━━━━━━━━━━━━━\nTotal: ${rows.length} studies | Final: ${finalCount} | Pending: ${pendingCount}`;
  
  return msg;
};

const escapeCSV = (str?: string | null | number | boolean): string => {
  if (str === null || str === undefined) return '';
  const s = String(str);
  if (s.includes(',') || s.includes('"') || s.includes('\n')) {
    return `"${s.replace(/"/g, '""')}"`;
  }
  return s;
};

export const formatLogbookCSV = (rows: PatientRecordRow[]): string => {
  const headers = ['Sr#', 'Date', 'MRN', 'Patient Name', 'Age', 'Gender', 'Modality', 'Study', 'Body Part', 'Referring Doctor', 'Findings', 'Impression', 'Status'];
  const lines = [headers.join(',')];

  rows.forEach((row, idx) => {
    const { patient, study, report } = row;
    const statusText = report?.status || study.status;
    
    const line = [
      idx + 1,
      escapeCSV(formatDate(study.scheduledAt)),
      escapeCSV(patient.mrNumber),
      escapeCSV(patient.fullName),
      patient.age,
      escapeCSV(patient.gender),
      escapeCSV(study.modality),
      escapeCSV(study.scanType),
      escapeCSV(study.bodyPart),
      escapeCSV(study.referringDoctor),
      escapeCSV(report?.findings),
      escapeCSV(report?.impression),
      escapeCSV(statusText)
    ];
    lines.push(line.join(','));
  });

  return lines.join('\n');
};

export const formatLogbookHTML = (rows: PatientRecordRow[], date: Date): string => {
  const formattedDate = Intl.DateTimeFormat('en-GB', { day: 'numeric', month: 'short', year: 'numeric' }).format(date);
  
  let html = `<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <title>Radiology Logbook - ${formattedDate}</title>
  <style>
    body { font-family: system-ui, -apple-system, sans-serif; font-size: 12px; margin: 2cm; }
    h1 { font-size: 18px; margin-bottom: 5px; }
    .meta { font-size: 12px; color: #555; margin-bottom: 20px; }
    table { width: 100%; border-collapse: collapse; page-break-inside: auto; }
    tr { page-break-inside: avoid; page-break-after: auto; }
    th, td { border: 1px solid #ddd; padding: 6px; text-align: left; }
    th { background-color: #f8f9fa; font-weight: bold; }
    @media print {
      body { margin: 0; }
      @page { margin: 1cm; size: landscape; }
    }
  </style>
</head>
<body>
  <h1>Radiology Logbook</h1>
  <div class="meta">Date: ${formattedDate} | Total Studies: ${rows.length}</div>
  <table>
    <thead>
      <tr>
        <th>Sr#</th>
        <th>Date</th>
        <th>MRN</th>
        <th>Patient Name</th>
        <th>Age/Sex</th>
        <th>Study</th>
        <th>Status</th>
      </tr>
    </thead>
    <tbody>`;

  rows.forEach((row, idx) => {
    const { patient, study, report } = row;
    const gender = patient.gender.substring(0, 1).toUpperCase();
    const statusText = report?.status || study.status;
    
    html += `
      <tr>
        <td>${idx + 1}</td>
        <td>${formatDate(study.scheduledAt)}</td>
        <td>${patient.mrNumber}</td>
        <td>${patient.fullName}</td>
        <td>${patient.age}${gender}</td>
        <td>${study.modality} - ${study.scanType} (${study.bodyPart})</td>
        <td>${statusText}</td>
      </tr>`;
  });

  html += `
    </tbody>
  </table>
</body>
</html>`;

  return html;
};

export const generateWhatsAppLink = (text: string): string => {
  return `https://wa.me/?text=${encodeURIComponent(text)}`;
};
