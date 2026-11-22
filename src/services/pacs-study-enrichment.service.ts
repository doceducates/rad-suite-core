import { db } from '@/db';
import { studies, reports, hotStagedStudies, type HospitalPacsStudy } from '@/db/schema';
import { inArray, eq } from 'drizzle-orm';
import { getClinicNodeStatus } from './clinic-node.service';

export interface StudyPipelineProgress {
  current: number;
  total: number;
  percent: number;
  speedMbps?: number;
}

export type PipelineStage = 'on_pacs' | 'downloading' | 'in_sandbox' | 'uploading' | 'hot_staged' | 'synced' | 'failed' | 'queued';

export interface EnrichedHospitalPacsStudy extends HospitalPacsStudy {
  reportStatus?: string | null;
  impression?: string | null;
  clinicalHistory?: string | null;
  pipelineStage?: PipelineStage;
  downloadProgress?: StudyPipelineProgress | null;
  uploadProgress?: StudyPipelineProgress | null;
  isHotStaged?: boolean;
  hotSlices?: number;
}

/**
 * Enriches indexed hospital PACS studies with:
 * 1. Live clinic edge two-stage progress:
 *    - Stage 1 (Hospital PACS -> Clinic PC Medical Sandbox SSD)
 *    - Stage 2 (Clinic PC SSD -> Cloud S3 Storage)
 * 2. Clinical report summary (status, impression, clinical history)
 */
export async function enrichHospitalPacsStudies(
  baseStudies: HospitalPacsStudy[]
): Promise<EnrichedHospitalPacsStudy[]> {
  if (!baseStudies || baseStudies.length === 0) return [];

  const accList = baseStudies
    .map((s) => (s.accessionNumber || '').trim().toUpperCase())
    .filter(Boolean);

  const reportsMap = new Map<string, { status: string | null; impression: string | null; clinicalHistory: string | null }>();

  if (accList.length > 0) {
    try {
      const matched = await db
        .select({
          accession: studies.accessionNumber,
          status: reports.status,
          impression: reports.impression,
          clinicalHistory: reports.clinicalHistory,
        })
        .from(studies)
        .leftJoin(reports, eq(reports.studyId, studies.id))
        .where(inArray(studies.accessionNumber, accList));

      for (const m of matched) {
        if (m.accession) {
          reportsMap.set(m.accession.toUpperCase(), {
            status: m.status,
            impression: m.impression,
            clinicalHistory: m.clinicalHistory,
          });
        }
      }
    } catch (err) {
      console.warn('[PACS_ENRICH_WARN] Failed to query reports for studies:', err);
    }
  }

  const hotStagedMap = new Map<string, { totalSlices: number; isSyncedToS3: boolean }>();
  if (accList.length > 0) {
    try {
      const matchedHot = await db
        .select({
          accessionNumber: hotStagedStudies.accessionNumber,
          sliceCount: hotStagedStudies.sliceCount,
          totalSlices: hotStagedStudies.totalSlices,
          isSyncedToS3: hotStagedStudies.isSyncedToS3,
        })
        .from(hotStagedStudies)
        .where(inArray(hotStagedStudies.accessionNumber, accList));

      for (const h of matchedHot) {
        if (h.accessionNumber) {
          hotStagedMap.set(h.accessionNumber.toUpperCase(), {
            totalSlices: h.sliceCount || h.totalSlices || 0,
            isSyncedToS3: Boolean(h.isSyncedToS3),
          });
        }
      }
    } catch (err) {
      console.warn('[PACS_ENRICH_WARN] Failed to query hot_staged_studies:', err);
    }
  }

  let activeUpload: any = null;
  let activeDownload: any = null;
  let downloadQueue: any[] = [];
  let uploadQueue: any[] = [];

  try {
    const nodeStatus = getClinicNodeStatus();
    activeUpload = nodeStatus?.activeUpload ?? null;
    activeDownload = nodeStatus?.activeDownload ?? null;
    downloadQueue = Array.isArray(nodeStatus?.downloadQueue) ? nodeStatus.downloadQueue : [];
    uploadQueue = Array.isArray(nodeStatus?.uploadQueue) ? nodeStatus.uploadQueue : [];
  } catch {}

  const dlQueueAccs = new Set(downloadQueue.map((q) => (q?.accession || '').toUpperCase()));
  const upQueueAccs = new Set(uploadQueue.map((q) => (q?.accession || '').toUpperCase()));

  return baseStudies.map((st) => {
    const cleanAcc = (st.accessionNumber || '').trim().toUpperCase();
    const rep = reportsMap.get(cleanAcc);

    // Stage 1: Active PACS -> Node Download
    const isDlActive = Boolean(
      activeDownload &&
      activeDownload.accession &&
      activeDownload.accession.toUpperCase() === cleanAcc
    );

    let dlProgress: StudyPipelineProgress | null = null;
    if (isDlActive && activeDownload) {
      const cur = activeDownload.downloadedSlices ?? 0;
      const tot = activeDownload.totalSlices ?? (st.numInstances || 1);
      const pct = activeDownload.progressPercent ?? Math.min(99, Math.round((cur / Math.max(tot, 1)) * 100));
      dlProgress = { current: cur, total: tot, percent: pct };
    }

    // Stage 2: Active Node -> S3 Upload
    const isUpActive = Boolean(
      activeUpload &&
      activeUpload.accession &&
      activeUpload.accession.toUpperCase() === cleanAcc
    );

    let upProgress: StudyPipelineProgress | null = null;
    if (isUpActive && activeUpload) {
      const current = activeUpload.completedSlices ?? 0;
      const total = activeUpload.totalSlices ?? (st.numInstances || 0);
      const percent = activeUpload.progressPercent ?? (total > 0 ? Math.round((current / total) * 100) : 0);
      const speedMbps = activeUpload.speedKbs ? Number(((activeUpload.speedKbs * 8) / 1000).toFixed(2)) : undefined;
      upProgress = { current, total, percent, speedMbps };
    }

    const hotStaged = hotStagedMap.get(cleanAcc);
    const isHot = Boolean(hotStaged && hotStaged.totalSlices > 0);

    // Resolve unified pipeline stage
    let stage: PipelineStage = 'on_pacs';
    if (isUpActive) {
      stage = 'uploading';
    } else if (isDlActive) {
      stage = 'downloading';
    } else if (st.s3Status === 'synced' || hotStaged?.isSyncedToS3) {
      stage = 'synced';
    } else if (isHot) {
      stage = 'hot_staged';
    } else if (st.s3Status === 'in_sandbox' || st.s3Status === 'local_only') {
      stage = 'in_sandbox';
    } else if (st.s3Status === 'failed') {
      stage = 'failed';
    } else if (upQueueAccs.has(cleanAcc) || dlQueueAccs.has(cleanAcc)) {
      stage = 'queued';
    }

    return {
      ...st,
      reportStatus: rep?.status ?? null,
      impression: rep?.impression ?? null,
      clinicalHistory: rep?.clinicalHistory ?? null,
      pipelineStage: stage,
      downloadProgress: dlProgress,
      uploadProgress: upProgress,
      isHotStaged: isHot,
      hotSlices: hotStaged?.totalSlices ?? 0,
    };
  });
}
