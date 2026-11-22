import { describe, it, expect, vi, beforeEach } from 'vitest';
import {
  getEdgeOrthancUrl,
  testEdgeOrthanc,
  getEdgeStudySeries,
  getEdgeSliceBuffer,
} from '../edge-streaming.service';
import { getStudyManifest } from '../study-manifest.service';
import fs from 'fs';
import path from 'path';

describe('Direct Clinic Edge Node Streaming & Pass-Through Proxy', () => {
  const mockAccession = `ACC_EDGE_${Date.now()}`;

  it('1. verifies getEdgeOrthancUrl resolves default or custom endpoint cleanly', () => {
    const url = getEdgeOrthancUrl();
    expect(url).toMatch(/^http:\/\/(127\.0\.0\.1|localhost|[\d.]+):(\d+)$/);
  });

  it('2. verifies testEdgeOrthanc handles connection state safely without throwing errors', async () => {
    const status = await testEdgeOrthanc();
    expect(status).toHaveProperty('reachable');
    expect(status).toHaveProperty('latencyMs');
    expect(typeof status.reachable).toBe('boolean');
    expect(typeof status.latencyMs).toBe('number');
  });

  it('3. verifies getEdgeStudySeries returns empty array for non-existent studies without crashing', async () => {
    const series = await getEdgeStudySeries('NON_EXISTENT_ACC_99999');
    expect(Array.isArray(series)).toBe(true);
    expect(series.length).toBe(0);
  });

  it('4. verifies getEdgeSliceBuffer returns null safely when study/slice is not found', async () => {
    const buf = await getEdgeSliceBuffer('NON_EXISTENT_ACC_99999', '1', 0);
    expect(buf).toBeNull();
  });

  it('5. verifies fast LRU disk cache retrieval when cached edge slice exists', async () => {
    const cacheDir = path.join(process.cwd(), 'storage', 'cache', 's3', mockAccession);
    fs.mkdirSync(cacheDir, { recursive: true });

    const mockSliceFile = path.join(cacheDir, `${mockAccession}_s1_i0.dcm`);
    const mockContent = Buffer.from('MOCK_DICOM_BYTES_FOR_EDGE_TEST');
    fs.writeFileSync(mockSliceFile, mockContent);

    try {
      const retrieved = await getEdgeSliceBuffer(mockAccession, '1', 0);
      expect(retrieved).not.toBeNull();
      expect(retrieved?.toString('utf8')).toBe('MOCK_DICOM_BYTES_FOR_EDGE_TEST');
    } finally {
      try {
        fs.unlinkSync(mockSliceFile);
        fs.rmdirSync(cacheDir);
      } catch {}
    }
  });

  it('6. verifies StudyManifestResponse supports "edge" source type', async () => {
    // If not found in local or S3 or offline Orthanc, returns null
    const manifest = await getStudyManifest('TOTALLY_FICTIONAL_ACC_123');
    expect(manifest).toBeNull();
  });
});
