/**
 * Local AI Model Manager & Ollama Orchestrator (Layer 2 - Domain/Services)
 * Interacts with Ollama (port 11434) and VoiceStudio (port 3900).
 * Provides zero-downtime model warmup, dynamic VRAM inspection, and instant memory unloads.
 */
import fs from 'fs';
import path from 'path';
import { getAISettings, saveAISettings } from './ai-settings.service';
import { config } from '@/lib/config';

export interface LocalDiscoveredModel {
  id: string;
  name: string;
  path: string;
  sizeMb: number;
  category: 'Radiology Fine-Tuned' | 'General Medical' | 'Lightweight Fast' | 'General LLM';
  recommended?: boolean;
}

export const OLLAMA_PORT = 11434;
const OLLAMA_BASE_URL = config.ollamaUrl ? config.ollamaUrl.replace(/\/v1\/?$/, '') : 'http://127.0.0.1:11434';

export async function listDiscoveredLocalModels(): Promise<LocalDiscoveredModel[]> {
  const models: LocalDiscoveredModel[] = [];

  try {
    const res = await fetch(`${OLLAMA_BASE_URL}/api/tags`, { signal: AbortSignal.timeout(2500) });
    if (res.ok) {
      const data = await res.json();
      for (const item of data.models || []) {
        const name: string = item.name || '';
        const sizeMb = Math.round((item.size || 0) / (1024 * 1024));

        let category: LocalDiscoveredModel['category'] = 'General LLM';
        let recommended = false;
        let friendlyName = name;

        if (/medgemma/i.test(name)) {
          category = 'Radiology Fine-Tuned';
          recommended = true;
          friendlyName = 'MedGemma 1.5 4B (Radiology Fine-Tuned)';
        } else if (/qwen/i.test(name)) {
          category = 'General Medical';
          recommended = true;
          friendlyName = 'Qwen 3.5 4B Clinical';
        } else if (/nemotron/i.test(name)) {
          category = 'Lightweight Fast';
          recommended = true;
          friendlyName = 'NVIDIA Nemotron 3 Nano 4B (Fast Reporting)';
        } else if (/gemma-4|gemma4/i.test(name)) {
          category = 'General Medical';
          friendlyName = 'Gemma 4 E4B Multimodal';
        }

        models.push({
          id: name,
          name: friendlyName,
          path: `ollama://${name}`,
          sizeMb,
          category,
          recommended,
        });
      }
    }
  } catch {
    // Ollama not reachable via HTTP
  }

  // Also check loose GGUFs in E:\AI\gguf
  const ggufDir = 'E:\\AI\\gguf';
  if (fs.existsSync(ggufDir)) {
    try {
      const files = fs.readdirSync(ggufDir);
      for (const file of files) {
        if (file.endsWith('.gguf') && !file.startsWith('mmproj-')) {
          const stat = fs.statSync(path.join(ggufDir, file));
          const sizeMb = Math.round(stat.size / (1024 * 1024));
          models.push({
            id: file.replace(/\.gguf$/, ''),
            name: `${file.replace(/\.gguf$/, '')} (GGUF Source)`,
            path: path.join(ggufDir, file),
            sizeMb,
            category: file.includes('medgemma') ? 'Radiology Fine-Tuned' : 'General LLM',
            recommended: false,
          });
        }
      }
    } catch {}
  }

  return models.sort((a, b) => (b.recommended ? 1 : 0) - (a.recommended ? 1 : 0));
}

export function getFriendlyModelName(nameOrPath: string | null | undefined): string {
  if (!nameOrPath) return 'MedGemma 4B';
  const base = path.basename(nameOrPath);
  if (/medgemma/i.test(base)) return 'MedGemma 1.5 (4B)';
  if (/nemotron/i.test(base)) return 'Nemotron 3 Nano (4B)';
  if (/qwen/i.test(base)) return 'Qwen 3.5 Clinical (4B)';
  if (/gemma-4|gemma4/i.test(base)) return 'Gemma-4 E4B';
  return base.replace(/\.gguf$/, '').replace(/:latest$/, '');
}

export async function checkLocalServerStatus(): Promise<{
  isRunning: boolean;
  loadedModel: string | null;
  loadedModelName: string | null;
  vramBytes?: number;
  configuredModelName: string;
  port: number;
  voiceStudioRunning: boolean;
  voiceStudioDevice?: string;
}> {
  const settings = getAISettings();
  const configuredModelName = getFriendlyModelName(settings.localModelPath);

  let isRunning = false;
  let loadedModel: string | null = null;
  let vramBytes: number | undefined;
  let voiceStudioRunning = false;
  let voiceStudioDevice: string | undefined;

  try {
    const res = await fetch(`${OLLAMA_BASE_URL}/api/ps`, { signal: AbortSignal.timeout(1500) });
    if (res.ok) {
      isRunning = true;
      const data = await res.json();
      if (Array.isArray(data.models) && data.models.length > 0) {
        loadedModel = data.models[0].name || data.models[0].model;
        vramBytes = data.models[0].size_vram;
      }
    }
  } catch {
    isRunning = false;
  }

  try {
    const vsRes = await fetch(`${config.voiceStudioUrl || 'http://127.0.0.1:3900'}/health`, {
      signal: AbortSignal.timeout(1500),
    });
    if (vsRes.ok) {
      const vsData = await vsRes.json();
      voiceStudioRunning = true;
      voiceStudioDevice = vsData.device;
    }
  } catch {
    voiceStudioRunning = false;
  }

  return {
    isRunning,
    loadedModel,
    loadedModelName: loadedModel ? getFriendlyModelName(loadedModel) : null,
    vramBytes,
    configuredModelName,
    port: OLLAMA_PORT,
    voiceStudioRunning,
    voiceStudioDevice,
  };
}

export async function startLocalModel(modelName = 'medgemma:4b'): Promise<{ success: boolean; message: string }> {
  try {
    const targetModel = modelName.includes('://') ? modelName.split('://')[1] : modelName;
    const res = await fetch(`${OLLAMA_BASE_URL}/api/generate`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        model: targetModel,
        keep_alive: '60m',
      }),
      signal: AbortSignal.timeout(15000),
    });

    if (res.ok) {
      saveAISettings({ activeProvider: 'local', localModelPath: targetModel });
      return {
        success: true,
        message: `${getFriendlyModelName(targetModel)} warmed up in VRAM on port ${OLLAMA_PORT}.`,
      };
    }
    return { success: false, message: `Ollama warmup failed: HTTP ${res.status}` };
  } catch (err: any) {
    return { success: false, message: `Could not connect to Ollama: ${err.message}` };
  }
}

export async function stopLocalModel(modelName?: string): Promise<{ success: boolean; message: string }> {
  try {
    const status = await checkLocalServerStatus();
    const target = modelName || status.loadedModel || 'medgemma:4b';

    await fetch(`${OLLAMA_BASE_URL}/api/generate`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        model: target,
        keep_alive: 0,
      }),
      signal: AbortSignal.timeout(5000),
    });

    return {
      success: true,
      message: `${getFriendlyModelName(target)} unloaded. GPU VRAM released.`,
    };
  } catch (err: any) {
    return { success: false, message: `Failed to unload model: ${err.message}` };
  }
}
