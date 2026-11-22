/**
 * AI Provider Transport Adapters (Layer 2 - Domain/Services)
 * Pure HTTP callers for OpenAI-compatible, Anthropic Messages, and Google Gemini APIs.
 * Strictly under 250 lines invariant (AGENTS.md Rule 1).
 */
import { GoogleGenAI } from '@google/genai';

export interface OpenAICompatibleOptions {
  baseUrl: string;
  apiKey?: string;
  model: string;
  messages: Array<{ role: 'system' | 'user' | 'assistant'; content: string }>;
  temperature?: number;
  maxTokens?: number;
  jsonMode?: boolean;
  headers?: Record<string, string>;
  timeoutMs?: number;
}

export async function callOpenAICompatible(options: OpenAICompatibleOptions): Promise<string> {
  const cleanBase = options.baseUrl.replace(/\/+$/, '');
  const url = cleanBase.endsWith('/v1') ? `${cleanBase}/chat/completions` : `${cleanBase}/v1/chat/completions`;

  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
    ...(options.headers || {}),
  };
  if (options.apiKey && options.apiKey !== 'none' && options.apiKey !== 'local') {
    headers.Authorization = `Bearer ${options.apiKey}`;
  }

  const payload: Record<string, any> = {
    model: options.model,
    messages: options.messages,
    temperature: options.temperature ?? 0.1,
    max_tokens: options.maxTokens ?? 1500,
  };

  if (options.jsonMode) {
    payload.response_format = { type: 'json_object' };
  }

  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), options.timeoutMs || 90000);

  try {
    const res = await fetch(url, {
      method: 'POST',
      headers,
      body: JSON.stringify(payload),
      signal: controller.signal,
    });

    if (!res.ok) {
      const errText = await res.text().catch(() => '');
      throw new Error(`HTTP ${res.status}: ${errText.slice(0, 300)}`);
    }

    const data = await res.json();
    const msg = data.choices?.[0]?.message;
    const textContent = msg?.content || data.choices?.[0]?.text || '';
    if (typeof textContent === 'string' && textContent.trim()) {
      return textContent;
    }
    if (msg?.reasoning_content && typeof msg.reasoning_content === 'string') {
      return msg.reasoning_content;
    }
    if (msg?.reasoning && typeof msg.reasoning === 'string') {
      return msg.reasoning;
    }
    return '';
  } finally {
    clearTimeout(timeoutId);
  }
}

export interface OpenAIVisionOptions {
  baseUrl: string;
  apiKey?: string;
  model: string;
  prompt: string;
  imageBase64: string;
  mimeType?: string;
  jsonMode?: boolean;
  headers?: Record<string, string>;
  timeoutMs?: number;
}

export async function callOpenAIVision(options: OpenAIVisionOptions): Promise<string> {
  const mime = options.mimeType || 'image/jpeg';
  const cleanBase64 = options.imageBase64.startsWith('data:')
    ? options.imageBase64
    : `data:${mime};base64,${options.imageBase64}`;

  return callOpenAICompatible({
    baseUrl: options.baseUrl,
    apiKey: options.apiKey,
    model: options.model,
    messages: [
      {
        role: 'user',
        content: [
          { type: 'text', text: options.prompt },
          { type: 'image_url', image_url: { url: cleanBase64 } },
        ] as any,
      },
    ],
    jsonMode: options.jsonMode,
    headers: options.headers,
    timeoutMs: options.timeoutMs || 90000,
  });
}

export interface AnthropicMessagesOptions {
  apiKey?: string;
  model: string;
  messages: Array<{ role: 'system' | 'user' | 'assistant'; content: string }>;
  systemPrompt?: string;
  temperature?: number;
  maxTokens?: number;
  timeoutMs?: number;
}

export async function callAnthropicMessages(options: AnthropicMessagesOptions): Promise<string> {
  if (!options.apiKey) throw new Error('Anthropic API key required');
  const url = 'https://api.anthropic.com/v1/messages';
  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), options.timeoutMs || 90000);

  const userMessages = options.messages
    .filter((m) => m.role === 'user' || m.role === 'assistant')
    .map((m) => ({ role: m.role, content: m.content }));

  const payload: Record<string, any> = {
    model: options.model || 'claude-3-7-sonnet-20250219',
    max_tokens: options.maxTokens ?? 1500,
    temperature: options.temperature ?? 0.1,
    messages: userMessages.length > 0 ? userMessages : [{ role: 'user', content: 'Hello' }],
  };

  if (options.systemPrompt) {
    payload.system = options.systemPrompt;
  }

  try {
    const res = await fetch(url, {
      method: 'POST',
      headers: {
        'x-api-key': options.apiKey,
        'anthropic-version': '2023-06-01',
        'content-type': 'application/json',
      },
      body: JSON.stringify(payload),
      signal: controller.signal,
    });

    if (!res.ok) {
      const errText = await res.text().catch(() => '');
      throw new Error(`Anthropic HTTP ${res.status}: ${errText.slice(0, 300)}`);
    }

    const data = await res.json();
    const textBlocks = (data.content || [])
      .filter((c: any) => c.type === 'text')
      .map((c: any) => c.text)
      .join('\n');

    return textBlocks || '';
  } finally {
    clearTimeout(timeoutId);
  }
}

export interface GeminiApiOptions {
  apiKey?: string;
  model: string;
  prompt: string;
  jsonMode?: boolean;
  timeoutMs?: number;
}

export async function callGeminiApi(options: GeminiApiOptions): Promise<string> {
  if (!options.apiKey) throw new Error('Gemini API key required');
  const client = new GoogleGenAI({ apiKey: options.apiKey });

  const res = await client.models.generateContent({
    model: options.model || 'gemini-3.8-flash',
    contents: options.prompt,
    config: options.jsonMode ? { responseMimeType: 'application/json' } : undefined,
  });

  return res.text || '';
}

export interface GeminiVisionOptions {
  apiKey: string;
  model: string;
  prompt: string;
  imageBase64: string;
  mimeType?: string;
  jsonMode?: boolean;
}

export async function callGeminiVision(options: GeminiVisionOptions): Promise<string> {
  const client = new GoogleGenAI({ apiKey: options.apiKey });
  const cleanBase64 = options.imageBase64.replace(/^data:image\/[a-z]+;base64,/, '');

  const res = await client.models.generateContent({
    model: options.model || 'gemini-3.8-flash',
    contents: [
      options.prompt,
      {
        inlineData: {
          data: cleanBase64,
          mimeType: options.mimeType || 'image/jpeg',
        },
      },
    ],
    config: options.jsonMode ? { responseMimeType: 'application/json' } : undefined,
  });

  return res.text || '';
}
