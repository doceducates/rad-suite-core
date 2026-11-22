'use client';

import { useState, useEffect, useRef } from 'react';
import { X, Mic, MicOff, Sparkles, Plus, ArrowLeftRight, Check, Trash2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { WaveformVisualizer } from './waveform-visualizer';
import { useAudioWaveform } from '@/hooks/use-audio-waveform';

interface TranscribeDrawerProps {
  isOpen: boolean;
  onClose: () => void;
  onInsertFindings: (text: string) => void;
  onInsertImpression: (text: string) => void;
  onStructureWithAi?: () => void;
  pgrName?: string;
}

export function TranscribeDrawer({
  isOpen,
  onClose,
  onInsertFindings,
  onInsertImpression,
  onApplyStructuredReport,
  pgrName = 'Dr. Isna (PGR)',
}: TranscribeDrawerProps & {
  onApplyStructuredReport?: (data: { technique: string; findings: string; impression: string }) => void;
}) {
  const [transcript, setTranscript] = useState('');
  const [isStructuring, setIsStructuring] = useState(false);
  const [speechSupported, setSpeechSupported] = useState(false);
  const recognitionRef = useRef<any>(null);

  const { isRecording, volume, dataArray, startRecording, stopRecording } = useAudioWaveform({
    fftSize: 64,
  });

  // Initialize Web Speech API safely in browser
  useEffect(() => {
    if (typeof window === 'undefined') return;
    const SpeechRec = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;
    if (SpeechRec) {
      setSpeechSupported(true);
      const rec = new SpeechRec();
      rec.continuous = true;
      rec.interimResults = true;
      rec.lang = 'en-US';

      rec.onresult = (event: any) => {
        let current = '';
        for (let i = 0; i < event.results.length; i++) {
          current += event.results[i][0].transcript + ' ';
        }
        setTranscript(current.trim());
      };

      rec.onerror = (e: any) => {
        console.warn('Speech recognition error:', e.error);
      };

      recognitionRef.current = rec;
    }
  }, []);

  const toggleRecording = async () => {
    if (isRecording) {
      stopRecording();
      recognitionRef.current?.stop?.();
    } else {
      await startRecording();
      try {
        recognitionRef.current?.start?.();
      } catch {
        // Recognition already started or unavailable
      }
    }
  };

  const handleClear = () => {
    setTranscript('');
  };

  const handleStructureWithAi = async () => {
    if (!transcript.trim() || !onApplyStructuredReport) return;
    setIsStructuring(true);
    try {
      const res = await fetch('/api/ai/dictate-and-structure', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ rawTranscript: transcript.trim() }),
      });
      if (res.ok) {
        const data = await res.json();
        onApplyStructuredReport({
          technique: data.technique,
          findings: data.findings,
          impression: data.impression,
        });
        setTranscript('');
      }
    } catch (err) {
      console.error('Failed to structure dictation', err);
    } finally {
      setIsStructuring(false);
    }
  };

  if (!isOpen) return null;

  const quickPhrases = [
    'No acute intracranial hemorrhage or infarct',
    'Bilateral kidneys are normal in size without calculus',
    'Clear bilateral lung fields without consolidation',
    'Preserved lumbar lordosis without disc protrusion',
    'Visualized calvarium shows no acute fracture',
  ];

  return (
    <div className="fixed top-0 right-0 h-full w-84 sm:w-96 bg-white dark:bg-zinc-900 border-l border-zinc-200 dark:border-zinc-800 shadow-2xl z-50 flex flex-col text-xs transition-transform duration-300">
      {/* Drawer Header */}
      <div className="flex items-center justify-between p-3.5 border-b border-zinc-200 dark:border-zinc-800 bg-zinc-50 dark:bg-zinc-950">
        <div className="flex items-center gap-2">
          <div className="p-1.5 rounded-lg bg-primary text-on-primary">
            <Mic className="w-4 h-4" />
          </div>
          <div>
            <h3 className="font-bold text-sm text-zinc-900 dark:text-zinc-100">Live Transcribe & Slot</h3>
            <p className="text-[10px] text-zinc-500">AI Voice Assistant • {pgrName}</p>
          </div>
        </div>
        <button onClick={onClose} className="text-zinc-400 hover:text-zinc-600 dark:hover:text-zinc-200 p-1">
          <X className="w-4 h-4" />
        </button>
      </div>

      {/* Waveform & Recording Control */}
      <div className="p-3.5 space-y-3 bg-zinc-50/50 dark:bg-zinc-950/40 border-b border-zinc-200 dark:border-zinc-800">
        <WaveformVisualizer isRecording={isRecording} volume={volume} dataArray={dataArray} />

        <div className="flex items-center justify-between">
          <div className="flex items-center gap-1.5">
            <span className={`w-2 h-2 rounded-full ${isRecording ? 'bg-rose-500 animate-ping' : 'bg-zinc-400'}`} />
            <span className="text-[11px] font-mono text-zinc-600 dark:text-zinc-300">
              {isRecording ? 'Listening...' : 'Microphone Ready'}
            </span>
          </div>

          <div className="flex items-center gap-1.5">
            {transcript && (
              <Button size="sm" variant="ghost" onClick={handleClear} className="h-7 text-[10px] text-zinc-400 hover:text-rose-400 gap-1 px-1.5">
                <Trash2 className="w-3 h-3" /> Clear
              </Button>
            )}
            <Button
              size="sm"
              variant={isRecording ? 'danger' : 'primary'}
              onClick={toggleRecording}
              className="h-7 text-xs font-semibold gap-1.5 px-3"
            >
              {isRecording ? <MicOff className="w-3.5 h-3.5" /> : <Mic className="w-3.5 h-3.5" />}
              <span>{isRecording ? 'Stop' : 'Start Dictation'}</span>
            </Button>
          </div>
        </div>
      </div>

      {/* Transcript Textbox */}
      <div className="p-3.5 flex-1 overflow-y-auto space-y-3">
        <div>
          <label className="text-[10px] font-bold uppercase text-zinc-400 block mb-1">
            Transcribed Text
          </label>
          <textarea
            rows={6}
            value={transcript}
            onChange={(e) => setTranscript(e.target.value)}
            placeholder="Speak into microphone or type clinical observations here..."
            className="w-full p-2.5 rounded-xl border border-zinc-300 dark:border-zinc-700 bg-white dark:bg-zinc-800 text-zinc-900 dark:text-zinc-100 text-xs focus:ring-1 focus:ring-primary focus:outline-none resize-none leading-relaxed"
          />
        </div>

        {/* Slotting Action Buttons */}
        <div className="grid grid-cols-2 gap-2">
          <Button
            size="sm"
            variant="secondary"
            disabled={!transcript.trim()}
            onClick={() => {
              onInsertFindings(transcript.trim());
              setTranscript('');
            }}
            className="h-8 text-[11px] font-semibold gap-1 justify-center"
          >
            <Plus className="w-3 h-3 text-primary" />
            <span>To Findings</span>
          </Button>

          <Button
            size="sm"
            variant="secondary"
            disabled={!transcript.trim()}
            onClick={() => {
              onInsertImpression(transcript.trim());
              setTranscript('');
            }}
            className="h-8 text-[11px] font-semibold gap-1 justify-center"
          >
            <Check className="w-3 h-3 text-emerald-500" />
            <span>To Impression</span>
          </Button>
        </div>

        {onApplyStructuredReport && (
          <Button
            size="sm"
            variant="outline"
            disabled={!transcript.trim() || isStructuring}
            onClick={handleStructureWithAi}
            className="w-full h-8 text-[11px] font-semibold gap-1.5 text-primary border-primary/30 hover:bg-primary/10"
          >
            {isStructuring ? (
              <>
                <span className="w-3 h-3 rounded-full border-2 border-primary border-t-transparent animate-spin" />
                <span>Structuring...</span>
              </>
            ) : (
              <>
                <Sparkles className="w-3.5 h-3.5" />
                <span>Generate Structured Report (AI)</span>
              </>
            )}
          </Button>
        )}

        {/* Quick Normal Anatomy Insertion */}
        <div className="pt-2 border-t border-zinc-200 dark:border-zinc-800">
          <label className="text-[10px] font-bold uppercase text-zinc-400 block mb-1.5">
            Quick Clinical Normal Phrases
          </label>
          <div className="space-y-1">
            {quickPhrases.map((phrase, idx) => (
              <button
                key={idx}
                type="button"
                onClick={() => setTranscript((prev) => (prev ? prev + ' ' + phrase : phrase))}
                className="w-full text-left p-1.5 rounded-lg bg-zinc-50 dark:bg-zinc-800/60 hover:bg-primary/10 text-[10px] text-zinc-700 dark:text-zinc-300 border border-transparent hover:border-primary/30 transition-colors flex items-center justify-between"
              >
                <span className="truncate pr-1">{phrase}</span>
                <Plus className="w-2.5 h-2.5 text-primary shrink-0" />
              </button>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
