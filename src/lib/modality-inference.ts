// Layer 2/Domain: Canonical Clinical Modality & Description Inference Service
// Strict File Size Invariant: Target < 250 lines

export function inferModality(
  modality?: string | null,
  studyDescription?: string | null,
  patientName?: string | null,
  studyTime?: string | null
): string {
  const desc = (studyDescription || '').trim();
  const rawMod = (modality || '').trim().toUpperCase();
  const pName = (patientName || '').toUpperCase();
  const time = (studyTime || '').replace(/[^0-9]/g, '').slice(0, 6);
  const hour = time.length >= 2 ? parseInt(time.slice(0, 2), 10) : -1;

  // 0. COD and explicit CT exam types in patient name are strictly CT in hospital protocol
  if (
    /\b(COD|HRCT|NCCT|CECT)\b/i.test(pName) ||
    pName.endsWith(' COD') ||
    pName.includes(' COD ') ||
    /\bCT\s+(CHEST|BRAIN|HEAD|ABDO|KUB|PELVIS)\b/i.test(pName)
  ) {
    return 'CT';
  }

  // 1. Detect CT from description keywords
  if (
    /^(ct|hrct|ncct|cect|cta|ctpa)\b/i.test(desc) ||
    /\bct\s*(study|scan|brain|chest|abdo|head|pelvis|spine|neck|kub|angio)/i.test(desc) ||
    desc.toLowerCase() === 'ct study'
  ) {
    return 'CT';
  }

  // 2. Detect MR from description keywords
  if (
    /^(mr|mri|mrs|mrcp|mra)\b/i.test(desc) ||
    /\bmri?\s*(study|scan|brain|spine|pelvis|knee|lss|c\s*spine|whole\s*spine)/i.test(desc) ||
    desc.toLowerCase() === 'mr study' ||
    desc.toLowerCase() === 'mri study'
  ) {
    return 'MR';
  }

  // 3. Modality fallback if discrete
  if (rawMod === 'MRI' || rawMod === 'MR') return 'MR';
  if (rawMod === 'CT') return 'CT';
  if (rawMod === 'CR' || rawMod === 'DX' || rawMod === 'XR' || rawMod === 'X-RAY') return 'CR';
  if (rawMod === 'US') return 'US';

  // 4. Detect X-Ray / CR / Ultrasound from description
  if (/^(xr|x-ray|cr|dx)\b/i.test(desc) || /\b(chest\s*x-ray|radiograph)\b/i.test(desc)) {
    return 'CR';
  }
  if (/^(us|ultrasound|sono)\b/i.test(desc) || /\b(ultrasound|sonography)\b/i.test(desc)) {
    return 'US';
  }

  // 5. Patient name fallback keywords (only when rawMod is absent or non-discrete)
  if (/\b(CT|HRCT|NCCT|KUB|BRAIN 3D|L\/S 3D|COD)\b/.test(pName) || pName.endsWith(' COD') || pName.includes(' COD ')) return 'CT';
  if (/\b(MR|MRI|MRCP)\b/.test(pName)) return 'MR';

  return rawMod || 'MR';
}

const GENERIC_DESCRIPTIONS = new Set([
  'STUDY',
  'CT STUDY',
  'MR STUDY',
  'DIAGNOSTIC STUDY',
  'DIAGNOSTIC EXAM',
  'EXAM',
  'SCAN',
]);

export function resolveClinicalDescription(
  studyDesc?: string | null,
  seriesDesc?: string | null,
  protocol?: string | null,
  bodyPart?: string | null,
  modality = 'MR',
  patientName?: string | null,
  studyTime?: string | null
): string {
  const d = (studyDesc || '').trim();
  const dUpper = d.toUpperCase();
  const mod = (modality || 'MR').toUpperCase() === 'MRI' ? 'MR' : (modality || 'MR').toUpperCase();

  // Night shift CT fallback
  const time = (studyTime || '').replace(/[^0-9]/g, '').slice(0, 6);
  const hour = time.length >= 2 ? parseInt(time.slice(0, 2), 10) : -1;
  if (hour >= 1 && hour < 8 && mod === 'CT' && (!d || GENERIC_DESCRIPTIONS.has(dUpper))) {
    return 'CT Study';
  }

  // 1. If study description is present and not generic, format and return it
  if (d && !GENERIC_DESCRIPTIONS.has(dUpper)) {
    if (dUpper === 'LS' || dUpper === 'LSPINE' || dUpper === 'L-SPINE' || dUpper === 'LSS') return `${mod === 'CT' ? 'CT' : 'MRI'} L/S Spine`;
    if (dUpper === 'CS' || dUpper === 'CSPINE' || dUpper === 'C-SPINE') return `${mod === 'CT' ? 'CT' : 'MRI'} Cervical Spine`;
    if (dUpper === 'DS' || dUpper === 'DSPINE' || dUpper === 'D-SPINE' || dUpper === 'DL') return `${mod === 'CT' ? 'CT' : 'MRI'} Dorsal Spine`;
    if (dUpper.includes('BRAIN') && dUpper.includes('ORBIT')) return `${mod} Brain & Orbits`;
    if (dUpper === 'BRAIN' || dUpper === 'HEAD') return `${mod} Brain`;
    return dUpper.startsWith('MR') || dUpper.startsWith('CT') ? d : `${mod} ${d}`;
  }

  // 2. Check series description, protocol name, or body part examined (RadiAnt pattern)
  const s = (seriesDesc || protocol || bodyPart || '').trim();
  const sUpper = s.toUpperCase();
  if (s && !GENERIC_DESCRIPTIONS.has(sUpper) && sUpper !== 'SERIES' && !/^SERIES_\d+$/.test(sUpper)) {
    if (sUpper.includes('LSPINE') || sUpper.includes('L-SPINE') || sUpper.includes('L/S') || sUpper.includes('LUMBAR') || sUpper.includes('LSS')) {
      return `${mod === 'CT' ? 'CT' : 'MRI'} L/S Spine`;
    }
    if (sUpper.includes('CSPINE') || sUpper.includes('C-SPINE') || sUpper.includes('C/S') || sUpper.includes('CERVICAL')) {
      return `${mod === 'CT' ? 'CT' : 'MRI'} Cervical Spine`;
    }
    if (sUpper.includes('DSPINE') || sUpper.includes('D-SPINE') || sUpper.includes('D/S') || sUpper.includes('DORSAL')) {
      return `${mod === 'CT' ? 'CT' : 'MRI'} Dorsal Spine`;
    }
    if (sUpper.includes('BRAIN') || sUpper.includes('HEAD')) {
      return `${mod} Brain`;
    }
    if (sUpper.includes('KUB')) return `${mod} KUB NC`;
    if (sUpper.includes('CHEST')) return `${mod} Chest`;
    if (sUpper.includes('PELVIS')) return `${mod} Pelvis`;
    if (sUpper.includes('KNEE')) return `${mod} Knee`;
    return sUpper.startsWith('MR') || sUpper.startsWith('CT') ? s : `${mod} ${s}`;
  }

  // 3. Fallback to extracting clinical keywords from patient name (common in hospital workflows)
  const pName = (patientName || '').toUpperCase();
  if (pName.includes('KUB')) return `${mod} KUB NC`;
  if (pName.includes('BRAIN 3D') || pName.includes('3D BRAIN')) return `${mod} Brain 3D`;
  if (pName.includes('L/S 3D') || pName.includes('3D L/S') || pName.includes('LSS 3D')) return `${mod} L/S Spine 3D`;
  if (pName.includes('LT KNEE') || pName.includes('LEFT KNEE')) return `${mod} Left Knee`;
  if (pName.includes('RT KNEE') || pName.includes('RIGHT KNEE')) return `${mod} Right Knee`;
  if (pName.includes('PELVIS')) return `${mod} Pelvis`;
  if (pName.includes('HRCT CHEST') || pName.includes('HRCT')) return 'HRCT Chest';
  if (pName.includes('NCCT BRAIN') || pName.includes('NCCT HEAD')) return 'NCCT Brain';
  if (pName.includes('COD')) return 'CT Brain Plain';

  // 4. Default fallback
  return `${mod} Study`;
}

export function matchesModality(studyMod: string, filterMod?: string): boolean {
  if (!filterMod || filterMod.toLowerCase() === 'all') return true;
  const sm = (studyMod || '').toUpperCase().trim();
  const fm = filterMod.toUpperCase().trim();
  if (sm === fm) return true;
  if ((fm === 'MRI' || fm === 'MR') && (sm === 'MRI' || sm === 'MR')) return true;
  if ((fm === 'CR' || fm === 'DX' || fm === 'XR' || fm === 'X-RAY') && (sm === 'CR' || sm === 'DX' || sm === 'XR' || sm === 'X-RAY')) return true;
  return false;
}
