import { HmisNormalTemplate } from '@/types/templates';
import { MRI_TEMPLATES, resolveTemplateId } from './templates/catalog.data';

const HMIS_MRI_IDS = [
  'mri-brain-plain-contrast',
  'mri-brain-stroke',
  'mri-brain-epilepsy',
  'mri-lumbar-spine',
  'mri-cervical-spine',
  'mri-thoracic-spine',
  'mri-knee',
  'mri-shoulder',
  'mri-pelvis-female',
  'mri-prostate-male',
  'mrcp',
  'mri-hip',
  'mri-ankle',
  'mri-tmj',
];

export const HMIS_MRI_TEMPLATES: HmisNormalTemplate[] = HMIS_MRI_IDS.map((id) => {
  const resolved = resolveTemplateId(id);
  const found = MRI_TEMPLATES.find((t) => t.id === resolved || t.id === id);
  if (!found) throw new Error(`Template not found in master catalog: ${id}`);
  return found;
});
