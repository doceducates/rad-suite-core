import fs from 'fs';
import path from 'path';
import os from 'os';
import { getEffectiveS3Credentials, buildS3Url, getSigV4Headers, s3HttpGet } from './s3-client';
import { detectOrientationFromDescription } from './dicom-geometry.service';

export interface S3SeriesInfo {
  seriesNumber: string;
  seriesDescription: string;
  orientation?: 'AXIAL' | 'SAGITTAL' | 'CORONAL';
  sliceCount: number;
  keys: string[];
}

export interface S3StudyRetrievalOptions {
  modality?: string;
  studyInstanceUid?: string;
  keyPrefix?: string;
}

const CACHE_DIR = path.join(process.cwd(), 'storage', 'cache', 's3');
const seriesMetaCache = new Map<string, { expires: number; data: S3SeriesInfo[] }>();
const s3KeysCache = new Map<string, { expires: number; keys: string[] }>();

export function clearS3SeriesCache(accession?: string, modality?: string) {
  if (!accession) {
    seriesMetaCache.clear();
    s3KeysCache.clear();
    return;
  }
  const cleanAcc = accession.toUpperCase();
  s3KeysCache.delete(cleanAcc);
  for (const k of s3KeysCache.keys()) if (k.startsWith(cleanAcc)) s3KeysCache.delete(k);
  if (modality) {
    seriesMetaCache.delete(`${cleanAcc}::${modality.toUpperCase()}`);
  } else {
    seriesMetaCache.delete(cleanAcc);
    for (const k of seriesMetaCache.keys()) if (k.startsWith(`${cleanAcc}::`)) seriesMetaCache.delete(k);
  }
}

const sanitizePathSegment = (s: string) => s.replace(/[^a-zA-Z0-9._-]/g, '_');

function ensureCacheDir(subPath: string = '') {
  const targetDir = path.resolve(CACHE_DIR, sanitizePathSegment(subPath));
  if (!fs.existsSync(targetDir)) fs.mkdirSync(targetDir, { recursive: true });
  return targetDir;
}

export async function getS3StudyKeys(
  accession: string,
  options?: S3StudyRetrievalOptions
): Promise<string[]> {
  const creds = getEffectiveS3Credentials();
  if (!creds.enabled || !creds.bucket) return [];

  const sanitizedAcc = accession.toUpperCase();
  const cacheKey = `${sanitizedAcc}::${options?.modality || ''}::${options?.studyInstanceUid || ''}`;
  const cached = s3KeysCache.get(cacheKey);
  if (cached && Date.now() < cached.expires) {
    return cached.keys;
  }

  const targetModality = options?.modality ? options.modality.toUpperCase().trim() : undefined;
  const targetUid = options?.studyInstanceUid ? options.studyInstanceUid.trim() : undefined;

  let continuationToken: string | undefined = undefined;
  const matchedKeys: string[] = [];
  let pageCount = 0;
  const maxPages = options?.keyPrefix ? 3 : 5;
  const prefix = options?.keyPrefix || 'dicom/';

  try {
    do {
      if (++pageCount > maxPages) break;
      const queryParams: Record<string, string> = { 'list-type': '2', prefix };
      if (continuationToken) queryParams['continuation-token'] = continuationToken;

      const listUrl = buildS3Url(creds, '', queryParams);
      let headers: Record<string, string> = {};
      if (creds.accessKeyId && creds.secretAccessKey) {
        headers = getSigV4Headers('GET', listUrl, creds.region, creds.accessKeyId, creds.secretAccessKey);
      }

      const res = await s3HttpGet(listUrl, headers, 1500);
      if (!res.ok) {
        s3KeysCache.set(cacheKey, { keys: [], expires: Date.now() + 300 * 1000 });
        break;
      }

      const xml = await res.text();
      const keyMatches = [...xml.matchAll(/<Key>([^<]+)<\/Key>/g)];
      for (const m of keyMatches) {
        const k = m[1];
        if (k.endsWith('/')) continue;
        const upperK = k.toUpperCase();
        if (!upperK.includes(sanitizedAcc)) continue;
        if (targetModality && !upperK.includes(`/${targetModality}/`)) continue;
        if (targetUid && !k.includes(targetUid)) continue;
        matchedKeys.push(k);
      }

      const tokenMatch = xml.match(/<NextContinuationToken>([^<]+)<\/NextContinuationToken>/);
      continuationToken = tokenMatch ? tokenMatch[1] : undefined;
    } while (continuationToken);

    s3KeysCache.set(cacheKey, {
      keys: matchedKeys,
      expires: Date.now() + (matchedKeys.length > 0 ? 300 * 1000 : 60 * 1000),
    });
    return matchedKeys;
  } catch (err) {
    console.warn('[S3_RETRIEVAL_KEYS_ERR]', err);
    s3KeysCache.set(cacheKey, { keys: matchedKeys, expires: Date.now() + 300 * 1000 });
    return matchedKeys;
  }
}

export async function getS3StudySeries(
  accession: string,
  options?: S3StudyRetrievalOptions
): Promise<S3SeriesInfo[]> {
  const cleanAcc = accession.toUpperCase();
  const cacheKey = options?.modality ? `${cleanAcc}::${options.modality.toUpperCase()}` : cleanAcc;
  const cached = seriesMetaCache.get(cacheKey);
  if (cached && cached.expires > Date.now()) {
    return cached.data;
  }

  // 1. Check local manifest cache first
  const cacheSub = ensureCacheDir(cacheKey);
  const localManifestPath = path.join(cacheSub, 'manifest.json');
  if (fs.existsSync(localManifestPath)) {
    try {
      const manifest = JSON.parse(fs.readFileSync(localManifestPath, 'utf8'));
      if (manifest?.series && Array.isArray(manifest.series)) {
        const result: S3SeriesInfo[] = manifest.series.map((s: any) => ({
          seriesNumber: String(s.seriesNumber),
          seriesDescription: s.seriesDescription,
          orientation: s.orientation || detectOrientationFromDescription(s.seriesDescription),
          sliceCount: s.keys ? s.keys.length : (s.sliceCount || 0),
          keys: s.keys || [],
        }));
        const sorted = result.sort((a, b) => parseInt(a.seriesNumber, 10) - parseInt(b.seriesNumber, 10));
        seriesMetaCache.set(cacheKey, { expires: Date.now() + 5 * 60 * 1000, data: sorted });
        return sorted;
      }
    } catch {}
  }

  const keys = await getS3StudyKeys(accession, options);
  if (keys.length === 0) return [];

  // 2. Check S3 remote manifest.json
  const s3ManifestKey = keys.find(
    (k) => k.endsWith('/manifest.json') || k.endsWith('_manifest.json') || k.endsWith('.manifest.json')
  );
  if (s3ManifestKey) {
    try {
      const creds = getEffectiveS3Credentials();
      const getUrl = buildS3Url(creds, s3ManifestKey);
      let headers: Record<string, string> = {};
      if (creds.accessKeyId && creds.secretAccessKey) {
        headers = getSigV4Headers('GET', getUrl, creds.region, creds.accessKeyId, creds.secretAccessKey);
      }
      const res = await s3HttpGet(getUrl, headers, 4000);
      if (res.ok) {
        const text = await res.text();
        const manifest = JSON.parse(text);
        if (manifest?.series && Array.isArray(manifest.series)) {
          try {
            fs.writeFileSync(localManifestPath, JSON.stringify(manifest, null, 2), 'utf8');
          } catch {}
          const result: S3SeriesInfo[] = manifest.series.map((s: any) => ({
            seriesNumber: String(s.seriesNumber),
            seriesDescription: s.seriesDescription,
            orientation: s.orientation || detectOrientationFromDescription(s.seriesDescription),
            sliceCount: s.keys ? s.keys.length : (s.sliceCount || 0),
            keys: s.keys || [],
          }));
          const sorted = result.sort((a, b) => parseInt(a.seriesNumber, 10) - parseInt(b.seriesNumber, 10));
          seriesMetaCache.set(cacheKey, { expires: Date.now() + 5 * 60 * 1000, data: sorted });
          return sorted;
        }
      }
    } catch (err) {
      console.warn('[S3_MANIFEST_LOAD_WARN]', err);
    }
  }

  // 3. Fallback: Group and sort .dcm keys
  const dcmKeys = keys.filter((k) => k.endsWith('.dcm'));
  const seriesMap = new Map<string, { desc: string; keys: string[] }>();

  for (const k of dcmKeys) {
    const parts = k.split('/');
    let seriesNum = '1';
    let seriesDesc = 'Series 1';

    for (const part of parts) {
      if (part.startsWith('series-')) {
        const sub = part.slice(7).split('_');
        seriesNum = sub[0] || '1';
        seriesDesc = sub.slice(1).join(' ') || `Series ${seriesNum}`;
        break;
      }
    }

    const keyEntry = seriesMap.get(seriesNum) || { desc: seriesDesc, keys: [] };
    keyEntry.keys.push(k);
    seriesMap.set(seriesNum, keyEntry);
  }

  const result: S3SeriesInfo[] = [];
  for (const [num, data] of seriesMap.entries()) {
    const prefixNums = data.keys
      .map((k) => {
        const m = k.match(/\/(\d{4})_[^\/]+\.dcm$/i);
        return m ? parseInt(m[1], 10) : 0;
      })
      .filter((n) => n > 0);
    const maxPrefixNum = prefixNums.length > 0 ? Math.max(...prefixNums) : data.keys.length;
    result.push({
      seriesNumber: num,
      seriesDescription: data.desc,
      orientation: detectOrientationFromDescription(data.desc),
      sliceCount: maxPrefixNum,
      keys: data.keys.sort((a, b) => a.localeCompare(b, undefined, { numeric: true, sensitivity: 'base' })),
    });
  }
  const sorted = result.sort((a, b) => parseInt(a.seriesNumber, 10) - parseInt(b.seriesNumber, 10));
  seriesMetaCache.set(cacheKey, { expires: Date.now() + 5 * 60 * 1000, data: sorted });
  return sorted;
}

export async function getS3SliceBuffer(
  accession: string,
  seriesNumber: string = '1',
  sliceIndex: number = 0,
  options?: S3StudyRetrievalOptions
): Promise<Buffer | null> {
  const safeSeries = sanitizePathSegment(seriesNumber);
  const cacheKey = options?.modality ? `${accession.toUpperCase()}::${options.modality.toUpperCase()}` : accession.toUpperCase();
  const cacheSub = ensureCacheDir(cacheKey);
  const cacheFile = path.join(cacheSub, `${safeSeries}_${sliceIndex}.dcm`);

  if (fs.existsSync(cacheFile)) {
    try {
      return fs.readFileSync(cacheFile);
    } catch {}
  }

  const seriesList = await getS3StudySeries(accession, options);
  const series = seriesNumber
    ? seriesList.find((s) => s.seriesNumber === seriesNumber)
    : seriesList[0];
  if (!series || series.keys.length === 0) {
    const allKeys = await getS3StudyKeys(accession, options);
    const zipKey = allKeys.find((k) => k.endsWith('.zip'));
    if (zipKey) {
      try {
        const { getHotSliceBuffer } = await import('./hot-case-staging.service');
        const creds = getEffectiveS3Credentials();
        const getUrl = buildS3Url(creds, zipKey);
        const headers = creds.accessKeyId && creds.secretAccessKey
          ? getSigV4Headers('GET', getUrl, creds.region, creds.accessKeyId, creds.secretAccessKey)
          : {};
        const res = await s3HttpGet(getUrl, headers, 60000);
        if (res.ok) {
          const tmpZip = path.join(os.tmpdir(), `s3_${accession}_${Date.now()}.zip`);
          await fs.promises.writeFile(tmpZip, Buffer.from(await res.arrayBuffer()));
          const { extractZip } = await import('./hot-case-series-zip.service');
          await extractZip(tmpZip, path.join(process.cwd(), 'storage', 'hot-cases', accession));
          try { await fs.promises.unlink(tmpZip); } catch {}
          return getHotSliceBuffer(accession, seriesNumber, sliceIndex);
        }
      } catch (e) {
        console.warn('[S3_ZIP_HYDRATE_ERR]', e);
      }
    }
    return null;
  }

  const hasNumPrefix = series.keys.some((k) => /\/\d{4}_[^\/]+\.dcm$/i.test(k));
  const hasZeroBase = series.keys.some((k) => /\/0000_[^\/]+\.dcm$/i.test(k));

  let targetKey: string | undefined;
  if (hasNumPrefix) {
    const p1 = `/${String(sliceIndex + 1).padStart(4, '0')}_`;
    const p0 = `/${String(sliceIndex).padStart(4, '0')}_`;
    targetKey =
      series.keys.find((k) => k.includes(p1)) ||
      (hasZeroBase ? series.keys.find((k) => k.includes(p0)) : undefined);
  } else {
    targetKey = series.keys[sliceIndex];
  }
  if (!targetKey) return null;

  const creds = getEffectiveS3Credentials();
  const getUrl = buildS3Url(creds, targetKey);

  let headers: Record<string, string> = {};
  if (creds.accessKeyId && creds.secretAccessKey) {
    headers = getSigV4Headers('GET', getUrl, creds.region, creds.accessKeyId, creds.secretAccessKey);
  }

  try {
    const res = await s3HttpGet(getUrl, headers, 8000);
    if (!res.ok) return null;

    const arrBuf = await res.arrayBuffer();
    const buf = Buffer.from(arrBuf);
    if (process.env.NODE_ENV === 'production' || process.env.ENABLE_LOCAL_DISK_CACHE === 'true') {
      fs.promises.writeFile(cacheFile, buf).catch(() => {});
    }

    // Auto-populate hot-case staging disk cache
    try {
      const { saveStagedSlice } = await import('./hot-case-staging.service');
      const filename = path.basename(targetKey);
      const m = filename.match(/^(\d{4})_(.+)\.dcm$/i);
      saveStagedSlice(
        {
          accessionNumber: accession,
          seriesNumber,
          seriesDescription: series.seriesDescription,
          sliceIndex: sliceIndex + 1,
          totalSlices: series.sliceCount,
          sopUid: m ? m[2] : undefined,
        },
        buf
      ).catch(() => {});
    } catch {}

    return buf;
  } catch (err) {
    console.warn('[S3_SLICE_FETCH_ERR]', err);
    return null;
  }
}

export { createS3StudyZipBuffer } from './s3-zip.service';
