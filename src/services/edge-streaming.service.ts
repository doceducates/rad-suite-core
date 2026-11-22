// Layer 2 (Domain/Services): Direct Clinic Edge Node Streaming & Pass-Through Proxy
// Enables instantaneous diagnostic slice streaming (<300ms) before S3 upload completes.
import http from 'http';
import fs from 'fs';
import path from 'path';
import { detectOrientationFromDescription } from './dicom-geometry.service';

export interface EdgeSeriesInfo {
  seriesNumber: string;
  seriesDescription: string;
  orientation: 'AXIAL' | 'SAGITTAL' | 'CORONAL';
  sliceCount: number;
  instanceIds: string[];
  orthancSeriesId: string;
  modality?: string;
  patientName?: string;
  patientId?: string;
  studyDescription?: string;
  studyDate?: string;
}

const CACHE_DIR = path.join(process.cwd(), 'storage', 'cache', 's3');
const edgeSeriesMemoryCache = new Map<string, { expires: number; data: EdgeSeriesInfo[] }>();

export function getEdgeOrthancUrl(): string {
  if (process.env.CLINIC_NODE_URL) {
    return process.env.CLINIC_NODE_URL.replace(/\/+$/, '');
  }
  if (process.env.ORTHANC_URL) {
    return process.env.ORTHANC_URL.replace(/\/+$/, '');
  }
  const port = process.env.ORTHANC_HTTP_PORT || '18042';
  const host = process.env.ORTHANC_HOST || '127.0.0.1';
  return `http://${host}:${port}`;
}

function edgeRequest(
  method: string,
  endpointPath: string,
  payload: any = null,
  timeoutMs = 6000
): Promise<{ ok: boolean; status: number; data: any; rawBuffer?: Buffer }> {
  return new Promise((resolve) => {
    try {
      const fullUrl = new URL(`${getEdgeOrthancUrl()}${endpointPath}`);
      const bodyStr = payload ? (typeof payload === 'string' ? payload : JSON.stringify(payload)) : null;

      const req = http.request(
        fullUrl,
        {
          method,
          headers: {
            ...(bodyStr ? { 'Content-Type': 'application/json', 'Content-Length': Buffer.byteLength(bodyStr) } : {}),
          },
          timeout: timeoutMs,
        },
        (res) => {
          const chunks: Buffer[] = [];
          res.on('data', (c) => chunks.push(Buffer.isBuffer(c) ? c : Buffer.from(c)));
          res.on('end', () => {
            const buf = Buffer.concat(chunks);
            let parsedData: any = null;
            try {
              parsedData = JSON.parse(buf.toString('utf8'));
            } catch {
              parsedData = buf.toString('utf8');
            }
            resolve({
              ok: (res.statusCode || 0) >= 200 && (res.statusCode || 0) < 300,
              status: res.statusCode || 0,
              data: parsedData,
              rawBuffer: buf,
            });
          });
        }
      );

      req.on('timeout', () => {
        req.destroy(new Error('ETIMEDOUT'));
        resolve({ ok: false, status: 408, data: null });
      });

      req.on('error', () => {
        resolve({ ok: false, status: 503, data: null });
      });

      if (bodyStr) req.write(bodyStr);
      req.end();
    } catch {
      resolve({ ok: false, status: 500, data: null });
    }
  });
}

export async function testEdgeOrthanc(): Promise<{ reachable: boolean; latencyMs: number; version?: string; aet?: string }> {
  const t0 = Date.now();
  const res = await edgeRequest('GET', '/system', null, 3000);
  const latencyMs = Date.now() - t0;
  if (res.ok && res.data) {
    return {
      reachable: true,
      latencyMs,
      version: res.data.Version,
      aet: res.data.DicomAet,
    };
  }
  return { reachable: false, latencyMs };
}

export async function getEdgeStudySeries(accession: string): Promise<EdgeSeriesInfo[]> {
  const cleanAcc = accession.trim().toUpperCase();
  const cached = edgeSeriesMemoryCache.get(cleanAcc);
  if (cached && cached.expires > Date.now()) {
    return cached.data;
  }

  // 1. Find Study by Accession in Orthanc
  let findRes = await edgeRequest('POST', '/tools/find', {
    Level: 'Study',
    Query: { AccessionNumber: cleanAcc },
  });

  let studyIds: string[] = Array.isArray(findRes.data) ? findRes.data : [];

  // Fallback: search by PatientID if accession produced no results
  if (studyIds.length === 0) {
    findRes = await edgeRequest('POST', '/tools/find', {
      Level: 'Study',
      Query: { PatientID: cleanAcc },
    });
    studyIds = Array.isArray(findRes.data) ? findRes.data : [];
  }

  if (studyIds.length === 0) {
    return [];
  }

  const studyId = studyIds[0];
  const studyDetailRes = await edgeRequest('GET', `/studies/${studyId}`);
  if (!studyDetailRes.ok || !studyDetailRes.data) {
    return [];
  }

  const studyData = studyDetailRes.data;
  const seriesIds: string[] = studyData.Series || [];
  const results: EdgeSeriesInfo[] = [];

  const patName = studyData.PatientMainDicomTags?.PatientName || studyData.MainDicomTags?.PatientName || 'PATIENT (EDGE)';
  const patId = studyData.PatientMainDicomTags?.PatientID || studyData.MainDicomTags?.PatientID;
  const studyDesc = studyData.MainDicomTags?.StudyDescription || 'Clinic Study';
  const studyDate = studyData.MainDicomTags?.StudyDate;

  // 2. Query each Series and collect instances
  for (const sId of seriesIds) {
    const sRes = await edgeRequest('GET', `/series/${sId}`);
    if (sRes.ok && sRes.data) {
      const sData = sRes.data;
      const sNum = String(sData.MainDicomTags?.SeriesNumber || results.length + 1);
      const sDesc = sData.MainDicomTags?.SeriesDescription || `Series ${sNum}`;
      const mod = sData.MainDicomTags?.Modality || 'MR';
      const instances: string[] = sData.Instances || [];

      results.push({
        seriesNumber: sNum,
        seriesDescription: sDesc,
        orientation: detectOrientationFromDescription(sDesc),
        sliceCount: instances.length,
        instanceIds: instances,
        orthancSeriesId: sId,
        modality: mod,
        patientName: patName,
        patientId: patId,
        studyDescription: studyDesc,
        studyDate,
      });
    }
  }

  results.sort((a, b) => {
    const na = parseInt(a.seriesNumber, 10);
    const nb = parseInt(b.seriesNumber, 10);
    if (isNaN(na) || isNaN(nb)) return a.seriesNumber.localeCompare(b.seriesNumber);
    return na - nb;
  });

  edgeSeriesMemoryCache.set(cleanAcc, {
    expires: Date.now() + 60000, // 60s cache
    data: results,
  });

  return results;
}

export async function getEdgeSliceBuffer(
  accession: string,
  seriesNumber: string,
  sliceIndex: number
): Promise<Buffer | null> {
  const cleanAcc = accession.trim().toUpperCase();
  const cacheKey = `${cleanAcc}_s${seriesNumber}_i${sliceIndex}.dcm`;
  const cacheFile = path.join(CACHE_DIR, cleanAcc, cacheKey);

  // 1. Fast Cache Hit (<10ms)
  if (fs.existsSync(cacheFile)) {
    try {
      return fs.readFileSync(cacheFile);
    } catch {}
  }

  // 2. Discover Series & Instance ID
  const seriesList = await getEdgeStudySeries(cleanAcc);
  const series = seriesNumber
    ? seriesList.find((s) => s.seriesNumber === seriesNumber)
    : seriesList[0];

  if (!series || !series.instanceIds[sliceIndex]) {
    return null;
  }

  const instanceId = series.instanceIds[sliceIndex];

  // 3. Stream binary DICOM directly from Orthanc REST API
  const fileRes = await edgeRequest('GET', `/instances/${instanceId}/file`, null, 10000);
  if (!fileRes.ok || !fileRes.rawBuffer) {
    return null;
  }

  const buf = fileRes.rawBuffer;

  // 4. Save to local LRU disk cache for subsequent 60 FPS viewport scrubbing
  try {
    const caseDir = path.join(CACHE_DIR, cleanAcc);
    if (!fs.existsSync(caseDir)) {
      fs.mkdirSync(caseDir, { recursive: true });
    }
    fs.promises.writeFile(cacheFile, buf).catch(() => {});
  } catch {}

  return buf;
}
