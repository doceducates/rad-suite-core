import { describe, it, expect, beforeEach } from 'vitest';
import { db } from '@/db';
import { studies, patients, hospitalPacsStudies } from '@/db/schema';
import { eq, like } from 'drizzle-orm';
import crypto from 'crypto';
import { resolveWorkspaceCase } from '../workspace-case-resolver.service';

describe('resolveWorkspaceCase Service Diagnosis', () => {
  let patientId: string;
  let studyId: string;
  const testAcc = '192610008299';
  const shortAcc = '08299';

  beforeEach(async () => {
    patientId = crypto.randomUUID();
    studyId = crypto.randomUUID();

    // Clean up test records
    await db.delete(studies).where(like(studies.accessionNumber, '%8299%'));

    await db.insert(patients).values({
      id: patientId,
      mrNumber: `MRN-${Date.now()}`,
      fullName: 'Adeeba Test',
      age: 11,
      gender: 'Female',
      createdAt: new Date(),
    } as any);

    await db.insert(studies).values({
      id: studyId,
      patientId: patientId,
      accessionNumber: testAcc,
      modality: 'MRI',
      scanType: 'MRI Cervical Spine Without Contrast',
      bodyPart: 'Cervical Spine',
      scheduledAt: new Date().toISOString(),
      status: 'final',
      createdAt: new Date(),
    } as any);
  });

  it('resolves existing case by exact accession', async () => {
    const res = await resolveWorkspaceCase(testAcc, { id: 'user-1', name: 'Dr. Mudassir', role: 'admin' });
    expect(res).not.toBeNull();
    expect(res?.study.accessionNumber).toBe(testAcc);
    expect(res?.patient.fullName).toBe('Adeeba Test');
    expect(res?.study.studyDescription).toBe('MRI Cervical Spine Without Contrast');
  });

  it('handles whitespace in accession', async () => {
    const res = await resolveWorkspaceCase(`  ${testAcc}  `, { id: 'user-1', name: 'Dr. Mudassir' });
    expect(res).not.toBeNull();
    expect(res?.study.accessionNumber).toBe(testAcc);
  });

  it('resolves short 5-digit accession suffix to full accession', async () => {
    const res = await resolveWorkspaceCase(shortAcc, { id: 'user-1', name: 'Dr. Mudassir' });
    expect(res).not.toBeNull();
    expect(res?.study.accessionNumber).toBe(testAcc);
    expect(res?.patient.fullName).toBe('Adeeba Test');
  });

  it('registers study from hospitalPacsStudies without crashing', async () => {
    const uniqueDigits = Math.floor(100000 + Math.random() * 900000);
    const pacsAcc = `PACS_${uniqueDigits}`;
    const pacsMrn = `MRN_PACS_${uniqueDigits}`;
    await db.insert(hospitalPacsStudies).values({
      id: crypto.randomUUID(),
      accessionNumber: pacsAcc,
      patientName: 'Pacs Patient',
      patientMrn: pacsMrn,
      modality: 'MR',
      studyDescription: 'MRI Brain',
      createdAt: new Date().toISOString(),
    } as any);

    const res = await resolveWorkspaceCase(pacsAcc, { id: 'user-1', name: 'Dr. Mudassir' });
    expect(res).not.toBeNull();
    expect(res?.study.accessionNumber).toBe(pacsAcc);
    expect(res?.patient.fullName).toBe('Pacs Patient');
  });
});
