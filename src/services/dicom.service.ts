export interface DicomInstance {
  id: string;
  index: number;
  pixelSpacing?: [number, number];
  sliceThickness?: number;
}

export interface DicomSeries {
  id: string;
  seriesNumber: number;
  description: string;
  modality: string;
  orientation: 'AXIAL' | 'CORONAL' | 'SAGITTAL';
  sequenceKey: string;
  windowPreset: keyof typeof WINDOW_PRESETS;
  instances: DicomInstance[];
}

export interface StudyDetail {
  id: string;
  patientName: string;
  patientId: string;
  studyDate: string;
  modality: string;
  accessionNumber: string;
  studyDescription: string;
  series: DicomSeries[];
}

export const WINDOW_PRESETS = {
  // 1. Official Vitrea CT Calibrated Presets (Hounsfield Units: WC / WW)
  soft: { label: 'CT Soft Tissue (40/400)', ww: 400, wc: 40, modality: 'CT' },
  lung: { label: 'CT Lung (-600/1500)', ww: 1500, wc: -600, modality: 'CT' },
  bone: { label: 'CT Bone (400/2000)', ww: 2000, wc: 400, modality: 'CT' },
  brain: { label: 'CT Brain (40/80)', ww: 80, wc: 40, modality: 'CT' },
  stroke: { label: 'CT Stroke / Ischemia (30/30)', ww: 30, wc: 30, modality: 'CT' },
  subdural: { label: 'CT Subdural / Blood (75/200)', ww: 200, wc: 75, modality: 'CT' },
  liver: { label: 'CT Liver (30/150)', ww: 150, wc: 30, modality: 'CT' },
  angio: { label: 'CT Angio / Contrast (150/600)', ww: 600, wc: 150, modality: 'CT' },
  mediastinum: { label: 'CT Mediastinum (50/350)', ww: 350, wc: 50, modality: 'CT' },
  spine: { label: 'CT Spine / Osteo (350/1800)', ww: 1800, wc: 350, modality: 'CT' },
  temporal_bone: { label: 'CT Temporal Bone (700/4000)', ww: 4000, wc: 700, modality: 'CT' },

  // 2. MRI Calibrated Presets
  mriT1: { label: 'MRI T1 Weighted (300/600)', ww: 600, wc: 300, modality: 'MR' },
  mriT2: { label: 'MRI T2 Weighted (500/1000)', ww: 1000, wc: 500, modality: 'MR' },
  mriFlair: { label: 'MRI FLAIR (400/800)', ww: 800, wc: 400, modality: 'MR' },
  mriStir: { label: 'MRI STIR / Fluid Highlight (8192/16384)', ww: 16384, wc: 8192, modality: 'MR' },
  mriDwi: { label: 'MRI DWI / Acute Restriction (400/800)', ww: 800, wc: 400, modality: 'MR' },
  mriBone: { label: 'MRI Spine / Bone (450/900)', ww: 900, wc: 450, modality: 'MR' },
};

function createInstances(seriesId: string, count: number, thickness = 5.0): DicomInstance[] {
  return Array.from({ length: count }, (_, i) => ({
    id: `${seriesId}-inst-${i}`,
    index: i,
    pixelSpacing: [0.65, 0.65],
    sliceThickness: thickness,
  }));
}

export function getSyntheticStudyDetail(accession: string, modality: string = 'CT'): StudyDetail {
  const modUpper = modality.toUpperCase();
  const isMR = modUpper === 'MRI' || modUpper === 'MR';
  const isXR = modUpper === 'CR' || modUpper === 'DX';

  let series: DicomSeries[] = [];

  if (isMR) {
    series = [
      { id: 'ser-mri-1', seriesNumber: 1, description: 'Axial T2 TSE', modality, orientation: 'AXIAL', sequenceKey: 't2', windowPreset: 'mriT2', instances: createInstances('ser-mri-1', 28, 4.0) },
      { id: 'ser-mri-2', seriesNumber: 2, description: 'Axial T1 SE', modality, orientation: 'AXIAL', sequenceKey: 't1', windowPreset: 'mriT1', instances: createInstances('ser-mri-2', 24, 4.0) },
      { id: 'ser-mri-3', seriesNumber: 3, description: 'Coronal FLAIR', modality, orientation: 'CORONAL', sequenceKey: 'flair', windowPreset: 'mriFlair', instances: createInstances('ser-mri-3', 22, 4.5) },
      { id: 'ser-mri-4', seriesNumber: 4, description: 'Sagittal T1 SE', modality, orientation: 'SAGITTAL', sequenceKey: 't1', windowPreset: 'mriT1', instances: createInstances('ser-mri-4', 20, 4.0) },
      { id: 'ser-mri-5', seriesNumber: 5, description: 'Coronal STIR', modality, orientation: 'CORONAL', sequenceKey: 'stir', windowPreset: 'mriStir', instances: createInstances('ser-mri-5', 20, 5.0) },
      { id: 'ser-mri-6', seriesNumber: 6, description: 'Axial DWI / ADC', modality, orientation: 'AXIAL', sequenceKey: 'dwi', windowPreset: 'mriDwi', instances: createInstances('ser-mri-6', 18, 5.0) },
    ];
  } else if (isXR) {
    series = [
      { id: 'ser-xr-1', seriesNumber: 1, description: 'Chest PA Erect', modality, orientation: 'CORONAL', sequenceKey: 'lung', windowPreset: 'lung', instances: createInstances('ser-xr-1', 1, 1.0) },
      { id: 'ser-xr-2', seriesNumber: 2, description: 'Chest Lateral', modality, orientation: 'SAGITTAL', sequenceKey: 'lung', windowPreset: 'lung', instances: createInstances('ser-xr-2', 1, 1.0) },
    ];
  } else {
    // Standard CT
    series = [
      { id: 'ser-ct-1', seriesNumber: 1, description: 'Axial 5mm Standard', modality, orientation: 'AXIAL', sequenceKey: 'brain', windowPreset: 'brain', instances: createInstances('ser-ct-1', 32, 5.0) },
      { id: 'ser-ct-2', seriesNumber: 2, description: 'Axial Bone Algorithm', modality, orientation: 'AXIAL', sequenceKey: 'bone', windowPreset: 'bone', instances: createInstances('ser-ct-2', 32, 2.5) },
      { id: 'ser-ct-3', seriesNumber: 3, description: 'Coronal MPR Reformat', modality, orientation: 'CORONAL', sequenceKey: 'soft', windowPreset: 'soft', instances: createInstances('ser-ct-3', 24, 3.0) },
      { id: 'ser-ct-4', seriesNumber: 4, description: 'Sagittal MPR Reformat', modality, orientation: 'SAGITTAL', sequenceKey: 'soft', windowPreset: 'soft', instances: createInstances('ser-ct-4', 24, 3.0) },
      { id: 'ser-ct-5', seriesNumber: 5, description: 'Chest Lung Window', modality, orientation: 'AXIAL', sequenceKey: 'lung', windowPreset: 'lung', instances: createInstances('ser-ct-5', 30, 2.0) },
    ];
  }

  return {
    id: 'synthetic-' + accession,
    patientName: 'Patient ' + accession,
    patientId: 'MR-' + accession.slice(-4),
    studyDate: new Date().toISOString(),
    modality,
    accessionNumber: accession,
    studyDescription: `${modality} Diagnostic Study - Comprehensive Protocol`,
    series,
  };
}
