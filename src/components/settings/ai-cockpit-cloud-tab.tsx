'use client';

import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';

interface AiCockpitCloudTabProps {
  settings: any;
  apiKeys: {
    geminiApiKey: string;
    openaiApiKey: string;
    openrouterApiKey: string;
    openrouterModel?: string;
    groqApiKey: string;
    anthropicApiKey?: string;
    customBaseUrl?: string;
    customApiKey?: string;
    customModel?: string;
  };
  setApiKeys: React.Dispatch<React.SetStateAction<any>>;
  taskRouting: any;
  setTaskRouting: React.Dispatch<React.SetStateAction<any>>;
  loading: boolean;
  testResults: Record<string, { success: boolean; latencyMs: number; message: string }>;
  onTestConnection: (provider: string, key?: string, url?: string) => void;
  onSetPrimaryProvider: (provider: string) => void;
  onSaveAll: () => void;
  onRefresh: () => void;
}

export function AiCockpitCloudTab({
  settings,
  apiKeys,
  setApiKeys,
  taskRouting,
  setTaskRouting,
  loading,
  testResults,
  onTestConnection,
  onSetPrimaryProvider,
  onSaveAll,
  onRefresh,
}: AiCockpitCloudTabProps) {
  const profiles = settings?.profiles || [];

  return (
    <div className="space-y-4 text-xs">
      {/* Task Routing Section */}
      <div className="p-3.5 rounded-xl border border-outline-variant/60 bg-surface-container space-y-3">
        <div className="flex items-center justify-between">
          <span className="font-bold text-on-surface">Specialized AI Task Routing</span>
          <Badge variant="outline" className="text-[10px] border-primary/40 text-primary bg-primary/10">Smart Orchestrator</Badge>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-2.5">
          <div>
            <label className="text-[10px] font-semibold text-secondary block mb-1">Report Structuring:</label>
            <select
              value={taskRouting?.structuringProfileId || 'ollama-medgemma'}
              onChange={(e) => setTaskRouting({ ...taskRouting, structuringProfileId: e.target.value })}
              className="w-full p-2 rounded-lg border border-outline-variant/60 bg-surface-container-low text-on-surface text-[11px] focus:ring-1 focus:ring-primary focus:outline-none"
            >
              {profiles.map((p: any) => (
                <option key={p.id} value={p.id}>{p.name}</option>
              ))}
            </select>
          </div>
          <div>
            <label className="text-[10px] font-semibold text-secondary block mb-1">Discrepancy / Copilot:</label>
            <select
              value={taskRouting?.copilotProfileId || 'ollama-medgemma'}
              onChange={(e) => setTaskRouting({ ...taskRouting, copilotProfileId: e.target.value })}
              className="w-full p-2 rounded-lg border border-outline-variant/60 bg-surface-container-low text-on-surface text-[11px] focus:ring-1 focus:ring-primary focus:outline-none"
            >
              {profiles.map((p: any) => (
                <option key={p.id} value={p.id}>{p.name}</option>
              ))}
            </select>
          </div>
          <div>
            <label className="text-[10px] font-semibold text-secondary block mb-1">Multimodal Vision:</label>
            <select
              value={taskRouting?.visionProfileId || 'gemini-cloud'}
              onChange={(e) => setTaskRouting({ ...taskRouting, visionProfileId: e.target.value })}
              className="w-full p-2 rounded-lg border border-outline-variant/60 bg-surface-container-low text-on-surface text-[11px] focus:ring-1 focus:ring-primary focus:outline-none"
            >
              {profiles.map((p: any) => (
                <option key={p.id} value={p.id}>{p.name}</option>
              ))}
            </select>
          </div>
        </div>
      </div>

      {/* Google Gemini */}
      <div className="p-3 rounded-xl border border-outline-variant/60 bg-surface-container space-y-2">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <span className="font-bold text-on-surface">Google Gemini API</span>
            {settings?.activeProvider === 'gemini' && <Badge variant="success">Active</Badge>}
          </div>
          <div className="flex items-center gap-1.5">
            {testResults.gemini && (
              <span className={`text-[10px] font-semibold ${testResults.gemini.success ? 'text-primary' : 'text-error'}`}>
                {testResults.gemini.success ? `✓ ${testResults.gemini.latencyMs}ms` : '✗'}
              </span>
            )}
            <Button size="sm" variant="outline" onClick={() => onTestConnection('gemini', apiKeys.geminiApiKey)}>Test</Button>
            <Button size="sm" variant="ghost" onClick={() => onSetPrimaryProvider('gemini')}>Set Primary</Button>
          </div>
        </div>
        <input
          type="password"
          value={apiKeys.geminiApiKey || ''}
          onChange={(e) => setApiKeys({ ...apiKeys, geminiApiKey: e.target.value })}
          placeholder="AIzaSy... (Gemini API Key)"
          className="w-full p-2 rounded-lg border border-outline-variant/60 bg-surface-container-low text-on-surface font-mono text-[11px] focus:ring-1 focus:ring-primary focus:outline-none"
        />
      </div>

      {/* Anthropic Claude */}
      <div className="p-3 rounded-xl border border-outline-variant/60 bg-surface-container space-y-2">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <span className="font-bold text-on-surface">Anthropic Claude (Claude 3.7 Sonnet)</span>
            {settings?.activeProvider === 'anthropic' && <Badge variant="success">Active</Badge>}
          </div>
          <div className="flex items-center gap-1.5">
            {testResults.anthropic && (
              <span className={`text-[10px] font-semibold ${testResults.anthropic.success ? 'text-primary' : 'text-error'}`}>
                {testResults.anthropic.success ? `✓ ${testResults.anthropic.latencyMs}ms` : '✗'}
              </span>
            )}
            <Button size="sm" variant="outline" onClick={() => onTestConnection('anthropic', apiKeys.anthropicApiKey)}>Test</Button>
            <Button size="sm" variant="ghost" onClick={() => onSetPrimaryProvider('anthropic')}>Set Primary</Button>
          </div>
        </div>
        <input
          type="password"
          value={apiKeys.anthropicApiKey || ''}
          onChange={(e) => setApiKeys({ ...apiKeys, anthropicApiKey: e.target.value })}
          placeholder="sk-ant-api03-... (Anthropic API Key)"
          className="w-full p-2 rounded-lg border border-outline-variant/60 bg-surface-container-low text-on-surface font-mono text-[11px] focus:ring-1 focus:ring-primary focus:outline-none"
        />
      </div>

      {/* OpenAI */}
      <div className="p-3 rounded-xl border border-outline-variant/60 bg-surface-container space-y-2">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <span className="font-bold text-on-surface">OpenAI API (GPT-4o / Whisper)</span>
            {settings?.activeProvider === 'openai' && <Badge variant="success">Active</Badge>}
          </div>
          <div className="flex items-center gap-1.5">
            {testResults.openai && (
              <span className={`text-[10px] font-semibold ${testResults.openai.success ? 'text-primary' : 'text-error'}`}>
                {testResults.openai.success ? `✓ ${testResults.openai.latencyMs}ms` : '✗'}
              </span>
            )}
            <Button size="sm" variant="outline" onClick={() => onTestConnection('openai', apiKeys.openaiApiKey)}>Test</Button>
            <Button size="sm" variant="ghost" onClick={() => onSetPrimaryProvider('openai')}>Set Primary</Button>
          </div>
        </div>
        <input
          type="password"
          value={apiKeys.openaiApiKey || ''}
          onChange={(e) => setApiKeys({ ...apiKeys, openaiApiKey: e.target.value })}
          placeholder="sk-proj-... (OpenAI API Key)"
          className="w-full p-2 rounded-lg border border-outline-variant/60 bg-surface-container-low text-on-surface font-mono text-[11px] focus:ring-1 focus:ring-primary focus:outline-none"
        />
      </div>

      {/* OpenRouter & Groq */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
        <div className="p-3 rounded-xl border border-outline-variant/60 bg-surface-container space-y-2">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-1.5">
              <span className="font-bold text-on-surface">OpenRouter</span>
              {settings?.activeProvider === 'openrouter' && <Badge variant="success">Active</Badge>}
            </div>
            <div className="flex items-center gap-1">
              {testResults.openrouter && (
                <span className={`text-[10px] font-semibold ${testResults.openrouter.success ? 'text-primary' : 'text-error'}`}>
                  {testResults.openrouter.success ? `✓ ${testResults.openrouter.latencyMs}ms` : '✗'}
                </span>
              )}
              <Button size="sm" variant="outline" onClick={() => onTestConnection('openrouter', apiKeys.openrouterApiKey)}>Test</Button>
              <Button size="sm" variant="ghost" onClick={() => onSetPrimaryProvider('openrouter')}>Set Primary</Button>
            </div>
          </div>
          <input
            type="password"
            value={apiKeys.openrouterApiKey || ''}
            onChange={(e) => setApiKeys({ ...apiKeys, openrouterApiKey: e.target.value })}
            placeholder="sk-or-v1-... (OpenRouter API Key)"
            className="w-full p-2 rounded-lg border border-outline-variant/60 bg-surface-container-low text-on-surface font-mono text-[11px] focus:ring-1 focus:ring-primary focus:outline-none"
          />
          <input
            type="text"
            value={apiKeys.openrouterModel || ''}
            onChange={(e) => setApiKeys({ ...apiKeys, openrouterModel: e.target.value })}
            placeholder="meta-llama/llama-3.3-70b-instruct:free"
            className="w-full p-1.5 rounded-lg border border-outline-variant/60 bg-surface-container-low text-on-surface font-mono text-[10px] focus:ring-1 focus:ring-primary focus:outline-none"
            title="Model ID on OpenRouter"
          />
        </div>
        <div className="p-3 rounded-xl border border-outline-variant/60 bg-surface-container space-y-2">
          <div className="flex items-center justify-between">
            <span className="font-bold text-on-surface">Groq Cloud</span>
            <Button size="sm" variant="outline" onClick={() => onTestConnection('groq', apiKeys.groqApiKey)}>Test</Button>
          </div>
          <input
            type="password"
            value={apiKeys.groqApiKey || ''}
            onChange={(e) => setApiKeys({ ...apiKeys, groqApiKey: e.target.value })}
            placeholder="gsk_..."
            className="w-full p-2 rounded-lg border border-outline-variant/60 bg-surface-container-low text-on-surface font-mono text-[11px] focus:ring-1 focus:ring-primary focus:outline-none"
          />
        </div>
      </div>

      {/* Custom OpenAI-Compatible */}
      <div className="p-3 rounded-xl border border-outline-variant/60 bg-surface-container space-y-2">
        <div className="flex items-center justify-between">
          <span className="font-bold text-on-surface">Custom OpenAI-Compatible (LAN/vLLM)</span>
          <Button size="sm" variant="outline" onClick={() => onTestConnection('openai-compatible', apiKeys.customApiKey, apiKeys.customBaseUrl)}>Test</Button>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
          <input
            type="text"
            value={apiKeys.customBaseUrl || ''}
            onChange={(e) => setApiKeys({ ...apiKeys, customBaseUrl: e.target.value })}
            placeholder="http://192.168.1.50:11434/v1"
            className="p-2 rounded-lg border border-outline-variant/60 bg-surface-container-low text-on-surface font-mono text-[11px] focus:ring-1 focus:ring-primary focus:outline-none"
          />
          <input
            type="text"
            value={apiKeys.customModel || ''}
            onChange={(e) => setApiKeys({ ...apiKeys, customModel: e.target.value })}
            placeholder="medgemma:4b"
            className="p-2 rounded-lg border border-outline-variant/60 bg-surface-container-low text-on-surface font-mono text-[11px] focus:ring-1 focus:ring-primary focus:outline-none"
          />
        </div>
      </div>

      <Button size="sm" variant="primary" onClick={onSaveAll} isLoading={loading} className="w-full py-2 font-semibold">
        Save AI Profiles & Task Routing
      </Button>
    </div>
  );
}
