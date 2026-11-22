import { describe, it, expect, vi, beforeEach } from 'vitest';
import { enrichHospitalPacsStudies, type EnrichedHospitalPacsStudy } from '../pacs-study-enrichment.service';
import * as clinicNodeService from '../clinic-node.service';
import type { HospitalPacsStudy } from '@/db/schema';

describe('Task 2: PACS Table Clinical Diagnosis & Upload Progress Enrichment', () => {
  beforeEach(() => {
    vi.restoreAllMocks();
  });

  const mockBaseStudies: HospitalPacsStudy[] = [
    {
      id: 'study-001',
      accessionNumber: '192610002587',
      patientName: 'M YAQOOB',
      patientId: 'MRN-001',
      patientMrn: 'MRN-001',
      modality: 'MR',
      studyDescription: 'MRI BRAIN WITH CONTRAST',
      studyDate: '20261010',
      studyTime: '143000',
      studyInstanceUid: '1.2.392.200036.9116.4.2.9652.1467',
      numSeries: 4,
      numInstances: 125,
      pacsSource: 'HMIS_PACS',
      s3Status: 'uploading',
      s3KeyPrefix: 'dicom/2026/10/MR/192610002587_M_YAQOOB/',
      s3UploadedAt: null,
      storageTargetUserId: null,
      gdriveFileId: null,
      gdriveSyncedAt: null,
      isEphemeralVps: false,
      lastIndexedAt: new Date(),
      rawTagsJson: null,
      createdAt: new Date(),
    },
    {
      id: 'study-002',
      accessionNumber: '192610002272',
      patientName: 'FAKHRA',
      patientId: 'MRN-002',
      patientMrn: 'MRN-002',
      modality: 'MR',
      studyDescription: 'MRI LUMBAR SPINE',
      studyDate: '20261010',
      studyTime: '150000',
      studyInstanceUid: '1.2.392.200036.9116.4.2.9652.1468',
      numSeries: 3,
      numInstances: 53,
      pacsSource: 'HMIS_PACS',
      s3Status: 'synced',
      s3KeyPrefix: 'dicom/2026/10/MR/192610002272_FAKHRA/',
      s3UploadedAt: new Date(),
      storageTargetUserId: null,
      gdriveFileId: null,
      gdriveSyncedAt: null,
      isEphemeralVps: false,
      lastIndexedAt: new Date(),
      rawTagsJson: null,
      createdAt: new Date(),
    },
  ];

  it('attaches active upload progress from clinic node telemetry', async () => {
    vi.spyOn(clinicNodeService, 'getClinicNodeStatus').mockReturnValue({
      nodeId: 'clinic-pc-primary',
      online: true,
      activeUpload: {
        accession: '192610002587',
        patientName: 'M YAQOOB',
        modality: 'MR',
        completedSlices: 45,
        totalSlices: 125,
        progressPercent: 36,
        speedKbs: 1400,
      },
    } as any);

    const enriched = await enrichHospitalPacsStudies(mockBaseStudies);
    expect(enriched).toHaveLength(2);

    const yaqoob = enriched.find((s) => s.accessionNumber === '192610002587');
    expect(yaqoob?.uploadProgress).toBeDefined();
    expect(yaqoob?.uploadProgress?.current).toBe(45);
    expect(yaqoob?.uploadProgress?.total).toBe(125);
    expect(yaqoob?.uploadProgress?.percent).toBe(36);
    expect(yaqoob?.uploadProgress?.speedMbps).toBeCloseTo(11.2, 1);

    const fakhra = enriched.find((s) => s.accessionNumber === '192610002272');
    expect(fakhra?.uploadProgress).toBeNull();
  });

  it('preserves null reports and progress when not present', async () => {
    vi.spyOn(clinicNodeService, 'getClinicNodeStatus').mockReturnValue({
      nodeId: 'clinic-pc-primary',
      online: true,
      activeUpload: null,
    } as any);

    const enriched = await enrichHospitalPacsStudies(mockBaseStudies);
    expect(enriched[0].uploadProgress).toBeNull();
  });
});
