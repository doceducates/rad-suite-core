'use client';

import React from 'react';
import Link from 'next/link';
import { AlertCircle, CheckCircle, Clock, Send, Layers, TrendingUp } from 'lucide-react';
import { Card } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import type { DashboardKpiStats } from '@/types/dashboard';

interface DashboardKpiGridProps {
  kpis: DashboardKpiStats;
}

export function DashboardKpiGrid({ kpis }: DashboardKpiGridProps) {
  const goalProgress = Math.min(
    100,
    Math.round((kpis.todayCompletedCount / Math.max(1, kpis.shiftGoalTarget)) * 100)
  );

  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3.5">
      {/* 1. STAT Emergency Queue */}
      <Link href="/hmis?priority=stat" className="block group">
        <Card className={`p-4 h-full transition-all duration-200 hover:shadow-xs hover:border-error/50 ${
          kpis.statPendingCount > 0
            ? 'bg-error-container/15 border-error/40 ring-1 ring-error/20'
            : 'bg-surface-container-low border-outline-variant/60'
        }`}>
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-secondary uppercase tracking-wider">
              Emergency STAT
            </span>
            <div className={`p-1.5 rounded-lg ${
              kpis.statPendingCount > 0
                ? 'bg-error/15 text-error animate-pulse'
                : 'bg-surface-container text-secondary'
            }`}>
              <AlertCircle className="w-4 h-4" />
            </div>
          </div>

          <div className="mt-2.5 flex items-baseline gap-2">
            <span className={`text-2xl sm:text-3xl font-black font-headline ${
              kpis.statPendingCount > 0 ? 'text-error' : 'text-on-surface'
            }`}>
              {kpis.statPendingCount}
            </span>
            <span className="text-xs text-secondary font-medium">Pending Review</span>
          </div>

          <p className="text-[11px] text-secondary mt-1.5 flex items-center gap-1">
            {kpis.statPendingCount > 0 ? (
              <span className="text-error font-medium">Acute trauma & emergency scans</span>
            ) : (
              <span>All emergency cases reported</span>
            )}
          </p>
        </Card>
      </Link>

      {/* 2. Reporting Velocity & Shift Target */}
      <Link href="/hmis?status=final" className="block group">
        <Card className="p-4 h-full bg-surface-container-low border-outline-variant/60 transition-all duration-200 hover:shadow-xs hover:border-primary/40">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-secondary uppercase tracking-wider">
              Reporting Velocity
            </span>
            <div className="p-1.5 rounded-lg bg-primary/10 text-primary">
              <TrendingUp className="w-4 h-4" />
            </div>
          </div>

          <div className="mt-2.5 flex items-baseline gap-2">
            <span className="text-2xl sm:text-3xl font-black font-headline text-on-surface">
              {kpis.todayCompletedCount}
            </span>
            <span className="text-xs text-secondary font-medium">
              / {kpis.shiftGoalTarget} Shift Goal ({goalProgress}%)
            </span>
          </div>

          {/* Goal Progress Track */}
          <div className="w-full bg-surface-container-high rounded-full h-1.5 mt-2 overflow-hidden">
            <div
              className="bg-primary h-full rounded-full transition-all duration-500 ease-out"
              style={{ width: `${goalProgress}%` }}
            />
          </div>
        </Card>
      </Link>

      {/* 3. Active Draft Vault */}
      <Link href="/my-cases" className="block group">
        <Card className="p-4 h-full bg-surface-container-low border-outline-variant/60 transition-all duration-200 hover:shadow-xs hover:border-tertiary/40">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-secondary uppercase tracking-wider">
              Drafts In-Flight
            </span>
            <div className="p-1.5 rounded-lg bg-tertiary-container/30 text-tertiary">
              <Layers className="w-4 h-4" />
            </div>
          </div>

          <div className="mt-2.5 flex items-baseline gap-2">
            <span className="text-2xl sm:text-3xl font-black font-headline text-on-surface">
              {kpis.myDraftsCount}
            </span>
            <span className="text-xs text-secondary font-medium">My Active Drafts</span>
          </div>

          <p className="text-[11px] text-secondary mt-1.5">
            {kpis.pgrAwaitingReviewCount > 0 ? (
              <span className="text-tertiary font-medium">
                {kpis.pgrAwaitingReviewCount} PGR preliminary awaiting review
              </span>
            ) : (
              <span>Durable local vault protected</span>
            )}
          </p>
        </Card>
      </Link>

      {/* 4. HMIS Zero-Submit Sync Pulse */}
      <Link href="/hmis" className="block group">
        <Card className="p-4 h-full bg-surface-container-low border-outline-variant/60 transition-all duration-200 hover:shadow-xs hover:border-primary/40">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-secondary uppercase tracking-wider">
              Punjab HMIS Bridge
            </span>
            <div className="p-1.5 rounded-lg bg-primary/10 text-primary">
              <Send className="w-4 h-4" />
            </div>
          </div>

          <div className="mt-2.5 flex items-baseline gap-2">
            <span className="text-2xl sm:text-3xl font-black font-headline text-primary">
              {kpis.hmisVaultSyncedCount}
            </span>
            <span className="text-xs text-secondary font-medium">Drafts Synced</span>
          </div>

          <div className="flex items-center gap-1.5 mt-1.5">
            <CheckCircle className="w-3.5 h-3.5 text-primary" />
            <span className="text-[11px] font-medium text-primary">
              Invariant 5: Zero-Submit Locked
            </span>
          </div>
        </Card>
      </Link>
    </div>
  );
}
