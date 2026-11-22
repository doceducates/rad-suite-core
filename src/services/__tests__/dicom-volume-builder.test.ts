import { describe, it, expect } from 'vitest';
import * as THREE from 'three';
import { buildDicomVolumeData } from '../dicom-volume-builder.service';
import type { ParsedDicomFile } from '../dicom-loader.service';

function makeMockSlice(width: number, height: number, pixelValues: number[] | number): ParsedDicomFile {
  const count = width * height;
  const pixelData = new Int16Array(count);
  if (Array.isArray(pixelValues)) {
    pixelValues.forEach((v, i) => {
      pixelData[i] = v;
    });
  } else {
    pixelData.fill(pixelValues);
  }

  return {
    meta: {
      patientName: 'Test Patient',
      patientId: 'P001',
      accessionNumber: 'ACC-001',
      modality: 'MR',
      studyDescription: 'MR Volume',
      rows: height,
      columns: width,
      windowWidth: 400,
      windowCenter: 40,
      rescaleSlope: 1,
      rescaleIntercept: 0,
      bitsAllocated: 16,
      pixelRepresentation: 1,
      photometricInterpretation: 'MONOCHROME2',
      pixelSpacing: [1.0, 1.0],
    },
    pixelData,
  };
}

describe('DicomVolumeBuilderService', () => {
  it('builds a 3D volume texture with correct dimensions and linear filtering', () => {
    const width = 4;
    const height = 4;
    const depth = 2;

    const mockSlice1 = makeMockSlice(width, height, 50);
    const mockSlice2 = makeMockSlice(width, height, 150);

    const result = buildDicomVolumeData({
      width,
      height,
      depth,
      slices: [mockSlice1, mockSlice2],
    });

    expect(result.width).toBe(width);
    expect(result.height).toBe(height);
    expect(result.depth).toBe(depth);
    expect(result.texture).toBeInstanceOf(THREE.Data3DTexture);
    expect(result.texture.format).toBe(THREE.RedFormat);
    expect(result.texture.type).toBe(THREE.UnsignedByteType);
    expect(result.texture.minFilter).toBe(THREE.LinearFilter);
    expect(result.texture.magFilter).toBe(THREE.LinearFilter);
    expect(result.minVal).toBe(50);
    expect(result.maxVal).toBe(150);
  });

  it('normalizes voxel data cleanly to 0..255 range', () => {
    const width = 2;
    const height = 2;
    const depth = 1;

    // Slices with corner values: min 100, max 300
    const mockSlice = makeMockSlice(width, height, [100, 200, 200, 300]);

    const result = buildDicomVolumeData({
      width,
      height,
      depth,
      slices: [mockSlice],
    });

    const texData = result.texture.image.data as Uint8Array;
    expect(texData[0]).toBe(0); // 100 -> 0
    expect(texData[1]).toBe(128); // 200 -> 128
    expect(texData[3]).toBe(255); // 300 -> 255
  });

  it('calculates physical aspect ratio based on pixel spacing and slice thickness', () => {
    const width = 100;
    const height = 100;
    const depth = 10;

    // physX = 100 * 0.5 = 50
    // physY = 100 * 0.5 = 50
    // physZ = 10 * 5.0 = 50
    // maxDim = 50 -> aspect should be [1, 1, 1]
    const result = buildDicomVolumeData({
      width,
      height,
      depth,
      slices: [],
      pixelSpacing: [0.5, 0.5],
      sliceThickness: 5.0,
    });

    expect(result.aspect).toEqual([1, 1, 1]);
  });

  it('handles empty slices gracefully without throwing', () => {
    const result = buildDicomVolumeData({
      width: 4,
      height: 4,
      depth: 2,
      slices: [null, null],
    });

    expect(result.texture).toBeDefined();
    expect(result.minVal).toBe(0);
    expect(result.maxVal).toBe(1);
    expect((result.texture.image.data as Uint8Array).length).toBe(4 * 4 * 2);
  });
});
