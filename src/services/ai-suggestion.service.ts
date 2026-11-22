/**
 * AI Suggestion Domain Service
 * Pure business logic for context-aware autocompletion and diagnostic structuring.
 * Integrates patient history, modality, regional templates, and drafted keywords.
 * Layer 2 (Domain/Services) - Under 250 lines invariant.
 */
import { callAICompletion } from './ai-router.service';
import { MASTER_TEMPLATE_CATALOG } from './templates/catalog.data';

export interface SuggestionContext {
  draftText: string;
  modality: string;
  clinicalHistory?: string;
  templateId?: string;
  patientAge?: number;
  patientGender?: string;
  activeSection?: 'history' | 'findings' | 'impression';
}

export interface SuggestionResult {
  suggestion: string;
  category: 'completion' | 'structured_finding' | 'impression';
  matchedOrgan?: string;
  modelUsed: string;
}

function findMatchingTemplate(modality: string, templateId?: string) {
  if (templateId) {
    const found = MASTER_TEMPLATE_CATALOG.find((t) => t.id === templateId);
    if (found) return found;
  }
  return MASTER_TEMPLATE_CATALOG.find(
    (t) => t.modality.toUpperCase() === modality.toUpperCase()
  );
}

export function heuristicSuggestionFallback(ctx: SuggestionContext): SuggestionResult {
  const { draftText, modality, activeSection } = ctx;
  const lower = draftText.toLowerCase();

  if (activeSection === 'impression' || lower.includes('impression')) {
    if (lower.includes('stone') || lower.includes('calculus')) {
      return {
        suggestion: '1. Cholelithiasis without acute cholecystitis.\n2. Otherwise unremarkable study for clinical correlation.',
        category: 'impression',
        modelUsed: 'heuristic-offline',
      };
    }
    return {
      suggestion: '1. No acute diagnostic abnormality identified within imaged scope.',
      category: 'impression',
      modelUsed: 'heuristic-offline',
    };
  }

  // Gallbladder / Liver keyword patterns
  if (lower.includes('gb') || lower.includes('gallbladder')) {
    return {
      suggestion: 'The gallbladder is normal in caliber with no wall thickening, pericholecystic fluid, or radio-opaque calculus.',
      category: 'structured_finding',
      matchedOrgan: 'Gallbladder',
      modelUsed: 'heuristic-offline',
    };
  }

  // Chest / Lungs keyword patterns
  if (lower.includes('lung') || lower.includes('chest') || lower.includes('infiltrat')) {
    return {
      suggestion: 'Lungs are clear bilaterally without focal consolidation, pleural effusion, or pneumothorax.',
      category: 'structured_finding',
      matchedOrgan: 'Lungs',
      modelUsed: 'heuristic-offline',
    };
  }

  // Brain / Neuro patterns
  if (modality === 'MRI' || lower.includes('brain') || lower.includes('head')) {
    return {
      suggestion: 'No acute intracranial hemorrhage, mass effect, or territorial acute infarct. Ventricles and sulci are unremarkable.',
      category: 'completion',
      matchedOrgan: 'Brain Parenchyma',
      modelUsed: 'heuristic-offline',
    };
  }

  return {
    suggestion: `Normal ${modality} survey. No acute focal lesion, osseous injury, or soft tissue abnormality identified.`,
    category: 'completion',
    modelUsed: 'heuristic-offline',
  };
}

export async function generateReportSuggestion(
  ctx: SuggestionContext
): Promise<SuggestionResult> {
  const { draftText, modality, clinicalHistory, templateId, patientAge, patientGender, activeSection } = ctx;

  if (!draftText.trim()) {
    return heuristicSuggestionFallback(ctx);
  }

  const template = findMatchingTemplate(modality, templateId);
  const templateSnippet = template
    ? `REGIONAL NORMAL TEMPLATE (${template.name}):\nFindings: ${template.normalFindings.slice(0, 3).join('\n')}\nDefault Impression: ${template.defaultImpression}`
    : '';

  const prompt = `You are an expert fellowship-trained radiologist.
The user is drafting a ${modality} report.
PATIENT CONTEXT:
- Modality: ${modality}
- History / Indication: ${clinicalHistory || 'None provided'}
- Patient: ${patientAge ? `${patientAge}yo` : 'Adult'} ${patientGender || ''}
- Active Section: ${activeSection || 'findings'}
${templateSnippet ? `\n${templateSnippet}` : ''}

USER'S DRAFTED KEYWORDS / NOTES:
"${draftText}"

TASK:
Convert the user's drafted keywords or partial notes into 1-2 concise, elegant, ACR/RadLex-compliant structured sentences.
- If raw abbreviations (e.g. "gb: 4mm stone, no fluid") are provided, expand into a standardized, polished medical sentence.
- If asking for impression, synthesize a numbered impression list based on positive pathology.
- Do NOT output preamble, conversational chat, or markdown headers. Output ONLY the suggested text to be inserted directly into the report editor.`;

  try {
    const response = await callAICompletion({
      systemPrompt: 'You are a radiology AI. Return ONLY the requested text without quotes or markdown headers.',
      userPrompt: prompt,
      temperature: 0.1,
    });
    const output = response?.trim();
    
    if (output) {
      return {
        suggestion: output,
        category: activeSection === 'impression' ? 'impression' : 'structured_finding',
        modelUsed: 'ai-router-model',
      };
    }
  } catch (error) {
    console.error('generateReportSuggestion error:', error);
  }

  return heuristicSuggestionFallback(ctx);
}
