'use client';

// Layer 4 (Presentation): Sandboxed Consultant Clinical Review Portal (<240 lines)
import React, { useState, useEffect } from 'react';
import { ShieldCheck, Clock, Eye, AlertCircle, Loader2, Maximize2, SplitSquareVertical } from 'lucide-react';
import { ZenDicomViewer } from '@/components/workstation/zen-dicom-viewer';
import { ConsultantReportPane } from './consultant-report-pane';
import { Badge } from '@/components/ui/badge';

interface ConsultantReviewPortalProps {
  token: string;
  initialProof?: string;
}

export function ConsultantReviewPortal({ token, initialProof }: ConsultantReviewPortalProps) {
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [data, setData] = useState<any | null>(null);

  const [activeSeriesIndex, setActiveSeriesIndex] = useState(0);
  const [viewMode, setViewMode] = useState<'split' | 'viewer-only'>('split');

  useEffect(() => {
    let mounted = true;
    async function loadSharedCase() {
      setLoading(true);
      setError(null);
      try {
        const headers: Record<string, string> = {};
        if (initialProof) {
          headers['Authorization'] = `Bearer ${initialProof}`;
        }
        const res = await fetch(`/api/shares/${encodeURIComponent(token)}/data`, { headers });
        const json = await res.json();
        if (!res.ok) {
          throw new Error(json.error || 'Failed to load case');
        }
        if (mounted) {
          setData(json);
        }
      } catch (err: any) {
        if (mounted) setError(err?.message || 'Access error');
      } finally {
        if (mounted) setLoading(false);
      }
    }
    loadSharedCase();
    return () => {
      mounted = false;
    };
  }, [token, initialProof]);

  if (loading) {
    return (
      <div className="min-h-screen w-full bg-surface text-on-surface flex flex-col items-center justify-center p-6 gap-3">
        <Loader2 className="w-8 h-8 text-primary animate-spin" />
        <p className="text-xs text-secondary font-medium tracking-wide">
          Decrypting &amp; loading shared diagnostic case...
        </p>
      </div>
    );
  }

  if (error || !data) {
    return (
      <div className="min-h-screen w-full bg-surface text-on-surface flex flex-col items-center justify-center p-6 text-center">
        <div className="p-3 rounded-2xl bg-rose-500/10 text-rose-600 dark:text-rose-400 mb-3">
          <AlertCircle className="w-8 h-8" />
        </div>
        <h2 className="text-lg font-bold mb-1">Access Restricted or Expired</h2>
        <p className="text-xs text-secondary max-w-sm mb-4">
          {error || 'The requested consultant share link could not be loaded.'}
        </p>
      </div>
    );
  }

  const { study, patient, report, series, share } = data;
  const hoursLeft = Math.max(0, Math.round((new Date(share.expiresAt).getTime() - Date.now()) / (3600 * 1000)));

  return (
    <div className="fixed inset-0 w-screen h-screen bg-surface text-on-surface flex flex-col overflow-hidden select-none">
      {/* 1. Supervisory Top Banner (Watermark & Sandbox Guard) */}
      <header className="h-12 px-4 bg-surface-container/95 backdrop-blur-md border-b border-outline-variant/60 flex items-center justify-between gap-3 shrink-0 z-30">
        <div className="flex items-center gap-2.5 min-w-0">
          <div className="flex items-center gap-1.5 px-2 py-1 rounded-md bg-emerald-500/15 text-emerald-700 dark:text-emerald-300 border border-emerald-500/30 text-[11px] font-bold shrink-0">
            <ShieldCheck className="w-3.5 h-3.5" />
            <span>Supervisory Review Mode</span>
          </div>

          <div className="hidden sm:flex items-center gap-2 text-xs truncate">
            <span className="font-bold text-on-surface truncate">{patient.fullName}</span>
            <span className="font-mono text-secondary text-[11px]">({study.accessionNumber})</span>
            <span className="font-semibold text-primary text-[11px]">[{study.modality}]</span>
          </div>
        </div>

        <div className="flex items-center gap-2 shrink-0">
          <div className="hidden md:flex items-center gap-1.5 text-secondary text-[11px]">
            <Clock className="w-3 h-3 text-primary" />
            <span>Access expires in <strong>{hoursLeft}h</strong></span>
          </div>

          <Badge variant="outline" className="text-[10px] font-mono py-0 hidden lg:inline-flex">
            View #{share.viewCount}
          </Badge>

          {/* Toggle between Split and Full-screen DICOM Viewer */}
          <button
            type="button"
            onClick={() => setViewMode((m) => (m === 'split' ? 'viewer-only' : 'split'))}
            className="h-7 px-2.5 rounded-lg border border-outline-variant/60 bg-surface-container-high text-secondary hover:text-on-surface text-xs font-medium flex items-center gap-1.5 cursor-pointer transition-colors"
            title="Toggle between split view and full-width DICOM viewer"
          >
            {viewMode === 'split' ? (
              <>
                <Maximize2 className="w-3.5 h-3.5" />
                <span className="hidden sm:inline text-[11px]">Maximize Viewer</span>
              </>
            ) : (
              <>
                <SplitSquareVertical className="w-3.5 h-3.5" />
                <span className="hidden sm:inline text-[11px]">Show Report</span>
              </>
            )}
          </button>
        </div>
      </header>

      {/* 2. Main Stage */}
      <main className="flex-1 min-h-0 flex flex-col md:flex-row overflow-hidden">
        {/* Left: High-speed DICOM Canvas Viewer */}
        <div className={`flex-1 min-w-0 min-h-0 flex flex-col bg-black relative ${viewMode === 'viewer-only' ? 'w-full' : ''}`}>
          {/* Series Navigation Bar if multiple series */}
          {series && series.length > 1 && (
            <div className="h-8 bg-surface-container border-b border-outline-variant/40 px-3 flex items-center gap-1.5 overflow-x-auto shrink-0 no-scrollbar">
              {series.map((s: any, idx: number) => (
                <button
                  key={`consultant-series-${s.seriesInstanceUid || s.seriesNumber || 'series'}-${idx}`}
                  type="button"
                  onClick={() => setActiveSeriesIndex(idx)}
                  className={`px-2.5 py-0.5 rounded text-[11px] font-semibold whitespace-nowrap transition-colors cursor-pointer ${
                    activeSeriesIndex === idx
                      ? 'bg-primary text-primary-foreground shadow-2xs'
                      : 'text-secondary hover:text-on-surface hover:bg-surface-container-high'
                  }`}
                >
                  {s.seriesDescription || `Series ${s.seriesNumber}`} ({s.sliceCount}sl)
                </button>
              ))}
            </div>
          )}

          <div className="flex-1 min-h-0 relative">
            <ZenDicomViewer
              accessionNumber={study.accessionNumber}
              modality={study.modality}
              isLocalCase={true}
              localCaseId={`share:${token}`}
              localSeries={series}
              activeSeriesIndex={activeSeriesIndex}
              source={data.source || 'local'}
            />
          </div>
        </div>

        {/* Right: Official Drafted Report Pane */}
        {viewMode === 'split' && (
          <div className="w-full md:w-[480px] lg:w-[540px] h-[45vh] md:h-full shrink-0 flex flex-col">
            <ConsultantReportPane
              study={study}
              patient={patient}
              report={report}
            />
          </div>
        )}
      </main>
    </div>
  );
}
