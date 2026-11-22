import { describe, it, expect } from 'vitest';
import { renderDicomPixelsToImageData, ParsedDicomMeta } from '../dicom-loader.service';

describe('DICOM Loader & Caliper Calculations', () => {
  it('correctly calculates millimeter distance from pixel spacing', () => {
    const pixelSpacing = [0.4492, 0.4492]; // e.g. MUSTAFA AX T2
    const dx = 100;
    const dy = 0;
    const distPx = Math.hypot(dx, dy);
    const lengthMm = Number((distPx * pixelSpacing[0]).toFixed(1));

    expect(lengthMm).toBe(44.9);
  });

  it('renders MONOCHROME2 pixels with proper window leveling without inversion', () => {
    const meta: ParsedDicomMeta = {
      patientName: 'TEST_PATIENT',
      patientId: '12345',
      accessionNumber: 'ACC-001',
      modality: 'MR',
      studyDescription: 'Brain MRI',
      rows: 2,
      columns: 2,
      windowWidth: 1000,
      windowCenter: 500,
      rescaleSlope: 1,
      rescaleIntercept: 0,
      bitsAllocated: 16,
      pixelRepresentation: 0,
      photometricInterpretation: 'MONOCHROME2',
      pixelSpacing: [0.5, 0.5],
    };

    // Pixel values: 0 (black/air), 500 (mid-gray), 1000 (white)
    const pixelData = new Uint16Array([0, 500, 1000, 500]);

    // Mock 2D canvas context
    const mockCtx = {
      createImageData: (w: number, h: number) => ({
        width: w,
        height: h,
        data: new Uint8ClampedArray(w * h * 4),
      }),
    } as unknown as CanvasRenderingContext2D;

    const imgData = renderDicomPixelsToImageData(mockCtx, pixelData, meta, 1000, 500, false);

    // Pixel 0 (value 0, low=0) -> intensity = 0 (black)
    expect(imgData.data[0]).toBe(0);
    expect(imgData.data[1]).toBe(0);
    expect(imgData.data[2]).toBe(0);
    expect(imgData.data[3]).toBe(255); // Alpha

    // Pixel 1 (value 500, center) -> intensity = 127.5 -> rounded to 128 in Uint8ClampedArray
    expect(imgData.data[4]).toBe(128);

    // Pixel 2 (value 1000, high=1000) -> intensity = 255 (white)
    expect(imgData.data[8]).toBe(255);
  });

  it('correctly inverts polarity when invert is true', () => {
    const meta: ParsedDicomMeta = {
      patientName: 'TEST_PATIENT',
      patientId: '12345',
      accessionNumber: 'ACC-001',
      modality: 'MR',
      studyDescription: 'Brain MRI',
      rows: 1,
      columns: 2,
      windowWidth: 1000,
      windowCenter: 500,
      rescaleSlope: 1,
      rescaleIntercept: 0,
      bitsAllocated: 16,
      pixelRepresentation: 0,
      photometricInterpretation: 'MONOCHROME2',
      pixelSpacing: [0.5, 0.5],
    };

    const pixelData = new Uint16Array([0, 1000]);
    const mockCtx = {
      createImageData: (w: number, h: number) => ({
        width: w,
        height: h,
        data: new Uint8ClampedArray(w * h * 4),
      }),
    } as unknown as CanvasRenderingContext2D;

    const imgData = renderDicomPixelsToImageData(mockCtx, pixelData, meta, 1000, 500, true);

    // When inverted: raw 0 becomes 255 (white), raw 1000 becomes 0 (black)
    expect(imgData.data[0]).toBe(255);
    expect(imgData.data[4]).toBe(0);
  });
});
