import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { db } from '@/db';
import { hospitalPacsStudies } from '@/db/schema/hospital-pacs';
import { eq, and } from 'drizzle-orm';
import { indexHospitalPacsStudies, queryIndexedHospitalPacs } from '../hospital-pacs-index.service';

describe('Task 1: (MRN, Modality, Accession) Composite Identity Invariant', () => {
  const TEST_ACCESSION = 'TEST_ACC_COLLISION_01';
  const MRN_NAZEER = 'MRN_PATIENT_NAZEER';
  const MRN_YAQOOB = 'MRN_PATIENT_YAQOOB';

  beforeEach(async () => {
    await db.delete(hospitalPacsStudies).where(eq(hospitalPacsStudies.accessionNumber, TEST_ACCESSION));
  });

  afterEach(async () => {
    await db.delete(hospitalPacsStudies).where(eq(hospitalPacsStudies.accessionNumber, TEST_ACCESSION));
  });

  it('allows inserting both a CT study and an MR study with the same accession number without collision', async () => {
    // 1. Ingest Nazeer's CT scan
    await indexHospitalPacsStudies([
      {
        accessionNumber: TEST_ACCESSION,
        patientName: 'NAZEER',
        patientId: MRN_NAZEER,
        patientMrn: MRN_NAZEER,
        modality: 'CT',
        studyDate: '20261010',
        studyDescription: 'CT Brain Plain',
        numInstances: 18,
        s3Status: 'synced',
      },
    ]);

    // 2. Ingest Yaqoob's MRI scan with the SAME accession number
    await indexHospitalPacsStudies([
      {
        accessionNumber: TEST_ACCESSION,
        patientName: 'M YAQOOB',
        patientId: MRN_YAQOOB,
        patientMrn: MRN_YAQOOB,
        modality: 'MR',
        studyDate: '20261010',
        studyDescription: 'MRI Brain with Contrast',
        numInstances: 125,
        s3Status: 'synced',
      },
    ]);

    // Query CT
    const ctRes = await queryIndexedHospitalPacs({ search: TEST_ACCESSION, modality: 'CT' });
    expect(ctRes.total).toBe(1);
    expect(ctRes.studies[0].patientName).toBe('NAZEER');
    expect(ctRes.studies[0].modality).toBe('CT');
    expect(ctRes.studies[0].numInstances).toBe(18);

    // Query MR
    const mrRes = await queryIndexedHospitalPacs({ search: TEST_ACCESSION, modality: 'MR' });
    expect(mrRes.total).toBe(1);
    expect(mrRes.studies[0].patientName).toBe('M YAQOOB');
    expect(mrRes.studies[0].modality).toBe('MR');
    expect(mrRes.studies[0].numInstances).toBe(125);
  });
});
