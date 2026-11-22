import { NextResponse } from 'next/server';
import { getAISettings, saveAISettings, maskKey, testProviderConnection } from '@/services/ai-settings.service';
import { withAuth } from '@/lib/api-handler';
import { AIProviderProfile } from '@/types/ai-profiles';

export const GET = withAuth(
  async () => {
    const raw = getAISettings();
    const maskedProfiles = (raw.profiles || []).map((p) => ({
      ...p,
      apiKey: p.apiKey ? maskKey(p.apiKey) : '',
      hasKey: !!p.apiKey,
    }));

    const masked = {
      ...raw,
      geminiApiKey: raw.geminiApiKey ? maskKey(raw.geminiApiKey) : '',
      openaiApiKey: raw.openaiApiKey ? maskKey(raw.openaiApiKey) : '',
      openrouterApiKey: raw.openrouterApiKey ? maskKey(raw.openrouterApiKey) : '',
      groqApiKey: raw.groqApiKey ? maskKey(raw.groqApiKey) : '',
      anthropicApiKey: raw.anthropicApiKey ? maskKey(raw.anthropicApiKey) : '',
      customApiKey: raw.customApiKey ? maskKey(raw.customApiKey) : '',
      hasGeminiKey: !!raw.geminiApiKey,
      hasOpenaiKey: !!raw.openaiApiKey,
      hasOpenrouterKey: !!raw.openrouterApiKey,
      hasGroqKey: !!raw.groqApiKey,
      hasAnthropicKey: !!raw.anthropicApiKey,
      hasCustomKey: !!raw.customApiKey,
      profiles: maskedProfiles,
    };
    return NextResponse.json({ success: true, settings: masked });
  },
  { roles: ['admin'] }
);

export const POST = withAuth(
  async (req) => {
    const body = await req.json();

    // Check if this is a connection test request
    if (body.action === 'test_connection') {
      const result = await testProviderConnection(body.provider, body.apiKey, body.baseUrl);
      return NextResponse.json(result);
    }

    const current = getAISettings();
    const updates: any = {};

    if (body.activeProvider) updates.activeProvider = body.activeProvider;
    if (body.activeProfileId) updates.activeProfileId = body.activeProfileId;
    if (body.taskRouting) updates.taskRouting = body.taskRouting;
    if (body.localModelPath) updates.localModelPath = body.localModelPath;
    if (body.localPort) updates.localPort = Number(body.localPort);
    if (body.localContextSize) updates.localContextSize = Number(body.localContextSize);

    // Profile array updates - preserve unmasked existing keys if user kept masked key
    if (Array.isArray(body.profiles)) {
      updates.profiles = body.profiles.map((p: AIProviderProfile) => {
        const existing = current.profiles.find((ep) => ep.id === p.id);
        if (p.apiKey && p.apiKey.includes('...')) {
          return { ...p, apiKey: existing?.apiKey };
        }
        return p;
      });
    }

    // Direct provider keys
    if (body.geminiApiKey && !body.geminiApiKey.includes('...')) updates.geminiApiKey = body.geminiApiKey;
    if (body.openaiApiKey && !body.openaiApiKey.includes('...')) updates.openaiApiKey = body.openaiApiKey;
    if (body.openrouterApiKey && !body.openrouterApiKey.includes('...')) updates.openrouterApiKey = body.openrouterApiKey;
    if (body.groqApiKey && !body.groqApiKey.includes('...')) updates.groqApiKey = body.groqApiKey;
    if (body.anthropicApiKey && !body.anthropicApiKey.includes('...')) updates.anthropicApiKey = body.anthropicApiKey;
    if (body.customApiKey && !body.customApiKey.includes('...')) updates.customApiKey = body.customApiKey;

    if (body.geminiModel) updates.geminiModel = body.geminiModel;
    if (body.openaiModel) updates.openaiModel = body.openaiModel;
    if (body.openrouterModel) updates.openrouterModel = body.openrouterModel;
    if (body.groqModel) updates.groqModel = body.groqModel;
    if (body.anthropicModel) updates.anthropicModel = body.anthropicModel;
    if (body.customBaseUrl) updates.customBaseUrl = body.customBaseUrl;
    if (body.customModel) updates.customModel = body.customModel;
    if (body.sttEngine) updates.sttEngine = body.sttEngine;

    if (body.customStructuringPrompt !== undefined) updates.customStructuringPrompt = body.customStructuringPrompt;
    if (body.customPolishPrompt !== undefined) updates.customPolishPrompt = body.customPolishPrompt;
    if (body.customCopilotPrompt !== undefined) updates.customCopilotPrompt = body.customCopilotPrompt;
    if (body.customRegionPrompts !== undefined) updates.customRegionPrompts = body.customRegionPrompts;

    const saved = saveAISettings(updates);

    return NextResponse.json({
      success: true,
      message: 'AI settings and provider profiles saved successfully.',
      provider: saved.activeProvider,
      activeProfileId: saved.activeProfileId,
    });
  },
  {
    roles: ['admin'],
    audit: {
      action: 'ai_settings_update',
      entityType: 'SystemConfig',
      details: 'Administrator updated AI configuration and provider profiles',
    },
  }
);
