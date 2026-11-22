'use client';

import { useState, useEffect } from 'react';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Cpu, Cloud, FlaskConical, FileCode } from 'lucide-react';
import { AiCockpitLocalTab } from './ai-cockpit-local-tab';
import { AiCockpitCloudTab } from './ai-cockpit-cloud-tab';
import { AiCockpitPromptsTab } from './ai-cockpit-prompts-tab';
import { AiCockpitTestbenchTab } from './ai-cockpit-testbench-tab';

export function AiProviderCockpit() {
  const [activeTab, setActiveTab] = useState<'local' | 'cloud' | 'prompts' | 'testbench'>('local');
  const [settings, setSettings] = useState<any>(null);
  const [models, setModels] = useState<any[]>([]);
  const [statusInfo, setStatusInfo] = useState<any>(null);
  const [selectedModelPath, setSelectedModelPath] = useState('');
  const [localRunning, setLocalRunning] = useState(false);
  const [loading, setLoading] = useState(false);
  const [testResults, setTestResults] = useState<Record<string, { success: boolean; latencyMs: number; message: string }>>({});
  const [taskRouting, setTaskRouting] = useState<any>(null);
  const [apiKeys, setApiKeys] = useState<any>({
    geminiApiKey: '',
    openaiApiKey: '',
    openrouterApiKey: '',
    openrouterModel: '',
    groqApiKey: '',
    anthropicApiKey: '',
    customBaseUrl: '',
    customApiKey: '',
    customModel: '',
  });

  const fetchAll = async () => {
    try {
      const [settRes, modRes] = await Promise.all([
        fetch('/api/ai/settings'),
        fetch('/api/ai/local-models'),
      ]);
      const settData = await settRes.json();
      const modData = await modRes.json();

      if (settData.success) {
        setSettings(settData.settings);
        setTaskRouting(settData.settings.taskRouting);
        setApiKeys({
          geminiApiKey: settData.settings.geminiApiKey || '',
          openaiApiKey: settData.settings.openaiApiKey || '',
          openrouterApiKey: settData.settings.openrouterApiKey || '',
          openrouterModel: settData.settings.openrouterModel || '',
          groqApiKey: settData.settings.groqApiKey || '',
          anthropicApiKey: settData.settings.anthropicApiKey || '',
          customBaseUrl: settData.settings.customBaseUrl || '',
          customApiKey: settData.settings.customApiKey || '',
          customModel: settData.settings.customModel || '',
        });
      }
      if (modData.success) {
        setModels(modData.models || []);
        setStatusInfo(modData.status);
        setLocalRunning(modData.status?.isRunning || false);
        if (!selectedModelPath && modData.models?.length > 0) {
          const rec = modData.models.find((m: any) => m.recommended) || modData.models[0];
          setSelectedModelPath(rec.id || rec.path);
        }
      }
    } catch {}
  };

  useEffect(() => {
    fetchAll();
  }, []);

  const handleStartLocal = async () => {
    setLoading(true);
    try {
      await fetch('/api/ai/local-models', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'start', model: selectedModelPath }),
      });
      await fetchAll();
    } finally {
      setLoading(false);
    }
  };

  const handleStopLocal = async () => {
    setLoading(true);
    try {
      await fetch('/api/ai/local-models', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'stop', model: selectedModelPath }),
      });
      await fetchAll();
    } finally {
      setLoading(false);
    }
  };

  const handleTestConnection = async (provider: string, key?: string, url?: string) => {
    setTestResults((prev) => ({ ...prev, [provider]: { success: false, latencyMs: 0, message: 'Pinging...' } }));
    try {
      const res = await fetch('/api/ai/settings', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'test_connection', provider, apiKey: key, baseUrl: url }),
      });
      const data = await res.json();
      setTestResults((prev) => ({ ...prev, [provider]: data }));
    } catch {
      setTestResults((prev) => ({ ...prev, [provider]: { success: false, latencyMs: 0, message: 'Network request failed' } }));
    }
  };

  const handleSaveAll = async () => {
    setLoading(true);
    try {
      await fetch('/api/ai/settings', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ ...apiKeys, taskRouting }),
      });
      await fetchAll();
    } finally {
      setLoading(false);
    }
  };

  const handleSetPrimaryProvider = async (provider: string) => {
    await fetch('/api/ai/settings', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ activeProvider: provider }),
    });
    await fetchAll();
  };

  return (
    <Card className="border-outline-variant/60 bg-surface-container-low shadow-xs">
      <CardHeader className="p-4 border-b border-outline-variant/60 flex flex-row items-center justify-between">
        <div className="flex items-center gap-2.5">
          <div className="w-8 h-8 rounded-lg bg-primary/20 text-primary flex items-center justify-center shrink-0">
            <Cpu className="w-4 h-4" />
          </div>
          <div>
            <CardTitle className="text-sm font-bold text-on-surface font-headline leading-tight">Universal AI Control Center</CardTitle>
            <p className="text-[11px] text-secondary mt-0.5">Manage Ollama Models, Cloud APIs, STT Dictation & Task Routing</p>
          </div>
        </div>
        <Badge variant={localRunning ? 'success' : 'outline'} className="text-[10px] font-mono border-primary/40 text-primary bg-primary/10">
          Active: {settings?.activeProvider?.toUpperCase() || 'LOCAL'} {localRunning && '(Ollama Active)'}
        </Badge>
      </CardHeader>

      <div className="flex border-b border-outline-variant/60 px-4 bg-surface-container-lowest/50 text-xs overflow-x-auto scrollbar-none">
        <button
          onClick={() => setActiveTab('local')}
          className={`flex items-center gap-1.5 py-2.5 px-3 border-b-2 transition-colors cursor-pointer shrink-0 ${
            activeTab === 'local'
              ? 'border-primary text-primary font-semibold'
              : 'border-transparent text-secondary hover:text-on-surface hover:bg-surface-container'
          }`}
        >
          <Cpu className="w-3.5 h-3.5" /> Ollama Local & VoiceStudio
        </button>
        <button
          onClick={() => setActiveTab('cloud')}
          className={`flex items-center gap-1.5 py-2.5 px-3 border-b-2 transition-colors cursor-pointer shrink-0 ${
            activeTab === 'cloud'
              ? 'border-primary text-primary font-semibold'
              : 'border-transparent text-secondary hover:text-on-surface hover:bg-surface-container'
          }`}
        >
          <Cloud className="w-3.5 h-3.5" /> Cloud & Task Routing
        </button>
        <button
          onClick={() => setActiveTab('prompts')}
          className={`flex items-center gap-1.5 py-2.5 px-3 border-b-2 transition-colors cursor-pointer shrink-0 ${
            activeTab === 'prompts'
              ? 'border-primary text-primary font-semibold'
              : 'border-transparent text-secondary hover:text-on-surface hover:bg-surface-container'
          }`}
        >
          <FileCode className="w-3.5 h-3.5" /> System Prompts
        </button>
        <button
          onClick={() => setActiveTab('testbench')}
          className={`flex items-center gap-1.5 py-2.5 px-3 border-b-2 transition-colors cursor-pointer shrink-0 ${
            activeTab === 'testbench'
              ? 'border-primary text-primary font-semibold'
              : 'border-transparent text-secondary hover:text-on-surface hover:bg-surface-container'
          }`}
        >
          <FlaskConical className="w-3.5 h-3.5" /> Test Bench
        </button>
      </div>

      <CardContent className="p-4 space-y-4 text-xs">
        {activeTab === 'local' && (
          <AiCockpitLocalTab
            models={models}
            selectedModelPath={selectedModelPath}
            setSelectedModelPath={setSelectedModelPath}
            localRunning={localRunning}
            statusInfo={statusInfo}
            loading={loading}
            settings={settings}
            testResults={testResults}
            onStartLocal={handleStartLocal}
            onStopLocal={handleStopLocal}
            onSetPrimaryProvider={handleSetPrimaryProvider}
            onTestConnection={handleTestConnection}
            onRefresh={fetchAll}
          />
        )}

        {activeTab === 'cloud' && (
          <AiCockpitCloudTab
            settings={settings}
            apiKeys={apiKeys}
            setApiKeys={setApiKeys}
            taskRouting={taskRouting}
            setTaskRouting={setTaskRouting}
            loading={loading}
            testResults={testResults}
            onTestConnection={handleTestConnection}
            onSetPrimaryProvider={handleSetPrimaryProvider}
            onSaveAll={handleSaveAll}
            onRefresh={fetchAll}
          />
        )}

        {activeTab === 'prompts' && (
          <AiCockpitPromptsTab settings={settings} onRefresh={fetchAll} />
        )}

        {activeTab === 'testbench' && <AiCockpitTestbenchTab />}
      </CardContent>
    </Card>
  );
}
