import fs from 'fs';
import path from 'path';
import type { PacsQueryFilter, PacsStudyResult } from '@/types/pacs';
import {
  getEffectiveS3Credentials,
  buildS3Url,
  getSigV4Headers,
  s3HttpGet,
} from './s3-client';

export interface S3UploadFile {
  filename: string;
  buffer: Buffer;
  contentType?: string;
}

export interface S3StudyUploadParams {
  accessionNumber: string;
  patientName: string;
  modality: string;
  studyDate?: string;
  studyInstanceUid?: string;
  seriesNumber?: number | string;
  seriesDescription?: string;
  files: S3UploadFile[];
}

export function getSanitizedName(str: string): string {
  return str.replace(/[^a-zA-Z0-9_-]/g, '_').replace(/_+/g, '_').toUpperCase();
}

export function getS3ReportKey(accession: string, modality: string, format: string, date: Date = new Date()): string {
  const year = String(date.getFullYear());
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const mod = modality.toUpperCase();
  const acc = getSanitizedName(accession);
  return `reports/${year}/${month}/${mod}/${acc}/report_${acc}.${format}`;
}

export function getS3VersionedReportKey(
  accession: string,
  modality: string,
  version: number,
  format: string = 'json',
  date: Date = new Date()
): string {
  const year = String(date.getFullYear());
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const mod = modality.toUpperCase();
  const acc = getSanitizedName(accession);
  const ts = date.toISOString().replace(/[-:T.]/g, '').slice(0, 14);
  return `reports/${year}/${month}/${mod}/${acc}/revisions/v${version}_${ts}_report_${acc}.${format}`;
}

let s3DiscoveryCache: { expires: number; studies: PacsStudyResult[] } | null = null;

export function clearS3DiscoveryCache() {
  s3DiscoveryCache = null;
}

function filterS3Results(studies: PacsStudyResult[], filter: PacsQueryFilter): PacsStudyResult[] {
  return studies.filter((s) => {
    if (filter.accessionNumber && !s.accessionNumber.toLowerCase().includes(filter.accessionNumber.toLowerCase())) {
      return false;
    }
    if (filter.modality && filter.modality.toLowerCase() !== 'all') {
      const sm = s.modality.toUpperCase();
      const fm = filter.modality.toUpperCase();
      if (sm !== fm && !(sm === 'MR' && fm === 'MRI') && !(sm === 'MRI' && fm === 'MR')) {
        return false;
      }
    }
    if (filter.query && filter.query.trim()) {
      const q = filter.query.trim().toLowerCase();
      const match =
        s.accessionNumber.toLowerCase().includes(q) ||
        s.patientName.toLowerCase().includes(q) ||
        s.studyDescription.toLowerCase().includes(q);
      if (!match) return false;
    }
    return true;
  });
}

export async function queryS3Studies(filter: PacsQueryFilter = {}): Promise<PacsStudyResult[]> {
  const creds = getEffectiveS3Credentials();
  if (!creds.enabled || !creds.bucket) {
    return [];
  }

  if (!filter.accessionNumber && !filter.query && s3DiscoveryCache && s3DiscoveryCache.expires > Date.now()) {
    return filterS3Results(s3DiscoveryCache.studies, filter);
  }

  try {
    const listUrl = buildS3Url(creds, '', { 'list-type': '2', prefix: 'dicom/' });
    let headers: Record<string, string> = {};
    if (creds.accessKeyId && creds.secretAccessKey) {
      headers = getSigV4Headers('GET', listUrl, creds.region, creds.accessKeyId, creds.secretAccessKey);
    }

    const res = await s3HttpGet(listUrl, headers, 6000);
    if (!res.ok) {
      return s3DiscoveryCache ? filterS3Results(s3DiscoveryCache.studies, filter) : [];
    }

    const xml = await res.text();
    const keyMatches = [...xml.matchAll(/<Key>([^<]+)<\/Key>/g)].map((m) => m[1]);

    const studiesMap = new Map<string, {
      accession: string;
      patientName: string;
      modality: string;
      studyDate: string;
      studyUid: string;
      series: Set<string>;
      instances: number;
    }>();

    for (const k of keyMatches) {
      const parts = k.split('/');
      if (parts[0] === 'dicom' && parts.length >= 5) {
        const studyFolderKey = parts.slice(0, 5).join('/');
        if (!studiesMap.has(studyFolderKey)) {
          const folder = parts[4];
          const sub = folder.split('_');
          const accession = sub[0] || folder;
          const patientName = sub.length > 2
            ? sub.slice(1, -1).join(' ').replace(/-/g, ' ')
            : (sub[1] || 'PATIENT (S3)').replace(/-/g, ' ');
          const studyUid = sub[sub.length - 1] || `1.2.840.113619.s3.${accession}`;

          studiesMap.set(studyFolderKey, {
            accession,
            patientName,
            modality: parts[3] || 'MR',
            studyDate: `${parts[1]}-${parts[2]}-01`,
            studyUid,
            series: new Set<string>(),
            instances: 0,
          });
        }

        const studyData = studiesMap.get(studyFolderKey)!;
        if (parts[5]) studyData.series.add(parts[5]);
        studyData.instances++;
      }
    }

    const allStudies: PacsStudyResult[] = Array.from(studiesMap.values()).map((s) => ({
      accessionNumber: s.accession,
      patientName: s.patientName,
      patientMrn: `S3-${s.accession.slice(-6)}`,
      patientId: `S3-${s.accession.slice(-6)}`,
      age: 45,
      gender: 'Other' as const,
      modality: s.modality,
      studyDescription: `S3 Cloud: ${s.modality} Study (${s.patientName})`,
      studyDate: s.studyDate,
      numSeries: Math.max(1, s.series.size),
      numInstances: s.instances,
      pacsServerAe: 'S3_STORAGE',
      studyInstanceUid: s.studyUid,
      source: 's3' as const,
      availableSources: ['s3' as const],
      isDownloaded: false,
    }));

    s3DiscoveryCache = { expires: Date.now() + 60000, studies: allStudies };
    return filterS3Results(allStudies, filter);
  } catch (err) {
    console.warn('[S3_QUERY_EXCEPTION]', err);
    return s3DiscoveryCache ? filterS3Results(s3DiscoveryCache.studies, filter) : [];
  }
}

export async function uploadStudyToS3(params: S3StudyUploadParams): Promise<{
  success: boolean;
  uploadedCount: number;
  s3Keys: string[];
}> {
  const creds = getEffectiveS3Credentials();
  if (!creds.enabled || !creds.bucket || !creds.accessKeyId || !creds.secretAccessKey) {
    return { success: false, uploadedCount: 0, s3Keys: [] };
  }

  const d = params.studyDate ? new Date(params.studyDate) : new Date();
  const year = String(d.getFullYear());
  const month = String(d.getMonth() + 1).padStart(2, '0');
  const mod = params.modality.toUpperCase();
  const studyFolder = `${getSanitizedName(params.accessionNumber)}_${getSanitizedName(params.patientName)}_${params.studyInstanceUid || 'UID'}`;
  const seriesFolder = `series-${params.seriesNumber || 1}_${getSanitizedName(params.seriesDescription || 'DEFAULT')}`;

  const uploadedKeys: string[] = [];
  let count = 0;

  for (const file of params.files) {
    const keyPath = `dicom/${year}/${month}/${mod}/${studyFolder}/${seriesFolder}/${file.filename}`;
    const putUrl = buildS3Url(creds, keyPath);
    const headers = getSigV4Headers(
      'PUT',
      putUrl,
      creds.region,
      creds.accessKeyId,
      creds.secretAccessKey,
      file.buffer,
      {
        'content-type': file.contentType || 'application/dicom',
        'content-length': String(file.buffer.length),
      }
    );

    try {
      const res = await fetch(putUrl, {
        method: 'PUT',
        headers,
        body: new Uint8Array(file.buffer),
        signal: AbortSignal.timeout(10000),
      });

      if (res.ok) {
        uploadedKeys.push(keyPath);
        count++;
      } else {
        console.warn('[S3_PUT_FAIL]', res.status, await res.text());
      }
    } catch (err) {
      console.warn('[S3_PUT_EXCEPTION]', err);
    }
  }

  return { success: count > 0, uploadedCount: count, s3Keys: uploadedKeys };
}

export async function uploadReportToS3(params: {
  accessionNumber: string;
  patientName: string;
  modality: string;
  reportDate?: string;
  content: string | Buffer;
  format: 'pdf' | 'json';
  version?: number;
}): Promise<{ success: boolean; s3Key?: string; versionKey?: string }> {
  const creds = getEffectiveS3Credentials();
  if (!creds.enabled || !creds.bucket || !creds.accessKeyId || !creds.secretAccessKey) {
    return { success: false };
  }

  const d = params.reportDate ? new Date(params.reportDate) : new Date();
  const keyPath = getS3ReportKey(params.accessionNumber, params.modality, params.format, d);

  const buffer = typeof params.content === 'string' ? Buffer.from(params.content, 'utf8') : params.content;
  const contentType = params.format === 'pdf' ? 'application/pdf' : 'application/json';

  const metadataHeaders: Record<string, string> = {
    'content-type': contentType,
    'content-length': String(buffer.length),
    'x-amz-meta-accession': params.accessionNumber,
    'x-amz-meta-patient-name': params.patientName,
    'x-amz-meta-version': String(params.version || 1),
  };

  const putUrl = buildS3Url(creds, keyPath);
  const headers = getSigV4Headers('PUT', putUrl, creds.region, creds.accessKeyId, creds.secretAccessKey, buffer, metadataHeaders);

  const res = await fetch(putUrl, { method: 'PUT', headers, body: new Uint8Array(buffer), signal: AbortSignal.timeout(8000) });
  if (!res.ok) return { success: false };

  // Write immutable versioned archival snapshot if version is provided
  let versionKey: string | undefined;
  if (params.version && params.version > 0) {
    versionKey = getS3VersionedReportKey(params.accessionNumber, params.modality, params.version, params.format, d);
    const vPutUrl = buildS3Url(creds, versionKey);
    const vHeaders = getSigV4Headers('PUT', vPutUrl, creds.region, creds.accessKeyId, creds.secretAccessKey, buffer, metadataHeaders);
    try {
      await fetch(vPutUrl, { method: 'PUT', headers: vHeaders, body: new Uint8Array(buffer), signal: AbortSignal.timeout(8000) });
    } catch (vErr) {
      console.warn('[S3_VERSION_ARCHIVE_WARN]', vErr);
    }
  }

  return { success: true, s3Key: keyPath, versionKey };
}

export async function downloadStudyFromS3(
  accession: string,
  targetDir: string
): Promise<{ success: boolean; filesDownloaded: number }> {
  const creds = getEffectiveS3Credentials();
  if (!creds.enabled || !creds.bucket) {
    return { success: false, filesDownloaded: 0 };
  }

  try {
    if (!fs.existsSync(targetDir)) {
      fs.mkdirSync(targetDir, { recursive: true });
    }

    const listUrl = buildS3Url(creds, '', { 'list-type': '2', prefix: 'dicom/' });
    let headers: Record<string, string> = {};
    if (creds.accessKeyId && creds.secretAccessKey) {
      headers = getSigV4Headers('GET', listUrl, creds.region, creds.accessKeyId, creds.secretAccessKey);
    }

    const res = await fetch(listUrl, { headers, signal: AbortSignal.timeout(6000) });
    if (!res.ok) return { success: false, filesDownloaded: 0 };

    const xml = await res.text();
    const keyMatches = [...xml.matchAll(/<Key>([^<]+)<\/Key>/g)];
    let count = 0;

    for (const km of keyMatches) {
      const key = km[1];
      if (key.endsWith('/') || !key.includes(accession)) continue;

      const getUrl = buildS3Url(creds, key);
      let getHeaders: Record<string, string> = {};
      if (creds.accessKeyId && creds.secretAccessKey) {
        getHeaders = getSigV4Headers('GET', getUrl, creds.region, creds.accessKeyId, creds.secretAccessKey);
      }

      const fileRes = await fetch(getUrl, { headers: getHeaders, signal: AbortSignal.timeout(10000) });
      if (fileRes.ok) {
        const buf = await fileRes.arrayBuffer();
        const fileName = path.basename(key);
        fs.writeFileSync(path.join(targetDir, fileName.endsWith('.dcm') ? fileName : `${fileName}.dcm`), Buffer.from(buf));
        count++;
      }
    }

    return { success: count > 0, filesDownloaded: count };
  } catch (err) {
    console.warn('[S3_DOWNLOAD_FAIL]', err);
    return { success: false, filesDownloaded: 0 };
  }
}
