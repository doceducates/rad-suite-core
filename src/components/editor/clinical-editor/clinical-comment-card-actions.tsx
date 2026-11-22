'use client';

// Layer 4 (Presentation): Action toolbar for Clinical Comment Card
// Strict File Size Invariant: Target < 100 lines, max 350 lines

import React from 'react';
import { Mic, Square, Paperclip, Sparkles, CornerDownLeft, Zap } from 'lucide-react';
import { ClinicalInlineConfirmBtn } from './clinical-inline-confirm-btn';
import { CommentColorPalette } from './clinical-comment-types';

interface ClinicalCommentCardActionsProps {
  isRecording: boolean;
  recordingDuration: number;
  onToggleVoiceRecord: () => void;
  onAttachClick: () => void;
  onAiPolish: () => void;
  isAiPolishing: boolean;
  canAiPolish: boolean;
  onApplyToReport?: () => void;
  isApplyingToReport?: boolean;
  canApplyToReport?: boolean;
  existingComment: boolean;
  commentId: string;
  onResolve: (id: string) => void;
  onDelete: (id: string) => void;
  onSave: () => void;
  canSave: boolean;
  currentPalette: CommentColorPalette;
}

export function ClinicalCommentCardActions({
  isRecording,
  recordingDuration,
  onToggleVoiceRecord,
  onAttachClick,
  onAiPolish,
  isAiPolishing,
  canAiPolish,
  onApplyToReport,
  isApplyingToReport,
  canApplyToReport,
  existingComment,
  commentId,
  onResolve,
  onDelete,
  onSave,
  canSave,
  currentPalette,
}: ClinicalCommentCardActionsProps) {
  return (
    <div className="flex items-center justify-between gap-1 pt-1 flex-wrap">
      <div className="flex items-center gap-1">
        {/* Voice Note Button */}
        <button
          type="button"
          onClick={onToggleVoiceRecord}
          className={`h-6 px-1.5 rounded text-[10px] font-medium flex items-center gap-1 transition-all cursor-pointer ${
            isRecording
              ? 'bg-rose-500 text-white animate-pulse shadow-xs font-bold'
              : 'hover:bg-muted text-muted-foreground hover:text-foreground'
          }`}
          title={isRecording ? 'Click to stop recording' : 'Record consultant voice note'}
        >
          {isRecording ? (
            <>
              <Square className="w-2.5 h-2.5 fill-white shrink-0" />
              <span>{recordingDuration}s</span>
            </>
          ) : (
            <>
              <Mic className="w-3 h-3 text-rose-500 shrink-0" />
              <span>Voice</span>
            </>
          )}
        </button>

        {/* Attachment Button */}
        <button
          type="button"
          onClick={onAttachClick}
          className="h-6 px-1.5 rounded hover:bg-muted text-muted-foreground hover:text-foreground text-[10px] font-medium flex items-center gap-1 transition-colors cursor-pointer"
          title="Attach Screenshot / Crop Image"
        >
          <Paperclip className="w-3 h-3" />
        </button>

        {/* AI Polish Note Button */}
        <button
          type="button"
          onClick={onAiPolish}
          disabled={isAiPolishing || !canAiPolish}
          className="h-6 px-1.5 rounded bg-primary/10 hover:bg-primary/20 text-primary text-[10px] font-semibold flex items-center gap-1 transition-colors disabled:opacity-40 cursor-pointer"
          title="Polish note wording with AI"
        >
          <Sparkles className="w-3 h-3" />
        </button>

        {/* Apply Note Directly to Report with AI */}
        {onApplyToReport && (
          <button
            type="button"
            onClick={onApplyToReport}
            disabled={isApplyingToReport || !canApplyToReport}
            className="h-6 px-1.5 rounded bg-amber-500/15 hover:bg-amber-500/25 text-amber-600 dark:text-amber-400 text-[10px] font-semibold flex items-center gap-1 transition-colors disabled:opacity-40 cursor-pointer"
            title="Apply this comment instruction to the report text with AI"
          >
            <Zap className="w-2.5 h-2.5" />
            <span className="hidden sm:inline">{isApplyingToReport ? 'Applying...' : 'Apply'}</span>
          </button>
        )}

        {/* Resolve Confirmation */}
        {existingComment && (
          <ClinicalInlineConfirmBtn
            actionType="resolve"
            onConfirm={() => onResolve(commentId)}
            className="h-6 px-1.5 rounded bg-emerald-500/10 hover:bg-emerald-500/20 text-emerald-600 dark:text-emerald-400 text-[10px] font-semibold flex items-center gap-1 transition-colors cursor-pointer"
            title="Resolve and remove highlight"
          />
        )}

        {/* Delete Confirmation */}
        <ClinicalInlineConfirmBtn
          actionType="delete"
          onConfirm={() => onDelete(commentId)}
          className="h-6 w-6 rounded hover:bg-rose-500/10 text-muted-foreground hover:text-rose-500 flex items-center justify-center transition-colors cursor-pointer"
          title="Delete Note"
        />
      </div>

      {/* Save Button */}
      <button
        type="button"
        onClick={onSave}
        disabled={!canSave}
        className={`h-6 px-2.5 rounded-lg ${currentPalette.bg} ${currentPalette.text} border ${currentPalette.border} font-bold text-[11px] flex items-center gap-1 shadow-xs transition-all active:scale-95 disabled:opacity-50 cursor-pointer`}
      >
        <span>Save</span>
        <CornerDownLeft className="w-2.5 h-2.5 opacity-70" />
      </button>
    </div>
  );
}
