'use client';

// Layer 4 (Presentation): Clinical Comment Attachment Preview (Audio Player & Image Thumbnail)
import React from 'react';
import { Play, Pause, Volume2, Sparkles, X, FileImage } from 'lucide-react';
import { ClinicalCommentAttachment } from './clinical-comment-types';

interface ClinicalCommentAttachmentPreviewProps {
  attachment: ClinicalCommentAttachment;
  isPlayingAudio: boolean;
  isTranscribing: boolean;
  onPlayPauseAudio: () => void;
  onTranscribeAudio: () => void;
  onRemoveAttachment: () => void;
}

export function ClinicalCommentAttachmentPreview({
  attachment,
  isPlayingAudio,
  isTranscribing,
  onPlayPauseAudio,
  onTranscribeAudio,
  onRemoveAttachment,
}: ClinicalCommentAttachmentPreviewProps) {
  return (
    <div className="relative rounded-lg border border-border bg-muted/40 p-2 flex items-center justify-between gap-2">
      {attachment.type.startsWith('audio/') ? (
        <div className="flex items-center gap-2 min-w-0 flex-1">
          <button
            type="button"
            onClick={onPlayPauseAudio}
            className="w-7 h-7 rounded-full bg-primary text-primary-foreground flex items-center justify-center shrink-0 hover:opacity-90 shadow-xs cursor-pointer"
            title={isPlayingAudio ? 'Pause' : 'Play voice note'}
          >
            {isPlayingAudio ? (
              <Pause className="w-3.5 h-3.5" />
            ) : (
              <Play className="w-3.5 h-3.5 ml-0.5" />
            )}
          </button>
          <div className="min-w-0 flex-1">
            <div className="text-[10px] font-semibold truncate flex items-center gap-1">
              <Volume2 className="w-3 h-3 text-primary shrink-0" />
              <span className="truncate">{attachment.name}</span>
            </div>
            <div className="text-[9px] text-muted-foreground flex items-center gap-2">
              <span>{attachment.duration ? `${attachment.duration}s` : 'Audio'}</span>
              <button
                type="button"
                onClick={onTranscribeAudio}
                disabled={isTranscribing}
                className="text-primary hover:underline font-medium flex items-center gap-0.5 cursor-pointer disabled:opacity-50"
                title="Transcribe voice to text using VoiceStudio"
              >
                <Sparkles className="w-2.5 h-2.5" />
                <span>{isTranscribing ? 'Transcribing...' : 'Transcribe'}</span>
              </button>
            </div>
          </div>
        </div>
      ) : (
        <div className="flex items-center gap-2 min-w-0 flex-1">
          {attachment.type.startsWith('image/') ? (
            <img
              src={attachment.url}
              alt={attachment.name}
              className="w-8 h-8 object-cover rounded border border-border shrink-0"
            />
          ) : (
            <FileImage className="w-6 h-6 text-primary shrink-0" />
          )}
          <div className="min-w-0 flex-1">
            <div className="text-[10px] font-medium truncate text-foreground">{attachment.name}</div>
            <div className="text-[8px] text-muted-foreground">Attached Image / Crop</div>
          </div>
        </div>
      )}

      <button
        type="button"
        onClick={onRemoveAttachment}
        className="p-1 text-muted-foreground hover:text-rose-500 cursor-pointer shrink-0"
        title="Remove attachment"
      >
        <X className="w-3.5 h-3.5" />
      </button>
    </div>
  );
}
