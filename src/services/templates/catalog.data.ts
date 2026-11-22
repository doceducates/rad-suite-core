import { CrossSectionalTemplate } from '@/types/templates';
import { CATALOG_CT_NEURO_TEMPLATES } from './catalog-ct-neuro.data';
import { CATALOG_CT_BODY_TEMPLATES } from './catalog-ct-body.data';
import { CATALOG_CT_VASC_SPINE_TEMPLATES } from './catalog-ct-vasc-spine.data';
import { CATALOG_MRI_NEURO_TEMPLATES } from './catalog-mri-neuro.data';
import { CATALOG_MRI_SPINE_TEMPLATES } from './catalog-mri-spine.data';
import { CATALOG_MRI_MSK_UPPER_TEMPLATES } from './catalog-mri-msk-upper.data';
import { CATALOG_MRI_MSK_LOWER_TEMPLATES } from './catalog-mri-msk-lower.data';
import { CATALOG_MRI_BODY_TEMPLATES } from './catalog-mri-body.data';
import { EXTENDED_CLINICAL_TEMPLATES } from './catalog-extended-modalities.data';

export const CT_TEMPLATES: CrossSectionalTemplate[] = [
  ...CATALOG_CT_NEURO_TEMPLATES,
  ...CATALOG_CT_BODY_TEMPLATES,
  ...CATALOG_CT_VASC_SPINE_TEMPLATES,
  ...EXTENDED_CLINICAL_TEMPLATES.filter((t) => t.modality === 'CT'),
];

export const MRI_TEMPLATES: CrossSectionalTemplate[] = [
  ...CATALOG_MRI_NEURO_TEMPLATES,
  ...CATALOG_MRI_SPINE_TEMPLATES,
  ...CATALOG_MRI_MSK_UPPER_TEMPLATES,
  ...CATALOG_MRI_MSK_LOWER_TEMPLATES,
  ...CATALOG_MRI_BODY_TEMPLATES,
  ...EXTENDED_CLINICAL_TEMPLATES.filter((t) => t.modality === 'MRI'),
];

export const MASTER_TEMPLATE_CATALOG: CrossSectionalTemplate[] = [
  ...CT_TEMPLATES,
  ...MRI_TEMPLATES,
];

// Transparent bidirectional alias mapping for historical and HMIS IDs
export const TEMPLATE_ALIASES: Record<string, string> = {
  'ct-hrct-thorax': 'ct-hrct-chest',
  'ct-pulmonary-angio': 'ct-pulmonary-angiogram',
  'ct-angio-brain-carotids': 'ct-neck-cect',
  'ct-ivu-contrast': 'ct-renal-protocol',
  'mri-brain-routine': 'mri-brain-plain',
  'mri-brain-plain-contrast': 'mri-brain-contrast',
  'mri-brain-epilepsy': 'mri-brain-plain',
  'mri-prostate-male': 'mri-pelvis-male',
  'mri-tmj': 'mri-face',
  'mri-knee-joint': 'mri-knee',
  'mri-shoulder-joint': 'mri-shoulder',
  'mri-dorsal-spine': 'mri-thoracic-spine',
  'mri-hip-joint': 'mri-hip',
  'mri-ankle': 'mri-ankle-foot',
  'mri-mrcp': 'mrcp',
  'mri-pelvis': 'mri-pelvis-female',
  'mri-wrist-joint': 'mri-wrist',
  'mri-elbow-joint': 'mri-elbow',
  'mri-foot-ankle': 'mri-ankle-foot',
  'mri-si-joint': 'mri-si-joints',
  'mri-both-si-joints': 'mri-si-joints',
};

export function resolveTemplateId(id: string): string {
  return TEMPLATE_ALIASES[id] || id;
}
