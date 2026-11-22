import { describe, it, expect } from 'vitest';
import { calculateHu, classifyTissue, samplePixelValue, calculateLineHuStats } from '../dicom-hu.service';

describe('Clinical Hounsfield Unit (HU) Calculation & Classification', () => {
  it('accurately computes HU from raw pixel, slope, and intercept', () => {
    // CT typical: raw=1024, slope=1, intercept=-1024 -> water (0 HU)
    expect(calculateHu(1024, 1, -1024)).toBe(0);

    // Air: raw=24, slope=1, intercept=-1024 -> -1000 HU
    expect(calculateHu(24, 1, -1024)).toBe(-1000);

    // Bone: raw=2024, slope=1, intercept=-1024 -> +1000 HU
    expect(calculateHu(2024, 1, -1024)).toBe(1000);
  });

  it('correctly classifies human tissue types according to Radiopaedia reference thresholds', () => {
    expect(classifyTissue(-1000).category).toBe('air');
    expect(classifyTissue(-700).category).toBe('lung');
    expect(classifyTissue(-90).category).toBe('fat');
    expect(classifyTissue(0).category).toBe('fluid');
    expect(classifyTissue(38).category).toBe('soft');
    expect(classifyTissue(65).category).toBe('blood');
    expect(classifyTissue(200).category).toBe('contrast');
    expect(classifyTissue(900).category).toBe('bone');
  });

  it('identifies MRI modality and reports signal intensity rather than HU', () => {
    const res = classifyTissue(450, 'MR');
    expect(res.label).toContain('MRI Signal Intensity');
  });

  it('samples pixel values and maps canvas coordinates to matrix indices', () => {
    const columns = 4;
    const rows = 4;
    const pixelData = new Int16Array([
      0, 100, 200, 300,
      400, 500, 600, 700,
      800, 900, 1000, 1100,
      1200, 1300, 1400, 1500,
    ]);

    // Center of canvas: (50, 50) on 100x100 canvas -> pixel (2, 2) = 1000
    const sample = samplePixelValue(50, 50, 100, 100, pixelData, columns, rows, 1, -1000, 'CT');
    expect(sample).not.toBeNull();
    expect(sample?.px).toBe(2);
    expect(sample?.py).toBe(2);
    expect(sample?.raw).toBe(1000);
    expect(sample?.hu).toBe(0); // 1000 - 1000 = 0 (water)
    expect(sample?.tissue.category).toBe('fluid');
  });

  it('computes line HU statistics along measurement paths', () => {
    const columns = 10;
    const rows = 10;
    const pixelData = new Int16Array(100).fill(50); // all raw=50 -> HU = 50 - 1024 = -974 (air/lung)

    const stats = calculateLineHuStats(0, 0, 9, 9, pixelData, columns, rows, 1, 0);
    expect(stats).not.toBeNull();
    expect(stats?.min).toBe(50);
    expect(stats?.max).toBe(50);
    expect(stats?.mean).toBe(50);
  });
});
