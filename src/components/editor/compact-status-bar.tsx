'use client';

import * as React from 'react';
import { ChevronLeft, Save, CheckCircle2, Loader2, Clock } from 'lucide-react';

export interface CompactStatusBarProps {
  patientName: string;
  age: number;
  gender: string;
  modality: string;
  accessionNumber: string;
  status: 'draft' | 'final' | 'pending' | string;
  savedTime: string | null;
  saving: boolean;
  onSave: () => void;
  onFinalize: () => void;
  onMore: () => void;
  onBack: () => void;
  onPending?: () => void;
  pendingReason?: string | null;
}

export function CompactStatusBar({
  patientName,
  age,
  gender,
  modality,
  accessionNumber,
  status,
  savedTime,
  saving,
  onSave,
  onFinalize,
  onMore,
  onBack,
  onPending,
  pendingReason,
}: CompactStatusBarProps) {
  const getModalityColor = (mod: string) => {
    switch (mod.toUpperCase()) {
      case 'CT': return 'bg-primary/10 text-primary border-primary/20';
      case 'MRI': return 'bg-purple-500/10 text-purple-500 border-purple-500/20';
      case 'XR': return 'bg-orange-500/10 text-orange-500 border-orange-500/20';
      case 'US': return 'bg-pink-500/10 text-pink-500 border-pink-500/20';
      default: return 'bg-primary/10 text-primary border-primary/20';
    }
  };

  const getStatusColor = (s: string) => {
    switch (s) {
      case 'final': return 'bg-emerald-500';
      case 'draft': return 'bg-amber-500';
      default: return 'bg-blue-500';
    }
  };

  return (
    <div className="h-8 flex items-center justify-between px-3 bg-card/80 backdrop-blur-sm border-b border-border text-sm">
      <div className="flex items-center gap-3">
        <button
          onClick={onBack}
          className="text-muted-foreground hover:text-foreground transition-colors flex items-center justify-center"
          aria-label="Back to worklist"
        >
          <ChevronLeft className="w-5 h-5" />
        </button>
        
        <div className="w-[1px] h-4 bg-border" />
        
        <div className="flex items-center gap-2">
          <span className="font-semibold text-foreground text-sm">{patientName}</span>
          <span className="text-xs text-muted-foreground">{age}y {gender}</span>
        </div>
        
        <div className="w-[1px] h-4 bg-border" />
        
        <div className="flex items-center gap-2">
          <span className={`text-[10px] px-1.5 py-0.5 rounded-full border font-medium ${getModalityColor(modality)}`}>
            {modality}
          </span>
          <span className="font-mono text-xs text-muted-foreground">{accessionNumber}</span>
        </div>
      </div>

      <div className="flex items-center gap-3">
        {pendingReason ? (
          <span className="text-[10px] font-mono px-1.5 py-0.5 rounded bg-amber-500/10 text-amber-600 dark:text-amber-400 border border-amber-500/20 flex items-center gap-1">
            <Clock className="w-3 h-3" />
            <span>Hold</span>
          </span>
        ) : (
          <div className="flex items-center gap-1.5">
            <div className={`w-2 h-2 rounded-full ${getStatusColor(status)}`} />
            <span className="text-[11px] capitalize text-muted-foreground">{status}</span>
          </div>
        )}
        
        {saving ? (
          <div className="flex items-center gap-1 text-muted-foreground">
            <Loader2 className="w-3 h-3 animate-spin" />
          </div>
        ) : savedTime ? (
          <span className="text-[10px] text-muted-foreground">Saved {savedTime}</span>
        ) : null}
        
        <div className="flex items-center gap-1">
          {onPending && (
            <button
              onClick={onPending}
              className={`p-0.5 rounded transition-colors ${
                pendingReason
                  ? 'text-amber-500 hover:text-amber-400 bg-amber-500/10'
                  : 'text-muted-foreground hover:text-amber-500 hover:bg-muted'
              }`}
              title={pendingReason ? `Pending: ${pendingReason}` : 'Mark Case Pending / On Hold'}
              aria-label="Pending"
            >
              <Clock className="w-4 h-4" />
            </button>
          )}
          <button
            onClick={onSave}
            disabled={saving}
            className="text-muted-foreground hover:text-foreground hover:bg-muted p-0.5 rounded transition-colors disabled:opacity-50"
            aria-label="Save"
          >
            <Save className="w-4 h-4" />
          </button>
          <button
            onClick={onFinalize}
            className="text-emerald-500 hover:text-emerald-400 hover:bg-muted p-0.5 rounded transition-colors"
            aria-label="Finalize"
          >
            <CheckCircle2 className="w-4 h-4" />
          </button>
        </div>
        
        <button
          onClick={onMore}
          className="text-[10px] font-mono bg-muted px-1.5 py-0.5 rounded border border-border hover:bg-muted/80 transition-colors text-muted-foreground flex items-center justify-center cursor-pointer"
          aria-label="More options"
        >
          ⌘K
        </button>
      </div>
    </div>
  );
}
