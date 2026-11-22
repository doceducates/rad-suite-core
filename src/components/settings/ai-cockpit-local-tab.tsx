'use client';

import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Play, Square, RefreshCw, Cpu, Mic, CheckCircle2, AlertCircle } from 'lucide-react';
import { config } from '@/lib/config';

interface AiCockpitLocalTabProps {
  models: any[];
  selectedModelPath: string;
  setSelectedModelPath: (path: string) => void;
  localRunning: boolean;
  statusInfo?: any;
  loading: boolean;
  settings: any;
  testResults: Record<string, { success: boolean; latencyMs: number; message: string }>;
  onStartLocal: () => void;
  onStopLocal: () => void;
  onSetPrimaryProvider: (provider: string) => void;
  onTestConnection: (provider: string) => void;
  onRefresh: () => void;
}

export function AiCockpitLocalTab({
  models,
  selectedModelPath,
  setSelectedModelPath,
  localRunning,
  statusInfo,
  loading,
  settings,
  testResults,
  onStartLocal,
  onStopLocal,
  onSetPrimaryProvider,
  onTestConnection,
  onRefresh,
}: AiCockpitLocalTabProps) {
  const loadedModel = statusInfo?.loadedModelName || (localRunning ? 'MedGemma 4B' : null);
  const vramMb = statusInfo?.vramBytes ? Math.round(statusInfo.vramBytes / (1024 * 1024)) : null;

  return (
    <div className="space-y-4 text-xs">
      {/* Engine Status Banner */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
        {/* Ollama LLM Card */}
        <div className="p-3.5 rounded-xl border border-outline-variant/60 bg-surface-container space-y-2">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <div className="w-7 h-7 rounded-lg bg-primary/15 text-primary flex items-center justify-center shrink-0">
                <Cpu className="w-4 h-4" />
              </div>
              <span className="font-bold text-on-surface">Ollama Local LLM</span>
            </div>
            <Badge variant={localRunning ? 'success' : 'outline'} className="text-[10px] font-mono">
              {localRunning ? 'Port 11434 Active' : 'Offline / Standby'}
            </Badge>
          </div>
          <p className="text-[11px] text-secondary">
            {loadedModel ? (
              <span className="text-primary font-medium">
                VRAM: {loadedModel} {vramMb ? `(${vramMb} MB in GPU)` : ''}
              </span>
            ) : (
              'Standby: Zero GPU VRAM used until loaded.'
            )}
          </p>
        </div>

        {/* VoiceStudio STT Card */}
        <div className="p-3.5 rounded-xl border border-outline-variant/60 bg-surface-container space-y-2">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <div className="w-7 h-7 rounded-lg bg-primary/15 text-primary flex items-center justify-center shrink-0">
                <Mic className="w-4 h-4" />
              </div>
              <span className="font-bold text-on-surface">VoiceStudio STT</span>
            </div>
            <Badge variant={statusInfo?.voiceStudioRunning ? 'success' : 'outline'} className="text-[10px] font-mono">
              {statusInfo?.voiceStudioRunning ? 'Port 3900 Active' : 'Standby'}
            </Badge>
          </div>
          <p className="text-[11px] text-secondary">
            {statusInfo?.voiceStudioRunning ? (
              <span className="text-primary font-medium">
                Device: {statusInfo.voiceStudioDevice || 'CUDA (RTX 4050)'}
              </span>
            ) : (
              'Faster-Whisper Large-v3-Turbo local dictation backend.'
            )}
          </p>
        </div>
      </div>

      {/* Model Selection Dropdown */}
      <div className="space-y-1.5">
        <label className="font-bold text-on-surface block text-[11px]">
          Installed Ollama & GGUF Models (E:\AI\ollama):
        </label>
        <select
          value={selectedModelPath}
          onChange={(e) => setSelectedModelPath(e.target.value)}
          className="w-full p-2.5 rounded-lg border border-outline-variant/60 bg-surface-container-low text-on-surface font-medium text-xs focus:ring-1 focus:ring-primary focus:border-primary focus:outline-none"
        >
          {models.map((m) => (
            <option key={m.id || m.path} value={m.id || m.path}>
              {m.recommended ? '⭐ ' : ''}{m.name} ({m.sizeMb} MB) — {m.category}
            </option>
          ))}
        </select>
      </div>

      {/* Action Buttons */}
      <div className="flex flex-wrap items-center gap-2">
        <Button
          size="sm"
          variant="primary"
          onClick={onStartLocal}
          isLoading={loading}
          className="gap-1.5 font-semibold text-xs py-2"
        >
          <Play className="w-3.5 h-3.5 fill-current" /> Warm Up Model in VRAM
        </Button>

        {loadedModel && (
          <Button
            size="sm"
            variant="danger"
            onClick={onStopLocal}
            isLoading={loading}
            className="gap-1.5 font-semibold text-xs py-2"
          >
            <Square className="w-3.5 h-3.5 fill-current" /> Unload & Free VRAM
          </Button>
        )}

        <Button
          size="sm"
          variant={settings?.activeProvider === 'local' ? 'success' : 'outline'}
          onClick={() => onSetPrimaryProvider('local')}
          className="gap-1 text-xs"
        >
          {settings?.activeProvider === 'local' ? '✓ Primary Active' : 'Set as Primary'}
        </Button>

        <Button size="sm" variant="ghost" onClick={onRefresh} className="gap-1 text-xs">
          <RefreshCw className="w-3 h-3" /> Refresh
        </Button>
      </div>

      {/* Test Connection Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-3 pt-2">
        {/* Test Ollama */}
        <div className="p-3 rounded-xl border border-outline-variant/60 bg-surface-container flex items-center justify-between">
          <div>
            <span className="font-semibold text-on-surface block">Test Ollama Port 11434</span>
            <span className="text-[10px] text-secondary">Pings {config.ollamaUrl || '127.0.0.1:11434'}</span>
          </div>
          <div className="flex items-center gap-2">
            {testResults.ollama && (
              <span className={`text-[10px] font-semibold ${testResults.ollama.success ? 'text-primary' : 'text-error'}`}>
                {testResults.ollama.success ? `✓ ${testResults.ollama.latencyMs}ms` : '✗'}
              </span>
            )}
            <Button size="sm" variant="outline" onClick={() => onTestConnection('ollama')}>
              Ping
            </Button>
          </div>
        </div>

        {/* Test VoiceStudio */}
        <div className="p-3 rounded-xl border border-outline-variant/60 bg-surface-container flex items-center justify-between">
          <div>
            <span className="font-semibold text-on-surface block">Test VoiceStudio Port 3900</span>
            <span className="text-[10px] text-secondary">Pings {config.voiceStudioUrl || '127.0.0.1:3900'}</span>
          </div>
          <div className="flex items-center gap-2">
            {testResults.voicestudio && (
              <span className={`text-[10px] font-semibold ${testResults.voicestudio.success ? 'text-primary' : 'text-error'}`}>
                {testResults.voicestudio.success ? `✓ ${testResults.voicestudio.latencyMs}ms` : '✗'}
              </span>
            )}
            <Button size="sm" variant="outline" onClick={() => onTestConnection('voicestudio')}>
              Ping
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
}
