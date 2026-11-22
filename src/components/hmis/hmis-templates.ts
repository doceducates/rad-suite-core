/**
 * Radiology Reporting Quick Templates by HMIS Procedure Module ID (CT & MRI)
 * Linked to the Single Source of Truth Template Service.
 */

import { getTemplateById } from '@/services/template-manager.service';

export interface HmisReportTemplate {
  name: string;
  moduleId: string;
  modality: 'CT' | 'MRI';
  technique: string;
  findings: string;
  impression: string;
}

const MODULE_TO_CATALOG_ID: Record<string, { id: string; name: string; modality: 'CT' | 'MRI' }> = {
  '807': { id: 'ct-kub-plain', name: 'CT KUB', modality: 'CT' },
  '803': { id: 'ct-brain-plain', name: 'CT Brain', modality: 'CT' },
  '806': { id: 'ct-chest-cect', name: 'CT Chest', modality: 'CT' },
  '813': { id: 'ct-hrct-chest', name: 'HRCT Chest', modality: 'CT' },
  '805': { id: 'ct-abdomen-pelvis-cect', name: 'CT Abd & Pelvis', modality: 'CT' },
  '811': { id: 'ct-pns', name: 'CT PNS', modality: 'CT' },
  '792': { id: 'mri-lumbar-spine', name: 'MRI LS Spine', modality: 'MRI' },
  '789': { id: 'mri-brain-plain', name: 'MRI Brain', modality: 'MRI' },
  '791': { id: 'mri-cervical-spine', name: 'MRI C-Spine', modality: 'MRI' },
  '785': { id: 'mri-knee', name: 'MRI Knee', modality: 'MRI' },
};

export const HMIS_REPORT_TEMPLATES: Record<string, HmisReportTemplate> = {};

// Populate dynamically from master catalog
for (const [moduleId, info] of Object.entries(MODULE_TO_CATALOG_ID)) {
  const tpl = getTemplateById(info.id);
  if (tpl) {
    HMIS_REPORT_TEMPLATES[moduleId] = {
      name: info.name,
      moduleId,
      modality: info.modality,
      technique: tpl.technique,
      findings: tpl.normalFindings.join('\n\n'),
      impression: tpl.defaultImpression,
    };
  }
}

export function getDefaultTemplateForModule(moduleId: string): HmisReportTemplate {
  return HMIS_REPORT_TEMPLATES[moduleId] || HMIS_REPORT_TEMPLATES['803'] || {
    name: 'CT Brain',
    moduleId: '803',
    modality: 'CT',
    technique: 'Axial sequential non-contrast CT sections of the brain were obtained from skull base to vertex.',
    findings: 'Brain Parenchyma: No acute intracranial hemorrhage, territorial infarction, or mass effect seen.',
    impression: 'Normal non-contrast CT Brain study within normal limits.',
  };
}
