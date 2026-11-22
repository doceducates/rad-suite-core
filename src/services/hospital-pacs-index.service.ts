import { db } from '@/db';
import { hospitalPacsStudies, patients, studies, type HospitalPacsStudy } from '@/db/schema';
import { eq, and, sql, desc } from 'drizzle-orm';
import crypto from 'crypto';
import {
  buildHospitalPacsQueryConditions,
  getLast48HoursDicomRange,
  normalizeDicomDate,
  type IndexedPacsQueryFilter,
} from './hospital-pacs-query-filter';
import { inferModality, resolveClinicalDescription } from '@/lib/modality-inference';

export { getLast48HoursDicomRange, normalizeDicomDate, type IndexedPacsQueryFilter };


export async function indexHospitalPacsStudies(
  studyList: Array<Partial<HospitalPacsStudy>>
): Promise<{ upserted: number; updated: number }> {
  if (!studyList || studyList.length === 0) return { upserted: 0, updated: 0 };

  const nowDate = new Date();
  let upserted = 0;
  let updated = 0;

  for (const st of studyList) {
    const acc = (st.accessionNumber || '').trim().toUpperCase();
    if (!acc) continue;
    const mod = inferModality(st.modality, st.studyDescription, st.patientName, st.studyTime);
    const resolvedDesc = resolveClinicalDescription(st.studyDescription, null, null, null, mod, st.patientName, st.studyTime);

    const candidates = await db
      .select({
        id: hospitalPacsStudies.id,
        s3Status: hospitalPacsStudies.s3Status,
        modality: hospitalPacsStudies.modality,
        studyDescription: hospitalPacsStudies.studyDescription,
        patientName: hospitalPacsStudies.patientName,
        numInstances: hospitalPacsStudies.numInstances,
      })
      .from(hospitalPacsStudies)
      .where(eq(hospitalPacsStudies.accessionNumber, acc));

    const exactMatch = candidates.find((c) => c.modality === mod);
    let existing = exactMatch ? [{ id: exactMatch.id, s3Status: exactMatch.s3Status }] : [];

    if (existing.length === 0) {
      // Heal phantom misclassified records (same patient or generic placeholder)
      const phantom = candidates.find((c) =>
        (c.patientName && c.patientName.toUpperCase().includes('COD') && c.modality === 'MR') ||
        (!c.studyDescription || c.studyDescription === 'MR Study' || c.studyDescription === 'CT Study' || (c.numInstances || 1) <= 1) ||
        (c.patientName && st.patientName && c.patientName.trim().toUpperCase() === st.patientName.trim().toUpperCase() && (
          (mod === 'MR' && c.studyDescription && /\bmr/i.test(c.studyDescription)) ||
          (mod === 'CT' && c.studyDescription && /\bct/i.test(c.studyDescription)) ||
          (c.s3Status === 'local_only' && st.s3Status === 'synced')
        ))
      );
      if (phantom) {
        existing = [{ id: phantom.id, s3Status: phantom.s3Status }];
      }
    } else if (candidates.length > 1) {
      // Purge duplicate misclassified rows for the SAME patient
      for (const c of candidates) {
        if (c.id !== existing[0]?.id && (
          (c.patientName && c.patientName.toUpperCase().includes('COD') && c.modality === 'MR') ||
          (!c.studyDescription || c.studyDescription === 'MR Study' || c.studyDescription === 'CT Study' || (c.numInstances || 1) <= 1) ||
          (c.patientName && st.patientName && c.patientName.trim().toUpperCase() === st.patientName.trim().toUpperCase() && c.s3Status === 'local_only')
        )) {
          await db.delete(hospitalPacsStudies).where(eq(hospitalPacsStudies.id, c.id));
        }
      }
    }

    const studyDateNorm = normalizeDicomDate(st.studyDate);

    if (existing.length === 0) {
      await db.insert(hospitalPacsStudies).values({
        accessionNumber: acc,
        patientName: (st.patientName || 'PATIENT').trim(),
        patientId: (st.patientId || '').trim(),
        patientMrn: (st.patientMrn || st.patientId || '').trim(),
        modality: mod,
        studyDescription: resolvedDesc,
        studyDate: studyDateNorm,
        studyTime: (st.studyTime || '').trim(),
        studyInstanceUid: (st.studyInstanceUid || '').trim(),
        numSeries: Number(st.numSeries) || 1,
        numInstances: Number(st.numInstances) || 1,
        pacsSource: st.pacsSource || 'HMIS_PACS',
        s3Status: st.s3Status || 'not_uploaded',
        s3KeyPrefix: st.s3KeyPrefix || null,
        s3UploadedAt: (st.s3UploadedAt && !isNaN(new Date(st.s3UploadedAt).getTime())) ? new Date(st.s3UploadedAt) : null,
        lastIndexedAt: nowDate,
        rawTagsJson: st.rawTagsJson || null,
        createdAt: nowDate,
      });
      upserted++;
    } else {
      // Safe state machine: NEVER downgrade 'synced', 'uploading', or 'queued' to 'local_only' or 'pending'
      let preservedS3 = existing[0].s3Status;
      if (st.s3Status === 'synced' || existing[0].s3Status === 'synced') {
        preservedS3 = 'synced';
      } else if (existing[0].s3Status === 'uploading' || existing[0].s3Status === 'queued') {
        preservedS3 = existing[0].s3Status;
      } else {
        preservedS3 = st.s3Status || existing[0].s3Status;
      }
      await db.update(hospitalPacsStudies).set({
        patientName: st.patientName !== undefined ? st.patientName : undefined,
        patientId: st.patientId !== undefined ? st.patientId : undefined,
        patientMrn: st.patientMrn !== undefined ? st.patientMrn : undefined,
        modality: mod,
        studyDescription: resolvedDesc || undefined,
        studyDate: studyDateNorm || undefined,
        studyTime: (st.studyTime && st.studyTime.trim()) ? st.studyTime.trim() : undefined,
        numSeries: st.numSeries ? Number(st.numSeries) : undefined,
        numInstances: st.numInstances ? Number(st.numInstances) : undefined,
        rawTagsJson: st.rawTagsJson !== undefined ? st.rawTagsJson : undefined,
        s3Status: preservedS3,
        lastIndexedAt: nowDate,
      }).where(eq(hospitalPacsStudies.id, existing[0].id));
      updated++;
    }

    // Auto-enrich patients table with verified DICOM age & demographics
    if (st.rawTagsJson && (st.patientMrn || st.patientId)) {
      try {
        const pTags = typeof st.rawTagsJson === 'string' ? JSON.parse(st.rawTagsJson) : st.rawTagsJson;
        const mrn = (st.patientMrn || st.patientId)!.trim();
        if (pTags?.patientAge) {
          const ageNum = parseInt(String(pTags.patientAge), 10);
          if (!isNaN(ageNum) && ageNum > 0 && ageNum <= 120) {
            const pUpdates: any = { age: ageNum };
            if (pTags.patientSex) {
              const s = String(pTags.patientSex).trim().toUpperCase();
              if (s === 'F') pUpdates.gender = 'Female';
              else if (s === 'M') pUpdates.gender = 'Male';
            }
            if (pTags.patientBirthDate && String(pTags.patientBirthDate).length === 8) {
              const b = String(pTags.patientBirthDate);
              pUpdates.dob = `${b.slice(0, 4)}-${b.slice(4, 6)}-${b.slice(6, 8)}`;
            }
            await db.update(patients).set(pUpdates).where(eq(patients.mrNumber, mrn));
          }
        }
      } catch {}
    }

    // Auto-sync true PACS scanner acquisition timestamp to studies table
    if (studyDateNorm && studyDateNorm.length === 8 && st.studyTime && st.studyTime.length >= 4) {
      try {
        const y = studyDateNorm.slice(0, 4), m = studyDateNorm.slice(4, 6), d = studyDateNorm.slice(6, 8);
        const hh = st.studyTime.slice(0, 2), mm = st.studyTime.slice(2, 4);
        const ss = st.studyTime.length >= 6 ? st.studyTime.slice(4, 6) : '00';
        const scanTimestamp = `${y}-${m}-${d}T${hh}:${mm}:${ss}.000Z`;
        const scanDate = new Date(scanTimestamp);
        if (!isNaN(scanDate.getTime())) {
          await db.update(studies).set({ scheduledAt: scanDate }).where(eq(studies.accessionNumber, acc));
        }
      } catch {}
    }
  }

  if (upserted > 0 || updated > 0) {
    try {
      const { syncBroadcaster } = await import('./sync/sync-stream-broadcaster');
      syncBroadcaster.broadcast({
        tableName: 'hospital_pacs_studies',
        entityId: 'batch',
        operation: 'UPDATE',
        changedAt: new Date().toISOString(),
        dataSummary: { count: upserted + updated },
      });
    } catch {}
  }

  return { upserted, updated };
}

export async function queryIndexedHospitalPacs(
  filters: IndexedPacsQueryFilter = {}
): Promise<{ studies: HospitalPacsStudy[]; total: number }> {
  const page = Math.max(1, filters.page || 1);
  const limit = Math.min(100, Math.max(1, filters.limit || 25));
  const offset = (page - 1) * limit;

  const conditions = buildHospitalPacsQueryConditions(filters);
  const whereClause = conditions.length > 0 ? and(...conditions) : undefined;

  const [countRes, rows] = await Promise.all([
    db
      .select({ count: sql<number>`count(*)` })
      .from(hospitalPacsStudies)
      .where(whereClause),
    db
      .select()
      .from(hospitalPacsStudies)
      .where(whereClause)
      .orderBy(desc(hospitalPacsStudies.studyDate), desc(hospitalPacsStudies.studyTime))
      .limit(limit)
      .offset(offset),
  ]);

  const total = Number(countRes[0]?.count) || 0;

  const { enrichHospitalPacsStudies } = await import('./pacs-study-enrichment.service');
  const enriched = await enrichHospitalPacsStudies(rows);
  return { studies: enriched as any, total };
}

export async function updateStudyS3Status(
  accession: string,
  s3Status: string,
  meta?: { s3KeyPrefix?: string; numInstances?: number; modality?: string }
): Promise<boolean> {
  const acc = (accession || '').trim().toUpperCase();
  if (!acc) return false;

  const whereClause = meta?.modality
    ? and(eq(hospitalPacsStudies.accessionNumber, acc), eq(hospitalPacsStudies.modality, meta.modality.toUpperCase().trim()))
    : eq(hospitalPacsStudies.accessionNumber, acc);

  await db
    .update(hospitalPacsStudies)
    .set({
      s3Status,
      s3KeyPrefix: meta?.s3KeyPrefix,
      numInstances: meta?.numInstances,
      s3UploadedAt: s3Status === 'synced' ? new Date() : undefined,
    })
    .where(whereClause);

  try {
    const { recordSyncChange } = await import('./sync/sync-changelog.service');
    await recordSyncChange({
      tableName: 'hospital_pacs_studies',
      entityId: acc,
      operation: 'UPDATE',
      dataSummary: { s3Status, numInstances: meta?.numInstances },
    });
  } catch {}

  return true;
}

export async function queryAndFederateHospitalPacs(
  filters: IndexedPacsQueryFilter = {}
): Promise<{ studies: HospitalPacsStudy[]; total: number }> {
  const { federateHospitalPacsQuery } = await import('./hospital-pacs-federation.service');
  return federateHospitalPacsQuery(filters);
}

export async function verifyAndHealStudyS3Integrity(
  accession: string,
  modality?: string
): Promise<{ verified: boolean; keyCount: number; status: string }> {
  const acc = (accession || '').trim().toUpperCase();
  if (!acc) return { verified: false, keyCount: 0, status: 'invalid' };

  try {
    const { getS3StudyKeys } = await import('./s3-retrieval.service');
    const keys = await getS3StudyKeys(acc, { modality });
    if (keys.length > 0) {
      await updateStudyS3Status(acc, 'synced', { numInstances: keys.length, modality });
      return { verified: true, keyCount: keys.length, status: 'synced' };
    }

    const existing = await db
      .select({ s3Status: hospitalPacsStudies.s3Status })
      .from(hospitalPacsStudies)
      .where(eq(hospitalPacsStudies.accessionNumber, acc))
      .limit(1);

    if (existing.length > 0 && existing[0].s3Status === 'synced') {
      await updateStudyS3Status(acc, 'local_only', { modality });
      return { verified: false, keyCount: 0, status: 'healed_to_local_only' };
    }
    return { verified: false, keyCount: 0, status: existing[0]?.s3Status || 'local_only' };
  } catch {
    return { verified: false, keyCount: 0, status: 'error' };
  }
}

export async function getHospitalPacsStudiesMap(): Promise<Map<string, { s3Status: string | null; numInstances: number | null; numSeries: number | null; studyInstanceUid: string | null }>> {
  const map = new Map<string, { s3Status: string | null; numInstances: number | null; numSeries: number | null; studyInstanceUid: string | null }>();
  try {
    const rows = await db
      .select({
        accessionNumber: hospitalPacsStudies.accessionNumber,
        s3Status: hospitalPacsStudies.s3Status,
        numInstances: hospitalPacsStudies.numInstances,
        numSeries: hospitalPacsStudies.numSeries,
        studyInstanceUid: hospitalPacsStudies.studyInstanceUid,
      })
      .from(hospitalPacsStudies);
    for (const r of rows) {
      if (r.accessionNumber) map.set(r.accessionNumber.toLowerCase(), r);
    }
  } catch {}
  return map;
}

