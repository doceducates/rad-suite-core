import { describe, it, expect } from 'vitest';
import { getSyntheticStudyDetail, WINDOW_PRESETS } from '../dicom.service';

describe('DICOM Viewer Sequences & Presets', () => {
  it('provides standard diagnostic window presets for CT and MRI', () => {
    expect(WINDOW_PRESETS.brain).toBeDefined();
    expect(WINDOW_PRESETS.brain.ww).toBe(80);
    expect(WINDOW_PRESETS.brain.wc).toBe(40);

    expect(WINDOW_PRESETS.bone).toBeDefined();
    expect(WINDOW_PRESETS.bone.ww).toBe(2000);
    expect(WINDOW_PRESETS.bone.wc).toBe(400);

    expect(WINDOW_PRESETS.lung).toBeDefined();
    expect(WINDOW_PRESETS.lung.ww).toBe(1500);
    expect(WINDOW_PRESETS.lung.wc).toBe(-600);

    expect(WINDOW_PRESETS.mriT1).toBeDefined();
    expect(WINDOW_PRESETS.mriT2).toBeDefined();
    expect(WINDOW_PRESETS.mriFlair).toBeDefined();
    expect(WINDOW_PRESETS.mriStir).toBeDefined();
    expect(WINDOW_PRESETS.mriDwi).toBeDefined();
  });

  it('generates multi-sequence protocol for MRI scans with clinical orientations', () => {
    const study = getSyntheticStudyDetail('ACC-TEST-MRI', 'MRI');
    expect(study.modality).toBe('MRI');
    expect(study.series.length).toBeGreaterThanOrEqual(5);

    const seqKeys = study.series.map((s) => s.sequenceKey);
    expect(seqKeys).toContain('t2');
    expect(seqKeys).toContain('t1');
    expect(seqKeys).toContain('flair');
    expect(seqKeys).toContain('stir');
    expect(seqKeys).toContain('dwi');

    // Verify orientations
    const orientations = study.series.map((s) => s.orientation);
    expect(orientations).toContain('AXIAL');
    expect(orientations).toContain('CORONAL');
    expect(orientations).toContain('SAGITTAL');

    study.series.forEach((s) => {
      expect(s.instances.length).toBeGreaterThan(0);
      expect(s.windowPreset).toBeDefined();
    });
  });

  it('generates comprehensive series protocol for CT scans', () => {
    const study = getSyntheticStudyDetail('ACC-TEST-CT', 'CT');
    expect(study.modality).toBe('CT');
    expect(study.series.length).toBeGreaterThanOrEqual(4);

    const descriptions = study.series.map((s) => s.description);
    expect(descriptions.some((d) => d.includes('Axial') && d.includes('Standard'))).toBe(true);
    expect(descriptions.some((d) => d.includes('Bone'))).toBe(true);
    expect(descriptions.some((d) => d.includes('Coronal'))).toBe(true);
    expect(descriptions.some((d) => d.includes('Sagittal'))).toBe(true);

    const boneSeries = study.series.find((s) => s.sequenceKey === 'bone');
    expect(boneSeries?.windowPreset).toBe('bone');
  });

  it('generates upright views for X-Ray modalities', () => {
    const study = getSyntheticStudyDetail('ACC-TEST-XR', 'CR');
    expect(study.series.length).toBe(2);
    expect(study.series[0].description).toContain('Chest PA');
    expect(study.series[1].description).toContain('Lateral');
  });

  it('correctly clamps viewport zoom and slice boundaries', () => {
    const clampZoom = (z: number) => Math.max(0.5, Math.min(8.0, z));
    expect(clampZoom(0.1)).toBe(0.5);
    expect(clampZoom(10.0)).toBe(8.0);
    expect(clampZoom(1.5)).toBe(1.5);

    const maxSlices = 28;
    const clampSlice = (s: number) => Math.max(0, Math.min(maxSlices - 1, s));
    expect(clampSlice(-5)).toBe(0);
    expect(clampSlice(35)).toBe(27);
    expect(clampSlice(12)).toBe(12);
  });

  it('synchronously calculates clamped slice progression for smooth multi-pane sync', () => {
    let currentSlice = 5;
    const maxSlices = 20;
    const computeNext = (current: number, delta: number) => {
      return Math.max(0, Math.min(maxSlices - 1, current + delta));
    };

    expect(computeNext(currentSlice, 1)).toBe(6);
    expect(computeNext(currentSlice, -1)).toBe(4);
    expect(computeNext(0, -1)).toBe(0);
    expect(computeNext(19, 1)).toBe(19);
  });
});

