// Layer 2 (Domain/Services): VPS Hot Staging & Fast Ingest Storage Service
import fs from 'fs';
import path from 'path';
import { db } from '@/db';
import { hotStagedStudies } from '@/db/schema';
import { eq, asc } from 'drizzle-orm';
import { detectOrientationFromDescription } from './dicom-geometry.service';
import type { StudyManifestResponse, StudyManifestSeries } from './study-manifest.service';

export const HOT_CASES_DIR = path.join(process.cwd(), 'storage', 'hot-cases');
export const MAX_HOT_STORAGE_BYTES = 10 * 1024 * 1024 * 1024; // 10 GB strict quota
export const HIGH_WATERMARK_BYTES = 8.5 * 1024 * 1024 * 1024; // 8.5 GB prune threshold

export interface StagedSliceMeta {
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
  sliceIndex: number;
  totalSlices?: number;
  sopUid?: string;
}

const sanitize = (s: string) => (s || '').replace(/[^a-zA-Z0-9._-]/g, '_');

function ensureDir(dirPath: string): void {
  if (!fs.existsSync(dirPath)) fs.mkdirSync(dirPath, { recursive: true });
}

export function formatDicomDateDaysAgo(daysAgo: number): string {
  const d = new Date(Date.now() - daysAgo * 24 * 60 * 60 * 1000);
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${y}${m}${day}`;
}

export const formatDicomToday = (): string => formatDicomDateDaysAgo(0);
export const formatDicomYesterday = (): string => formatDicomDateDaysAgo(1);

export function isHotStagingEnabled(): boolean {
  if (process.env.DISABLE_HOT_STAGING === 'true') return false;
  // Always enable in production, on Linux VPS, or when explicitly requested
  if (
    process.env.NODE_ENV === 'production' ||
    process.env.ENABLE_LOCAL_HOT_STAGING === 'true' ||
    process.env.HOT_STAGING_ENABLED === 'true' ||
    process.platform === 'linux' ||
    process.env.NODE_ENV === 'test' ||
    Boolean(process.env.VITEST)
  ) {
    return true;
  }
  // Local development guard: disable on local developer machines by default
  return false;
}

export async function saveStagedSlice(
  meta: StagedSliceMeta,
  buffer: Buffer
): Promise<{ success: boolean; stagedSlices: number; totalSlices: number }> {
  if (!isHotStagingEnabled()) {
    return { success: true, stagedSlices: 0, totalSlices: meta.totalSlices || 0 };
  }
  const cleanAcc = sanitize(meta.accessionNumber).toUpperCase();
  const cleanSeriesNum = sanitize(meta.seriesNumber || '1');
  const cleanSeriesDesc = sanitize(meta.seriesDescription || `Series_${cleanSeriesNum}`);
  const cleanSopUid = sanitize(meta.sopUid || `${cleanSeriesNum}_${meta.sliceIndex}`);

  const seriesFolder = path.join(HOT_CASES_DIR, cleanAcc, `series-${cleanSeriesNum}_${cleanSeriesDesc}`);
  ensureDir(seriesFolder);

  const fileName = `${String(meta.sliceIndex).padStart(4, '0')}_${cleanSopUid}.dcm`;
  const filePath = path.join(seriesFolder, fileName);
  await fs.promises.writeFile(filePath, buffer);

  const nowIso = new Date().toISOString();
  const todayDicom = meta.studyDate ? meta.studyDate.replace(/[^0-9]/g, '').slice(0, 8) : formatDicomToday();

  const [existing] = await db
    .select()
    .from(hotStagedStudies)
    .where(eq(hotStagedStudies.accessionNumber, cleanAcc))
    .limit(1);

  let updatedStaged = 1;
  const targetTotal = Math.max(meta.totalSlices || 0, existing?.totalSlices || 0, meta.sliceIndex + 1);

  if (existing) {
    updatedStaged = existing.sliceCount + 1;
    await db
      .update(hotStagedStudies)
      .set({
        sliceCount: updatedStaged,
        totalSlices: targetTotal,
        sizeBytes: existing.sizeBytes + buffer.length,
        lastSliceStagedAt: nowIso,
        updatedAt: nowIso,
      })
      .where(eq(hotStagedStudies.accessionNumber, cleanAcc));
  } else {
    await db.insert(hotStagedStudies).values({
      accessionNumber: cleanAcc,
      patientName: meta.patientName || 'PATIENT',
      patientId: meta.patientId || '',
      modality: (meta.modality || 'MR').toUpperCase(),
      studyDescription: meta.studyDescription || '',
      studyDate: todayDicom,
      studyTime: meta.studyTime || '',
      studyInstanceUid: meta.studyInstanceUid || '',
      sliceCount: 1,
      totalSlices: targetTotal,
      sizeBytes: buffer.length,
      isSyncedToS3: false,
      s3SyncedSliceCount: 0,
      lastSliceStagedAt: nowIso,
      createdAt: nowIso,
      updatedAt: nowIso,
    });
  }

  // Trigger quota enforcement asynchronously
  enforceHotStorageQuota().catch(() => {});
  return { success: true, stagedSlices: updatedStaged, totalSlices: targetTotal };
}

export async function getHotSliceBuffer(
  accession: string,
  seriesNumber: string = '1',
  sliceIndex: number = 0
): Promise<Buffer | null> {
  const cleanAcc = sanitize(accession).toUpperCase();
  const caseFolder = path.join(HOT_CASES_DIR, cleanAcc);
  if (!fs.existsSync(caseFolder)) return null;

  try {
    const seriesDirs = await fs.promises.readdir(caseFolder);
    const targetPrefix = `series-${sanitize(seriesNumber)}_`;
    const matchedDir = seriesDirs.find((d) => d === `series-${sanitize(seriesNumber)}` || d.startsWith(targetPrefix));
    if (!matchedDir) return null;

    const fullSeriesPath = path.join(caseFolder, matchedDir);
    const files = (await fs.promises.readdir(fullSeriesPath)).filter((f) => f.endsWith('.dcm')).sort();
    if (files.length === 0) return null;

    const hasNumericPrefix = files.some((f) => /^\d{4}_/.test(f));

    let targetFile: string | null = null;
    if (hasNumericPrefix) {
      const prefix1 = `${String(sliceIndex + 1).padStart(4, '0')}_`;
      const prefix0 = `${String(sliceIndex).padStart(4, '0')}_`;
      targetFile =
        files.find((f) => f.startsWith(prefix1)) ||
        files.find((f) => f.startsWith(prefix0)) ||
        (sliceIndex < files.length ? files[sliceIndex] : null);
    } else {
      targetFile = sliceIndex < files.length ? files[sliceIndex] : null;
    }
    if (!targetFile) return null;

    return await fs.promises.readFile(path.join(fullSeriesPath, targetFile));
  } catch {
    return null;
  }
}

export async function getHotStudyManifest(accession: string, targetModality?: string): Promise<StudyManifestResponse | null> {
  const cleanAcc = sanitize(accession).toUpperCase();
  const caseFolder = path.join(HOT_CASES_DIR, cleanAcc);
  if (!fs.existsSync(caseFolder)) return null;

  const [record] = await db
    .select()
    .from(hotStagedStudies)
    .where(eq(hotStagedStudies.accessionNumber, cleanAcc))
    .limit(1);

  try {
    const seriesDirs = (await fs.promises.readdir(caseFolder)).filter((d) => d.startsWith('series-'));
    if (seriesDirs.length === 0) return null;

    const effectiveMod = (targetModality || record?.modality || 'MR').toUpperCase();
    const isTargetMr = effectiveMod.includes('MR');

    const series: StudyManifestSeries[] = [];
    for (const dirName of seriesDirs) {
      const parts = dirName.slice(7).split('_');
      const seriesNumber = parts[0] || '1';
      const seriesDescription = parts.slice(1).join(' ') || `Series ${seriesNumber}`;
      
      // Filter out mismatched modalities (e.g. CT Lung series mixed into MR Spine accession)
      if (isTargetMr && /lung|bone|mediastin|chest\s*ct/i.test(seriesDescription)) {
        continue;
      }

      const dcmFiles = (await fs.promises.readdir(path.join(caseFolder, dirName))).filter((f) => f.endsWith('.dcm'));

      const prefixNums = dcmFiles
        .map((f) => {
          const m = f.match(/^(\d{4})_/);
          return m ? parseInt(m[1], 10) : 0;
        })
        .filter((n) => n > 0);
      const maxPrefixNum = prefixNums.length > 0 ? Math.max(...prefixNums) : dcmFiles.length;

      series.push({
        seriesNumber,
        seriesDescription,
        orientation: detectOrientationFromDescription(seriesDescription),
        sliceCount: maxPrefixNum,
        modality: record?.modality || 'MR',
      });
    }

    series.sort((a, b) => parseInt(a.seriesNumber, 10) - parseInt(b.seriesNumber, 10));

    return {
      accessionNumber: cleanAcc,
      patientName: record?.patientName || 'PATIENT',
      patientId: record?.patientId || '',
      modality: record?.modality || 'MR',
      studyDescription: record?.studyDescription || '',
      studyDate: record?.studyDate || '',
      studyTime: record?.studyTime || '',
      studyInstanceUid: record?.studyInstanceUid || '',
      source: 'local',
      series,
    };
  } catch {
    return null;
  }
}

export async function calculateHotStorageBytes(): Promise<number> {
  if (!fs.existsSync(HOT_CASES_DIR)) return 0;
  let total = 0;
  const walk = async (dir: string) => {
    const entries = await fs.promises.readdir(dir, { withFileTypes: true });
    for (const entry of entries) {
      const full = path.join(dir, entry.name);
      if (entry.isDirectory()) await walk(full);
      else if (entry.isFile()) {
        const st = await fs.promises.stat(full);
        total += st.size;
      }
    }
  };
  await walk(HOT_CASES_DIR);
  return total;
}

export async function enforceHotStorageQuota(
  maxBytes: number = MAX_HOT_STORAGE_BYTES,
  maxAgeDays: number = 3
): Promise<{ prunedCount: number; remainingBytes: number }> {
  let currentBytes = await calculateHotStorageBytes();
  const todayDicom = formatDicomToday();
  const yesterdayDicom = formatDicomYesterday();
  const cutoffDateDicom = formatDicomDateDaysAgo(maxAgeDays);

  // 1. Fetch all candidate studies ordered FIFO by studyDate, then createdAt
  const allStaged = await db
    .select()
    .from(hotStagedStudies)
    .orderBy(asc(hotStagedStudies.studyDate), asc(hotStagedStudies.createdAt));

  // Prioritize synced studies first, followed by unsynced older studies
  const syncedCandidates = allStaged.filter((s) => s.isSyncedToS3);
  const unsyncedCandidates = allStaged.filter((s) => !s.isSyncedToS3);
  const candidates = [...syncedCandidates, ...unsyncedCandidates];

  let prunedCount = 0;
  for (const st of candidates) {
    // Invariant: Strictly protect active cases (today and yesterday)
    if (st.studyDate === todayDicom || st.studyDate === yesterdayDicom) continue;

    const isOlderThanRetention = (st.studyDate || '') < cutoffDateDicom;
    const needsQuotaRelief = currentBytes > HIGH_WATERMARK_BYTES;

    // Synced studies: prune if older than retention OR if quota relief needed
    // Unsynced studies: prune if older than retention OR if emergency quota relief needed
    const canPrune = st.isSyncedToS3
      ? isOlderThanRetention || needsQuotaRelief
      : isOlderThanRetention || currentBytes > maxBytes;

    if (!canPrune) continue;

    const caseFolder = path.join(HOT_CASES_DIR, st.accessionNumber);
    if (fs.existsSync(caseFolder)) {
      try {
        await fs.promises.rm(caseFolder, { recursive: true, force: true });
        currentBytes -= (st.sizeBytes || 0);
        prunedCount++;
      } catch {}
    }

    // Keep DB in sync: remove hot-staged record so no orphan rows remain
    try {
      await db.delete(hotStagedStudies).where(eq(hotStagedStudies.accessionNumber, st.accessionNumber));
    } catch {}
  }

  return { prunedCount, remainingBytes: Math.max(0, currentBytes) };
}

let pruneDaemonTimer: NodeJS.Timeout | null = null;

export function startHotStoragePruneDaemon(intervalMinutes = 15): void {
  if (pruneDaemonTimer) return;
  pruneDaemonTimer = setInterval(() => {
    enforceHotStorageQuota().catch(() => {});
  }, intervalMinutes * 60 * 1000);
}

export function stopHotStoragePruneDaemon(): void {
  if (pruneDaemonTimer) {
    clearInterval(pruneDaemonTimer);
    pruneDaemonTimer = null;
  }
}
