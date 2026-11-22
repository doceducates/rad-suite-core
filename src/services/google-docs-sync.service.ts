// Layer 2 (Domain/Services): Google Docs Clinical Formatting & Synchronization Service
import { db } from '@/db';
import { reports, studies, patients, users } from '@/db/schema';
import { eq } from 'drizzle-orm';
import { getUserGoogleAccessToken } from './google-auth.service';
import { ensureClinicalTaxonomyFolders } from './google-drive-folder.service';
import { logAudit } from './audit.service';

const DRIVE_UPLOAD_ENDPOINT = 'https://www.googleapis.com/upload/drive/v3/files';
const DRIVE_FILES_ENDPOINT = 'https://www.googleapis.com/drive/v3/files';

export interface SyncReportOptions {
  reportId: string;
  userId: string;
}

export interface SyncReportResult {
  success: boolean;
  googleDocId?: string;
  googleDocUrl?: string;
  syncedAt?: string;
  error?: string;
}

export function formatClinicalReportHtml(data: {
  hospitalName?: string;
  department?: string;
  patientName: string;
  patientMrn: string;
  age?: number;
  gender?: string;
  accessionNumber: string;
  modality: string;
  scanType: string;
  bodyPart?: string;
  studyDate?: string | Date;
  referringDoctor?: string;
  clinicalHistory?: string;
  technique?: string;
  comparison?: string;
  findings?: string;
  impression?: string;
  recommendations?: string;
  criticalFinding?: boolean;
  signedBy?: string;
  signedAt?: string | Date;
  status: string;
}): string {
  const d = data.studyDate ? new Date(data.studyDate) : new Date();
  const dateFormatted = isNaN(d.getTime()) ? '' : d.toLocaleDateString('en-US', {
    year: 'numeric', month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit'
  });

  const signDate = data.signedAt ? new Date(data.signedAt).toLocaleString() : new Date().toLocaleString();
  const hospital = data.hospitalName || 'RAD SUITE WORKSTATION — CLINICAL RADIOLOGY';

  return `<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <title>${data.accessionNumber} - ${data.patientName}</title>
</head>
<body style="font-family: Arial, Helvetica, sans-serif; font-size: 11pt; line-height: 1.5; color: #1a1a1a;">
  <div style="border-bottom: 2px solid #0284c7; padding-bottom: 8px; margin-bottom: 16px;">
    <h2 style="margin: 0; color: #0369a1; text-transform: uppercase; font-size: 16pt;">${hospital}</h2>
    <div style="font-size: 10pt; color: #475569; font-weight: bold;">${data.department || 'Department of Radiology & Diagnostic Imaging'}</div>
  </div>

  <table style="width: 100%; border-collapse: collapse; margin-bottom: 18px; font-size: 10pt; background-color: #f8fafc; border: 1px solid #cbd5e1;">
    <tr>
      <td style="padding: 6px 10px; border: 1px solid #cbd5e1;"><strong>Patient Name:</strong> ${data.patientName}</td>
      <td style="padding: 6px 10px; border: 1px solid #cbd5e1;"><strong>MRN / ID:</strong> ${data.patientMrn}</td>
      <td style="padding: 6px 10px; border: 1px solid #cbd5e1;"><strong>Age / Sex:</strong> ${data.age ?? 'N/A'} / ${data.gender ?? 'N/A'}</td>
    </tr>
    <tr>
      <td style="padding: 6px 10px; border: 1px solid #cbd5e1;"><strong>Accession #:</strong> ${data.accessionNumber}</td>
      <td style="padding: 6px 10px; border: 1px solid #cbd5e1;"><strong>Modality:</strong> ${data.modality}</td>
      <td style="padding: 6px 10px; border: 1px solid #cbd5e1;"><strong>Exam Date:</strong> ${dateFormatted}</td>
    </tr>
    <tr>
      <td colspan="2" style="padding: 6px 10px; border: 1px solid #cbd5e1;"><strong>Examination:</strong> ${data.scanType}</td>
      <td style="padding: 6px 10px; border: 1px solid #cbd5e1;"><strong>Referring Doctor:</strong> ${data.referringDoctor || 'Self / OPD'}</td>
    </tr>
  </table>

  ${data.criticalFinding ? '<div style="background-color: #fee2e2; border: 1px solid #ef4444; color: #b91c1c; padding: 8px 12px; margin-bottom: 16px; font-weight: bold; border-radius: 4px;">⚠️ STAT / CRITICAL FINDING COMMUNICATED TO CLINICAL TEAM</div>' : ''}

  ${data.clinicalHistory ? `
  <div style="margin-bottom: 14px;">
    <h4 style="margin: 0 0 4px 0; color: #0f172a; text-transform: uppercase; font-size: 11pt; border-bottom: 1px solid #e2e8f0; padding-bottom: 2px;">Clinical Indication & History</h4>
    <p style="margin: 0; color: #334155;">${data.clinicalHistory}</p>
  </div>` : ''}

  ${data.technique ? `
  <div style="margin-bottom: 14px;">
    <h4 style="margin: 0 0 4px 0; color: #0f172a; text-transform: uppercase; font-size: 11pt; border-bottom: 1px solid #e2e8f0; padding-bottom: 2px;">Technique</h4>
    <p style="margin: 0; color: #334155;">${data.technique}</p>
  </div>` : ''}

  ${data.comparison ? `
  <div style="margin-bottom: 14px;">
    <h4 style="margin: 0 0 4px 0; color: #0f172a; text-transform: uppercase; font-size: 11pt; border-bottom: 1px solid #e2e8f0; padding-bottom: 2px;">Comparison</h4>
    <p style="margin: 0; color: #334155;">${data.comparison}</p>
  </div>` : ''}

  <div style="margin-bottom: 16px;">
    <h4 style="margin: 0 0 6px 0; color: #0f172a; text-transform: uppercase; font-size: 11pt; border-bottom: 1px solid #e2e8f0; padding-bottom: 2px;">Findings</h4>
    <div style="color: #1e293b;">${data.findings || '<p>No acute radiological abnormalities demonstrated.</p>'}</div>
  </div>

  <div style="margin-bottom: 16px; background-color: #f1f5f9; padding: 12px 14px; border-left: 4px solid #0284c7; border-radius: 2px;">
    <h4 style="margin: 0 0 6px 0; color: #0369a1; text-transform: uppercase; font-size: 11pt;">Impression</h4>
    <div style="color: #0f172a; font-weight: 500;">${data.impression || '<p>Unremarkable study.</p>'}</div>
  </div>

  ${data.recommendations ? `
  <div style="margin-bottom: 16px;">
    <h4 style="margin: 0 0 4px 0; color: #0f172a; text-transform: uppercase; font-size: 11pt;">Recommendations</h4>
    <p style="margin: 0; color: #334155;">${data.recommendations}</p>
  </div>` : ''}

  <div style="margin-top: 24px; padding-top: 12px; border-top: 1px solid #cbd5e1; font-size: 10pt; color: #475569;">
    <div><strong>Electronically Verified & Signed:</strong> ${data.signedBy || 'Consultant Radiologist'}</div>
    <div><strong>Report Status:</strong> ${data.status.toUpperCase()} &nbsp;|&nbsp; <strong>Timestamp:</strong> ${signDate}</div>
    <div style="margin-top: 8px; font-size: 8pt; color: #94a3b8;">Rad Suite Certified Tele-Radiology Diagnostic Record • Accession: ${data.accessionNumber}</div>
  </div>
</body>
</html>`;
}

export async function syncReportToGoogleDocs(options: SyncReportOptions): Promise<SyncReportResult> {
  const token = await getUserGoogleAccessToken(options.userId);
  if (!token) {
    return { success: false, error: 'Google account is not connected. Please connect Google Drive in Settings.' };
  }

  // Fetch report, study, patient, and user
  const [report] = await db.select().from(reports).where(eq(reports.id, options.reportId)).limit(1);
  if (!report) {
    return { success: false, error: 'Report not found' };
  }

  const [study] = await db.select().from(studies).where(eq(studies.id, report.studyId)).limit(1);
  if (!study) {
    return { success: false, error: 'Associated study not found' };
  }

  const [patient] = await db.select().from(patients).where(eq(patients.id, study.patientId)).limit(1);
  const [author] = await db.select().from(users).where(eq(users.id, options.userId as any)).limit(1);

  // Resolve taxonomy folders
  const taxonomy = await ensureClinicalTaxonomyFolders(token, {
    modality: study.modality,
    studyDate: study.scheduledAt,
  });

  // Prepare HTML document content
  const htmlContent = formatClinicalReportHtml({
    hospitalName: author?.department ? `${author.department} Radiology` : undefined,
    department: author?.department || 'Department of Radiology',
    patientName: patient?.fullName || 'Unknown Patient',
    patientMrn: patient?.mrNumber || 'UNKNOWN-MRN',
    age: patient?.age,
    gender: patient?.gender,
    accessionNumber: study.accessionNumber,
    modality: study.modality,
    scanType: study.scanType,
    bodyPart: study.bodyPart,
    studyDate: study.scheduledAt,
    referringDoctor: study.referringDoctor || undefined,
    clinicalHistory: report.clinicalHistory || study.clinicalHistory || undefined,
    technique: report.technique || undefined,
    comparison: report.comparison || undefined,
    findings: report.findings || undefined,
    impression: report.impression || undefined,
    recommendations: (report as any).recommendations || (report as any).recommendation || undefined,
    criticalFinding: report.criticalFinding,
    signedBy: report.signedBy || author?.name || 'Dr. Consultant',
    signedAt: report.signedAt || report.updatedAt,
    status: report.status,
  });

  const docName = `[${study.modality}] ${study.accessionNumber} - ${patient?.fullName || 'Patient'} - ${study.scanType}`;
  let docId = (report as any).googleDocId;
  let webViewLink = (report as any).googleDocUrl;

  // Check if doc exists in Google Drive
  let existingValid = false;
  if (docId) {
    try {
      const checkRes = await fetch(`${DRIVE_FILES_ENDPOINT}/${docId}?fields=id,name,trashed`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (checkRes.ok) {
        const checkData = await checkRes.json();
        if (!checkData.trashed) existingValid = true;
      }
    } catch {}
  }

  if (existingValid && docId) {
    // Update existing document content
    const updateRes = await fetch(`${DRIVE_UPLOAD_ENDPOINT}/${docId}?uploadType=media`, {
      method: 'PATCH',
      headers: {
        Authorization: `Bearer ${token}`,
        'Content-Type': 'text/html',
      },
      body: htmlContent,
    });
    if (!updateRes.ok) {
      const errText = await updateRes.text();
      return { success: false, error: `Failed to update Google Doc: ${errText}` };
    }
  } else {
    // Create new Google Doc via multipart upload
    const boundary = '-------RadSuiteMultipartBoundary' + Date.now();
    const metadata = {
      name: docName,
      mimeType: 'application/vnd.google-apps.document',
      parents: [taxonomy.modalityFolderId],
    };

    const multipartBody =
      `--${boundary}\r\n` +
      `Content-Type: application/json; charset=UTF-8\r\n\r\n` +
      `${JSON.stringify(metadata)}\r\n` +
      `--${boundary}\r\n` +
      `Content-Type: text/html\r\n\r\n` +
      `${htmlContent}\r\n` +
      `--${boundary}--`;

    const createRes = await fetch(`${DRIVE_UPLOAD_ENDPOINT}?uploadType=multipart&fields=id,name,webViewLink`, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${token}`,
        'Content-Type': `multipart/related; boundary=${boundary}`,
      },
      body: multipartBody,
    });

    if (!createRes.ok) {
      const errText = await createRes.text();
      console.error('[GOOGLE_DOC_CREATE_FAIL]', createRes.status, errText);
      return { success: false, error: `Failed creating Google Doc: HTTP ${createRes.status}` };
    }

    const createData = await createRes.json();
    docId = createData.id;
    webViewLink = createData.webViewLink || `https://docs.google.com/document/d/${docId}/edit`;
  }

  const now = new Date();
  await db
    .update(reports)
    .set({
      googleDocId: docId,
      googleDocUrl: webViewLink,
      googleSyncedAt: now,
      googleSyncStatus: 'synced',
    } as any)
    .where(eq(reports.id, options.reportId));

  await logAudit({
    userId: options.userId,
    action: 'SYNC_GOOGLE_DOC',
    entityType: 'Report',
    entityId: options.reportId,
    details: `Synced report ${options.reportId} to Google Doc "${docName}" (ID: ${docId})`,
  });

  return {
    success: true,
    googleDocId: docId,
    googleDocUrl: webViewLink,
    syncedAt: now.toISOString(),
  };
}
