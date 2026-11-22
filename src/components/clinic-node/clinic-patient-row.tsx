'use client';

import React from 'react';
import {
  HardDrive,
  Server,
  DownloadCloud,
  UploadCloud,
  Trash2,
  ExternalLink,
  Check,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { getModalityColor } from '@/lib/utils';

export interface UnifiedPatientStudy {
  id: string;
  patientName: string;
  patientId: string;
  patientMrn?: string;
  accessionNumber: string;
  studyDate: string;
  studyTime?: string | null;
  modality: string;
  studyDescription: string;
  numInstances: number;
  numSeries?: number;
  s3Status: string;
  studyInstanceUid?: string;
  location?: 's3' | 'sandbox' | 'pacs';
  hasLocalSeries?: boolean;
  sizeMb?: number;
}

interface ClinicPatientRowProps {
  study: UnifiedPatientStudy;
  isSelected: boolean;
  onToggleSelect: (accession: string) => void;
  isPulling: boolean;
  isUploading: boolean;
  isPurging: boolean;
  onPull: (study: UnifiedPatientStudy) => void;
  onUpload: (study: UnifiedPatientStudy) => void;
  onPurge: (accession: string) => void;
}

export function ClinicPatientRow({
  study,
  isSelected,
  onToggleSelect,
  isPulling,
  isUploading,
  isPurging,
  onPull,
  onUpload,
  onPurge,
}: ClinicPatientRowProps) {
  const isS3 = study.s3Status === 'synced' || study.location === 's3';
  const isUploadingState = study.s3Status === 'uploading' || isUploading;
  const isDownloadingState = study.s3Status === 'downloading' || isPulling;
  const isLocal = study.location === 'sandbox' || Boolean(study.hasLocalSeries) || Boolean(study.sizeMb);
  const needsPull = !isLocal && !isS3;

  const renderStatusBadge = () => {
    if (isS3) {
      return (
        <span className="inline-flex items-center gap-1 text-[10px] font-bold text-emerald-600 dark:text-emerald-400 bg-emerald-500/10 px-2 py-0.5 rounded border border-emerald-500/25">
          <Check className="w-3 h-3" />
          <span>Synced to Cloud</span>
        </span>
      );
    }
    if (isUploadingState) {
      return (
        <span className="inline-flex items-center gap-1 text-[10px] font-bold text-sky-600 dark:text-sky-400 bg-sky-500/10 px-2 py-0.5 rounded border border-sky-500/25">
          <UploadCloud className="w-3 h-3 animate-pulse" />
          <span>Uploading to Cloud</span>
        </span>
      );
    }
    if (isDownloadingState) {
      return (
        <span className="inline-flex items-center gap-1 text-[10px] font-bold text-violet-600 dark:text-violet-400 bg-violet-500/10 px-2 py-0.5 rounded border border-violet-500/25">
          <DownloadCloud className="w-3 h-3 animate-bounce" />
          <span>Pulling PACS</span>
        </span>
      );
    }
    if (isLocal) {
      return (
        <span className="inline-flex items-center gap-1 text-[10px] font-bold text-amber-600 dark:text-amber-400 bg-amber-500/10 px-2 py-0.5 rounded border border-amber-500/25">
          <HardDrive className="w-3 h-3" />
          <span>In Sandbox {study.sizeMb ? `(${study.sizeMb} MB)` : ''}</span>
        </span>
      );
    }
    return (
      <span className="inline-flex items-center gap-1 text-[10px] font-medium text-muted-foreground bg-muted/40 px-2 py-0.5 rounded border border-border">
        <Server className="w-3 h-3 text-muted-foreground/70" />
        <span>On PACS Scanner</span>
      </span>
    );
  };

  return (
    <tr className={`transition-colors hover:bg-surface-container/30 ${isSelected ? 'bg-primary/5 dark:bg-primary/10' : ''}`}>
      {/* Selection Checkbox */}
      <td className="py-2.5 px-3 text-center">
        <input
          type="checkbox"
          checked={isSelected}
          onChange={() => onToggleSelect(study.accessionNumber)}
          className="rounded border-border text-primary focus:ring-primary cursor-pointer w-3.5 h-3.5"
          title={`Select study ${study.accessionNumber}`}
        />
      </td>

      {/* Patient & Identifiers */}
      <td className="py-2.5 px-3 font-semibold text-foreground">
        <div className="truncate max-w-[140px]" title={study.patientName}>
          {study.patientName}
        </div>
        <div className="text-[10px] text-muted-foreground font-mono">
          {study.patientMrn || study.patientId || '—'}
        </div>
      </td>

      {/* Modality */}
      <td className="py-2.5 px-3">
        <span className={`inline-block px-1.5 py-0.5 rounded text-[10px] font-bold font-mono ${getModalityColor(study.modality)}`}>
          {study.modality}
        </span>
      </td>

      {/* Study Description */}
      <td className="py-2.5 px-3 text-muted-foreground">
        <div className="truncate max-w-[170px]" title={study.studyDescription}>
          {study.studyDescription || '—'}
        </div>
      </td>

      {/* Accession Number */}
      <td className="py-2.5 px-3 font-mono text-[11px] text-foreground">
        {study.accessionNumber}
      </td>

      {/* Date & Slices */}
      <td className="py-2.5 px-3 text-[11px]">
        <div className="text-foreground font-medium">{study.studyDate || '—'}</div>
        <div className="text-[10px] text-muted-foreground font-mono">
          {study.numInstances || 0} Slices • {study.numSeries || 1} Ser
        </div>
      </td>

      {/* Storage Stage Badge */}
      <td className="py-2.5 px-3">
        {renderStatusBadge()}
      </td>

      {/* Dynamic Action Buttons */}
      <td className="py-2.5 px-3 text-right">
        <div className="flex items-center justify-end gap-1.5 flex-wrap">
          {/* Dynamic Action 1: Pull from PACS (ONLY when study is not yet in Sandbox and not yet in S3) */}
          {needsPull && (
            <Button
              size="sm"
              variant="outline"
              disabled={isPulling}
              onClick={() => onPull(study)}
              className="h-6 px-2 text-[11px] gap-1 text-primary border-primary/40 hover:bg-primary/10 cursor-pointer"
              title="Pull study from Hospital PACS into Medical Sandbox"
            >
              <DownloadCloud className={`w-3 h-3 ${isPulling ? 'animate-bounce' : ''}`} />
              <span>{isPulling ? 'Pulling...' : 'Pull'}</span>
            </Button>
          )}

          {/* Dynamic Action 2: Upload to Cloud (ONLY when study is in sandbox but not yet synced to Cloud) */}
          {isLocal && !isS3 && (
            <Button
              size="sm"
              variant="outline"
              disabled={isUploading}
              onClick={() => onUpload(study)}
              className="h-6 px-2 text-[11px] gap-1 text-emerald-600 dark:text-emerald-400 border-emerald-500/40 hover:bg-emerald-500/10 cursor-pointer"
              title="Upload study series from Clinic PC to Rad Suite Cloud VPS"
            >
              <UploadCloud className={`w-3 h-3 ${isUploading ? 'animate-pulse' : ''}`} />
              <span>{isUploading ? 'Syncing...' : 'Upload to Cloud'}</span>
            </Button>
          )}

          {/* Dynamic Action 3: Purge from Sandbox (whenever study resides on local disk) */}
          {isLocal && (
            <Button
              size="sm"
              variant="ghost"
              disabled={isPurging}
              onClick={() => onPurge(study.accessionNumber)}
              className="h-6 px-1.5 text-[11px] text-rose-500 hover:bg-rose-500/10 cursor-pointer"
              title={isS3 ? 'Purge local cache from Medical Sandbox (safe: backed up in Cloud)' : 'Delete local files from Medical Sandbox'}
            >
              <Trash2 className="w-3 h-3" />
            </Button>
          )}

          {/* Dynamic Action 4: Clinical Review / Viewer */}
          <a
            href={`/workspace/${encodeURIComponent(study.accessionNumber)}`}
            className="inline-flex items-center gap-1 h-6 px-2 text-[11px] font-medium rounded-md border border-border/80 text-foreground hover:bg-surface-container-high transition-colors"
            title="Open study in diagnostic workspace"
          >
            <ExternalLink className="w-3 h-3" />
            <span>Viewer</span>
          </a>
        </div>
      </td>
    </tr>
  );
}
