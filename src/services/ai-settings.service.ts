/**
 * AI Provider Settings & Persistence Service
 * Stores and manages configuration for Local Models and Cloud APIs.
 */
import fs from 'fs';
import path from 'path';
import { encryptSecret, decryptSecret } from '@/lib/crypto';
import { AIProviderProfile, AITaskRouting } from '@/types/ai-profiles';
import { getDefaultProfiles, DEFAULT_TASK_ROUTING } from './ai-default-profiles';

export interface AISettings {
  activeProvider: 'local' | 'gemini' | 'openai' | 'openrouter' | 'groq' | 'anthropic' | 'offline-rules';
  activeProfileId: string;
  profiles: AIProviderProfile[];
  taskRouting: AITaskRouting;
  localModelPath: string;
  localPort: number;
  localContextSize: number;
  geminiApiKey: string;
  geminiModel: string;
  openaiApiKey: string;
  openaiModel: string;
  openrouterApiKey: string;
  openrouterModel: string;
  groqApiKey: string;
  groqModel: string;
  anthropicApiKey: string;
  anthropicModel: string;
  customBaseUrl?: string;
  customApiKey?: string;
  customModel?: string;
  sttEngine: 'web-speech' | 'faster-whisper-local' | 'cloud-whisper' | 'voicestudio-local';
  customStructuringPrompt?: string;
  customPolishPrompt?: string;
  customCopilotPrompt?: string;
  customRegionPrompts?: Record<string, string>;
}

export {
  DEFAULT_STRUCTURING_PROMPT,
  DEFAULT_POLISH_PROMPT,
  DEFAULT_COPILOT_PROMPT,
} from './clinical-prompts.service';

import {
  DEFAULT_STRUCTURING_PROMPT,
  DEFAULT_POLISH_PROMPT,
  DEFAULT_COPILOT_PROMPT,
} from './clinical-prompts.service';

const SETTINGS_FILE = process.env.NODE_ENV === 'test'
  ? path.join(process.cwd(), 'test-radsuite-ai-settings.json')
  : path.join(process.cwd(), 'radsuite-ai-settings.json');

const DEFAULT_SETTINGS: AISettings = {
  activeProvider: (process.env.AI_PROVIDER || 'local') as AISettings['activeProvider'],
  activeProfileId: 'ollama-medgemma',
  profiles: getDefaultProfiles(),
  taskRouting: DEFAULT_TASK_ROUTING,
  localModelPath: 'medgemma:4b',
  localPort: 11434,
  localContextSize: 4096,
  geminiApiKey: process.env.GEMINI_API_KEY || '',
  geminiModel: process.env.GEMINI_MODEL || 'gemini-3.8-flash',
  openaiApiKey: process.env.OPENAI_API_KEY || '',
  openaiModel: process.env.OPENAI_MODEL || 'gpt-4o-mini',
  openrouterApiKey: process.env.OPENROUTER_API_KEY || '',
  openrouterModel: process.env.OPENROUTER_MODEL || 'meta-llama/llama-3.3-70b-instruct:free',
  groqApiKey: process.env.GROQ_API_KEY || '',
  groqModel: process.env.GROQ_MODEL || 'llama-3.3-70b-versatile',
  anthropicApiKey: process.env.ANTHROPIC_API_KEY || '',
  anthropicModel: process.env.ANTHROPIC_MODEL || 'claude-3-7-sonnet-20250219',
  sttEngine: 'voicestudio-local',
  customStructuringPrompt: DEFAULT_STRUCTURING_PROMPT,
  customPolishPrompt: DEFAULT_POLISH_PROMPT,
  customCopilotPrompt: DEFAULT_COPILOT_PROMPT,
  customRegionPrompts: {},
};

export function getAISettings(): AISettings {
  try {
    if (fs.existsSync(SETTINGS_FILE)) {
      const data = JSON.parse(fs.readFileSync(SETTINGS_FILE, 'utf-8'));
      if (data.geminiApiKey) data.geminiApiKey = decryptSecret(data.geminiApiKey);
      if (data.openaiApiKey) data.openaiApiKey = decryptSecret(data.openaiApiKey);
      if (data.openrouterApiKey) data.openrouterApiKey = decryptSecret(data.openrouterApiKey);
      if (data.groqApiKey) data.groqApiKey = decryptSecret(data.groqApiKey);
      if (data.anthropicApiKey) data.anthropicApiKey = decryptSecret(data.anthropicApiKey);
      if (data.customApiKey) data.customApiKey = decryptSecret(data.customApiKey);

      if (Array.isArray(data.profiles)) {
        data.profiles = data.profiles.map((p: AIProviderProfile) => ({
          ...p,
          apiKey: p.apiKey ? decryptSecret(p.apiKey) : undefined,
        }));
      } else {
        data.profiles = getDefaultProfiles();
      }

      if (!data.taskRouting) data.taskRouting = DEFAULT_TASK_ROUTING;
      if (!data.activeProfileId) data.activeProfileId = 'ollama-medgemma';

      return { ...DEFAULT_SETTINGS, ...data };
    }
  } catch {
    // Fallback to default
  }
  return DEFAULT_SETTINGS;
}

export function saveAISettings(updates: Partial<AISettings>): AISettings {
  const current = getAISettings();
  const merged: AISettings = { ...current, ...updates };

  if (updates.activeProvider === 'openrouter' && !updates.taskRouting) {
    merged.activeProfileId = 'openrouter-cloud';
    merged.taskRouting = {
      ...merged.taskRouting,
      structuringProfileId: 'openrouter-cloud',
      copilotProfileId: 'openrouter-cloud',
      visionProfileId: 'openrouter-vision',
    };
  }

  try {
    const toSave: any = { ...merged };
    if (toSave.geminiApiKey) toSave.geminiApiKey = encryptSecret(toSave.geminiApiKey);
    if (toSave.openaiApiKey) toSave.openaiApiKey = encryptSecret(toSave.openaiApiKey);
    if (toSave.openrouterApiKey) toSave.openrouterApiKey = encryptSecret(toSave.openrouterApiKey);
    if (toSave.groqApiKey) toSave.groqApiKey = encryptSecret(toSave.groqApiKey);
    if (toSave.anthropicApiKey) toSave.anthropicApiKey = encryptSecret(toSave.anthropicApiKey);
    if (toSave.customApiKey) toSave.customApiKey = encryptSecret(toSave.customApiKey);

    if (Array.isArray(toSave.profiles)) {
      toSave.profiles = toSave.profiles.map((p: AIProviderProfile) => ({
        ...p,
        apiKey: p.apiKey ? encryptSecret(p.apiKey) : undefined,
      }));
    }

    fs.writeFileSync(SETTINGS_FILE, JSON.stringify(toSave, null, 2), 'utf-8');
  } catch (err) {
    console.error('Failed to save AI settings:', err);
  }

  return merged;
}

export function maskKey(key: string): string {
  if (!key || key.length < 8) return '';
  return `${key.slice(0, 4)}...${key.slice(-4)}`;
}

export async function testProviderConnection(
  provider: string,
  overrideKey?: string,
  overrideUrl?: string
): Promise<{ success: boolean; latencyMs: number; message: string }> {
  const settings = getAISettings();
  const start = Date.now();

  if (provider === 'local' || provider === 'ollama') {
    try {
      const url = overrideUrl || 'http://127.0.0.1:11434';
      const cleanUrl = url.replace(/\/v1\/?$/, '').replace(/\/$/, '');
      const res = await fetch(`${cleanUrl}/api/tags`, { signal: AbortSignal.timeout(3000) });
      const latencyMs = Date.now() - start;
      if (res.ok) {
        const data = await res.json();
        const count = data.models?.length ?? 0;
        return { success: true, latencyMs, message: `Connected to Ollama. ${count} local models available.` };
      }
      return { success: false, latencyMs, message: `Ollama responded with HTTP ${res.status}` };
    } catch {
      return { success: false, latencyMs: 0, message: 'Ollama is not running on 127.0.0.1:11434.' };
    }
  }

  if (provider === 'voicestudio') {
    try {
      const url = overrideUrl || settings.taskRouting.voiceStudioUrl || 'http://127.0.0.1:3900';
      const res = await fetch(`${url}/health`, { signal: AbortSignal.timeout(3000) });
      const latencyMs = Date.now() - start;
      if (res.ok) {
        const data = await res.json();
        return { success: true, latencyMs, message: `VoiceStudio is online (${data.device || 'CUDA'}).` };
      }
      return { success: false, latencyMs, message: `VoiceStudio returned HTTP ${res.status}` };
    } catch {
      return { success: false, latencyMs: 0, message: 'VoiceStudio is offline on port 3900.' };
    }
  }

  if (provider === 'gemini') {
    const key = overrideKey || settings.geminiApiKey || process.env.GEMINI_API_KEY;
    if (!key) return { success: false, latencyMs: 0, message: 'Gemini API key is not configured.' };
    try {
      const res = await fetch(`https://generativelanguage.googleapis.com/v1beta/models?key=${key}`, {
        signal: AbortSignal.timeout(6000),
      });
      const latencyMs = Date.now() - start;
      if (res.ok) return { success: true, latencyMs, message: 'Connected to Google Gemini API successfully.' };
      return { success: false, latencyMs, message: `Google API Error: HTTP ${res.status}` };
    } catch (err: any) {
      return { success: false, latencyMs: 0, message: `Gemini connection failed: ${err.message}` };
    }
  }

  if (provider === 'anthropic') {
    const key = overrideKey || settings.anthropicApiKey || process.env.ANTHROPIC_API_KEY;
    if (!key) return { success: false, latencyMs: 0, message: 'Anthropic API key is not configured.' };
    try {
      const res = await fetch('https://api.anthropic.com/v1/models', {
        headers: { 'x-api-key': key, 'anthropic-version': '2023-06-01' },
        signal: AbortSignal.timeout(6000),
      });
      const latencyMs = Date.now() - start;
      if (res.ok) return { success: true, latencyMs, message: 'Connected to Anthropic API successfully.' };
      return { success: false, latencyMs, message: `Anthropic Error: HTTP ${res.status}` };
    } catch (err: any) {
      return { success: false, latencyMs: 0, message: `Anthropic connection failed: ${err.message}` };
    }
  }

  if (provider === 'openai' || provider === 'openrouter' || provider === 'groq' || provider === 'openai-compatible') {
    const defaultUrls: Record<string, string> = {
      openai: 'https://api.openai.com/v1',
      openrouter: 'https://openrouter.ai/api/v1',
      groq: 'https://api.groq.com/openai/v1',
      'openai-compatible': overrideUrl || 'http://127.0.0.1:11434/v1',
    };
    const targetUrl = overrideUrl || defaultUrls[provider];
    const key = overrideKey || (provider === 'openai' ? (settings.openaiApiKey || process.env.OPENAI_API_KEY) : provider === 'openrouter' ? (settings.openrouterApiKey || process.env.OPENROUTER_API_KEY) : (settings.groqApiKey || process.env.GROQ_API_KEY));

    if (provider === 'openrouter' && !key) {
      return { success: false, latencyMs: 0, message: 'OpenRouter API key is not configured.' };
    }

    try {
      const testPath = provider === 'openrouter' ? `${targetUrl}/auth/key` : `${targetUrl}/models`;
      const res = await fetch(testPath, {
        headers: key ? { Authorization: `Bearer ${key}` } : {},
        signal: AbortSignal.timeout(6000),
      });
      const latencyMs = Date.now() - start;
      if (res.ok) {
        if (provider === 'openrouter') {
          const info = await res.json().catch(() => null);
          const label = info?.data?.label ? ` (${info.data.label})` : '';
          const usage = typeof info?.data?.usage === 'number' ? ` | Used: $${info.data.usage.toFixed(2)}` : '';
          return { success: true, latencyMs, message: `Connected to OpenRouter successfully${label}${usage}.` };
        }
        return { success: true, latencyMs, message: `Connected to ${provider} endpoint successfully.` };
      }
      return { success: false, latencyMs, message: `Endpoint returned HTTP ${res.status}` };
    } catch (err: any) {
      return { success: false, latencyMs: 0, message: `Connection failed: ${err.message}` };
    }
  }

  return { success: true, latencyMs: 0, message: 'Offline deterministic rule engine is always active.' };
}
