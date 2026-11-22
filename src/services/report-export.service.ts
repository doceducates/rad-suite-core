// Layer 2 (Domain/Services): Centralized Report Export Orchestration Service
import { db } from '@/db';
import { reports, studies, patients, users } from '@/db/schema';
import { eq, or } from 'drizzle-orm';
import { logAudit } from './audit.service';
import { buildDocxReport } from './report-export-docx.service';
import { buildPdfReport } from './report-export-pdf.service';
import { splitTechniqueAndFindings, cleanClinicalHistory } from '@/lib/clinical-format';
import { cleanDoctorName, resolveDoctorDesignation } from '@/lib/consultants';
import type { ReportExportDto } from '@/lib/validation';
import type { ClinicalExportData, ReportExportResult } from './report-export-types';

export interface UserContextForExport {
  id: string;
  name: string;
  role?: string;
  department?: string;
}

export async function generateReportExport(
  dto: ReportExportDto,
  user?: UserContextForExport
): Promise<ReportExportResult> {
  let dbStudy: any = null;
  let dbPatient: any = null;
  let dbReport: any = null;
  let dbAuthor: any = null;

  // 1. If studyId or accessionNumber or reportId provided, resolve DB records to enrich data
  const identifier = dto.reportId || dto.studyId || dto.accessionNumber;
  if (identifier) {
    if (dto.reportId && dto.reportId.length > 5) {
      const [r] = await db.select().from(reports).where(eq(reports.id, dto.reportId)).limit(1);
      if (r) {
        dbReport = r;
        const [s] = await db.select().from(studies).where(eq(studies.id, r.studyId)).limit(1);
        dbStudy = s;
      }
    }

    if (!dbStudy && dto.studyId) {
      const [s] = await db.select().from(studies).where(eq(studies.id, dto.studyId)).limit(1);
      dbStudy = s;
    }

    if (!dbStudy && dto.accessionNumber) {
      const [s] = await db
        .select()
        .from(studies)
        .where(eq(studies.accessionNumber, dto.accessionNumber.trim().toUpperCase()))
        .limit(1);
      dbStudy = s;
    }

    if (dbStudy) {
      const [p] = await db.select().from(patients).where(eq(patients.id, dbStudy.patientId)).limit(1);
      dbPatient = p;
      if (!dbReport) {
        const [r] = await db.select().from(reports).where(eq(reports.studyId, dbStudy.id)).limit(1);
        dbReport = r;
      }
    }

    if (dbReport?.authorId) {
      const [u] = await db.select().from(users).where(eq(users.id, dbReport.authorId as any)).limit(1);
      dbAuthor = u;
    }
  }

  // 2. Synthesize unified export dataset (live client payload overrides DB values)
  const patientName = dto.patientName || dbPatient?.fullName || 'Anonymous Patient';
  const patientMrn = dto.patientMrn || dbPatient?.mrNumber || 'N/A';
  const patientAge = dto.patientAge ?? dbPatient?.age ?? undefined;
  const patientGender = dto.patientGender || dbPatient?.gender || undefined;
  const accessionNumber = dto.accessionNumber || dbStudy?.accessionNumber || `ACC-${Date.now().toString().slice(-6)}`;
  const modality = (dto.modality || dbStudy?.modality || 'CT').toUpperCase();
  const procedureName = dto.procedureName || dbStudy?.procedureName || dbStudy?.studyDescription;
  const studyDescription = dto.studyDescription || dbStudy?.studyDescription || procedureName || 'Diagnostic Examination';
  const studyDate = dto.studyDate || dbStudy?.scheduledAt || new Date().toISOString();

  const rawHistory = dto.clinicalHistory ?? dbReport?.clinicalHistory ?? dbStudy?.clinicalHistory ?? undefined;
  const rawTechnique = dto.technique ?? dbReport?.technique ?? undefined;
  const comparison = dto.comparison ?? dbReport?.comparison ?? undefined;
  const rawFindings = dto.findings || dbReport?.findings || '';
  const rawImpression = dto.impression || dbReport?.impression || '';
  const recommendations = dto.recommendations ?? dbReport?.recommendation ?? undefined;

  const { technique: cleanTech, findings: cleanFind } = splitTechniqueAndFindings(rawFindings, rawTechnique);
  const clinicalHistory = cleanClinicalHistory(rawHistory) || undefined;
  const technique = cleanTech || undefined;
  const findings = cleanFind;
  const impression = cleanClinicalHistory(rawImpression) || rawImpression;

  const hospitalName = dto.hospitalName || (user?.department ? `${user.department} Radiology` : (process.env.HOSPITAL_NAME || 'Hospital Radiology Department'));
  const department = dto.department || user?.department || 'Department of Radiology & Diagnostic Imaging';
  const rawPgr = dto.pgrName || dbAuthor?.name || user?.name || '';
  const pgrName = cleanDoctorName(rawPgr);
  const pgrDesignation = dto.pgrDesignation || (pgrName ? resolveDoctorDesignation(rawPgr, 'pgr') : undefined);

  const rawConsultant = dto.consultantName || '';
  const consultantName = cleanDoctorName(rawConsultant);
  const consultantDesignation =
    dto.consultantDesignation ||
    (consultantName ? resolveDoctorDesignation(rawConsultant, 'consultant') : undefined);
  const status = dto.status || dbReport?.status || 'final';

  const exportData: ClinicalExportData = {
    format: dto.format,
    hospitalName,
    department,
    patientName,
    patientMrn,
    patientAge,
    patientGender,
    accessionNumber,
    modality,
    procedureName,
    studyDescription,
    studyDate,
    clinicalHistory,
    technique,
    comparison,
    findings,
    impression,
    recommendations,
    pgrName,
    pgrDesignation,
    consultantName,
    consultantDesignation,
    status,
  };

  // 3. Build Document according to requested format
  let buffer: Buffer | Uint8Array;
  let mimeType: string;
  const cleanId = (accessionNumber || patientMrn || 'Report').replace(/[^a-zA-Z0-9_-]/g, '_');
  const fileName = `Report_${modality}_${cleanId}.${dto.format}`;

  if (dto.format === 'docx') {
    buffer = await buildDocxReport(exportData);
    mimeType = 'application/vnd.openxmlformats-officedocument.wordprocessingml.document';
  } else {
    buffer = await buildPdfReport(exportData);
    mimeType = 'application/pdf';
  }

  // 4. Log HIPAA tamper-evident audit record
  await logAudit({
    userId: user?.id || 'anonymous',
    userName: user?.name || pgrName,
    action: 'EXPORT_REPORT',
    entityType: 'Report',
    entityId: accessionNumber,
    details: `Exported ${modality} report as ${dto.format.toUpperCase()} for ${patientName} (MRN: ${patientMrn}, Accession: ${accessionNumber})`,
  });

  return { buffer, mimeType, fileName };
}
