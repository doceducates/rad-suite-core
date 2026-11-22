import { NextResponse } from 'next/server';
import { z } from 'zod';
import { withAuth } from '@/lib/api-handler';
import { callAICompletion, extractJsonFromModelResponse } from '@/services/ai-router.service';
import { getAISettings } from '@/services/ai-settings.service';
import { inferRegionFromStudy, getEffectiveRegionPrompt } from '@/services/region-prompts.service';
import {
  formatClinicalFindingsHtml,
  normalizeImpressionList,
  cleanSpokenPunctuation,
} from '@/services/clinical-dictation-formatter';
import { stripAttributionFromText } from '@/lib/clinical-format';
import { formatMedicalAbbreviations, applyMedicalBiasing } from '@/services/smart-dictation.service';
import { convertReportToStyle } from '@/services/template-style-engine.service';
import { applyAgeVocabularyFilter } from '@/services/two-tier-impression.service';

export const maxDuration = 300;

const PolishReportSchema = z.object({
  clinicalHistory: z.string().optional(),
  findings: z
    .string()
    .refine((f) => Boolean(f && f.replace(/<[^>]*>/g, '').trim().length > 0), {
      message: 'Findings are required. Please enter or dictate findings before polishing.',
    }),
  impression: z.string().optional(),
  technique: z.string().optional(),
  modality: z.string().optional().default('CT'),
  studyDescription: z.string().optional(),
  patientAge: z.union([z.string(), z.number()]).transform((val) => (val !== undefined && val !== null ? String(val) : undefined)).optional(),
  patientGender: z.string().optional(),
  patientName: z.string().optional(),
  radiologistName: z.string().optional(),
  reportStyle: z.string().optional().default('categorized'),
  impressionStyle: z.string().optional().default('local_high_yield'),
  consultantNotes: z.string().optional(),
});

function polishOffline(text: string): string {
  if (!text) return '';
  const biased = applyMedicalBiasing(cleanSpokenPunctuation(text));
  return formatMedicalAbbreviations(biased);
}

export const POST = withAuth(
  async (req, context) => {
    const body = await req.json();
    const parsed = PolishReportSchema.safeParse(body);

    if (!parsed.success) {
      return NextResponse.json(
        { success: false, error: parsed.error.errors[0].message },
        { status: 400 }
      );
    }

    const {
      clinicalHistory,
      findings,
      impression,
      technique,
      modality,
      studyDescription,
      patientAge,
      patientGender,
      patientName,
      radiologistName,
      reportStyle,
      impressionStyle,
      consultantNotes,
    } = parsed.data;

    const clinicianName =
      context.user.hmisReportingDoctorName ||
      radiologistName ||
      (context.user.name ? `${context.user.name} (${context.user.title || 'PGR'})` : 'Resident Radiologist (PGR)');

    const regionId = inferRegionFromStudy({
      modality,
      studyDescription,
      transcript: `${clinicalHistory || ''} ${findings} ${impression || ''}`,
    });

    const settings = getAISettings();
    const regionPrompt = getEffectiveRegionPrompt(regionId, settings.customRegionPrompts);

    const patientDesc = [
      patientAge ? `${patientAge} years old` : '',
      patientGender || '',
    ].filter(Boolean).join(' ');

    const numAge = patientAge ? parseInt(patientAge, 10) : undefined;
    const isYoung = numAge !== undefined && !isNaN(numAge) && numAge < 30;
    const isBulletStyle = reportStyle === 'pure_bullets' || reportStyle === 'system_wise_bullets';
    const isLocalImpression = impressionStyle !== 'international_structured';

    const cleanInputImpression = impression ? stripAttributionFromText(impression) : '';
    const isPlaceholderImpression =
      !cleanInputImpression ||
      /imaging findings documented|findings finalized|unremarkable|normal|none|draft/i.test(cleanInputImpression.trim());

    const consultantBlock = consultantNotes && consultantNotes.trim()
      ? `\n- Consultant Review Notes: "${consultantNotes.trim()}"\n  (CRITICAL: Incorporate consultant guidance, level corrections, and pathology upgrades/downgrades into findings and impression.)\n`
      : '';

    const styleInstructions = `
STYLE RULES:
- Findings Style: ${isBulletStyle ? 'PURE BULLETS (HOSPITAL CLASSIC): Unbroken continuous bullet points by level without <h3> subheadings.' : 'CATEGORIZED (H3 HEADINGS): Structured layout with <h3>Technique</h3> and <h3>Findings</h3>.'}
- Impression Style: ${isLocalImpression ? `LOCAL HIGH-YIELD CONCISE: Max 2-3 bullets, highlight predominant levels.${isYoung ? ' Patient < 30y: NEVER use "spondylosis"; use "Disc bulges / Schmorl\'s nodes".' : ''}` : 'ACR/RSNA STRUCTURED: Formal graded central and foraminal stenosis (mild, moderate, severe).'}`;

    const prompt = `${regionPrompt}

PATIENT & STUDY DETAILS:
- Patient Demographics: ${patientDesc || 'Not specified'}${patientName ? ` (${patientName})` : ''}
- Study: ${studyDescription || modality}
- Modality: ${modality}
- Draft Clinical History: ${clinicalHistory || 'None provided'}
- Draft Technique: ${technique || 'None provided'}
- Draft Findings: ${findings}
- Draft Impression: ${isPlaceholderImpression ? 'None provided (derive concise diagnostic impressions directly from positive findings)' : cleanInputImpression}${consultantBlock}
- Radiologist: ${clinicianName}
${styleInstructions}

CRITICAL REPORTING RULES:
1. Clinical History: Synthesize a concise 1-2 sentence formal clinical narrative incorporating patient demographics.
2. Technique: Standardize the scan technique protocol.
3. Findings: Format according to the requested findings style. If pure bullets, use unbroken <ul><li>...</li></ul> without <h3>.
4. Impression: Provide a concise, prioritized executive diagnostic summary of positive findings ONLY.
5. Sign-off: "Reported by: ${clinicianName}"

Return STRICT JSON ONLY without markdown formatting or thoughts:
{
  "clinicalHistory": "Formal narrative clinical history",
  "technique": "Formal scan protocol",
  "findings": "${isBulletStyle ? '<ul><li><strong>L4-L5:</strong> ...</li></ul>' : '<h3>Technique</h3><p>...</p><h3>Findings</h3><ul>...</ul>'}",
  "impression": "1. Primary diagnostic conclusion\\n2. Secondary positive finding",
  "signOff": "Reported by: ${clinicianName}"
}`;

    const responseText = await callAICompletion({
      systemPrompt: 'You are an expert radiology reporting assistant. Return strict JSON only without explanation.',
      userPrompt: prompt,
      jsonMode: true,
      maxTokens: 1500,
      temperature: 0.1,
    });

    if (responseText) {
      const parsedAi = extractJsonFromModelResponse<{
        clinicalHistory?: string;
        technique?: string;
        findings?: string;
        impression?: string;
        signOff?: string;
      }>(responseText);

      if (parsedAi && (parsedAi.findings || parsedAi.impression)) {
        const effectiveTechnique = parsedAi.technique || technique;
        let polishedFindings = parsedAi.findings || findings;

        if (isBulletStyle) {
          polishedFindings = convertReportToStyle(polishedFindings, 'pure_bullets', effectiveTechnique).findingsHtml;
        } else {
          polishedFindings = formatClinicalFindingsHtml(polishedFindings, modality, effectiveTechnique);
        }

        const filteredImpression = applyAgeVocabularyFilter(parsedAi.impression || impression || '', numAge ?? null);
        const polishedImpression = normalizeImpressionList(filteredImpression);

        return NextResponse.json({
          success: true,
          clinicalHistory: parsedAi.clinicalHistory || clinicalHistory,
          technique: effectiveTechnique,
          findings: polishedFindings,
          impression: polishedImpression,
          signOff: parsedAi.signOff || `Reported by: ${clinicianName}`,
        });
      }
    }

    // Offline deterministic fallback
    const fallbackTechnique = technique || 'Standard volumetric cross-sectional protocol.';
    let fallbackFindings = formatClinicalFindingsHtml(polishOffline(findings), modality, fallbackTechnique);
    if (isBulletStyle) {
      fallbackFindings = convertReportToStyle(fallbackFindings, 'pure_bullets', fallbackTechnique).findingsHtml;
    }
    const filteredFallbackImp = applyAgeVocabularyFilter(impression ? polishOffline(impression) : 'Imaging findings documented.', numAge ?? null);
    const fallbackImpression = normalizeImpressionList(filteredFallbackImp);

    return NextResponse.json({
      success: true,
      clinicalHistory: clinicalHistory ? polishOffline(clinicalHistory) : clinicalHistory,
      technique: fallbackTechnique,
      findings: fallbackFindings,
      impression: fallbackImpression,
      signOff: `Reported by: ${clinicianName}`,
    });
  },
  {
    roles: ['admin', 'radiologist', 'resident'],
    audit: {
      action: 'ai_polish_whole_report',
      entityType: 'Report',
    },
  }
);
