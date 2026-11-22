'use client';

import React from 'react';
import { Database, CheckCircle2, UploadCloud, DownloadCloud, Clock, HardDrive, Server } from 'lucide-react';
import type { ClinicNodeTelemetry } from '@/services/clinic-node.service';

interface ClinicTrackerCardProps {
  telemetry: ClinicNodeTelemetry;
}

function formatSyncTime(syncedAt?: string, time?: string, studyTime?: string): string {
  const ts = syncedAt || time;
  if (ts) {
    try {
      const d = new Date(ts);
      if (!isNaN(d.getTime())) {
        const diffSec = Math.floor((Date.now() - d.getTime()) / 1000);
        if (diffSec < 60) return 'Just now';
        if (diffSec < 3600) return `${Math.floor(diffSec / 60)}m ago`;
        if (diffSec < 86400) return `${Math.floor(diffSec / 3600)}h ago`;
        return `${d.toLocaleDateString(undefined, { month: 'short', day: 'numeric' })} ${d.toLocaleTimeString(undefined, { hour: '2-digit', minute: '2-digit', hour12: false })}`;
      }
    } catch {}
  }
  if (studyTime) {
    if (studyTime.length >= 4 && !studyTime.includes(':')) {
      return `${studyTime.slice(0, 2)}:${studyTime.slice(2, 4)}`;
    }
    return studyTime.slice(0, 8);
  }
  return 'Synced';
}

export function ClinicTrackerCard({ telemetry }: ClinicTrackerCardProps) {
  const target = telemetry.targetCases || 50;
  const current = telemetry.casesToday || 0;
  const percent = Math.min(100, Math.round((current / target) * 100));
  const activeDownload = telemetry.activeDownload;
  const downloadQueue = telemetry.downloadQueue || [];
  const activeUpload = telemetry.activeUpload;
  const uploadQueue = telemetry.uploadQueue || [];
  const summary = telemetry.inventorySummary;

  return (
    <div className="p-5 rounded-2xl border border-border/70 bg-card shadow-sm space-y-5">
      {/* Target Progress Bar */}
      <div className="space-y-2">
        <div className="flex items-center justify-between text-xs">
          <div className="flex items-center gap-2">
            <Database className="w-4 h-4 text-primary" />
            <span className="font-bold text-foreground">Live Two-Stage PACS &amp; Cloud Study Tracker</span>
          </div>
          <span className="font-mono font-bold text-sm text-foreground">
            {current} <span className="text-muted-foreground font-normal text-xs">/ {target} Daily Cases</span>
          </span>
        </div>

        <div className="w-full bg-muted/40 h-2.5 rounded-full overflow-hidden border border-border/40">
          <div
            className="bg-primary h-full rounded-full transition-all duration-500 ease-out"
            style={{ width: `${percent}%` }}
          />
        </div>

        <div className="flex justify-between text-[11px] text-muted-foreground font-mono">
          <span>{percent}% of daily quota synced</span>
          <span>{telemetry.instancesToday || 0} total slices mirrored</span>
        </div>
      </div>

      {/* Two-Stage Pipeline Inventory Summary Counters */}
      {summary && (
        <div className="grid grid-cols-5 gap-2 pt-1">
          <div className="p-2 rounded-xl border border-border/60 bg-surface-container/40 text-center">
            <div className="text-[10px] text-muted-foreground font-medium">Found on PACS</div>
            <div className="font-mono font-bold text-sm text-foreground">{summary.total || 0}</div>
          </div>
          <div className="p-2 rounded-xl border border-violet-500/25 bg-violet-500/5 text-center">
            <div className="text-[10px] text-violet-600 dark:text-violet-400 font-medium">PACS Queue</div>
            <div className="font-mono font-bold text-sm text-violet-600 dark:text-violet-400">
              {(summary.onPacs || 0) + (summary.downloading || 0)}
            </div>
          </div>
          <div className="p-2 rounded-xl border border-amber-500/25 bg-amber-500/5 text-center">
            <div className="text-[10px] text-amber-600 dark:text-amber-400 font-medium">In Sandbox</div>
            <div className="font-mono font-bold text-sm text-amber-600 dark:text-amber-400">
              {summary.inSandbox || 0}
            </div>
          </div>
          <div className="p-2 rounded-xl border border-sky-500/25 bg-sky-500/5 text-center">
            <div className="text-[10px] text-sky-600 dark:text-sky-400 font-medium">Uploading to Cloud</div>
            <div className="font-mono font-bold text-sm text-sky-600 dark:text-sky-400">
              {summary.uploading || 0}
            </div>
          </div>
          <div className="p-2 rounded-xl border border-emerald-500/25 bg-emerald-500/5 text-center">
            <div className="text-[10px] text-emerald-600 dark:text-emerald-400 font-medium">Cloud Synced</div>
            <div className="font-mono font-bold text-sm text-emerald-600 dark:text-emerald-400">
              {summary.synced || 0}
            </div>
          </div>
        </div>
      )}

      {/* Stage 1: Active In-Flight PACS -> Medical Sandbox Download */}
      {activeDownload ? (
        <div className="p-3.5 rounded-xl border border-violet-500/30 bg-violet-500/5 space-y-2.5 animate-in fade-in duration-300">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <span className="relative flex h-2.5 w-2.5">
                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-violet-400 opacity-75" />
                <span className="relative inline-flex rounded-full h-2.5 w-2.5 bg-violet-500" />
              </span>
              <span className="font-bold text-xs text-violet-600 dark:text-violet-400 flex items-center gap-1.5">
                <DownloadCloud className="w-3.5 h-3.5" />
                Stage 1 — Downloading from PACS to Medical Sandbox: {activeDownload.accession}
              </span>
            </div>
            <span className="font-mono text-xs font-bold text-violet-600 dark:text-violet-400">
              {activeDownload.progressPercent}%
            </span>
          </div>

          <div className="flex items-center justify-between text-[11px] text-muted-foreground">
            <div className="truncate">
              <span className="font-bold text-foreground">{activeDownload.patientName}</span>
              <span className="mx-1.5">•</span>
              <span className="font-semibold text-primary">{activeDownload.modality}</span>
              {activeDownload.studyDescription && (
                <>
                  <span className="mx-1.5">•</span>
                  <span>{activeDownload.studyDescription}</span>
                </>
              )}
            </div>
            <span className="font-mono shrink-0 ml-2">
              {activeDownload.downloadedSlices} / {activeDownload.totalSlices} slices
            </span>
          </div>

          <div className="w-full bg-violet-950/20 dark:bg-violet-950/40 h-2 rounded-full overflow-hidden border border-violet-500/20">
            <div
              className="bg-violet-500 h-full rounded-full transition-all duration-300 ease-out"
              style={{ width: `${activeDownload.progressPercent}%` }}
            />
          </div>
        </div>
      ) : null}

      {/* Pending PACS Download Queue */}
      {downloadQueue.length > 0 && (
        <div className="space-y-2 p-3 rounded-xl border border-violet-500/20 bg-violet-500/5">
          <div className="flex items-center justify-between text-xs font-medium text-violet-700 dark:text-violet-400">
            <div className="flex items-center gap-1.5">
              <Server className="w-3.5 h-3.5" />
              <span>Pending PACS &rarr; Sandbox Download Queue</span>
            </div>
            <span className="font-mono text-[11px] font-bold px-2 py-0.5 rounded-full bg-violet-500/10 border border-violet-500/20">
              {downloadQueue.length} Queued
            </span>
          </div>
          <div className="divide-y divide-violet-500/10 text-[11px] max-h-28 overflow-y-auto">
            {downloadQueue.map((item: any, idx: number) => (
              <div key={`${item.accession}-${idx}`} className="py-1.5 flex items-center justify-between">
                <div>
                  <span className="font-mono font-bold">{item.accession}</span>
                  <span className="mx-1 text-muted-foreground">•</span>
                  <span>{item.patientName}</span>
                  <span className="mx-1 text-muted-foreground">•</span>
                  <span className="font-semibold text-primary">{item.modality}</span>
                </div>
                <span className="text-[10px] text-muted-foreground font-mono">
                  {item.totalSlices} slices
                </span>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Stage 2: Active In-Flight Sandbox -> S3 Upload Status */}
      {activeUpload ? (
        <div className="p-3.5 rounded-xl border border-sky-500/30 bg-sky-500/5 space-y-2.5 animate-in fade-in duration-300">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <span className="relative flex h-2.5 w-2.5">
                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-sky-400 opacity-75" />
                <span className="relative inline-flex rounded-full h-2.5 w-2.5 bg-sky-500" />
              </span>
              <span className="font-bold text-xs text-sky-600 dark:text-sky-400 flex items-center gap-1.5">
                <UploadCloud className="w-3.5 h-3.5" />
                Stage 2 — Uploading Sandbox to Cloud VPS: {activeUpload.accession}
              </span>
            </div>
            <span className="font-mono text-xs font-bold text-sky-600 dark:text-sky-400">
              {activeUpload.progressPercent}%
            </span>
          </div>

          <div className="flex items-center justify-between text-[11px] text-muted-foreground">
            <div className="truncate">
              <span className="font-bold text-foreground">{activeUpload.patientName}</span>
              <span className="mx-1.5">•</span>
              <span className="font-semibold text-primary">{activeUpload.modality}</span>
              {activeUpload.seriesDescription && (
                <>
                  <span className="mx-1.5">•</span>
                  <span>{activeUpload.seriesDescription}</span>
                </>
              )}
            </div>
            <span className="font-mono shrink-0 ml-2">
              {activeUpload.completedSlices} / {activeUpload.totalSlices} slices
            </span>
          </div>

          <div className="w-full bg-sky-950/20 dark:bg-sky-950/40 h-2 rounded-full overflow-hidden border border-sky-500/20">
            <div
              className="bg-sky-500 h-full rounded-full transition-all duration-300 ease-out"
              style={{ width: `${activeUpload.progressPercent}%` }}
            />
          </div>
        </div>
      ) : null}

      {/* Pending Upload Queue */}
      {uploadQueue.length > 0 && (
        <div className="space-y-2 p-3 rounded-xl border border-amber-500/20 bg-amber-500/5">
          <div className="flex items-center justify-between text-xs font-medium text-amber-700 dark:text-amber-400">
            <div className="flex items-center gap-1.5">
              <Clock className="w-3.5 h-3.5" />
              <span>Pending Sandbox &rarr; Cloud Upload Queue</span>
            </div>
            <span className="font-mono text-[11px] font-bold px-2 py-0.5 rounded-full bg-amber-500/10 border border-amber-500/20">
              {uploadQueue.length} Waiting
            </span>
          </div>
          <div className="divide-y divide-amber-500/10 text-[11px] max-h-28 overflow-y-auto">
            {uploadQueue.map((item: any, idx: number) => (
              <div key={`${item.accession}-${idx}`} className="py-1.5 flex items-center justify-between">
                <div>
                  <span className="font-mono font-bold">{item.accession}</span>
                  <span className="mx-1 text-muted-foreground">•</span>
                  <span>{item.patientName}</span>
                  <span className="mx-1 text-muted-foreground">•</span>
                  <span className="font-semibold text-primary">{item.modality}</span>
                </div>
                <span className="text-[10px] text-muted-foreground font-mono">
                  {item.totalSlices} slices
                </span>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Case Sync Stream Table */}
      <div className="space-y-2 pt-2 border-t border-border/50">
        <span className="text-[10px] uppercase font-bold text-muted-foreground tracking-wider block">
          Recent Intercepted Cases (Auto-Mirrored to Cloud)
        </span>

        {telemetry.syncedStudies && telemetry.syncedStudies.length > 0 ? (
          <div className="overflow-x-auto max-h-48 border border-border/50 rounded-xl">
            <table className="w-full text-left text-[11px]">
              <thead className="bg-muted/50 text-muted-foreground font-mono uppercase text-[9px] border-b border-border/40">
                <tr>
                  <th className="py-1.5 px-3">Patient / ID</th>
                  <th className="py-1.5 px-3">Accession / Mod</th>
                  <th className="py-1.5 px-3">Time</th>
                  <th className="py-1.5 px-3 text-right">Cloud Pipeline</th>
                </tr>
              </thead>
              <tbody className="divide-y border-border/30">
                {telemetry.syncedStudies.map((study: any, idx: number) => (
                  <tr key={`${study.id}-${idx}`} className="hover:bg-muted/20">
                    <td className="py-1.5 px-3">
                      <div className="font-bold text-foreground">{study.patientName}</div>
                      <div className="text-[10px] text-muted-foreground font-mono">{study.patientId}</div>
                    </td>
                    <td className="py-1.5 px-3 font-mono">
                      <div>{study.accession}</div>
                      <span className="text-[10px] font-bold text-primary">{study.modality}</span>
                    </td>
                    <td className="py-1.5 px-3 text-muted-foreground font-mono text-[10px]">
                      {formatSyncTime(study.syncedAt, study.time, study.studyTime)}
                    </td>
                    <td className="py-1.5 px-3 text-right">
                      <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-medium bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border border-emerald-500/20">
                        <CheckCircle2 className="w-3 h-3" />
                        <span>Synced to Cloud</span>
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ) : (
          <div className="py-6 text-center text-xs text-muted-foreground bg-muted/20 rounded-xl border border-dashed border-border/60">
            No incoming DICOM studies intercepted yet today.
          </div>
        )}
      </div>
    </div>
  );
}
