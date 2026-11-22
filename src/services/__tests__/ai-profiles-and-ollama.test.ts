import { describe, it, expect } from 'vitest';
import { getDefaultProfiles, DEFAULT_TASK_ROUTING } from '../ai-default-profiles';
import { getAISettings, saveAISettings, testProviderConnection } from '../ai-settings.service';
import { resolveProfileForTask } from '../ai-router.service';

describe('AI Profiles & Task Routing System', () => {
  it('generates standard profiles with Ollama MedGemma as default', () => {
    const profiles = getDefaultProfiles();
    expect(profiles.length).toBeGreaterThanOrEqual(8);

    const medgemma = profiles.find((p) => p.id === 'ollama-medgemma');
    expect(medgemma).toBeDefined();
    expect(medgemma?.isLocal).toBe(true);
    expect(medgemma?.providerType).toBe('ollama');
    expect(medgemma?.model).toBe('medgemma:4b');

    const gemini = profiles.find((p) => p.id === 'gemini-cloud');
    expect(gemini).toBeDefined();
    expect(gemini?.providerType).toBe('gemini');
  });

  it('provides default task routing pointing to local Ollama and local VoiceStudio', () => {
    expect(DEFAULT_TASK_ROUTING.structuringProfileId).toBe('ollama-medgemma');
    expect(DEFAULT_TASK_ROUTING.copilotProfileId).toBe('ollama-medgemma');
    expect(DEFAULT_TASK_ROUTING.visionProfileId).toBe('gemini-cloud');
    expect(DEFAULT_TASK_ROUTING.sttEngine).toBe('voicestudio-local');
    expect(DEFAULT_TASK_ROUTING.voiceStudioUrl).toContain('3900');
  });

  it('correctly resolves specialized profiles by task type', () => {
    const structuring = resolveProfileForTask('structuring');
    expect(structuring.providerType).toBe('ollama');

    const copilot = resolveProfileForTask('copilot');
    expect(copilot.providerType).toBe('ollama');

    const vision = resolveProfileForTask('vision');
    expect(vision.providerType).toBe('gemini');
  });

  it('handles offline deterministic rules connection test immediately', async () => {
    const result = await testProviderConnection('offline-rules');
    expect(result.success).toBe(true);
    expect(result.latencyMs).toBe(0);
  });
});
