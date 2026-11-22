// Layer 2 (Domain/Services): Pure business logic for DICOM Window/Level calibration
// Matching Vitrea Medical Workstation Standards (< 250 lines)

import {
  classifyMrSequence,
  MrSequenceCode,
  MrSequenceMetadata,
} from './mri-sequence-classifier.service';

export interface DicomWlPreset {
  id: string;
  label: string;
  ww: number;
  wc: number;
  modality: 'CT' | 'MR' | 'CR' | 'DX';
  range?: [number, number];
  clinicalUse?: string;
}

export interface MrRelativePreset {
  name: string;
  wc: number;
  ww: number;
  description: string;
}

/**
 * 1. Official Vitrea CT Fixed Presets (calibrated in Hounsfield Units)
 */
export const VITREA_CT_PRESETS: Record<string, DicomWlPreset> = {
  soft: { id: 'soft', label: 'CT Soft Tissue (40/400)', wc: 40, ww: 400, modality: 'CT', range: [-160, 240], clinicalUse: 'Standard abdominal, pelvic, thoracic, and neck general anatomy.' },
  lung: { id: 'lung', label: 'CT Lung (-600/1500)', wc: -600, ww: 1500, modality: 'CT', range: [-1350, 150], clinicalUse: 'Pulmonary parenchyma, nodule screening, emphysema, infiltrates.' },
  bone: { id: 'bone', label: 'CT Bone (400/2000)', wc: 400, ww: 2000, modality: 'CT', range: [-600, 1400], clinicalUse: 'Cortical bone detail, trabeculae, acute fractures, lytic/sclerotic lesions.' },
  brain: { id: 'brain', label: 'CT Brain (40/80)', wc: 40, ww: 80, modality: 'CT', range: [0, 80], clinicalUse: 'Gray/white matter differentiation, cerebral edema, mass effect.' },
  stroke: { id: 'stroke', label: 'CT Stroke / Ischemia (30/30)', wc: 30, ww: 30, modality: 'CT', range: [15, 45], clinicalUse: 'Hyperacute cerebral infarction, loss of insular ribbon, basal ganglia obscuration.' },
  subdural: { id: 'subdural', label: 'CT Subdural / Blood (75/200)', wc: 75, ww: 200, modality: 'CT', range: [-25, 175], clinicalUse: 'Subdural / epidural hematoma, subarachnoid hemorrhage, blood vs bone.' },
  liver: { id: 'liver', label: 'CT Liver (30/150)', wc: 30, ww: 150, modality: 'CT', range: [-45, 105], clinicalUse: 'Hepatic metastases, steatosis, cirrhosis, focal nodular hyperplasia.' },
  angio: { id: 'angio', label: 'CT Angio / Contrast (150/600)', wc: 150, ww: 600, modality: 'CT', range: [-150, 450], clinicalUse: 'CT angiography, arterial phase enhancement, vascular dissection, aneurysm.' },
  mediastinum: { id: 'mediastinum', label: 'CT Mediastinum (50/350)', wc: 50, ww: 350, modality: 'CT', range: [-125, 225], clinicalUse: 'Hilar and mediastinal lymph nodes, great vessels, cardiac borders.' },
  spine: { id: 'spine', label: 'CT Spine / Osteo (350/1800)', wc: 350, ww: 1800, modality: 'CT', range: [-550, 1250], clinicalUse: 'Spinal fractures, pedicle screw navigation, posterior element osteophytes.' },
  temporal_bone: { id: 'temporal_bone', label: 'CT Temporal Bone (700/4000)', wc: 700, ww: 4000, modality: 'CT', range: [-1300, 2700], clinicalUse: 'Ossicular chain, cochlea, semicircular canals, mastoid air cells.' },
};

/**
 * Backwards-compatible dictionary combining CT and canonical MR baseline presets.
 */
export const CLINICAL_WL_PRESETS: Record<string, DicomWlPreset> = {
  ...VITREA_CT_PRESETS,
  mriT1: { id: 'mriT1', label: 'MRI T1 Weighted (300/600)', wc: 300, ww: 600, modality: 'MR' },
  mriT2: { id: 'mriT2', label: 'MRI T2 Weighted (500/1000)', wc: 500, ww: 1000, modality: 'MR' },
  mriFlair: { id: 'mriFlair', label: 'MRI FLAIR (400/800)', wc: 400, ww: 800, modality: 'MR' },
  mriStir: { id: 'mriStir', label: 'MRI STIR / Fluid Highlight (8192/16384)', wc: 8192, ww: 16384, modality: 'MR' },
  mriDwi: { id: 'mriDwi', label: 'MRI DWI / Acute Restriction (400/800)', wc: 400, ww: 800, modality: 'MR' },
  mriBone: { id: 'mriBone', label: 'MRI Spine / Bone (450/900)', wc: 450, ww: 900, modality: 'MR' },
};

/**
 * 2. Vitrea MRI Sequence-Relative Presets Generator
 */
export function getMrRelativePresets(
  baseWc: number,
  baseWw: number,
  dataMax: number = baseWw * 2,
  seq: MrSequenceCode | string = 'MR'
): MrRelativePreset[] {
  const max = Math.max(100, dataMax);
  const baseW = Math.max(1, baseWc);
  const baseWidth = Math.max(1, baseWw);

  return [
    {
      name: `Clinical Auto (${seq})`,
      wc: Math.round(baseW),
      ww: Math.max(1, Math.round(baseWidth)),
      description: 'Adaptive sequence percentile auto-window derived from metadata and foreground volume.',
    },
    {
      name: 'STIR / Fluid Highlight',
      wc: Math.round(max * 0.50),
      ww: Math.max(1, Math.round(max)),
      description: 'Full dynamic range window preserving hyperintense marrow edema and CSF without white clipping.',
    },
    {
      name: 'FLAIR Edema / Brain',
      wc: Math.round(max * 0.28),
      ww: Math.max(1, Math.round(max * 0.55)),
      description: 'High contrast window emphasizing subtle periventricular demyelination and subacute ischemia.',
    },
    {
      name: 'DWI / Acute Restriction',
      wc: Math.round(max * 0.22),
      ww: Math.max(1, Math.round(max * 0.40)),
      description: 'High gradient contrast window for hyperacute stroke and cytotoxic edema visualization.',
    },
    {
      name: 'ADC Diffusivity Map',
      wc: Math.round(max * 0.15),
      ww: Math.max(1, Math.round(max * 0.30)),
      description: 'Quantitative grayscale spread for ADC hypointensity confirmation.',
    },
    {
      name: 'T2 CSF / Spine High Contrast',
      wc: Math.round(baseW * 0.85),
      ww: Math.max(1, Math.round(baseWidth * 0.85)),
      description: 'Narrowed myelographic window providing crisp cord-to-thecal-sac contrast.',
    },
    {
      name: 'T1 Spine / Anatomy Detail',
      wc: Math.round(baseW * 0.65),
      ww: Math.max(1, Math.round(baseWidth * 0.65)),
      description: 'Enhanced vertebral body trabeculation and basivertebral plexus differentiation.',
    },
    {
      name: 'PDFS / Joint & Cartilage',
      wc: Math.round(max * 0.35),
      ww: Math.max(1, Math.round(max * 0.65)),
      description: 'Optimized chondral margin and tendon tear high-contrast depiction.',
    },
    {
      name: 'GRE / SWI Bleed & Mineral',
      wc: Math.round(baseW * 0.75),
      ww: Math.max(1, Math.round(baseWidth * 0.70)),
      description: 'Tighter contrast window emphasizing magnetic blooming artifacts.',
    },
    {
      name: 'Full Stored Range',
      wc: Math.round(max * 0.50),
      ww: Math.max(1, Math.round(max)),
      description: 'Unclipped zero-to-maximum sensor data span.',
    },
  ];
}

export interface AutoWlOptions extends MrSequenceMetadata {
  headerWw?: number;
  headerWc?: number;
}

export function getAutoWlForSeries(options: AutoWlOptions): {
  ww: number;
  wc: number;
  presetKey: string;
  label: string;
  mrSequence?: MrSequenceCode;
} {
  const mod = (options.modality || 'CT').toUpperCase();
  const isMR = mod === 'MR' || mod === 'MRI';

  // 1. Prioritize calibrated DICOM Header Window/Level (Ignore uncalibrated/dummy 12-14 bit MR tags)
  const isDummyMrHeader = isMR && (Number(options.headerWw) >= 4095 || Number(options.headerWc) >= 4095);
  if (options.headerWw && options.headerWc && options.headerWw > 1 && !isDummyMrHeader) {
    return {
      ww: Math.round(options.headerWw),
      wc: Math.round(options.headerWc),
      presetKey: 'custom',
      label: `Calibrated (${Math.round(options.headerWc)}/${Math.round(options.headerWw)})`,
      mrSequence: isMR ? classifyMrSequence(options) : undefined,
    };
  }

  // 2. MRI Sequence Classification & Preset Mapping
  if (isMR) {
    const seq = classifyMrSequence(options);
    switch (seq) {
      case 'STIR':
      case 'T2_FS':
        return { ...CLINICAL_WL_PRESETS.mriStir, presetKey: 'mriStir', mrSequence: seq };
      case 'FLAIR':
        return { ...CLINICAL_WL_PRESETS.mriFlair, presetKey: 'mriFlair', mrSequence: seq };
      case 'DWI':
      case 'ADC':
        return { ...CLINICAL_WL_PRESETS.mriDwi, presetKey: 'mriDwi', mrSequence: seq };
      case 'T1':
      case 'T1_FS':
        return { ...CLINICAL_WL_PRESETS.mriT1, presetKey: 'mriT1', mrSequence: seq };
      case 'PDFS':
        return { ...CLINICAL_WL_PRESETS.mriBone, presetKey: 'mriBone', mrSequence: seq };
      case 'T2':
      case 'GRE':
      default:
        return { ...CLINICAL_WL_PRESETS.mriT2, presetKey: 'mriT2', mrSequence: seq };
    }
  }

  // 3. CT Protocol Pattern Matching across the 11 Vitrea Presets
  const desc = `${options.seriesDescription || ''} ${options.protocolName || ''}`.toLowerCase();

  if (desc.includes('temp') || desc.includes('mastoid') || desc.includes('petrous') || desc.includes('iac')) {
    return { ...VITREA_CT_PRESETS.temporal_bone, presetKey: 'temporal_bone' };
  }
  if (desc.includes('spine') || desc.includes('osteo') || desc.includes('c-spine') || desc.includes('l-spine')) {
    return { ...VITREA_CT_PRESETS.spine, presetKey: 'spine' };
  }
  if (desc.includes('bone')) {
    return { ...VITREA_CT_PRESETS.bone, presetKey: 'bone' };
  }
  if (desc.includes('lung') || desc.includes('chest') || desc.includes('pulm') || desc.includes('hrct')) {
    return { ...VITREA_CT_PRESETS.lung, presetKey: 'lung' };
  }
  if (desc.includes('stroke') || desc.includes('ischemia') || desc.includes('infarct')) {
    return { ...VITREA_CT_PRESETS.stroke, presetKey: 'stroke' };
  }
  if (desc.includes('subdural') || desc.includes('blood') || desc.includes('hematoma') || desc.includes('sah')) {
    return { ...VITREA_CT_PRESETS.subdural, presetKey: 'subdural' };
  }
  if (desc.includes('liver') || desc.includes('hepatic') || desc.includes('triphasic')) {
    return { ...VITREA_CT_PRESETS.liver, presetKey: 'liver' };
  }
  if (desc.includes('angio') || desc.includes('cta') || desc.includes('contrast') || desc.includes('cect') || desc.includes('bolus')) {
    return { ...VITREA_CT_PRESETS.angio, presetKey: 'angio' };
  }
  if (desc.includes('mediastin') || desc.includes('hilar')) {
    return { ...VITREA_CT_PRESETS.mediastinum, presetKey: 'mediastinum' };
  }
  if (desc.includes('brain') || desc.includes('head') || desc.includes('neuro') || desc.includes('ncct head')) {
    return { ...VITREA_CT_PRESETS.brain, presetKey: 'brain' };
  }

  // 4. Default CT Soft Tissue fallback
  return { ...VITREA_CT_PRESETS.soft, presetKey: 'soft' };
}
