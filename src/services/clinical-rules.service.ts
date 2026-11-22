/**
 * Cross-Sectional CT & MRI Clinical Decision Rules Service
 * Adapted from HMIS Punjab Autopilot for Cross-Sectional Radiology.
 */

export interface CTMRIRuleMatch {
  modality: 'CT' | 'MRI';
  scanType: string;
  bodyPart: string;
  hmisDiagnosis: string;
  icd10Code: string;
  requiresContrast: boolean;
  priority: 'stat' | 'urgent' | 'routine';
  protocolNotes: string;
  defaultTemplate: {
    technique: string;
    findings: string;
    impression: string;
  };
}

const CROSS_SECTIONAL_RULES: Array<{
  keywords: string[];
  rule: CTMRIRuleMatch;
}> = [
  // 1. Acute Stroke / Neuro Emergent
  {
    keywords: ['stroke', 'hemiparesis', 'facial droop', 'cva', 'tia', 'aphasia', 'dysarthria', 'slurred speech', 'weakness'],
    rule: {
      modality: 'CT',
      scanType: 'CT Brain Non-Contrast (Stroke Protocol)',
      bodyPart: 'Brain / Neuro',
      hmisDiagnosis: 'Cerebrovascular Accident (Stroke)',
      icd10Code: 'I63.9',
      requiresContrast: false,
      priority: 'stat',
      protocolNotes: 'Perform non-contrast axial 1.25mm reconstructions. Assess hyperdense MCA sign, insular ribbon loss, and ASPECTS score.',
      defaultTemplate: {
        technique: 'Helical non-contrast axial CT images obtained from the skull base to the vertex with 1.25mm thin reconstructions.',
        findings: '<p>1. No acute intra-axial or extra-axial hemorrhage identified.</p><p>2. Ventricular system, basilar cisterns, and sulci are within normal limits for age.</p><p>3. Gray-white matter differentiation is preserved; no dense artery sign or acute territorial hypoattenuation.</p><p>4. Calvarium and skull base appear intact.</p>',
        impression: '<p><strong>IMPRESSION:</strong></p><ol><li>No acute intracranial hemorrhage or territorial territorial infarction identified on current non-contrast CT study.</li><li>ASPECTS Score: 10/10.</li></ol>',
      },
    },
  },

  // 2. Spine Radiculopathy / Disc Herniation
  {
    keywords: ['lumbar', 'back pain', 'sciatica', 'radiculopathy', 'disc', 'spondylosis', 'canal stenosis', 'cauda equina', 'l4-l5', 'l5-s1'],
    rule: {
      modality: 'MRI',
      scanType: 'MRI Lumbar Spine with Sagittal & Axial Sequences',
      bodyPart: 'Lumbar Spine',
      hmisDiagnosis: 'Lumbar Disc Herniation / Radiculopathy',
      icd10Code: 'M51.2',
      requiresContrast: false,
      priority: 'urgent',
      protocolNotes: 'T1, T2, and STIR sagittal sequences with axial T2 through disc spaces L1-S1.',
      defaultTemplate: {
        technique: 'Multiplanar, multisequence MRI of the lumbar spine obtained without intravenous contrast, including sagittal T1, T2, STIR, and axial T2 views.',
        findings: '<p>1. Lumbar lordosis is preserved. Vertebral body heights and marrow signal are unremarkable.</p><p>2. L4-L5 disc shows mild degenerative dehydration with posterior central disc bulge contacting the anterior thecal sac without critical neural compression.</p><p>3. L5-S1 disc reveals a right paracentral disc protrusion causing mild impingement of the traversing right S1 nerve root.</p><p>4. Conus medullaris terminates normally at L1-L2 level.</p>',
        impression: '<p><strong>IMPRESSION:</strong></p><ol><li>Right paracentral disc protrusion at L5-S1 causing mild right S1 traversing nerve root impingement, correlating with right-sided S1 radiculopathy.</li><li>Mild degenerative disc disease at L4-L5 without central canal stenosis.</li></ol>',
      },
    },
  },

  // 3. Acute Abdomen / Appendicitis / Bowel
  {
    keywords: ['abdominal pain', 'rif', 'appendicitis', 'peritonitis', 'bowel obstruction', 'distension', 'vomiting', 'acute abdomen'],
    rule: {
      modality: 'CT',
      scanType: 'CT Abdomen & Pelvis with IV and Oral Contrast',
      bodyPart: 'Abdomen & Pelvis',
      hmisDiagnosis: 'Acute Abdomen / Suspected Appendicitis',
      icd10Code: 'R10.0',
      requiresContrast: true,
      priority: 'urgent',
      protocolNotes: 'Portal venous phase with IV iodinated contrast. Check renal profile (eGFR > 45 mL/min).',
      defaultTemplate: {
        technique: 'Contrast-enhanced helical CT of the abdomen and pelvis obtained in portal venous phase with 2.5mm reconstructed axial and coronal reformats.',
        findings: '<p>1. Appendix is dilated measuring up to 9.5 mm with mural thickening, periappendiceal fat stranding, and mild adjacent fluid.</p><p>2. Liver, spleen, pancreas, adrenals, and kidneys show normal enhancement without focal lesion.</p><p>3. No pneumoperitoneum or high-grade mechanical small bowel obstruction.</p>',
        impression: '<p><strong>IMPRESSION:</strong></p><ol><li>Features consistent with acute uncomplicated appendicitis.</li><li>No signs of perforation, localized abscess, or free intraperitoneal air.</li></ol>',
      },
    },
  },

  // 4. Renal Colic / Flank Pain (CT KUB)
  {
    keywords: ['flank pain', 'renal colic', 'calculus', 'stone', 'hematuria', 'hydronephrosis', 'ureteric', 'kidney stone'],
    rule: {
      modality: 'CT',
      scanType: 'CT KUB Non-Contrast (Stone Protocol)',
      bodyPart: 'Urinary Tract (KUB)',
      hmisDiagnosis: 'Urinary Tract Calculus / Renal Colic',
      icd10Code: 'N20.0',
      requiresContrast: false,
      priority: 'urgent',
      protocolNotes: 'Low-dose non-contrast helical CT from top of kidneys through pubic symphysis.',
      defaultTemplate: {
        technique: 'Low-dose non-contrast helical CT images of the kidneys, ureters, and bladder.',
        findings: '<p>1. Right kidney contains a 4.2 mm hyperdense calculus within the mid-pole calyx without significant upstream pelvicalyceal dilatation.</p><p>2. Left kidney and ureter are unremarkable without nephrolithiasis or hydroureter.</p><p>3. Urinary bladder is well-distended with no intravesical calculus or wall thickening.</p>',
        impression: '<p><strong>IMPRESSION:</strong></p><ol><li>Right non-obstructing mid-calyceal renal calculus measuring 4.2 mm.</li><li>No evidence of ureteric obstruction or acute perinephric stranding.</li></ol>',
      },
    },
  },

  // 5. Pulmonary Embolism & Chest Symptoms
  {
    keywords: ['chest pain', 'hemoptysis', 'pulmonary embolism', 'pe', 'd-dimer', 'tachycardia', 'hypoxia', 'desaturation'],
    rule: {
      modality: 'CT',
      scanType: 'CT Pulmonary Angiography (CTPA)',
      bodyPart: 'Chest / Thorax',
      hmisDiagnosis: 'Suspected Pulmonary Embolism',
      icd10Code: 'I26.9',
      requiresContrast: true,
      priority: 'stat',
      protocolNotes: 'Bolus tracking timed on the main pulmonary artery with high flow rate (4-5 mL/sec).',
      defaultTemplate: {
        technique: 'Helical CT pulmonary angiography obtained with optimal opacification of the main, lobar, and segmental pulmonary arterial tree.',
        findings: '<p>1. Main pulmonary trunk, right and left pulmonary arteries, and all visualized lobar/segmental branches demonstrate homogeneous contrast filling without filling defects.</p><p>2. Right ventricle to left ventricle diameter ratio is within normal limits (< 1.0); no right ventricular strain.</p><p>3. Lungs are clear without wedge-shaped peripheral infarct or consolidation.</p>',
        impression: '<p><strong>IMPRESSION:</strong></p><ol><li>Negative for acute pulmonary embolism to the subsegmental arterial level.</li><li>No right heart strain or secondary pulmonary parenchymal abnormality.</li></ol>',
      },
    },
  },
];

/**
 * Matches free-text clinical history against cross-sectional radiology protocols.
 */
export function matchCTMRIRules(clinicalHistory: string): CTMRIRuleMatch | null {
  if (!clinicalHistory) return null;
  const lower = clinicalHistory.toLowerCase();

  for (const item of CROSS_SECTIONAL_RULES) {
    const matched = item.keywords.some((kw) => lower.includes(kw));
    if (matched) {
      return item.rule;
    }
  }

  // Fallback generic CT
  return null;
}

export function getAllCrossSectionalRules(): CTMRIRuleMatch[] {
  return CROSS_SECTIONAL_RULES.map((r) => r.rule);
}
