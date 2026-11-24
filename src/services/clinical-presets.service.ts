/**
 * Vitrea / Voxen Clinical Modality & Sequence Window/Level Presets (<300 lines).
 * Standardized CT presets, sequence-adaptive MRI auto-windowing, and CR/DX X-Ray presets.
 */

export interface ClinicalPreset {
  id: string;
  name: string;
  modality: 'CT' | 'MR' | 'CR' | 'DX' | 'ALL';
  wc: number;
  ww: number;
  description: string;
  badge?: string;
  isAuto?: boolean;
}

export const VITREA_CT_PRESETS: ClinicalPreset[] = [
  { id: 'ct_soft_tissue', name: 'Soft Tissue', modality: 'CT', wc: 40, ww: 400, description: 'General abdomen, pelvis, chest, and soft tissue anatomy', badge: 'Standard' },
  { id: 'ct_lung', name: 'Lung', modality: 'CT', wc: -600, ww: 1500, description: 'Pulmonary parenchyma, nodule screening, infiltrates', badge: 'Thoracic' },
  { id: 'ct_bone', name: 'Bone', modality: 'CT', wc: 400, ww: 2000, description: 'Cortical bone, acute fractures, trabecular detail', badge: 'Skeletal' },
  { id: 'ct_brain', name: 'Brain', modality: 'CT', wc: 40, ww: 80, description: 'Gray/white matter differentiation, cerebral edema', badge: 'Neuro' },
  { id: 'ct_stroke', name: 'Stroke / Ischemia', modality: 'CT', wc: 30, ww: 30, description: 'Hyperacute infarction, loss of insular ribbon', badge: 'Neuro' },
  { id: 'ct_subdural', name: 'Subdural / Blood', modality: 'CT', wc: 75, ww: 200, description: 'Subdural/epidural hematoma, subarachnoid blood', badge: 'Neuro' },
  { id: 'ct_liver', name: 'Liver', modality: 'CT', wc: 30, ww: 150, description: 'Hepatic metastasis, steatosis, focal nodular lesions', badge: 'Abdomen' },
  { id: 'ct_angio', name: 'Angio / Contrast', modality: 'CT', wc: 150, ww: 600, description: 'Arterial phase enhancement, aneurysm, dissection', badge: 'Vascular' },
  { id: 'ct_mediastinum', name: 'Mediastinum', modality: 'CT', wc: 50, ww: 350, description: 'Hilar lymph nodes, great vessels, cardiac borders', badge: 'Thoracic' },
  { id: 'ct_spine', name: 'Spine / Osteo', modality: 'CT', wc: 350, ww: 1800, description: 'Spinal trauma, posterior elements, canal stenosis', badge: 'Skeletal' },
  { id: 'ct_temporal_bone', name: 'Temporal Bone', modality: 'CT', wc: 700, ww: 4000, description: 'Ossicular chain, mastoid air cells, petrous apex', badge: 'ENT' },
];

export const VITREA_XRAY_PRESETS: ClinicalPreset[] = [
  { id: 'xr_chest', name: 'Chest Standard', modality: 'CR', wc: 2048, ww: 4096, description: 'Cardiothoracic structures, pulmonary vasculature', badge: 'Chest' },
  { id: 'xr_bone', name: 'Bone / Extremity', modality: 'CR', wc: 2400, ww: 3200, description: 'High contrast cortical detail, trabeculae, fractures', badge: 'Skeletal' },
  { id: 'xr_soft', name: 'Soft Tissue', modality: 'CR', wc: 1600, ww: 2800, description: 'Subcutaneous air, fat planes, foreign bodies', badge: 'Soft' },
];

export interface DicomSequenceMeta {
  seriesDescription?: string;
  protocolName?: string;
  sequenceName?: string;
  modality?: string;
  inversionTime?: number;
  repetitionTime?: number;
  echoTime?: number;
  bodyPartExamined?: string;
  headerWc?: number;
  headerWw?: number;
}

/**
 * Classifies an MRI sequence from DICOM metadata and acquisition timing.
 */
export function classifyMrSequence(meta: DicomSequenceMeta = {}): string {
  const desc = String(meta.seriesDescription || '').toUpperCase();
  const proto = String(meta.protocolName || '').toUpperCase();
  const seq = String(meta.sequenceName || '').toUpperCase();
  const text = `${desc} ${proto} ${seq}`;

  const ti = meta.inversionTime ? Number(meta.inversionTime) : undefined;
  const tr = meta.repetitionTime ? Number(meta.repetitionTime) : undefined;
  const te = meta.echoTime ? Number(meta.echoTime) : undefined;

  if (/\b(STIR|TIRM|IR\s*FSE)\b/.test(text) || (ti && ti >= 100 && ti <= 250)) return 'STIR';
  if (/\b(FLAIR|DARK\s*FLUID)\b/.test(text) || (ti && ti > 1500)) return 'FLAIR';
  if ((/\b(E?ADC|DIFFUSION\s*COEFF|ADC_MAP)\b/.test(text) || text.includes('ADC')) && !text.includes('EXP_ADC')) return 'ADC';
  if (/\b(DWI|DIFF|TRACE|B1000|B800|B500|EXP_ADC|DTI)\b/.test(text)) return 'DWI';
  if (/\b(FS|FAT\s*SAT|SPAIR|SPIR)\b/.test(text)) {
    if (text.includes('PD')) return 'PDFS';
    if (text.includes('T1')) return 'T1_FS';
    return 'T2_FS';
  }
  if (/\b(GRE|SWI|T2\*|HEMO|MERGE|CISS|FIESTA|FISP|FLASH|MEDIC)\b/.test(text)) return 'GRE';
  if (/\bPD\b/.test(text) || (tr && te && tr > 1800 && te < 40)) return 'PD';
  if (/\bT1\b/.test(text) || (tr && te && tr < 800 && te < 30)) return 'T1';
  if (/\bT2\b/.test(text) || (tr && te && tr > 1800 && te >= 70)) return 'T2';
  return 'MR_GENERIC';
}

/**
 * High-speed sub-millisecond adaptive window computation from raw MRI pixel data.
 */
export function computeAdaptiveMrWindow(
  pixelData: ArrayLike<number>,
  meta: DicomSequenceMeta = {}
): { wc: number; ww: number; seq: string; maxVal: number } {
  const seq = classifyMrSequence(meta);
  const len = pixelData.length;
  if (!len) return { wc: 450, ww: 800, seq, maxVal: 1000 };

  // Sample up to 4096 voxels evenly across the slice with odd stride to avoid periodic aliasing
  const stride = Math.max(1, (Math.floor(len / 4096) | 1));
  let minVal = Infinity;
  let maxVal = -Infinity;
  const samples: number[] = [];

  for (let i = 0; i < len; i += stride) {
    const val = pixelData[i];
    if (val < minVal) minVal = val;
    if (val > maxVal) maxVal = val;
    samples.push(val);
  }

  if (maxVal - minVal < 1e-3) return { wc: minVal, ww: 1, seq, maxVal };

  // Filter background air floor (lowest 2.5% of dynamic range)
  const floor = minVal + 0.025 * (maxVal - minVal);
  const body = samples.filter((v) => v > floor);
  const data = body.length >= 200 ? body : samples;
  data.sort((a, b) => a - b);

  const getPercentile = (p: number) => data[Math.min(data.length - 1, Math.floor((p / 100) * data.length))];
  const p2 = getPercentile(2.0);
  let winHi = getPercentile(93.0);

  if (seq === 'STIR' || seq === 'T2_FS') winHi = getPercentile(92.5);
  else if (seq === 'T2') winHi = getPercentile(92.0);
  else if (seq === 'T1' || seq === 'T1_FS') winHi = getPercentile(94.0);
  else if (seq === 'FLAIR' || seq === 'PDFS' || seq === 'PD') winHi = getPercentile(93.5);
  else if (seq === 'DWI') winHi = getPercentile(94.0);
  else if (seq === 'ADC') winHi = getPercentile(98.0);
  else if (seq === 'GRE') winHi = getPercentile(95.0);

  const winLo = Math.max(minVal, p2);
  const ww = Math.max(50, Math.round(winHi - winLo));
  const wc = Math.round((winHi + winLo) / 2);
  return { wc, ww, seq, maxVal };
}

/**
 * Returns complete clinical presets for a series, dynamically calibrated for MRI.
 */
export function getPresetsForSeries(
  meta: DicomSequenceMeta = {},
  pixelData?: ArrayLike<number>
): ClinicalPreset[] {
  const mod = String(meta.modality || 'CT').toUpperCase();

  if (mod === 'CR' || mod === 'DX') return VITREA_XRAY_PRESETS;
  if (mod !== 'MR' && mod !== 'MRI') return VITREA_CT_PRESETS;

  // MRI Modality — Derive calibrated values from pixel buffer or sequence defaults
  const auto = pixelData && pixelData.length > 0
    ? computeAdaptiveMrWindow(pixelData, meta)
    : { wc: 4000, ww: 8000, seq: classifyMrSequence(meta), maxVal: 16383 };

  const seq = auto.seq;
  const max = Math.max(100, auto.maxVal);
  const baseWc = auto.wc;
  const baseWw = auto.ww;

  const mriPresets: ClinicalPreset[] = [
    {
      id: `mr_auto_${seq.toLowerCase()}`,
      name: `Auto ${seq}`,
      modality: 'MR',
      wc: baseWc,
      ww: baseWw,
      description: `Adaptive percentile auto-window derived from ${seq} tissue statistics`,
      badge: 'Auto',
      isAuto: true,
    },
    {
      id: 'mr_t2_spine',
      name: 'T2 Spine / High Contrast',
      modality: 'MR',
      wc: Math.round(baseWc * 0.9),
      ww: Math.max(50, Math.round(baseWw * 0.85)),
      description: 'Crisp spinal cord and thecal sac delineation with CSF contrast',
      badge: 'T2',
    },
    {
      id: 'mr_t1_anatomy',
      name: 'T1 Spine / Anatomy',
      modality: 'MR',
      wc: Math.round(baseWc * 0.65),
      ww: Math.max(50, Math.round(baseWw * 0.65)),
      description: 'Vertebral marrow trabeculae, disc contours, epidural fat',
      badge: 'T1',
    },
    {
      id: 'mr_stir_fluid',
      name: 'STIR / Fluid Highlight',
      modality: 'MR',
      wc: Math.round(baseWc * 1.05),
      ww: Math.max(50, Math.round(baseWw * 1.15)),
      description: 'Tissue-adaptive STIR contrast preserving bone marrow edema and fluid',
      badge: 'STIR',
    },
    {
      id: 'mr_flair',
      name: 'FLAIR Brain Edema',
      modality: 'MR',
      wc: Math.round(max * 0.28),
      ww: Math.max(50, Math.round(max * 0.55)),
      description: 'Suppresses free CSF to reveal periventricular lesions and plaques',
      badge: 'FLAIR',
    },
    {
      id: 'mr_dwi',
      name: 'DWI / Acute Stroke',
      modality: 'MR',
      wc: Math.round(max * 0.22),
      ww: Math.max(50, Math.round(max * 0.40)),
      description: 'Restricted diffusion in acute cerebral ischemia',
      badge: 'DWI',
    },
    {
      id: 'mr_adc',
      name: 'ADC Diffusivity Map',
      modality: 'MR',
      wc: Math.round(max * 0.15),
      ww: Math.max(50, Math.round(max * 0.30)),
      description: 'Quantitative grayscale spread for ADC hypointensity confirmation',
      badge: 'ADC',
    },
    {
      id: 'mr_pdfs',
      name: 'PDFS / Cartilage',
      modality: 'MR',
      wc: Math.round(max * 0.35),
      ww: Math.max(50, Math.round(max * 0.65)),
      description: 'Optimized joint chondral margin and tendon tear high-contrast depiction',
      badge: 'PDFS',
    },
    {
      id: 'mr_gre',
      name: 'GRE / SWI Bleed & Mineral',
      modality: 'MR',
      wc: Math.round(baseWc * 0.75),
      ww: Math.max(50, Math.round(baseWw * 0.70)),
      description: 'Susceptibility effect enhancement for hemorrhage, hemosiderin, and calcium',
      badge: 'GRE',
    },
    {
      id: 'mr_full_range',
      name: 'Full Stored Range',
      modality: 'MR',
      wc: Math.round(max * 0.5),
      ww: Math.max(50, Math.round(max)),
      description: 'Unclipped zero-to-maximum sensor data span',
      badge: 'Raw',
    },
  ];

  if (meta.headerWc && meta.headerWw && meta.headerWw > 1 && meta.headerWw < 8191) {
    mriPresets.unshift({
      id: 'mr_header_calibrated',
      name: 'Calibrated DICOM',
      modality: 'MR',
      wc: Math.round(meta.headerWc),
      ww: Math.round(meta.headerWw),
      description: 'Window settings embedded directly in DICOM header by scanner',
      badge: 'DICOM',
    });
  }

  return mriPresets;
}

export function getPresetsForModality(modality: string): ClinicalPreset[] {
  const mod = modality.toUpperCase();
  if (mod === 'MR' || mod === 'MRI') return getPresetsForSeries({ modality: 'MR' });
  if (mod === 'CR' || mod === 'DX') return VITREA_XRAY_PRESETS;
  return VITREA_CT_PRESETS;
}

export function getSmartDefaultPreset(
  meta: DicomSequenceMeta = {},
  pixelData?: ArrayLike<number>
): ClinicalPreset {
  const presets = getPresetsForSeries(meta, pixelData);
  return presets[0];
}
