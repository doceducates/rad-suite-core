// Layer 2 (Domain/Services): 3-Tier Clinical Case Lifecycle & HMIS Tracking Engine (<170 lines)
import { db } from '@/db';
import { studies, reports, patients } from '@/db/schema';
import { eq, sql, or, like } from 'drizzle-orm';
import {
  trackHmisReport,
  fetchHmisPublishedReports,
  searchHmisPatient,
} from './hmis-gateway-client.service';
import type { HmisAuthCredentials } from './hmis-models';
import { logAudit } from '@/services/audit.service';

export interface TrackingSyncResult {
  accession: string;
  hmisStatus: string;
  status: string;
  milestones: Record<string, any>;
  checkedAt: string;
  studyId?: string;
}

/**
 * Hydrates and synchronizes an individual case's lifecycle with a 3-tier clinical waterfall:
 * 1. Published Reports: Checks if consultant finalized & published the report PDF.
 * 2. HMIS Tracking: Checks the 9 discrete milestones (Published, Verified, Performed, Tech Ack).
 * 3. Proceeded Worklist / Add Result: Checks if draft result was added in HMIS.
 */
export async function syncCaseTrackingStatus(
  accession: string,
  credentials?: HmisAuthCredentials
): Promise<TrackingSyncResult | null> {
  const cleanAcc = accession.trim();
  const now = new Date();

  // Load existing study & patient MRN to prevent overwriting clinician's active work
  const [existingStudy] = await db
    .select({
      id: studies.id,
      status: studies.status,
      hmisStatus: studies.hmisStatus,
      mrNumber: patients.mrNumber,
    })
    .from(studies)
    .leftJoin(patients, eq(studies.patientId, patients.id))
    .where(
      or(
        eq(sql`lower(${studies.accessionNumber})`, cleanAcc.toLowerCase()),
        like(studies.accessionNumber, `%${cleanAcc}`)
      )
    )
    .limit(1);

  let mappedHmisStatus = 'unknown';
  let isPublished = false;
  let isVerified = false;
  let milestones: Record<string, any> = {};

  // Tier 1: Search Published Reports (Official Signed Reports)
  try {
    let pubRes = await fetchHmisPublishedReports({ accession: cleanAcc }, credentials);
    if ((!pubRes.success || !pubRes.data?.records?.length) && existingStudy?.mrNumber) {
      pubRes = await fetchHmisPublishedReports({ mrn: existingStudy.mrNumber }, credentials);
    }

    if (pubRes.success && pubRes.data?.records && pubRes.data.records.length > 0) {
      isPublished = true;
      mappedHmisStatus = 'published';
      const pubRecord = pubRes.data.records[0];
      milestones = {
        published: {
          timestamp: pubRecord.publishedDate || now.toISOString(),
          actor: pubRecord.doctor || pubRecord.addedBy || 'Consultant Radiologist',
        },
      };
    }
  } catch (err: any) {
    console.warn(`[CaseTracker] Published search error for ${cleanAcc}:`, err.message);
  }

  // Tier 2: Search HMIS Tracking (9 Discrete Milestones) if not confirmed published yet
  if (!isPublished) {
    try {
      let trackResult = await trackHmisReport({ accession: cleanAcc }, credentials);
      if ((!trackResult.success || !trackResult.data?.records?.length) && existingStudy?.mrNumber) {
        trackResult = await trackHmisReport({ mrn: existingStudy.mrNumber }, credentials);
      }

      if (trackResult.success && trackResult.data?.records?.[0]) {
        const record = trackResult.data.records[0];
        const rawStatus = (record.status || '').toUpperCase();
        milestones = record.milestones || {};
        const rawText = (record.rawText || '').toLowerCase();
        const ackText = (record.acknowledgeStatus || '').toLowerCase();

        if (rawStatus === 'PUBLISHED' || rawText.includes('published') || Boolean(milestones.published)) {
          isPublished = true;
          mappedHmisStatus = 'published';
        } else if (rawStatus === 'VERIFIED' || rawText.includes('verified') || Boolean(milestones.verified)) {
          isVerified = true;
          mappedHmisStatus = 'verified';
        } else if (
          rawStatus.includes('PENDING_RADIOGRAPHER') ||
          rawText.includes('pending radiographer') ||
          ackText.includes('pending radiographer')
        ) {
          mappedHmisStatus = 'pending_tech_ack';
        } else if (rawStatus.includes('PERFORMED') || rawStatus === 'PROCEEDED' || rawText.includes('proceeded')) {
          mappedHmisStatus = 'proceeded';
        } else if (rawStatus === 'REJECTED') {
          mappedHmisStatus = 'rejected';
        } else if (rawStatus === 'ACKNOWLEDGED' || rawStatus === 'ORDERED') {
          mappedHmisStatus = rawStatus.toLowerCase();
        }
      }
    } catch (err: any) {
      console.warn(`[CaseTracker] Tracking search error for ${cleanAcc}:`, err.message);
    }
  }

  // Tier 3: Search Proceeded Patients Worklist / Add Result if still awaiting or unknown
  if (!isPublished && !isVerified && (mappedHmisStatus === 'unknown' || mappedHmisStatus === 'proceeded')) {
    try {
      const patientRes = await searchHmisPatient({ accession: cleanAcc }, credentials);
      if (patientRes.success && patientRes.data) {
        const inv = patientRes.data.investigation || patientRes.data;
        if (inv.resultAdded || inv.hasDraft || inv.status === 'draft') {
          mappedHmisStatus = 'draft_entered';
        }
      }
    } catch (err: any) {
      console.warn(`[CaseTracker] Patient search error for ${cleanAcc}:`, err.message);
    }
  }

  // If study does not exist locally and no records were found on HMIS, return null
  if (!existingStudy && !isPublished && !isVerified && mappedHmisStatus === 'unknown') {
    return null;
  }

  // Safety update: Never downgrade an active local 'submitted' or 'draft' case to 'scheduled'
  const updateFields: any = {
    hmisStatus: mappedHmisStatus,
    hmisMilestonesJson: JSON.stringify(milestones),
    hmisLastCheckedAt: now,
  };

  if (isPublished) {
    updateFields.status = 'final';
    mappedHmisStatus = 'published';
  } else if (isVerified) {
    if (existingStudy?.status !== 'final') {
      updateFields.status = 'preliminary';
    }
    mappedHmisStatus = 'verified';
  }

  if (existingStudy?.id) {
    await db
      .update(studies)
      .set(updateFields)
      .where(eq(studies.id, existingStudy.id));

    if (isPublished || isVerified) {
      await db
        .update(reports)
        .set({
          status: isPublished ? 'final' : 'preliminary',
          updatedAt: now,
        } as any)
        .where(eq(reports.studyId, existingStudy.id));
    }
  } else {
    await db
      .update(studies)
      .set(updateFields)
      .where(
        or(
          eq(sql`lower(${studies.accessionNumber})`, cleanAcc.toLowerCase()),
          like(studies.accessionNumber, `%${cleanAcc}`)
        )
      );
  }

  await logAudit({
    action: 'CASE_TRACKING_SYNC',
    entityType: 'Study',
    entityId: cleanAcc,
    details: `Updated tracking status for accession ${cleanAcc} to ${mappedHmisStatus} (published: ${isPublished})`,
  });

  return {
    accession: cleanAcc,
    hmisStatus: mappedHmisStatus,
    status: updateFields.status || existingStudy?.status || 'draft',
    milestones,
    checkedAt: now.toISOString(),
    studyId: existingStudy?.id,
  };
}
