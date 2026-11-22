/**
 * Structured Quick Templates for Clinical Workstation & Quick Report Modal
 * Powered by the Single Source of Truth Template Catalog with Option B Clean Clinical Paragraphs.
 */

import {
  MASTER_TEMPLATE_CATALOG,
  getTemplateById,
  findTemplateForStudy as findDomainTemplateForStudy,
} from '@/services/template-manager.service';
import { CrossSectionalTemplate } from '@/types/templates';

export interface StructuredTemplate {
  technique?: string;
  findings: string;
  impression: string;
}

function convertToStructuredTemplate(tpl: CrossSectionalTemplate): StructuredTemplate {
  return {
    technique: tpl.technique,
    findings: tpl.normalFindings.join('\n\n'),
    impression: tpl.defaultImpression,
  };
}

// Canonical map for all master templates by Name and by ID
export const WORKLIST_TEMPLATES: Record<string, StructuredTemplate> = {};

// Populate all master templates
for (const tpl of MASTER_TEMPLATE_CATALOG) {
  const structured = convertToStructuredTemplate(tpl);
  WORKLIST_TEMPLATES[tpl.name] = structured;
  WORKLIST_TEMPLATES[tpl.id] = structured;
}

// Backwards-compatible legacy quick aliases
const LEGACY_ALIASES: Record<string, string> = {
  'CT Brain: Normal': 'ct-brain-plain',
  'CT Chest: Normal': 'ct-chest-cect',
  'CT Abdomen & Pelvis: Normal': 'ct-abdomen-pelvis-cect',
  'CT KUB: Normal': 'ct-kub-plain',
  'CT Cervical Spine: Normal': 'ct-cervical-spine',
  'CT Lumbar Spine: Normal': 'ct-lumbar-spine',
  'MRI Brain: Normal': 'mri-brain-routine',
  'MRI Cervical Spine: Normal': 'mri-cervical-spine',
  'MRI Thoracic Spine: Normal': 'mri-thoracic-spine',
  'MRI Lumbar Spine: Normal': 'mri-lumbar-spine',
  'MRI Knee: Normal': 'mri-knee',
  'MRI Shoulder: Normal': 'mri-shoulder',
  'MRCP: Normal': 'mrcp',
};

for (const [alias, id] of Object.entries(LEGACY_ALIASES)) {
  const tpl = getTemplateById(id);
  if (tpl) {
    WORKLIST_TEMPLATES[alias] = convertToStructuredTemplate(tpl);
  }
}

// Add standard plain film X-Ray chest PA fallback
WORKLIST_TEMPLATES['X-Ray Chest PA: Normal'] = {
  technique: 'Standard posteroanterior (PA) erect projection of the chest.',
  findings: `LUNGS & PLEURA:
The lungs are clear and symmetrically aerated. No focal parenchymal consolidation, mass lesion, or pneumothorax is identified.
Both costophrenic angles and cardiophrenic sulci are sharp. No pleural effusion is seen.

MEDIASTINUM & CARDIAC SILHOUETTE:
The cardiac silhouette is within normal limits of size and shape (cardiothoracic ratio < 50%).
The aortic knob and superior mediastinal contours appear normal. Trachea is central.

OSSEOUS STRUCTURES & SOFT TISSUES:
The visualized thoracic cage, clavicles, ribs, and shoulders demonstrate normal architecture with no acute fracture.
Visualized soft tissues and diaphragmatic domes are normal in position and contour.`,
  impression: 'Normal posteroanterior (PA) chest radiograph. No acute cardiopulmonary abnormality.',
};

/**
 * Auto-detects the best structured template based on modality and scan description.
 */
export function findBestTemplateForStudy(
  modality: string = '',
  scanType: string = ''
): { key: string; template: StructuredTemplate } | null {
  const mod = modality.toUpperCase().trim();
  const desc = scanType.toLowerCase().trim();

  // X-Ray fallback
  if (['CR', 'DX', 'XR', 'X-RAY'].includes(mod)) {
    if (/chest|thorax/i.test(desc)) {
      return { key: 'X-Ray Chest PA: Normal', template: WORKLIST_TEMPLATES['X-Ray Chest PA: Normal'] };
    }
  }

  // Cross-sectional CT & MRI match
  const matched = findDomainTemplateForStudy(modality, scanType);
  if (matched) {
    return {
      key: matched.name,
      template: convertToStructuredTemplate(matched),
    };
  }

  return null;
}
