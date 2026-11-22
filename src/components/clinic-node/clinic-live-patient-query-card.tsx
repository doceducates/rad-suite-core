'use client';

import React, { useState, useEffect, useCallback } from 'react';
import { Search, RefreshCw, UploadCloud, Layers } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { notify } from '@/services/notification.service';
import type { LocalResidentStudy, ClinicActionType } from '@/services/clinic-node.service';
import { ClinicLivePatientTable, type LiveStudyItem } from './clinic-live-patient-table';

interface ClinicLivePatientQueryCardProps {
  localStudies?: LocalResidentStudy[];
  onAction?: (action: ClinicActionType, payload?: any) => Promise<void>;
  onRefreshNode?: () => void;
  loadingNode?: boolean;
}

export function ClinicLivePatientQueryCard({
  localStudies = [],
  onAction,
  onRefreshNode,
  loadingNode = false,
}: ClinicLivePatientQueryCardProps) {
  const [studies, setStudies] = useState<LiveStudyItem[]>([]);
  const [totalCount, setTotalCount] = useState(0);
  const [search, setSearch] = useState('');
  const [modality, setModality] = useState('ALL');
  const [datePreset, setDatePreset] = useState<'today' | 'yesterday' | '48h' | '7d' | 'all'>('today');
  const [locationFilter, setLocationFilter] = useState<'all' | 'sandbox' | 's3' | 'pacs'>('all');
  const [loading, setLoading] = useState(false);
  const [pullingAcc, setPullingAcc] = useState<string | null>(null);
  const [uploadingAcc, setUploadingAcc] = useState<string | null>(null);
  const [purgingAcc, setPurgingAcc] = useState<string | null>(null);
  const [syncingAll, setSyncingAll] = useState(false);

  const fetchLivePatients = useCallback(async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams();
      if (search.trim()) params.set('search', search.trim());
      if (modality !== 'ALL') params.set('modality', modality);
      if (datePreset !== 'all') params.set('datePreset', datePreset);
      if (locationFilter !== 'all') params.set('location', locationFilter);
      params.set('limit', '50');

      const res = await fetch(`/api/pacs/hospital-query?${params.toString()}`);
      if (res.ok) {
        const data = await res.json();
        if (Array.isArray(data.studies)) {
          setStudies(data.studies);
          setTotalCount(data.total ?? data.studies.length);
        }
      }
    } catch {
      notify.error('Failed querying patients from clinic index');
    } finally {
      setLoading(false);
    }
  }, [search, modality, datePreset, locationFilter]);

  useEffect(() => {
    fetchLivePatients();
  }, [fetchLivePatients]);

  const handlePullToSandbox = async (study: LiveStudyItem) => {
    setPullingAcc(study.accessionNumber);
    try {
      const res = await fetch('/api/pacs/hospital-query', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ accession: study.accessionNumber, modality: study.modality || 'MR' }),
      });
      const data = await res.json();
      if (data.success) {
        notify.success(`C-GET pull triggered on Clinic PC for ${study.accessionNumber}.`);
        if (onRefreshNode) onRefreshNode();
        await fetchLivePatients();
      } else {
        throw new Error(data.error || 'Failed pulling study from PACS');
      }
    } catch (err: any) {
      notify.error(err.message || 'Error pulling study from PACS');
    } finally {
      setPullingAcc(null);
    }
  };

  const handleUploadToS3 = async (study: LiveStudyItem) => {
    setUploadingAcc(study.accessionNumber);
    try {
      const res = await fetch('/api/pacs/bulk-sync', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ accessions: [study.accessionNumber] }),
      });
      const data = await res.json();
      if (data.success) {
        notify.success(`Study ${study.accessionNumber} queued for Cloud upload.`);
        if (onRefreshNode) onRefreshNode();
        await fetchLivePatients();
      } else {
        throw new Error(data.error || 'Failed queueing Cloud upload');
      }
    } catch (err: any) {
      notify.error(err.message || 'Error queueing Cloud upload');
    } finally {
      setUploadingAcc(null);
    }
  };

  const handlePurgeLocal = async (accession: string) => {
    if (!onAction) return;
    setPurgingAcc(accession);
    try {
      await onAction('purge-local-study', { accession });
      notify.success(`Study ${accession} purged from local sandbox.`);
      if (onRefreshNode) onRefreshNode();
      await fetchLivePatients();
    } catch (err: any) {
      notify.error(err.message || 'Failed purging local study');
    } finally {
      setPurgingAcc(null);
    }
  };

  const handleSyncAllSandbox = async () => {
    const unsynced = localStudies
      .filter((s) => !s.isSyncedToS3 && s.state !== 'synced')
      .map((s) => s.accession);

    if (unsynced.length === 0) {
      notify.info('All resident sandbox studies are already synced to Cloud.');
      return;
    }

    setSyncingAll(true);
    try {
      const res = await fetch('/api/pacs/bulk-sync', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ accessions: unsynced }),
      });
      const data = await res.json();
      if (data.success) {
        notify.success(`Queued ${unsynced.length} studies for Cloud upload.`);
        if (onRefreshNode) onRefreshNode();
        await fetchLivePatients();
      } else {
        throw new Error(data.error || 'Failed queueing batch sync');
      }
    } catch (err: any) {
      notify.error(err.message || 'Failed queueing batch sync');
    } finally {
      setSyncingAll(false);
    }
  };

  return (
    <div className="space-y-4 text-xs font-sans">
      {/* Top Filter & Diagnostic Controls */}
      <div className="p-4 rounded-2xl border border-border/70 bg-card shadow-sm space-y-3">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-3">
          <div>
            <h3 className="font-bold text-sm text-foreground flex items-center gap-2">
              <Layers className="w-4 h-4 text-primary" />
              <span>Live Patient Explorer &amp; Storage Stage Diagnostics</span>
            </h3>
            <p className="text-[11px] text-muted-foreground">
              Search patients across Hospital PACS, verify local Clinic PC sandbox presence, and test cloud sync pipelines.
            </p>
          </div>

          <div className="flex items-center gap-2 flex-wrap">
            {localStudies.length > 0 && (
              <Button
                size="sm"
                onClick={handleSyncAllSandbox}
                disabled={syncingAll || loading}
                className="h-8 px-3 text-xs bg-emerald-600 hover:bg-emerald-700 text-white gap-1.5 cursor-pointer"
                title="Upload all resident sandbox studies to Rad Suite Cloud VPS"
              >
                <UploadCloud className={`w-3.5 h-3.5 ${syncingAll ? 'animate-bounce' : ''}`} />
                <span>{syncingAll ? 'Syncing...' : `Upload All to Cloud (${localStudies.length})`}</span>
              </Button>
            )}

            <Button
              size="sm"
              variant="outline"
              onClick={() => {
                fetchLivePatients();
                if (onRefreshNode) onRefreshNode();
              }}
              disabled={loading || loadingNode}
              className="h-8 px-2.5 text-xs gap-1.5 cursor-pointer"
              title="Refresh live patient list"
            >
              <RefreshCw className={`w-3.5 h-3.5 ${loading ? 'animate-spin' : ''}`} />
              <span>Refresh</span>
            </Button>
          </div>
        </div>

        {/* Filter Toolbar */}
        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-2 pt-1">
          <div className="relative">
            <Search className="w-3.5 h-3.5 absolute left-2.5 top-2.5 text-muted-foreground" />
            <input
              type="text"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search patient, MRN, accession..."
              className="w-full pl-8 pr-3 py-1.5 rounded-xl border border-border bg-background text-foreground text-xs focus:ring-1 focus:ring-primary focus:outline-none placeholder:text-muted-foreground"
            />
          </div>

          <div className="flex items-center gap-1 p-0.5 rounded-xl border border-border bg-muted/40">
            {['ALL', 'MR', 'CT'].map((m) => (
              <button
                key={m}
                type="button"
                onClick={() => setModality(m)}
                className={`flex-1 py-1 rounded-lg text-xs font-semibold transition-colors cursor-pointer ${
                  modality === m
                    ? 'bg-background text-foreground shadow-xs'
                    : 'text-muted-foreground hover:text-foreground'
                }`}
              >
                {m}
              </button>
            ))}
          </div>

          <select
            value={datePreset}
            onChange={(e) => setDatePreset(e.target.value as any)}
            className="px-3 py-1.5 rounded-xl border border-border bg-background text-foreground text-xs font-medium focus:ring-1 focus:ring-primary focus:outline-none cursor-pointer"
          >
            <option value="today">Today's Scans</option>
            <option value="yesterday">Yesterday's Scans</option>
            <option value="48h">Last 48 Hours</option>
            <option value="7d">Last 7 Days</option>
            <option value="all">All Dates</option>
          </select>

          <select
            value={locationFilter}
            onChange={(e) => setLocationFilter(e.target.value as any)}
            className="px-3 py-1.5 rounded-xl border border-border bg-background text-foreground text-xs font-medium focus:ring-1 focus:ring-primary focus:outline-none cursor-pointer"
          >
            <option value="all">All Storage Stages</option>
            <option value="sandbox">In Clinic Sandbox (Disk)</option>
            <option value="s3">Synced to Cloud</option>
            <option value="pacs">Hospital PACS Only</option>
          </select>
        </div>
      </div>

      {/* Patient Table Container */}
      <div className="p-4 rounded-2xl border border-border/70 bg-card shadow-sm space-y-3">
        <div className="flex items-center justify-between text-xs text-muted-foreground">
          <span>Found <strong className="text-foreground">{totalCount}</strong> patient studies</span>
          <span className="font-mono text-[11px]">Displaying up to 50 active cases</span>
        </div>

        <ClinicLivePatientTable
          studies={studies}
          loading={loading}
          pullingAcc={pullingAcc}
          uploadingAcc={uploadingAcc}
          purgingAcc={purgingAcc}
          onPull={handlePullToSandbox}
          onUpload={handleUploadToS3}
          onPurge={handlePurgeLocal}
        />
      </div>
    </div>
  );
}
