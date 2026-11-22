'use client';

import React, { useState, useRef, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { ArrowRight, Loader2, Calendar, HardDrive, Layers } from 'lucide-react';
import { PacsSourceBadge } from '@/components/pacs/pacs-source-badge';
import { notify } from '@/services/notification.service';
import { startCaseLoadingProgress } from '@/services/case-loading-progress.service';
import type { PacsStudyResult } from '@/types/pacs';

export const RETRIEVABLE_SOURCES = new Set<string>(['pacs', 'hospital_pacs', 's3', 'gdrive', 'remote_node']);

export interface OpenStudyNavigationOptions {
  notifyService?: typeof notify;
  fetchFn?: typeof fetch;
}

/**
 * Initiates instant study navigation (<50ms) and dispatches non-blocking
 * background PACS slice caching if the study is not already downloaded.
 */
export function openStandbyStudy(
  study: PacsStudyResult,
  router: { push: (url: string) => void },
  options?: OpenStudyNavigationOptions
): { targetUrl: string; backgroundRetrievalTriggered: boolean } {
  const notifyClient = options?.notifyService || notify;
  const identifier = study.localCaseId || study.accessionNumber || study.studyInstanceUid;

  if (!identifier || !identifier.trim()) {
    try {
      notifyClient.error('Unable to open study: Missing case identifier or accession number');
    } catch {}
    return { targetUrl: '', backgroundRetrievalTriggered: false };
  }

  const targetUrl = `/workspace/${encodeURIComponent(identifier.trim())}`;

  // 1. Instant route transition (zero blocking) with progress bar
  startCaseLoadingProgress(identifier, study.modality || 'Study');
  router.push(targetUrl);

  // 2. Non-blocking fire-and-forget background retrieval with explicit source allowlist
  const shouldRetrieve = !study.isDownloaded && Boolean(study.source && RETRIEVABLE_SOURCES.has(study.source));

  if (shouldRetrieve) {
    const fetchClient = options?.fetchFn || (typeof window !== 'undefined' ? window.fetch.bind(window) : globalThis.fetch);

    try {
      notifyClient.info(`Opening ${study.modality || 'Study'} (${study.accessionNumber || identifier}) — caching slices in background`, {
        durationMs: 3000,
      });
    } catch {}

    if (typeof fetchClient === 'function') {
      try {
        const promise = fetchClient('/api/pacs/retrieve', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          keepalive: true,
          body: JSON.stringify({
            accessionNumber: study.accessionNumber || study.studyInstanceUid || identifier,
            studyInstanceUid: study.studyInstanceUid,
            patientName: study.patientName,
            source: study.source === 'pacs' ? 'hospital_pacs' : study.source,
          }),
        });
        if (promise && typeof promise.catch === 'function') {
          promise.catch((err) => {
            console.warn('[StandbyCaseCard] Background retrieve warning:', err);
          });
        }
      } catch (err) {
        console.warn('[StandbyCaseCard] Failed to dispatch background retrieve:', err);
      }
    }
  }

  return { targetUrl, backgroundRetrievalTriggered: shouldRetrieve };
}

interface StandbyCaseCardProps {
  study: PacsStudyResult;
}

function getModalityStyle(modality: string): string {
  const m = modality?.toUpperCase() || 'CT';
  if (m === 'CT') return 'bg-sky-500/15 text-sky-400 border-sky-500/30';
  if (m === 'MR' || m === 'MRI') return 'bg-purple-500/15 text-purple-400 border-purple-500/30';
  if (m === 'CR' || m === 'DX' || m === 'XR') return 'bg-emerald-500/15 text-emerald-400 border-emerald-500/30';
  if (m === 'US') return 'bg-amber-500/15 text-amber-400 border-amber-500/30';
  return 'bg-zinc-500/15 text-zinc-400 border-zinc-500/30';
}

export function StandbyCaseCard({ study }: StandbyCaseCardProps) {
  const router = useRouter();
  const [opening, setOpening] = useState(false);
  const timeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    return () => {
      if (timeoutRef.current) {
        clearTimeout(timeoutRef.current);
      }
    };
  }, []);

  const handleOpen = (e: React.MouseEvent) => {
    e.stopPropagation();
    if (opening) return;
    setOpening(true);

    if (timeoutRef.current) {
      clearTimeout(timeoutRef.current);
    }
    // Safety timeout to reset state if navigation is interrupted or aborted
    timeoutRef.current = setTimeout(() => {
      setOpening(false);
    }, 5000);

    try {
      const res = openStandbyStudy(study, router);
      if (!res.targetUrl) {
        setOpening(false);
        if (timeoutRef.current) {
          clearTimeout(timeoutRef.current);
        }
      }
    } catch {
      setOpening(false);
      if (timeoutRef.current) {
        clearTimeout(timeoutRef.current);
      }
      notify.error('Failed to navigate to workspace');
    }
  };

  const formattedDate = study.studyDate
    ? study.studyDate.length === 8
      ? `${study.studyDate.slice(0, 4)}-${study.studyDate.slice(4, 6)}-${study.studyDate.slice(6, 8)}`
      : study.studyDate.split('T')[0]
    : 'Unknown Date';

  return (
    <div
      onClick={handleOpen}
      className={`group relative p-3.5 rounded-xl bg-surface-container/70 hover:bg-surface-container border border-outline-variant/40 hover:border-primary/50 transition-all flex flex-col justify-between gap-3 shadow-2xs hover:shadow-md select-none text-left ${
        opening ? 'cursor-wait pointer-events-none opacity-80' : 'cursor-pointer'
      }`}
    >
      {/* Top Header: Modality + Source Badges */}
      <div className="flex items-center justify-between gap-2">
        <span className={`px-2 py-0.5 rounded text-[10px] font-mono font-bold border ${getModalityStyle(study.modality)}`}>
          {study.modality || 'DICOM'}
        </span>
        <PacsSourceBadge
          source={study.source}
          availableSources={study.availableSources}
          isDownloaded={study.isDownloaded}
        />
      </div>

      {/* Patient Name & Study Description */}
      <div className="min-w-0">
        <h4 className="font-bold text-xs text-on-surface truncate group-hover:text-primary transition-colors">
          {study.patientName || 'ANONYMOUS'}
        </h4>
        <p className="text-[11px] text-secondary truncate mt-0.5" title={study.studyDescription}>
          {study.studyDescription || 'Diagnostic Scan'}
        </p>
      </div>

      {/* Metrics Row: Series/Slices + Date + Accession */}
      <div className="pt-2 border-t border-outline-variant/30 flex items-center justify-between text-[10px] text-secondary/80 font-mono">
        <div className="flex items-center gap-2">
          {study.numSeries ? (
            <span className="flex items-center gap-1" title={`${study.numSeries} Series`}>
              <Layers className="w-3 h-3 text-secondary" />
              <span>{study.numSeries}s</span>
            </span>
          ) : null}
          {study.numInstances ? (
            <span className="flex items-center gap-1" title={`${study.numInstances} Slices`}>
              <HardDrive className="w-3 h-3 text-secondary" />
              <span>{study.numInstances} sl</span>
            </span>
          ) : null}
          <span className="flex items-center gap-1">
            <Calendar className="w-3 h-3 text-secondary" />
            <span>{formattedDate}</span>
          </span>
        </div>

        <span className="text-secondary/60">
          #{study.accessionNumber}
        </span>
      </div>

      {/* Hover Action Strip */}
      <div className="pt-1 flex items-center justify-end">
        <button
          type="button"
          disabled={opening}
          className="text-[11px] font-semibold text-primary group-hover:underline flex items-center gap-1 transition-transform group-hover:translate-x-0.5 disabled:pointer-events-none disabled:opacity-80"
        >
          {opening ? (
            <>
              <Loader2 className="w-3.5 h-3.5 animate-spin" />
              <span>Opening...</span>
            </>
          ) : (
            <>
              <span>Open in Workspace</span>
              <ArrowRight className="w-3.5 h-3.5" />
            </>
          )}
        </button>
      </div>
    </div>
  );
}
