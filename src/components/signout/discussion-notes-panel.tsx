'use client';

// Layer 4 (Presentation): Consultant Notes & Voice Dictation Panel
// Strict File Size Invariant: Target < 250 lines, max 350 lines

import React, { useState, useRef, useEffect } from 'react';
import { Mic, MicOff, Eraser, FileText } from 'lucide-react';
import { notify } from '@/services/notification.service';

interface DiscussionNotesPanelProps {
  notes: string;
  onNotesChange: (val: string) => void;
  onClearNotes?: () => void;
}

export function DiscussionNotesPanel({
  notes,
  onNotesChange,
  onClearNotes,
}: DiscussionNotesPanelProps) {
  const [isListening, setIsListening] = useState(false);
  const recognitionRef = useRef<any>(null);

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
          onNotesChange(notes ? `${notes.trim()} ${transcript.trim()}` : transcript.trim());
        }
      };

      rec.onerror = (e: any) => {
        console.warn('Speech recognition warning:', e.error);
        setIsListening(false);
      };

      rec.onend = () => {
        setIsListening(false);
      };

      recognitionRef.current = rec;
      rec.start();
      setIsListening(true);
      notify.info('Microphone active. Dictate consultant notes...');
    } catch (err: any) {
      notify.error('Microphone Error', err.message);
      setIsListening(false);
    }
  };

  return (
    <div className="flex flex-col h-full space-y-3 font-body">
      {/* 1. Header Bar: Title, Dictate Button, Clear Action */}
      <div className="flex items-center justify-between shrink-0 pb-1 border-b border-outline-variant/20">
        <div className="flex items-center gap-2">
          <FileText className="w-3.5 h-3.5 text-primary" />
          <span className="text-xs font-bold text-on-surface uppercase tracking-wider">
            Additional Notes &amp; Consultant Edits
          </span>
        </div>

        <div className="flex items-center gap-2">
          {notes && (
            <button
              type="button"
              onClick={onClearNotes}
              className="inline-flex items-center gap-1 px-2 py-1 rounded text-xs text-secondary hover:text-on-surface transition-colors cursor-pointer"
              title="Clear notes"
            >
              <Eraser className="w-3 h-3" />
              <span>Clear</span>
            </button>
          )}

          <button
            type="button"
            onClick={toggleVoiceRecording}
            className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-xs font-semibold border transition-all cursor-pointer ${
              isListening
                ? 'bg-rose-500/20 border-rose-500/60 text-rose-400 animate-pulse'
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
      </div>

      {/* 2. Full Height Textarea */}
      <div className="flex-1 min-h-0 flex flex-col relative select-text">
        <textarea
          value={notes}
          onChange={(e) => onNotesChange(e.target.value)}
          placeholder='Type or dictate consultant notes, urgent takeaways, or clinical instructions here... e.g. "Urgent Note: Acute bowel/bladder retention + lower limb weakness (urgent neurosurgery correlation)" or "EMG/NCS correlation advised."'
          className="flex-1 w-full rounded-xl p-3 text-xs leading-relaxed border border-outline-variant/40 bg-surface text-on-surface placeholder:text-secondary/40 focus:outline-none focus:border-primary/80 resize-none shadow-2xs"
        />

        <div className="absolute bottom-2.5 right-3 text-[10px] font-mono text-secondary/50 pointer-events-none select-none">
          {notes.trim().length > 0 ? `${notes.trim().split(/\s+/).length} words` : 'Dictate / Type'}
        </div>
      </div>
    </div>
  );
}
