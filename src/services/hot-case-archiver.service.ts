// Layer 2 (Domain/Services): Polite VPS Background Archiver to Telegram S3
import fs from 'fs';
import path from 'path';
import { ZipArchive } from 'archiver';
import { PassThrough } from 'stream';
import { db } from '@/db';
import { hotStagedStudies } from '@/db/schema';
import { eq, desc } from 'drizzle-orm';
import { HOT_CASES_DIR, enforceHotStorageQuota } from './hot-case-staging.service';
import { getEffectiveS3Credentials, buildS3Url, getSigV4Headers, s3HttpPut } from './s3-client';
import { getUserStorageTarget } from './case-storage-router.service';
import { uploadStudyToUserGoogleDrive } from './gdrive-study-upload.service';

let isArchiverRunning = false;

interface ArchivalStats {
  studiesArchived: number;
  slicesArchived: number;
  lastRunAt: string | null;
  lastError: string | null;
}

const stats: ArchivalStats = {
  studiesArchived: 0,
  slicesArchived: 0,
  lastRunAt: null,
  lastError: null,
};

export function getArchivalStats(): ArchivalStats {
  return { ...stats };
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
  isArchiverRunning = true;
  stats.lastRunAt = new Date().toISOString();

  let totalSlicesArchived = 0;
  let totalStudiesCompleted = 0;

  try {
    const creds = getEffectiveS3Credentials();

    // Prioritize Today's cases first (studyDate DESC)
    const pendingStudies = await db
      .select()
      .from(hotStagedStudies)
      .where(eq(hotStagedStudies.isSyncedToS3, false))
      .orderBy(desc(hotStagedStudies.studyDate), desc(hotStagedStudies.createdAt))
      .limit(3);

    for (const study of pendingStudies) {
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
          await new Promise((r) => setTimeout(r, 1000));
          continue;
        }
      }

      // Route B: Admin cases archive to Admin Telegram S3
      if (!creds.enabled || !creds.bucket) {
        continue;
      }

      // S3 Keys: 1 Single Study ZIP + 1 lightweight manifest
      const s3ZipKey = `dicom/${year}/${month}/${mod}/${acc}_${pat}_${studyUid}.zip`;
      const s3ManifestKey = `dicom/${year}/${month}/${mod}/${acc}_${pat}_${studyUid}.manifest.json`;

      try {
        // 1. Compile Study ZIP
        const zipBuf = await createStudyZipBuffer(caseFolder);

        // 2. Upload Single Study ZIP in 1 PUT request
        const putUrl = buildS3Url(creds, s3ZipKey);
        const headers = getSigV4Headers(
          'PUT',
          putUrl,
          creds.region,
          creds.accessKeyId,
          creds.secretAccessKey,
          zipBuf,
          { 'content-type': 'application/zip' }
        );

        const res = await s3HttpPut(putUrl, headers, zipBuf, 120000);

        if (res.ok) {
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
          await s3HttpPut(manUrl, manHeaders, manifestBuf, 15000).catch(() => {});

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

          // 5. Enforce 10GB disk quota after each study archival
          await enforceHotStorageQuota().catch(() => {});
        } else if (res.status === 429 || res.status === 503) {
          stats.lastError = `Telegram S3 Rate Limit (${res.status}): Backing off`;
          await new Promise((r) => setTimeout(r, 6000));
        } else {
          stats.lastError = `S3 PUT failed with status ${res.status}`;
        }
      } catch (e: any) {
        stats.lastError = e?.message || 'S3 upload error';
      }

      // Polite inter-study pacing
      await new Promise((r) => setTimeout(r, 1000));
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
