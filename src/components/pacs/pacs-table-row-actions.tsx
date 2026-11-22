'use client';

import React from 'react';
import { Play, CloudUpload, Download, FolderOpen, Eye, FileText, UserCheck, Share2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import type { EnrichedHospitalPacsStudy } from '@/services/pacs-study-enrichment.service';

interface PacsRowActionsProps {
  study: EnrichedHospitalPacsStudy;
  isSynced: boolean;
  onSingleSync: (accession: string) => void;
  onSinglePull?: (accession: string) => void;
  onStreamAndView: (study: EnrichedHospitalPacsStudy, mode?: 'review' | 'report') => void;
  onClaimCase?: (accession: string) => void;
  onShareCase?: (study: EnrichedHospitalPacsStudy) => void;
  canPull?: boolean;
  canUpload?: boolean;
  canDownloadZip?: boolean;
}

export function PacsRowActions({
  study: st,
  isSynced,
  onSingleSync,
  onSinglePull,
  onStreamAndView,
  onClaimCase,
  onShareCase,
  canPull = true,
  canUpload = true,
  canDownloadZip = true,
}: PacsRowActionsProps) {
  const isHotStaged = Boolean(st.isHotStaged) || st.pipelineStage === 'hot_staged';
  const isReadyToView = isSynced || isHotStaged;
  const isLocalSandbox =
    !isReadyToView &&
    (st.s3Status === 'in_sandbox' || st.s3Status === 'local_only' || st.pipelineStage === 'in_sandbox');
  const isUploading =
    st.pipelineStage === 'uploading' ||
    (st.pipelineStage !== 'on_pacs' && (st.s3Status === 'queued' || st.s3Status === 'uploading'));

  return (
    <div className="flex items-center justify-end gap-1.5">
      {/* 1. Pull Button: Only when study is strictly on Hospital PACS (not yet in Sandbox or VPS/S3) */}
      {!isReadyToView && !isLocalSandbox && onSinglePull && canPull && (
        <Button
          size="sm"
          variant="outline"
          onClick={() => onSinglePull(st.accessionNumber)}
          className="gap-1 h-7 px-2 text-xs border-border hover:bg-surface-container text-foreground cursor-pointer"
          title="Pull study from Hospital PACS into MedicalSandbox"
        >
          <Download className="w-3 h-3 text-primary" />
          <span>Pull</span>
        </Button>
      )}

      {/* 2. Dual Viewing Actions: [Review] (Pure Viewer) and [Report] (Viewer + Structured Reporting) */}
      {isReadyToView ? (
        <>
          <Button
            size="sm"
            variant="outline"
            onClick={() => onStreamAndView(st, 'review')}
            className="gap-1 h-7 px-2 text-xs border-border hover:bg-surface-container text-foreground cursor-pointer"
            title="Inspect scans in 100% full-screen Review Mode (no reporting obligations)"
          >
            <Eye className="w-3.5 h-3.5 text-primary shrink-0" />
            <span>Review</span>
          </Button>

          <Button
            size="sm"
            variant={isHotStaged && !isSynced ? 'secondary' : 'primary'}
            onClick={() => onStreamAndView(st, 'report')}
            className={`gap-1 h-7 px-2.5 text-xs font-medium shadow-none cursor-pointer ${
              isHotStaged && !isSynced
                ? 'bg-purple-500/15 text-purple-600 dark:text-purple-300 border border-purple-500/30 hover:bg-purple-500/25'
                : 'bg-primary text-primary-foreground hover:bg-primary/90'
            }`}
            title="Open diagnostic workspace with structured TipTap reporting editor"
          >
            <FileText className="w-3.5 h-3.5 shrink-0" />
            <span>Report</span>
          </Button>
        </>
      ) : (
        <>
          <Button
            size="sm"
            variant="ghost"
            onClick={() => onStreamAndView(st, 'review')}
            className="gap-1 h-7 px-2 text-xs text-primary hover:bg-primary/10 hover:text-primary cursor-pointer"
            title="Stream on-demand from PACS into full-screen viewer"
          >
            <Play className="w-3 h-3 fill-current" />
            <span>Review</span>
          </Button>

          <Button
            size="sm"
            variant="outline"
            onClick={() => onStreamAndView(st, 'report')}
            className="gap-1 h-7 px-2 text-xs border-primary/30 text-primary hover:bg-primary/10 cursor-pointer"
            title="Stream on-demand and open report editor"
          >
            <FileText className="w-3 h-3" />
            <span>Report</span>
          </Button>
        </>
      )}

      {/* 3. Share with Consultant: Generate password-protected link */}
      {onShareCase && (
        <Button
          size="sm"
          variant="outline"
          onClick={() => onShareCase(st)}
          className="gap-1 h-7 px-2 text-xs border-border hover:border-emerald-500/40 hover:bg-emerald-500/10 text-muted-foreground hover:text-emerald-600 dark:hover:text-emerald-400 cursor-pointer"
          title={`Share study ${st.accessionNumber} with consultant for review`}
        >
          <Share2 className="w-3 h-3 text-emerald-500 shrink-0" />
          <span className="hidden xl:inline text-[11px] font-medium">Share</span>
        </Button>
      )}

      {/* 3. RadiAnt DICOM ZIP Download: Available when archived in S3 or Hot Staged */}
      {(isSynced || isHotStaged) && canDownloadZip && (
        <a
          href={`/api/pacs/download?accession=${encodeURIComponent(st.accessionNumber)}`}
          download={`${st.accessionNumber}_RadiAnt.zip`}
          className="inline-flex items-center gap-1 h-7 px-2 text-xs rounded border border-emerald-500/30 bg-emerald-500/10 hover:bg-emerald-500/20 text-emerald-600 dark:text-emerald-400 transition-colors cursor-pointer"
          title="Download full DICOM study as ZIP archive for RadiAnt DICOM Viewer"
        >
          <Download className="w-3 h-3 text-emerald-500" />
          <span className="text-[11px] font-medium">ZIP</span>
        </a>
      )}

      {/* 4. Upload Button: ONLY shown when study is NOT yet on VPS or S3 */}
      {!isReadyToView && canUpload && (
        <Button
          size="sm"
          variant="outline"
          disabled={isUploading}
          onClick={() => onSingleSync(st.accessionNumber)}
          className="gap-1 h-7 px-2 text-xs border-border hover:bg-surface-container cursor-pointer"
          title="Force upload study to VPS & S3 Cloud (bypasses keyword filter)"
        >
          <CloudUpload
            className={`w-3 h-3 ${isUploading ? 'animate-pulse text-amber-500' : 'text-muted-foreground'}`}
          />
          <span>{isUploading ? 'Uploading...' : 'Upload'}</span>
        </Button>
      )}
    </div>
  );
}
