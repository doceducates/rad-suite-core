import { describe, it, expect, vi, beforeEach } from 'vitest';
import { ingestHmisRecordsToDb } from '../hmis-worklist-sync.service';
import { normalizeHmisRecords } from '../hmis-worklist-normalizer';
import { db } from '@/db';
import { studies, patients } from '@/db/schema';
import { eq, sql } from 'drizzle-orm';

vi.mock('@/services/audit.service', () => ({
  logAudit: vi.fn().mockResolvedValue({}),
}));

describe('HMIS Worklist Ingestion & Unification Engine', () => {
  it('normalizes records and provides fallback accession numbers when accession link is missing', () => {
    const rawData = [
      {
        patientName: 'Ali Raza',
        mrn: '1920261001',
        gender: 'Male',
        age: 45,
        modality: 'CT',
        cpt: 'CT Brain Plain',
        accession: '', // Missing accession
        investigationId: '88776655',
        studyDate: '2026-10-05',
        department: 'Emergency',
      },
    ];

    const normalized = normalizeHmisRecords(rawData);
    expect(normalized.length).toBe(1);
    expect(normalized[0].accession).toBe('INV-88776655');
    expect(normalized[0].bodyPart).toBe('Brain');
    expect(normalized[0].patientName).toBe('Ali Raza');
  });

  it('normalizes spine sub-regions accurately into discrete body parts', () => {
    const rawData = [
      {
        patientName: 'Khadija Bibi',
        mrn: '1920261002',
        gender: 'Female',
        age: 52,
        modality: 'MRI',
        cpt: 'MRI Lumbar Spine with Contrast',
        accession: '192610554433',
        investigationId: '88776656',
        studyDate: '2026-10-05',
      },
    ];

    const normalized = normalizeHmisRecords(rawData);
    expect(normalized.length).toBe(1);
    expect(normalized[0].bodyPart).toBe('LS Spine');
    expect(normalized[0].modality).toBe('MRI');
  });

  it('ingests scraped records directly into database and creates or updates studies', async () => {
    const testAcc = `HMISTEST-${Date.now()}`;
    const testMrn = `MRNTEST-${Date.now()}`;

    const rawScraped = [
      {
        patientName: 'Tariq Mehmood',
        mrn: testMrn,
        gender: 'Male',
        age: 38,
        modality: 'CT',
        cpt: 'CT Abdomen Pelvis with Contrast',
        accession: testAcc,
        investigationId: '998877',
        studyDateTime: '2026-10-05T14:30:00+05:00',
        department: 'OPD',
        doctor: 'Dr. Naveed',
      },
    ];

    const summary = await ingestHmisRecordsToDb(rawScraped);
    expect(summary.totalFetched).toBe(1);
    expect(summary.newStudiesCreated).toBeGreaterThanOrEqual(1);

    // Verify study exists in DB
    const [savedStudy] = await db
      .select()
      .from(studies)
      .where(eq(sql`lower(${studies.accessionNumber})`, testAcc.toLowerCase()))
      .limit(1);

    expect(savedStudy).toBeDefined();
    expect(savedStudy.accessionNumber).toBe(testAcc);
    expect(savedStudy.hmisStatus).toBe('awaiting_report');
    expect(savedStudy.bodyPart).toBe('Abdomen');
    expect(savedStudy.referringDoctor).toBe('Dr. Naveed');

    // Clean up test records
    if (savedStudy) {
      await db.delete(studies).where(eq(studies.id, savedStudy.id));
      await db.delete(patients).where(eq(patients.id, savedStudy.patientId));
    }
  });
});
