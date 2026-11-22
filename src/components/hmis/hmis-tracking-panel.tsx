'use client';

import React, { useState, useEffect, useMemo } from 'react';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import {
  Activity,
  Search,
  RefreshCw,
  AlertTriangle,
  CheckCircle2,
  Clock,
  Filter,
  Loader2,
  Calendar,
} from 'lucide-react';
import type { HmisTrackingRecord } from '@/services/hmis/hmis-models';
import { notify } from '@/services/notification.service';
import { HmisTrackingRow } from './hmis-tracking-row';

interface HmisTrackingPanelProps {
  onTrackAccession?: (accession: string, mrn?: string) => void;
  onStageStudy?: (record: any) => void;
  onSessionCollision?: (message: string) => void;
  disabled?: boolean;
}

type StatusFilter = 'ALL' | 'UNACKNOWLEDGED' | 'ACKNOWLEDGED' | 'PERFORMED' | 'PUBLISHED';

export function HmisTrackingPanel({
  onTrackAccession,
  onStageStudy,
  onSessionCollision,
  disabled = false,
}: HmisTrackingPanelProps) {
  const [loading, setLoading] = useState(false);
  const [records, setRecords] = useState<HmisTrackingRecord[]>([]);
  const [totalRecords, setTotalRecords] = useState<number>(0);
  const [searchTerm, setSearchTerm] = useState('');
  const [modalityFilter, setModalityFilter] = useState('ALL');
  const [statusFilter, setStatusFilter] = useState<StatusFilter>('ALL');
  const [timeList, setTimeList] = useState<'-24hour' | 'Date Range'>('-24hour');
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  const fetchTrackingQueue = async () => {
    setLoading(true);
    setErrorMsg(null);
    try {
      const q = new URLSearchParams();
      q.set('perPage', '100');
      if (modalityFilter !== 'ALL') q.set('modality', modalityFilter);
      q.set('timeList', timeList);

      const res = await fetch(`/api/hmis/tracking-list?${q.toString()}`);
      const result = await res.json();
      if (!res.ok || !result.success) {
        const err = result.error || 'Failed to fetch HMIS tracking queue.';
        setErrorMsg(err);
        if (/already logged in|another device|session_collision/i.test(err)) {
          onSessionCollision?.(err);
        }
      } else {
        setRecords(result.data?.records || []);
        setTotalRecords(result.data?.totalRecords || result.data?.records?.length || 0);
      }
    } catch (err: any) {
      setErrorMsg(`Connection error: ${err.message}`);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchTrackingQueue();
  }, [modalityFilter, timeList]);

  // Client-side quick filter & search
  const filteredRecords = useMemo(() => {
    return records.filter((r) => {
      // 1. Status Filter
      if (statusFilter === 'UNACKNOWLEDGED') {
        const isUnack = r.isPendingAcknowledgment || r.status === 'PENDING_ACKNOWLEDGMENT' || (!r.isAcknowledged && !r.isPerformed);
        if (!isUnack) return false;
      } else if (statusFilter === 'ACKNOWLEDGED') {
        if (!r.isAcknowledged) return false;
      } else if (statusFilter === 'PERFORMED') {
        if (!r.isPerformed) return false;
      } else if (statusFilter === 'PUBLISHED') {
        if (!r.isPublished) return false;
      }

      // 2. Search Filter
      if (!searchTerm) return true;
      const s = searchTerm.toLowerCase().trim();
      return (
        r.patientName?.toLowerCase().includes(s) ||
        r.mrn?.toLowerCase().includes(s) ||
        r.accession?.toLowerCase().includes(s) ||
        r.contact?.toLowerCase().includes(s) ||
        r.cnic?.toLowerCase().includes(s) ||
        r.cpt?.toLowerCase().includes(s) ||
        r.radiographer?.toLowerCase().includes(s)
      );
    });
  }, [records, statusFilter, searchTerm]);

  // Counts for KPI summary
  const stats = useMemo(() => {
    const unacknowledged = records.filter(
      (r) => r.isPendingAcknowledgment || r.status === 'PENDING_ACKNOWLEDGMENT' || (!r.isAcknowledged && !r.isPerformed)
    ).length;
    const acknowledged = records.filter((r) => r.isAcknowledged && !r.isPerformed).length;
    const performed = records.filter((r) => r.isPerformed && !r.isPublished).length;
    const published = records.filter((r) => r.isPublished).length;
    return { total: records.length, unacknowledged, acknowledged, performed, published };
  }, [records]);

  const copyToClipboard = (text: string, label: string) => {
    navigator.clipboard.writeText(text);
    notify.success(`Copied ${label}: ${text}`);
  };

  return (
    <Card className="p-4 space-y-4">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-outline-variant/30 pb-3">
        <div className="space-y-0.5">
          <div className="flex items-center gap-2">
            <Activity className="w-4 h-4 text-primary" />
            <span className="font-bold text-sm text-foreground">HMIS Tracking & Radiographer Acknowledgment Queue</span>
            <Badge variant="outline" className="text-[10px] py-0 px-1.5 font-mono">
              Livewire 100/Page
            </Badge>
          </div>
          <p className="text-[11px] text-muted-foreground">
            Monitor real-time patient reception, radiographer acknowledgment, scan milestones, and contact numbers.
          </p>
        </div>

        <div className="flex items-center gap-2">
          <Button
            size="sm"
            variant="outline"
            onClick={fetchTrackingQueue}
            disabled={loading || disabled}
            className="h-8 text-xs gap-1.5"
          >
            {loading ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <RefreshCw className="w-3.5 h-3.5" />}
            Refresh Queue
          </Button>
        </div>
      </div>

      {/* KPI Status Badges */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
        <button
          type="button"
          onClick={() => setStatusFilter('ALL')}
          className={`p-2.5 rounded-lg border text-left transition-all ${
            statusFilter === 'ALL' ? 'border-primary bg-primary/10' : 'border-outline-variant/30 bg-surface-container-high/20'
          }`}
        >
          <div className="text-[10px] text-muted-foreground font-medium uppercase tracking-wider">Total Scanned/Queued</div>
          <div className="text-lg font-bold text-foreground mt-0.5">{stats.total}</div>
        </button>

        <button
          type="button"
          onClick={() => setStatusFilter('UNACKNOWLEDGED')}
          className={`p-2.5 rounded-lg border text-left transition-all ${
            statusFilter === 'UNACKNOWLEDGED'
              ? 'border-amber-500 bg-amber-500/15 shadow-sm'
              : 'border-amber-500/30 bg-amber-500/5 hover:bg-amber-500/10'
          }`}
        >
          <div className="text-[10px] text-amber-500 font-semibold uppercase tracking-wider flex items-center gap-1">
            <AlertTriangle className="w-3 h-3" /> Pending Ack (Warning)
          </div>
          <div className="text-lg font-bold text-amber-400 mt-0.5">{stats.unacknowledged}</div>
        </button>

        <button
          type="button"
          onClick={() => setStatusFilter('ACKNOWLEDGED')}
          className={`p-2.5 rounded-lg border text-left transition-all ${
            statusFilter === 'ACKNOWLEDGED'
              ? 'border-sky-500 bg-sky-500/15 shadow-sm'
              : 'border-sky-500/30 bg-sky-500/5 hover:bg-sky-500/10'
          }`}
        >
          <div className="text-[10px] text-sky-400 font-semibold uppercase tracking-wider flex items-center gap-1">
            <CheckCircle2 className="w-3 h-3" /> Radiographer Ack
          </div>
          <div className="text-lg font-bold text-sky-300 mt-0.5">{stats.acknowledged}</div>
        </button>

        <button
          type="button"
          onClick={() => setStatusFilter('PERFORMED')}
          className={`p-2.5 rounded-lg border text-left transition-all ${
            statusFilter === 'PERFORMED'
              ? 'border-emerald-500 bg-emerald-500/15 shadow-sm'
              : 'border-emerald-500/30 bg-emerald-500/5 hover:bg-emerald-500/10'
          }`}
        >
          <div className="text-[10px] text-emerald-400 font-semibold uppercase tracking-wider flex items-center gap-1">
            <Clock className="w-3 h-3" /> Performed / Ready
          </div>
          <div className="text-lg font-bold text-emerald-300 mt-0.5">{stats.performed}</div>
        </button>
      </div>

      {/* Filter and Search Bar */}
      <div className="flex flex-col sm:flex-row gap-2 text-xs">
        <div className="relative flex-1">
          <Search className="w-3.5 h-3.5 text-muted-foreground absolute left-3 top-2.5" />
          <input
            type="text"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            placeholder="Search by MRN, Accession, Name, Phone Contact, CNIC..."
            className="w-full pl-8 pr-3 py-1.5 rounded-lg border border-outline-variant bg-background text-foreground text-xs placeholder:text-muted-foreground focus:ring-1 focus:ring-primary focus:outline-none font-mono"
          />
        </div>

        <select
          value={modalityFilter}
          onChange={(e) => setModalityFilter(e.target.value)}
          className="px-3 py-1.5 rounded-lg border border-outline-variant bg-background text-foreground text-xs font-medium"
        >
          <option value="ALL">All Modalities</option>
          <option value="CT">CT-Scan (1)</option>
          <option value="MRI">MRI (4)</option>
          <option value="X-RAY">X-Ray (6)</option>
          <option value="ULTRASOUND">Ultrasound (5)</option>
        </select>

        <select
          value={timeList}
          onChange={(e) => setTimeList(e.target.value as any)}
          className="px-3 py-1.5 rounded-lg border border-outline-variant bg-background text-foreground text-xs font-medium"
        >
          <option value="-24hour">Last 24 Hours</option>
          <option value="Date Range">Today / Date Range</option>
        </select>
      </div>

      {errorMsg && (
        <div className="p-2.5 rounded-lg bg-rose-500/10 border border-rose-500/20 text-rose-400 text-xs">
          {errorMsg}
        </div>
      )}

      {/* Records Table */}
      <div className="rounded-lg border border-outline-variant/40 overflow-x-auto max-h-[500px]">
        <table className="w-full text-left text-xs border-collapse">
          <thead className="bg-surface-container-high/60 sticky top-0 border-b border-outline-variant/40 z-10">
            <tr className="text-muted-foreground text-[11px] font-semibold">
              <th className="py-2 px-3">Patient Bio & Contact</th>
              <th className="py-2 px-3">Study / Modality</th>
              <th className="py-2 px-3">Radiographer Acknowledgment</th>
              <th className="py-2 px-3">Room / Dept</th>
              <th className="py-2 px-3 text-right">Actions</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-outline-variant/20">
            {filteredRecords.length === 0 ? (
              <tr>
                <td colSpan={5} className="text-center py-8 text-muted-foreground">
                  {loading ? 'Fetching tracking queue...' : 'No matching records in tracking queue.'}
                </td>
              </tr>
            ) : (
              filteredRecords.map((r) => (
                <HmisTrackingRow
                  key={`${r.id}-${r.accession || r.mrn}`}
                  record={r}
                  onTrackAccession={onTrackAccession}
                  onStageStudy={onStageStudy}
                  copyToClipboard={copyToClipboard}
                />
              ))
            )}
          </tbody>
        </table>
      </div>
    </Card>
  );
}
