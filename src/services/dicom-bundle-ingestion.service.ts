// Layer 2 (Domain/Services): Drag & Drop DICOM / ZIP Ingestion Service
import fs from 'fs';
import path from 'path';
import os from 'os';
import crypto from 'crypto';
import { db } from '@/db';
import { studies, patients, reports } from '@/db/schema';
import { eq } from 'drizzle-orm';
import { extractZip } from './hot-case-series-zip.service';
import { parseStudyHeader } from './dicom-header-reader';
import { getLocalCases } from './local-cases.service';
import { resolvePatientByMrn } from './mrn-resolution.service';
import { logAudit } from './audit.service';

const sanitize = (s: string) => (s || '').replace(/[^a-zA-Z0-9._-]/g, '_');

export function getIngestTargetDirectory(): string {
  const configured = process.env.CASES_DIR || 'C:/MedicalSandbox/Cases';
  try {
    if (!fs.existsSync(configured)) {
      fs.mkdirSync(configured, { recursive: true });
    }
    return configured;
  } catch {
    const fallback = path.join(os.tmpdir(), 'radsuite_cases');
    if (!fs.existsSync(fallback)) fs.mkdirSync(fallback, { recursive: true });
    return fallback;
  }
}

export interface IngestItem {
  name: string;
  buffer: Buffer;
}

export interface IngestResult {
  success: boolean;
  accessionNumber: string;
  patientName: string;
  patientId: string;
  modality: string;
  studyDescription: string;
  sliceCount: number;
  caseId: string;
  studyId?: string;
  error?: string;
}

/**
 * Ingests a dropped ZIP archive or batch of DICOM files into the local case repository.
 */
export async function ingestDicomBundle(
  userId: string,
  options: {
    zipBuffer?: Buffer;
    files?: IngestItem[];
  }
): Promise<IngestResult> {
  const baseDir = getIngestTargetDirectory();
  const stagingId = `import_${Date.now()}_${crypto.randomBytes(3).toString('hex')}`;
  const stagingDir = path.join(baseDir, stagingId);
  fs.mkdirSync(stagingDir, { recursive: true });

  try {
    // 1. Extract ZIP or write individual files
    if (options.zipBuffer && options.zipBuffer.length > 0) {
      const zipTemp = path.join(os.tmpdir(), `${stagingId}.zip`);
      await fs.promises.writeFile(zipTemp, options.zipBuffer);
      try {
        await extractZip(zipTemp, stagingDir);
      } finally {
        try { await fs.promises.unlink(zipTemp); } catch {}
      }
    } else if (options.files && options.files.length > 0) {
      for (const f of options.files) {
        const targetPath = path.join(stagingDir, f.name);
        const parentDir = path.dirname(targetPath);
        if (!fs.existsSync(parentDir)) fs.mkdirSync(parentDir, { recursive: true });
        await fs.promises.writeFile(targetPath, f.buffer);
      }
    } else {
      throw new Error('No files or ZIP archive provided for ingestion');
    }

    // 2. Discover all extracted DICOM files
    const allDcmFiles: string[] = [];
    async function scan(dir: string) {
      const entries = await fs.promises.readdir(dir, { withFileTypes: true });
      for (const ent of entries) {
        const full = path.join(dir, ent.name);
        if (ent.isDirectory()) {
          await scan(full);
        } else if (ent.isFile()) {
          allDcmFiles.push(full);
        }
      }
    }
    await scan(stagingDir);

    if (allDcmFiles.length === 0) {
      throw new Error('No valid DICOM files discovered in the dropped payload');
    }

    // 3. Parse demographics from sample DICOM file
    const sampleFile = allDcmFiles[0];
    const studyMeta = parseStudyHeader(sampleFile, stagingId);

    const accessionNumber = studyMeta.accessionNumber?.trim() || `ACC-${Date.now()}`;
    const patientName = studyMeta.patientName?.trim() || 'Unknown Patient';
    const patientId = studyMeta.patientId?.trim() || `MRN-${accessionNumber}`;
    const modality = studyMeta.modality?.trim() || 'CT';
    const studyDescription = studyMeta.studyDescription?.trim() || `${modality} Study`;

    // 4. Move into canonical folder: case_<accession>
    const safeAcc = sanitize(accessionNumber);
    let finalCaseDir = path.join(baseDir, `case_${safeAcc}`);
    if (fs.existsSync(finalCaseDir) && finalCaseDir !== stagingDir) {
      finalCaseDir = path.join(baseDir, `case_${safeAcc}_${Date.now()}`);
    }

    await fs.promises.rename(stagingDir, finalCaseDir);

    // 5. Force refresh local-cases cache
    getLocalCases(true, baseDir);

    // 6. Ensure Patient and Study records in DB
    try {
      const patient = await resolvePatientByMrn({
        mrn: patientId,
        fullName: patientName,
        age: studyMeta.age ? parseInt(studyMeta.age, 10) || 40 : 40,
        gender: (studyMeta.gender === 'F' ? 'Female' : 'Male') as any,
      });

      const existing = await db
        .select()
        .from(studies)
        .where(eq(studies.accessionNumber, accessionNumber))
        .limit(1);

      let resolvedStudyId: string = '';
      if (existing.length === 0) {
        resolvedStudyId = crypto.randomUUID();
        await db.insert(studies).values({
          id: resolvedStudyId,
          patientId: patient.id,
          accessionNumber,
          modality,
          scanType: studyDescription,
          bodyPart: 'General',
          priority: 'routine',
          status: 'scheduled',
          clinicalHistory: 'Ingested via Rad Suite DICOM Uploader',
          scheduledAt: new Date().toISOString(),
          assignedRadiologistId: userId || null,
        } as any);
      } else {
        resolvedStudyId = existing[0].id;
      }

      // Ensure an initial blank draft report is linked to the study
      const existingReports = await db
        .select()
        .from(reports)
        .where(eq(reports.studyId, resolvedStudyId as any))
        .limit(1);

      if (existingReports.length === 0) {
        const now = new Date().toISOString();
        await db.insert(reports).values({
          id: crypto.randomUUID(),
          studyId: resolvedStudyId,
          patientId: patient.id,
          status: 'draft',
          technique: `<h3><strong>Technique</strong></h3><p>Diagnostic ${modality} examination performed.</p>`,
          findings: `<h3><strong>Findings</strong></h3><ul><li><p>No acute abnormality identified.</p></li></ul>`,
          impression: `<p>1. Unremarkable ${modality} examination.</p>`,
          pgrAuthorId: userId || null,
          createdAt: now,
          updatedAt: now,
        } as any);
      }

      // 7. Audit Log
      await logAudit({
        userId,
        action: 'INGEST_DICOM_BUNDLE',
        entityType: 'Study',
        entityId: accessionNumber,
        details: `Ingested ${allDcmFiles.length} DICOM instances for ${patientName} (${modality}) into local staging`,
      });

      return {
        success: true,
        accessionNumber,
        patientName,
        patientId,
        modality,
        studyDescription,
        sliceCount: allDcmFiles.length,
        caseId: path.basename(finalCaseDir),
        studyId: resolvedStudyId,
      };
    } catch (dbErr) {
      console.warn('[INGEST_DB_REGISTRATION_WARN]', dbErr);
    }

    return {
      success: true,
      accessionNumber,
      patientName,
      patientId,
      modality,
      studyDescription,
      sliceCount: allDcmFiles.length,
      caseId: path.basename(finalCaseDir),
    };
  } catch (err: any) {
    try {
      if (fs.existsSync(stagingDir)) {
        await fs.promises.rm(stagingDir, { recursive: true, force: true });
      }
    } catch {}

    return {
      success: false,
      accessionNumber: '',
      patientName: '',
      patientId: '',
      modality: '',
      studyDescription: '',
      sliceCount: 0,
      caseId: '',
      error: err?.message || 'Ingestion failed',
    };
  }
}
