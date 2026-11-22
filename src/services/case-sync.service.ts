// Layer 2 (Domain/Services): Local Disk to Database Ingestion Sync Service
import crypto from 'crypto';
import { db } from '@/db';
import { studies, patients, reports } from '@/db/schema';
import { eq } from 'drizzle-orm';
import { getLocalCases } from './local-cases.service';

function parseStudyDateSafely(d?: string | Date | null): Date {
  if (!d) return new Date();
  if (d instanceof Date) return isNaN(d.getTime()) ? new Date() : d;
  const parsed = new Date(d);
  if (!isNaN(parsed.getTime())) return parsed;
  const clean = String(d).replace(/[^0-9]/g, '');
  if (clean.length === 8) {
    const y = parseInt(clean.slice(0, 4), 10);
    const m = parseInt(clean.slice(4, 6), 10) - 1;
    const day = parseInt(clean.slice(6, 8), 10);
    const dt = new Date(Date.UTC(y, m, day, 12, 0, 0));
    if (!isNaN(dt.getTime())) return dt;
  }
  return new Date();
}

export async function syncLocalCasesToDatabase(): Promise<{ synced: number }> {
  const localCases = getLocalCases();
  let count = 0;

  for (const c of localCases) {
    try {
      let [patient] = await db.select().from(patients).where(eq(patients.mrNumber, c.patientId)).limit(1);
      if (!patient) {
        const [created] = await db.insert(patients).values({
          id: crypto.randomUUID(),
          mrNumber: c.patientId,
          fullName: c.patientName,
          age: c.age,
          gender: (c.gender as string) === 'F' ? 'Female' : (c.gender as string) === 'M' ? 'Male' : c.gender || 'Male',
          createdAt: new Date(),
        } as any).returning();
        patient = created;
      }

      const [existing] = await db.select().from(studies).where(eq(studies.accessionNumber, c.accessionNumber)).limit(1);
      let studyId = existing?.id;
      if (!existing) {
        studyId = crypto.randomUUID();
        await db.insert(studies).values({
          id: studyId,
          patientId: patient.id,
          accessionNumber: c.accessionNumber,
          modality: c.modality,
          scanType: c.studyDescription,
          bodyPart: c.modality === 'MR' ? 'Spine / Brain' : 'Body',
          priority: 'routine',
          status: 'scheduled',
          clinicalHistory: `${c.studyDescription} - Local Diagnostic Archive.`,
          scheduledAt: parseStudyDateSafely(c.studyDate),
          createdAt: new Date(),
        } as any);
        count++;
      }

      if (studyId) {
        const [existingReport] = await db.select().from(reports).where(eq(reports.studyId, studyId)).limit(1);
        if (!existingReport) {
          await db.insert(reports).values({
            id: crypto.randomUUID(),
            studyId,
            patientId: patient.id,
            authorId: '9ce1c37b-22e7-4cdb-83ae-eb14e91fde8a',
            status: 'draft',
            technique: `Standard high-resolution ${c.modality} acquisition protocol.`,
            findings: '',
            impression: '',
            criticalFinding: false,
            createdAt: new Date(),
            updatedAt: new Date(),
          } as any);
        }
      }
    } catch (err) {
      console.warn('[SYNC_WARN] Case sync skipped for:', c.id, err);
    }
  }

  return { synced: count };
}
