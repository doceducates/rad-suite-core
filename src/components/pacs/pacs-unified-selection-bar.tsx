'use client';

import React from 'react';
import { CloudUpload, Download, X, CheckSquare, UserCheck } from 'lucide-react';
import { Button } from '@/components/ui/button';

interface PacsUnifiedSelectionBarProps {
  selectedCount: number;
  totalFilteredCount: number;
  onClearSelection: () => void;
  onSelectAllFiltered: () => void;
  onBulkClaim?: () => void;
  onBulkS3Upload?: () => void;
  onBulkPacsPull?: () => void;
  onBulkRadiAntDownload?: () => void;
  isClaiming?: boolean;
  isUploading?: boolean;
  isPulling?: boolean;
  isDownloading?: boolean;
}

export function PacsUnifiedSelectionBar({
  selectedCount,
  totalFilteredCount,
  onClearSelection,
  onSelectAllFiltered,
  onBulkClaim,
  onBulkS3Upload,
  onBulkPacsPull,
  onBulkRadiAntDownload,
  isClaiming = false,
  isUploading = false,
  isPulling = false,
  isDownloading = false,
}: PacsUnifiedSelectionBarProps) {
  if (selectedCount === 0) return null;

  return (
    <div className="fixed bottom-6 left-1/2 -translate-x-1/2 z-40 animate-in fade-in slide-in-from-bottom-4 duration-200">
      <div className="flex flex-wrap items-center gap-2.5 px-4 py-2.5 rounded-2xl bg-card/95 backdrop-blur-md border border-border shadow-2xl text-xs text-foreground">
        {/* Count Badge */}
        <div className="flex items-center gap-2 pr-2 border-r border-border/60">
          <div className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
          <span className="font-bold text-foreground">
            {selectedCount} {selectedCount === 1 ? 'Study' : 'Studies'} Selected
          </span>
        </div>

        {/* Select All on Page / Filtered */}
        {selectedCount < totalFilteredCount && (
          <button
            type="button"
            onClick={onSelectAllFiltered}
            className="flex items-center gap-1 text-[11px] text-muted-foreground hover:text-foreground cursor-pointer font-medium"
          >
            <CheckSquare className="w-3.5 h-3.5" />
            <span>Select all {totalFilteredCount}</span>
          </button>
        )}

        {/* Bulk Action: Claim to My Cases */}
        {onBulkClaim && (
          <Button
            size="sm"
            variant="outline"
            onClick={onBulkClaim}
            disabled={isClaiming || isUploading || isPulling || isDownloading}
            className="gap-1.5 text-xs border-primary/40 text-primary hover:bg-primary/10 cursor-pointer"
            title="Import and claim selected studies into My Cases"
          >
            <UserCheck className={`w-3.5 h-3.5 ${isClaiming ? 'animate-bounce' : ''}`} />
            <span>{isClaiming ? 'Claiming Cases...' : `Claim ${selectedCount} to My Cases`}</span>
          </Button>
        )}

        {/* Bulk Pull from PACS into MedicalSandbox */}
        {onBulkPacsPull && (
          <Button
            size="sm"
            variant="outline"
            onClick={onBulkPacsPull}
            disabled={isPulling || isUploading}
            className="gap-1.5 text-xs border-border hover:bg-surface-container"
            title="Pull selected studies from Hospital PACS into MedicalSandbox"
          >
            <Download className={`w-3.5 h-3.5 text-primary ${isPulling ? 'animate-bounce' : ''}`} />
            <span>{isPulling ? 'Pulling from PACS...' : 'Pull Selected from PACS'}</span>
          </Button>
        )}

        {/* Bulk Action: Download for RadiAnt */}
        {onBulkRadiAntDownload && (
          <Button
            size="sm"
            variant="outline"
            onClick={onBulkRadiAntDownload}
            disabled={isDownloading || isUploading || isPulling}
            className="gap-1.5 text-xs border-emerald-500/40 text-emerald-600 dark:text-emerald-400 hover:bg-emerald-500/10 cursor-pointer"
            title="Download selected studies as a consolidated ZIP for RadiAnt DICOM Viewer"
          >
            <Download className={`w-3.5 h-3.5 ${isDownloading ? 'animate-bounce' : ''}`} />
            <span>{isDownloading ? 'Packaging RadiAnt...' : `Download ${selectedCount} for RadiAnt`}</span>
          </Button>
        )}

        {/* Bulk Action: S3 Upload */}
        {onBulkS3Upload && (
          <Button
            size="sm"
            onClick={onBulkS3Upload}
            disabled={isUploading || isPulling || isDownloading}
            className="gap-1.5 text-xs bg-primary text-primary-foreground hover:bg-primary/90 shadow-xs"
            title="Upload selected studies to Cloud S3"
          >
            <CloudUpload className={`w-3.5 h-3.5 ${isUploading ? 'animate-bounce' : ''}`} />
            <span>{isUploading ? 'Queueing Uploads...' : 'Upload Selected to S3'}</span>
          </Button>
        )}

        {/* Clear Selection */}
        <button
          type="button"
          onClick={onClearSelection}
          className="p-1 rounded-lg text-muted-foreground hover:text-foreground hover:bg-surface-container cursor-pointer ml-1"
          title="Clear selection"
        >
          <X className="w-4 h-4" />
        </button>
      </div>
    </div>
  );
}
