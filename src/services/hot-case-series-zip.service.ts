// Layer 2 (Domain/Services): Fast Series-Level ZIP Ingestion & Zero-Duplication Extraction
import fs from 'fs';
import path from 'path';
import os from 'os';
import { execFile } from 'child_process';
import { promisify } from 'util';
import { db } from '@/db';
import { hotStagedStudies } from '@/db/schema';
import { eq } from 'drizzle-orm';
import { HOT_CASES_DIR, isHotStagingEnabled, formatDicomToday } from './hot-case-staging.service';

const execFileAsync = promisify(execFile);
const sanitize = (s: string) => (s || '').replace(/[^a-zA-Z0-9._-]/g, '_');

export interface StagedSeriesZipMeta {
  accessionNumber: string;
  patientName?: string;
  patientId?: string;
  modality?: string;
  studyDescription?: string;
  studyDate?: string;
  studyTime?: string;
  studyInstanceUid?: string;
  seriesNumber: string;
  seriesDescription?: string;
  totalStudySlices?: number;
  seriesSliceCount?: number;
}

function ensureDir(dirPath: string): void {
  if (!fs.existsSync(dirPath)) fs.mkdirSync(dirPath, { recursive: true });
}

export async function extractZip(zipPath: string, targetDir: string): Promise<void> {
  ensureDir(targetDir);
  if (process.platform === 'win32') {
    await execFileAsync('powershell.exe', [
      '-NoProfile',
      '-NonInteractive',
      '-Command',
      `Expand-Archive -LiteralPath '${zipPath.replace(/'/g, "''")}' -DestinationPath '${targetDir.replace(/'/g, "''")}' -Force`,
    ]);
  } else {
    // Linux VPS native high-speed unzip
    const unzipBin = fs.existsSync('/usr/bin/unzip') ? '/usr/bin/unzip' : 'unzip';
    await execFileAsync(unzipBin, ['-o', '-q', zipPath, '-d', targetDir]);
  }
}

async function flattenAndNormalizeDcmFiles(dir: string): Promise<{ count: number; totalBytes: number }> {
  let count = 0;
  let totalBytes = 0;

  async function scan(current: string) {
    const entries = await fs.promises.readdir(current, { withFileTypes: true });
    for (const ent of entries) {
      const fullPath = path.join(current, ent.name);
      if (ent.isDirectory()) {
        await scan(fullPath);
        try {
          await fs.promises.rmdir(fullPath);
        } catch {}
      } else if (ent.isFile()) {
        const ext = path.extname(ent.name).toLowerCase();
        let targetName = ent.name;
        if (ext !== '.dcm') {
          targetName = `${path.parse(ent.name).name}.dcm`;
        }
        const targetPath = path.join(dir, targetName);
        if (fullPath !== targetPath) {
          await fs.promises.rename(fullPath, targetPath);
        }
        const stat = await fs.promises.stat(targetPath);
        totalBytes += stat.size;
        count++;
      }
    }
  }

  await scan(dir);
  return { count, totalBytes };
}

export async function saveStagedSeriesZip(
  meta: StagedSeriesZipMeta,
  zipBuffer: Buffer
): Promise<{
  success: boolean;
  accession: string;
  seriesNumber: string;
  stagedSlices: number;
  totalSlices: number;
  newSlicesInSeries: number;
}> {
  if (!isHotStagingEnabled()) {
    return {
      success: true,
      accession: meta.accessionNumber,
      seriesNumber: meta.seriesNumber || '1',
      stagedSlices: 0,
      totalSlices: meta.totalStudySlices || 0,
      newSlicesInSeries: 0,
    };
  }

  const cleanAcc = sanitize(meta.accessionNumber).toUpperCase();
  const cleanSeriesNum = sanitize(meta.seriesNumber || '1');
  const cleanSeriesDesc = sanitize(meta.seriesDescription || `Series_${cleanSeriesNum}`);

  const seriesFolder = path.join(HOT_CASES_DIR, cleanAcc, `series-${cleanSeriesNum}_${cleanSeriesDesc}`);
  ensureDir(seriesFolder);

  // 1. Temporary buffer file for zero-latency streaming extraction
  const tmpId = `${Date.now()}_${Math.random().toString(36).slice(2, 8)}`;
  const tmpZipPath = path.join(os.tmpdir(), `stage_${cleanAcc}_${cleanSeriesNum}_${tmpId}.zip`);

  let extractedCount = 0;
  let extractedBytes = 0;

  try {
    await fs.promises.writeFile(tmpZipPath, zipBuffer);
    await extractZip(tmpZipPath, seriesFolder);
    const normalized = await flattenAndNormalizeDcmFiles(seriesFolder);
    extractedCount = normalized.count;
    extractedBytes = normalized.totalBytes;
  } finally {
    // ZERO DOUBLE STORAGE: Unlink temporary zip immediately!
    try {
      if (fs.existsSync(tmpZipPath)) {
        await fs.promises.unlink(tmpZipPath);
      }
    } catch {}
  }

  // 2. Commit atomic metadata update to SQLite
  const nowIso = new Date().toISOString();
  const todayDicom = meta.studyDate ? meta.studyDate.replace(/[^0-9]/g, '').slice(0, 8) : formatDicomToday();

  const [existing] = await db
    .select()
    .from(hotStagedStudies)
    .where(eq(hotStagedStudies.accessionNumber, cleanAcc))
    .limit(1);

  let updatedStaged = extractedCount;
  const targetTotal = Math.max(meta.totalStudySlices || 0, existing?.totalSlices || 0, updatedStaged);

  if (existing) {
    updatedStaged = existing.sliceCount + extractedCount;
    await db
      .update(hotStagedStudies)
      .set({
        sliceCount: updatedStaged,
        totalSlices: targetTotal,
        sizeBytes: existing.sizeBytes + extractedBytes,
        lastSliceStagedAt: nowIso,
        updatedAt: nowIso,
      })
      .where(eq(hotStagedStudies.accessionNumber, cleanAcc));
  } else {
    let storageTargetUserId: string | null = null;
    let isEphemeralVps = false;
    try {
      const { hospitalPacsStudies } = await import('@/db/schema');
      const [pacs] = await db
        .select({
          storageTargetUserId: hospitalPacsStudies.storageTargetUserId,
          isEphemeralVps: hospitalPacsStudies.isEphemeralVps,
        })
        .from(hospitalPacsStudies)
        .where(eq(hospitalPacsStudies.accessionNumber, cleanAcc))
        .limit(1);
      if (pacs?.storageTargetUserId) {
        storageTargetUserId = pacs.storageTargetUserId;
        isEphemeralVps = Boolean(pacs.isEphemeralVps);
      }
    } catch {}

    await db.insert(hotStagedStudies).values({
      accessionNumber: cleanAcc,
      patientName: meta.patientName || 'PATIENT',
      patientId: meta.patientId || '',
      modality: (meta.modality || 'MR').toUpperCase(),
      studyDescription: meta.studyDescription || '',
      studyDate: todayDicom,
      studyTime: meta.studyTime || '',
      studyInstanceUid: meta.studyInstanceUid || '',
      sliceCount: extractedCount,
      totalSlices: targetTotal,
      sizeBytes: extractedBytes,
      isSyncedToS3: false,
      s3SyncedSliceCount: 0,
      storageTargetUserId,
      isEphemeralVps,
      lastSliceStagedAt: nowIso,
      createdAt: nowIso,
      updatedAt: nowIso,
    });
  }

  if (targetTotal > 0 && updatedStaged >= targetTotal) {
    try {
      const { updateStudyS3Status } = await import('./hospital-pacs-index.service');
      await updateStudyS3Status(cleanAcc, 'synced', { numInstances: targetTotal, modality: meta.modality });
    } catch {}

    try {
      const { tickArchivalPass } = await import('./hot-case-archiver.service');
      tickArchivalPass().catch(() => {});
    } catch {}
  }

  return {
    success: true,
    accession: cleanAcc,
    seriesNumber: cleanSeriesNum,
    stagedSlices: updatedStaged,
    totalSlices: targetTotal,
    newSlicesInSeries: extractedCount,
  };
}
