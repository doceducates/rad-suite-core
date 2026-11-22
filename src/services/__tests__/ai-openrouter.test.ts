import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { resolveProfileForTask } from '../ai-router.service';
import * as aiSettings from '../ai-settings.service';
import { getDefaultProfiles, DEFAULT_TASK_ROUTING } from '../ai-default-profiles';

describe('OpenRouter AI Integration', () => {
  const originalEnvKey = process.env.OPENROUTER_API_KEY;
  const originalEnvModel = process.env.OPENROUTER_MODEL;

  beforeEach(() => {
    process.env.OPENROUTER_API_KEY = 'sk-or-v1-testkey1234567890';
    process.env.OPENROUTER_MODEL = 'meta-llama/llama-3.3-70b-instruct:free';
  });

  afterEach(() => {
    vi.restoreAllMocks();
    process.env.OPENROUTER_API_KEY = originalEnvKey;
    process.env.OPENROUTER_MODEL = originalEnvModel;
  });

  it('routes to OpenRouter profile when activeProvider is openrouter', () => {
    vi.spyOn(aiSettings, 'getAISettings').mockReturnValue({
      activeProvider: 'openrouter',
      activeProfileId: 'openrouter-cloud',
      profiles: getDefaultProfiles(),
      taskRouting: {
        ...DEFAULT_TASK_ROUTING,
        structuringProfileId: 'openrouter-cloud',
        copilotProfileId: 'openrouter-cloud',
        visionProfileId: 'openrouter-vision',
      },
      openrouterApiKey: 'sk-or-v1-testkey1234567890',
      openrouterModel: 'meta-llama/llama-3.3-70b-instruct:free',
    } as any);

    const structuring = resolveProfileForTask('structuring');
    expect(structuring.providerType).toBe('openrouter');
    expect(structuring.baseUrl).toBe('https://openrouter.ai/api/v1');
    expect(structuring.apiKey).toBe('sk-or-v1-testkey1234567890');
    expect(structuring.model).toBe('meta-llama/llama-3.3-70b-instruct:free');
  });

  it('automatically configures vision routing to openrouter-vision', () => {
    vi.spyOn(aiSettings, 'getAISettings').mockReturnValue({
      activeProvider: 'openrouter',
      activeProfileId: 'openrouter-cloud',
      profiles: getDefaultProfiles(),
      taskRouting: {
        ...DEFAULT_TASK_ROUTING,
        visionProfileId: 'openrouter-vision',
      },
      openrouterApiKey: 'sk-or-v1-testkey1234567890',
    } as any);

    const vision = resolveProfileForTask('vision');
    expect(vision.providerType).toBe('openrouter');
    expect(vision.id).toBe('openrouter-vision');
  });

  it('respects custom openrouterModel from settings', () => {
    vi.spyOn(aiSettings, 'getAISettings').mockReturnValue({
      activeProvider: 'openrouter',
      activeProfileId: 'openrouter-cloud',
      profiles: getDefaultProfiles(),
      taskRouting: {
        ...DEFAULT_TASK_ROUTING,
        structuringProfileId: 'openrouter-cloud',
      },
      openrouterApiKey: 'sk-or-v1-testkey1234567890',
      openrouterModel: 'google/gemini-2.0-flash-exp:free',
    } as any);

    const profile = resolveProfileForTask('structuring');
    expect(profile.model).toBe('google/gemini-2.0-flash-exp:free');
  });

  it('handles missing key gracefully in testProviderConnection', async () => {
    delete process.env.OPENROUTER_API_KEY;
    const res = await aiSettings.testProviderConnection('openrouter', '');
    expect(res.success).toBe(false);
    expect(res.message).toContain('OpenRouter API key is not configured');
  });
});
