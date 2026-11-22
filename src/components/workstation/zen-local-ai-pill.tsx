'use client';

import React, { useState, useEffect, useCallback } from 'react';
import { Sparkles, Square, Loader2 } from 'lucide-react';
import { notify } from '@/services/notification.service';

interface LocalStatus {
  isRunning: boolean;
  loadedModelName: string | null;
  configuredModelName: string | null;
  port: number;
}

export function ZenLocalAiPill() {
  const [status, setStatus] = useState<LocalStatus>({
    isRunning: false,
    loadedModelName: null,
    configuredModelName: null,
    port: 11434,
  });
  const [loading, setLoading] = useState(false);
  const [notice, setNotice] = useState<string | null>(null);

  const fetchStatus = useCallback(async () => {
    try {
      const res = await fetch('/api/ai/local-models');
      const data = await res.json();
      if (data.success && data.status) {
        setStatus({
          isRunning: data.status.isRunning,
          loadedModelName: data.status.loadedModelName,
          configuredModelName: data.status.configuredModelName || 'Local AI',
          port: data.status.port || 11434,
        });
      }
    } catch {
      // Offline fallback
    }
  }, []);

  useEffect(() => {
    fetchStatus();
    const interval = setInterval(fetchStatus, 8000);
    return () => clearInterval(interval);
  }, [fetchStatus]);

  const activeModelDisplay = status.loadedModelName || status.configuredModelName || 'Local AI';

  const handleStart = async (e: React.MouseEvent) => {
    e.stopPropagation();
    if (loading) return;
    setLoading(true);
    setNotice(`Loading ${status.configuredModelName || 'Local AI'}...`);
    notify.info(`Loading ${status.configuredModelName || 'Local AI'}...`);
    try {
      const res = await fetch('/api/ai/local-models', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'start' }),
      });
      const data = await res.json();
      setNotice(data.message || null);
      if (data.success) {
        notify.success(data.message || 'Local AI model loaded successfully');
      } else {
        notify.error(data.error || 'Failed to load local model');
      }
      await fetchStatus();
    } catch {
      setNotice('Failed to load local model');
      notify.error('Failed to load local model');
    } finally {
      setLoading(false);
      setTimeout(() => setNotice(null), 3000);
    }
  };

  const handleStop = async (e: React.MouseEvent) => {
    e.stopPropagation();
    if (loading) return;
    setLoading(true);
    setNotice('Unloading...');
    notify.info('Unloading local AI model...');
    try {
      const res = await fetch('/api/ai/local-models', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'stop' }),
      });
      const data = await res.json();
      setNotice(data.message || null);
      if (data.success) {
        notify.success(data.message || 'Local AI model unloaded');
      } else {
        notify.error(data.error || 'Failed to unload model');
      }
      await fetchStatus();
    } catch {
      setNotice('Failed to unload model');
      notify.error('Failed to unload model');
    } finally {
      setLoading(false);
      setTimeout(() => setNotice(null), 3000);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center gap-1.5 px-2 py-0.5 rounded-full bg-surface-container border border-outline-variant/40 text-primary text-[10px] font-mono select-none">
        <Loader2 className="w-2.5 h-2.5 animate-spin" />
        <span>{notice || 'Processing...'}</span>
      </div>
    );
  }

  if (status.isRunning) {
    return (
      <div
        className="flex items-center gap-1.5 px-2 py-0.5 rounded-full bg-emerald-500/10 border border-emerald-500/30 text-emerald-500 text-[10px] font-mono select-none shadow-2xs"
        title={`${activeModelDisplay} running on port ${status.port}. Zero PHI leaves workstation.`}
      >
        <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
        <span className="font-semibold truncate max-w-[130px]">
          {activeModelDisplay.replace(/\.gguf$/, '')}
        </span>
        <button
          type="button"
          onClick={handleStop}
          title={`Unload ${activeModelDisplay} to free RAM/VRAM`}
          className="ml-0.5 p-0.5 rounded hover:bg-emerald-500/20 text-emerald-400 hover:text-rose-400 transition-colors cursor-pointer"
        >
          <Square className="w-2.5 h-2.5 fill-current" />
        </button>
      </div>
    );
  }

  return (
    <button
      type="button"
      onClick={handleStart}
      title={`1-Click: Load ${status.configuredModelName || 'Local AI'} into memory without terminal commands`}
      className="flex items-center gap-1 px-2 py-0.5 rounded-full bg-surface-container border border-outline-variant/40 hover:border-emerald-500/50 hover:text-emerald-400 text-on-surface-variant text-[10px] font-mono transition-colors cursor-pointer select-none"
    >
      <Sparkles className="w-2.5 h-2.5 text-primary" />
      <span>Load {status.configuredModelName ? status.configuredModelName.replace(/ \([^)]+\)/, '') : 'Local AI'}</span>
    </button>
  );
}
