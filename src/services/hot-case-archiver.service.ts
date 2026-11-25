// Layer 2 (Domain/Services): Polite VPS Background Archiver to Telegram S3
import fs from 'fs';
import path from 'path';
import { ZipArchive } from 'archiver';
import { PassThrough } from 'stream';
import { db } from '@/db';
import { hotStagedStudies } from '@/db/schema';
import { eq, desc } from 'drizzle-orm';
import { HOT_CASES_DIR, enforceHotStorageQuota } from './hot-case-staging.service';
import { getEffectiveS3Credentials, buildS3Url, getSigV4Headers, s3HttpRequest } from './s3-client';
import { uploadBufferSmartToS3 } from './s3-multipart.service';
import { getUserStorageTarget } from './case-storage-router.service';
import { uploadStudyToUserGoogleDrive } from './gdrive-study-upload.service';

let isArchiverRunning = false;
let rateLimitCooldownUntil = 0;
let consecutiveRateLimits = 0;

const MAX_STUDIES_PER_PASS = 2;
const INTER_STUDY_DELAY_MS = 2500;
const COMPLETE_SETTLE_MS = 15000;
const INCOMPLETE_SETTLE_MS = 10 * 60 * 1000;

interface ArchivalStats {
  studiesArchived: number;
  slicesArchived: number;
  lastRunAt: string | null;
  lastError: string | null;
  cooldownUntil?: string | null;
}

const stats: ArchivalStats = {
  studiesArchived: 0,
  slicesArchived: 0,
  lastRunAt: null,
  lastError: null,
  cooldownUntil: null,
};

export function getArchivalStats(): ArchivalStats {
  return { ...stats };
}

function parseRetryAfterMs(retryHeader: string | string[] | undefined, attempt: number): number {
  const raw = Array.isArray(retryHeader) ? retryHeader[0] : retryHeader;
  const parsedSec = raw ? parseInt(raw, 10) : NaN;
  if (!isNaN(parsedSec) && parsedSec > 0) {
    return Math.min(300000, Math.max(5000, parsedSec * 1000));
  }
  return Math.min(300000, 30000 * Math.pow(2, Math.max(0, attempt - 1)));
}

/**
 * Packages a local hot-case directory into a single consolidated Study ZIP buffer.
 */
export async function createStudyZipBuffer(caseFolder: string): Promise<Buffer> {
  const archive = new ZipArchive({ zlib: { level: 5 } });
  const passThrough = new PassThrough();
  archive.pipe(passThrough);

  const chunks: Uint8Array[] = [];
  passThrough.on('data', (c) => chunks.push(c));

  const seriesDirs = (await fs.promises.readdir(caseFolder)).filter((d) => d.startsWith('series-'));
  for (const dirName of seriesDirs) {
    const sPath = path.join(caseFolder, dirName);
    const files = (await fs.promises.readdir(sPath)).filter((f) => f.endsWith('.dcm')).sort();
    for (const f of files) {
      archive.file(path.join(sPath, f), { name: `${dirName}/${f}` });
    }
  }

  archive.finalize();

  await new Promise((resolve, reject) => {
    passThrough.on('end', resolve);
    passThrough.on('error', reject);
    archive.on('error', reject);
  });

  return Buffer.concat(chunks);
}

/**
 * Performs one pass of the background archiver:
 * Packages completed hot-case studies into Single Study ZIPs and PUTs to Telegram S3 in 1 request.
 */
export async function tickArchivalPass(): Promise<{ archivedSlices: number; completedStudies: number }> {
  if (isArchiverRunning) return { archivedSlices: 0, completedStudies: 0 };
  if (Date.now() < rateLimitCooldownUntil) {
    return { archivedSlices: 0, completedStudies: 0 };
  }
  isArchiverRunning = true;
  stats.lastRunAt = new Date().toISOString();

  let totalSlicesArchived = 0;
  let totalStudiesCompleted = 0;

  try {
    const creds = getEffectiveS3Credentials();

    // Prioritize Today's cases first (studyDate DESC); query broad pool so missing/incomplete folders don't starve queue
    const pendingStudies = await db
      .select()
      .from(hotStagedStudies)
      .where(eq(hotStagedStudies.isSyncedToS3, false))
      .orderBy(desc(hotStagedStudies.studyDate), desc(hotStagedStudies.createdAt))
      .limit(30);

    for (const study of pendingStudies) {
      if (totalStudiesCompleted >= MAX_STUDIES_PER_PASS) break;

      const caseFolder = path.join(HOT_CASES_DIR, study.accessionNumber);
      if (!fs.existsSync(caseFolder)) continue;

      const seriesDirs = (await fs.promises.readdir(caseFolder)).filter((d) => d.startsWith('series-'));
      let studySlicesCount = 0;
      for (const dirName of seriesDirs) {
        const sPath = path.join(caseFolder, dirName);
        const files = (await fs.promises.readdir(sPath)).filter((f) => f.endsWith('.dcm'));
        studySlicesCount += files.length;
      }

      if (studySlicesCount === 0) continue;

      // Completeness & settle gate: wait for all slices or an idle settle window before archiving Study ZIP
      const lastStagedMs = study.lastSliceStagedAt ? new Date(study.lastSliceStagedAt).getTime() : 0;
      const ageSinceLastSliceMs = lastStagedMs > 0 ? Date.now() - lastStagedMs : Infinity;
      const isComplete = (study.totalSlices || 0) > 0 && studySlicesCount >= (study.totalSlices || 0);
      const isSettled = isComplete
        ? ageSinceLastSliceMs >= COMPLETE_SETTLE_MS
        : ageSinceLastSliceMs >= INCOMPLETE_SETTLE_MS;
      if (!isSettled) continue;

      const year = (study.studyDate || '2026').slice(0, 4);
      const month = (study.studyDate || '202610').slice(4, 6);
      const mod = (study.modality || 'MR').toUpperCase();
      const acc = study.accessionNumber;
      const pat = (study.patientName || 'PATIENT').replace(/[^a-zA-Z0-9_-]/g, '_');
      const studyUid = study.studyInstanceUid || 'STUDY';

      // Route A: Non-admin clinician cases offload to their personal Google Drive
      if (study.storageTargetUserId) {
        const storageTarget = await getUserStorageTarget(study.storageTargetUserId);
        if (storageTarget.destination === 'google_drive') {
          try {
            const zipBuf = await createStudyZipBuffer(caseFolder);
            const gdriveRes = await uploadStudyToUserGoogleDrive({
              userId: study.storageTargetUserId,
              accessionNumber: acc,
              patientName: study.patientName,
              modality: mod,
              studyDate: study.studyDate,
              zipBuffer: zipBuf,
            });

            if (gdriveRes.success) {
              const nowIso = new Date().toISOString();
              await db
                .update(hotStagedStudies)
                .set({
                  isSyncedToS3: true,
                  s3SyncedSliceCount: studySlicesCount,
                  s3CompletedAt: nowIso,
                  updatedAt: nowIso,
                })
                .where(eq(hotStagedStudies.accessionNumber, study.accessionNumber));

              totalStudiesCompleted++;
              totalSlicesArchived += studySlicesCount;
              stats.studiesArchived++;
              stats.slicesArchived += studySlicesCount;

              // Immediately reclaim VPS NVMe SSD storage for ephemeral cases
              if (study.isEphemeralVps) {
                try {
                  fs.rmSync(caseFolder, { recursive: true, force: true });
                } catch {}
              }
            } else {
              stats.lastError = gdriveRes.error || 'Google Drive study upload failed';
            }
          } catch (gdErr: any) {
            stats.lastError = gdErr?.message || 'Google Drive archival exception';
          }
          await new Promise((r) => setTimeout(r, INTER_STUDY_DELAY_MS));
          continue;
        }
      }

      // Route B: Admin cases archive to Admin Telegram S3 as a single consolidated Study ZIP
      if (!creds.enabled || !creds.bucket || !creds.accessKeyId || !creds.secretAccessKey) {
        stats.lastError = 'VPS S3 credentials not configured; Study ZIP archival skipped';
        break;
      }

      // S3 Keys: 1 Single Study ZIP + 1 lightweight manifest
      const s3ZipKey = `dicom/${year}/${month}/${mod}/${acc}_${pat}_${studyUid}.zip`;
      const s3ManifestKey = `dicom/${year}/${month}/${mod}/${acc}_${pat}_${studyUid}.manifest.json`;

      try {
        // 1. Compile Study ZIP
        const zipBuf = await createStudyZipBuffer(caseFolder);
        if (!zipBuf || zipBuf.length === 0) continue;

        // 2. Upload Single Study ZIP (single PUT <=18MB or S3 Multipart in 15MB parts >18MB)
        const res = await uploadBufferSmartToS3(creds, s3ZipKey, zipBuf, 'application/zip');

        if (res.ok) {
          consecutiveRateLimits = 0;
          rateLimitCooldownUntil = 0;
          stats.cooldownUntil = null;
          stats.lastError = null;

          // 3. Upload tiny companion manifest
          const manifest = {
            accessionNumber: acc,
            patientName: study.patientName,
            patientId: study.patientId,
            modality: mod,
            studyDescription: study.studyDescription,
            studyDate: study.studyDate,
            studyTime: study.studyTime,
            studyInstanceUid: studyUid,
            totalSlices: studySlicesCount,
            seriesCount: seriesDirs.length,
            zipKey: s3ZipKey,
            zipBytes: zipBuf.length,
            archivedAt: new Date().toISOString(),
          };
          const manifestBuf = Buffer.from(JSON.stringify(manifest, null, 2), 'utf8');
          const manUrl = buildS3Url(creds, s3ManifestKey);
          const manHeaders = getSigV4Headers(
            'PUT',
            manUrl,
            creds.region,
            creds.accessKeyId,
            creds.secretAccessKey,
            manifestBuf,
            { 'content-type': 'application/json' }
          );
          await s3HttpRequest('PUT', manUrl, manHeaders, manifestBuf, 15000).catch(() => {});

          // 4. Mark study as synced to S3 in local DB
          const nowIso = new Date().toISOString();
          await db
            .update(hotStagedStudies)
            .set({
              isSyncedToS3: true,
              s3SyncedSliceCount: studySlicesCount,
              s3CompletedAt: nowIso,
              updatedAt: nowIso,
            })
            .where(eq(hotStagedStudies.accessionNumber, study.accessionNumber));

          totalStudiesCompleted++;
          totalSlicesArchived += studySlicesCount;
          stats.studiesArchived++;
          stats.slicesArchived += studySlicesCount;
          console.log(`[ARCHIVER] Archived Study ZIP ${s3ZipKey} (${(zipBuf.length / 1048576).toFixed(1)} MB, ${studySlicesCount} slices)`);

          // 5. Enforce 10GB disk quota after each study archival
          await enforceHotStorageQuota().catch(() => {});
        } else if (res.status === 429 || res.status === 503) {
          consecutiveRateLimits++;
          const cooldownMs = parseRetryAfterMs(res.headers?.['retry-after'], consecutiveRateLimits);
          rateLimitCooldownUntil = Date.now() + cooldownMs;
          stats.cooldownUntil = new Date(rateLimitCooldownUntil).toISOString();
          stats.lastError = `Telegram S3 Rate Limit (${res.status}): Backing off ${Math.round(cooldownMs / 1000)}s`;
          console.warn(`[ARCHIVER] ${stats.lastError}`);
          break;
        } else {
          const errSnippet = (await res.text().catch(() => '')).slice(0, 180);
          stats.lastError = `S3 PUT ${acc} failed (${res.status}): ${errSnippet}`;
          console.warn(`[ARCHIVER] ${stats.lastError}`);
        }
      } catch (e: any) {
        const msg = e?.message || 'S3 upload error';
        stats.lastError = `${acc}: ${msg}`;
        console.warn(`[ARCHIVER_ERR] ${acc}:`, msg);
        if (/429|503|SlowDown|Too Many Requests/i.test(msg)) {
          consecutiveRateLimits++;
          const cooldownMs = parseRetryAfterMs(undefined, consecutiveRateLimits);
          rateLimitCooldownUntil = Date.now() + cooldownMs;
          stats.cooldownUntil = new Date(rateLimitCooldownUntil).toISOString();
          break;
        }
      }

      // Polite inter-study pacing to respect Telegram S3 rate limits
      await new Promise((r) => setTimeout(r, INTER_STUDY_DELAY_MS));
    }
  } catch (err: any) {
    stats.lastError = err?.message || 'Archival loop error';
  } finally {
    isArchiverRunning = false;
  }

  return { archivedSlices: totalSlicesArchived, completedStudies: totalStudiesCompleted };
}

let archiverTimer: NodeJS.Timeout | null = null;

export function startArchiverDaemon(intervalSeconds = 20): void {
  if (archiverTimer) return;
  archiverTimer = setInterval(() => {
    tickArchivalPass().catch(() => {});
  }, intervalSeconds * 1000);
}

export function stopArchiverDaemon(): void {
  if (archiverTimer) {
    clearInterval(archiverTimer);
    archiverTimer = null;
  }
}
