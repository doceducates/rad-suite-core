'use client';

import React from 'react';
import { UploadCloud, Trash2, DownloadCloud, X } from 'lucide-react';
import { Button } from '@/components/ui/button';

interface ClinicBatchActionsBarProps {
  selectedCount: number;
  unsyncedCount: number;
  localCount: number;
  pacsOnlyCount: number;
  onBatchUpload: () => void;
  onBatchPurge: () => void;
  onBatchPull: () => void;
  onClearSelection: () => void;
  isProcessing?: boolean;
}

export function ClinicBatchActionsBar({
  selectedCount,
  unsyncedCount,
  localCount,
  pacsOnlyCount,
  onBatchUpload,
  onBatchPurge,
  onBatchPull,
  onClearSelection,
  isProcessing = false,
}: ClinicBatchActionsBarProps) {
  if (selectedCount === 0) return null;

  return (
    <div className="flex flex-wrap items-center justify-between gap-2.5 px-3 py-2 rounded-xl bg-primary/10 border border-primary/25 shadow-xs text-xs">
      <div className="flex items-center gap-2">
        <span className="font-bold text-foreground">
          {selectedCount} {selectedCount === 1 ? 'case' : 'cases'} selected
        </span>
        <button
          type="button"
          onClick={onClearSelection}
          className="text-muted-foreground hover:text-foreground text-[11px] underline cursor-pointer ml-1"
        >
          Deselect all
        </button>
      </div>

      <div className="flex items-center gap-2 flex-wrap">
        {unsyncedCount > 0 && (
          <Button
            size="sm"
            onClick={onBatchUpload}
            disabled={isProcessing}
            className="h-7 px-2.5 text-xs bg-emerald-600 hover:bg-emerald-700 text-white gap-1 cursor-pointer"
            title="Upload selected resident sandbox studies to Rad Suite Cloud VPS"
          >
            <UploadCloud className="w-3.5 h-3.5" />
            <span>Upload to Cloud ({unsyncedCount})</span>
          </Button>
        )}

        {pacsOnlyCount > 0 && (
          <Button
            size="sm"
            onClick={onBatchPull}
            disabled={isProcessing}
            variant="outline"
            className="h-7 px-2.5 text-xs text-primary border-primary/40 hover:bg-primary/10 gap-1 cursor-pointer"
            title="Pull selected scanner studies into Medical Sandbox"
          >
            <DownloadCloud className="w-3.5 h-3.5" />
            <span>Pull PACS ({pacsOnlyCount})</span>
          </Button>
        )}

        {localCount > 0 && (
          <Button
            size="sm"
            variant="outline"
            onClick={onBatchPurge}
            disabled={isProcessing}
            className="h-7 px-2.5 text-xs border-rose-500/40 text-rose-500 hover:bg-rose-500/10 gap-1 cursor-pointer"
            title="Purge selected cases from Medical Sandbox to free disk space"
          >
            <Trash2 className="w-3.5 h-3.5" />
            <span>Purge Sandbox ({localCount})</span>
          </Button>
        )}

        <Button
          size="sm"
          variant="ghost"
          onClick={onClearSelection}
          className="h-7 px-2 text-xs text-muted-foreground hover:text-foreground"
        >
          <X className="w-3.5 h-3.5" />
        </Button>
      </div>
    </div>
  );
}
