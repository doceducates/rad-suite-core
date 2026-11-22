'use client';

import React, { useState } from 'react';
import {
  HardDrive,
  Trash2,
  Check,
  AlertCircle,
  Search,
  RefreshCw,
  DownloadCloud,
  UploadCloud,
  Server,
  CloudUpload,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { getModalityColor } from '@/lib/utils';
import type { LocalResidentStudy } from '@/services/clinic-node.service';

interface ClinicResidentStudiesCardProps {
  studies: LocalResidentStudy[];
  onPurgeStudy: (accession: string) => Promise<void>;
  onUploadStudy?: (accession: string) => Promise<void>;
  onPullStudy?: (accession: string) => Promise<void>;
  onSyncAll?: () => Promise<void>;
  onRefresh?: () => void;
  loading?: boolean;
}

export function ClinicResidentStudiesCard({
  studies = [],
  onPurgeStudy,
  onUploadStudy,
  onPullStudy,
  onSyncAll,
  onRefresh,
  loading = false,
}: ClinicResidentStudiesCardProps) {
  const [search, setSearch] = useState('');
  const [pullAcc, setPullAcc] = useState('');
  const [purgingAcc, setPurgingAcc] = useState<string | null>(null);
  const [uploadingAcc, setUploadingAcc] = useState<string | null>(null);
  const [isPulling, setIsPulling] = useState(false);
  const [isSyncingAll, setIsSyncingAll] = useState(false);

  const filtered = studies.filter((st) => {
    if (!search.trim()) return true;
    const q = search.toLowerCase();
    return (
      (st.accession || '').toLowerCase().includes(q) ||
      (st.patientName || '').toLowerCase().includes(q) ||
      (st.patientId || '').toLowerCase().includes(q) ||
      (st.studyDescription || '').toLowerCase().includes(q)
    );
  });

  const unsyncedCount = studies.filter((s) => !s.isSyncedToS3 && s.state !== 'synced').length;
  const totalSizeMb = studies.reduce((acc, st) => acc + (st.sizeMb || 0), 0);

  const handlePurge = async (accession: string) => {
    setPurgingAcc(accession);
    try {
      await onPurgeStudy(accession);
    } finally {
      setPurgingAcc(null);
    }
  };

  const handleUpload = async (accession: string) => {
    if (!onUploadStudy) return;
    setUploadingAcc(accession);
    try {
      await onUploadStudy(accession);
    } finally {
      setUploadingAcc(null);
    }
  };

  const handlePull = async (e: React.FormEvent) => {
    e.preventDefault();
    const clean = pullAcc.trim();
    if (!clean || !onPullStudy) return;
    setIsPulling(true);
    try {
      await onPullStudy(clean);
      setPullAcc('');
    } finally {
      setIsPulling(false);
    }
  };

  const handleSyncAllClick = async () => {
    if (!onSyncAll) return;
    setIsSyncingAll(true);
    try {
      await onSyncAll();
    } finally {
      setIsSyncingAll(false);
    }
  };

  const renderPipelineBadge = (st: LocalResidentStudy) => {
    const state = st.state || (st.isSyncedToS3 ? 'synced' : 'in_sandbox');
    const total = st.totalPacsSlices || st.sliceCount || 0;
    const dl = st.downloadedSlices ?? st.sliceCount ?? 0;
    const ul = st.uploadedSlices ?? (st.isSyncedToS3 ? total : 0);

    if (state === 'synced' || st.isSyncedToS3) {
      return (
        <span className="inline-flex items-center gap-1 text-[10px] font-bold text-emerald-600 dark:text-emerald-400">
          <Check className="w-3 h-3" />
          <span>Synced ({total})</span>
        </span>
      );
    }
    if (state === 'uploading') {
      return (
        <span className="inline-flex items-center gap-1 text-[10px] font-bold text-sky-600 dark:text-sky-400">
          <UploadCloud className="w-3 h-3 animate-pulse" />
          <span>Uploading ({ul}/{total})</span>
        </span>
      );
    }
    if (state === 'downloading') {
      return (
        <span className="inline-flex items-center gap-1 text-[10px] font-bold text-violet-600 dark:text-violet-400">
          <DownloadCloud className="w-3 h-3 animate-bounce" />
          <span>Downloading ({dl}/{total})</span>
        </span>
      );
    }
    if (state === 'on_pacs') {
      return (
        <span className="inline-flex items-center gap-1 text-[10px] font-medium text-violet-600 dark:text-violet-400">
          <Server className="w-3 h-3" />
          <span>On PACS ({total})</span>
        </span>
      );
    }
    return (
      <span className="inline-flex items-center gap-1 text-[10px] font-medium text-amber-600 dark:text-amber-400">
        <AlertCircle className="w-3 h-3" />
        <span>In Sandbox ({dl})</span>
      </span>
    );
  };

  return (
    <div className="p-5 rounded-2xl border border-border/70 bg-card shadow-sm space-y-4 text-xs font-sans">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
        <div className="flex items-center gap-2">
          <HardDrive className="w-4 h-4 text-primary" />
          <div>
            <h3 className="font-bold text-sm text-foreground">Clinic PC Local Catalog &amp; Sandbox Explorer</h3>
            <p className="text-[11px] text-muted-foreground">
              Cases discovered on Hospital PACS &amp; cached in <span className="font-mono text-foreground font-semibold">C:\MedicalSandbox\OrthancStorage</span>
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2 flex-wrap">
          {unsyncedCount > 0 && onSyncAll && (
            <Button
              size="sm"
              onClick={handleSyncAllClick}
              disabled={isSyncingAll || loading}
              className="h-7 px-2.5 text-xs bg-emerald-600 hover:bg-emerald-700 text-white gap-1 cursor-pointer"
              title="Upload all resident sandbox studies to Cloud S3"
            >
              <UploadCloud className={`w-3.5 h-3.5 ${isSyncingAll ? 'animate-bounce' : ''}`} />
              <span>{isSyncingAll ? 'Syncing...' : `Upload ${unsyncedCount} to S3`}</span>
            </Button>
          )}

          <span className="px-2 py-0.5 rounded text-[10px] font-mono font-bold bg-primary/10 text-primary border border-primary/20">
            {studies.length} Studies ({Math.round(totalSizeMb)} MB)
          </span>

          {onRefresh && (
            <Button
              size="sm"
              variant="outline"
              onClick={onRefresh}
              disabled={loading}
              className="h-7 px-2 text-xs cursor-pointer"
              title="Refresh local storage list"
            >
              <RefreshCw className={`w-3 h-3 ${loading ? 'animate-spin' : ''}`} />
            </Button>
          )}
        </div>
      </div>

      {/* On-Demand PACS Pull & Quick Filter Toolbar */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-2.5 pt-1">
        {/* Pull Study from Hospital PACS */}
        {onPullStudy && (
          <form onSubmit={handlePull} className="flex items-center gap-2">
            <input
              type="text"
              value={pullAcc}
              onChange={(e) => setPullAcc(e.target.value)}
              placeholder="Pull accession from Hospital PACS (e.g. 2609012345)..."
              className="flex-1 px-3 py-1.5 rounded-lg border border-border bg-background text-foreground text-xs font-mono focus:ring-1 focus:ring-primary focus:outline-none placeholder:text-muted-foreground"
            />
            <Button
              type="submit"
              size="sm"
              disabled={isPulling || loading || !pullAcc.trim()}
              className="h-8 gap-1.5 text-xs bg-primary text-primary-foreground hover:bg-primary/90 shrink-0 cursor-pointer"
            >
              <DownloadCloud className={`w-3.5 h-3.5 ${isPulling ? 'animate-bounce' : ''}`} />
              <span>{isPulling ? 'Pulling...' : 'Pull to Sandbox'}</span>
            </Button>
          </form>
        )}

        {/* Quick Filter */}
        <div className="relative">
          <Search className="w-3.5 h-3.5 absolute left-2.5 top-2.5 text-muted-foreground" />
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Filter cataloged studies by patient, MRN, accession..."
            className="w-full pl-8 pr-3 py-1.5 rounded-lg border border-border bg-background text-foreground text-xs focus:ring-1 focus:ring-primary focus:outline-none placeholder:text-muted-foreground"
          />
        </div>
      </div>

      {/* Table of Resident Studies */}
      <div className="border border-border/60 rounded-xl overflow-hidden max-h-80 overflow-y-auto">
        <table className="w-full text-left text-xs">
          <thead className="bg-surface-container/60 border-b border-border text-[11px] font-semibold text-muted-foreground sticky top-0 backdrop-blur-xs">
            <tr>
              <th className="py-2 px-3">Patient</th>
              <th className="py-2 px-3">Modality</th>
              <th className="py-2 px-3">Description</th>
              <th className="py-2 px-3">Accession</th>
              <th className="py-2 px-3">Disk Size</th>
              <th className="py-2 px-3">Two-Stage Status</th>
              <th className="py-2 px-3 text-right">Actions</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-border/40">
            {filtered.length === 0 ? (
              <tr>
                <td colSpan={7} className="py-8 text-center text-muted-foreground">
                  {studies.length === 0
                    ? 'No studies currently cataloged on Clinic PC.'
                    : 'No studies match your filter.'}
                </td>
              </tr>
            ) : (
              filtered.map((st) => {
                const isPurging = purgingAcc === st.accession;
                const isUploading = uploadingAcc === st.accession;
                const isSynced = Boolean(st.isSyncedToS3) || st.state === 'synced';

                return (
                  <tr key={`${st.studyId || st.accession}_${st.modality}`} className="hover:bg-surface-container/30 transition-colors">
                    <td className="py-2 px-3 font-semibold text-foreground">
                      <div className="truncate max-w-[130px]" title={st.patientName}>
                        {st.patientName}
                      </div>
                      <div className="text-[10px] text-muted-foreground font-mono">{st.patientId || '—'}</div>
                    </td>
                    <td className="py-2 px-3">
                      <span className={`inline-block px-1.5 py-0.2 rounded text-[10px] font-bold font-mono ${getModalityColor(st.modality)}`}>
                        {st.modality}
                      </span>
                    </td>
                    <td className="py-2 px-3 text-muted-foreground">
                      <div className="truncate max-w-[160px]" title={st.studyDescription}>
                        {st.studyDescription || '—'}
                      </div>
                    </td>
                    <td className="py-2 px-3 font-mono text-[11px] text-foreground">
                      {st.accession}
                    </td>
                    <td className="py-2 px-3 font-mono text-[11px] text-foreground">
                      {st.sizeMb} MB
                    </td>
                    <td className="py-2 px-3">
                      {renderPipelineBadge(st)}
                    </td>
                    <td className="py-2 px-3 text-right">
                      <div className="flex items-center justify-end gap-1.5">
                        {!isSynced && onUploadStudy && (
                          <Button
                            size="sm"
                            variant="outline"
                            disabled={isUploading || st.state === 'uploading'}
                            onClick={() => handleUpload(st.accession)}
                            className="h-6 px-2 text-[11px] border-emerald-500/40 text-emerald-600 dark:text-emerald-400 hover:bg-emerald-500/10 gap-1 cursor-pointer"
                            title="Upload study slices from Clinic PC to Cloud S3"
                          >
                            <CloudUpload className={`w-3 h-3 ${isUploading ? 'animate-bounce' : ''}`} />
                            <span>{isUploading ? 'Uploading...' : 'Upload to S3'}</span>
                          </Button>
                        )}

                        <Button
                          size="sm"
                          variant="ghost"
                          disabled={isPurging || st.state === 'on_pacs'}
                          onClick={() => handlePurge(st.accession)}
                          className="h-6 px-2 text-[11px] text-rose-600 hover:bg-rose-500/10 hover:text-rose-700 gap-1 cursor-pointer"
                          title="Delete local slices from Clinic PC hard drive"
                        >
                          <Trash2 className="w-3 h-3" />
                          <span>{isPurging ? 'Purging...' : 'Purge'}</span>
                        </Button>
                      </div>
                    </td>
                  </tr>
                );
              })
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
