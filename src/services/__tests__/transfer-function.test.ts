import { describe, it, expect } from 'vitest';
import {
  CLINICAL_FALLBACK_LUTS,
  buildLutTable,
} from '../transfer-function.service';

describe('Transfer Function & LUT Service', () => {
  it('defines clinical fallback presets for bone, abdominal, vessel, and lung', () => {
    expect(CLINICAL_FALLBACK_LUTS).toHaveProperty('abdominal');
    expect(CLINICAL_FALLBACK_LUTS).toHaveProperty('bone');
    expect(CLINICAL_FALLBACK_LUTS).toHaveProperty('vessel');
    expect(CLINICAL_FALLBACK_LUTS).toHaveProperty('lung');
  });

  it('builds a 256-sample RGBA table (1024 bytes) with valid color ranges', () => {
    const table = buildLutTable(CLINICAL_FALLBACK_LUTS.bone, 256);
    expect(table).toBeInstanceOf(Uint8Array);
    expect(table.length).toBe(1024);

    // Initial opacity should be 0 (transparent air)
    expect(table[3]).toBe(0);

    // Peak bone opacity towards the end should be high (> 200)
    expect(table[1023]).toBeGreaterThan(200);
  });

  it('generates smooth monotonic alpha progression for abdominal soft tissue', () => {
    const table = buildLutTable(CLINICAL_FALLBACK_LUTS.abdominal, 256);
    expect(table.length).toBe(1024);

    const a0 = table[3];
    const aMid = table[512 + 3];
    const aEnd = table[1020 + 3];

    expect(a0).toBeLessThanOrEqual(aMid);
    expect(aMid).toBeLessThanOrEqual(aEnd);
  });
});
