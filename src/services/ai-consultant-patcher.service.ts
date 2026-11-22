// Layer 2: Hybrid AI Surgical Delta Patcher Service
import { SignoutTemplate, ConsultantPatchResult } from '@/types/signout';
import { getSignoutTemplate, isSectionPositive } from './templates/signout-templates.data';
import { runDeterministicSurgicalPatch } from './consultant-delta-rules.service';
import { callAICompletion, extractJsonFromModelResponse } from './ai-router.service';

export interface RunPatchParams {
  modalityOrTitle: string;
  sectionTexts: Record<string, string>;
  impressionList: string[];
  deltaNote: string;
  focusedSectionId?: string | null;
  templateFormat?: 'standardized' | 'hmis';
}

export async function runConsultantSurgicalPatch(
  params: RunPatchParams
): Promise<ConsultantPatchResult> {
  const {
    modalityOrTitle,
    sectionTexts,
    impressionList,
    deltaNote,
    focusedSectionId,
    templateFormat = 'standardized',
  } = params;

  const template = getSignoutTemplate(modalityOrTitle);

  // 1. Instant 0ms Deterministic Rule Engine
  const fastMatch = runDeterministicSurgicalPatch(
    template,
    sectionTexts,
    impressionList,
    deltaNote,
    templateFormat
  );
  if (fastMatch) {
    return {
      patchedSections: fastMatch.patchedSections,
      patchedImpression: fastMatch.patchedImpression,
      changesSummary: fastMatch.changesSummary,
    };
  }

  // 2. AI Completion via Universal AI Router (OpenRouter / Local / Cloud)
  try {
    const systemPrompt = `You are a Senior Consultant Radiology Reporting Agent integrated into Rad Suite.
Modify ONLY the anatomical sections mentioned in the Consultant Shorthand Delta Note.
If the consultant clears a finding (e.g. "normal", "clear", "no abscess"), replace with the exact normal baseline text.
If the consultant adds/modifies pathology, write formal radiological prose and remove contradicted normal statements.
Re-generate impressionBullets array summarizing all abnormal sections in order of clinical severity.
Return strict JSON with updatedSections (array of {id, text}), patchedImpression (array of string), and changesSummary (array of string).`;

    const sectionsContext = template.sections.map((s) => ({
      id: s.id,
      heading: s.heading,
      currentText: sectionTexts[s.id] || (templateFormat === 'hmis' ? s.normalHmis : s.normalStandardized),
      normalBaseline: templateFormat === 'hmis' ? s.normalHmis : s.normalStandardized,
    }));

    const userPrompt = `MODALITY: ${template.title}
FOCUSED SECTION: ${focusedSectionId || 'Auto-detect'}
CONSULTANT DELTA NOTE: "${deltaNote}"
SECTIONS:
${JSON.stringify(sectionsContext, null, 2)}`;

    const rawText = await callAICompletion(
      {
        systemPrompt,
        userPrompt,
        jsonMode: true,
        temperature: 0.1,
      },
      'copilot'
    );

    if (rawText) {
      const parsed = extractJsonFromModelResponse<any>(rawText);
      if (parsed) {
        const nextSections = { ...sectionTexts };
        if (Array.isArray(parsed.updatedSections)) {
          parsed.updatedSections.forEach((u: any) => {
            if (u.id && u.text) nextSections[u.id] = u.text;
          });
        }
        return {
          patchedSections: nextSections,
          patchedImpression: Array.isArray(parsed.patchedImpression) ? parsed.patchedImpression : impressionList,
          changesSummary: Array.isArray(parsed.changesSummary) ? parsed.changesSummary : ['Applied consultant adjustments.'],
        };
      }
    }
  } catch (aiErr) {
    console.warn('[AI_PATCH_WARN] Fallback to heuristic patcher:', aiErr);
  }

  // 3. Resilient Heuristic Fallback
  const fallbackSections = { ...sectionTexts };
  const targetSec =
    (focusedSectionId && template.sections.find((s) => s.id === focusedSectionId)) ||
    template.sections.find((s) => isSectionPositive(fallbackSections[s.id], s, templateFormat)) ||
    template.sections[0];

  const trimmedNote = deltaNote.trim();
  const cleanSentence = trimmedNote.endsWith('.') ? trimmedNote : `${trimmedNote}.`;
  fallbackSections[targetSec.id] = cleanSentence;

  const remainingPositives = template.sections.filter((s) =>
    isSectionPositive(fallbackSections[s.id], s, templateFormat)
  );
  const nextImp =
    remainingPositives.length > 0
      ? remainingPositives.map((s) => fallbackSections[s.id])
      : [...template.normalImpression];

  return {
    patchedSections: fallbackSections,
    patchedImpression: nextImp,
    changesSummary: [`Updated ${targetSec.heading} per consultant delta note.`],
  };
}
