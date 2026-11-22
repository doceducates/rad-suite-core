// Layer 2: Consolidated DICOM ZIP Generation across VPS Hot-Staging, Local Disk, and S3 Storage
import path from 'path';
import fs from 'fs';
import { ZipArchive } from 'archiver';
import { PassThrough } from 'stream';
import { getEffectiveS3Credentials, buildS3Url, getSigV4Headers, s3HttpGet } from './s3-client';
import { getS3StudyKeys, type S3StudyRetrievalOptions } from './s3-retrieval.service';
import { HOT_CASES_DIR } from './hot-case-staging.service';
import { getLocalCaseById } from './local-cases.service';

/**
 * Recursively adds DICOM files from a local directory into the zip archive.
 */
async function addLocalDirectoryToArchive(
  archive: ZipArchive,
  dir: string,
  prefix: string = ''
): Promise<number> {
  let count = 0;
  if (!fs.existsSync(dir)) return 0;

  async function walk(current: string) {
    const entries = await fs.promises.readdir(current, { withFileTypes: true });
    for (const ent of entries) {
      const fullPath = path.join(current, ent.name);
      if (ent.isDirectory()) {
        await walk(fullPath);
      } else if (ent.isFile()) {
        const ext = path.extname(ent.name).toLowerCase();
        if (ext === '.dcm' || !ext || ext === '.dicom') {
          const rel = path.relative(dir, fullPath).replace(/\\/g, '/');
          const entryName = prefix ? `${prefix}/${rel}` : rel;
          archive.file(fullPath, {
            name: entryName.endsWith('.dcm') ? entryName : `${entryName}.dcm`,
          });
          count++;
        }
      }
    }
  }

  await walk(dir);
  return count;
}

/**
 * Fallback to stream hot-staged RadiAnt ZIP archive from Cloud VPS when running locally in development.
 */
async function fetchZipFromCloudVps(accessions: string[]): Promise<Buffer | null> {
  const vpsUrl = (
    process.env.CLINIC_RELAY_URL ||
    process.env.NEXT_PUBLIC_CLINIC_RELAY_URL ||
    'https://radiology.sehatai.org'
  )
    .trim()
    .replace(/\/+$/, '');
  const appUrl = (process.env.NEXT_PUBLIC_APP_URL || '').trim().replace(/\/+$/, '');

  if (appUrl && appUrl === vpsUrl) return null;
  if (process.env.NODE_ENV === 'test' && !process.env.ENABLE_CLINIC_RELAY_IN_TEST) return null;

  const secret = (
    process.env.API_SECRET_KEY ||
    process.env.AUTH_SECRET ||
    'rad-suite-super-secret-crypto-token-2026'
  ).trim();
  const queryParam =
    accessions.length === 1
      ? `accession=${encodeURIComponent(accessions[0])}`
      : `accessions=${encodeURIComponent(accessions.join(','))}`;

  try {
    const res = await fetch(`${vpsUrl}/api/pacs/download?${queryParam}`, {
      method: 'GET',
      headers: { 'x-api-key': secret },
      signal: AbortSignal.timeout(120000),
    });
    if (res.ok) {
      const arr = await res.arrayBuffer();
      if (arr.byteLength > 100) {
        return Buffer.from(arr);
      }
    }
  } catch (err: any) {
    console.warn('[VPS_ZIP_PROXY_WARN]', err?.message);
  }
  return null;
}

export async function createS3StudyZipBuffer(
  accessionOrList: string | string[],
  options?: S3StudyRetrievalOptions
): Promise<Buffer | null> {
  const accList = (Array.isArray(accessionOrList) ? accessionOrList : [accessionOrList])
    .map((a) => (a || '').trim())
    .filter(Boolean);
  if (accList.length === 0) return null;

  const isMulti = accList.length > 1;
  const archive = new ZipArchive({ zlib: { level: 4 } });
  const passThrough = new PassThrough();
  archive.pipe(passThrough);

  const chunks: Uint8Array[] = [];
  passThrough.on('data', (c) => chunks.push(c));

  let totalFiles = 0;
  const creds = getEffectiveS3Credentials();

  for (const acc of accList) {
    const prefix = isMulti ? acc : '';
    let foundForAcc = 0;

    // 1. First Tier: VPS Hot Staging Cache (/storage/hot-cases/<accession>)
    const hotDir = path.join(HOT_CASES_DIR, acc);
    if (fs.existsSync(hotDir)) {
      foundForAcc = await addLocalDirectoryToArchive(archive, hotDir, prefix);
    }

    // 2. Second Tier: Local Workstation Storage (E:\Cases or configured local path)
    if (foundForAcc === 0) {
      const localCase = getLocalCaseById(acc);
      if (localCase?.folderPath && fs.existsSync(localCase.folderPath)) {
        foundForAcc = await addLocalDirectoryToArchive(archive, localCase.folderPath, prefix);
      }
    }

    // 3. Third Tier: S3 Cloud Object Storage
    if (foundForAcc === 0 && creds.enabled && creds.bucket) {
      const keys = await getS3StudyKeys(acc, options);

      // Fast Path: Single-Object Study ZIP already exists in S3 (only if single accession and no prior files)
      if (!isMulti && totalFiles === 0 && keys.length > 0) {
        const directZipKey = keys.find((k) => k.endsWith('.zip'));
        if (directZipKey) {
          const getUrl = buildS3Url(creds, directZipKey);
          let headers: Record<string, string> = {};
          if (creds.accessKeyId && creds.secretAccessKey) {
            headers = getSigV4Headers('GET', getUrl, creds.region, creds.accessKeyId, creds.secretAccessKey);
          }
          try {
            const res = await s3HttpGet(getUrl, headers, 60000);
            if (res.ok) {
              const arr = await res.arrayBuffer();
              archive.destroy();
              return Buffer.from(arr);
            }
          } catch (err) {
            console.warn('[S3_DIRECT_ZIP_DOWNLOAD_WARN]', directZipKey, err);
          }
        }
      }

      for (const k of keys) {
        if (k.endsWith('.zip')) continue;
        const getUrl = buildS3Url(creds, k);
        let headers: Record<string, string> = {};
        if (creds.accessKeyId && creds.secretAccessKey) {
          headers = getSigV4Headers('GET', getUrl, creds.region, creds.accessKeyId, creds.secretAccessKey);
        }

        try {
          const res = await s3HttpGet(getUrl, headers, 15000);
          if (res.ok) {
            const arr = await res.arrayBuffer();
            const parts = k.split('/');
            const relativeName = isMulti
              ? (parts.length > 4 ? parts.slice(4).join('/') : `${acc}/${path.basename(k)}`)
              : (parts.length > 5 ? parts.slice(5).join('/') : path.basename(k));
            archive.append(Buffer.from(arr), {
              name: relativeName.endsWith('.dcm') ? relativeName : `${relativeName}.dcm`,
            });
            foundForAcc++;
          }
        } catch (e) {
          console.warn('[S3_ZIP_ENTRY_ERR]', k, e);
        }
      }
    }

    totalFiles += foundForAcc;
  }

  if (totalFiles === 0) {
    archive.destroy();
    const cloudBuffer = await fetchZipFromCloudVps(accList);
    if (cloudBuffer) return cloudBuffer;
    return null;
  }

  archive.finalize();

  await new Promise<void>((resolve, reject) => {
    passThrough.on('end', () => resolve());
    passThrough.on('error', reject);
    archive.on('error', reject);
  });

  return Buffer.concat(chunks);
}
