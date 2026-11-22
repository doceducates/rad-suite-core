/**
 * Multi-Template Composition & Boundary Deduplication Engine
 * Allows seamless multi-region reporting (e.g., CT Chest + Abdomen + Pelvis, CT Brain + C-Spine)
 * without repetitive transition statements, duplicate bone baselines, or fractured impressions.
 */
import { CrossSectionalTemplate } from '@/types/templates';

const TRANSITION_PATTERNS = [
  /sections through (?:the )?lower chest/i,
  /visualized (?:sections through )?(?:lower )?neck/i,
  /visualized sections through (?:the )?base of (?:the )?skull/i,
  /visualized intracranial structures are grossly unremarkable/i,
  /visualized upper abdominal viscera are grossly unremarkable/i,
  /visualized lung bases are clear/i,
];

const OSSEOUS_PATTERNS = [
  /(?:visualized\s+)?osseous structures/i,
  /visualized bone window/i,
  /thoracic (?:osseous )?cage/i,
  /bone window/i,
];

export function mergeCrossSectionalTemplates(
  templates: CrossSectionalTemplate[],
  customName?: string
): CrossSectionalTemplate {
  if (!templates || templates.length === 0) {
    throw new Error('At least one template must be provided for merging.');
  }
  if (templates.length === 1) return templates[0];

  const modality = templates[0].modality;
  const isMultiModality = templates.some((t) => t.modality !== modality);
  if (isMultiModality) {
    throw new Error('Cross-sectional template merging across different modalities (CT + MRI) is not permitted.');
  }

  // 1. Synthesize Title & Subtitle
  const combinedName = customName || templates.map((t) => t.name.replace(/\(.*\)/, '').trim()).join(' + ');
  const combinedId = `composite-${templates.map((t) => t.id).join('-')}`;

  // 2. Synthesize Technique
  const techniquePieces = templates.map((t) => t.technique.trim());
  const unifiedTechnique = Array.from(new Set(techniquePieces)).join(' ');

  // 3. Deduplicate Normal Findings across transitional boundaries
  const rawFindings = templates.flatMap((t) => t.normalFindings);
  const filteredFindings: string[] = [];
  let addedUnifiedOsseous = false;

  for (const finding of rawFindings) {
    const isTransition = TRANSITION_PATTERNS.some((pattern) => pattern.test(finding));
    if (isTransition) {
      // Suppress transitional boundary stubs when full anatomical regions are co-imaged
      continue;
    }

    const isOsseous = OSSEOUS_PATTERNS.some((pattern) => pattern.test(finding));
    if (isOsseous) {
      if (!addedUnifiedOsseous) {
        filteredFindings.push(
          'Visualized axial and appendicular osseous structures demonstrate preserved cortical integrity without acute fracture, dislocation, or aggressive lytic/sclerotic lesion.'
        );
        addedUnifiedOsseous = true;
      }
      continue;
    }

    // Retain unique anatomical findings
    if (!filteredFindings.includes(finding)) {
      filteredFindings.push(finding);
    }
  }

  // 4. Synthesize & Renumber Unified Impression
  const impressionLines: string[] = [];
  for (const t of templates) {
    const lines = t.defaultImpression
      .split('\n')
      .map((l) => l.replace(/^\d+[\.\)]\s*/, '').trim())
      .filter((l) => l.length > 5);

    for (const line of lines) {
      if (!impressionLines.includes(line)) {
        impressionLines.push(line);
      }
    }
  }

  const numberedImpression = impressionLines.map((line, idx) => `${idx + 1}. ${line}`).join('\n');

  return {
    id: combinedId,
    name: combinedName,
    modality,
    subspecialty: templates[0].subspecialty,
    description: `Automated composite cross-sectional protocol merging ${templates.length} regional templates without redundancy.`,
    subtitle: `COMPOSITE ${templates.map((t) => t.subtitle || t.name).join(' / ')}`,
    technique: unifiedTechnique,
    normalFindings: filteredFindings,
    defaultImpression: numberedImpression,
  };
}
