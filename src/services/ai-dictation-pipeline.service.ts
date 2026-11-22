import { callAICompletion, extractJsonFromModelResponse } from './ai-router.service';
import { getAISettings, DEFAULT_STRUCTURING_PROMPT } from './ai-settings.service';
import {
  inferRegionFromStudy,
  getEffectiveRegionPrompt,
} from './region-prompts.service';
import {
  cleanSpokenPunctuation,
  extractClinicalSections,
  formatClinicalFindingsHtml,
  normalizeImpressionList,
} from './clinical-dictation-formatter';

export interface DictationPipelineOptions {
  rawTranscript: string;
  modality: string;
  studyDescription?: string;
  clinicalHistory?: string;
  patientAge?: string;
  patientGender?: string;
  patientName?: string;
  radiologistName?: string;
}

export interface DictationPipelineResult {
  clinicalHistory?: string;
  technique: string;
  findings: string;
  impression: string;
  signOff?: string;
  correctedTerms: string[];
}

export async function processVoiceDictation(
  options: DictationPipelineOptions
): Promise<DictationPipelineResult> {
  const { rawTranscript, modality, studyDescription, clinicalHistory } = options;
  const cleanedRaw = cleanSpokenPunctuation(rawTranscript);
  const localSections = extractClinicalSections(cleanedRaw);

  const settings = getAISettings();
  const regionId = inferRegionFromStudy({
    modality,
    studyDescription,
    transcript: cleanedRaw,
  });
  const regionPrompt = getEffectiveRegionPrompt(regionId, settings.customRegionPrompts);

  // If user configured a general structuring override that differs from default
  const generalCustom = settings.customStructuringPrompt?.trim();
  const baseInstruction =
    generalCustom && generalCustom !== DEFAULT_STRUCTURING_PROMPT
      ? `${generalCustom}\n\nRegion-Specific Standards:\n${regionPrompt}`
      : regionPrompt;

  const patientDesc = [
    options.patientAge ? `${options.patientAge} years old` : '',
    options.patientGender || '',
  ].filter(Boolean).join(' ');

  const clinicianName = options.radiologistName || '';

  const finalUserPrompt = `${baseInstruction}

PATIENT & STUDY DETAILS:
- Patient Demographics: ${patientDesc || 'Not specified'}
- Modality: ${modality}
- Study: ${studyDescription || modality}
- Clinical History Provided: ${clinicalHistory || localSections.clinicalHistory || 'None provided'}
- Dictation / Findings: "${cleanedRaw}"
- Radiologist: ${clinicianName}

RULES FOR CLINICAL OUTPUT:
1. Return strict JSON only without explanation or reasoning.
2. KEYWORD & SHORTHAND EXPANSION: The radiologist usually speaks or types brief keywords or shorthand (e.g. "l4-l5 diffuse bulge recess stenosis left root compression, rest normal, left renal cyst 2.5cm, advise neurosurg"). You MUST expand these shorthand keywords into a complete, formal, beautifully phrased radiology report. For any organ systems or disc levels not mentioned, auto-fill the standard normal template findings (normal alignment, preserved vertebral heights, intact marrow signal, normal cord caliber/conus, unremarkable soft tissues).
3. clinicalHistory: Synthesize a concise 1-2 sentence formal clinical narrative incorporating patient demographics (e.g. "A 45-year-old male presenting with lower back pain radiating to left leg for 2 months.").
4. technique: Standard scan protocol for ${modality} ${studyDescription || ''} without intravenous contrast (or with contrast if dictated).
5. findings: Format formatted HTML with <h3>Technique</h3>, <h3>Findings</h3>, main <ul> bullets, and nested <ul> sub-bullets for levels/organ systems. Group normal/unremarkable levels together. BOLDING: Highlight key abnormal findings, stenosis, fractures, and nerve root compressions in <strong> tags (e.g. <strong>diffuse disc bulge</strong>). For spine examinations, systematically include an "Extraspinal Findings:" bullet for incidental retroperitoneal/renal/pelvic observations.
6. impression: CRITICAL: Concise, prioritized executive summary of positive/significant findings ONLY (1., 2.). If clinical advice, follow-up imaging, or specialist consultation is dictated or warranted by findings, ALWAYS append a separate unnumbered line starting with "Advise: " at the very end of the impression. NEVER omit the radiologist's advice or return placeholder text like "Imaging findings documented.".
7. signOff: "Reported by: ${clinicianName}"

JSON Schema:
{
  "clinicalHistory": "Formal narrative clinical history",
  "technique": "Scan protocol",
  "findings": "<p><strong>Technique:</strong> ...</p><h3>Findings</h3><ul><li><strong>[Section]:</strong> ...</li></ul>",
  "impression": "1. Primary diagnostic conclusion\\n2. Secondary positive finding\\nAdvise: Clinical correlation and neurosurgical evaluation.",
  "signOff": "Reported by: ${clinicianName}",
  "correctedTerms": ["term1 -> term2"]
}`;

  const responseText = await callAICompletion(
    {
      systemPrompt: 'You are an expert radiology structuring AI. Return only valid JSON without explanation.',
      userPrompt: finalUserPrompt,
      jsonMode: true,
      maxTokens: 1500,
      temperature: 0.1,
    },
    'structuring'
  );

  if (responseText) {
    const parsed = extractJsonFromModelResponse<any>(responseText);
    if (parsed) {
      let findingsStr = '';
      if (typeof parsed.findings === 'string') {
        findingsStr = parsed.findings;
      } else if (typeof parsed.findings === 'object' && parsed.findings !== null) {
        findingsStr = Object.entries(parsed.findings)
          .map(([k, v]) => {
            const title = k.replace(/_/g, ' ').replace(/\b\w/g, (c) => c.toUpperCase());
            if (typeof v === 'object' && v !== null) {
              const sub = Object.entries(v)
                .map(([sk, sv]) => `${sk.replace(/_/g, ' ')}: ${sv}`)
                .join('. ');
              return `<p><strong>${title}:</strong> ${sub}</p>`;
            }
            return `<p><strong>${title}:</strong> ${v}</p>`;
          })
          .join('');
      }

      let impressionStr = '';
      if (typeof parsed.impression === 'string') {
        impressionStr = parsed.impression;
      } else if (Array.isArray(parsed.impression)) {
        impressionStr = parsed.impression.map((v: any, i: number) => `${i + 1}. ${v}`).join('\n');
      } else if (typeof parsed.impression === 'object' && parsed.impression !== null) {
        let i = 1;
        impressionStr = Object.entries(parsed.impression)
          .map(([k, v]) => `${i++}. ${k.replace(/_/g, ' ')}: ${v}`)
          .join('\n');
      }

      // Ensure findings are properly structured into distinct HTML blocks with technique
      const effectiveTech = typeof parsed.technique === 'string' ? parsed.technique : localSections.technique;
      const structuredFindings = formatClinicalFindingsHtml(findingsStr || localSections.findings, modality, effectiveTech);
      let rawImpression = impressionStr || localSections.impression || '';
      if (!rawImpression || /imaging findings documented|findings finalized/i.test(rawImpression)) {
        rawImpression = localSections.impression || 'Diagnostic imaging findings documented as above.';
      }
      let structuredImpression = normalizeImpressionList(rawImpression);

      // Deterministic Safety: If user explicitly dictated advice/recommendation, ensure it is present
      const dictatedAdvice = cleanedRaw.match(/\b(?:advise|advice|recommendation|recommended)\s*[:\-]\s*([^\n\r]+)/i);
      if (dictatedAdvice && !/advise:/i.test(structuredImpression)) {
        const cleanAdviceText = dictatedAdvice[1].replace(/^[.,\s]+/, '').trim();
        structuredImpression = structuredImpression
          ? `${structuredImpression}\nAdvise: ${cleanAdviceText}`
          : `Advise: ${cleanAdviceText}`;
      }

      return {
        clinicalHistory: parsed.clinicalHistory || localSections.clinicalHistory || clinicalHistory,
        technique: effectiveTech || 'Standard volumetric cross-sectional protocol.',
        findings: structuredFindings,
        impression: structuredImpression,
        signOff: parsed.signOff || `Reported by: ${clinicianName}`,
        correctedTerms: Array.isArray(parsed.correctedTerms) ? parsed.correctedTerms : [],
      };
    }
  }

  // Deterministic Offline Rule Fallback
  const fallbackTech = localSections.technique || 'Standard volumetric cross-sectional protocol.';
  const fallbackFindings = formatClinicalFindingsHtml(localSections.findings, modality, fallbackTech);
  let fallbackImpression = normalizeImpressionList(localSections.impression || 'Diagnostic imaging findings documented as above.');
  const fallbackAdvice = cleanedRaw.match(/\b(?:advise|advice|recommendation|recommended)\s*[:\-]\s*([^\n\r]+)/i);
  if (fallbackAdvice && !/advise:/i.test(fallbackImpression)) {
    const cleanAdviceText = fallbackAdvice[1].replace(/^[.,\s]+/, '').trim();
    fallbackImpression = `${fallbackImpression}\nAdvise: ${cleanAdviceText}`;
  }

  return {
    clinicalHistory: localSections.clinicalHistory || clinicalHistory,
    technique: fallbackTech,
    findings: fallbackFindings,
    impression: fallbackImpression,
    signOff: `Reported by: ${clinicianName}`,
    correctedTerms: [],
  };
}
