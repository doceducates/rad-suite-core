/**
 * AI Differential Diagnosis & Educational Knowledge Service
 * Layer 2 (Domain/Services) - Strictly under 250 lines invariant.
 *
 * Generates prioritized differential diagnoses, discriminative features,
 * and academic knowledge pearls (Fleischner, Bosniak, LI-RADS, BI-RADS)
 * to elevate the radiologist's diagnostic acumen.
 */

import {
  callAICompletion,
  extractJsonFromModelResponse,
} from './ai-router.service';
import { generateShadowDifferentials } from './report-analysis.service';

export interface DifferentialItem {
  diagnosis: string;
  likelihood: 'High' | 'Moderate' | 'Consider';
  rationale: string;
  discriminativeFeatures: string;
}

export interface KnowledgePearl {
  system: string; // e.g., 'Fleischner Society 2017', 'LI-RADS v2018', 'Bosniak v2019'
  guidance: string;
  recommendation: string;
}

export interface DifferentialDiagnosisResult {
  primaryDifferential: string;
  differentials: DifferentialItem[];
  knowledgePearls?: KnowledgePearl[];
  recommendedNextStep?: string;
  formattedBlock: string;
}

export async function generateDifferentialDiagnosis(
  findings: string,
  modality = 'CT',
  history?: string
): Promise<DifferentialDiagnosisResult> {
  const prompt = `You are a fellowship-trained academic radiologist.
Analyze these ${modality} findings and provide a prioritized differential diagnosis (DDx) with discriminative criteria and academic pearls.

Findings: "${findings}"
${history ? `Clinical History: "${history}"` : ''}

Return strict JSON format:
{
  "primaryDifferential": "Most likely diagnosis",
  "differentials": [
    {
      "diagnosis": "Diagnosis 1",
      "likelihood": "High",
      "rationale": "Key imaging findings supporting this",
      "discriminativeFeatures": "Features that distinguish or rule this out"
    },
    {
      "diagnosis": "Diagnosis 2",
      "likelihood": "Moderate",
      "rationale": "Supporting features",
      "discriminativeFeatures": "Distinguishing features"
    },
    {
      "diagnosis": "Diagnosis 3",
      "likelihood": "Consider",
      "rationale": "Pertinent alternative or mimic",
      "discriminativeFeatures": "Distinguishing features"
    }
  ],
  "knowledgePearls": [
    {
      "system": "ACR / Fleischner / Relevant Guideline",
      "guidance": "Key diagnostic criteria or staging rule",
      "recommendation": "Follow-up interval or protocol recommendation"
    }
  ],
  "recommendedNextStep": "E.g., Contrast CT, MRI, biopsy, or correlation with laboratory markers"
}`;

  const responseText = await callAICompletion({
    systemPrompt:
      'You are an academic radiologist providing prioritized differential diagnoses and educational criteria. Return strict JSON only.',
    userPrompt: prompt,
    jsonMode: true,
  });

  if (responseText) {
    const parsed = extractJsonFromModelResponse<any>(responseText);
    if (parsed && Array.isArray(parsed.differentials) && parsed.differentials.length > 0) {
      const formattedBlock =
        `<strong>Differential Considerations (${modality}):</strong><br/>` +
        parsed.differentials
          .map(
            (d: DifferentialItem, idx: number) =>
              `${idx + 1}. <strong>${d.diagnosis}</strong> (${d.likelihood}) - ${d.rationale}`
          )
          .join('<br/>') +
        (parsed.recommendedNextStep
          ? `<br/><em>Recommendation: ${parsed.recommendedNextStep}</em>`
          : '');

      return {
        primaryDifferential: parsed.primaryDifferential || parsed.differentials[0].diagnosis,
        differentials: parsed.differentials,
        knowledgePearls: Array.isArray(parsed.knowledgePearls) ? parsed.knowledgePearls : [],
        recommendedNextStep: parsed.recommendedNextStep,
        formattedBlock,
      };
    }
  }

  // Offline deterministic fallback
  const fallbackShadows = generateShadowDifferentials(findings, modality);
  const fallbackPearls: KnowledgePearl[] = [
    {
      system: `${modality} Diagnostic Practice Guideline`,
      guidance: 'Evaluate lesion morphology, margin definition, attenuation/signal intensity, and enhancement kinetics.',
      recommendation: 'Correlate with previous imaging studies and relevant laboratory parameters.',
    },
  ];

  return {
    primaryDifferential: fallbackShadows[0] || 'Indeterminate imaging finding requiring clinical correlation',
    differentials: fallbackShadows.map((s, idx) => ({
      diagnosis: s,
      likelihood: (idx === 0 ? 'High' : idx === 1 ? 'Moderate' : 'Consider') as DifferentialItem['likelihood'],
      rationale: `Clinical imaging presentation on ${modality} corresponds to ${s.toLowerCase()}.`,
      discriminativeFeatures: 'Correlate with patient clinical presentation, chronicity, and comparison priors.',
    })),
    knowledgePearls: fallbackPearls,
    recommendedNextStep: 'Comparison with prior imaging or clinical review recommended.',
    formattedBlock:
      `<strong>Differential Considerations (${modality}):</strong><br/>` +
      fallbackShadows.map((s, idx) => `${idx + 1}. ${s}`).join('<br/>'),
  };
}
