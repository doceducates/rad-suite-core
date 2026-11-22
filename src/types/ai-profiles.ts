import { z } from 'zod';

export type AIProviderType =
  | 'ollama'            // Local Ollama instance (http://127.0.0.1:11434/v1)
  | 'openai'            // Official OpenAI API (https://api.openai.com/v1)
  | 'anthropic'         // Official Anthropic API (https://api.anthropic.com/v1/messages)
  | 'gemini'            // Google Gemini API
  | 'openrouter'        // OpenRouter (https://openrouter.ai/api/v1)
  | 'groq'              // Groq Cloud
  | 'openai-compatible' // Any OpenAI-compatible localhost/LAN endpoint
  | 'offline-rules';    // Deterministic zero-AI fallback

export interface AIProviderProfile {
  id: string;
  name: string;
  providerType: AIProviderType;
  baseUrl: string;
  apiKey?: string;
  model: string;
  isLocal: boolean;
  enabled: boolean;
  notes?: string;
}

export type STTEngineType =
  | 'voicestudio-local'
  | 'openai-whisper'
  | 'groq-whisper'
  | 'web-speech';

export interface AITaskRouting {
  structuringProfileId: string;
  copilotProfileId: string;
  visionProfileId: string;
  sttEngine: STTEngineType;
  voiceStudioUrl: string;
  voiceStudioModel: 'faster-whisper-large-v3-turbo' | 'faster-whisper-large-v3' | 'whisper-1';
}

export const AIProviderProfileSchema = z.object({
  id: z.string().min(1),
  name: z.string().min(1),
  providerType: z.enum([
    'ollama',
    'openai',
    'anthropic',
    'gemini',
    'openrouter',
    'groq',
    'openai-compatible',
    'offline-rules',
  ]),
  baseUrl: z.string().min(1),
  apiKey: z.string().optional(),
  model: z.string().min(1),
  isLocal: z.boolean().default(false),
  enabled: z.boolean().default(true),
  notes: z.string().optional(),
});

export const AITaskRoutingSchema = z.object({
  structuringProfileId: z.string().default('ollama-medgemma'),
  copilotProfileId: z.string().default('ollama-medgemma'),
  visionProfileId: z.string().default('gemini-cloud'),
  sttEngine: z.enum(['voicestudio-local', 'openai-whisper', 'groq-whisper', 'web-speech']).default('voicestudio-local'),
  voiceStudioUrl: z.string().default('http://127.0.0.1:3900'),
  voiceStudioModel: z.enum(['faster-whisper-large-v3-turbo', 'faster-whisper-large-v3', 'whisper-1']).default('faster-whisper-large-v3-turbo'),
});
