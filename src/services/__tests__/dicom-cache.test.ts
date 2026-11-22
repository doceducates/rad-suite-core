import { describe, it, expect, beforeEach } from 'vitest';
import { DicomSliceCache } from '../dicom-cache.service';
import type { ParsedDicomFile } from '../dicom-loader.service';

function createMockSlice(id: string): ParsedDicomFile {
  return {
    meta: {
      patientName: 'Test Patient',
      patientId: id,
      accessionNumber: 'ACC-123',
      modality: 'CT',
      studyDescription: 'CT Head',
      rows: 512,
      columns: 512,
      windowWidth: 400,
      windowCenter: 40,
      rescaleSlope: 1,
      rescaleIntercept: -1024,
      bitsAllocated: 16,
      pixelRepresentation: 1,
      photometricInterpretation: 'MONOCHROME2',
      pixelSpacing: [0.5, 0.5],
    },
    pixelData: new Int16Array(512 * 512),
  };
}

describe('DicomSliceCache LRU Service', () => {
  let cache: DicomSliceCache;

  beforeEach(() => {
    cache = DicomSliceCache.getInstance();
    cache.clear();
  });

  it('generates deterministic slice cache keys', () => {
    const key = cache.getSliceKey('CASE_01', '3', 15);
    expect(key).toBe('CASE_01::3::15');
  });

  it('stores and retrieves cached DICOM slices', () => {
    const mock = createMockSlice('P001');
    const key = cache.getSliceKey('CASE_01', '1', 0);
    cache.set(key, mock);

    const retrieved = cache.get(key);
    expect(retrieved).toBeDefined();
    expect(retrieved?.meta.patientId).toBe('P001');
    expect(retrieved?.pixelData.length).toBe(512 * 512);
  });

  it('returns null for cache misses', () => {
    expect(cache.get('NON_EXISTENT')).toBeNull();
  });

  it('clears all cached entries on request', () => {
    cache.set('key1', createMockSlice('P1'));
    cache.set('key2', createMockSlice('P2'));
    cache.clear();
    expect(cache.get('key1')).toBeNull();
    expect(cache.get('key2')).toBeNull();
  });
});
