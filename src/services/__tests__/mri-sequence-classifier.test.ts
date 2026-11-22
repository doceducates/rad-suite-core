import { describe, it, expect } from 'vitest';
import {
  classifyMrSequence,
  calculateMrAdaptiveWindow,
  MR_SEQUENCE_RULES,
} from '../mri-sequence-classifier.service';
import {
  VITREA_CT_PRESETS,
  getMrRelativePresets,
  getAutoWlForSeries,
} from '../dicom-wl-presets.service';

describe('Vitrea Medical Imaging Standards: W/L Presets & MRI Sequence Classifier', () => {
  describe('1. CT Fixed Presets (Hounsfield Units: WC / WW)', () => {
    it('matches official Vitrea CT presets exactly', () => {
      // 1. Soft Tissue (40 / 400)
      expect(VITREA_CT_PRESETS.soft.wc).toBe(40);
      expect(VITREA_CT_PRESETS.soft.ww).toBe(400);

      // 2. Lung (-600 / 1500)
      expect(VITREA_CT_PRESETS.lung.wc).toBe(-600);
      expect(VITREA_CT_PRESETS.lung.ww).toBe(1500);

      // 3. Bone (400 / 2000)
      expect(VITREA_CT_PRESETS.bone.wc).toBe(400);
      expect(VITREA_CT_PRESETS.bone.ww).toBe(2000);

      // 4. Brain (40 / 80)
      expect(VITREA_CT_PRESETS.brain.wc).toBe(40);
      expect(VITREA_CT_PRESETS.brain.ww).toBe(80);

      // 5. Stroke / Ischemia (30 / 30)
      expect(VITREA_CT_PRESETS.stroke.wc).toBe(30);
      expect(VITREA_CT_PRESETS.stroke.ww).toBe(30);

      // 6. Subdural / Blood (75 / 200)
      expect(VITREA_CT_PRESETS.subdural.wc).toBe(75);
      expect(VITREA_CT_PRESETS.subdural.ww).toBe(200);

      // 7. Liver (30 / 150)
      expect(VITREA_CT_PRESETS.liver.wc).toBe(30);
      expect(VITREA_CT_PRESETS.liver.ww).toBe(150);

      // 8. Angio / Contrast (150 / 600)
      expect(VITREA_CT_PRESETS.angio.wc).toBe(150);
      expect(VITREA_CT_PRESETS.angio.ww).toBe(600);

      // 9. Mediastinum (50 / 350)
      expect(VITREA_CT_PRESETS.mediastinum.wc).toBe(50);
      expect(VITREA_CT_PRESETS.mediastinum.ww).toBe(350);

      // 10. Spine / Osteo (350 / 1800)
      expect(VITREA_CT_PRESETS.spine.wc).toBe(350);
      expect(VITREA_CT_PRESETS.spine.ww).toBe(1800);

      // 11. Temporal Bone (700 / 4000)
      expect(VITREA_CT_PRESETS.temporal_bone.wc).toBe(700);
      expect(VITREA_CT_PRESETS.temporal_bone.ww).toBe(4000);
    });

    it('correctly maps CT series descriptions to specialized presets', () => {
      expect(getAutoWlForSeries({ modality: 'CT', seriesDescription: 'CT Petrous Bone HighRes' }).presetKey).toBe('temporal_bone');
      expect(getAutoWlForSeries({ modality: 'CT', seriesDescription: 'CT Lumbar Spine Osteo Recon' }).presetKey).toBe('spine');
      expect(getAutoWlForSeries({ modality: 'CT', seriesDescription: 'NCCT Head Acute Stroke' }).presetKey).toBe('stroke');
      expect(getAutoWlForSeries({ modality: 'CT', seriesDescription: 'CT Chest HRCT Lung Window' }).presetKey).toBe('lung');
      expect(getAutoWlForSeries({ modality: 'CT', seriesDescription: 'CTA Circle of Willis' }).presetKey).toBe('angio');
      expect(getAutoWlForSeries({ modality: 'CT', seriesDescription: 'CT Triphasic Liver' }).presetKey).toBe('liver');
    });
  });

  describe('2. MRI Sequence Classification Specification', () => {
    it('classifies STIR and TIRM sequences by text or inversion time (TI 100-250 ms)', () => {
      expect(classifyMrSequence({ seriesDescription: 'SAG T2 STIR' })).toBe('STIR');
      expect(classifyMrSequence({ seriesDescription: 'COR TIRM' })).toBe('STIR');
      expect(classifyMrSequence({ seriesDescription: 'COR T2', inversionTime: 160 })).toBe('STIR');
      expect(classifyMrSequence({ seriesDescription: 'Spine Recon', inversionTime: 220 })).toBe('STIR');
    });

    it('classifies FLAIR sequences by text or long inversion time (TI > 1500 ms)', () => {
      expect(classifyMrSequence({ seriesDescription: 'AXIAL FLAIR BRAIN' })).toBe('FLAIR');
      expect(classifyMrSequence({ seriesDescription: 'Axial T2 Brain', inversionTime: 2200 })).toBe('FLAIR');
    });

    it('classifies DWI and ADC diffusion sequences', () => {
      expect(classifyMrSequence({ seriesDescription: 'AXIAL DWI B1000' })).toBe('DWI');
      expect(classifyMrSequence({ seriesDescription: 'DIFFUSION TRACE' })).toBe('DWI');
      expect(classifyMrSequence({ seriesDescription: 'ADC MAP' })).toBe('ADC');
      expect(classifyMrSequence({ seriesDescription: 'DIFFUSION COEFFICIENT' })).toBe('ADC');
    });

    it('uses strict word boundary for Fat Saturation and NEVER misclassifies Fast Spin Echo (FSE/FRFSE)', () => {
      // Must be classified as standard T2, NOT T2_FS!
      expect(classifyMrSequence({ seriesDescription: 'SAG FSE T2' })).toBe('T2');
      expect(classifyMrSequence({ seriesDescription: 'AXIAL FRFSE T2' })).toBe('T2');
      expect(classifyMrSequence({ seriesDescription: 'COR TSE T2' })).toBe('T2');

      // Genuine Fat Saturation indicators
      expect(classifyMrSequence({ seriesDescription: 'SAG T2 FS' })).toBe('T2_FS');
      expect(classifyMrSequence({ seriesDescription: 'AXIAL T2 FAT SAT' })).toBe('T2_FS');
      expect(classifyMrSequence({ seriesDescription: 'COR T2 SPAIR' })).toBe('T2_FS');
      expect(classifyMrSequence({ seriesDescription: 'SAG T2 SPIR' })).toBe('T2_FS');

      // Proton Density Fat Sat
      expect(classifyMrSequence({ seriesDescription: 'COR PD FS' })).toBe('PDFS');
      expect(classifyMrSequence({ seriesDescription: 'SAG PDFS KNEE' })).toBe('PDFS');
      expect(classifyMrSequence({ seriesDescription: 'COR PD FAT SAT' })).toBe('PDFS');

      // T1 Fat Sat
      expect(classifyMrSequence({ seriesDescription: 'AX T1 FS POST' })).toBe('T1_FS');
      expect(classifyMrSequence({ seriesDescription: 'SAG T1 FAT SAT' })).toBe('T1_FS');
    });

    it('classifies GRE, SWI, and magnetic susceptibility sequences', () => {
      expect(classifyMrSequence({ seriesDescription: 'AXIAL SWI' })).toBe('GRE');
      expect(classifyMrSequence({ seriesDescription: 'AX T2* GRE' })).toBe('GRE');
      expect(classifyMrSequence({ seriesDescription: 'HEMO PROTOCOL' })).toBe('GRE');
      expect(classifyMrSequence({ seriesDescription: 'CISS 3D' })).toBe('GRE');
    });

    it('classifies standard spin-echo T1 and T2 by acquisition timings (TR / TE)', () => {
      // T1: TR < 800 and TE < 30
      expect(classifyMrSequence({ seriesDescription: 'AXIAL SPINE', repetitionTime: 500, echoTime: 12 })).toBe('T1');
      // T2: TR > 1800 and TE >= 70
      expect(classifyMrSequence({ seriesDescription: 'AXIAL SPINE', repetitionTime: 3500, echoTime: 105 })).toBe('T2');
    });
  });

  describe('3. Adaptive Dynamic Range & Fluid Preservation (STIR / T2_FS / DWI)', () => {
    it('expands dynamic range to p99.8 and full sensor ceiling for STIR without blowing out fluid', () => {
      // Create synthetic 14-bit STIR histogram: 88% background/suppressed fat, 12% high-signal pathology (edema up to 14000)
      const data = new Uint16Array(10000);
      for (let i = 0; i < 8800; i++) {
        data[i] = Math.round(Math.random() * 1500); // Suppressed fat/background
      }
      for (let i = 8800; i < 10000; i++) {
        data[i] = Math.round(5000 + Math.random() * 9000); // Hyperintense fluid / marrow edema (up to 14000)
      }

      const res = calculateMrAdaptiveWindow(data, 'STIR');

      // If generic p88 were applied, win_hi would clamp around ~1500, blowing out all edema.
      // With Vitrea standard: win_hi must reach near dataMax (~14000)
      expect(res.ww).toBeGreaterThan(8000);
      expect(res.wc).toBeGreaterThan(4500);
      expect(res.dataMax).toBeGreaterThanOrEqual(13500);
    });

    it('clamps upper percentile for T1 anatomical detail to p96 without dynamic range over-expansion', () => {
      const data = new Uint16Array(5000);
      for (let i = 0; i < 5000; i++) {
        data[i] = Math.round(100 + Math.random() * 2000);
      }

      const res = calculateMrAdaptiveWindow(data, 'T1');
      expect(res.ww).toBeLessThan(2500);
    });

    it('generates full suite of 10 sequence-relative presets for MR', () => {
      const presets = getMrRelativePresets(500, 1000, 4000, 'T2');
      expect(presets.length).toBe(10);

      const names = presets.map((p) => p.name);
      expect(names).toContain('Clinical Auto (T2)');
      expect(names).toContain('STIR / Fluid Highlight');
      expect(names).toContain('FLAIR Edema / Brain');
      expect(names).toContain('DWI / Acute Restriction');
      expect(names).toContain('ADC Diffusivity Map');
      expect(names).toContain('T2 CSF / Spine High Contrast');
      expect(names).toContain('T1 Spine / Anatomy Detail');
      expect(names).toContain('PDFS / Joint & Cartilage');
      expect(names).toContain('GRE / SWI Bleed & Mineral');
      expect(names).toContain('Full Stored Range');

      // Verify STIR / Fluid Highlight scales with dataMax
      const stir = presets.find((p) => p.name === 'STIR / Fluid Highlight')!;
      expect(stir.wc).toBe(2000); // 4000 * 0.50
      expect(stir.ww).toBe(4000); // 4000
    });
  });
});
