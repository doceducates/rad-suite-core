import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import fs from 'fs';
import path from 'path';
import os from 'os';
import crypto from 'crypto';
import { db } from '@/db';
import { users, studies, reports } from '@/db/schema';
import { eq } from 'drizzle-orm';
import {
  ingestDicomBundle,
  getIngestTargetDirectory,
} from '../dicom-bundle-ingestion.service';

describe('DICOM Bundle Ingestion Service', () => {
  let testUserId: string;
  let customCasesDir: string;
  const originalCasesDir = process.env.CASES_DIR;

  beforeEach(async () => {
    testUserId = crypto.randomUUID();
    customCasesDir = path.join(os.tmpdir(), `test_cases_${Date.now()}`);
    fs.mkdirSync(customCasesDir, { recursive: true });
    process.env.CASES_DIR = customCasesDir;

    await db.insert(users).values({
      id: testUserId,
      name: 'Ingest Test Clinician',
      email: `ingest-${crypto.randomBytes(3).toString('hex')}@radsuite.pk`,
      passwordHash: 'dummy',
      role: 'radiologist',
      createdAt: new Date(),
    } as any);
  });

  afterEach(() => {
    process.env.CASES_DIR = originalCasesDir;
    if (fs.existsSync(customCasesDir)) {
      fs.rmSync(customCasesDir, { recursive: true, force: true });
    }
  });

  it('resolves the ingest target directory reliably', () => {
    const dir = getIngestTargetDirectory();
    expect(fs.existsSync(dir)).toBe(true);
  });

  it('fails safely when neither zip nor files are provided', async () => {
    const res = await ingestDicomBundle(testUserId, {});
    expect(res.success).toBe(false);
    expect(res.error).toMatch(/No files or ZIP archive provided/);
  });

  it('ingests individual DICOM files and creates a workstation-ready local case', async () => {
    // Construct a minimal synthetic DICOM file buffer
    // DICOM magic "DICM" starts at byte offset 128
    const dcmHeader = Buffer.alloc(132);
    dcmHeader.write('DICM', 128);

    const res = await ingestDicomBundle(testUserId, {
      files: [
        { name: 'slice-001.dcm', buffer: dcmHeader },
        { name: 'slice-002.dcm', buffer: dcmHeader },
      ],
    });

    expect(res.success).toBe(true);
    expect(res.sliceCount).toBe(2);
    expect(res.accessionNumber).toBeDefined();
    expect(res.studyId).toBeDefined();

    // Verify study was registered in the database
    const dbStudy = await db
      .select()
      .from(studies)
      .where(eq(studies.accessionNumber, res.accessionNumber))
      .limit(1);

    expect(dbStudy.length).toBe(1);
    expect(dbStudy[0].id).toBe(res.studyId);
    expect(dbStudy[0].assignedRadiologistId).toBe(testUserId);

    // Verify initial draft report was generated
    const dbReports = await db
      .select()
      .from(reports)
      .where(eq(reports.studyId, res.studyId as any))
      .limit(1);

    expect(dbReports.length).toBe(1);
    expect(dbReports[0].status).toBe('draft');
    expect(dbReports[0].pgrAuthorId).toBe(testUserId);
  });

  it('ingests a ZIP archive containing DICOM files', async () => {
    const dcmHeader = Buffer.alloc(132);
    dcmHeader.write('DICM', 128);

    // Stage temporary folder and zip
    const tempStage = path.join(os.tmpdir(), `zip_stage_${Date.now()}`);
    fs.mkdirSync(tempStage, { recursive: true });
    fs.writeFileSync(path.join(tempStage, 'slice_01.dcm'), dcmHeader);
    const tempZip = path.join(os.tmpdir(), `test_bundle_${Date.now()}.zip`);

    try {
      const { execSync } = await import('child_process');
      if (process.platform === 'win32') {
        execSync(`powershell.exe -NoProfile -Command "Compress-Archive -Path '${tempStage}/*' -DestinationPath '${tempZip}' -Force"`);
      } else {
        execSync(`zip -r "${tempZip}" .`, { cwd: tempStage });
      }

      const zipBuf = fs.readFileSync(tempZip);
      const res = await ingestDicomBundle(testUserId, { zipBuffer: zipBuf });

      expect(res.success).toBe(true);
      expect(res.sliceCount).toBeGreaterThanOrEqual(1);
      expect(res.studyId).toBeDefined();

      const dbStudy = await db
        .select()
        .from(studies)
        .where(eq(studies.id, res.studyId as any))
        .limit(1);

      expect(dbStudy.length).toBe(1);
    } finally {
      if (fs.existsSync(tempStage)) fs.rmSync(tempStage, { recursive: true, force: true });
      if (fs.existsSync(tempZip)) fs.unlinkSync(tempZip);
    }
  });
});
