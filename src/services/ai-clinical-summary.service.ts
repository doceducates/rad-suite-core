// Layer 2 (Domain/Services): Server-side AI Clinical Diagnosis Highlight Synthesis
import { callAICompletion } from '@/services/ai-router.service';
import { extractDiagnosisHighlight } from '@/lib/clinical-summary';

/**
 * Synthesizes a high-yield, 1-line clinical diagnosis takeaway:
 * [Site] + [Pathology] + [Key Neural/Structural Impact]
 * using the configured AI router (OpenRouter/Local), falling back
 * gracefully to deterministic Saba extraction if offline or disabled.
 */
export async function generateAiDiagnosisHighlight(
  findings: string,
  impression: string
): Promise<string> {
  const fallback = extractDiagnosisHighlight(impression || findings);

  if (!findings && !impression) {
    return '';
  }

  const prompt = `You are an expert diagnostic radiologist.
From the following radiology report findings and impression, synthesize an ultra-concise, single major diagnosis highlight (maximum 5-7 words, under 50 characters).
Rules:
- State ONLY the single primary pathology and anatomical site (e.g., "L4-L5 diffuse disc bulge" or "Acute right MCA infarct").
- Do NOT include secondary findings, explanations, or subordinate clauses ("with...", "causing...").
- Output ONE LINE only.
- Do NOT use bullet points, numbering, or preamble.
- Do NOT wrap in quotes.

Findings:
${findings ? findings.slice(0, 800) : 'None'}

Impression:
${impression ? impression.slice(0, 800) : 'None'}

Key Diagnosis Highlight:`;

  try {
    const response = await callAICompletion(
      {
        systemPrompt: 'You are an expert diagnostic radiologist. Output a 1-line ultra-concise diagnosis takeaway only (under 50 chars).',
        userPrompt: prompt,
        maxTokens: 50,
        temperature: 0.1,
      },
      'copilot'
    );

    if (response && typeof response === 'string') {
      const cleaned = response
        .replace(/^["'`]|["'`]$/g, '')
        .replace(/\r?\n.*/s, '')
        .replace(/^(\s*[-•*–—]|\s*\d+[\.\)\-:]|\s*\[\s*\d+\s*\])\s*/i, '')
        .trim();

      if (cleaned.length > 3) {
        if (cleaned.length <= 50) return cleaned;
        return cleaned.slice(0, 48).replace(/[,\s:;.-]+$/, '').trim() + '...';
      }
    }
  } catch (err) {
    // Air-gapped fallback / graceful degradation
    console.warn('[DIAGNOSIS_HIGHLIGHT_AI_WARN] AI synthesis fell back to deterministic parser:', err);
  }

  return fallback;
}
