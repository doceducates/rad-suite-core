'use client';

import React from 'react';
import { Volume2, Mic, Archive, BookOpen, RefreshCw } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';

export type VoiceLabTab = 'sandbox' | 'vault' | 'vocabulary';

interface VoiceLabHeaderProps {
  activeTab: VoiceLabTab;
  onTabChange: (tab: VoiceLabTab) => void;
  voiceStudioStatus: { isRunning: boolean; device?: string; version?: string } | null;
  onRefreshStatus: () => void;
  isTesting: boolean;
  recordingsCount: number;
  vocabCount: number;
}

export function VoiceLabHeader({
  activeTab,
  onTabChange,
  voiceStudioStatus,
  onRefreshStatus,
  isTesting,
  recordingsCount,
  vocabCount,
}: VoiceLabHeaderProps) {
  const isCuda = voiceStudioStatus?.device?.toLowerCase().includes('cuda');

  return (
    <div className="space-y-4">
      {/* Top Banner */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div>
          <div className="flex items-center gap-2">
            <h1 className="text-xl font-bold tracking-tight text-foreground font-headline flex items-center gap-2">
              <Mic className="w-5 h-5 text-rose-500" />
              Voice Lab & Acoustic Studio
            </h1>
            <Badge
              variant={voiceStudioStatus?.isRunning ? 'success' : 'outline'}
              className="text-[10px] font-mono gap-1"
            >
              <span className={`w-1.5 h-1.5 rounded-full ${voiceStudioStatus?.isRunning ? 'bg-emerald-500 animate-pulse' : 'bg-zinc-400'}`} />
              {voiceStudioStatus?.isRunning ? 'Port 3900 Active' : 'Offline'}
            </Badge>
          </div>
          <p className="text-xs text-muted-foreground mt-0.5">
            Local CUDA-accelerated Faster-Whisper, patient voice vault (5-day retention), and adaptive medical vocabulary learning.
          </p>
        </div>

        {/* Telemetry Actions */}
        <div className="flex items-center gap-2 self-start sm:self-auto">
          {voiceStudioStatus?.isRunning && (
            <Badge variant="outline" className="text-[11px] font-mono border-rose-500/30 text-rose-500 bg-rose-500/5 hidden md:flex items-center gap-1">
              <Volume2 className="w-3 h-3" />
              {voiceStudioStatus.device || 'CUDA (RTX 4050)'}
            </Badge>
          )}

          <Button
            size="sm"
            variant="outline"
            onClick={onRefreshStatus}
            disabled={isTesting}
            className="h-7 text-xs gap-1.5"
            title="Ping VoiceStudio port 3900"
          >
            <RefreshCw className={`w-3 h-3 ${isTesting ? 'animate-spin' : ''}`} />
            Ping 3900
          </Button>
        </div>
      </div>

      {/* Navigation Tabs */}
      <div className="flex items-center gap-1 border-b border-border pb-1">
        <button
          type="button"
          onClick={() => onTabChange('sandbox')}
          className={`px-3 py-1.5 rounded-t-lg text-xs font-semibold flex items-center gap-1.5 transition-all cursor-pointer border-b-2 -mb-1 ${
            activeTab === 'sandbox'
              ? 'border-primary text-primary bg-primary/5'
              : 'border-transparent text-muted-foreground hover:text-foreground'
          }`}
        >
          <Mic className="w-3.5 h-3.5" />
          <span>Live Dictation & Structuring</span>
        </button>

        <button
          type="button"
          onClick={() => onTabChange('vault')}
          className={`px-3 py-1.5 rounded-t-lg text-xs font-semibold flex items-center gap-1.5 transition-all cursor-pointer border-b-2 -mb-1 ${
            activeTab === 'vault'
              ? 'border-primary text-primary bg-primary/5'
              : 'border-transparent text-muted-foreground hover:text-foreground'
          }`}
        >
          <Archive className="w-3.5 h-3.5" />
          <span>Patient Recordings Vault</span>
          <span className="text-[10px] px-1.5 py-0.2 rounded-full bg-zinc-200 dark:bg-zinc-800 text-zinc-700 dark:text-zinc-300 font-mono">
            {recordingsCount}
          </span>
        </button>

        <button
          type="button"
          onClick={() => onTabChange('vocabulary')}
          className={`px-3 py-1.5 rounded-t-lg text-xs font-semibold flex items-center gap-1.5 transition-all cursor-pointer border-b-2 -mb-1 ${
            activeTab === 'vocabulary'
              ? 'border-primary text-primary bg-primary/5'
              : 'border-transparent text-muted-foreground hover:text-foreground'
          }`}
        >
          <BookOpen className="w-3.5 h-3.5" />
          <span>Medical Vocabulary & Hints</span>
          <span className="text-[10px] px-1.5 py-0.2 rounded-full bg-zinc-200 dark:bg-zinc-800 text-zinc-700 dark:text-zinc-300 font-mono">
            {vocabCount}
          </span>
        </button>
      </div>
    </div>
  );
}
