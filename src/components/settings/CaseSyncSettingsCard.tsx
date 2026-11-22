'use client';

import React, { useState, useEffect } from 'react';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { notify } from '@/services/notification.service';
import { Database, Cloud, RefreshCw, CheckCircle, AlertCircle, Play, Server, Send } from 'lucide-react';
import type { SyncStatusSummary } from '@/services/sync/case-sync-types';

export function CaseSyncSettingsCard() {
  const [summary, setSummary] = useState<SyncStatusSummary | null>(null);
  const [loading, setLoading] = useState(true);
  const [testing, setTesting] = useState(false);
  const [testResult, setTestResult] = useState<{ success: boolean; latencyMs: number; message: string } | null>(null);
  const [syncing, setSyncing] = useState(false);
  const [backfilling, setBackfilling] = useState(false);

  const fetchStatus = async () => {
    try {
      setLoading(true);
      const res = await fetch('/api/v1/sync/cases/status');
      const data = await res.json();
      if (data.success) {
        setSummary({
          configured: data.configured,
          vpsUrl: data.vpsUrl,
          pendingCount: data.pendingCount,
          failedCount: data.failedCount,
          syncedCount: data.syncedCount,
          lastSyncedAt: data.lastSyncedAt,
          lastError: data.lastError,
        });
      }
    } catch (err: any) {
      notify.error('Failed to load case sync status', err.message);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchStatus();
  }, []);

  const handleTestConnection = async () => {
    setTesting(true);
    setTestResult(null);
    try {
      const res = await fetch('/api/v1/sync/cases/status', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'test-connection' }),
      });
      const data = await res.json();
      setTestResult({
        success: data.success,
        latencyMs: data.latencyMs || 0,
        message: data.message || (data.success ? 'Connected' : 'Connection failed'),
      });

      if (data.success) {
        notify.success('VPS Connection Operational', { description: `${data.message} (${data.latencyMs}ms)` });
      } else {
        notify.warning('VPS Connection Alert', { description: data.message });
      }
    } catch (err: any) {
      notify.error('Connection test failed', { description: err.message });
    } finally {
      setTesting(false);
    }
  };

  const handleSyncNow = async () => {
    setSyncing(true);
    try {
      const res = await fetch('/api/v1/sync/cases/status', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'sync-now' }),
      });
      const data = await res.json();
      if (data.success) {
        notify.success('Database Synchronized', {
          description: `Pushed ${data.push?.synced || 0} cases, pulled ${data.pull?.received || 0} updates.`,
        });
        if (data.summary) setSummary(data.summary);
      } else {
        notify.warning('Sync Failed', { description: data.error || 'Server error' });
      }
    } catch (err: any) {
      notify.error('Sync failed', { description: err.message });
    } finally {
      setSyncing(false);
      fetchStatus();
    }
  };

  const handleBackfillOutbox = async () => {
    setBackfilling(true);
    try {
      const res = await fetch('/api/v1/sync/cases/status', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'backfill-outbox' }),
      });
      const data = await res.json();
      if (data.success) {
        notify.success('Cases Queued', {
          description: `Enqueued ${data.backfilled} existing local cases for VPS synchronization.`,
        });
        if (data.summary) setSummary(data.summary);
      }
    } catch (err: any) {
      notify.error('Backfill failed', { description: err.message });
    } finally {
      setBackfilling(false);
    }
  };

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <CardTitle className="text-sm flex items-center gap-2">
            <Server className="w-4 h-4 text-primary" /> Central VPS Database Sync & Replication
          </CardTitle>
          <div className="flex items-center gap-2">
            <Badge variant="outline" className="font-mono text-[10px] text-amber-600 dark:text-amber-400 border-amber-500/30">
              Alpha Preview
            </Badge>
            <Button
              variant="outline"
              size="sm"
              onClick={fetchStatus}
              disabled={loading}
              className="h-7 text-xs gap-1.5"
            >
              <RefreshCw className={`w-3.5 h-3.5 ${loading ? 'animate-spin' : ''}`} /> Refresh
            </Button>
          </div>
        </div>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="bg-amber-500/10 border border-amber-500/20 rounded-lg p-2.5 text-xs text-amber-600 dark:text-amber-400 flex items-start gap-2">
          <Cloud className="w-4 h-4 shrink-0 mt-0.5 text-amber-500" />
          <div className="leading-relaxed">
            <span className="font-semibold block">Alpha Testing Mode:</span>
            Central VPS multi-workstation replication is currently in active staging. All cases, revisions, and draft reports are preserved securely in your local workstation vault and can be backed up to your personal Google Drive.
          </div>
        </div>
        <div className="flex flex-wrap items-center justify-between gap-3 p-3 rounded-lg border border-border/60 bg-muted/20">
          <div className="space-y-1">
            <div className="flex items-center gap-2">
              <span className="text-xs font-semibold">Target VPS Endpoint:</span>
              <Badge variant={summary?.configured ? 'default' : 'outline'} className="text-[10px]">
                {summary?.configured ? 'CONFIGURED' : 'UNCONFIGURED'}
              </Badge>
            </div>
            <p className="text-xs font-mono text-muted-foreground break-all">
              {summary?.vpsUrl || 'Not set in .env (add VPS_SYNC_URL=https://<vps-domain>)'}
            </p>
          </div>

          <div className="flex items-center gap-2">
            <Button
              variant="outline"
              size="sm"
              onClick={handleTestConnection}
              disabled={testing || !summary?.configured}
              className="text-xs gap-1.5 h-8"
            >
              <RefreshCw className={`w-3 h-3 ${testing ? 'animate-spin' : ''}`} />
              Test Connection
            </Button>
            <Button
              size="sm"
              onClick={handleSyncNow}
              disabled={syncing || !summary?.configured}
              className="text-xs gap-1.5 h-8 bg-primary hover:bg-primary/90"
            >
              <Send className={`w-3 h-3 ${syncing ? 'animate-spin' : ''}`} />
              Sync Now
            </Button>
          </div>
        </div>

        {testResult && (
          <div
            className={`p-2.5 rounded-lg border text-xs flex items-center gap-2 ${
              testResult.success
                ? 'bg-emerald-500/10 border-emerald-500/30 text-emerald-800 dark:text-emerald-300'
                : 'bg-rose-500/10 border-rose-500/30 text-rose-800 dark:text-rose-300'
            }`}
          >
            {testResult.success ? <CheckCircle className="w-4 h-4 shrink-0" /> : <AlertCircle className="w-4 h-4 shrink-0" />}
            <span>
              {testResult.message} ({testResult.latencyMs}ms)
            </span>
          </div>
        )}

        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 pt-2">
          <div className="p-2.5 rounded-lg bg-surface-container border border-border/50 text-center">
            <div className="text-[11px] text-muted-foreground uppercase font-bold">Pending Offline</div>
            <div className="text-lg font-mono font-bold text-amber-500">{summary?.pendingCount ?? 0}</div>
          </div>
          <div className="p-2.5 rounded-lg bg-surface-container border border-border/50 text-center">
            <div className="text-[11px] text-muted-foreground uppercase font-bold">Synced to VPS</div>
            <div className="text-lg font-mono font-bold text-emerald-500">{summary?.syncedCount ?? 0}</div>
          </div>
          <div className="p-2.5 rounded-lg bg-surface-container border border-border/50 text-center">
            <div className="text-[11px] text-muted-foreground uppercase font-bold">Failed / Retries</div>
            <div className="text-lg font-mono font-bold text-rose-500">{summary?.failedCount ?? 0}</div>
          </div>
          <div className="p-2.5 rounded-lg bg-surface-container border border-border/50 text-center">
            <div className="text-[11px] text-muted-foreground uppercase font-bold">Initial Seed</div>
            <Button
              variant="outline"
              size="sm"
              onClick={handleBackfillOutbox}
              disabled={backfilling}
              className="text-[10px] h-7 mt-1 w-full"
              title="Queue all current local cases for synchronization"
            >
              Queue All Cases
            </Button>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
