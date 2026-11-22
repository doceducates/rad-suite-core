/**
 * Universal AI Router & Model Orchestrator (Layer 2 - Domain/Services)
 * Routes clinical dictation, structuring, vision, and QA tasks across:
 *  1. Local Ollama (MedGemma 4B, Qwen 4B, Nemotron 4B)
 *  2. Cloud Providers (Google Gemini, Anthropic Claude, OpenAI, OpenRouter, Groq)
 *  3. Any OpenAI-Compatible endpoints (Local/LAN)
 *  4. Deterministic Rule-Based Heuristics (Air-gapped zero-AI fallback)
 */

import { checkLateralityDiscrepancies, checkClinicalContradictions, generateShadowDifferentials } from './report-analysis.service';
import { getAISettings } from './ai-settings.service';
import { IdentifiedDiscrepancy } from '@/types/dictation';
import { AIProviderProfile, AIProviderType } from '@/types/ai-profiles';
import { callOpenAICompatible, callOpenAIVision, callAnthropicMessages, callGeminiApi, callGeminiVision } from './ai-provider-adapters';

export type AIProvider = 'local' | 'gemini' | 'openai' | 'openrouter' | 'groq' | 'anthropic' | 'offline-rules';

export interface AICompletionOptions {
  systemPrompt?: string;
  userPrompt: string;
  temperature?: number;
  maxTokens?: number;
  jsonMode?: boolean;
}

export function getActiveAIProvider(): AIProvider {
  const settings = getAISettings();
  return (settings.activeProvider as AIProvider) || 'local';
}

export function resolveProfileForTask(taskType?: 'structuring' | 'copilot' | 'vision'): AIProviderProfile {
  const settings = getAISettings();
  const routing = settings.taskRouting;
  const active = settings.activeProvider || 'local';
  let targetId = settings.activeProfileId;

  if (taskType === 'structuring' && routing?.structuringProfileId) {
    targetId = routing.structuringProfileId;
  } else if (taskType === 'copilot' && routing?.copilotProfileId) {
    targetId = routing.copilotProfileId;
  } else if (taskType === 'vision' && routing?.visionProfileId) {
    targetId = routing.visionProfileId;
  }

  // If primary provider is switched to openrouter and targetId is still default local
  if (active === 'openrouter' && (targetId === 'ollama-medgemma' || targetId === 'runtime-fallback')) {
    targetId = taskType === 'vision' ? 'openrouter-vision' : 'openrouter-cloud';
  }

  const profile = settings.profiles?.find((p) => p.id === targetId && p.enabled);
  if (profile) {
    const keyMap: Record<string, string | undefined> = {
      openrouter: settings.openrouterApiKey || process.env.OPENROUTER_API_KEY,
      openai: settings.openaiApiKey || process.env.OPENAI_API_KEY,
      gemini: settings.geminiApiKey || process.env.GEMINI_API_KEY,
      anthropic: settings.anthropicApiKey || process.env.ANTHROPIC_API_KEY,
      groq: settings.groqApiKey || process.env.GROQ_API_KEY,
    };
    const modelMap: Record<string, string | undefined> = {
      openrouter: profile.id === 'openrouter-cloud' ? settings.openrouterModel : undefined,
      openai: settings.openaiModel,
      gemini: settings.geminiModel,
      anthropic: settings.anthropicModel,
      groq: settings.groqModel,
    };
    const resolvedKey = profile.apiKey || keyMap[profile.providerType];
    const resolvedModel = modelMap[profile.providerType] || profile.model;
    return { ...profile, apiKey: resolvedKey, model: resolvedModel };
  }

  // Fallback to active provider mapping
  const legacyMap: Record<string, { type: AIProviderType; url: string; model: string; key?: string }> = {
    local: { type: 'ollama', url: 'http://127.0.0.1:11434/v1', model: 'medgemma:4b' },
    gemini: { type: 'gemini', url: 'https://generativelanguage.googleapis.com', model: settings.geminiModel, key: settings.geminiApiKey || process.env.GEMINI_API_KEY },
    anthropic: { type: 'anthropic', url: 'https://api.anthropic.com/v1', model: settings.anthropicModel, key: settings.anthropicApiKey || process.env.ANTHROPIC_API_KEY },
    openai: { type: 'openai', url: 'https://api.openai.com/v1', model: settings.openaiModel, key: settings.openaiApiKey || process.env.OPENAI_API_KEY },
    openrouter: { type: 'openrouter', url: 'https://openrouter.ai/api/v1', model: settings.openrouterModel || process.env.OPENROUTER_MODEL || 'meta-llama/llama-3.3-70b-instruct:free', key: settings.openrouterApiKey || process.env.OPENROUTER_API_KEY },
    groq: { type: 'groq', url: 'https://api.groq.com/openai/v1', model: settings.groqModel, key: settings.groqApiKey || process.env.GROQ_API_KEY },
    'offline-rules': { type: 'offline-rules', url: '', model: '' },
  };

  const fallback = legacyMap[settings.activeProvider] || legacyMap.local;
  return {
    id: 'runtime-fallback',
    name: fallback.type,
    providerType: fallback.type,
    baseUrl: fallback.url,
    model: fallback.model,
    apiKey: fallback.key,
    isLocal: fallback.type === 'ollama' || fallback.type === 'offline-rules',
    enabled: true,
  };
}

export async function callAICompletion(
  options: AICompletionOptions,
  taskType?: 'structuring' | 'copilot'
): Promise<string> {
  const profile = resolveProfileForTask(taskType);
  if (profile.providerType === 'offline-rules') return '';

  const messages: Array<{ role: 'system' | 'user' | 'assistant'; content: string }> = [];
  if (options.systemPrompt) {
    messages.push({ role: 'system', content: options.systemPrompt });
  }
  messages.push({ role: 'user', content: options.userPrompt });

  const timeoutMs = process.env.NODE_ENV === 'test' ? 400 : profile.isLocal ? 120000 : 60000;

  try {
    if (profile.providerType === 'ollama' || profile.providerType === 'openai' || profile.providerType === 'openrouter' || profile.providerType === 'groq' || profile.providerType === 'openai-compatible') {
      const extraHeaders = profile.providerType === 'openrouter'
        ? { 'HTTP-Referer': 'https://radsuite.local', 'X-Title': 'Rad Suite' }
        : undefined;

      const res = await callOpenAICompatible({
        baseUrl: profile.baseUrl,
        apiKey: profile.apiKey,
        model: profile.model,
        messages,
        temperature: options.temperature,
        maxTokens: options.maxTokens,
        jsonMode: options.jsonMode,
        headers: extraHeaders,
        timeoutMs,
      });
      if (res) return res;
    } else if (profile.providerType === 'anthropic') {
      const res = await callAnthropicMessages({
        apiKey: profile.apiKey,
        model: profile.model,
        messages,
        systemPrompt: options.systemPrompt,
        temperature: options.temperature,
        maxTokens: options.maxTokens,
        timeoutMs,
      });
      if (res) return res;
    } else if (profile.providerType === 'gemini') {
      const fullPrompt = `${options.systemPrompt ? options.systemPrompt + '\n\n' : ''}${options.userPrompt}`;
      const res = await callGeminiApi({
        apiKey: profile.apiKey,
        model: profile.model,
        prompt: fullPrompt,
        jsonMode: options.jsonMode,
        timeoutMs,
      });
      if (res) return res;
    }
  } catch (err) {
    console.warn(`[AI Router] ${profile.name} failed:`, err);
  }

  return '';
}

export async function callAIVision(options: {
  userPrompt: string;
  imageBase64: string;
  mimeType?: string;
  jsonMode?: boolean;
}): Promise<string> {
  const profile = resolveProfileForTask('vision');
  if (profile.providerType === 'gemini') {
    const apiKey = profile.apiKey || process.env.GEMINI_API_KEY;
    if (!apiKey) return '';
    return callGeminiVision({
      apiKey,
      model: profile.model || 'gemini-3.8-flash',
      prompt: options.userPrompt,
      imageBase64: options.imageBase64,
      mimeType: options.mimeType,
      jsonMode: options.jsonMode,
    });
  }

  if (profile.providerType === 'openrouter' || profile.providerType === 'openai' || profile.providerType === 'openai-compatible') {
    const extraHeaders = profile.providerType === 'openrouter'
      ? { 'HTTP-Referer': 'https://radsuite.local', 'X-Title': 'Rad Suite' }
      : undefined;

    return callOpenAIVision({
      baseUrl: profile.baseUrl,
      apiKey: profile.apiKey,
      model: profile.model,
      prompt: options.userPrompt,
      imageBase64: options.imageBase64,
      mimeType: options.mimeType,
      jsonMode: options.jsonMode,
      headers: extraHeaders,
    });
  }

  return '';
}

export function extractJsonFromModelResponse<T>(text: string): T | null {
  if (!text) return null;
  const cleaned = text
    .replace(/<thought>[\s\S]*?<\/thought>/gi, '')
    .replace(/<think>[\s\S]*?<\/think>/gi, '')
    .trim();

  const fenceMatch = cleaned.match(/```(?:json)?\s*([\s\S]*?)\s*```/i);
  if (fenceMatch) {
    try {
      return JSON.parse(fenceMatch[1].trim()) as T;
    } catch {}
  }

  const firstBrace = cleaned.indexOf('{');
  const lastBrace = cleaned.lastIndexOf('}');
  if (firstBrace !== -1 && lastBrace > firstBrace) {
    try {
      return JSON.parse(cleaned.substring(firstBrace, lastBrace + 1)) as T;
    } catch {}
  }

  try {
    return JSON.parse(cleaned) as T;
  } catch {
    return null;
  }
}

export async function analyzeReportWithRouter(
  findings: string,
  impression: string,
  modality = 'CT'
): Promise<{ discrepancies: IdentifiedDiscrepancy[]; shadowDifferentials: string[] }> {
  const ruleLaterality = checkLateralityDiscrepancies(findings, impression);
  const ruleContradictions = checkClinicalContradictions(findings, impression);
  const fallbackShadows = generateShadowDifferentials(`${findings} ${impression}`, modality);

  const prompt = `You are a cross-sectional ${modality} radiology QA reviewer.
Analyze these findings and impression for subtle anatomical contradictions or laterality conflicts:
Findings: ${findings}
Impression: ${impression}

Return strict JSON:
{
  "errors": [{"field": "impression", "description": "Issue explanation", "severity": "WARNING", "lateralityConflict": true}],
  "shadowDifferentials": ["Differential 1", "Differential 2"]
}`;

  const responseText = await callAICompletion(
    {
      systemPrompt: 'You are a cross-sectional radiology QA expert. Return valid JSON only.',
      userPrompt: prompt,
      jsonMode: true,
    },
    'copilot'
  );

  if (responseText) {
    const parsed = extractJsonFromModelResponse<any>(responseText);
    if (parsed) {
      const aiDiscrepancies: IdentifiedDiscrepancy[] = (parsed.errors || []).map((err: any, idx: number) => ({
        id: `ai-${Date.now()}-${idx}`,
        field: err.field || 'impression',
        issue: err.description || 'Clinical observation',
        severity: err.severity || 'WARNING',
        lateralityConflict: err.lateralityConflict || false,
      }));

      return {
        discrepancies: [...ruleLaterality, ...ruleContradictions, ...aiDiscrepancies],
        shadowDifferentials: parsed.shadowDifferentials?.length ? parsed.shadowDifferentials : fallbackShadows,
      };
    }
  }

  return {
    discrepancies: [...ruleLaterality, ...ruleContradictions],
    shadowDifferentials: fallbackShadows,
  };
}

export async function structureReportWithMedGemma(
  rawTranscript: string,
  modality = 'CT'
): Promise<{ technique: string; findings: string; impression: string; correctedTerms: string[] }> {
  const prompt = `You are MedGemma, a specialized cross-sectional ${modality} radiology reporting assistant.
Clean, fix medical phonetic errors, and organize this dictated text into a professional radiology report:
"${rawTranscript}"

Return strict JSON:
{
  "technique": "Brief scan technique protocol",
  "findings": "Formatted findings divided logically by organ/system",
  "impression": "Numbered diagnostic conclusions with ACR/clinical significance",
  "correctedTerms": ["list of corrected terms or phonetic fixes made"]
}`;

  const responseText = await callAICompletion(
    {
      systemPrompt: 'You are MedGemma, a radiology specialist. Do not output thoughts or reasoning. Output only valid JSON.',
      userPrompt: prompt,
      jsonMode: true,
      maxTokens: 1200,
    },
    'structuring'
  );

  if (responseText) {
    const parsed = extractJsonFromModelResponse<any>(responseText);
    if (parsed) {
      const findingsStr = typeof parsed.findings === 'string'
        ? parsed.findings
        : Object.entries(parsed.findings || {})
            .map(([k, v]) => `<p><strong>${k.replace(/_/g, ' ')}:</strong> ${typeof v === 'object' && v !== null ? Object.entries(v).map(([sk, sv]) => `${sk}: ${sv}`).join('. ') : v}</p>`)
            .join('');

      const impressionStr = typeof parsed.impression === 'string'
        ? parsed.impression
        : Object.entries(parsed.impression || {})
            .map(([k, v]) => `${k.replace(/_/g, ' ')}: ${v}`)
            .join('\n');

      const correctedTerms = Array.isArray(parsed.correctedTerms)
        ? parsed.correctedTerms
        : typeof parsed.correctedTerms === 'object' && parsed.correctedTerms !== null
        ? Object.keys(parsed.correctedTerms)
        : [];

      return {
        technique: typeof parsed.technique === 'string' ? parsed.technique : 'Standard cross-sectional protocol.',
        findings: findingsStr || rawTranscript,
        impression: impressionStr || 'Findings finalized.',
        correctedTerms,
      };
    }
  }

  return {
    technique: 'Standard volumetric cross-sectional protocol.',
    findings: rawTranscript,
    impression: 'Imaging findings documented.',
    correctedTerms: [],
  };
}
