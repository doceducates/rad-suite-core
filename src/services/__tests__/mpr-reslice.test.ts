import { describe, it, expect } from 'vitest';
import * as THREE from 'three';
import {
  extractAxialSlice,
  extractCoronalSlice,
  extractSagittalSlice,
  computeMprPlaneDimensions,
} from '../mpr-reslice.service';
import type { DicomVolumeData } from '../dicom-volume-builder.service';

describe('Vitrea MPR Tri-Planar Reslicing Engine', () => {
  function createTestVolume(width = 64, height = 64, depth = 20): DicomVolumeData {
    const data = new Uint8Array(width * height * depth);
    for (let z = 0; z < depth; z++) {
      for (let y = 0; y < height; y++) {
        for (let x = 0; x < width; x++) {
          data[z * width * height + y * width + x] = ((x + y + z) * 3) % 256;
        }
      }
    }
    return {
      width,
      height,
      depth,
      data,
      texture: {} as THREE.Data3DTexture,
      aspect: [1, 1, 0.5],
      spacing: [0.5, 0.5, 2.5], // slice thickness is 5x pixel spacing
      minVal: 0,
      maxVal: 255,
    };
  }

  it('computes proportional MPR plane dimensions preserving aspect ratio', () => {
    const volume = createTestVolume(64, 64, 20);
    const dims = computeMprPlaneDimensions(volume);

    // dx = 0.5, dy = 0.5, dz = 2.5 => ref = 0.5
    // coronalW = 64 * 0.5 / 0.5 = 64
    // coronalH = 20 * 2.5 / 0.5 = 100
    expect(dims.axialW).toBe(64);
    expect(dims.axialH).toBe(64);
    expect(dims.coronalW).toBe(64);
    expect(dims.coronalH).toBe(100);
    expect(dims.sagittalW).toBe(64);
    expect(dims.sagittalH).toBe(100);
  });

  it('extracts axial slice image with valid RGBA data', () => {
    const volume = createTestVolume(32, 32, 10);
    const slice = extractAxialSlice(volume, 5);
    expect(slice.width).toBe(32);
    expect(slice.height).toBe(32);
    expect(slice.rgbaData.length).toBe(32 * 32 * 4);
    // Alpha channel must be 255
    expect(slice.rgbaData[3]).toBe(255);
  });

  it('extracts coronal slice with anatomical square-pixel resampling', () => {
    const volume = createTestVolume(32, 32, 10);
    const slice = extractCoronalSlice(volume, 16);
    expect(slice.width).toBeGreaterThan(0);
    expect(slice.height).toBeGreaterThan(0);
    expect(slice.rgbaData.length).toBe(slice.width * slice.height * 4);
    expect(slice.rgbaData[3]).toBe(255);
  });

  it('extracts sagittal slice with anatomical square-pixel resampling', () => {
    const volume = createTestVolume(32, 32, 10);
    const slice = extractSagittalSlice(volume, 16);
    expect(slice.width).toBeGreaterThan(0);
    expect(slice.height).toBeGreaterThan(0);
    expect(slice.rgbaData.length).toBe(slice.width * slice.height * 4);
    expect(slice.rgbaData[3]).toBe(255);
  });
});
