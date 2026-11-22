'use client';

import React from 'react';
import {
  HardDrive,
  Cloud,
  Server,
  DownloadCloud,
  UploadCloud,
  Trash2,
  ExternalLink,
  RefreshCw,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { getModalityColor } from '@/lib/utils';

export interface LiveStudyItem {
  id: string;
  patientName: string;
  patientId: string;
  accessionNumber: string;
  studyDate: string;
  studyTime?: string | null;
  modality: string;
  studyDescription: string;
  numInstances: number;
  numSeries?: number;
  s3Status: string;
  studyInstanceUid: string;
  location?: 's3' | 'sandbox' | 'pacs';
  hasLocalSeries?: boolean;
}

interface ClinicLivePatientTableProps {
  studies: LiveStudyItem[];
  loading: boolean;
  pullingAcc: string | null;
  uploadingAcc: string | null;
  purgingAcc: string | null;
  onPull: (study: LiveStudyItem) => void;
  onUpload: (study: LiveStudyItem) => void;
  onPurge: (accession: string) => void;
}

export function ClinicLivePatientTable({
  studies,
  loading,
  pullingAcc,
  uploadingAcc,
  purgingAcc,
  onPull,
  onUpload,
  onPurge,
}: ClinicLivePatientTableProps) {
  const renderTierBadge = (st: LiveStudyItem) => {
    const isS3 = st.s3Status === 'synced' || st.location === 's3';
    const isSandbox = st.location === 'sandbox' || Boolean(st.hasLocalSeries);

    if (isS3) {
      return (
        <span className="inline-flex items-center gap-1 text-[10px] font-bold text-emerald-600 dark:text-emerald-400 bg-emerald-500/10 px-2 py-0.5 rounded border border-emerald-500/25">
          <Cloud className="w-3 h-3" />
          <span>Tier 2 (Cloud)</span>
        </span>
      );
    }
    if (isSandbox) {
      return (
        <span className="inline-flex items-center gap-1 text-[10px] font-bold text-amber-600 dark:text-amber-400 bg-amber-500/10 px-2 py-0.5 rounded border border-amber-500/25">
          <HardDrive className="w-3 h-3" />
          <span>Tier 1 (Disk)</span>
        </span>
      );
    }
    return (
      <span className="inline-flex items-center gap-1 text-[10px] font-medium text-violet-600 dark:text-violet-400 bg-violet-500/10 px-2 py-0.5 rounded border border-violet-500/25">
        <Server className="w-3 h-3" />
        <span>PACS LAN</span>
      </span>
    );
  };

  return (
    <div className="border border-border/60 rounded-xl overflow-hidden max-h-[460px] overflow-y-auto">
      <table className="w-full text-left text-xs">
        <thead className="bg-surface-container/70 border-b border-border text-[11px] font-semibold text-muted-foreground sticky top-0 backdrop-blur-xs">
          <tr>
            <th className="py-2.5 px-3">Patient</th>
            <th className="py-2.5 px-3">Modality</th>
            <th className="py-2.5 px-3">Description</th>
            <th className="py-2.5 px-3">Accession</th>
            <th className="py-2.5 px-3">Date / Slices</th>
            <th className="py-2.5 px-3">Storage Stage</th>
            <th className="py-2.5 px-3 text-right">Diagnostic Actions</th>
          </tr>
        </thead>
        <tbody className="divide-y divide-border/40">
          {loading && studies.length === 0 ? (
            <tr>
              <td colSpan={7} className="py-10 text-center text-muted-foreground">
                <RefreshCw className="w-5 h-5 animate-spin mx-auto mb-2 text-primary" />
                Querying patients from Clinic PC and PACS index...
              </td>
            </tr>
          ) : studies.length === 0 ? (
            <tr>
              <td colSpan={7} className="py-10 text-center text-muted-foreground">
                No studies found matching the selected filter criteria.
              </td>
            </tr>
          ) : (
            studies.map((st) => {
              const isPulling = pullingAcc === st.accessionNumber;
              const isUploading = uploadingAcc === st.accessionNumber;
              const isPurging = purgingAcc === st.accessionNumber;
              const isSynced = st.s3Status === 'synced' || st.location === 's3';
              const isLocal = st.location === 'sandbox' || Boolean(st.hasLocalSeries);

              return (
                <tr key={`${st.id}_${st.accessionNumber}`} className="hover:bg-surface-container/30 transition-colors">
                  <td className="py-2.5 px-3 font-semibold text-foreground">
                    <div className="truncate max-w-[130px]" title={st.patientName}>
                      {st.patientName}
                    </div>
                    <div className="text-[10px] text-muted-foreground font-mono">{st.patientId || '—'}</div>
                  </td>
                  <td className="py-2.5 px-3">
                    <span className={`inline-block px-1.5 py-0.5 rounded text-[10px] font-bold font-mono ${getModalityColor(st.modality)}`}>
                      {st.modality}
                    </span>
                  </td>
                  <td className="py-2.5 px-3 text-muted-foreground">
                    <div className="truncate max-w-[160px]" title={st.studyDescription}>
                      {st.studyDescription || '—'}
                    </div>
                  </td>
                  <td className="py-2.5 px-3 font-mono text-[11px] text-foreground">
                    {st.accessionNumber}
                  </td>
                  <td className="py-2.5 px-3 text-[11px]">
                    <div className="text-foreground font-medium">{st.studyDate || '—'}</div>
                    <div className="text-[10px] text-muted-foreground font-mono">
                      {st.numInstances || 0} Slices • {st.numSeries || 1} Ser
                    </div>
                  </td>
                  <td className="py-2.5 px-3">
                    {renderTierBadge(st)}
                  </td>
                  <td className="py-2.5 px-3 text-right">
                    <div className="flex items-center justify-end gap-1.5 flex-wrap">
                      {!isLocal && (
                        <Button
                          size="sm"
                          variant="outline"
                          disabled={isPulling}
                          onClick={() => onPull(st)}
                          className="h-6 px-2 text-[11px] gap-1 text-primary border-primary/40 hover:bg-primary/10 cursor-pointer"
                          title="Pull study from Hospital PACS to Clinic PC sandbox"
                        >
                          <DownloadCloud className={`w-3 h-3 ${isPulling ? 'animate-bounce' : ''}`} />
                          <span>{isPulling ? 'Pulling...' : 'Pull'}</span>
                        </Button>
                      )}

                      {isLocal && !isSynced && (
                        <Button
                          size="sm"
                          variant="outline"
                          disabled={isUploading}
                          onClick={() => onUpload(st)}
                          className="h-6 px-2 text-[11px] gap-1 text-emerald-600 dark:text-emerald-400 border-emerald-500/40 hover:bg-emerald-500/10 cursor-pointer"
                          title="Upload series from Clinic PC to Rad Suite Cloud VPS"
                        >
                          <UploadCloud className={`w-3 h-3 ${isUploading ? 'animate-bounce' : ''}`} />
                          <span>{isUploading ? 'Syncing...' : 'Upload to Cloud'}</span>
                        </Button>
                      )}

                      {isLocal && (
                        <Button
                          size="sm"
                          variant="ghost"
                          disabled={isPurging}
                          onClick={() => onPurge(st.accessionNumber)}
                          className="h-6 px-1.5 text-[11px] text-rose-500 hover:bg-rose-500/10 cursor-pointer"
                          title="Purge local disk files"
                        >
                          <Trash2 className="w-3 h-3" />
                        </Button>
                      )}

                      <a
                        href={`/pacs?search=${encodeURIComponent(st.accessionNumber)}`}
                        className="inline-flex items-center gap-1 h-6 px-2 text-[11px] font-medium rounded-md border border-border/80 text-foreground hover:bg-surface-container-high transition-colors"
                        title="View in RadiAnt-style Pure PACS Viewer"
                      >
                        <ExternalLink className="w-3 h-3" />
                        <span>Viewer</span>
                      </a>
                    </div>
                  </td>
                </tr>
              );
            })
          )}
        </tbody>
      </table>
    </div>
  );
}
