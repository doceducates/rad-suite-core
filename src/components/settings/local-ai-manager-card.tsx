'use client';

import { useState, useEffect } from 'react';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Cpu, Play, Square, RefreshCw, HardDrive, ShieldCheck, Zap } from 'lucide-react';
import { notify } from '@/services/notification.service';

interface LocalModel {
  id: string;
  name: string;
  path: string;
  sizeMb: number;
  category: string;
  recommended?: boolean;
}

export function LocalAiManagerCard() {
  const [models, setModels] = useState<LocalModel[]>([]);
  const [selectedModelPath, setSelectedModelPath] = useState('');
  const [isRunning, setIsRunning] = useState(false);
  const [loadedModel, setLoadedModel] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState<string | null>(null);

  const fetchStatus = async () => {
    try {
      const res = await fetch('/api/ai/local-models');
      const data = await res.json();
      if (data.success) {
        setModels(data.models || []);
        setIsRunning(data.status?.isRunning || false);
        setLoadedModel(data.status?.loadedModel || null);
        if (!selectedModelPath && data.models?.length > 0) {
          const recommended = data.models.find((m: LocalModel) => m.recommended) || data.models[0];
          setSelectedModelPath(recommended.path);
        }
      }
    } catch {
      // Offline fallback
    }
  };

  useEffect(() => {
    fetchStatus();
  }, []);

  const handleStart = async () => {
    setLoading(true);
    setMessage('Booting model into memory...');
    notify.info('Booting local AI model into memory...');
    try {
      const res = await fetch('/api/ai/local-models', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'start', modelPath: selectedModelPath }),
      });
      const data = await res.json();
      setMessage(data.message);
      if (data.success) {
        notify.success(data.message || 'Local AI model loaded successfully');
      } else {
        notify.error(data.error || 'Failed loading local model');
      }
      await fetchStatus();
    } catch {
      setMessage('Failed to connect to local engine');
      notify.error('Failed to connect to local engine');
    } finally {
      setLoading(false);
    }
  };

  const handleStop = async () => {
    setLoading(true);
    notify.info('Unloading local AI model...');
    try {
      const res = await fetch('/api/ai/local-models', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'stop' }),
      });
      const data = await res.json();
      setMessage('Local model unloaded.');
      if (data.success) {
        notify.success('Local AI model unloaded successfully');
      } else {
        notify.error(data.error || 'Failed unloading model');
      }
      await fetchStatus();
    } catch {
      notify.error('Failed to communicate with local engine');
    } finally {
      setLoading(false);
    }
  };

  return (
    <Card className="border-zinc-200 dark:border-zinc-800 bg-white dark:bg-slate-900 shadow-md">
      <CardHeader className="p-4 border-b border-zinc-100 dark:border-zinc-800 flex flex-row items-center justify-between">
        <div className="flex items-center gap-2">
          <div className="p-1.5 rounded-lg bg-emerald-600 text-white">
            <Cpu className="w-4 h-4" />
          </div>
          <div>
            <CardTitle className="text-sm">In-App Local Medical AI (Zero Terminal)</CardTitle>
            <p className="text-[11px] text-zinc-500">Auto-loads GGUF models from E:\AI\models with zero command lines</p>
          </div>
        </div>
        <Badge variant={isRunning ? 'success' : 'outline'} className="gap-1 text-[10px]">
          {isRunning ? (
            <>
              <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" /> Running (Port 8090)
            </>
          ) : (
            'Standby (Idle)'
          )}
        </Badge>
      </CardHeader>

      <CardContent className="p-4 space-y-4 text-xs">
        {/* Model Selector Dropdown */}
        <div className="space-y-1.5">
          <label className="font-bold text-zinc-700 dark:text-zinc-300 block text-[11px]">
            Select Local Medical Model (Discovered from E:\AI\models):
          </label>
          <select
            value={selectedModelPath}
            onChange={(e) => setSelectedModelPath(e.target.value)}
            disabled={isRunning}
            className="w-full p-2.5 rounded-lg border border-zinc-200 dark:border-zinc-800 bg-zinc-50 dark:bg-zinc-950 font-medium text-xs focus:ring-1 focus:ring-emerald-500 focus:outline-none disabled:opacity-60"
          >
            {models.map((m) => (
              <option key={m.path} value={m.path}>
                {m.recommended ? '⭐ ' : ''}{m.name} ({m.sizeMb} MB) — {m.category}
              </option>
            ))}
          </select>
        </div>

        {/* 1-Click Action Buttons */}
        <div className="flex items-center gap-2">
          {!isRunning ? (
            <Button
              size="sm"
              variant="primary"
              onClick={handleStart}
              isLoading={loading}
              className="gap-1.5 font-semibold text-xs py-2 bg-emerald-600 hover:bg-emerald-700"
            >
              <Play className="w-3.5 h-3.5 fill-current" /> Load & Start Local AI Engine
            </Button>
          ) : (
            <Button
              size="sm"
              variant="danger"
              onClick={handleStop}
              isLoading={loading}
              className="gap-1.5 font-semibold text-xs py-2"
            >
              <Square className="w-3.5 h-3.5 fill-current" /> Unload & Stop Engine
            </Button>
          )}

          <Button size="sm" variant="ghost" onClick={fetchStatus} className="gap-1 text-xs">
            <RefreshCw className="w-3 h-3" /> Refresh
          </Button>
        </div>

        {/* Status Message */}
        {message && (
          <div className="p-2.5 rounded-lg bg-zinc-100 dark:bg-zinc-800/60 text-zinc-700 dark:text-zinc-300 text-[11px] flex items-center gap-2">
            <Zap className="w-3.5 h-3.5 text-amber-500 shrink-0" />
            <span>{message}</span>
          </div>
        )}

        {/* Privacy & Air-Gapped Assurance */}
        <div className="p-3 rounded-xl bg-emerald-50/50 dark:bg-emerald-950/20 border border-emerald-500/20 flex items-start gap-2.5">
          <ShieldCheck className="w-4 h-4 text-emerald-600 dark:text-emerald-400 shrink-0 mt-0.5" />
          <div className="text-[11px] text-zinc-600 dark:text-zinc-400 leading-relaxed">
            <strong className="text-zinc-900 dark:text-zinc-200 block">100% Hospital Air-Gapped Operation:</strong>
            When running locally, all radiology dictations, laterality checks, and impression reviews run on your computer's CPU/GPU. Zero bytes of patient clinical data (PHI) are transmitted to external servers.
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
