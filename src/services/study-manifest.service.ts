// Layer 2 (Domain/Services): Lightweight Study Manifest Service
// Decouples study metadata into an instant JSON manifest (<50ms) for OHIF v3 / Cornerstone3D.
import { getLocalCaseById, type LocalCaseStudy } from './local-cases.service';
import { getS3StudySeries, type S3SeriesInfo } from './s3-retrieval.service';
import { detectOrientationFromDescription, getOrientationFromIop } from './dicom-geometry.service';
import { db } from '@/db';
import { studies, patients } from '@/db/schema';
import { eq } from 'drizzle-orm';

export interface StudyManifestSeries {
  seriesNumber: string;
  seriesDescription: string;
  orientation: 'AXIAL' | 'SAGITTAL' | 'CORONAL';
  sliceCount: number;
  modality?: string;
  pixelSpacing?: [number, number];
  rows?: number;
  columns?: number;
  iop?: number[];
}

export interface StudyManifestResponse {
  accessionNumber: string;
  patientName?: string;
  patientId?: string;
  patientSex?: string;
  patientBirthDate?: string;
  modality: string;
  studyDescription?: string;
  studyDate?: string;
  studyTime?: string;
  studyInstanceUid?: string;
  source: 'local' | 's3' | 'pacs' | 'edge';
  series: StudyManifestSeries[];
}

/**
 * Resolves a lightweight study manifest for a given accession number.
 * Priority order:
 * 1. Local disk archive (E:/Cases) via getLocalCaseById
 * 2. S3 cloud storage via getS3StudySeries
 */
export async function getStudyManifest(
  accession: string,
  options?: { modality?: string; studyInstanceUid?: string; localOnly?: boolean }
): Promise<StudyManifestResponse | null> {
  if (!accession || !accession.trim()) {
    return null;
  }
  const cleanAccession = accession.trim();

  // 1. Check local disk cases
  const localCase: LocalCaseStudy | undefined = getLocalCaseById(cleanAccession);
  if (localCase) {
    const series: StudyManifestSeries[] = (localCase.series || []).map((s) => {
      let orientation: 'AXIAL' | 'SAGITTAL' | 'CORONAL' | undefined = s.orientation;
      if (!orientation && s.iop) {
        orientation = getOrientationFromIop(s.iop);
      }
      if (!orientation && s.seriesDescription) {
        orientation = detectOrientationFromDescription(s.seriesDescription);
      }

      return {
        seriesNumber: String(s.seriesNumber),
        seriesDescription: s.seriesDescription || `Series ${s.seriesNumber}`,
        orientation: orientation || 'AXIAL',
        sliceCount: s.sliceCount ?? (s.files ? s.files.length : 0),
        modality: localCase.modality || 'MR',
        pixelSpacing: s.pixelSpacing,
        rows: s.rows,
        columns: s.columns,
        iop: s.iop,
      };
    });

    return {
      accessionNumber: localCase.accessionNumber || cleanAccession,
      patientName: localCase.patientName,
      patientId: localCase.patientId,
      modality: localCase.modality || 'MR',
      studyDescription: localCase.studyDescription,
      studyDate: localCase.studyDate,
      studyInstanceUid: localCase.studyInstanceUid,
      source: 'local',
      series,
    };
  }

  // 1.5. Check VPS Hot Staging disk (/storage/hot-cases/) and S3 cloud storage
  let hotManifest: StudyManifestResponse | null = null;
  try {
    const { getHotStudyManifest } = await import('./hot-case-staging.service');
    hotManifest = await getHotStudyManifest(cleanAccession, options?.modality);
  } catch {}

  let pacsStudyRow: any = null;
  try {
    const { hospitalPacsStudies } = await import('@/db/schema');
    const [pRow] = await db
      .select()
      .from(hospitalPacsStudies)
      .where(eq(hospitalPacsStudies.accessionNumber, cleanAccession))
      .limit(1);
    if (pRow) pacsStudyRow = pRow;
  } catch {}

  let s3SeriesList: S3SeriesInfo[] = [];
  const s3AlreadyMissing = pacsStudyRow?.s3Status === 'not_uploaded' && !pacsStudyRow?.s3KeyPrefix;
  if (!options?.localOnly && !s3AlreadyMissing && (!hotManifest || hotManifest.series.length === 0)) {
    try {
      const s3Opts = pacsStudyRow?.s3KeyPrefix ? { ...options, keyPrefix: pacsStudyRow.s3KeyPrefix } : options;
      s3SeriesList = await getS3StudySeries(cleanAccession, s3Opts);
    } catch (err) {
      console.warn('[STUDY_MANIFEST_S3_WARN]', err);
    }
  }

  if ((hotManifest && hotManifest.series.length > 0) || s3SeriesList.length > 0) {
    let dbStudy: {
      study: typeof studies.$inferSelect;
      patient: typeof patients.$inferSelect;
    } | null = null;
    try {
      const [row] = await db
        .select({ study: studies, patient: patients })
        .from(studies)
        .innerJoin(patients, eq(patients.id, studies.patientId))
        .where(eq(studies.accessionNumber, cleanAccession))
        .limit(1);
      if (row) dbStudy = row;
    } catch (err) {
      console.warn('[STUDY_MANIFEST_DB_WARN]', err);
    }

    const finalModality =
      options?.modality ||
      dbStudy?.study?.modality ||
      pacsStudyRow?.modality ||
      hotManifest?.modality ||
      'MR';

    const isMr = finalModality.toUpperCase().includes('MR');
    const seriesMap = new Map<string, StudyManifestSeries>();

    // 1. Ingest S3 series
    for (const s of s3SeriesList) {
      if (isMr && /lung|bone|mediastin|chest\s*ct/i.test(s.seriesDescription)) continue;
      seriesMap.set(String(s.seriesNumber), {
        seriesNumber: String(s.seriesNumber),
        seriesDescription: s.seriesDescription || `Series ${s.seriesNumber}`,
        orientation: s.orientation || detectOrientationFromDescription(s.seriesDescription),
        sliceCount: s.sliceCount ?? (s.keys ? s.keys.length : 0),
        modality: finalModality,
      });
    }

    // 2. Merge Hot Staging series (takes highest sliceCount & preserves descriptions)
    if (hotManifest?.series) {
      for (const hs of hotManifest.series) {
        if (isMr && /lung|bone|mediastin|chest\s*ct/i.test(hs.seriesDescription)) continue;
        const sNum = String(hs.seriesNumber);
        const existing = seriesMap.get(sNum);
        if (existing) {
          existing.sliceCount = Math.max(existing.sliceCount, hs.sliceCount);
          if (!existing.seriesDescription || existing.seriesDescription.startsWith('Series ')) {
            existing.seriesDescription = hs.seriesDescription;
          }
        } else {
          seriesMap.set(sNum, { ...hs, modality: finalModality });
        }
      }
    }

    const mergedSeries = Array.from(seriesMap.values()).sort(
      (a, b) => parseInt(a.seriesNumber, 10) - parseInt(b.seriesNumber, 10)
    );

    const dbScheduledAt = dbStudy?.study?.scheduledAt
      ? (typeof dbStudy.study.scheduledAt === 'string'
          ? dbStudy.study.scheduledAt
          : new Date(dbStudy.study.scheduledAt).toISOString())
      : undefined;

    const pacsDateFormatted = pacsStudyRow?.studyDate && pacsStudyRow.studyDate.length >= 8
      ? `${pacsStudyRow.studyDate.slice(0, 4)}-${pacsStudyRow.studyDate.slice(4, 6)}-${pacsStudyRow.studyDate.slice(6, 8)}`
      : undefined;

    let s3PatientName: string | undefined = undefined;
    for (const s of s3SeriesList) {
      if (s.keys && s.keys.length > 0) {
        for (const k of s.keys) {
          const parts = k.split('/');
          const studyFolder = parts[4] || '';
          if (studyFolder.includes('_')) {
            const folderParts = studyFolder.split('_');
            if (folderParts.length >= 3) {
              const rawPat = folderParts.slice(1, folderParts.length - 1).join(' ').replace(/_/g, ' ').trim();
              if (rawPat && rawPat !== 'PATIENT') { s3PatientName = rawPat; break; }
            } else if (folderParts.length === 2) {
              const rawPat = folderParts[1].replace(/_/g, ' ').trim();
              if (rawPat && rawPat !== 'PATIENT') { s3PatientName = rawPat; break; }
            }
          }
        }
        if (s3PatientName) break;
      }
    }

    return {
      accessionNumber: dbStudy?.study?.accessionNumber || cleanAccession,
      patientName: dbStudy?.patient?.fullName || pacsStudyRow?.patientName || hotManifest?.patientName || s3PatientName || 'PATIENT (S3)',
      patientId: dbStudy?.patient?.mrNumber || pacsStudyRow?.patientMrn || pacsStudyRow?.patientId || hotManifest?.patientId,
      modality: finalModality,
      studyDescription:
        dbStudy?.study?.scanType ||
        dbStudy?.study?.bodyPart ||
        pacsStudyRow?.studyDescription ||
        hotManifest?.studyDescription ||
        mergedSeries[0]?.seriesDescription ||
        'MR Examination',
      studyDate: dbScheduledAt || pacsDateFormatted || hotManifest?.studyDate,
      studyTime: pacsStudyRow?.studyTime || hotManifest?.studyTime,
      studyInstanceUid: pacsStudyRow?.studyInstanceUid || hotManifest?.studyInstanceUid || dbStudy?.study?.id,
      source: hotManifest?.series?.length ? 'local' : 's3',
      series: mergedSeries,
    };
  }

  if (options?.localOnly) {
    return null;
  }

  // 3. Check Clinic Edge Node (Direct Edge Streaming Pass-Through)
  try {
    const { getEdgeStudySeries } = await import('./edge-streaming.service');
    const edgeSeries = await getEdgeStudySeries(cleanAccession);
    if (edgeSeries && edgeSeries.length > 0) {
      const first = edgeSeries[0];
      const series: StudyManifestSeries[] = edgeSeries.map((s) => ({
        seriesNumber: String(s.seriesNumber),
        seriesDescription: s.seriesDescription,
        orientation: s.orientation,
        sliceCount: s.sliceCount,
        modality: s.modality || 'MR',
      }));

      return {
        accessionNumber: cleanAccession,
        patientName: first.patientName || 'PATIENT (EDGE)',
        patientId: first.patientId,
        modality: first.modality || 'MR',
        studyDescription: first.studyDescription || 'Clinic Edge Study',
        studyDate: first.studyDate,
        source: 'edge',
        series,
      };
    }
  } catch (err) {
    console.warn('[STUDY_MANIFEST_EDGE_WARN]', err);
  }

  // 4. Check Clinic Gateway / PACS Catalog
  try {
    const { fetchGatewayStudySeries } = await import('./gateway-study-series.service');
    const gwSeries = await fetchGatewayStudySeries(cleanAccession, options?.modality);
    if (gwSeries && gwSeries.length > 0) {
      let patientName = 'PATIENT (GATEWAY)';
      let patientId = cleanAccession;
      let studyDesc = `${options?.modality || 'MR'} Examination`;
      let studyDate: string | undefined;

      try {
        const { hospitalPacsStudies } = await import('@/db/schema');
        const [pRow] = await db
          .select()
          .from(hospitalPacsStudies)
          .where(eq(hospitalPacsStudies.accessionNumber, cleanAccession))
          .limit(1);
        if (pRow) {
          patientName = pRow.patientName || patientName;
          patientId = pRow.patientMrn || pRow.patientId || patientId;
          studyDesc = pRow.studyDescription || studyDesc;
          if (pRow.studyDate && pRow.studyDate.length >= 8) {
            studyDate = `${pRow.studyDate.slice(0, 4)}-${pRow.studyDate.slice(4, 6)}-${pRow.studyDate.slice(6, 8)}`;
          }
        }
      } catch {}

      const series: StudyManifestSeries[] = gwSeries.map((s) => ({
        seriesNumber: String(s.seriesNumber),
        seriesDescription: s.seriesDescription,
        orientation: s.orientation === 'LOCALIZER' ? 'AXIAL' : s.orientation,
        sliceCount: s.sliceCount,
        modality: s.modality || options?.modality || 'MR',
      }));

      return {
        accessionNumber: cleanAccession,
        patientName,
        patientId,
        modality: gwSeries[0]?.modality || options?.modality || 'MR',
        studyDescription: studyDesc,
        studyDate,
        source: 'pacs',
        series,
      };
    }
  } catch (err) {
    console.warn('[STUDY_MANIFEST_GATEWAY_WARN]', err);
  }

  return null;
}
