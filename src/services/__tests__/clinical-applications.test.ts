import { describe, it, expect } from 'vitest';
import {
  CLINICAL_APPLICATIONS,
  getApplicationsForModality,
  resolveStudyDefaultApp,
} from '../clinical-applications.service';

describe('Vitrea Clinical Applications Catalog & Dispatcher', () => {
  it('contains complete clinical application suite across CT, MR, XA, and PET', () => {
    expect(CLINICAL_APPLICATIONS.length).toBeGreaterThanOrEqual(15);
    const ctApps = CLINICAL_APPLICATIONS.filter((a) => a.modality === 'CT');
    const mrApps = CLINICAL_APPLICATIONS.filter((a) => a.modality === 'MR');
    const coreApps = CLINICAL_APPLICATIONS.filter((a) => a.modality === 'ALL');

    expect(ctApps.length).toBeGreaterThanOrEqual(6);
    expect(mrApps.length).toBeGreaterThanOrEqual(5);
    expect(coreApps.length).toBeGreaterThanOrEqual(2);
  });

  it('filters applications by modality correctly', () => {
    const mrApps = getApplicationsForModality('MR');
    expect(mrApps.some((a) => a.id === 'mr_msk')).toBe(true);
    expect(mrApps.some((a) => a.id === 'vitrea_3d_mpr')).toBe(true);
    expect(mrApps.some((a) => a.id === 'ct_lung')).toBe(false);

    const ctApps = getApplicationsForModality('CT');
    expect(ctApps.some((a) => a.id === 'ct_lung')).toBe(true);
    expect(ctApps.some((a) => a.id === 'ct_stroke')).toBe(true);
    expect(ctApps.some((a) => a.id === 'mr_msk')).toBe(false);
  });

  it('auto-resolves MR Musculoskeletal for spine studies like Ayesha Usman', () => {
    const app = resolveStudyDefaultApp({
      modality: 'MR',
      studyDescription: 'MRI L/S Spine',
      bodyPartExamined: 'LSPINE',
      seriesCount: 11,
    });

    expect(app.id).toBe('mr_msk');
    expect(app.displayName).toBe('MR Spine & Joints');
    expect(app.layout).toEqual({ rows: 2, cols: 2 });
  });

  it('auto-resolves CTLungAnalysis for thoracic CT studies', () => {
    const app = resolveStudyDefaultApp({
      modality: 'CT',
      studyDescription: 'CT Thorax / Chest with Contrast',
      bodyPartExamined: 'CHEST',
    });

    expect(app.id).toBe('ct_lung');
    expect(app.displayName).toBe('CT Lung & Thorax');
  });

  it('auto-resolves CTBrainStroke for emergency neuro CT studies', () => {
    const app = resolveStudyDefaultApp({
      modality: 'CT',
      studyDescription: 'NCCT Head Stroke Protocol',
      bodyPartExamined: 'BRAIN',
    });

    expect(app.id).toBe('ct_stroke');
  });

  it('auto-resolves MultiModalityViewer for multi-sequence MR without specific body part', () => {
    const app = resolveStudyDefaultApp({
      modality: 'MR',
      seriesCount: 4,
    });

    expect(app.id).toBe('mr_mmv');
    expect(app.layout).toEqual({ rows: 2, cols: 2 });
  });
});
