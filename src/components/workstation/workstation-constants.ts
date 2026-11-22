export const DEFAULT_CT_SERIES = [
  { seriesNumber: '1', seriesDescription: 'Axial Soft Tissue', sliceCount: 576, orientation: 'AXIAL' as const, modality: 'CT' },
  { seriesNumber: '2', seriesDescription: 'Coronal MPR', sliceCount: 312, orientation: 'CORONAL' as const, modality: 'CT' },
  { seriesNumber: '3', seriesDescription: 'Coronal Bone', sliceCount: 240, orientation: 'CORONAL' as const, modality: 'CT' },
  { seriesNumber: '4', seriesDescription: 'Axial Bone Window', sliceCount: 240, orientation: 'AXIAL' as const, modality: 'CT' },
];

export const DEFAULT_FALLBACK_SERIES = DEFAULT_CT_SERIES;

export function buildSeriesList(
  isLocalCase: boolean,
  localSeries: any[] = [],
  modality: string = 'CT',
  studyDescription: string = ''
) {
  if (isLocalCase && localSeries.length > 0) {
    return localSeries.map((s: any) => ({
      seriesNumber: String(s.seriesNumber),
      seriesDescription: s.seriesDescription,
      orientation: s.orientation,
      sliceCount: s.sliceCount,
      modality,
    }));
  }

  const mod = (modality || 'CT').toUpperCase();
  const desc = (studyDescription || '').toUpperCase();

  if (mod === 'MR' || mod === 'MRI') {
    if (desc.includes('KNEE') || desc.includes('MENISCUS') || desc.includes('PCL') || desc.includes('ACL')) {
      return [
        { seriesNumber: '1', seriesDescription: 'Loc 2PL(AX/CO)', sliceCount: 12, orientation: 'LOCALIZER' as const, modality: 'MR' },
        { seriesNumber: '2', seriesDescription: 'Sagittal T2 FS', sliceCount: 44, orientation: 'SAGITTAL' as const, modality: 'MR' },
        { seriesNumber: '3', seriesDescription: 'Coronal PDFS', sliceCount: 48, orientation: 'CORONAL' as const, modality: 'MR' },
        { seriesNumber: '4', seriesDescription: 'Axial PDFS', sliceCount: 48, orientation: 'AXIAL' as const, modality: 'MR' },
        { seriesNumber: '5', seriesDescription: 'Coronal T1', sliceCount: 44, orientation: 'CORONAL' as const, modality: 'MR' },
        { seriesNumber: '6', seriesDescription: 'Sagittal T1', sliceCount: 48, orientation: 'SAGITTAL' as const, modality: 'MR' },
        { seriesNumber: '7', seriesDescription: 'Sagittal PD', sliceCount: 52, orientation: 'SAGITTAL' as const, modality: 'MR' },
      ];
    }
    if (desc.includes('SPINE') || desc.includes('LS') || desc.includes('CS') || desc.includes('DS') || desc.includes('LUMBAR')) {
      return [
        { seriesNumber: '1', seriesDescription: 'Loc 3PL C0', sliceCount: 12, orientation: 'LOCALIZER' as const, modality: 'MR' },
        { seriesNumber: '2', seriesDescription: 'Sagittal T2', sliceCount: 24, orientation: 'SAGITTAL' as const, modality: 'MR' },
        { seriesNumber: '3', seriesDescription: 'Sagittal T1', sliceCount: 24, orientation: 'SAGITTAL' as const, modality: 'MR' },
        { seriesNumber: '4', seriesDescription: 'Axial T2', sliceCount: 32, orientation: 'AXIAL' as const, modality: 'MR' },
        { seriesNumber: '5', seriesDescription: 'Sagittal STIR', sliceCount: 24, orientation: 'SAGITTAL' as const, modality: 'MR' },
        { seriesNumber: '6', seriesDescription: 'Axial T1', sliceCount: 28, orientation: 'AXIAL' as const, modality: 'MR' },
      ];
    }
    if (desc.includes('BRAIN') || desc.includes('HEAD') || desc.includes('NEURO')) {
      return [
        { seriesNumber: '1', seriesDescription: 'Loc 3PL C0', sliceCount: 12, orientation: 'LOCALIZER' as const, modality: 'MR' },
        { seriesNumber: '2', seriesDescription: 'Axial T2', sliceCount: 30, orientation: 'AXIAL' as const, modality: 'MR' },
        { seriesNumber: '3', seriesDescription: 'Axial FLAIR', sliceCount: 30, orientation: 'AXIAL' as const, modality: 'MR' },
        { seriesNumber: '4', seriesDescription: 'Axial DWI / ADC', sliceCount: 30, orientation: 'AXIAL' as const, modality: 'MR' },
        { seriesNumber: '5', seriesDescription: 'Sagittal T1', sliceCount: 24, orientation: 'SAGITTAL' as const, modality: 'MR' },
        { seriesNumber: '6', seriesDescription: 'Axial T1', sliceCount: 28, orientation: 'AXIAL' as const, modality: 'MR' },
      ];
    }
    return [
      { seriesNumber: '1', seriesDescription: 'Loc 3PL C0', sliceCount: 12, orientation: 'LOCALIZER' as const, modality: 'MR' },
      { seriesNumber: '2', seriesDescription: 'Axial T2', sliceCount: 32, orientation: 'AXIAL' as const, modality: 'MR' },
      { seriesNumber: '3', seriesDescription: 'Coronal PDFS', sliceCount: 32, orientation: 'CORONAL' as const, modality: 'MR' },
      { seriesNumber: '4', seriesDescription: 'Coronal T1', sliceCount: 32, orientation: 'CORONAL' as const, modality: 'MR' },
      { seriesNumber: '5', seriesDescription: 'Sagittal T2', sliceCount: 32, orientation: 'SAGITTAL' as const, modality: 'MR' },
    ];
  }

  return DEFAULT_CT_SERIES;
}

export function buildReportState(init: any, st: any) {
  return {
    clinicalHistory: init?.clinicalHistory || st?.clinicalHistory || '',
    technique: init?.technique || '',
    comparison: init?.comparison || '',
    findings: init?.findings || '',
    impression: init?.impression || '',
    status: init?.status || 'draft',
    criticalFinding: Boolean(init?.criticalFinding),
    contentJson: init?.contentJson || null,
    discussionJson: init?.discussionJson || null,
  };
}
