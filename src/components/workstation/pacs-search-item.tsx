'use client';

import React from 'react';
import { Eye, PictureInPicture, ExternalLink } from 'lucide-react';
import { getModalityColor, formatDicomDateTime, formatDicomDob } from '@/lib/utils';
import { PacsSourceBadge } from '@/components/pacs/pacs-source-badge';
import type { PacsStudyResult } from '@/types/pacs';

interface PacsSearchItemProps {
  study: PacsStudyResult;
  onOpen: (study: PacsStudyResult) => void;
  onSelectForPip?: (study: PacsStudyResult) => void;
}

export function PacsSearchItem({ study, onOpen, onSelectForPip }: PacsSearchItemProps) {
  const isLocal = study.source === 'local' || study.source === 'local_archive';

  return (
    <div className="p-3 rounded-xl border border-outline-variant/50 bg-surface-container-lowest hover:border-primary/50 hover:bg-surface-container/30 transition-all flex items-center justify-between gap-3 text-xs">
      <div className="space-y-1 min-w-0">
        <div className="flex items-center gap-2">
          <span className={`px-1.5 py-0.5 rounded text-[10px] font-bold ${getModalityColor(study.modality)}`}>
            {study.modality}
          </span>
          <span className="font-semibold text-on-surface">{study.patientName}</span>
          <span className="text-[10px] text-secondary font-mono">
            ID: {study.patientMrn || study.patientId} {study.dateOfBirth ? `• DOB: ${formatDicomDob(study.dateOfBirth)}` : `• ${study.age}Y/${study.gender}`}
          </span>
          <PacsSourceBadge
            source={study.source}
            availableSources={study.availableSources}
            isDownloaded={study.isDownloaded || isLocal}
          />
          <span className={`text-[9px] font-mono px-1.5 py-0.5 rounded-full border font-bold ${
            study.status === 'final' || study.status === 'finalized'
              ? 'border-emerald-500/40 bg-emerald-500/10 text-emerald-400'
              : 'border-amber-500/40 bg-amber-500/10 text-amber-400'
          }`}>
            {study.status === 'final' || study.status === 'finalized' ? '✓ Final' : '⏳ To Report'}
          </span>
        </div>
        <div className="text-[11px] text-secondary truncate max-w-lg">
          {study.studyDescription}
        </div>
        <div className="text-[10px] font-mono text-secondary/80 flex items-center gap-3">
          <span>ACC: {study.accessionNumber}</span>
          {study.examId && <span>• Exam: {study.examId}</span>}
          <span>•</span>
          <span>{formatDicomDateTime(study.studyDate)}</span>
          <span>•</span>
          <span>{study.numSeries} ser / {study.numInstances} img</span>
        </div>
      </div>

      <div className="flex items-center gap-1.5 shrink-0">
        <button
          type="button"
          onClick={() => onOpen(study)}
          className="px-2.5 py-1 rounded-lg bg-primary hover:bg-primary/90 text-on-primary font-label text-[11px] font-semibold flex items-center gap-1 transition-colors cursor-pointer"
          title="Open study in Workstation"
        >
          <Eye className="w-3.5 h-3.5" />
          <span>Open</span>
        </button>

        {onSelectForPip && (
          <button
            type="button"
            onClick={() => onSelectForPip(study)}
            className="px-2.5 py-1 rounded-lg bg-surface-container hover:bg-surface-container-high border border-outline-variant/60 text-on-surface font-label text-[11px] font-medium flex items-center gap-1 transition-colors cursor-pointer"
            title="Load into floating PiP for prior-study comparison"
          >
            <PictureInPicture className="w-3.5 h-3.5 text-primary" />
            <span>Compare in PiP</span>
          </button>
        )}

        <button
          type="button"
          onClick={() => window.location.href = `radiant://?accession=${encodeURIComponent(study.accessionNumber)}`}
          className="p-1 text-secondary hover:text-on-surface rounded-lg hover:bg-surface-container transition-colors"
          title="Open volume in external RadiAnt Viewer"
        >
          <ExternalLink className="w-3.5 h-3.5" />
        </button>
      </div>
    </div>
  );
}
