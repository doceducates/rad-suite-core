/**
 * Vitrea / Voxen Clinical Applications Catalog & Dispatcher (<300 lines).
 * Modality-specific clinical applications matching Vitrea Classic manifests.
 */

export interface ClinicalApplication {
  id: string;
  applicationName: string;
  displayName: string;
  protocol: string;
  preset: string;
  modality: 'CT' | 'MR' | 'XA' | 'NM' | 'PET' | 'CR' | 'ALL';
  category: 'Neuro' | 'Thoracic' | 'Cardiovascular' | 'Abdomen' | 'Musculoskeletal' | 'General';
  description: string;
  iconName: string;
  layout: { rows: number; cols: number };
  is3D?: boolean;
  isMpr?: boolean;
}

export const CLINICAL_APPLICATIONS: ClinicalApplication[] = [
  // --- MR Applications ---
  {
    id: 'mr_msk', applicationName: 'MRMusculoskeletal', displayName: 'MR Spine & Joints',
    protocol: 'Musculoskeletal MR', preset: 'Spine & Joints', modality: 'MR', category: 'Musculoskeletal',
    description: 'Comprehensive review of spine, knee, hip, shoulder with synchronized multi-sequence comparing.',
    iconName: 'accessibility_new', layout: { rows: 2, cols: 2 },
  },
  {
    id: 'mr_mmv', applicationName: 'MultiModalityViewer', displayName: 'Multi-Sequence MR (MMV)',
    protocol: 'Multi-Modality Review', preset: 'Multi-Sequence', modality: 'MR', category: 'General',
    description: 'Synchronized side-by-side 4-up comparison of T1, T2, STIR, and DWI sequences with crosshair linking.',
    iconName: 'grid_view', layout: { rows: 2, cols: 2 },
  },
  {
    id: 'mr_neuro', applicationName: 'MRBrainTumor', displayName: 'MR Neuro / Brain',
    protocol: 'Brain MR', preset: 'Neuro Protocol', modality: 'MR', category: 'Neuro',
    description: 'Multiparametric brain examination: FLAIR edema, DWI diffusion restriction, T1 contrast borders.',
    iconName: 'psychology', layout: { rows: 2, cols: 2 },
  },
  {
    id: 'mr_vascular', applicationName: 'MRVascular', displayName: 'MR Vascular (MRA/MRV)',
    protocol: 'Vascular MR', preset: 'Time-of-Flight MRA', modality: 'MR', category: 'Cardiovascular',
    description: 'Intracranial and carotid TOF MR angiography with 3D MIP projection and curved reformats.',
    iconName: 'device_hub', layout: { rows: 1, cols: 2 }, is3D: true,
  },
  {
    id: 'mr_prostate', applicationName: 'MRProstateAnalysis', displayName: 'MR Prostate (PI-RADS)',
    protocol: 'Prostate MR', preset: 'Multiparametric Prostate', modality: 'MR', category: 'Abdomen',
    description: 'PI-RADS v2.1 multiparametric prostate review: T2 high-resolution, ADC maps, b2000 DWI.',
    iconName: 'biotech', layout: { rows: 2, cols: 2 },
  },
  {
    id: 'mr_generic', applicationName: 'MRGeneric', displayName: 'General MR Review',
    protocol: 'General MR', preset: '2D Diagnostic Stack', modality: 'MR', category: 'General',
    description: 'Standard single-pane 2D diagnostic review with cine scrubbing and sequence presets.',
    iconName: 'layers', layout: { rows: 1, cols: 1 },
  },

  // --- CT Applications ---
  {
    id: 'ct_lung', applicationName: 'CTLungAnalysis', displayName: 'CT Lung & Thorax',
    protocol: 'Thoracic CT', preset: 'Lung Nodule & Airway', modality: 'CT', category: 'Thoracic',
    description: 'High-resolution pulmonary parenchyma, subpleural nodules, emphysema, and bronchial tree.',
    iconName: 'air', layout: { rows: 1, cols: 2 },
  },
  {
    id: 'ct_stroke', applicationName: 'CTBrainStroke', displayName: 'CT Brain & Stroke',
    protocol: 'Neuro CT', preset: 'Stroke & Infarct', modality: 'CT', category: 'Neuro',
    description: 'Hyperacute ischemia detection, ASPECT scoring, loss of insular ribbon, dense MCA sign.',
    iconName: 'emergency', layout: { rows: 1, cols: 1 },
  },
  {
    id: 'ct_cardiac', applicationName: 'CTCardiacVScore', displayName: 'Cardiac Calcium Score',
    protocol: 'Cardiac CT', preset: 'Agatston VScore', modality: 'CT', category: 'Cardiovascular',
    description: 'ECG-gated Agatston calcium scoring of LAD, LCx, RCA with arterial risk stratification.',
    iconName: 'favorite', layout: { rows: 1, cols: 2 },
  },
  {
    id: 'ct_aorta', applicationName: 'CTVascularAorta', displayName: 'CT Aorta & EVSP',
    protocol: 'Vascular CT', preset: 'Aortic Stent Planning', modality: 'CT', category: 'Cardiovascular',
    description: 'Abdominal and thoracic aortic aneurysm evaluation, center-line lumen tracing, stent graft sizing.',
    iconName: 'route', layout: { rows: 2, cols: 2 }, is3D: true,
  },
  {
    id: 'ct_colon', applicationName: 'CTColonAnalysis', displayName: 'CT Virtual Colonoscopy',
    protocol: 'Abdominal CT', preset: 'Virtual Endoscopy', modality: 'CT', category: 'Abdomen',
    description: 'Supine and prone 3D fly-through, polyp segmentation, and unfolded colon mucosal map.',
    iconName: 'view_in_ar', layout: { rows: 1, cols: 2 }, is3D: true,
  },
  {
    id: 'ct_temporal', applicationName: 'CTTemporalBone', displayName: 'CT Temporal Bone',
    protocol: 'ENT CT', preset: 'Inner Ear & Ossicles', modality: 'CT', category: 'Musculoskeletal',
    description: 'Sub-millimeter ossicular chain, incudomalleolar joint, cochlea, and semicircular canals.',
    iconName: 'hearing', layout: { rows: 1, cols: 1 },
  },
  {
    id: 'ct_generic', applicationName: 'CTGeneric', displayName: 'General CT Review',
    protocol: 'General CT', preset: 'Standard CT', modality: 'CT', category: 'General',
    description: 'Standard CT review with instant soft tissue, bone, lung, brain window switching.',
    iconName: 'view_agenda', layout: { rows: 1, cols: 1 },
  },

  // --- Core Multi-Modality / 3D Workflows ---
  {
    id: 'vitrea_3d_mpr', applicationName: 'VitreaCore3D', displayName: 'Vitrea 3D MPR / VRT',
    protocol: 'Volumetric Reconstruction', preset: '3D MPR', modality: 'ALL', category: 'General',
    description: 'True physical orthogonal MPR (Axial, Coronal, Sagittal) and 3D Volume Rendering with MIP.',
    iconName: 'view_in_ar', layout: { rows: 2, cols: 2 }, isMpr: true,
  },
  {
    id: 'vitrea_gallery', applicationName: 'Gallery', displayName: 'Montage / Lightbox',
    protocol: 'Multi-Image Gallery', preset: 'Lightbox Grid', modality: 'ALL', category: 'General',
    description: 'Overview montage display of all slices across sequences for rapid pattern spotting.',
    iconName: 'auto_awesome_mosaic', layout: { rows: 3, cols: 3 },
  },

  // --- X-Ray & Angiography ---
  {
    id: 'xa_dsa', applicationName: 'XADSA', displayName: 'Digital Subtraction (DSA)',
    protocol: 'Fluoroscopy / Angio', preset: 'Vessel Roadmapping', modality: 'XA', category: 'Cardiovascular',
    description: 'Peak opacification mask subtraction, roadmapping, and vessel caliber analysis.',
    iconName: 'timeline', layout: { rows: 1, cols: 1 },
  },
  {
    id: 'pet_ct_fusion', applicationName: 'PETCTFusion', displayName: 'PET/CT Fusion',
    protocol: 'Nuclear Fusion', preset: 'SUV Rainbow', modality: 'PET', category: 'General',
    description: 'Metabolic SUV heatmap fused directly over anatomic CT soft tissue volume.',
    iconName: 'grain', layout: { rows: 1, cols: 2 },
  },
];

export interface StudyDispatchContext {
  modality?: string;
  studyDescription?: string;
  bodyPartExamined?: string;
  seriesCount?: number;
}

/**
 * Resolves the optimal default Vitrea clinical application for any study.
 */
export function resolveStudyDefaultApp(ctx: StudyDispatchContext = {}): ClinicalApplication {
  const mod = String(ctx.modality || 'CT').toUpperCase();
  const desc = `${ctx.studyDescription || ''} ${ctx.bodyPartExamined || ''}`.toUpperCase();

  if (mod === 'MR' || mod === 'MRI') {
    if (/SPINE|LSS|LS\b|L\/S|LUMBAR|CERVICAL|THORACIC|KNEE|SHOULDER|HIP|WRIST|ANKLE/i.test(desc)) {
      return CLINICAL_APPLICATIONS.find((a) => a.id === 'mr_msk')!;
    }
    if (/BRAIN|HEAD|NEURO|TUMOR|PITUITARY|STROKE/i.test(desc)) {
      return CLINICAL_APPLICATIONS.find((a) => a.id === 'mr_neuro')!;
    }
    if (/ANGIO|MRA|MRV|CAROTID|AORTA|FLOW/i.test(desc)) {
      return CLINICAL_APPLICATIONS.find((a) => a.id === 'mr_vascular')!;
    }
    if (/PROSTATE|PIRADS|PELVIS/i.test(desc)) {
      return CLINICAL_APPLICATIONS.find((a) => a.id === 'mr_prostate')!;
    }
    if ((ctx.seriesCount ?? 0) >= 2) {
      return CLINICAL_APPLICATIONS.find((a) => a.id === 'mr_mmv')!;
    }
    return CLINICAL_APPLICATIONS.find((a) => a.id === 'mr_generic')!;
  }

  if (mod === 'CT') {
    if (/LUNG|CHEST|THORAX|PULMO/i.test(desc)) {
      return CLINICAL_APPLICATIONS.find((a) => a.id === 'ct_lung')!;
    }
    if (/BRAIN|HEAD|STROKE|NEURO/i.test(desc)) {
      return CLINICAL_APPLICATIONS.find((a) => a.id === 'ct_stroke')!;
    }
    if (/CALCIUM|SCORE|CACS|CORONARY/i.test(desc)) {
      return CLINICAL_APPLICATIONS.find((a) => a.id === 'ct_cardiac')!;
    }
    if (/AORTA|STENT|EVSP|AAA/i.test(desc)) {
      return CLINICAL_APPLICATIONS.find((a) => a.id === 'ct_aorta')!;
    }
    if (/COLON|POLYP/i.test(desc)) {
      return CLINICAL_APPLICATIONS.find((a) => a.id === 'ct_colon')!;
    }
    if (/TEMPORAL|EAR|MASTOID/i.test(desc)) {
      return CLINICAL_APPLICATIONS.find((a) => a.id === 'ct_temporal')!;
    }
    return CLINICAL_APPLICATIONS.find((a) => a.id === 'ct_generic')!;
  }

  if (mod === 'XA') return CLINICAL_APPLICATIONS.find((a) => a.id === 'xa_dsa')!;
  if (mod === 'PET' || mod === 'NM') return CLINICAL_APPLICATIONS.find((a) => a.id === 'pet_ct_fusion')!;

  return CLINICAL_APPLICATIONS.find((a) => a.id === 'vitrea_3d_mpr')!;
}

export function getApplicationsForModality(modality: string): ClinicalApplication[] {
  const mod = modality.toUpperCase();
  return CLINICAL_APPLICATIONS.filter(
    (a) => a.modality === 'ALL' || a.modality === mod || (mod === 'MRI' && a.modality === 'MR')
  );
}
