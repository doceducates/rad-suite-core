import { HmisNormalTemplate } from '@/types/templates';
import { HMIS_CT_TEMPLATES } from './hmis-templates-ct.data';
import { HMIS_MRI_TEMPLATES } from './hmis-templates-mri.data';

export const ALL_HMIS_TEMPLATES: HmisNormalTemplate[] = [
  ...HMIS_CT_TEMPLATES,
  ...HMIS_MRI_TEMPLATES,
];

export function getHmisTemplateById(id: string): HmisNormalTemplate | undefined {
  return ALL_HMIS_TEMPLATES.find((t) => t.id === id);
}

export function getHmisTemplatesByModality(modality: 'CT' | 'MRI' | 'ALL'): HmisNormalTemplate[] {
  if (modality === 'ALL') return ALL_HMIS_TEMPLATES;
  return ALL_HMIS_TEMPLATES.filter((t) => t.modality === modality);
}

export function searchHmisTemplates(
  query: string,
  modality: 'CT' | 'MRI' | 'ALL' = 'ALL',
  subspecialty: string = 'ALL'
): HmisNormalTemplate[] {
  const q = query.toLowerCase().trim();
  return ALL_HMIS_TEMPLATES.filter((t) => {
    const matchesModality = modality === 'ALL' || t.modality === modality;
    const matchesSubspecialty = subspecialty === 'ALL' || t.subspecialty === subspecialty;
    const matchesQuery =
      !q ||
      t.name.toLowerCase().includes(q) ||
      t.subspecialty.toLowerCase().includes(q) ||
      t.description.toLowerCase().includes(q) ||
      t.defaultImpression.toLowerCase().includes(q);
    return matchesModality && matchesSubspecialty && matchesQuery;
  });
}
