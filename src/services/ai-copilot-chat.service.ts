/**
 * AI Radiologist Copilot Interactive Chat Service
 * Layer 2 (Domain/Services) - Strictly under 250 lines invariant.
 *
 * Provides real-time conversational assistance to the radiologist:
 *  - Follow-up questions regarding lesions, criteria, and staging (ACR/Fleischner/BI-RADS)
 *  - Differential rule-outs and diagnostic mimics
 *  - Ready-to-insert synthesized impression snippets
 */

import {
  callAICompletion,
  extractJsonFromModelResponse,
} from './ai-router.service';

export interface CopilotChatContext {
  modality: string;
  clinicalHistory?: string;
  findings: string;
  impression?: string;
}

export interface CopilotChatResponse {
  answer: string;
  suggestedImpression?: string;
  referenceGuideline?: string;
  quickFollowUps?: string[];
}

export async function askCopilotQuestion(
  query: string,
  context: CopilotChatContext
): Promise<CopilotChatResponse> {
  const cleanFindings = context.findings.replace(/<[^>]*>/g, ' ').replace(/\s+/g, ' ').trim();
  const cleanHistory = context.clinicalHistory?.replace(/<[^>]*>/g, ' ').replace(/\s+/g, ' ').trim();

  const prompt = `You are a subspecialty consultant radiologist acting as an interactive AI copilot.
A radiologist is reporting a ${context.modality} study and asks:
"${query}"

Patient Context:
- Modality: ${context.modality}
${cleanHistory ? `- Clinical History: ${cleanHistory}` : ''}
- Current Findings: "${cleanFindings || 'None documented yet.'}"
${context.impression ? `- Current Impression: "${context.impression.replace(/<[^>]*>/g, ' ').trim()}"` : ''}

Provide a concise, precise, academically rigorous response.
Return strict JSON format:
{
  "answer": "Concise direct answer with clear bullet points if helpful (max 3-4 sentences)",
  "suggestedImpression": "Formal impression text ready to insert into the final report (optional, if applicable)",
  "referenceGuideline": "Relevant guideline (e.g. Fleischner 2017, ACR TI-RADS, Bosniak v2019, LI-RADS)",
  "quickFollowUps": ["Follow-up question 1", "Follow-up question 2"]
}`;

  const responseText = await callAICompletion({
    systemPrompt:
      'You are an expert diagnostic radiologist copilot. Provide accurate, guideline-aligned recommendations. Return strict JSON only.',
    userPrompt: prompt,
    jsonMode: true,
  });

  if (responseText) {
    const parsed = extractJsonFromModelResponse<CopilotChatResponse>(responseText);
    if (parsed && parsed.answer) {
      return {
        answer: parsed.answer,
        suggestedImpression: parsed.suggestedImpression,
        referenceGuideline: parsed.referenceGuideline,
        quickFollowUps: Array.isArray(parsed.quickFollowUps) ? parsed.quickFollowUps : [],
      };
    }
  }

  // Offline deterministic fallback
  const lowerQ = query.toLowerCase();
  if (lowerQ.includes('fleischner') || lowerQ.includes('nodule')) {
    return {
      answer:
        'Under Fleischner Society 2017 guidelines: Solid nodules < 6 mm in low-risk patients require no routine follow-up. For 6–8 mm solid nodules, a CT at 6–12 months is recommended. Subsolid or ground-glass nodules > 6 mm require initial follow-up at 3–6 months to confirm persistence.',
      suggestedImpression:
        'Indeterminate pulmonary nodule measuring under 6 mm; in accordance with Fleischner 2017 criteria, no routine follow-up CT is indicated in low-risk patients.',
      referenceGuideline: 'Fleischner Society Guidelines 2017',
      quickFollowUps: [
        'What if patient is high risk?',
        'How to manage ground-glass nodules?',
      ],
    };
  }

  if (lowerQ.includes('mimic') || lowerQ.includes('differential') || lowerQ.includes('rule out')) {
    return {
      answer:
        'Key imaging mimics to consider include benign inflammatory changes, vascular variations, and chronic scarring. Assessment of margins, enhancement kinetics, and comparison with prior imaging studies is recommended.',
      suggestedImpression:
        'Imaging findings require clinical and chronological correlation to rule out acute inflammatory versus chronic etiology.',
      referenceGuideline: `${context.modality} Standard Clinical Guidelines`,
      quickFollowUps: [
        'Recommend follow-up interval',
        'Suggest protocol optimization',
      ],
    };
  }

  return {
    answer: `Regarding "${query}": On ${context.modality}, evaluate lesion morphology, internal architecture, and adjacent structural involvement. Clinical correlation with presenting symptoms is advised.`,
    suggestedImpression: `Finding noted on ${context.modality}; clinical correlation and dedicated interval evaluation recommended.`,
    referenceGuideline: `${context.modality} Reference Standard`,
    quickFollowUps: [
      'What imaging protocol to recommend next?',
      'How to report in impression?',
    ],
  };
}
