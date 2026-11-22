// Layer 2 (Domain/Services): Background HMIS & PACS Worklist Sync Engine
import crypto from 'crypto';
import { db } from '@/db';
import { studies, reports, hospitalPacsStudies } from '@/db/schema';
import { eq, sql } from 'drizzle-orm';
import { fetchHmisWorklist, checkGatewayHealth } from './hmis-gateway-client.service';
import type { HmisWorklistFilters, HmisAuthCredentials } from './hmis-models';
import { resolvePatientByMrn } from '@/services/mrn-resolution.service';
import { getLocalCaseById } from '@/services/local-cases.service';
import { logAudit } from '@/services/audit.service';
import { normalizeHmisRecords, NormalizedHmisItem } from './hmis-worklist-normalizer';

export interface HmisSyncSummary {
  totalFetched: number;
  newStudiesCreated: number;
  existingUpdated: number;
  matchedWithLocalDicom: number;
  skipped: number;
  error?: string;
}


/**
 * Directly ingests an array of raw scraped HMIS records into SQLite.
 * Used by both background sync and live HMIS Bridge fetch routes.
 */
export async function ingestHmisRecordsToDb(rawList: any[]): Promise<HmisSyncSummary> {
  const normalized = normalizeHmisRecords(rawList);
  let newStudiesCreated = 0;
  let existingUpdated = 0;
  let matchedWithLocalDicom = 0;
  let skipped = 0;

  for (const item of normalized) {
    try {
      // 1. Check local DICOM folder in E:\Cases
      const localDicom = getLocalCaseById(item.accession);
      if (localDicom) matchedWithLocalDicom++;

      // 2. Resolve or create patient in local database (Disregard HMIS dummy age 35)
      const patient = await resolvePatientByMrn({
        mrn: item.mrn,
        fullName: item.patientName,
        age: item.age === 35 ? undefined : item.age,
        gender: item.gender,
      });

      // 3. Check if study already exists by accession number
      const [existingStudy] = await db
        .select()
        .from(studies)
        .where(eq(sql`lower(${studies.accessionNumber})`, item.accession.toLowerCase()))
        .limit(1);

      // Check if verified PACS study scan timestamp is available
      const [pacsRecord] = await db
        .select({ studyDate: hospitalPacsStudies.studyDate, studyTime: hospitalPacsStudies.studyTime })
        .from(hospitalPacsStudies)
        .where(eq(sql`lower(${hospitalPacsStudies.accessionNumber})`, item.accession.toLowerCase()))
        .limit(1);

      let pacsScanTime: Date | null = null;
      if (pacsRecord?.studyDate && pacsRecord.studyDate.length === 8 && pacsRecord.studyTime && pacsRecord.studyTime.length >= 4) {
        const y = pacsRecord.studyDate.slice(0, 4), m = pacsRecord.studyDate.slice(4, 6), d = pacsRecord.studyDate.slice(6, 8);
        const hh = pacsRecord.studyTime.slice(0, 2), mm = pacsRecord.studyTime.slice(2, 4);
        const ss = pacsRecord.studyTime.length >= 6 ? pacsRecord.studyTime.slice(4, 6) : '00';
        const parsed = new Date(`${y}-${m}-${d}T${hh}:${mm}:${ss}.000Z`);
        if (!isNaN(parsed.getTime())) pacsScanTime = parsed;
      }

      const parseDateSafely = (raw?: string | null): Date | null => {
        if (!raw) return null;
        const parsed = new Date(raw);
        if (!isNaN(parsed.getTime())) return parsed;
        const parts = raw.split(/[-/]/);
        if (parts.length === 3) {
          if (parts[0].length === 2 && parts[2].length === 4) {
            const d = parseInt(parts[0], 10);
            const m = parseInt(parts[1], 10) - 1;
            const y = parseInt(parts[2], 10);
            const dt = new Date(Date.UTC(y, m, d, 12, 0, 0));
            if (!isNaN(dt.getTime())) return dt;
          }
        }
        return null;
      };

      const studyDateObj =
        pacsScanTime ||
        parseDateSafely(item.studyDateTime) ||
        parseDateSafely(item.studyDate) ||
        new Date();

      if (existingStudy) {
        // Update existing record while preserving true PACS scan timestamp
        await db
          .update(studies)
          .set({
            scheduledAt: (existingStudy as any).scheduledAt || studyDateObj,
            technologist: item.technologist || (existingStudy as any).technologist || '',
            referringDoctor: item.referringDoctor || (existingStudy as any).referringDoctor || '',
            department: item.department || (existingStudy as any).department || '',
            room: item.room || (existingStudy as any).room || '',
            bodyPart: (existingStudy as any).bodyPart && (existingStudy as any).bodyPart !== 'General'
              ? (existingStudy as any).bodyPart
              : item.bodyPart,
            hmisStatus: (existingStudy as any).hmisStatus && (existingStudy as any).hmisStatus !== 'unknown'
              ? (existingStudy as any).hmisStatus
              : 'awaiting_report',
            hmisLastCheckedAt: new Date(),
            hmisInvestigationId: item.investigationId || (existingStudy as any).hmisInvestigationId,
            hmisCpt: item.cpt || (existingStudy as any).hmisCpt,
          } as any)
          .where(eq(studies.id, existingStudy.id));
        existingUpdated++;
        try {
          const { enqueueCaseSync } = await import('@/services/sync/case-sync-outbox.service');
          await enqueueCaseSync(item.accession, 'upsert');
        } catch {}
      } else {
        // Create new study in worklist
        await db.insert(studies).values({
          id: crypto.randomUUID(),
          accessionNumber: item.accession,
          patientId: patient.id,
          modality: item.modality,
          scanType: item.cpt,
          bodyPart: item.bodyPart,
          priority: item.department?.toLowerCase().includes('emerg') ? 'stat' : 'routine',
          status: 'scheduled',
          scheduledAt: studyDateObj,
          referringDoctor: item.referringDoctor || '',
          technologist: item.technologist || '',
          department: item.department,
          room: item.room,
          hmisInvestigationId: item.investigationId,
          hmisCpt: item.cpt,
          hmisStatus: 'awaiting_report',
          hmisLastCheckedAt: new Date(),
          createdAt: new Date(),
        } as any);
        newStudiesCreated++;
        try {
          const { enqueueCaseSync } = await import('@/services/sync/case-sync-outbox.service');
          await enqueueCaseSync(item.accession, 'upsert');
        } catch {}
      }

      // Untombstone if previously deleted - an active HMIS case must be visible in worklist
      if (item.accession) {
        try {
          const { tombstonedAccessions } = await import('@/db/schema');
          await db.delete(tombstonedAccessions).where(eq(tombstonedAccessions.accession, item.accession.toUpperCase()));
        } catch {}
      }
    } catch (err: any) {
      console.warn(`[HMIS_SYNC_ITEM_WARN] Skipped accession ${item.accession}:`, err.message);
      skipped++;
    }
  }

  if (newStudiesCreated > 0 || existingUpdated > 0) {
    try {
      const { drainSyncOutbox } = await import('@/services/sync/case-sync-outbox.service');
      drainSyncOutbox(50).catch(() => {});
    } catch {}
  }

  await logAudit({
    action: 'HMIS_BACKGROUND_SYNC',
    entityType: 'Worklist',
    details: `Ingested ${normalized.length} HMIS items (New: ${newStudiesCreated}, Updated: ${existingUpdated}, Matched DICOM: ${matchedWithLocalDicom})`,
  });

  return {
    totalFetched: normalized.length,
    newStudiesCreated,
    existingUpdated,
    matchedWithLocalDicom,
    skipped,
  };
}

/**
 * Syncs the live HMIS proceeded patients worklist into the local database.
 */
export async function syncHmisAndPacsWorklist(
  filters?: HmisWorklistFilters,
  credentials?: HmisAuthCredentials
): Promise<HmisSyncSummary> {
  const health = await checkGatewayHealth();
  if (!health.online) {
    return {
      totalFetched: 0,
      newStudiesCreated: 0,
      existingUpdated: 0,
      matchedWithLocalDicom: 0,
      skipped: 0,
      error: 'HMIS Gateway is offline or unreachable on port 3788',
    };
  }

  const effectiveFilters: HmisWorklistFilters = {
    perPage: 100,
    fetchAllPages: false,
    ...filters,
  };

  const hmisResult = credentials
    ? await fetchHmisWorklist(effectiveFilters, credentials)
    : await fetchHmisWorklist(effectiveFilters);
  const rawList = Array.isArray(hmisResult.data)
    ? hmisResult.data
    : (Array.isArray(hmisResult.data?.records) ? hmisResult.data.records : null);

  if (!hmisResult.success || !rawList) {
    return {
      totalFetched: 0,
      newStudiesCreated: 0,
      existingUpdated: 0,
      matchedWithLocalDicom: 0,
      skipped: 0,
      error: hmisResult.error || 'Failed to parse HMIS worklist response',
    };
  }

  return await ingestHmisRecordsToDb(rawList);
}

// Re-export 3-Tier Tracking Engine & Types
export { syncCaseTrackingStatus, type TrackingSyncResult } from './hmis-case-tracker.service';
