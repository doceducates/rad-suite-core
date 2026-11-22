import { CrossSectionalTemplate } from '@/types/templates';
import {
  MASTER_TEMPLATE_CATALOG,
  CT_TEMPLATES,
  MRI_TEMPLATES,
} from '../templates/catalog.data';
import {
  getTemplateById,
  searchAllTemplates,
  getTemplatesByModality,
} from '../template-manager.service';

export const STANDARDIZED_CT_TEMPLATES: CrossSectionalTemplate[] = CT_TEMPLATES;
export const STANDARDIZED_MRI_TEMPLATES: CrossSectionalTemplate[] = MRI_TEMPLATES;
export const MASTER_CROSS_SECTIONAL_TEMPLATES: CrossSectionalTemplate[] = MASTER_TEMPLATE_CATALOG;

export function getStandardizedTemplateById(id: string): CrossSectionalTemplate | undefined {
  return getTemplateById(id);
}

export function getStandardizedTemplatesByModality(
  modality: 'CT' | 'MRI' | 'ALL'
): CrossSectionalTemplate[] {
  return getTemplatesByModality(modality);
}

export function searchStandardizedTemplates(
  query: string,
  modality: 'CT' | 'MRI' | 'ALL' = 'ALL',
  subspecialty: string = 'ALL'
): CrossSectionalTemplate[] {
  return searchAllTemplates(query, modality, subspecialty);
}

export { mergeCrossSectionalTemplates } from '../template-merger.service';
