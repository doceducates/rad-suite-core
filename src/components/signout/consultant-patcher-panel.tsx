'use client';

// Layer 4 (Presentation): Consultant Notes Editor & Voice Dictation Patcher
// Strict File Size Invariant: Target < 250 lines, max 350 lines

import React, { useState, useRef, useEffect } from 'react';
import { Mic, MicOff, Sparkles, Check, X, RotateCcw } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { AnatomicalSection, ConsultantPatchResult } from '@/types/signout';
import { notify } from '@/services/notification.service';

interface ConsultantPatcherPanelProps {
  sections: AnatomicalSection[];
  positiveSectionIds: Set<string>;
  sectionTexts: Record<string, string>;
  impressionList: string[];
  focusedSectionId: string | null;
  onSelectFocusedSection: (id: string | null) => void;
  onApplyPatch: (patch: ConsultantPatchResult) => void;
  modalityTitle: string;
  templateFormat?: 'standardized' | 'hmis';
}

export function ConsultantPatcherPanel({
  sections,
  sectionTexts,
  impressionList,
  focusedSectionId,
  onApplyPatch,
  modalityTitle,
  templateFormat = 'standardized',
}: ConsultantPatcherPanelProps) {
  const [deltaInput, setDeltaInput] = useState('');
  const [isPatching, setIsPatching] = useState(false);
  const [isListening, setIsListening] = useState(false);
  const [pendingPatch, setPendingPatch] = useState<ConsultantPatchResult | null>(null);

  const recognitionRef = useRef<any>(null);

  // Clean up speech recognition on unmount
  useEffect(() => {
    return () => {
      if (recognitionRef.current) {
        try {
          recognitionRef.current.stop();
        } catch {}
      }
    };
  }, []);

  const toggleVoiceRecording = () => {
    if (typeof window === 'undefined') return;
    const SpeechRec = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;

    if (!SpeechRec) {
      notify.warning('Voice recognition is not supported in this browser. Please use Chrome or Edge.');
      return;
    }

    if (isListening) {
      if (recognitionRef.current) {
        try {
          recognitionRef.current.stop();
        } catch {}
      }
      setIsListening(false);
      return;
    }

    try {
      const rec = new SpeechRec();
      rec.continuous = true;
      rec.interimResults = false;
      rec.lang = 'en-US';

      rec.onresult = (e: any) => {
        let transcript = '';
        for (let i = e.resultIndex; i < e.results.length; i++) {
          if (e.results[i].isFinal) {
            transcript += ' ' + e.results[i][0].transcript;
          }
        }
        if (transcript.trim()) {
          setDeltaInput((prev) => (prev ? `${prev.trim()} ${transcript.trim()}` : transcript.trim()));
        }
      };

      rec.onerror = (e: any) => {
        console.warn('Speech error:', e.error);
        setIsListening(false);
      };

      rec.onend = () => {
        setIsListening(false);
      };

      recognitionRef.current = rec;
      rec.start();
      setIsListening(true);
      notify.info('Microphone active. Speak consultant changes...');
    } catch (err: any) {
      notify.error('Microphone Error', err.message);
      setIsListening(false);
    }
  };

  const handleRunPatch = async () => {
    if (!deltaInput.trim()) {
      notify.warning('Please enter or dictate consultant notes first.');
      return;
    }
    setIsPatching(true);
    try {
      const res = await fetch('/api/ai/consultant-patch', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          modality: modalityTitle,
          sectionTexts,
          impressionList,
          deltaNote: deltaInput,
          focusedSectionId,
          templateFormat,
        }),
      });
      const data = await res.json();
      if (data.success && data.patchedSections) {
        setPendingPatch({
          patchedSections: data.patchedSections,
          patchedImpression: data.patchedImpression,
          changesSummary: data.changesSummary || ['Applied consultant changes.'],
        });
        notify.info('Changes ready for review.');
      } else {
        notify.error('Patch Error', data.error || 'Could not parse notes');
      }
    } catch (err: any) {
      notify.error('Patch Error', err.message);
    } finally {
      setIsPatching(false);
    }
  };

  const handleCommitPatch = () => {
    if (!pendingPatch) return;
    onApplyPatch(pendingPatch);
    setPendingPatch(null);
    setDeltaInput('');
    notify.success('Updated positive findings & impression!');
  };

  return (
    <div className="flex flex-col h-full space-y-3">
      {/* 1. Header with Mic Toggle */}
      <div className="flex items-center justify-between shrink-0">
        <span className="text-[11px] font-semibold text-secondary tracking-wide uppercase">
          Quick Notes &amp; Dictation
        </span>

        <button
          type="button"
          onClick={toggleVoiceRecording}
          className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-xs font-medium border transition-all cursor-pointer ${
            isListening
              ? 'bg-rose-500/20 border-rose-500/50 text-rose-400 animate-pulse'
              : 'bg-surface-container border-outline-variant/40 text-secondary hover:text-on-surface hover:border-outline-variant'
          }`}
          title={isListening ? 'Click to stop recording' : 'Click to dictate notes'}
        >
          {isListening ? (
            <>
              <MicOff className="w-3.5 h-3.5" />
              <span>Listening...</span>
            </>
          ) : (
            <>
              <Mic className="w-3.5 h-3.5 text-primary" />
              <span>Dictate</span>
            </>
          )}
        </button>
      </div>

      {/* 2. Text Editor Area */}
      <div className="flex-1 min-h-0 flex flex-col space-y-2">
        <textarea
          value={deltaInput}
          onChange={(e) => setDeltaInput(e.target.value)}
          onKeyDown={(e) => {
            if ((e.ctrlKey || e.metaKey) && e.key === 'Enter') {
              e.preventDefault();
              handleRunPatch();
            }
          }}
          placeholder='Type or dictate consultant notes here... e.g. "L4-L5 right paracentral protrusion compressing traversing right root. L5-S1 mild bulge."'
          className="flex-1 w-full rounded-xl p-3 text-xs leading-relaxed border border-outline-variant/50 bg-surface text-on-surface placeholder:text-secondary/50 focus:outline-none focus:border-primary resize-none"
        />

        <div className="flex items-center justify-between gap-2 shrink-0">
          <Button
            size="sm"
            variant="primary"
            onClick={handleRunPatch}
            isLoading={isPatching}
            className="flex-1 gap-1.5 text-xs font-semibold"
          >
            <Sparkles className="w-3.5 h-3.5" />
            <span>Process Notes (Ctrl+Enter)</span>
          </Button>

          {deltaInput && (
            <button
              type="button"
              onClick={() => setDeltaInput('')}
              className="px-2.5 py-1.5 rounded-lg text-xs text-secondary hover:text-on-surface border border-outline-variant/30 hover:bg-surface-container transition-colors cursor-pointer"
            >
              Clear
            </button>
          )}
        </div>
      </div>

      {/* 3. Pending Diff Preview Card */}
      {pendingPatch && (
        <div className="p-3 rounded-xl bg-surface-container-low border border-primary/40 space-y-2 shrink-0">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-primary">
              Proposed Changes ({pendingPatch.changesSummary.length})
            </span>
            <div className="flex items-center gap-1.5">
              <Button
                size="sm"
                variant="primary"
                onClick={handleCommitPatch}
                className="gap-1 text-xs py-1 px-2.5 font-semibold"
              >
                <Check className="w-3 h-3" /> Apply
              </Button>
              <button
                type="button"
                onClick={() => setPendingPatch(null)}
                className="px-2 py-1 text-xs text-secondary hover:text-on-surface cursor-pointer"
              >
                Discard
              </button>
            </div>
          </div>

          <ul className="text-[11px] text-on-surface space-y-1 list-disc list-inside">
            {pendingPatch.changesSummary.map((chg, i) => (
              <li key={i}>{chg}</li>
            ))}
          </ul>
        </div>
      )}
    </div>
  );
}
