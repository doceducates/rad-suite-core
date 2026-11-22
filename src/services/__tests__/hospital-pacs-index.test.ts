import { describe, it, expect, beforeEach } from 'vitest';
import {
  indexHospitalPacsStudies,
  queryIndexedHospitalPacs,
  queryAndFederateHospitalPacs,
  updateStudyS3Status,
  getLast48HoursDicomRange,
} from '../hospital-pacs-index.service';
import { db } from '@/db';
import { hospitalPacsStudies } from '@/db/schema/hospital-pacs';
import { eq } from 'drizzle-orm';
import { recordClinicHeartbeat, resetClinicNodeState } from '../clinic-node.service';

describe('hospital-pacs-index.service', () => {
  beforeEach(async () => {
    // Clear test studies
    try {
      await db.delete(hospitalPacsStudies).where(eq(hospitalPacsStudies.accessionNumber, 'TEST_ACC_01'));
      await db.delete(hospitalPacsStudies).where(eq(hospitalPacsStudies.accessionNumber, 'TEST_ACC_02'));
    } catch {}
  });

  it('calculates 48-hour DICOM date range correctly', () => {
    const range = getLast48HoursDicomRange();
    expect(range.startDicomDate).toMatch(/^\d{8}$/);
    expect(range.endDicomDate).toMatch(/^\d{8}$/);
    expect(Number(range.endDicomDate)).toBeGreaterThanOrEqual(Number(range.startDicomDate));
  });

  it('upserts incoming studies and queries them by accession', async () => {
    const range = getLast48HoursDicomRange();
    const res = await indexHospitalPacsStudies([
      {
        accessionNumber: 'TEST_ACC_01',
        patientName: 'JOHN DOE',
        patientId: 'MR-1001',
        patientMrn: 'MR-1001',
        modality: 'MR',
        studyDescription: 'MRI BRAIN W/O CONTRAST',
        studyDate: range.endDicomDate,
        studyTime: '103000',
        numSeries: 4,
        numInstances: 120,
      },
    ]);

    expect(res.upserted).toBe(1);

    const query = await queryIndexedHospitalPacs({
      search: 'TEST_ACC_01',
      searchField: 'accession',
      datePreset: '48h',
    });

    expect(query.total).toBeGreaterThanOrEqual(1);
    const found = query.studies.find((s) => s.accessionNumber === 'TEST_ACC_01');
    expect(found).toBeDefined();
    expect(found?.patientName).toBe('JOHN DOE');
    expect(found?.modality).toBe('MR');
  });

  it('searches specifically by MRN', async () => {
    const range = getLast48HoursDicomRange();
    await indexHospitalPacsStudies([
      {
        accessionNumber: 'TEST_ACC_02',
        patientName: 'ALICE SMITH',
        patientId: 'MR-9999',
        patientMrn: 'MR-9999',
        modality: 'CT',
        studyDescription: 'CT CHEST',
        studyDate: range.endDicomDate,
      },
    ]);

    const query = await queryIndexedHospitalPacs({
      search: 'MR-9999',
      searchField: 'mrn',
      datePreset: '48h',
    });

    const found = query.studies.find((s) => s.accessionNumber === 'TEST_ACC_02');
    expect(found).toBeDefined();
    expect(found?.patientName).toBe('ALICE SMITH');
  });

  it('updates S3 status and preserves synced status on re-index', async () => {
    const range = getLast48HoursDicomRange();
    await indexHospitalPacsStudies([
      {
        accessionNumber: 'TEST_ACC_01',
        patientName: 'JOHN DOE',
        modality: 'MR',
        studyDate: range.endDicomDate,
      },
    ]);

    await updateStudyS3Status('TEST_ACC_01', 'synced', { s3KeyPrefix: 'cases/TEST_ACC_01' });

    // Re-indexing study should preserve 'synced' status
    await indexHospitalPacsStudies([
      {
        accessionNumber: 'TEST_ACC_01',
        patientName: 'JOHN DOE (UPDATED)',
        modality: 'MR',
        studyDate: range.endDicomDate,
        s3Status: 'not_uploaded',
      },
    ]);

    const query = await queryIndexedHospitalPacs({ search: 'TEST_ACC_01' });
    const found = query.studies.find((s) => s.accessionNumber === 'TEST_ACC_01');
    expect(found?.s3Status).toBe('synced');
    expect(found?.patientName).toBe('JOHN DOE (UPDATED)');
  });

  it('filters studies within 30d preset correctly', async () => {
    const now = new Date();
    const formatDicom = (d: Date) =>
      `${d.getFullYear()}${String(d.getMonth() + 1).padStart(2, '0')}${String(d.getDate()).padStart(2, '0')}`;
    const recentDate = formatDicom(new Date(now.getTime() - 10 * 24 * 60 * 60 * 1000)); // 10 days ago

    await indexHospitalPacsStudies([
      {
        accessionNumber: 'TEST_ACC_01',
        patientName: 'MONTH TEST',
        modality: 'MR',
        studyDate: recentDate,
      },
    ]);

    const res = await queryIndexedHospitalPacs({
      search: 'TEST_ACC_01',
      datePreset: '30d',
    });

    expect(res.total).toBe(1);
    expect(res.studies[0].accessionNumber).toBe('TEST_ACC_01');
  });

  it('federates studies from clinic node telemetry when database has 0 rows', async () => {
    resetClinicNodeState();
    // Simulate clinic node heartbeat with resident study in MedicalSandbox
    recordClinicHeartbeat({
      nodeId: 'clinic-pc-primary',
      orthancStatus: 'running',
      localStudies: [
        {
          studyId: 'orthanc-study-99',
          accession: 'TEST_ACC_02',
          patientName: 'FEDERATED PATIENT',
          patientId: 'MR-FED-01',
          modality: 'CT',
          studyDate: '20261010',
          studyDescription: 'CT ABDOMEN',
          sliceCount: 240,
          sizeMb: 120,
          isSyncedToS3: false,
        },
      ],
    });

    // Make sure database does not have TEST_ACC_02 yet
    await db.delete(hospitalPacsStudies).where(eq(hospitalPacsStudies.accessionNumber, 'TEST_ACC_02'));

    // queryAndFederateHospitalPacs should find 0 in DB, then federate from clinic node telemetry, index it, and return it!
    const federated = await queryAndFederateHospitalPacs({
      search: 'TEST_ACC_02',
      datePreset: 'all',
    });

    expect(federated.total).toBeGreaterThanOrEqual(1);
    const found = federated.studies.find((s) => s.accessionNumber === 'TEST_ACC_02');
    expect(found).toBeDefined();
    expect(found?.patientName).toBe('FEDERATED PATIENT');
    expect(found?.pacsSource).toBe('CLINIC_NODE');
  });

  it('respects 48h date filter during text search without auto-broadening', async () => {
    // Insert a study scanned 20 days ago
    await indexHospitalPacsStudies([
      {
        accessionNumber: 'TEST_ACC_01',
        patientName: 'EMAN FATIMA',
        patientId: 'MR-9988',
        patientMrn: 'MR-9988',
        modality: 'MR',
        studyDate: '20260920', // older than 48h
        studyDescription: 'MRI BRAIN',
      },
    ]);

    // Query with default '48h' preset and specific text search 'eman'
    const res = await queryIndexedHospitalPacs({
      search: 'eman',
      datePreset: '48h',
    });

    // Should strictly respect 48h filter and return 0 matches
    expect(res.total).toBe(0);
    expect(res.studies.length).toBe(0);

    // Querying with datePreset: 'all' finds the study
    const allRes = await queryIndexedHospitalPacs({
      search: 'eman',
      datePreset: 'all',
    });
    expect(allRes.total).toBeGreaterThanOrEqual(1);
    expect(allRes.studies.some((s) => s.patientName === 'EMAN FATIMA')).toBe(true);
  });
});
