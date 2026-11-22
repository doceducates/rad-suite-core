/**
 * AI Block Editor Domain Service
 * Pure business logic for transforming, standardizing, and synthesizing radiology report blocks.
 * Protects API keys from client exposure (Layer 2 Domain).
 */
import { GoogleGenAI } from '@google/genai';

export type AiBlockAction = 'impression' | 'standardize' | 'simplify' | 'differential' | 'custom';

export interface AiBlockRequest {
  action: AiBlockAction;
  text: string;
  modality?: string;
  customPrompt?: string;
}

export interface AiBlockResponse {
  result: string;
  action: AiBlockAction;
  modelUsed: string;
}

const FALLBACK_MODELS = ['gemini-3.8-flash', 'gemini-flash-latest', 'gemini-3.7-flash'];

function getClient(): GoogleGenAI | null {
  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey) return null;
  return new GoogleGenAI({ apiKey });
}

function heuristicFallback(action: AiBlockAction, text: string): string {
  if (action === 'impression') {
    const sentences = text.split(/(?<=[.?!])\s+/).filter(Boolean);
    const notable = sentences.filter(s =>
      /calcul|fractur|mass|lesion|infarct|hemorrhag|consolidat|effusion|thickening|lymphaden/i.test(s)
    );
    if (notable.length === 0) {
      return '1. No acute diagnostic abnormality identified within the imaged anatomical scope.\n2. Normal study for clinical correlation.';
    }
    return notable.map((s, i) => `${i + 1}. ${s.trim()}`).join('\n');
  }

  if (action === 'standardize') {
    return text
      .replace(/(\d+)\s*(?:by|x|X)\s*(\d+)\s*(?:mm|cm)?/g, '$1 x $2 mm')
      .replace(/\bstatus post\b/gi, 'S/p')
      .replace(/\bc\/o\b/gi, 'C/o')
      .replace(/\bgall ladder\b/gi, 'gallbladder')
      .replace(/\bthecal sack\b/gi, 'thecal sac');
  }

  if (action === 'simplify') {
    return `Patient Summary: The scan was examined. ${text.slice(0, 160).trim()}... Please consult your attending physician for clinical discussion.`;
  }

  if (action === 'differential') {
    return '1. Primary consideration: Indeterminate lesion/abnormality.\n2. Differential considerations: Inflammatory/infectious etiology vs benign neoplasm.\n3. Recommendation: Correlate clinically and consider targeted cross-sectional follow-up.';
  }

  return text;
}

export async function processAiBlockEdit(req: AiBlockRequest): Promise<AiBlockResponse> {
  const { action, text, modality = 'CT', customPrompt } = req;
  const client = getClient();

  if (!client || !text.trim()) {
    return {
      result: heuristicFallback(action, text),
      action,
      modelUsed: 'heuristic-offline-fallback',
    };
  }

  let prompt = '';
  if (action === 'impression') {
    prompt = `You are a fellowship-trained cross-sectional radiologist at a premier academic medical center.
Based on the following ${modality} Findings, generate a concise, numbered Impression list in descending order of clinical acuity.
- Highlight positive pathology first (acute findings, masses, calculi, fractures).
- Include pertinent negatives as the final item if study is otherwise unremarkable.
- Use standard ACR/Punjab HMIS terminology.
- Output ONLY the formatted numbered impression list, no conversational filler.

FINDINGS:
${text}`;
  } else if (action === 'standardize') {
    prompt = `You are an expert radiology editor.
Standardize and polish this ${modality} report block:
- Standardize measurements into 'X x Y mm'.
- Correct typos, phonetic mistakes, and informal abbreviations.
- Maintain professional, objective medical tone.
- Output ONLY the polished text.

TEXT:
${text}`;
  } else if (action === 'simplify') {
    prompt = `Translate this ${modality} radiology report section into a clear, reassuring, 2-3 sentence patient-friendly summary suitable for a hospital discharge slip. Avoid alarmist jargon while staying medically accurate.
Output ONLY the simplified explanation.

REPORT:
${text}`;
  } else if (action === 'differential') {
    prompt = `You are an expert academic radiologist.
Based on these ${modality} findings, generate a prioritized Differential Diagnosis list (top 3 considerations) with key discriminative radiological features and recommended follow-up:
- Format as numbered list: 1. Diagnosis (Likelihood): Key features.
- Output ONLY the differential list.

FINDINGS:
${text}`;
  } else {
    prompt = `You are an expert radiology assistant. Apply this custom instruction: "${customPrompt || 'Refine and polish'}" to the following radiology text:
${text}
Output ONLY the refined result.`;
  }

  for (const model of FALLBACK_MODELS) {
    try {
      const response = await client.models.generateContent({
        model,
        contents: prompt,
      });
      const output = response.text?.trim();
      if (output) {
        return {
          result: output,
          action,
          modelUsed: model,
        };
      }
    } catch {
      continue;
    }
  }

  return {
    result: heuristicFallback(action, text),
    action,
    modelUsed: 'heuristic-fallback',
  };
}
