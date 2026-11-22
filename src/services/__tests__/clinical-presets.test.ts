import { describe, it, expect } from 'vitest';
import {
  VITREA_CT_PRESETS,
  classifyMrSequence,
  computeAdaptiveMrWindow,
  getPresetsForSeries,
  getSmartDefaultPreset,
} from '../clinical-presets.service';

describe('Vitrea Clinical Presets & Sequence Classification', () => {
  it('contains essential Vitrea CT presets with exact clinical HU ranges', () => {
    const soft = VITREA_CT_PRESETS.find((p) => p.id === 'ct_soft_tissue');
    expect(soft).toBeDefined();
    expect(soft?.wc).toBe(40);
    expect(soft?.ww).toBe(400);

    const lung = VITREA_CT_PRESETS.find((p) => p.id === 'ct_lung');
    expect(lung?.wc).toBe(-600);
    expect(lung?.ww).toBe(1500);

    const bone = VITREA_CT_PRESETS.find((p) => p.id === 'ct_bone');
    expect(bone?.wc).toBe(400);
    expect(bone?.ww).toBe(2000);

    const stroke = VITREA_CT_PRESETS.find((p) => p.id === 'ct_stroke');
    expect(stroke?.wc).toBe(30);
    expect(stroke?.ww).toBe(30);

    const subdural = VITREA_CT_PRESETS.find((p) => p.id === 'ct_subdural');
    expect(subdural?.wc).toBe(75);
    expect(subdural?.ww).toBe(200);
  });

  it('classifies STIR sequences based on inversion time (TI ~ 100-250 ms)', () => {
    expect(classifyMrSequence({ inversionTime: 180, seriesDescription: 'COR TIRM' })).toBe('STIR');
    expect(classifyMrSequence({ seriesDescription: 'SAG STIR SPINE' })).toBe('STIR');
  });

  it('classifies FLAIR sequences based on high inversion time (TI > 1500 ms)', () => {
    expect(classifyMrSequence({ inversionTime: 2200, seriesDescription: 'AX BRAIN' })).toBe('FLAIR');
    expect(classifyMrSequence({ seriesDescription: 'AX FLAIR LONG TR' })).toBe('FLAIR');
  });

  it('classifies DWI and ADC sequences', () => {
    expect(classifyMrSequence({ seriesDescription: 'DIFFUSION B1000' })).toBe('DWI');
    expect(classifyMrSequence({ seriesDescription: 'eADC MAP' })).toBe('ADC');
  });

  it('classifies T1 vs T2 sequences based on TR/TE timing', () => {
    expect(classifyMrSequence({ repetitionTime: 550, echoTime: 15 })).toBe('T1');
    expect(classifyMrSequence({ repetitionTime: 4000, echoTime: 95 })).toBe('T2');
  });

  it('computes sub-millisecond adaptive window for 14-bit MRI data (Ayesha Usman scale)', () => {
    // Generate 512x512 mock 14-bit MRI T2 Spine slice (background air=0..50, marrow=1000..4000, CSF=9000..12000)
    const pixels = new Uint16Array(512 * 512);
    for (let i = 0; i < pixels.length; i++) {
      if (i < 50000) pixels[i] = 20; // background air
      else {
        // pseudo-random realistic gradient signal
        pixels[i] = 500 + ((i * 37) % 11500);
      }
    }

    const res = computeAdaptiveMrWindow(pixels, { seriesDescription: 'SG T2' });
    expect(res.seq).toBe('T2');
    expect(res.ww).toBeGreaterThan(3000);
    expect(res.ww).toBeLessThan(12000);
    expect(res.wc).toBeGreaterThan(1500);
    expect(res.wc).toBeLessThan(8000);
  });

  it('preserves full dynamic range for STIR fat suppression to prevent white blowout', () => {
    const pixels = new Uint16Array(1000);
    for (let i = 0; i < pixels.length; i++) pixels[i] = i * 16; // 0 to 16000
    const res = computeAdaptiveMrWindow(pixels, { seriesDescription: 'SG T2 STIR' });
    expect(res.seq).toBe('STIR');
    expect(res.ww).toBeGreaterThanOrEqual(15000);
    expect(res.wc).toBeGreaterThanOrEqual(7500);
  });

  it('returns dynamically calibrated MRI presets from pixel buffer', () => {
    const pixels = new Uint16Array(1000);
    for (let i = 0; i < pixels.length; i++) pixels[i] = 1000 + i * 5;
    const presets = getPresetsForSeries({ modality: 'MR', seriesDescription: 'SG T2' }, pixels);
    expect(presets.length).toBeGreaterThanOrEqual(6);
    expect(presets[0].id).toBe('mr_auto_t2');
    expect(presets[0].isAuto).toBe(true);
  });
});
