import { CrossSectionalTemplate, HmisNormalTemplate } from '@/types/templates';
import {
  MASTER_TEMPLATE_CATALOG,
  CT_TEMPLATES,
  MRI_TEMPLATES,
  resolveTemplateId,
} from './templates/catalog.data';
import { mergeCrossSectionalTemplates } from './template-merger.service';

const STORAGE_KEY = 'radsuite_custom_templates_v1';

function getCustomTemplates(): CrossSectionalTemplate[] {
  if (typeof window === 'undefined') return [];
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    return raw ? JSON.parse(raw) : [];
  } catch {
    return [];
  }
}

function saveCustomTemplates(templates: CrossSectionalTemplate[]): void {
  if (typeof window === 'undefined') return;
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(templates));
  } catch (err) {
    console.error('Failed to persist custom templates:', err);
  }
}

export function getAllTemplatesWithCustom(): CrossSectionalTemplate[] {
  const custom = getCustomTemplates();
  return [...custom, ...MASTER_TEMPLATE_CATALOG];
}

export function getTemplateById(id: string): CrossSectionalTemplate | undefined {
  const resolved = resolveTemplateId(id);
  const all = getAllTemplatesWithCustom();
  return all.find((t) => t.id === resolved || t.id === id);
}

export function searchAllTemplates(
  query: string,
  modality: 'CT' | 'MRI' | 'ALL' = 'ALL',
  subspecialty: string = 'ALL'
): CrossSectionalTemplate[] {
  const all = getAllTemplatesWithCustom();
  const q = query.toLowerCase().trim();
  return all.filter((t) => {
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

export function getTemplatesByModality(modality: 'CT' | 'MRI' | 'ALL'): CrossSectionalTemplate[] {
  return searchAllTemplates('', modality);
}

/**
 * Detects whether a clinical requisition or study description specifies IV contrast administration.
 */
export function isContrastStudy(description: string = ''): boolean {
  if (!description) return false;
  const desc = description.toLowerCase().trim();

  // Explicit negative indicators (plain / unenhanced) take absolute precedence
  if (
    /\b(?:plain|without\s*contrast|non-contrast|non\s*contrast|w\/o\s*contrast|ncct|no\s*contrast|unenhanced)\b/i.test(
      desc
    )
  ) {
    return false;
  }

  // Positive indicators for contrast enhancement (handling symbol prefix '+' properly without leading \b before '+')
  return /(?:\bwith\s*contrast\b|\+\s*c\b|\+\s*contrast\b|\bcontrast\b|\bcect\b|\bcemri\b|\bcontrast\s*enhanced\b|\bgadolinium\b|\bgad\b|\btriphasic\b|\bmultiphasic\b|\bangio\b|\bctpa\b|\bangiogram\b|\bangiography\b)/i.test(
    desc
  );
}

/**
 * Intelligent study matcher that maps real-world PACS / HMIS study descriptions
 * directly to the appropriate official template, accurately distinguishing between
 * plain (non-contrast) and contrast-enhanced examinations.
 */
export function findTemplateForStudy(modality: string = '', studyDescription: string = ''): CrossSectionalTemplate | undefined {
  const mod = modality.toUpperCase().trim();
  const desc = studyDescription.toLowerCase().trim();
  const isContrast = isContrastStudy(desc);
  const all = getAllTemplatesWithCustom();

  const isCt = mod === 'CT';
  const isMr = mod === 'MR' || mod === 'MRI';

  if (isCt) {
    if (/brain|head|trauma|stroke|cranial|skull|cod/i.test(desc)) {
      return isContrast
        ? (getTemplateById('ct-brain-cect') || getTemplateById('ct-brain-plain'))
        : getTemplateById('ct-brain-plain');
    }
    if (/pulmonary\s*angio|ctpa|pe\s*protocol/i.test(desc)) return getTemplateById('ct-pulmonary-angiogram');
    if (/hrct|interstitial|fibrosis/i.test(desc)) return getTemplateById('ct-hrct-chest');
    if (/chest|thorax|lung/i.test(desc)) {
      return isContrast
        ? getTemplateById('ct-chest-cect')
        : (getTemplateById('ct-hrct-chest') || getTemplateById('ct-chest-cect'));
    }
    if (/kub|stone|calculus/i.test(desc)) return getTemplateById('ct-kub-plain');
    if (/renal\s*protocol|3\s*phase\s*kidney|triphasic\s*renal/i.test(desc)) return getTemplateById('ct-renal-protocol');
    if (/renal\s*angio|donor/i.test(desc)) return getTemplateById('ct-renal-angio');
    if (/abdo.*pelv|pelv.*abdo/i.test(desc)) return getTemplateById('ct-abdomen-pelvis-cect');
    if (/pelvis|pelvic/i.test(desc)) return getTemplateById('ct-pelvis');
    if (/abdomen|liver|pancreas|spleen/i.test(desc)) return getTemplateById('ct-abdomen-pelvis-cect');
    if (/angio.*abdo|aorta/i.test(desc)) return getTemplateById('ct-angio-abdomen');
    if (/angio.*upper|upper\s*limb\s*angio/i.test(desc)) return getTemplateById('ct-angio-upper-limb');
    if (/angio.*lower|runoff|peripheral\s*angio/i.test(desc)) return getTemplateById('ct-angio-lower-limb');
    if (/c-spine|cervical/i.test(desc)) return getTemplateById('ct-cervical-spine');
    if (/l-spine|lumbar|lumbosacral/i.test(desc)) return getTemplateById('ct-lumbar-spine');
    if (/pns|paranasal|sinus/i.test(desc)) return getTemplateById('ct-pns');
    if (/temporal|mastoid|iac/i.test(desc)) return getTemplateById('ct-temporal-bones');
    if (/orbit/i.test(desc)) return getTemplateById('ct-orbits');
    if (/facial|face/i.test(desc)) return getTemplateById('ct-facial-bones');
    if (/neck/i.test(desc)) return getTemplateById('ct-neck-cect');
    return all.find((t) => t.modality === 'CT');
  }

  if (isMr) {
    if (/mrcp|biliary|pancreat/i.test(desc)) return getTemplateById('mrcp');
    if (/mra|angio.*brain|circle\s*of\s*willis/i.test(desc)) return getTemplateById('mra-brain');
    if (/mrv|venogram|venous/i.test(desc)) return getTemplateById('mrv-brain');
    if (/spectroscopy|mrs/i.test(desc)) return getTemplateById('mr-spectroscopy-brain');
    if (/stroke|infarct|dwi/i.test(desc)) return getTemplateById('mri-brain-stroke');
    if (/brain|head|cranial/i.test(desc)) {
      return isContrast
        ? (getTemplateById('mri-brain-contrast') || getTemplateById('mri-brain-plain'))
        : (getTemplateById('mri-brain-plain') || getTemplateById('mri-brain-contrast'));
    }
    if (/c-spine|cervical/i.test(desc)) {
      return isContrast
        ? (getTemplateById('mri-cervical-spine-contrast') || getTemplateById('mri-cervical-spine'))
        : getTemplateById('mri-cervical-spine');
    }
    if (/d-spine|thoracic|dorsal/i.test(desc)) return getTemplateById('mri-thoracic-spine');
    if (/l-spine|lumbar|ls-spine|lumbosacral/i.test(desc)) {
      return isContrast
        ? (getTemplateById('mri-lumbar-spine-contrast') || getTemplateById('mri-lumbar-spine'))
        : getTemplateById('mri-lumbar-spine');
    }
    if (/whole\s*spine|screening\s*spine/i.test(desc)) return getTemplateById('mri-whole-spine');
    if (/brachial/i.test(desc)) return getTemplateById('mri-brachial-plexus');
    if (/shoulder/i.test(desc)) return getTemplateById('mri-shoulder');
    if (/knee/i.test(desc)) return getTemplateById('mri-knee');
    if (/hip/i.test(desc)) return getTemplateById('mri-hip');
    if (/si\s*joint|sacroiliac/i.test(desc)) return getTemplateById('mri-si-joints');
    if (/elbow/i.test(desc)) return getTemplateById('mri-elbow');
    if (/wrist/i.test(desc)) return getTemplateById('mri-wrist');
    if (/hand/i.test(desc)) return getTemplateById('mri-hand');
    if (/ankle|foot/i.test(desc)) return getTemplateById('mri-ankle-foot');
    if (/femur|thigh/i.test(desc)) return getTemplateById('mri-femur');
    if (/tibia|fibula|leg/i.test(desc)) return getTemplateById('mri-tibia-fibula');
    if (/humerus|arm/i.test(desc)) return getTemplateById('mri-humerus');
    if (/forearm/i.test(desc)) return getTemplateById('mri-forearm');
    if (/fistulogram|perianal|fistula/i.test(desc)) return getTemplateById('mri-fistulogram');
    if (/breast/i.test(desc)) return getTemplateById('mri-breast');
    if (/enterography|mru|small\s*bowel/i.test(desc)) return getTemplateById('mri-enterography');
    if (/abdo.*pelv/i.test(desc)) return getTemplateById('mri-abdomen-pelvis');
    if (/pelvis.*male|prostate/i.test(desc)) return getTemplateById('mri-pelvis-male');
    if (/pelvis|uterus|ovary|gyn/i.test(desc)) return getTemplateById('mri-pelvis-female');
    if (/orbit/i.test(desc)) return getTemplateById('mri-orbits');
    if (/pns|sinus/i.test(desc)) return getTemplateById('mri-pns');
    if (/temporal|iac/i.test(desc)) return getTemplateById('mri-temporal-bones');
    if (/neck/i.test(desc)) return getTemplateById('mri-neck');
    return all.find((t) => t.modality === 'MRI');
  }

  return undefined;
}

export function addCustomTemplate(template: Omit<CrossSectionalTemplate, 'id'>): CrossSectionalTemplate {
  const custom = getCustomTemplates();
  const newTemplate: CrossSectionalTemplate = {
    ...template,
    id: `custom-${Date.now()}`,
  };
  saveCustomTemplates([newTemplate, ...custom]);
  return newTemplate;
}

export function updateCustomTemplate(template: CrossSectionalTemplate): boolean {
  const custom = getCustomTemplates();
  const index = custom.findIndex((t) => t.id === template.id);
  if (index === -1) return false;
  custom[index] = template;
  saveCustomTemplates(custom);
  return true;
}

export function deleteCustomTemplate(id: string): boolean {
  const custom = getCustomTemplates();
  const filtered = custom.filter((t) => t.id !== id);
  if (filtered.length === custom.length) return false;
  saveCustomTemplates(filtered);
  return true;
}

export const mergeTemplates = mergeCrossSectionalTemplates;

export {
  MASTER_TEMPLATE_CATALOG,
  CT_TEMPLATES,
  MRI_TEMPLATES,
  resolveTemplateId,
  mergeCrossSectionalTemplates,
};
