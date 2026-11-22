// Layer 2: Master Sign-Out Templates Registry & Positive Finding Evaluator
import { SignoutTemplate, AnatomicalSection } from '@/types/signout';
import { MRI_LS_SPINE_TEMPLATE, MRI_CERVICAL_SPINE_TEMPLATE } from './signout-mri-spine.data';
import {
  MRI_BRAIN_TEMPLATE,
  MRI_KNEE_TEMPLATE,
  MRI_FISTULA_TEMPLATE,
  MRCP_TEMPLATE,
} from './signout-mri-brain-body.data';
import {
  CT_BRAIN_PLAIN_TEMPLATE,
  CT_CHEST_TEMPLATE,
  CT_ABDOMEN_PELVIS_TEMPLATE,
} from './signout-ct-templates.data';

export const ALL_SIGNOUT_TEMPLATES: Record<string, SignoutTemplate> = {
  'MRI Lumbosacral Spine': MRI_LS_SPINE_TEMPLATE,
  'MRI Cervical Spine': MRI_CERVICAL_SPINE_TEMPLATE,
  'MRI Brain': MRI_BRAIN_TEMPLATE,
  'MRI Knee': MRI_KNEE_TEMPLATE,
  'MRI Fistulogram': MRI_FISTULA_TEMPLATE,
  'MRCP': MRCP_TEMPLATE,
  'CT Brain Plain': CT_BRAIN_PLAIN_TEMPLATE,
  'CT Chest': CT_CHEST_TEMPLATE,
  'CT Abdomen Pelvis': CT_ABDOMEN_PELVIS_TEMPLATE,
};

export function findSignoutTemplate(queryOrModality?: string): SignoutTemplate | null {
  if (!queryOrModality) return null;
  const q = queryOrModality.toLowerCase();

  const isCt = q.includes('ct') || q.includes('computed tomography');

  // Specific Body Part Matches
  if (q.includes('chest') || q.includes('thorax') || q.includes('hrct') || q.includes('lung')) {
    return CT_CHEST_TEMPLATE;
  }
  if (q.includes('abdomen') || q.includes('pelvis') || q.includes('kub')) {
    return CT_ABDOMEN_PELVIS_TEMPLATE;
  }
  if (q.includes('fistula') || q.includes('perianal') || q.includes('fistulogram')) {
    return MRI_FISTULA_TEMPLATE;
  }
  if (q.includes('mrcp') || q.includes('biliary') || q.includes('pancrea')) {
    return MRCP_TEMPLATE;
  }
  if (q.includes('knee')) {
    return MRI_KNEE_TEMPLATE;
  }
  if (q.includes('cervical') || q.includes('c-spine') || q.includes('neck')) {
    return MRI_CERVICAL_SPINE_TEMPLATE;
  }
  if (q.includes('brain') || q.includes('head') || q.includes('stroke') || q.includes('trauma')) {
    return isCt ? CT_BRAIN_PLAIN_TEMPLATE : MRI_BRAIN_TEMPLATE;
  }
  if (q.includes('spine') || q.includes('lumbar') || q.includes('ls') || q.includes('back') || q.includes('lumbosacral')) {
    return MRI_LS_SPINE_TEMPLATE;
  }

  // Modality-based fallback
  if (isCt) {
    return CT_BRAIN_PLAIN_TEMPLATE;
  }
  return MRI_LS_SPINE_TEMPLATE;
}

export function getSignoutTemplate(queryOrModality?: string): SignoutTemplate {
  return findSignoutTemplate(queryOrModality) || MRI_LS_SPINE_TEMPLATE;
}

/**
 * Evaluates whether an anatomical section text contains a positive (abnormal) finding
 * by comparing against standardized and official HMIS normal baselines.
 */
export function isSectionPositive(
  currentText: string,
  section: AnatomicalSection,
  format: 'standardized' | 'hmis' = 'standardized'
): boolean {
  if (!currentText || !currentText.trim()) return false;
  const clean = currentText.toLowerCase().replace(/<[^>]*>/g, ' ').replace(/\s+/g, ' ').trim();
  const baseline = (format === 'hmis' ? section.normalHmis : section.normalStandardized)
    .toLowerCase()
    .replace(/\s+/g, ' ')
    .trim();

  // If text is verbatim or within normal baseline, it is not positive
  if (clean === baseline) return false;

  // Common positive pathology keywords
  const positiveKeywords = [
    'bulge', 'protrusion', 'extrusion', 'herniation', 'stenosis', 'effacement',
    'compression', 'edema', 'infarct', 'ischemi', 'hemorrhag', 'fracture',
    'tear', 'sprain', 'fistula', 'abscess', 'calculus', 'dilat', 'defect',
    'mass', 'lesion', 'osteophyte', 'spondylolisthesis', 'narrowing', 'impingement',
    'effusion', 'consolidation', 'pneumothorax', 'cholecystitis', 'appendicitis',
    'hyperintensity', 'hypoattenuation', 'restricted diffusion', 'hematoma'
  ];

  return positiveKeywords.some((kw) => clean.includes(kw));
}
