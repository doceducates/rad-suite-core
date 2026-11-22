'use client';

// Layer 4 (Presentation): Clean Bullet-Point Positive Findings Editor
// Strict File Size Invariant: Target < 250 lines, max 350 lines

import React, { useState, useRef, useEffect } from 'react';
import { Eraser, Mic, MicOff, ListPlus } from 'lucide-react';
import { ClinicalEditor } from '@/components/editor/clinical-editor';
import { notify } from '@/services/notification.service';

interface DiscussionPositiveFindingsListProps {
  findingsHtml: string;
  onFindingsHtmlChange: (html: string) => void;
  findingsCount: number;
  onAddBullet: () => void;
  onClear: () => void;
  onBlur?: () => void;
  modality?: string;
  readOnly?: boolean;
}

export function DiscussionPositiveFindingsList({
  findingsHtml,
  onFindingsHtmlChange,
  findingsCount,
  onAddBullet,
  onClear,
  onBlur,
  modality = 'MRI',
  readOnly = false,
}: DiscussionPositiveFindingsListProps) {
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
          const newBullet = `<li><p><strong>Finding:</strong> ${transcript.trim()}</p></li>`;
          if (!findingsHtml || findingsHtml === '<p></p>') {
            onFindingsHtmlChange(`<ul>${newBullet}</ul>`);
          } else if (findingsHtml.includes('</ul>')) {
            onFindingsHtmlChange(findingsHtml.replace(/<\/ul>$/, `${newBullet}</ul>`));
          } else {
            onFindingsHtmlChange(`${findingsHtml}<ul>${newBullet}</ul>`);
          }
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
      notify.info('Microphone active. Dictate positive finding...');
    } catch (err: any) {
      notify.error('Microphone Error', err.message);
      setIsListening(false);
    }
  };

  return (
    <div className="flex flex-col h-full space-y-3 font-body">
      {/* 1. Header Bar: Title, Count Badge, Dictate, Add Bullet, and Clear Action */}
      <div className="flex items-center justify-between shrink-0 pb-1 border-b border-outline-variant/20">
        <div className="flex items-center gap-2">
          <span className="text-xs font-bold text-on-surface uppercase tracking-wider">
            Positive Findings
          </span>
          <span className="text-[11px] font-mono px-2 py-0.5 rounded-full bg-amber-500/10 text-amber-400 border border-amber-500/30">
            {findingsCount === 0 ? 'Unremarkable Baseline' : `${findingsCount} ${findingsCount === 1 ? 'Finding' : 'Findings'}`}
          </span>
        </div>

        <div className="flex items-center gap-2">
          {findingsCount > 0 && (
            <button
              type="button"
              onClick={onClear}
              className="inline-flex items-center gap-1 px-2 py-1 rounded text-xs text-secondary hover:text-on-surface transition-colors cursor-pointer"
              title="Clear positive findings to baseline"
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
            title={isListening ? 'Click to stop recording' : 'Click to dictate positive findings'}
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

          <button
            type="button"
            onClick={onAddBullet}
            className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-xs font-semibold bg-surface-container border border-outline-variant/40 text-secondary hover:text-on-surface hover:border-primary/60 transition-colors cursor-pointer"
            title="Add a new bullet point finding"
          >
            <ListPlus className="w-3.5 h-3.5 text-amber-400" />
            <span>Add Bullet</span>
          </button>
        </div>
      </div>

      {/* 2. Full Height Clinical Editor (TipTap matching Main Report Section) */}
      <div
        onBlur={onBlur}
        className="flex-1 min-h-0 flex flex-col relative select-text"
      >
        <ClinicalEditor
          content={findingsHtml}
          onChange={onFindingsHtmlChange}
          placeholder="Document positive abnormal findings as bullet points (e.g. • L4–L5: Diffuse disc bulge)..."
          minHeight="100%"
          modality={modality}
          activeSection="findings"
          viewMode="split"
          className="h-full flex-1"
          readOnly={readOnly}
        />
      </div>
    </div>
  );
}
