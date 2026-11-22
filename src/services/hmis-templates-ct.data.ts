import { HmisNormalTemplate } from '@/types/templates';
import { CT_TEMPLATES, resolveTemplateId } from './templates/catalog.data';

const HMIS_CT_IDS = [
  'ct-kub-plain',
  'ct-brain-plain',
  'ct-abdomen-pelvis-cect',
  'ct-hrct-thorax',
  'ct-pns',
  'ct-cervical-spine',
  'ct-lumbar-spine',
  'ct-facial-bones',
  'ct-neck-cect',
  'ct-pulmonary-angio',
  'ct-angio-brain-carotids',
  'ct-ivu-contrast',
  'ct-temporal-bones',
];

export const HMIS_CT_TEMPLATES: HmisNormalTemplate[] = HMIS_CT_IDS.map((id) => {
  const resolved = resolveTemplateId(id);
  const found = CT_TEMPLATES.find((t) => t.id === resolved || t.id === id);
  if (!found) throw new Error(`Template not found in master catalog: ${id}`);
  return found;
});
