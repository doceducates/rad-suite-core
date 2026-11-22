import { CrossSectionalTemplate } from '@/types/templates';
import {
  MASTER_TEMPLATE_CATALOG,
  CT_TEMPLATES,
  MRI_TEMPLATES,
  getTemplateById as getUnifiedTemplateById,
  getTemplatesByModality as getUnifiedTemplatesByModality,
  searchAllTemplates,
  mergeCrossSectionalTemplates,
} from './template-manager.service';

export const CROSS_SECTIONAL_TEMPLATES: CrossSectionalTemplate[] = MASTER_TEMPLATE_CATALOG;
export const STANDARDIZED_CT_TEMPLATES: CrossSectionalTemplate[] = CT_TEMPLATES;
export const STANDARDIZED_MRI_TEMPLATES: CrossSectionalTemplate[] = MRI_TEMPLATES;

export function getTemplateById(id: string): CrossSectionalTemplate | undefined {
  return getUnifiedTemplateById(id);
}

export function getTemplatesByModality(modality: 'CT' | 'MRI'): CrossSectionalTemplate[] {
  return getUnifiedTemplatesByModality(modality);
}

export const searchStandardizedTemplates = searchAllTemplates;
export { mergeCrossSectionalTemplates };
