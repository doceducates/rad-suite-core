/**
 * Radiology Report Quality & Discrepancy Analysis Service
 * Detects laterality mismatches, clinical contradictions, gender-specific organ mismatches,
 * and generates shadow-differentials.
 */
import { IdentifiedDiscrepancy } from '@/types/dictation';

const LATERALITY_PAIRS = [
  { side: 'right', opposite: 'left' },
  { side: 'left', opposite: 'right' },
];

const ANATOMICAL_GROUPS = [
  { name: 'renal / kidney', terms: ['kidney', 'renal', 'nephrolithiasis', 'pyelocaliceal', 'ureter', 'ureteric'] },
  { name: 'cerebellar', terms: ['cerebellar', 'cerebellar hemisphere', 'cerebellum'] },
  { name: 'mca', terms: ['mca', 'middle cerebral'] },
  { name: 'ica / carotid', terms: ['ica', 'internal carotid', 'carotid'] },
  { name: 'lung / pleural', terms: ['lung', 'pleural', 'pulmonary', 'pneumothorax', 'effusion'] },
  { name: 'adrenal', terms: ['adrenal', 'suprarenal'] },
  { name: 'femur / hip', terms: ['femur', 'femoral', 'hip'] },
  { name: 'cerebral lobe', terms: ['frontal', 'temporal', 'parietal', 'occipital', 'thalamus', 'basal ganglia'] },
  { name: 'vertebral artery', terms: ['vertebral artery'] },
];

const FEMALE_ORGANS = [
  { name: 'uterus / endometrium', regex: /\b(uterus|uterine|endometrium|endometrial|myometrium)\b/i },
  { name: 'ovary / adnexa', regex: /\b(ovary|ovaries|ovarian|adnexa|adnexal|fallopian|salpinx)\b/i },
  { name: 'cervix', regex: /\b(cervical os|cervical canal|uterine cervix)\b/i },
];

const MALE_ORGANS = [
  { name: 'prostate', regex: /\b(prostate|prostatic)\b/i },
  { name: 'seminal vesicles', regex: /\b(seminal vesicle|seminal vesicles)\b/i },
  { name: 'testis / scrotum', regex: /\b(testis|testes|testicular|scrotum|scrotal|epididymis|epididymal)\b/i },
];

export function checkGenderOrganSafety(reportText: string, gender?: string): IdentifiedDiscrepancy[] {
  if (!gender) return [];
  const discrepancies: IdentifiedDiscrepancy[] = [];
  const isMale = /^(m|male|man|boy)/i.test(gender.trim());
  const isFemale = /^(f|female|woman|girl)/i.test(gender.trim());

  if (isMale) {
    for (const organ of FEMALE_ORGANS) {
      if (organ.regex.test(reportText)) {
        discrepancies.push({
          id: `gender-male-has-${organ.name.replace(/[^a-z0-9]/gi, '_')}`,
          field: 'findings',
          description: `Critical Safety Alert: Patient is identified as MALE, but female anatomical structure (${organ.name}) is documented in the report.`,
          severity: 'CRITICAL',
          suggestedCorrection: 'Remove female anatomical references or verify patient demographics.',
        });
      }
    }
  } else if (isFemale) {
    for (const organ of MALE_ORGANS) {
      if (organ.regex.test(reportText)) {
        discrepancies.push({
          id: `gender-female-has-${organ.name.replace(/[^a-z0-9]/gi, '_')}`,
          field: 'findings',
          description: `Critical Safety Alert: Patient is identified as FEMALE, but male anatomical structure (${organ.name}) is documented in the report.`,
          severity: 'CRITICAL',
          suggestedCorrection: 'Remove male anatomical references or verify patient demographics.',
        });
      }
    }
  }

  return discrepancies;
}

export function checkLateralityDiscrepancies(findings: string, impression: string): IdentifiedDiscrepancy[] {
  const discrepancies: IdentifiedDiscrepancy[] = [];
  const cleanFindings = findings.toLowerCase();
  const cleanImpression = impression.toLowerCase();

  for (const group of ANATOMICAL_GROUPS) {
    for (const pair of LATERALITY_PAIRS) {
      const sidePattern = new RegExp(`\\b${pair.side}\\b(?:\\s+\\w+){0,3}\\s+(?:${group.terms.join('|')})`, 'i');
      const oppPattern = new RegExp(`\\b${pair.opposite}\\b(?:\\s+\\w+){0,3}\\s+(?:${group.terms.join('|')})`, 'i');

      if (sidePattern.test(cleanFindings) && oppPattern.test(cleanImpression)) {
        discrepancies.push({
          id: `lat-${group.name.replace(/[^a-z0-9]/gi, '_')}-${pair.side}-${pair.opposite}`,
          field: 'impression',
          description: `Laterality Mismatch: Findings describe ${pair.side} ${group.name}, but Impression states ${pair.opposite} ${group.name}.`,
          severity: 'WARNING',
          lateralityConflict: true,
          suggestedCorrection: `Verify whether the lesion is ${pair.side.toUpperCase()} or ${pair.opposite.toUpperCase()} sided.`,
        });
      }
    }
  }

  return discrepancies;
}

export function checkClinicalContradictions(findings: string, impression: string): IdentifiedDiscrepancy[] {
  const discrepancies: IdentifiedDiscrepancy[] = [];
  const combined = `${findings} ${impression}`.toLowerCase();

  if (/lungs\s+(?:are\s+)?(?:completely\s+)?clear/i.test(findings) && /(consolidation|infiltrate|ground-glass|pneumothorax)/i.test(combined)) {
    discrepancies.push({
      id: 'contra-lungs-clear',
      field: 'findings',
      description: 'Contradiction: Findings state "lungs are clear", but opacities or consolidation are documented.',
      severity: 'WARNING',
    });
  }

  if (/no\s+(?:acute\s+)?(?:intracranial\s+)?hemorrhage/i.test(findings) && /(hematoma|hemorrhage|contusion|sah|sdh|edh)/i.test(impression)) {
    discrepancies.push({
      id: 'contra-hemorrhage',
      field: 'impression',
      description: 'Contradiction: Normal findings state no hemorrhage, but the impression lists an acute bleed or contusion.',
      severity: 'WARNING',
    });
  }

  if (/gallbladder\s+(?:is\s+)?(?:unremarkable|normal)/i.test(findings) && /(calculus|cholelithiasis|gallstone)/i.test(combined)) {
    discrepancies.push({
      id: 'contra-gallbladder',
      field: 'findings',
      description: 'Contradiction: Gallbladder is marked unremarkable, but calculi or cholelithiasis are described.',
      severity: 'WARNING',
    });
  }

  return discrepancies;
}

export function generateShadowDifferentials(text: string, modality = 'CT'): string[] {
  const lower = text.toLowerCase();
  const shadows: string[] = [];

  if (modality.toUpperCase() === 'CT' || lower.includes('ct')) {
    if (lower.includes('hypoattenuat') || lower.includes('insular ribbon')) {
      shadows.push('Differentiate early hyperacute cytotoxic edema vs chronic small vessel ischemic leukoaraiosis.');
      shadows.push('Correlate with ASPECTS score and assess dense MCA sign on thin slices.');
    }
    if (lower.includes('hyperattenuating') || lower.includes('hyperdense')) {
      shadows.push('Differentiate acute clotted hematoma vs extravasated contrast medium or dense calcification.');
    }
    if (lower.includes('ground-glass') || lower.includes('consolidation')) {
      shadows.push('Differential considerations: Atypical infection/pneumonia vs pulmonary edema vs alveolar hemorrhage.');
    }
  }

  if (modality.toUpperCase() === 'MRI' || lower.includes('mri')) {
    if (lower.includes('diffusion restriction') || lower.includes('dwi')) {
      shadows.push('Evaluate ADC map to confirm true restricted diffusion vs T2 shine-through artifact.');
      shadows.push('Consider differential: Acute arterial territorial infarct vs hypercellular neoplasm vs abscess.');
    }
    if (lower.includes('blooming') || lower.includes('swi')) {
      shadows.push('Distinguish cavernoma or cerebral amyloid angiopathy microbleeds from paramagnetic mineralization (calcification/phase image).');
    }
  }

  if (shadows.length === 0) {
    shadows.push('Confirm contralateral anatomical symmetry and review relevant prior cross-sectional studies.');
  }

  return shadows;
}

export function analyzeReport(findings: string, impression: string, modality = 'CT', gender?: string) {
  const combined = `${findings} ${impression}`;
  const genderErrors = checkGenderOrganSafety(combined, gender);
  const latErrors = checkLateralityDiscrepancies(findings, impression);
  const contraErrors = checkClinicalContradictions(findings, impression);
  const shadowDifferentials = generateShadowDifferentials(combined, modality);

  return {
    discrepancies: [...genderErrors, ...latErrors, ...contraErrors],
    shadowDifferentials,
  };
}

export { extractDiagnosisHighlight } from '@/lib/clinical-summary';
export { generateAiDiagnosisHighlight } from '@/services/ai-clinical-summary.service';

