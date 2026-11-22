'use client';

import React, { useState } from 'react';
import { Clock, Play, Pause, Wrench, CheckCircle2, AlertTriangle, XCircle, HardDrive, Zap } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import type { ClinicNodeTelemetry, ClinicScheduleConfig } from '@/services/clinic-node.service';

interface ClinicScheduleCardProps {
  telemetry: ClinicNodeTelemetry;
  onPauseResume: (pause: boolean) => Promise<void>;
  onSaveSchedule?: (schedule: ClinicScheduleConfig) => Promise<void>;
  onRunDiagnostics: () => Promise<void>;
  onChange?: (schedule: ClinicScheduleConfig) => void;
  hideSaveButton?: boolean;
  loading?: boolean;
}

export function ClinicScheduleCard({
  telemetry,
  onPauseResume,
  onSaveSchedule,
  onRunDiagnostics,
  onChange,
  hideSaveButton = false,
  loading = false,
}: ClinicScheduleCardProps) {
  const isPaused = Boolean(telemetry.syncPaused);
  const currentSchedule = telemetry.schedule || {
    enabled: false,
    startHour: 20,
    endHour: 8,
    allowWeekends: true,
  };

  const [schedEnabled, setSchedEnabled] = useState(currentSchedule.enabled);
  const [startHour, setStartHour] = useState(currentSchedule.startHour);
  const [endHour, setEndHour] = useState(currentSchedule.endHour);
  const [allowWeekends, setAllowWeekends] = useState(currentSchedule.allowWeekends ?? true);
  const [savingSchedule, setSavingSchedule] = useState(false);
  const [togglingPause, setTogglingPause] = useState(false);
  const [runningDiag, setRunningDiag] = useState(false);

  const notify = (
    en = schedEnabled,
    sH = startHour,
    eH = endHour,
    aW = allowWeekends
  ) => {
    onChange?.({
      enabled: en,
      startHour: Number(sH),
      endHour: Number(eH),
      allowWeekends: aW,
    });
  };

  const handleTogglePause = async () => {
    setTogglingPause(true);
    try {
      await onPauseResume(!isPaused);
    } finally {
      setTogglingPause(false);
    }
  };

  const handleSaveSched = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!onSaveSchedule) return;
    setSavingSchedule(true);
    try {
      await onSaveSchedule({
        enabled: schedEnabled,
        startHour: Number(startHour),
        endHour: Number(endHour),
        allowWeekends,
      });
    } finally {
      setSavingSchedule(false);
    }
  };

  const handleDiag = async () => {
    setRunningDiag(true);
    try {
      await onRunDiagnostics();
    } finally {
      setRunningDiag(false);
    }
  };

  const diag = telemetry.diagnostics;

  return (
    <div className="p-5 rounded-2xl bg-card border border-border/70 shadow-xs space-y-4 text-xs font-sans">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div className="flex items-center gap-2.5">
          <div className="p-2 rounded-xl bg-primary/10 text-primary">
            <Clock className="w-5 h-5" />
          </div>
          <div>
            <h3 className="text-sm font-bold text-foreground flex items-center gap-2">
              Sync Scheduling, Pause Control & Edge Diagnostics
              <Badge variant="outline" className="font-mono text-[10px]">
                {telemetry.compression?.enabled ? 'Lossless Deflate' : 'Uncompressed'}
              </Badge>
            </h3>
            <p className="text-[11px] text-muted-foreground">
              Control when the clinic node replicates DICOM files to the Cloud and verify edge services
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <Button
            size="sm"
            variant={isPaused ? 'primary' : 'outline'}
            onClick={handleTogglePause}
            disabled={togglingPause || loading || !telemetry.online}
            className={`gap-1.5 text-xs font-bold ${
              isPaused
                ? 'bg-emerald-600 hover:bg-emerald-700 text-white'
                : 'border-amber-500/50 text-amber-500 hover:bg-amber-500/10'
            }`}
          >
            {isPaused ? <Play className="w-3.5 h-3.5" /> : <Pause className="w-3.5 h-3.5" />}
            <span>{togglingPause ? 'Updating...' : isPaused ? 'Resume Sync' : 'Pause Sync'}</span>
          </Button>

          <Button
            size="sm"
            variant="outline"
            onClick={handleDiag}
            disabled={runningDiag || loading || !telemetry.online}
            className="gap-1.5 text-xs font-semibold"
          >
            <Wrench className={`w-3.5 h-3.5 ${runningDiag ? 'animate-spin' : ''}`} />
            <span>{runningDiag ? 'Running...' : 'Run Diagnostics'}</span>
          </Button>
        </div>
      </div>

      {/* Sync Pause Status Banner */}
      {isPaused && (
        <div className="p-3 rounded-xl bg-amber-500/10 border border-amber-500/30 flex items-center justify-between text-amber-600 dark:text-amber-400">
          <div className="flex items-center gap-2">
            <AlertTriangle className="w-4 h-4 shrink-0" />
            <span className="font-semibold text-xs">
              Cloud Selective Sync is PAUSED on clinic node. Files remain stored safely in local Orthanc for edge streaming.
            </span>
          </div>
        </div>
      )}

      {/* Schedule Configuration Row */}
      <form onSubmit={handleSaveSched} className="p-4 rounded-xl bg-muted/20 border border-border/50 space-y-3">
        <div className="flex items-center justify-between">
          <label className="flex items-center gap-2 cursor-pointer">
            <input
              type="checkbox"
              checked={schedEnabled}
              onChange={(e) => {
                setSchedEnabled(e.target.checked);
                notify(e.target.checked);
              }}
              className="rounded border-border text-primary focus:ring-primary w-4 h-4 cursor-pointer"
            />
            <span className="font-bold text-foreground">Enable Scheduled Upload Window</span>
          </label>

          <label className="flex items-center gap-2 cursor-pointer text-muted-foreground text-[11px]">
            <input
              type="checkbox"
              checked={allowWeekends}
              onChange={(e) => {
                setAllowWeekends(e.target.checked);
                notify(schedEnabled, startHour, endHour, e.target.checked);
              }}
              className="rounded border-border text-primary focus:ring-primary w-3.5 h-3.5 cursor-pointer"
            />
            <span>Allow Weekends</span>
          </label>
        </div>

        {schedEnabled && (
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 pt-1 items-end">
            <div>
              <span className="text-[10px] uppercase font-bold text-muted-foreground block mb-1">Start Hour (24h)</span>
              <input
                type="number"
                min="0"
                max="23"
                value={startHour}
                onChange={(e) => {
                  const v = Number(e.target.value);
                  setStartHour(v);
                  notify(schedEnabled, v, endHour, allowWeekends);
                }}
                className="w-full px-2.5 py-1.5 text-xs rounded-lg bg-card border border-border/80 focus:ring-1 focus:ring-primary font-mono"
              />
            </div>
            <div>
              <span className="text-[10px] uppercase font-bold text-muted-foreground block mb-1">End Hour (24h)</span>
              <input
                type="number"
                min="0"
                max="23"
                value={endHour}
                onChange={(e) => {
                  const v = Number(e.target.value);
                  setEndHour(v);
                  notify(schedEnabled, startHour, v, allowWeekends);
                }}
                className="w-full px-2.5 py-1.5 text-xs rounded-lg bg-card border border-border/80 focus:ring-1 focus:ring-primary font-mono"
              />
            </div>
            {!hideSaveButton && (
              <div className="col-span-2 flex justify-end">
                <Button type="submit" size="sm" disabled={savingSchedule} className="text-xs font-bold cursor-pointer">
                  {savingSchedule ? 'Saving...' : 'Save Schedule'}
                </Button>
              </div>
            )}
          </div>
        )}
      </form>

      {/* Pre-Flight Diagnostics Live Results */}
      {diag && (
        <div className="p-4 rounded-xl bg-muted/30 border border-border/50 space-y-2">
          <div className="flex items-center justify-between">
            <span className="text-[10px] uppercase font-bold text-muted-foreground">
              Last Diagnostics: {new Date(diag.timestamp).toLocaleTimeString()}
            </span>
          </div>

          <div className="grid grid-cols-2 sm:grid-cols-5 gap-2 text-[11px]">
            {/* Orthanc HTTP */}
            <div className="p-2 rounded-lg bg-card border border-border/60">
              <div className="text-[10px] text-muted-foreground">Orthanc HTTP</div>
              <div className="flex items-center gap-1 font-bold mt-0.5">
                {diag.orthancHttp.status === 'pass' ? (
                  <CheckCircle2 className="w-3.5 h-3.5 text-emerald-500" />
                ) : (
                  <XCircle className="w-3.5 h-3.5 text-rose-500" />
                )}
                <span>{diag.orthancHttp.status === 'pass' ? `${diag.orthancHttp.latencyMs}ms` : 'Failed'}</span>
              </div>
            </div>

            {/* Orthanc DICOM */}
            <div className="p-2 rounded-lg bg-card border border-border/60">
              <div className="text-[10px] text-muted-foreground">DICOM Port {diag.orthancDicom.port || 11115}</div>
              <div className="flex items-center gap-1 font-bold mt-0.5">
                {diag.orthancDicom.status === 'pass' ? (
                  <CheckCircle2 className="w-3.5 h-3.5 text-emerald-500" />
                ) : (
                  <XCircle className="w-3.5 h-3.5 text-rose-500" />
                )}
                <span>{diag.orthancDicom.status === 'pass' ? 'Listening' : 'Closed'}</span>
              </div>
            </div>

            {/* S3 Write */}
            <div className="p-2 rounded-lg bg-card border border-border/60">
              <div className="text-[10px] text-muted-foreground">S3 SigV4 Put</div>
              <div className="flex items-center gap-1 font-bold mt-0.5">
                {diag.s3Write.status === 'pass' ? (
                  <CheckCircle2 className="w-3.5 h-3.5 text-emerald-500" />
                ) : (
                  <XCircle className="w-3.5 h-3.5 text-rose-500" />
                )}
                <span>{diag.s3Write.status === 'pass' ? `${diag.s3Write.latencyMs}ms` : 'Failed'}</span>
              </div>
            </div>

            {/* Hospital PACS */}
            <div className="p-2 rounded-lg bg-card border border-border/60">
              <div className="text-[10px] text-muted-foreground">Hospital PACS</div>
              <div className="flex items-center gap-1 font-bold mt-0.5">
                {diag.hospitalPacs.status === 'pass' ? (
                  <CheckCircle2 className="w-3.5 h-3.5 text-emerald-500" />
                ) : diag.hospitalPacs.status === 'skipped' ? (
                  <Zap className="w-3.5 h-3.5 text-muted-foreground" />
                ) : (
                  <XCircle className="w-3.5 h-3.5 text-rose-500" />
                )}
                <span>{diag.hospitalPacs.status.toUpperCase()}</span>
              </div>
            </div>

            {/* Disk Free */}
            <div className="p-2 rounded-lg bg-card border border-border/60">
              <div className="text-[10px] text-muted-foreground">Disk Free</div>
              <div className="flex items-center gap-1 font-bold mt-0.5">
                <HardDrive className="w-3.5 h-3.5 text-primary" />
                <span>{diag.disk.freeGb} GB</span>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
