// Layer 2 (Domain/Services): Clinical MRI Sequence Classifier & Adaptive Dynamic Range Engine
// Matching Vitrea NextGen Medical Imaging Workstation Specifications (< 250 lines)

export type MrSequenceCode =
  | 'STIR'
  | 'FLAIR'
  | 'DWI'
  | 'ADC'
  | 'PDFS'
  | 'T2_FS'
  | 'T1_FS'
  | 'GRE'
  | 'MRA'
  | 'PD'
  | 'T1'
  | 'T2'
  | 'MR_GENERIC';

export interface MrSequenceMetadata {
  seriesDescription?: string;
  protocolName?: string;
  sequenceName?: string;
  inversionTime?: number; // TI in ms
  repetitionTime?: number; // TR in ms
  echoTime?: number; // TE in ms
  modality?: string;
}

export interface MrSequenceRule {
  code: MrSequenceCode;
  name: string;
  pLo: number;
  pHi: number;
  allowFullDynamicRange?: boolean;
  clinicalUse: string;
}

export const MR_SEQUENCE_RULES: Record<MrSequenceCode, MrSequenceRule> = {
  STIR: {
    code: 'STIR',
    name: 'Short Tau Inversion Recovery',
    pLo: 1.0,
    pHi: 99.8,
    allowFullDynamicRange: true,
    clinicalUse: 'Bone marrow edema, fractures, inflammatory fluid',
  },
  FLAIR: {
    code: 'FLAIR',
    name: 'Fluid-Attenuated Inversion Recovery',
    pLo: 1.0,
    pHi: 99.5,
    clinicalUse: 'Periventricular demyelination, MS plaques, subarachnoid pathology',
  },
  DWI: {
    code: 'DWI',
    name: 'Diffusion Weighted Imaging',
    pLo: 1.0,
    pHi: 99.8,
    allowFullDynamicRange: true,
    clinicalUse: 'Hyperacute ischemia (stroke), abscess, high-cellularity tumor',
  },
  ADC: {
    code: 'ADC',
    name: 'Apparent Diffusion Coefficient',
    pLo: 0.5,
    pHi: 99.0,
    clinicalUse: 'Differentiating true restricted diffusion from T2 shine-through',
  },
  PDFS: {
    code: 'PDFS',
    name: 'Proton Density Fat-Saturated',
    pLo: 1.0,
    pHi: 99.5,
    clinicalUse: 'Articular cartilage, cruciate ligaments, menisci, labrum',
  },
  T2_FS: {
    code: 'T2_FS',
    name: 'T2 Fat-Saturated',
    pLo: 1.0,
    pHi: 99.8,
    allowFullDynamicRange: true,
    clinicalUse: 'Edema, joint effusion, soft-tissue inflammation without fat signal',
  },
  T1_FS: {
    code: 'T1_FS',
    name: 'T1 Fat-Saturated',
    pLo: 1.5,
    pHi: 98.0,
    clinicalUse: 'Contrast-enhanced tumor, infection, subacute hematoma',
  },
  GRE: {
    code: 'GRE',
    name: 'Gradient Recalled Echo / SWI',
    pLo: 1.5,
    pHi: 97.0,
    clinicalUse: 'Microhemorrhages, cavernomas, calcifications, blooming',
  },
  MRA: {
    code: 'MRA',
    name: 'MR Angiography / Flow',
    pLo: 1.0,
    pHi: 99.0,
    clinicalUse: 'Vascular lumen, time-of-flight flow, aneurysm evaluation',
  },
  PD: {
    code: 'PD',
    name: 'Proton Density',
    pLo: 1.5,
    pHi: 98.0,
    clinicalUse: 'Musculoskeletal structures, fibrocartilage, ligaments',
  },
  T1: {
    code: 'T1',
    name: 'T1-Weighted Spin Echo',
    pLo: 2.0,
    pHi: 96.0,
    clinicalUse: 'Anatomical detail, subacute hemorrhage, fat, proteinaceous fluid',
  },
  T2: {
    code: 'T2',
    name: 'T2-Weighted Fast Spin Echo',
    pLo: 1.5,
    pHi: 98.5,
    clinicalUse: 'Pathological fluid, edema, cyst, disk herniation, CSF myelogram',
  },
  MR_GENERIC: {
    code: 'MR_GENERIC',
    name: 'MR General',
    pLo: 2.0,
    pHi: 98.0,
    clinicalUse: 'Standard MR imaging baseline',
  },
};

/**
 * Classifies an MRI sequence from DICOM metadata and acquisition timing.
 * Strict word-boundary regex is enforced so that Fast Spin Echo (FSE/FRFSE/TSE)
 * is never misclassified as Fat-Saturated.
 */
export function classifyMrSequence(meta?: MrSequenceMetadata): MrSequenceCode {
  if (!meta) return 'MR_GENERIC';

  const desc = (meta.seriesDescription || '').toUpperCase();
  const proto = (meta.protocolName || '').toUpperCase();
  const seqName = (meta.sequenceName || '').toUpperCase();
  const text = `${desc} ${proto} ${seqName}`.trim();

  const ti = meta.inversionTime;
  const te = meta.echoTime;
  const tr = meta.repetitionTime;

  // 1. STIR / Inversion Recovery Fat Suppression (TI ~ 100-250 ms)
  if (text.includes('STIR') || text.includes('TIRM') || (ti != null && ti >= 100 && ti <= 250)) {
    return 'STIR';
  }

  // 2. FLAIR (Fluid-Attenuated Inversion Recovery, TI > 1500 ms)
  if (text.includes('FLAIR') || (ti != null && ti > 1500)) {
    return 'FLAIR';
  }

  // 3. DWI / ADC (Diffusion Imaging)
  if (text.includes('ADC') || text.includes('DIFFUSION COEFF')) {
    return 'ADC';
  }
  if (/\b(DWI|DIFF|TRACE|B1000|B800)\b/i.test(text)) {
    return 'DWI';
  }

  // 4. Fat Saturation (strict word boundary to avoid matching FSE/FRFSE)
  const hasFs =
    /\b(FS|FAT\s*SAT|SPAIR|SPIR)\b/i.test(text) ||
    text.includes('PDFS') ||
    text.includes('T2FS') ||
    text.includes('T1FS');
  if (hasFs) {
    if (text.includes('PD')) return 'PDFS';
    if (text.includes('T1')) return 'T1_FS';
    return 'T2_FS';
  }

  // 5. GRE / Susceptibility / Gradient Echo / SWI
  if (/\b(GRE|SWI|T2\*|HEMO|MERGE|CISS|FIESTA)\b/i.test(text)) {
    return 'GRE';
  }

  // 6. MRA / MRV Flow
  if (/\b(MRA|MRV|TOF|ANGIO|FLOW)\b/i.test(text)) {
    return 'MRA';
  }

  // 7. Proton Density
  if (text.includes('PD') || (tr != null && te != null && tr > 1800 && te < 40)) {
    return 'PD';
  }

  // 8. T1 Weighted
  if (text.includes('T1') || (tr != null && te != null && tr < 800 && te < 30)) {
    return 'T1';
  }

  // 9. T2 Weighted
  if (text.includes('T2') || (tr != null && te != null && tr > 1800 && te >= 70)) {
    return 'T2';
  }

  return 'MR_GENERIC';
}

function calculatePercentile(sorted: number[], p: number): number {
  if (sorted.length === 0) return 0;
  const idx = Math.min(sorted.length - 1, Math.max(0, Math.floor((sorted.length - 1) * (p / 100))));
  return sorted[idx];
}

/**
 * Robust clinical window/level derivation matching Vitrea engine/window_presets.py.
 * Sequence-adaptive contrast bounds: expands dynamic range for STIR, T2_FS, and DWI
 * up to the 99.8th percentile or full sensor range (~16384 for 14-bit data).
 * Never clamps at p88, preventing fluid blowout or washed-out pathology.
 */
export function calculateMrAdaptiveWindow(
  pixelData: Int16Array | Uint16Array | Uint8Array,
  seq: MrSequenceCode
): { wc: number; ww: number; dataMin: number; dataMax: number } {
  let min = Infinity;
  let max = -Infinity;

  // Find min and max
  for (let i = 0; i < pixelData.length; i++) {
    const v = pixelData[i];
    if (v < min) min = v;
    if (v > max) max = v;
  }

  if (min === Infinity) {
    min = 0;
    max = 255;
  }

  if (max - min < 1e-6) {
    return { wc: min, ww: 1, dataMin: min, dataMax: max };
  }

  // Sample non-background pixels (> 15) to calculate meaningful histograms
  const step = Math.max(1, Math.floor(pixelData.length / 5000));
  const samples: number[] = [];
  for (let i = 0; i < pixelData.length; i += step) {
    if (pixelData[i] > 15) {
      samples.push(pixelData[i]);
    }
  }

  if (samples.length < 50) {
    const ww = Math.max(50, max - min);
    const wc = Math.round(min + ww / 2);
    return { wc, ww, dataMin: min, dataMax: max };
  }

  samples.sort((a, b) => a - b);
  const rule = MR_SEQUENCE_RULES[seq] || MR_SEQUENCE_RULES.MR_GENERIC;

  let winLo = calculatePercentile(samples, rule.pLo);
  let winHi = calculatePercentile(samples, rule.pHi);

  // For STIR, T2_FS, DWI: expand dynamic range up to full sensor range (never clamp at p88)
  if (rule.allowFullDynamicRange) {
    winLo = Math.max(min, calculatePercentile(samples, 1.0));
    winHi = calculatePercentile(samples, 99.8);
    if (max > winHi && max <= 16384) {
      winHi = Math.max(winHi, max * 0.95);
    }
  }

  if (winHi <= winLo) {
    winHi = calculatePercentile(samples, 95.0);
    winLo = min;
  }

  const ww = Math.max(50, Math.round(winHi - winLo));
  const wc = Math.round((winHi + winLo) / 2);

  return { wc, ww, dataMin: min, dataMax: max };
}
