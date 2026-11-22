import { describe, it, expect } from 'vitest';
import { getActiveAIProvider, analyzeReportWithRouter, extractJsonFromModelResponse } from '../ai-router.service';

describe('Universal AI Router Service', () => {
  it('detects default provider as local or env configured', () => {
    const provider = getActiveAIProvider();
    expect(['local', 'gemini', 'openai', 'openrouter', 'groq', 'offline-rules']).toContain(provider);
  });

  it('gracefully falls back to deterministic rule analysis when AI server is unreachable', async () => {
    // Left vs Right laterality contradiction in findings vs impression
    const findings = 'Acute subcortical hemorrhage noted in right basal ganglia.';
    const impression = 'Left basal ganglia intracerebral hematoma.';

    const result = await analyzeReportWithRouter(findings, impression, 'CT');
    expect(result.discrepancies.length).toBeGreaterThan(0);
    expect(result.discrepancies.some((d) => d.lateralityConflict)).toBe(true);
    expect(result.shadowDifferentials.length).toBeGreaterThan(0);
  });

  it('detects acute clinical contradictions even with offline heuristics', async () => {
    const findings = 'Lungs are completely clear bilaterally without consolidation or effusion.';
    const impression = 'Right lower lobe consolidation consistent with pneumonia.';

    const result = await analyzeReportWithRouter(findings, impression, 'CT');
    expect(result.discrepancies.length).toBeGreaterThan(0);
  });

  it('correctly extracts JSON from reasoning models with thought tags and markdown fences', () => {
    const reasoningOutput = `<thought>
The radiologist dictated liver lesion with arterial enhancement and washout.
This fits LI-RADS 5 hepatocellular carcinoma. Let me construct the JSON response.
</thought>
\`\`\`json
{
  "technique": "Multiphase liver protocol with IV contrast.",
  "findings": "3.2 cm observation in segment VII with arterial phase hyperenhancement and venous washout.",
  "impression": "1. LR-5 definite hepatocellular carcinoma.",
  "correctedTerms": ["HCC", "washout"]
}
\`\`\`
Hope this structured report helps!`;

    const parsed = extractJsonFromModelResponse<any>(reasoningOutput);
    expect(parsed).not.toBeNull();
    expect(parsed.technique).toContain('Multiphase');
    expect(parsed.impression).toContain('LR-5');
    expect(parsed.correctedTerms).toHaveLength(2);
  });
});

