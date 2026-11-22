/**
 * Clinical Region Prompt Registry & Inference Service
 * Layer 2 (Domain/Services) - Strictly under 250 lines invariant.
 */

import {
  SPINE_LS_PROMPT,
  SPINE_CERVICAL_PROMPT,
  SPINE_DORSAL_PROMPT,
  BRAIN_PROMPT,
  CHEST_PROMPT,
  ABDOMEN_PROMPT,
} from '@/constants/clinical-region-prompts';

export interface RegionPromptDefinition {
  id: string;
  label: string;
  modality: string;
  description: string;
  defaultPrompt: string;
}

export const CLINICAL_REGION_CATALOG: RegionPromptDefinition[] = [
  {
    id: 'spine_ls',
    label: 'MRI Lumbosacral (LS) Spine',
    modality: 'MRI',
    description: 'Lordosis, listhesis, level-by-level discs (L1-S1), lateral recess & nerve roots, conus.',
    defaultPrompt: SPINE_LS_PROMPT,
  },
  {
    id: 'spine_cervical',
    label: 'MRI Cervical Spine',
    modality: 'MRI',
    description: 'Lordosis, craniovertebral junction, unco-vertebral joints, cord signal/myelopathy.',
    defaultPrompt: SPINE_CERVICAL_PROMPT,
  },
  {
    id: 'spine_dorsal',
    label: 'MRI Dorsal / Thoracic Spine',
    modality: 'MRI',
    description: 'Thoracic kyphosis, wedge collapse, thoracic discs, canal diameter & cord signal.',
    defaultPrompt: SPINE_DORSAL_PROMPT,
  },
  {
    id: 'brain',
    label: 'CT / MRI Brain',
    modality: 'CT/MRI',
    description: 'Parenchyma, gray-white differentiation, stroke/infarct, ventricles, extra-axial spaces.',
    defaultPrompt: BRAIN_PROMPT,
  },
  {
    id: 'chest',
    label: 'Chest CT / HRCT',
    modality: 'CT',
    description: 'Lungs, opacities, nodules, pleura, mediastinum, hila, lymph nodes, great vessels.',
    defaultPrompt: CHEST_PROMPT,
  },
  {
    id: 'abdomen',
    label: 'Abdomen & Pelvis CT',
    modality: 'CT',
    description: 'Liver, gallbladder, pancreas, spleen, kidneys, bowel loops, ascites, acute pathology.',
    defaultPrompt: ABDOMEN_PROMPT,
  },
];

/**
 * Automatically infers anatomical region from study metadata or text keywords.
 */
export function inferRegionFromStudy(input: {
  modality?: string;
  studyDescription?: string;
  bodyPart?: string;
  transcript?: string;
}): string {
  const text = `${input.studyDescription || ''} ${input.bodyPart || ''} ${input.transcript || ''}`.toLowerCase();

  // 1. Cervical Spine
  if (/(?:cervical|c-spine|neck|craniocervical|c1|c2|c3|c4|c5|c6|c7)/i.test(text)) {
    return 'spine_cervical';
  }

  // 2. Dorsal / Thoracic Spine
  if (/(?:dorsal|thoracic|t-spine|d-spine|mid-back|t1|t2|t3|t4|t5|t6|t7|t8|t9|t10|t11|t12)/i.test(text)) {
    return 'spine_dorsal';
  }

  // 3. Lumbosacral Spine
  if (/(?:lumbar|lumbosacral|ls spine|l-spine|low back|l1|l2|l3|l4|l5|s1|sciatica|radiculopathy|cauda)/i.test(text)) {
    return 'spine_ls';
  }

  // Generic spine
  if (/spine/i.test(text)) {
    return 'spine_ls';
  }

  // 4. Brain / Head
  if (/(?:brain|head|cranial|stroke|infarct|cerebr|calvarium|temporal|parietal|frontal|gcs)/i.test(text)) {
    return 'brain';
  }

  // 5. Chest / Lungs
  if (/(?:chest|lung|pulmonary|hrct|thorax|pneumo|pleura|mediastin)/i.test(text)) {
    return 'chest';
  }

  // 6. Abdomen / Pelvis
  if (/(?:abdomen|pelvis|kub|liver|cholecyst|gallbladder|renal|appendix|bowel)/i.test(text)) {
    return 'abdomen';
  }

  // Default based on modality
  const mod = (input.modality || '').toUpperCase();
  if (mod === 'MRI') return 'spine_ls';
  if (mod === 'CT') return 'abdomen';
  return 'brain';
}

/**
 * Returns the effective prompt for a given region (user customized or default).
 */
export function getEffectiveRegionPrompt(
  regionId: string,
  customRegionPrompts?: Record<string, string>
): string {
  if (customRegionPrompts && customRegionPrompts[regionId]?.trim()) {
    return customRegionPrompts[regionId].trim();
  }
  const item = CLINICAL_REGION_CATALOG.find((r) => r.id === regionId);
  return item ? item.defaultPrompt : SPINE_LS_PROMPT;
}
