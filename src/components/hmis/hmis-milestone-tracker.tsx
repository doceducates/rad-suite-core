'use client';

import React, { useState, useEffect } from 'react';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import {
  Activity,
  CheckCircle2,
  Clock,
  Search,
  Loader2,
  FileDown,
  Calendar,
  AlertCircle,
  User,
  ShieldAlert,
  RefreshCw,
} from 'lucide-react';
import type { HmisTrackingRecord } from '@/services/hmis/hmis-models';

const MILESTONE_DEFINITIONS = [
  { key: 'order', label: 'Order Created' },
  { key: 'receptions', label: 'Payment / Reception' },
  { key: 'scheduled', label: 'Scheduled' },
  { key: 'pendingAcknowledgment', label: 'Pending Ack' },
  { key: 'radiographerAcknowledgment', label: 'Radiographer Ack' },
  { key: 'performed', label: 'Scan Performed' },
  { key: 'verified', label: 'Verified / Reported' },
  { key: 'published', label: 'Published / Dispatched' },
] as const;

interface HmisMilestoneTrackerProps {
  initialAccession?: string;
  initialMrn?: string;
  onSessionCollision?: (message: string) => void;
  disabled?: boolean;
}

export function HmisMilestoneTracker({
  initialAccession = '',
  initialMrn = '',
  onSessionCollision,
  disabled = false,
}: HmisMilestoneTrackerProps) {
  const [accession, setAccession] = useState(initialAccession);
  const [mrn, setMrn] = useState(initialMrn);
  const [loading, setLoading] = useState(false);
  const [releasingLock, setReleasingLock] = useState(false);
  const [trackingData, setTrackingData] = useState<any | null>(null);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  useEffect(() => {
    if (initialAccession) setAccession(initialAccession);
    if (initialMrn) setMrn(initialMrn);
  }, [initialAccession, initialMrn]);

  const handleForceRelease = async () => {
    setReleasingLock(true);
    try {
      const res = await fetch('/api/hmis/force-release', { method: 'POST' });
      const data = await res.json();
      if (data.success) {
        setErrorMsg(null);
        setTimeout(() => fetchMilestones(), 1000);
      } else {
        setErrorMsg(data.error || 'Failed to release remote session lock.');
      }
    } catch (err: any) {
      setErrorMsg(`Release error: ${err.message}`);
    } finally {
      setReleasingLock(false);
    }
  };

  const fetchMilestones = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    if (!accession && !mrn) return;
    setLoading(true);
    setErrorMsg(null);
    setTrackingData(null);

    const query = new URLSearchParams();
    if (accession) query.set('accession', accession.trim());
    if (mrn) query.set('mrn', mrn.trim());

    try {
      const res = await fetch(`/api/hmis/track?${query.toString()}`);
      const data = await res.json();
      if (!res.ok || !data.success) {
        const err = data.error || 'Failed to retrieve report milestone tracking.';
        setErrorMsg(err);
        if (/already logged in|another device|session_collision/i.test(err)) {
          onSessionCollision?.(err);
        }
      } else {
        setTrackingData(data.data);
      }
    } catch (err: any) {
      setErrorMsg(`Connection error: ${err.message}`);
    } finally {
      setLoading(false);
    }
  };

  const record: HmisTrackingRecord | undefined = trackingData?.records?.[0];
  const isRejected = !!record?.milestones?.rejected?.timestamp;
  const currentStep = record?.currentStageIndex ?? trackingData?.currentStageIndex ?? -1;

  return (
    <Card className="p-4 space-y-4">
      <div className="flex items-center justify-between border-b border-outline-variant/40 pb-3">
        <div className="flex items-center gap-2">
          <Activity className="w-4 h-4 text-primary" />
          <span className="font-bold text-xs text-foreground">HMIS 9-Stage Report Lifecycle Tracker</span>
        </div>
        <Badge variant="outline" className="text-[10px] py-0 px-1.5 font-mono">
          Target: /radiology/tracking-list
        </Badge>
      </div>

      <form onSubmit={fetchMilestones} className="flex gap-2">
        <input
          type="text"
          value={accession}
          onChange={(e) => setAccession(e.target.value)}
          placeholder="Accession # (e.g. 192608000987)..."
          disabled={disabled || loading}
          className="flex-1 px-3 py-2 text-xs rounded-lg border border-outline-variant bg-background text-foreground placeholder:text-muted-foreground focus:ring-1 focus:ring-primary focus:outline-none font-mono"
        />
        <input
          type="text"
          value={mrn}
          onChange={(e) => setMrn(e.target.value)}
          placeholder="MRN (optional)..."
          disabled={disabled || loading}
          className="w-36 px-3 py-2 text-xs rounded-lg border border-outline-variant bg-background text-foreground placeholder:text-muted-foreground focus:ring-1 focus:ring-primary focus:outline-none font-mono"
        />
        <Button
          type="submit"
          size="sm"
          disabled={disabled || loading || (!accession && !mrn)}
          className="h-9 px-4 text-xs gap-1.5 bg-primary text-primary-foreground hover:bg-primary/90"
        >
          {loading ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Search className="w-3.5 h-3.5" />}
          Track Status
        </Button>
      </form>

      {errorMsg && (
        <div className="p-2.5 rounded-lg bg-rose-500/10 border border-rose-500/20 text-rose-400 text-xs space-y-2">
          <div>{errorMsg}</div>
          {errorMsg && /already logged in|another device|session_collision/i.test(errorMsg) && (
            <div className="flex items-center justify-between gap-2 p-2 rounded bg-amber-500/10 border border-amber-500/20 text-amber-300 text-[11px]">
              <div className="flex items-center gap-1.5">
                <ShieldAlert className="w-4 h-4 shrink-0 text-amber-400" />
                <span>HMIS account is logged into another device. Clear lock to proceed.</span>
              </div>
              <Button
                size="sm"
                variant="outline"
                onClick={handleForceRelease}
                disabled={releasingLock}
                className="h-6 text-[10px] px-2 gap-1 border-amber-500/40 text-amber-300 hover:bg-amber-500/20 shrink-0"
              >
                {releasingLock ? <Loader2 className="w-3 h-3 animate-spin" /> : <RefreshCw className="w-3 h-3" />}
                Release Lock
              </Button>
            </div>
          )}
        </div>
      )}

      {trackingData?.inferredRange && (
        <div className="text-[11px] text-primary flex items-center gap-1.5 bg-primary/10 px-2.5 py-1.5 rounded-md border border-primary/20">
          <Calendar className="w-3.5 h-3.5 shrink-0" />
          <span>Auto-detected 30-day timeframe: <strong>{trackingData.inferredRange.startDate}</strong> to <strong>{trackingData.inferredRange.endDate}</strong></span>
        </div>
      )}

      {isRejected && (
        <div className="text-xs text-rose-400 flex items-center gap-2 bg-rose-500/10 p-2.5 rounded-lg border border-rose-500/20">
          <AlertCircle className="w-4 h-4 shrink-0" />
          <span>Investigation was marked REJECTED by {record?.milestones?.rejected?.actor || 'Staff'} at {record?.milestones?.rejected?.timestamp}</span>
        </div>
      )}

      <div className="space-y-3 pt-1">
        <div className="flex items-center justify-between">
          <h4 className="text-[11px] font-semibold text-muted-foreground uppercase tracking-wider">
            Milestone Progression:
          </h4>
          {record && (
            <Badge variant="outline" className="text-[10px] py-0 px-2 font-mono">
              Status: {record.status}
            </Badge>
          )}
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-2">
          {MILESTONE_DEFINITIONS.map((def, idx) => {
            const milestoneData = record?.milestones ? (record.milestones as any)[def.key] : null;
            const hasMilestoneData = !!milestoneData?.timestamp;
            const isCompleted = hasMilestoneData || (currentStep >= 0 && idx <= currentStep);
            const isCurrent = currentStep >= 0 && idx === currentStep;

            return (
              <div
                key={def.key}
                className={`p-2.5 rounded-lg border text-xs flex flex-col justify-between gap-1.5 transition-all ${
                  isCurrent
                    ? 'border-primary bg-primary/10 shadow-sm text-foreground'
                    : isCompleted
                    ? 'border-emerald-500/30 bg-emerald-500/5 text-foreground'
                    : 'border-outline-variant/30 bg-surface-container-high/20 text-muted-foreground'
                }`}
              >
                <div className="flex items-center justify-between gap-1.5 min-w-0">
                  <div className="flex items-center gap-1.5 min-w-0">
                    <div
                      className={`w-4 h-4 rounded-full flex items-center justify-center text-[9px] font-bold shrink-0 ${
                        isCurrent
                          ? 'bg-primary text-primary-foreground'
                          : isCompleted
                          ? 'bg-emerald-500/20 text-emerald-400'
                          : 'bg-surface-container-high text-muted-foreground'
                      }`}
                    >
                      {idx + 1}
                    </div>
                    <span className="truncate text-[11px] font-medium">{def.label}</span>
                  </div>
                  {isCompleted && <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400 shrink-0" />}
                  {isCurrent && !hasMilestoneData && <Clock className="w-3.5 h-3.5 text-primary animate-pulse shrink-0" />}
                </div>

                {milestoneData?.timestamp && (
                  <div className="text-[10px] text-muted-foreground pt-0.5 space-y-0.5 border-t border-outline-variant/20">
                    <div className="truncate">{milestoneData.timestamp}</div>
                    {milestoneData.actor && (
                      <div className="truncate flex items-center gap-1 text-foreground/80">
                        <User className="w-2.5 h-2.5 text-primary shrink-0" />
                        <span className="truncate">{milestoneData.actor}</span>
                      </div>
                    )}
                  </div>
                )}
              </div>
            );
          })}
        </div>

        {record && (
          <div className="p-3 rounded-lg bg-surface-container-high/40 border border-outline-variant/40 flex flex-col sm:flex-row sm:items-center justify-between gap-2 text-xs mt-3">
            <div className="space-y-0.5">
              <span className="font-semibold text-foreground">{record.patientName}</span>
              <div className="text-[11px] text-muted-foreground">
                MRN: {record.mrn} • Accession: {record.accession} • Dept: {record.department || 'Radiology'}
              </div>
            </div>
            {record.status === 'PUBLISHED' && record.id && (
              <Button
                size="sm"
                className="h-8 text-xs gap-1.5 bg-emerald-600 hover:bg-emerald-700 text-white shrink-0 self-start sm:self-center"
                onClick={() => window.open(`/api/hmis/published/pdf/${encodeURIComponent(btoa(record.id))}`, '_blank')}
              >
                <FileDown className="w-3.5 h-3.5" /> Download Published PDF
              </Button>
            )}
          </div>
        )}
      </div>
    </Card>
  );
}
