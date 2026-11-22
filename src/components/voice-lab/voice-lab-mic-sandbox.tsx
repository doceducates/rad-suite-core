'use client';

import React, { useState } from 'react';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Mic, Square, Sparkles, Copy, Trash2, Plus, Volume2 } from 'lucide-react';
import { LottieWaveform } from '@/components/ui/lottie-waveform';
import { CLINICAL_MACROS } from '@/components/editor/clinical-macros-bar';
import { notify } from '@/services/notification.service';
import { useVoiceStudioDictation } from '@/hooks/use-voicestudio-dictation';

interface VoiceLabMicSandboxProps {
  onLearnTerm: (term: string) => void;
}

export function VoiceLabMicSandbox({ onLearnTerm }: VoiceLabMicSandboxProps) {
  const [modality, setModality] = useState('MRI');
  const [studyDesc, setStudyDesc] = useState('MRI Lumbar Spine (Radiculopathy)');
  const [autoStructure, setAutoStructure] = useState(true);
  const [rawText, setRawText] = useState('');
  const [structuredHtml, setStructuredHtml] = useState<{ technique?: string; findings?: string; impression?: string } | null>(null);
  const [detectedTerms, setDetectedTerms] = useState<string[]>([]);

  const {
    isRecording,
    isProcessing,
    toggleRecording,
    errorMessage,
  } = useVoiceStudioDictation({
    modality,
    studyDescription: studyDesc,
    onSuccess: (res) => {
      setRawText(res.rawTranscript || '');
      if (res.structured) {
        setStructuredHtml({
          technique: res.structured.technique,
          findings: res.structured.findings,
          impression: res.structured.impression,
        });
      } else {
        setStructuredHtml(null);
      }
      notify.success('Transcribed via VoiceStudio CUDA');
    },
    onError: (err) => {
      notify.error(`VoiceStudio: ${err}`);
    },
  });

  const handleCopy = (text: string) => {
    navigator.clipboard.writeText(text);
    notify.success('Copied to clipboard');
  };

  const handleClear = () => {
    setRawText('');
    setStructuredHtml(null);
    setDetectedTerms([]);
  };

  return (
    <div className="space-y-4">
      {/* Control Strip & Modality Tuning */}
      <Card className="p-4 bg-surface-container-low border-outline-variant/40">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div className="flex items-center gap-2">
            <span className="text-xs font-semibold text-foreground">Modality Acoustic Bias:</span>
            {(['MRI', 'CT', 'XRAY', 'US'] as const).map((m) => (
              <button
                key={m}
                type="button"
                onClick={() => setModality(m)}
                className={`px-2.5 py-1 rounded text-xs font-semibold transition-all cursor-pointer ${
                  modality === m
                    ? 'bg-primary text-primary-foreground shadow-xs'
                    : 'bg-surface-container hover:bg-surface-container-high text-muted-foreground'
                }`}
              >
                {m}
              </button>
            ))}
          </div>

          <div className="flex items-center gap-2">
            <label className="text-xs font-medium text-muted-foreground flex items-center gap-1.5 cursor-pointer">
              <input
                type="checkbox"
                checked={autoStructure}
                onChange={(e) => setAutoStructure(e.target.checked)}
                className="rounded border-zinc-300 dark:border-zinc-700 text-primary focus:ring-primary h-3.5 w-3.5"
              />
              <span>Auto-Structure into LGH 2-Heading Report</span>
            </label>
          </div>
        </div>
      </Card>

      {/* Dictation Microphone Console */}
      <Card className="p-6 text-center border-outline-variant/40 shadow-sm bg-card">
        <div className="flex flex-col items-center justify-center gap-3">
          <button
            type="button"
            onClick={toggleRecording}
            disabled={isProcessing}
            className={`w-20 h-20 rounded-full flex flex-col items-center justify-center gap-1 shadow-md transition-all cursor-pointer active:scale-95 ${
              isProcessing
                ? 'bg-amber-500/20 text-amber-500 border-2 border-amber-500 animate-pulse'
                : isRecording
                ? 'bg-rose-600 text-white ring-4 ring-rose-500/30 animate-pulse'
                : 'bg-primary text-primary-foreground hover:bg-primary/90'
            }`}
          >
            {isProcessing ? (
              <span className="text-[10px] font-bold">Structuring...</span>
            ) : isRecording ? (
              <>
                <Square className="w-6 h-6 fill-white" />
                <span className="text-[9px] font-bold tracking-tight">STOP</span>
              </>
            ) : (
              <>
                <Mic className="w-7 h-7" />
                <span className="text-[9px] font-bold tracking-tight">DICTATE</span>
              </>
            )}
          </button>

          {isRecording && (
            <div className="flex items-center gap-2 text-rose-500 font-mono text-xs">
              <LottieWaveform active={isRecording} className="w-12 h-6" />
              <span>VoiceStudio Recording (CUDA Faster-Whisper)...</span>
            </div>
          )}

          <p className="text-[11px] text-muted-foreground max-w-md">
            Click to start speaking. VoiceStudio will capture your audio, apply vocabulary hints for{' '}
            <strong className="text-foreground">{modality}</strong>, and transcribe on your local GPU.
          </p>
        </div>
      </Card>

      {/* Results View */}
      {(rawText || structuredHtml) && (
        <Card className="border-outline-variant/40">
          <CardHeader className="py-2.5 px-4 flex flex-row items-center justify-between border-b border-border/40">
            <CardTitle className="text-xs font-bold uppercase tracking-wider text-muted-foreground">
              Transcription & Structured Findings
            </CardTitle>
            <div className="flex items-center gap-1">
              <Button size="sm" variant="ghost" onClick={handleClear} className="h-6 text-xs gap-1 text-muted-foreground hover:text-rose-500">
                <Trash2 className="w-3 h-3" /> Clear
              </Button>
              <Button size="sm" variant="secondary" onClick={() => handleCopy(rawText)} className="h-6 text-xs gap-1">
                <Copy className="w-3 h-3" /> Copy
              </Button>
            </div>
          </CardHeader>

          <CardContent className="p-4 space-y-3">
            <div>
              <span className="text-[11px] font-semibold text-muted-foreground block mb-1">Raw Speech Output:</span>
              <p className="text-xs font-mono p-2.5 rounded bg-surface-container border border-outline-variant/30 text-foreground">
                {rawText}
              </p>
            </div>

            {structuredHtml && (
              <div className="pt-2 border-t border-border/40 space-y-2">
                <span className="text-[11px] font-semibold text-primary block">Official LGH 2-Heading Structured Output:</span>
                {structuredHtml.technique && (
                  <div className="text-xs bg-card p-2 rounded border border-border/30">
                    <strong>Technique:</strong> {structuredHtml.technique}
                  </div>
                )}
                {structuredHtml.findings && (
                  <div
                    className="text-xs bg-card p-2 rounded border border-border/30 prose prose-sm dark:prose-invert max-w-none"
                    dangerouslySetInnerHTML={{ __html: structuredHtml.findings }}
                  />
                )}
                {structuredHtml.impression && (
                  <div className="text-xs bg-primary/5 p-2 rounded border border-primary/20 whitespace-pre-line font-medium text-foreground">
                    <strong>Impression:</strong>
                    <div>{structuredHtml.impression}</div>
                  </div>
                )}
              </div>
            )}
          </CardContent>
        </Card>
      )}

      {/* Cross-Sectional Macros */}
      <Card className="p-3 bg-surface-container-low border-outline-variant/30">
        <p className="text-[11px] font-semibold text-muted-foreground mb-2">Cross-Sectional Dictation Test Shorthands:</p>
        <div className="flex flex-wrap gap-1.5">
          {CLINICAL_MACROS.slice(0, 6).map((m) => (
            <button
              key={m.label}
              type="button"
              onClick={() => setRawText((prev) => (prev ? prev + ' ' : '') + m.text)}
              className="text-[11px] px-2 py-1 rounded bg-surface-container hover:bg-surface-container-high border border-outline-variant/40 text-foreground transition-colors cursor-pointer"
            >
              {m.label}
            </button>
          ))}
        </div>
      </Card>
    </div>
  );
}
