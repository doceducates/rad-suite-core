import { describe, it, expect } from 'vitest';
import { getAutoWlForSeries, CLINICAL_WL_PRESETS } from '../dicom-wl-presets.service';

describe('dicom-wl-presets.service', () => {
  it('correctly maps CT bone algorithms', () => {
    const res = getAutoWlForSeries({ seriesDescription: 'Axial Bone Algorithm', modality: 'CT' });
    expect(res.presetKey).toBe('bone');
    expect(res.ww).toBe(2000);
    expect(res.wc).toBe(400);
  });

  it('correctly maps CT spine algorithms', () => {
    const res = getAutoWlForSeries({ seriesDescription: 'Axial Spine Recon', modality: 'CT' });
    expect(res.presetKey).toBe('spine');
    expect(res.ww).toBe(1800);
    expect(res.wc).toBe(350);
  });

  it('correctly maps CT lung windows', () => {
    const res = getAutoWlForSeries({ seriesDescription: 'Chest Thorax 1.5mm', modality: 'CT' });
    expect(res.presetKey).toBe('lung');
    expect(res.ww).toBe(1500);
    expect(res.wc).toBe(-600);
  });

  it('correctly maps CT stroke and brain', () => {
    const stroke = getAutoWlForSeries({ seriesDescription: 'Acute Stroke Protocol', modality: 'CT' });
    expect(stroke.presetKey).toBe('stroke');
    expect(stroke.ww).toBe(30);
    expect(stroke.wc).toBe(30);

    const brain = getAutoWlForSeries({ seriesDescription: 'Brain Parenchyma 5mm', modality: 'CT' });
    expect(brain.presetKey).toBe('brain');
    expect(brain.ww).toBe(80);
    expect(brain.wc).toBe(40);
  });

  it('correctly maps MRI sequences (T1, T2, FLAIR, STIR, DWI)', () => {
    const t1 = getAutoWlForSeries({ seriesDescription: 'Sagittal T1 SE', modality: 'MRI' });
    expect(t1.presetKey).toBe('mriT1');
    expect(t1.ww).toBe(600);

    const t2 = getAutoWlForSeries({ seriesDescription: 'Axial T2 FRFSE', modality: 'MR' });
    expect(t2.presetKey).toBe('mriT2');
    expect(t2.ww).toBe(1000);

    const flair = getAutoWlForSeries({ seriesDescription: 'Coronal FLAIR', modality: 'MR' });
    expect(flair.presetKey).toBe('mriFlair');

    const stir = getAutoWlForSeries({ seriesDescription: 'Coronal STIR Fat-Sat', modality: 'MR' });
    expect(stir.presetKey).toBe('mriStir');

    const dwi = getAutoWlForSeries({ seriesDescription: 'Axial DWI b1000', modality: 'MR' });
    expect(dwi.presetKey).toBe('mriDwi');
  });

  it('falls back to header values if custom and valid', () => {
    const res = getAutoWlForSeries({
      seriesDescription: 'Unspecified Scan',
      modality: 'CT',
      headerWw: 420,
      headerWc: 60,
    });
    expect(res.presetKey).toBe('custom');
    expect(res.ww).toBe(420);
    expect(res.wc).toBe(60);
  });

  it('falls back to default soft tissue if no info given', () => {
    const res = getAutoWlForSeries({ modality: 'CT' });
    expect(res.presetKey).toBe('soft');
    expect(res.ww).toBe(400);
    expect(res.wc).toBe(40);
  });
});
