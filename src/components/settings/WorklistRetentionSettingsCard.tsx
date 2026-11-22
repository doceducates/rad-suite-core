'use client';

import React, { useState, useEffect, useCallback } from 'react';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Trash2, ShieldCheck, Clock, RefreshCw, AlertCircle, Database } from 'lucide-react';
import { notify } from '@/services/notification.service';

interface RetentionMetrics {
  daysToKeep: number;
  purgeableCount: number;
  protectedCasesCount: number;
  totalStudiesCount: number;
}

export function WorklistRetentionSettingsCard() {
  const [daysToKeep, setDaysToKeep] = useState<number>(5);
  const [metrics, setMetrics] = useState<RetentionMetrics | null>(null);
  const [loading, setLoading] = useState(false);
  const [purging, setPurging] = useState(false);

  const fetchMetrics = useCallback(async (days = daysToKeep) => {
    setLoading(true);
    try {
      const res = await fetch(`/api/system/retention?days=${days}`);
      if (res.ok) {
        const data = await res.json();
        if (data.success) {
          setMetrics(data.metrics);
        }
      }
    } catch {
      // Background retry silently
    } finally {
      setLoading(false);
    }
  }, [daysToKeep]);

  useEffect(() => {
    fetchMetrics(daysToKeep);
  }, [fetchMetrics, daysToKeep]);

  const handlePurgeNow = async () => {
    setPurging(true);
    try {
      const res = await fetch('/api/system/retention', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'purge-now', daysToKeep }),
      });

      const data = await res.json();
      if (res.ok && data.success) {
        notify.success(
          `Purged ${data.summary.orphanedOrdersPruned} unassigned HMIS orders older than ${daysToKeep} days. ${data.summary.protectedCasesCount} doctor cases preserved.`
        );
        fetchMetrics(daysToKeep);
      } else {
        notify.error(data.error || 'Failed executing retention purge');
      }
    } catch (err: any) {
      notify.error(err.message || 'Network error triggering purge');
    } finally {
      setPurging(false);
    }
  };

  return (
    <Card className="border-border bg-card">
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between">
          <CardTitle className="text-sm flex items-center gap-2 font-semibold text-foreground">
            <Trash2 className="w-4 h-4 text-rose-500" /> HMIS Worklist Auto-Purge & Retention Reaper
          </CardTitle>
          <Badge variant="outline" className="text-[10px] text-emerald-600 dark:text-emerald-400 border-emerald-500/30">
            Auto-Purge Active (5d)
          </Badge>
        </div>
      </CardHeader>
      <CardContent className="space-y-4 text-xs">
        <p className="text-muted-foreground text-[11px] leading-relaxed">
          Automatically removes unassigned, unscanned hospital HMIS orders older than your chosen threshold.
          <strong className="text-foreground ml-1">
            Zero-Loss Doctor Vault: All &quot;My Cases&quot;, claimed studies, and draft reports are permanently protected and never deleted.
          </strong>
        </p>

        {/* Retention Threshold Controls */}
        <div className="flex flex-wrap items-center justify-between gap-3 p-3 rounded-lg border border-border bg-surface-container/40">
          <div className="space-y-1">
            <label className="text-[11px] font-medium text-foreground flex items-center gap-1.5">
              <Clock className="w-3.5 h-3.5 text-primary" /> Retention Age Threshold:
            </label>
            <p className="text-[10px] text-muted-foreground">
              Unassigned orders older than this will be pruned from the local database.
            </p>
          </div>

          <div className="flex items-center gap-2">
            {[3, 5, 7, 14, 30].map((d) => (
              <button
                key={d}
                type="button"
                onClick={() => {
                  setDaysToKeep(d);
                  fetchMetrics(d);
                }}
                className={`px-2.5 py-1 text-[11px] font-medium rounded-md transition-all ${
                  daysToKeep === d
                    ? 'bg-primary text-primary-foreground shadow-sm'
                    : 'bg-surface-container text-muted-foreground hover:bg-surface-container-highest hover:text-foreground'
                }`}
              >
                {d} Days
              </button>
            ))}
          </div>
        </div>

        {/* Live Metrics Grid */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
          <div className="p-3 rounded-lg border border-emerald-500/20 bg-emerald-500/5">
            <div className="flex items-center justify-between">
              <span className="text-[11px] font-medium text-emerald-700 dark:text-emerald-300 flex items-center gap-1">
                <ShieldCheck className="w-3.5 h-3.5" /> Doctor Cases Vault
              </span>
              <Badge variant="success" className="text-[9px] px-1.5 py-0">Protected</Badge>
            </div>
            <div className="text-lg font-bold text-foreground mt-1.5">
              {metrics ? metrics.protectedCasesCount : '...'}
            </div>
            <p className="text-[10px] text-muted-foreground mt-0.5">
              Claimed or reported by you (Kept Forever)
            </p>
          </div>

          <div className="p-3 rounded-lg border border-amber-500/20 bg-amber-500/5">
            <div className="flex items-center justify-between">
              <span className="text-[11px] font-medium text-amber-700 dark:text-amber-300 flex items-center gap-1">
                <Trash2 className="w-3.5 h-3.5" /> Purgeable HMIS Orders
              </span>
              <Badge variant="warning" className="text-[9px] px-1.5 py-0">&gt;{daysToKeep}d Old</Badge>
            </div>
            <div className="text-lg font-bold text-foreground mt-1.5">
              {metrics ? metrics.purgeableCount : '...'}
            </div>
            <p className="text-[10px] text-muted-foreground mt-0.5">
              Unassigned, unclaimed orders ready to purge
            </p>
          </div>

          <div className="p-3 rounded-lg border border-border bg-surface-container/30">
            <div className="flex items-center justify-between">
              <span className="text-[11px] font-medium text-foreground flex items-center gap-1">
                <Database className="w-3.5 h-3.5 text-primary" /> Total Worklist Cases
              </span>
              <Button
                size="sm"
                variant="ghost"
                className="h-6 w-6 p-0"
                onClick={() => fetchMetrics(daysToKeep)}
                disabled={loading}
              >
                <RefreshCw className={`w-3 h-3 ${loading ? 'animate-spin' : ''}`} />
              </Button>
            </div>
            <div className="text-lg font-bold text-foreground mt-1.5">
              {metrics ? metrics.totalStudiesCount : '...'}
            </div>
            <p className="text-[10px] text-muted-foreground mt-0.5">
              Total studies indexed in database
            </p>
          </div>
        </div>

        {/* Action Row */}
        <div className="flex items-center justify-between pt-2 border-t border-border">
          <div className="flex items-center gap-1.5 text-[10px] text-muted-foreground">
            <AlertCircle className="w-3.5 h-3.5 text-muted-foreground flex-shrink-0" />
            <span>Scheduled background reaper executes daily and compacts database indexes.</span>
          </div>

          <Button
            size="sm"
            variant="danger"
            onClick={handlePurgeNow}
            disabled={purging || (metrics?.purgeableCount === 0)}
            className="text-[11px] h-8 px-3 gap-1.5"
          >
            <Trash2 className="w-3.5 h-3.5" />
            {purging ? 'Purging Old Cases...' : `Purge Old Cases (> ${daysToKeep}d)`}
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}
