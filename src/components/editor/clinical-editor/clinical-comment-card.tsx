'use client';

// Layer 4 (Presentation): Floating Animated Clinical Comment Card with Voice & Palette
// Strict File Size Invariant: Target < 250 lines, max 350 lines

import React, { useState, useEffect, useRef } from 'react';
import { Sparkles } from 'lucide-react';
import {
  ClinicalCommentItem,
  ClinicalCommentAttachment,
  ClinicalCommentColor,
  COMMENT_COLOR_PALETTES,
} from './clinical-comment-types';
import { ClinicalCommentCardHeader } from './clinical-comment-card-header';
import { ClinicalCommentAttachmentPreview } from './clinical-comment-attachment-preview';
import { ClinicalCommentCardActions } from './clinical-comment-card-actions';
import { useAudioRecorder } from '@/hooks/use-audio-recorder';
import { notify } from '@/services/notification.service';

interface ClinicalCommentCardProps {
  commentId: string;
  quotedText?: string;
  existingComment?: ClinicalCommentItem | null;
  coords: { top: number; left: number } | null;
  currentUser?: { name: string; role: string };
  onSave: (comment: ClinicalCommentItem) => void;
  onResolve: (commentId: string) => void;
  onDelete: (commentId: string) => void;
  onClose: () => void;
  onApplyToReport?: (instruction: string, markedText: string) => Promise<void>;
}

export function ClinicalCommentCard({
  commentId,
  quotedText = '',
  existingComment,
  coords,
  currentUser = { name: 'Dr. Muhammad Mudassir', role: 'resident' },
  onSave,
  onResolve,
  onDelete,
  onClose,
  onApplyToReport,
}: ClinicalCommentCardProps) {
  const [noteText, setNoteText] = useState(existingComment?.comment || '');
  const [color, setColor] = useState<ClinicalCommentColor>(existingComment?.color || 'indigo');
  const [attachment, setAttachment] = useState<ClinicalCommentAttachment | null>(
    existingComment?.attachment || null
  );
  const [isAiPolishing, setIsAiPolishing] = useState(false);
  const [isApplyingToReport, setIsApplyingToReport] = useState(false);
  const [isTranscribing, setIsTranscribing] = useState(false);
  const [isPlayingAudio, setIsPlayingAudio] = useState(false);

  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const audioPlayerRef = useRef<HTMLAudioElement | null>(null);

  const { isRecording, duration, startRecording, stopRecording } = useAudioRecorder();

  useEffect(() => {
    setNoteText(existingComment?.comment || '');
    setColor(existingComment?.color || 'indigo');
    setAttachment(existingComment?.attachment || null);
    setTimeout(() => textareaRef.current?.focus(), 50);
  }, [existingComment, commentId]);

  if (!coords) return null;

  const currentPalette = COMMENT_COLOR_PALETTES[color] || COMMENT_COLOR_PALETTES.indigo;

  const handleSave = () => {
    if (!noteText.trim() && !attachment) return;
    const item: ClinicalCommentItem = {
      id: commentId,
      quotedText: quotedText || existingComment?.quotedText,
      authorId: currentUser.name,
      authorName: currentUser.name,
      authorRole: (currentUser.role as any) || 'resident',
      comment: noteText.trim(),
      color,
      createdAt: existingComment?.createdAt || new Date().toISOString(),
      resolved: false,
      attachment: attachment || undefined,
    };
    onSave(item);
    onClose();
  };

  const handlePaste = (e: React.ClipboardEvent) => {
    const items = e.clipboardData?.items;
    if (!items) return;
    for (let i = 0; i < items.length; i++) {
      if (items[i].type.startsWith('image/')) {
        const file = items[i].getAsFile();
        if (file) {
          const reader = new FileReader();
          reader.onload = () => {
            setAttachment({
              name: `Screenshot_${new Date().toISOString().slice(11, 19).replace(/:/g, '-')}.png`,
              url: reader.result as string,
              type: file.type,
              size: file.size,
            });
          };
          reader.readAsDataURL(file);
          e.preventDefault();
          break;
        }
      }
    }
  };

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = () => {
      setAttachment({
        name: file.name,
        url: reader.result as string,
        type: file.type,
        size: file.size,
      });
    };
    reader.readAsDataURL(file);
  };

  const handleToggleVoiceRecord = async () => {
    if (isRecording) {
      const res = await stopRecording();
      if (res && res.blob) {
        try {
          const formData = new FormData();
          formData.append('audio', res.blob, `voice_${Date.now()}.webm`);
          formData.append('duration', res.duration.toString());
          formData.append('label', 'consultant-memo');

          const uploadRes = await fetch('/api/media/audio', { method: 'POST', body: formData });
          const uploadData = await uploadRes.json();
          const audioUrl = uploadData.success && uploadData.url ? uploadData.url : res.base64;

          setAttachment({
            name: uploadData.filename || `Consultant_Voice_${Date.now()}.webm`,
            url: audioUrl,
            type: 'audio/webm',
            size: res.blob.size,
            duration: res.duration,
          });
          notify.success(`Recorded voice memo (${res.duration}s)`);

          // Register into Voice Vault for 5-day retention
          try {
            const vaultData = new FormData();
            vaultData.append('audio', res.blob, uploadData.filename || 'comment.webm');
            vaultData.append('source', 'comment');
            vaultData.append('duration', res.duration.toString());
            vaultData.append('patientName', quotedText ? `Note on: "${quotedText.slice(0, 25)}..."` : 'Clinical Discussion Note');
            fetch('/api/voice/recordings', { method: 'POST', body: vaultData }).catch(() => {});
          } catch {}
        } catch {
          setAttachment({
            name: `Consultant_Voice_${Date.now()}.webm`,
            url: res.base64,
            type: 'audio/webm',
            size: res.blob.size,
            duration: res.duration,
          });
        }
      }
    } else {
      await startRecording();
    }
  };

  const handleTranscribeAudio = async () => {
    if (!attachment?.url || isTranscribing) return;
    setIsTranscribing(true);
    try {
      const res = await fetch('/api/ai/voicestudio', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ audioUrl: attachment.url, task: 'transcribe' }),
      });
      const data = await res.json();
      if (data.success && data.transcript) {
        setNoteText((prev) => (prev ? `${prev}\n${data.transcript}` : data.transcript));
        notify.success('Transcribed audio memo into note');
      } else {
        notify.info('Audio attached. Enter note text manually.');
      }
    } catch {
      notify.warning('VoiceStudio local transcription unavailable');
    } finally {
      setIsTranscribing(false);
    }
  };

  const handlePlayPauseAudio = () => {
    if (!attachment?.url) return;
    if (isPlayingAudio && audioPlayerRef.current) {
      audioPlayerRef.current.pause();
      setIsPlayingAudio(false);
      return;
    }
    if (!audioPlayerRef.current || audioPlayerRef.current.src !== attachment.url) {
      audioPlayerRef.current = new Audio(attachment.url);
      audioPlayerRef.current.onended = () => setIsPlayingAudio(false);
      audioPlayerRef.current.onerror = () => setIsPlayingAudio(false);
    }
    audioPlayerRef.current.play().then(() => setIsPlayingAudio(true)).catch(() => setIsPlayingAudio(false));
  };

  const handleAiPolishNote = async () => {
    if (!noteText.trim()) return;
    setIsAiPolishing(true);
    try {
      const res = await fetch('/api/ai/edit-block', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'custom',
          text: noteText,
          modality: 'MRI',
          customPrompt:
            'Convert this informal radiologist consultant note into a crisp, concise, high-yield diagnostic note (max 1 sentence).',
        }),
      });
      const data = await res.json();
      if (data.success && data.result) {
        setNoteText(data.result.trim());
      }
    } catch (err) {
      console.warn('[Comment AI Polish Failed]', err);
    } finally {
      setIsAiPolishing(false);
    }
  };

  const handleExecuteApplyToReport = async () => {
    if (!noteText.trim() || !onApplyToReport) return;
    setIsApplyingToReport(true);
    try {
      await onApplyToReport(noteText.trim(), quotedText || '');
      notify.success('Applied comment instruction to report! Compare in [Diff]');
      handleSave();
    } catch (err: any) {
      notify.error('Failed applying instruction', err.message);
    } finally {
      setIsApplyingToReport(false);
    }
  };

  return (
    <div
      className="fixed z-50 animate-in fade-in zoom-in-95 duration-150 select-none"
      style={{
        top: `${Math.max(16, coords.top)}px`,
        left: `${Math.max(16, Math.min(coords.left, (typeof window !== 'undefined' ? window.innerWidth : 800) - 310))}px`,
      }}
    >
      <div
        className={`w-[290px] sm:w-[315px] max-w-[calc(100vw-32px)] rounded-xl border ${currentPalette.border} bg-card/95 backdrop-blur-md shadow-2xl p-3 flex flex-col gap-2 text-foreground transition-colors`}
      >
        <ClinicalCommentCardHeader color={color} onSelectColor={setColor} onClose={onClose} />

        {quotedText && (
          <div
            className={`text-[11px] text-muted-foreground italic bg-muted/30 px-2 py-1 rounded border-l-2 ${currentPalette.border} truncate`}
          >
            &ldquo;{quotedText}&rdquo;
          </div>
        )}

        <div className="relative">
          <textarea
            ref={textareaRef}
            rows={3}
            value={noteText}
            onPaste={handlePaste}
            onChange={(e) => setNoteText(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === 'Enter') {
                if (e.shiftKey) {
                  return; // Shift+Enter: allow normal newline
                }
                e.preventDefault();
                handleSave();
              }
            }}
            placeholder="Add note... Enter to Save, Shift+Enter for new line"
            className="w-full text-xs p-2 rounded-lg bg-surface-container/60 border border-outline-variant/60 focus:outline-none focus:ring-1 resize-none text-foreground placeholder:text-muted-foreground/60 leading-relaxed font-sans"
          />

          {isAiPolishing && (
            <div className="absolute inset-0 bg-card/85 backdrop-blur-xs rounded-lg flex items-center justify-center text-[11px] font-medium text-primary gap-1.5 animate-pulse">
              <Sparkles className="w-3.5 h-3.5 animate-spin" />
              <span>Refining note with AI...</span>
            </div>
          )}
        </div>

        {attachment && (
          <ClinicalCommentAttachmentPreview
            attachment={attachment}
            isPlayingAudio={isPlayingAudio}
            isTranscribing={isTranscribing}
            onPlayPauseAudio={handlePlayPauseAudio}
            onTranscribeAudio={handleTranscribeAudio}
            onRemoveAttachment={() => {
              if (audioPlayerRef.current) {
                audioPlayerRef.current.pause();
                audioPlayerRef.current = null;
              }
              setIsPlayingAudio(false);
              setAttachment(null);
            }}
          />
        )}

        <input ref={fileInputRef} type="file" accept="image/*" className="hidden" onChange={handleFileSelect} />

        <ClinicalCommentCardActions
          isRecording={isRecording}
          recordingDuration={duration}
          onToggleVoiceRecord={handleToggleVoiceRecord}
          onAttachClick={() => fileInputRef.current?.click()}
          onAiPolish={handleAiPolishNote}
          isAiPolishing={isAiPolishing}
          canAiPolish={!!noteText.trim()}
          onApplyToReport={onApplyToReport ? handleExecuteApplyToReport : undefined}
          isApplyingToReport={isApplyingToReport}
          canApplyToReport={!!noteText.trim()}
          existingComment={!!existingComment}
          commentId={commentId}
          onResolve={onResolve}
          onDelete={onDelete}
          onSave={handleSave}
          canSave={!!noteText.trim() || !!attachment}
          currentPalette={currentPalette}
        />
      </div>
    </div>
  );
}
