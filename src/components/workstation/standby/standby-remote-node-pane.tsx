'use client';

import React, { useState, useEffect } from 'react';
import { Radio, RefreshCw, Loader2, ArrowUpRight, HardDrive, CheckCircle2, Clock } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { StandbyCaseCard } from './standby-case-card';
import type { ClinicNodeTelemetry } from '@/services/clinic-node.service';
import type { PacsStudyResult } from '@/types/pacs';

export function StandbyRemoteNodePane() {
  const [telemetry, setTelemetry] = useState<ClinicNodeTelemetry | null>(null);
  const [loading, setLoading] = useState(false);
  const [pullAccession, setPullAccession] = useState('');
  const [pulling, setPulling] = useState(false);
  const [pullMessage, setPullMessage] = useState<string | null>(null);

  const fetchTelemetry = async () => {
    setLoading(true);
    try {
      const res = await fetch('/api/clinic-node');
      const data = await res.json();
      if (data.success && data.telemetry) {
        setTelemetry(data.telemetry);
      }
    } catch {
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchTelemetry();
  }, []);

  const handlePullAccession = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!pullAccession.trim()) return;

    setPulling(true);
    setPullMessage(null);
    try {
      const res = await fetch('/api/clinic-node', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'fetch-accession',
          payload: { accessionNumber: pullAccession.trim() },
        }),
      });
      const data = await res.json();
      if (data.success) {
        setPullMessage(`Accession ${pullAccession} queued. Edge daemon will pull from PACS & upload to S3.`);
        setPullAccession('');
      } else {
        setPullMessage(data.error || 'Failed to dispatch accession fetch.');
      }
    } catch {
      setPullMessage('Network error dispatching remote command.');
    } finally {
      setPulling(false);
    }
  };

  const syncedStudies: PacsStudyResult[] = (telemetry?.syncedStudies || []).map((s: any) => ({
    accessionNumber: s.accession,
    patientName: s.patientName || 'PATIENT',
    patientMrn: s.patientId || s.accession,
    patientId: s.patientId,
    age: 0,
    gender: 'Other',
    modality: s.modality || 'MR',
    studyDescription: `Clinic PC Synced (${s.status})`,
    studyDate: s.studyDate || new Date().toISOString().split('T')[0],
    studyTime: s.time || '',
    numSeries: 1,
    numInstances: (s as any).sliceCount || 1,
    pacsServerAe: 'CLINIC_EDGE',
    studyInstanceUid: (s as any).studyUid || `1.2.840.${s.accession}`,
    source: 'remote_node',
    availableSources: ['remote_node', 's3'],
    isDownloaded: false,
    status: s.status === 'synced' ? 'awaiting_report' : 'scheduled',
  }));

  return (
    <div className="w-full space-y-4 text-left">
      {/* Clinic PC Node Telemetry Header Card */}
      <div className="p-3.5 rounded-xl bg-purple-500/10 border border-purple-500/20 space-y-2.5">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <div className="flex items-center gap-2">
            <Radio className="w-4 h-4 text-purple-500 shrink-0" />
            <div>
              <span className="font-bold text-xs text-on-surface">Clinic PC Edge Node</span>
              <span className="text-secondary ml-2 font-mono text-[11px]">(Node: {telemetry?.nodeId || 'primary'})</span>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <span
              className={`px-2 py-0.5 rounded-full text-[10px] font-mono font-bold flex items-center gap-1 border ${
                telemetry?.online
                  ? 'bg-emerald-500/15 text-emerald-500 border-emerald-500/30'
                  : 'bg-zinc-500/15 text-zinc-400 border-zinc-500/30'
              }`}
            >
              <span className={`w-1.5 h-1.5 rounded-full ${telemetry?.online ? 'bg-emerald-500 animate-pulse' : 'bg-zinc-400'}`} />
              {telemetry?.online ? 'Online' : 'Standby / Offline'}
            </span>

            <Button
              variant="ghost"
              size="sm"
              onClick={fetchTelemetry}
              disabled={loading}
              className="h-6 px-2 text-[11px] text-secondary hover:text-on-surface cursor-pointer"
            >
              <RefreshCw className={`w-3 h-3 ${loading ? 'animate-spin' : ''}`} />
            </Button>
          </div>
        </div>

        {/* Telemetry metrics row */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 pt-1 border-t border-purple-500/15 text-[11px] font-mono text-secondary">
          <div>
            <span className="block text-[9px] text-secondary/70">ORTHANC DAEMON</span>
            <span className="font-semibold text-on-surface uppercase">{telemetry?.orthancStatus || 'stopped'}</span>
          </div>
          <div>
            <span className="block text-[9px] text-secondary/70">CASES TODAY</span>
            <span className="font-semibold text-on-surface">{telemetry?.casesToday || 0} / {telemetry?.targetCases || 50}</span>
          </div>
          <div>
            <span className="block text-[9px] text-secondary/70">INSTANCES TODAY</span>
            <span className="font-semibold text-on-surface">{telemetry?.instancesToday || 0} slices</span>
          </div>
          <div>
            <span className="block text-[9px] text-secondary/70">LOCAL DISK</span>
            <span className="font-semibold text-on-surface">{telemetry?.disk?.freeGb || 0} GB Free</span>
          </div>
        </div>
      </div>

      {/* Active Upload Card if any */}
      {telemetry?.activeUpload && (
        <div className="p-3 rounded-xl bg-primary/10 border border-primary/20 space-y-1.5">
          <div className="flex items-center justify-between text-xs">
            <span className="font-bold text-primary flex items-center gap-1.5">
              <Loader2 className="w-3.5 h-3.5 animate-spin" />
              <span>Edge S3 Upload in Progress</span>
            </span>
            <span className="font-mono text-[11px] text-secondary">
              {telemetry.activeUpload.completedSlices} / {telemetry.activeUpload.totalSlices} slices ({telemetry.activeUpload.progressPercent}%)
            </span>
          </div>
          <div className="w-full bg-surface-container rounded-full h-1.5 overflow-hidden">
            <div className="bg-primary h-full transition-all" style={{ width: `${telemetry.activeUpload.progressPercent}%` }} />
          </div>
          <div className="flex items-center justify-between text-[10px] text-secondary font-mono">
            <span>{telemetry.activeUpload.patientName} (#{telemetry.activeUpload.accession})</span>
            {telemetry.activeUpload.speedKbs && <span>{telemetry.activeUpload.speedKbs} KB/s</span>}
          </div>
        </div>
      )}

      {/* Remote Accession Fetcher */}
      <form onSubmit={handlePullAccession} className="p-3.5 rounded-xl bg-surface-container/60 border border-outline-variant/40 space-y-2">
        <label className="block text-[11px] font-bold text-on-surface">
          Trigger Remote Accession Pull via Clinic PC
        </label>
        <div className="flex items-center gap-2">
          <input
            type="text"
            placeholder="Enter accession number (e.g. 192609005798)..."
            value={pullAccession}
            onChange={(e) => setPullAccession(e.target.value)}
            className="flex-1 bg-surface-container-lowest border border-outline-variant/60 rounded-lg px-3 py-1.5 text-xs text-on-surface focus:border-primary outline-none font-mono"
          />
          <Button
            type="submit"
            disabled={pulling || !pullAccession.trim()}
            className="gap-1.5 bg-purple-600 hover:bg-purple-700 text-white text-xs px-3.5 py-1.5 rounded-lg cursor-pointer"
          >
            {pulling ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <ArrowUpRight className="w-3.5 h-3.5" />}
            <span>Pull Case</span>
          </Button>
        </div>
        {pullMessage && (
          <p className="text-[11px] text-primary font-mono">{pullMessage}</p>
        )}
      </form>

      {/* Synced Studies List */}
      <div className="space-y-2 pt-1">
        <div className="flex items-center justify-between text-xs text-secondary font-mono">
          <span>Synced Studies on Clinic Edge ({syncedStudies.length})</span>
        </div>

        {syncedStudies.length > 0 ? (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-2.5">
            {syncedStudies.map((study) => (
              <StandbyCaseCard key={study.accessionNumber} study={study} />
            ))}
          </div>
        ) : (
          <div className="p-8 text-center text-secondary text-xs rounded-xl border border-dashed border-outline-variant/40 bg-surface-container-low/30">
            No synced studies reported by clinic edge daemon yet.
          </div>
        )}
      </div>
    </div>
  );
}
