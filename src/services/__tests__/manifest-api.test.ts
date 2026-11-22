import { describe, it, expect, vi, beforeEach } from 'vitest';
import { NextRequest } from 'next/server';
import { GET } from '@/app/api/cases/[accession]/manifest/route';
import { getStudyManifest, type StudyManifestResponse } from '../study-manifest.service';
import * as localCasesService from '../local-cases.service';
import * as s3RetrievalService from '../s3-retrieval.service';

vi.mock('../local-cases.service', () => ({
  getLocalCaseById: vi.fn(),
  getLocalCases: vi.fn(() => []),
}));

vi.mock('../s3-retrieval.service', () => ({
  getS3StudySeries: vi.fn(),
}));

describe('Lightweight Study Manifest API Endpoint & Service', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('Contract Definition', () => {
    it('structures study manifest with all series, slice counts, orientations, and descriptions', () => {
      const manifest: StudyManifestResponse = {
        accessionNumber: '192609005769',
        modality: 'MR',
        patientName: 'AHMAD AYAZ',
        patientId: '19202652134763',
        source: 'local',
        series: [
          {
            seriesNumber: '13001',
            seriesDescription: 'SG T2',
            orientation: 'SAGITTAL',
            sliceCount: 14,
            rows: 512,
            columns: 512,
            pixelSpacing: [0.625, 0.625],
            iop: [0, 1, 0, 0, 0, -1],
          },
          {
            seriesNumber: '14001',
            seriesDescription: 'SG T1',
            orientation: 'SAGITTAL',
            sliceCount: 14,
          },
        ],
      };

      expect(manifest.series[0].orientation).toBe('SAGITTAL');
      expect(manifest.series.length).toBe(2);
      expect(manifest.series[0].rows).toBe(512);
      expect(manifest.series[0].pixelSpacing).toEqual([0.625, 0.625]);
    });
  });

  describe('Local Case Manifest Resolution', () => {
    const mockLocalCase: localCasesService.LocalCaseStudy = {
      id: '192609005769_AHMAD_AYAZ',
      accessionNumber: '192609005769',
      patientName: 'AHMAD AYAZ',
      patientId: 'MRN-7890',
      modality: 'MR',
      studyDescription: 'MRI LUMBAR SPINE',
      studyDate: '2026-10-07T12:00:00.000Z',
      studyInstanceUid: '1.2.826.0.1.3680043.2.1143.999',
      age: 45,
      gender: 'Male',
      folderPath: 'E:/Cases/192609005769_AHMAD_AYAZ',
      numInstances: 53,
      series: [
        {
          seriesNumber: '13001',
          seriesDescription: 'SG T2',
          orientation: 'SAGITTAL',
          sliceCount: 14,
          files: ['file1.dcm', 'file2.dcm'],
          rows: 512,
          columns: 512,
          pixelSpacing: [0.625, 0.625],
          iop: [0.05, 0.99, 0.05, 0.1, 0.05, -0.99],
        },
        {
          seriesNumber: '15001',
          seriesDescription: 'COR T2 STIR',
          orientation: 'CORONAL',
          sliceCount: 15,
          files: ['file3.dcm'],
          rows: 384,
          columns: 384,
          pixelSpacing: [0.78, 0.78],
        },
        {
          seriesNumber: '16001',
          seriesDescription: 'AX T1',
          orientation: 'AXIAL',
          sliceCount: 24,
          files: ['file4.dcm'],
        },
      ],
    };

    it('resolves local case study manifest and propagates complete series metadata', async () => {
      vi.mocked(localCasesService.getLocalCaseById).mockReturnValue(mockLocalCase);

      const manifest = await getStudyManifest('192609005769');
      expect(manifest).not.toBeNull();
      expect(manifest?.accessionNumber).toBe('192609005769');
      expect(manifest?.patientName).toBe('AHMAD AYAZ');
      expect(manifest?.patientId).toBe('MRN-7890');
      expect(manifest?.modality).toBe('MR');
      expect(manifest?.studyDescription).toBe('MRI LUMBAR SPINE');
      expect(manifest?.source).toBe('local');
      expect(manifest?.series.length).toBe(3);

      // Verify series 0 (Sagittal)
      expect(manifest?.series[0].seriesNumber).toBe('13001');
      expect(manifest?.series[0].seriesDescription).toBe('SG T2');
      expect(manifest?.series[0].orientation).toBe('SAGITTAL');
      expect(manifest?.series[0].sliceCount).toBe(14);
      expect(manifest?.series[0].rows).toBe(512);
      expect(manifest?.series[0].columns).toBe(512);
      expect(manifest?.series[0].pixelSpacing).toEqual([0.625, 0.625]);
      expect(manifest?.series[0].iop).toBeDefined();

      // Verify series 1 (Coronal)
      expect(manifest?.series[1].seriesNumber).toBe('15001');
      expect(manifest?.series[1].orientation).toBe('CORONAL');
      expect(manifest?.series[1].sliceCount).toBe(15);

      // Verify series 2 (Axial)
      expect(manifest?.series[2].seriesNumber).toBe('16001');
      expect(manifest?.series[2].orientation).toBe('AXIAL');
      expect(manifest?.series[2].sliceCount).toBe(24);
    });

    it('returns HTTP 200 with Cache-Control header via GET endpoint for local case', async () => {
      vi.mocked(localCasesService.getLocalCaseById).mockReturnValue(mockLocalCase);

      const req = new NextRequest('http://localhost:3000/api/cases/192609005769/manifest');
      const res = await GET(req, { params: { accession: '192609005769' } });

      expect(res.status).toBe(200);
      expect(res.headers.get('cache-control')).toBe('private, max-age=300');

      const body: StudyManifestResponse = await res.json();
      expect(body.accessionNumber).toBe('192609005769');
      expect(body.source).toBe('local');
      expect(body.series).toHaveLength(3);
      expect(body.series[0].orientation).toBe('SAGITTAL');
    });
  });

  describe('S3 Cloud Case Manifest Resolution', () => {
    const mockS3Series: s3RetrievalService.S3SeriesInfo[] = [
      {
        seriesNumber: '1',
        seriesDescription: 'SG_T2_TSE',
        orientation: 'SAGITTAL',
        sliceCount: 16,
        keys: [
          'dicom/2026/10/MR/ACC9001_JOHN_DOE_UID123/series-1_SG_T2_TSE/sop1.dcm',
          'dicom/2026/10/MR/ACC9001_JOHN_DOE_UID123/series-1_SG_T2_TSE/sop2.dcm',
        ],
      },
      {
        seriesNumber: '2',
        seriesDescription: 'COR_T2_STIR',
        orientation: 'CORONAL',
        sliceCount: 14,
        keys: [
          'dicom/2026/10/MR/ACC9001_JOHN_DOE_UID123/series-2_COR_T2_STIR/sop1.dcm',
        ],
      },
      {
        seriesNumber: '3',
        seriesDescription: 'AX_T1_SE',
        sliceCount: 22,
        keys: [
          'dicom/2026/10/MR/ACC9001_JOHN_DOE_UID123/series-3_AX_T1_SE/sop1.dcm',
        ],
      },
    ];

    it('falls back to S3 cloud storage when case is not found on local disk', async () => {
      vi.mocked(localCasesService.getLocalCaseById).mockReturnValue(undefined);
      vi.mocked(s3RetrievalService.getS3StudySeries).mockResolvedValue(mockS3Series);

      const manifest = await getStudyManifest('ACC9001');
      expect(manifest).not.toBeNull();
      expect(manifest?.source).toBe('s3');
      expect(manifest?.accessionNumber).toBe('ACC9001');
      expect(manifest?.patientName).toBe('JOHN DOE');
      expect(manifest?.modality).toBe('MR');
      expect(manifest?.series).toHaveLength(3);

      // Verify orientation detected from S3 series
      expect(manifest?.series[0].orientation).toBe('SAGITTAL');
      expect(manifest?.series[1].orientation).toBe('CORONAL');
      expect(manifest?.series[2].orientation).toBe('AXIAL');
      expect(manifest?.series[0].sliceCount).toBe(16);
    });

    it('returns HTTP 200 via GET endpoint for S3 cloud case', async () => {
      vi.mocked(localCasesService.getLocalCaseById).mockReturnValue(undefined);
      vi.mocked(s3RetrievalService.getS3StudySeries).mockResolvedValue(mockS3Series);

      const req = new NextRequest('http://localhost:3000/api/cases/ACC9001/manifest');
      const res = await GET(req, { params: Promise.resolve({ accession: 'ACC9001' }) });

      expect(res.status).toBe(200);
      expect(res.headers.get('cache-control')).toBe('private, max-age=300');

      const body: StudyManifestResponse = await res.json();
      expect(body.source).toBe('s3');
      expect(body.series[0].seriesDescription).toBe('SG_T2_TSE');
      expect(body.series[0].orientation).toBe('SAGITTAL');
    });
  });

  describe('Not Found (404) & Validation (400)', () => {
    it('returns HTTP 404 when study is not found on local disk or S3', async () => {
      vi.mocked(localCasesService.getLocalCaseById).mockReturnValue(undefined);
      vi.mocked(s3RetrievalService.getS3StudySeries).mockResolvedValue([]);

      const req = new NextRequest('http://localhost:3000/api/cases/UNKNOWN_ACC_404/manifest');
      const res = await GET(req, { params: { accession: 'UNKNOWN_ACC_404' } });

      expect(res.status).toBe(404);
      const data = await res.json();
      expect(data.error).toContain('not found');
      expect(data.error).not.toContain('SQL');
      expect(data.stack).toBeUndefined();
    });

    it('returns HTTP 400 when accession parameter is missing or empty', async () => {
      const req = new NextRequest('http://localhost:3000/api/cases//manifest');
      const res = await GET(req, { params: { accession: '   ' } });

      expect(res.status).toBe(400);
      const data = await res.json();
      expect(data.error).toBe('Accession number is required');
    });

    it('returns HTTP 400 when accession parameter has malformed percent encoding', async () => {
      const req = new NextRequest('http://localhost:3000/api/cases/%E0%A4%A/manifest');
      const res = await GET(req, { params: { accession: '%E0%A4%A' } });

      expect(res.status).toBe(400);
      const data = await res.json();
      expect(data.error).toBe('Invalid accession number encoding');
    });

    it('decodes URI-encoded accession parameter properly', async () => {
      vi.mocked(localCasesService.getLocalCaseById).mockImplementation((acc) => {
        if (acc === 'ACC 1234') {
          return {
            id: 'ACC_1234',
            accessionNumber: 'ACC 1234',
            patientName: 'SPACED PATIENT',
            patientId: 'P1',
            modality: 'CT',
            studyDescription: 'CT ABDOMEN',
            studyDate: '2026-10-07T00:00:00.000Z',
            studyInstanceUid: '1.2.3',
            age: 50,
            gender: 'Male',
            folderPath: '',
            numInstances: 1,
            series: [
              {
                seriesNumber: '1',
                seriesDescription: 'AXIAL CHEST',
                orientation: 'AXIAL',
                sliceCount: 10,
                files: [],
              },
            ],
          };
        }
        return undefined;
      });

      const req = new NextRequest('http://localhost:3000/api/cases/ACC%201234/manifest');
      const res = await GET(req, { params: { accession: 'ACC%201234' } });

      expect(res.status).toBe(200);
      const body = await res.json();
      expect(body.accessionNumber).toBe('ACC 1234');
    });
  });

  describe('Live Clinical Case Resolution', () => {
    it('resolves actual E:/Cases/192609005769_AHMAD_AYAZ if present on disk', async () => {
      const fs = await import('fs');
      if (!fs.existsSync('E:/Cases/192609005769_AHMAD_AYAZ')) return;

      const actualLocalCases = await vi.importActual<typeof import('../local-cases.service')>(
        '../local-cases.service'
      );
      vi.mocked(localCasesService.getLocalCaseById).mockImplementation((acc) =>
        actualLocalCases.getLocalCaseById(acc)
      );

      const req = new NextRequest('http://localhost:3000/api/cases/192609005769/manifest');
      const res = await GET(req, { params: { accession: '192609005769' } });

      expect(res.status).toBe(200);
      const manifest: StudyManifestResponse = await res.json();
      expect(manifest.accessionNumber).toBe('192609005769');
      expect(manifest.source).toBe('local');
      expect(manifest.series.length).toBeGreaterThanOrEqual(4);

      const sgSeries = manifest.series.find((s) => s.seriesDescription.includes('SG'));
      expect(sgSeries).toBeDefined();
      expect(sgSeries?.orientation).toBe('SAGITTAL');
    });
  });

  describe('Error Shielding (Rule 3)', () => {
    it('catches unexpected exceptions and shields database or stack errors with 500', async () => {
      vi.mocked(localCasesService.getLocalCaseById).mockImplementation(() => {
        throw new Error('Raw SQLite Error: disk I/O failure at /data/radsuite.db');
      });

      const consoleSpy = vi.spyOn(console, 'error').mockImplementation(() => {});

      const req = new NextRequest('http://localhost:3000/api/cases/CRASH_CASE/manifest');
      const res = await GET(req, { params: { accession: 'CRASH_CASE' } });

      expect(res.status).toBe(500);
      const data = await res.json();
      expect(data.error).toBe('Failed to retrieve study manifest');
      expect(data.error).not.toContain('SQLite');
      expect(data.error).not.toContain('/data/radsuite.db');
      expect(data.stack).toBeUndefined();

      consoleSpy.mockRestore();
    });
  });
});
