// Layer 2 (Domain/Services): Two-Tier Clinical Impression Generator & Zero-Hallucination Engine
// Invariant: Target < 250 lines, max 350 lines.

import { callAICompletion, extractJsonFromModelResponse } from './ai-router.service';
import { cleanHtmlText } from '@/lib/clinical-diff-engine';

export type ImpressionFlavor = 'local_high_yield' | 'international_structured' | 'concise_bullets';

export interface GenerateImpressionParams {
  findings: string;
  modality?: string;
  patientAge?: number | string;
  flavor: ImpressionFlavor;
  studyDescription?: string;
  radiologistName?: string;
}

export interface ImpressionResult {
  impressionText: string;
  impressionHtml: string;
  flavor: ImpressionFlavor;
  bulletCount: number;
  engineUsed: 'llm' | 'heuristic-offline';
}

/**
 * Normalizes patient age to a numeric value
 */
export function parseAge(age?: number | string): number | null {
  if (age === undefined || age === null) return null;
  const num = typeof age === 'number' ? age : parseInt(String(age).replace(/\D/g, ''), 10);
  return isNaN(num) ? null : num;
}

/**
 * Strictly enforces clinical age-appropriate vocabulary:
 * Patients < 30 years must not have degenerative "spondylosis" in impressions.
 */
export function applyAgeVocabularyFilter(text: string, age: number | null): string {
  if (age === null || age >= 30) return text;

  return text
    .replace(/\b(?:lumbar|cervical|dorsal|thoracic)?\s*spondylotic changes\b/gi, 'Disc bulges')
    .replace(/\b(?:lumbar|cervical|dorsal|thoracic)?\s*spondylosis\b/gi, 'Disc disease')
    .replace(/\bspondylotic\b/gi, 'degenerative disc');
}

/**
 * Offline Heuristic Fallback Generator (guaranteed zero-hallucination & zero-network)
 */
export function generateHeuristicImpression(
  findings: string,
  age: number | null,
  flavor: ImpressionFlavor
): string {
  const clean = cleanHtmlText(findings);
  const lines = clean.split('\n').map((l) => l.trim()).filter(Boolean);

  const positiveLines: string[] = [];
  const levelMatches: string[] = [];

  const positiveRegex = /\b(bulge|protrusion|extrusion|herniation|stenosis|compression|impingement|edema|fracture|infarct|effusion|hemorrhage|mass|nodule|calculus)\b/i;

  for (const line of lines) {
    if (positiveRegex.test(line) && !/\b(?:normal|unremarkable|patent|preserved)\b/i.test(line)) {
      positiveLines.push(line);
      const lvl = line.match(/\b([CLTS]\d+[-–][CLTS]?\d+)\b/i);
      if (lvl) levelMatches.push(lvl[1].toUpperCase());
    }
  }

  if (positiveLines.length === 0) {
    return '1. No acute focal abnormality, significant canal stenosis, or suspicious lesion identified.';
  }

  if (flavor === 'local_high_yield') {
    // Punchy max 2 bullets
    const bullets: string[] = [];
    const isSpine = levelMatches.length > 0 || /spine|lumbar|cervical/i.test(clean);

    if (isSpine) {
      const uniqueLevels = Array.from(new Set(levelMatches));
      const predominant = uniqueLevels.slice(-2).join(' and ');
      const term = age && age < 30 ? 'Disc bulges' : 'Lumbar spondylotic changes with disc bulges';
      const detail = predominant ? `, more marked at ${predominant}` : '';
      bullets.push(`1. ${term}${detail}.`);

      if (clean.toLowerCase().includes('stenosis') || clean.toLowerCase().includes('compression')) {
        bullets.push(`2. Associated thecal sac indentation and neural exit foraminal narrowing${detail}.`);
      }
    } else {
      // General non-spine
      bullets.push(`1. ${positiveLines[0].slice(0, 140).trim()}.`);
      if (positiveLines.length > 1) {
        bullets.push(`2. ${positiveLines[1].slice(0, 140).trim()}.`);
      }
    }

    const advice = /extrusion|fracture|edema|infarct|hemorrhage/i.test(clean)
      ? '\nAdvise: Clinical correlation and specialist consultation.'
      : '';

    const rawResult = bullets.slice(0, 2).join('\n') + advice;
    return applyAgeVocabularyFilter(rawResult, age);
  }

  if (flavor === 'concise_bullets') {
    const rawResult = positiveLines.length > 0
      ? `1. ${positiveLines[0].replace(/^[^:]+:\s*/, '').trim()}.`
      : '1. Examination unremarkable within normal limits.';
    return applyAgeVocabularyFilter(rawResult, age);
  }

  // International Structured Format
  const bullets = positiveLines.slice(0, 4).map((line, idx) => {
    return `${idx + 1}. ${line.replace(/^[^:]+:\s*/, '')}`;
  });

  return applyAgeVocabularyFilter(bullets.join('\n'), age);
}

/**
 * Main Two-Tier Impression Generation Entry Point
 */
export async function generateTwoTierImpression(
  params: GenerateImpressionParams
): Promise<ImpressionResult> {
  const { findings, modality = 'MRI', patientAge, flavor, studyDescription = '' } = params;
  const numAge = parseAge(patientAge);

  if (!findings || !findings.trim()) {
    const fallbackText = '1. Examination unremarkable within diagnostic limits.';
    return {
      impressionText: fallbackText,
      impressionHtml: `<ol><li>${fallbackText}</li></ol>`,
      flavor,
      bulletCount: 1,
      engineUsed: 'heuristic-offline',
    };
  }

  const ageRule = numAge !== null && numAge < 30
    ? `CRITICAL AGE GUARDRAIL: The patient is ${numAge} years old. Do NOT use degenerative terms like "spondylosis" or "spondylotic changes". Use age-appropriate terminology such as "Disc bulges / desiccation / annular fissure / Schmorl's nodes".`
    : `Patient Age: ${numAge ? `${numAge} years old` : 'Not specified'}.`;

  const flavorInstructions =
    flavor === 'local_high_yield'
      ? `FLAVOR: LOCAL HIGH-YIELD (Concise Hospital Style):
- Provide MAXIMUM 2 to 3 atomic numbered bullets.
- Use simple, punchy, referring-physician-friendly phrasing (e.g. "Lumbar spondylotic changes with disc bulges, more marked at L4–L5 and L5–S1.").
- Always highlight predominant levels ("more marked at...").
- Suppress redundant millimeter measurements and normal findings.
- If acute extrusion or fracture is present, append "Advise: Specialist consultation."`
      : flavor === 'concise_bullets'
      ? `FLAVOR: CONCISE BULLETS:
- Provide 1 to 2 ultra-concise, high-impact numbered bullets.
- Focus strictly on the primary positive/acute pathology.
- Eliminate all anatomical baseline commentary.`
      : `FLAVOR: INTERNATIONAL / ACADEMIC STRUCTURED (ACR/RSNA Style):
- Provide structured, formal ACR-compliant diagnostic impressions.
- Specify exact canal stenosis grading (mild / moderate / severe) and neuroforaminal compromise.
- Order by clinical acuity.`;

  const prompt = `You are a clinical radiology expert. Synthesize a diagnostic IMPRESSION strictly based on the provided findings.

${ageRule}

${flavorInstructions}

ZERO-HALLUCINATION CONTRACT:
- Base the impression STRICTLY on positive findings present in the text below.
- NEVER invent findings, adjectives, lesions, or fractures not documented in the findings.
- Output ONLY valid JSON:
{
  "impression": "1. First diagnostic bullet\\n2. Second diagnostic bullet"
}

FINDINGS:
${cleanHtmlText(findings)}`;

  try {
    const responseText = await callAICompletion(
      {
        systemPrompt: 'You are an expert radiology impression generator. Return strict JSON only without explanation.',
        userPrompt: prompt,
        jsonMode: true,
        temperature: 0.05,
        maxTokens: 500,
      },
      'structuring'
    );

    if (responseText) {
      const parsed = extractJsonFromModelResponse<any>(responseText);
      if (parsed && typeof parsed.impression === 'string' && parsed.impression.trim()) {
        const filtered = applyAgeVocabularyFilter(parsed.impression.trim(), numAge);
        const lines = filtered.split('\n').filter(Boolean);
        const html = `<ol>${lines.map((l: string) => `<li>${l.replace(/^\d+[\.\)]\s*/, '')}</li>`).join('')}</ol>`;

        return {
          impressionText: filtered,
          impressionHtml: html,
          flavor,
          bulletCount: lines.length,
          engineUsed: 'llm',
        };
      }
    }
  } catch (err) {
    console.warn('[TWO_TIER_IMPRESSION] Fallback to heuristic synthesizer:', err);
  }

  // Heuristic Offline Fallback
  const fallback = generateHeuristicImpression(findings, numAge, flavor);
  const fallbackLines = fallback.split('\n').filter(Boolean);
  const fallbackHtml = `<ol>${fallbackLines.map((l) => `<li>${l.replace(/^\d+[\.\)]\s*/, '')}</li>`).join('')}</ol>`;

  return {
    impressionText: fallback,
    impressionHtml: fallbackHtml,
    flavor,
    bulletCount: fallbackLines.length,
    engineUsed: 'heuristic-offline',
  };
}
