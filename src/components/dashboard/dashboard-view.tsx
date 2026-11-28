'use client';

import React, { useState, useEffect, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import { DashboardHeader } from './dashboard-header';
import { DashboardActiveCaseHero } from './dashboard-active-case-hero';
import { DashboardKpiGrid } from './dashboard-kpi-grid';
import { DashboardUrgentTriage } from './dashboard-urgent-triage';
import { DashboardPendingQueue } from './dashboard-pending-queue';
import { DashboardPendingAnalytics } from './dashboard-pending-analytics';
import { DashboardModalityChart } from './dashboard-modality-chart';
import { DashboardSystemRadar } from './dashboard-system-radar';
import { DashboardQuickLaunchpad } from './dashboard-quick-launchpad';
import { DashboardRecentActivity } from './dashboard-recent-activity';
import { AdminTelemetryBanner } from '@/components/admin/admin-telemetry-banner';
import { WorklistManualCaseModal } from '@/components/worklist/worklist-manual-case-modal';
import { notify } from '@/services/notification.service';
import { clientViewCache } from '@/lib/client-view-cache';
import type { DashboardSummaryData } from '@/types/dashboard';
import type { TelemetrySummary } from '@/services/telemetry.service';

interface DashboardViewProps {
  initialData: DashboardSummaryData;
  userName: string;
  userRole?: string;
  userTitle?: string;
  adminTelemetry?: TelemetrySummary | null;
}

export function DashboardView({
  initialData,
  userName,
  userRole = 'radiologist',
  userTitle,
  adminTelemetry,
}: DashboardViewProps) {
  const router = useRouter();
  const isAdmin = userRole?.toLowerCase() === 'admin';
  const [data, setData] = useState<DashboardSummaryData>(() => {
    clientViewCache.set('dashboard:summary', initialData, 30_000);
    return initialData;
  });
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [isManualModalOpen, setIsManualModalOpen] = useState(false);

  const fetchLatestTelemetry = useCallback(async (isSilent = false) => {
    if (!isSilent) setIsRefreshing(true);
    try {
      const res = await fetch('/api/dashboard/stats', { cache: 'no-store' });
      if (res.ok) {
        const json = await res.json();
        if (json.data) {
          setData(json.data);
          clientViewCache.set('dashboard:summary', json.data, 30_000);
          if (!isSilent) notify.success('Dashboard telemetry updated');
        }
      }
    } catch {
      if (!isSilent) notify.error('Failed to refresh dashboard telemetry');
    } finally {
      if (!isSilent) setIsRefreshing(false);
    }
  }, []);

  // Periodic visibility-gated auto-polling every 60 seconds (zero load when tab is hidden)
  useEffect(() => {
    const timer = setInterval(() => {
      if (typeof document !== 'undefined' && document.visibilityState !== 'visible') return;
      fetchLatestTelemetry(true);
    }, 60000);
    return () => clearInterval(timer);
  }, [fetchLatestTelemetry]);

  // Refresh quietly on live SSE mutation events (debounced)
  useEffect(() => {
    if (typeof window === 'undefined') return;
    let debounceTimer: ReturnType<typeof setTimeout> | null = null;
    const onMutation = () => {
      if (document.visibilityState !== 'visible') return;
      if (debounceTimer) clearTimeout(debounceTimer);
      debounceTimer = setTimeout(() => {
        fetchLatestTelemetry(true);
      }, 1000);
    };
    window.addEventListener('radsuite:sync-mutation', onMutation);
    return () => {
      window.removeEventListener('radsuite:sync-mutation', onMutation);
      if (debounceTimer) clearTimeout(debounceTimer);
    };
  }, [fetchLatestTelemetry]);

  // Global Ergonomic Hotkeys:
  // [Space]: Resume active draft
  // [W]: Go to Worklist
  // [M]: Go to My Cases
  // [R]: Refresh telemetry
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      const target = e.target as HTMLElement;
      if (target?.tagName === 'INPUT' || target?.tagName === 'TEXTAREA' || target?.isContentEditable) return;

      if (e.key === ' ' && data.activeDraft?.accessionNumber && !e.ctrlKey && !e.metaKey) {
        e.preventDefault();
        router.push(`/workstation?accession=${encodeURIComponent(data.activeDraft.accessionNumber)}`);
      } else if (e.key.toLowerCase() === 'w' && !e.ctrlKey && !e.metaKey) {
        e.preventDefault();
        router.push('/hmis');
      } else if (e.key.toLowerCase() === 'm' && !e.ctrlKey && !e.metaKey) {
        e.preventDefault();
        router.push('/my-cases');
      } else if (e.key.toLowerCase() === 'r' && !e.ctrlKey && !e.metaKey) {
        e.preventDefault();
        fetchLatestTelemetry(false);
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [data.activeDraft, router, fetchLatestTelemetry]);

  return (
    <div className="space-y-4 sm:space-y-5 max-w-7xl mx-auto pb-10">
      {/* 1. Shift & Clinical Context Header */}
      <DashboardHeader
        shift={data.shift}
        userName={userName}
        userRole={userTitle || userRole}
        isRefreshing={isRefreshing}
        onRefresh={() => fetchLatestTelemetry(false)}
        onOpenManualCase={() => setIsManualModalOpen(true)}
      />

      {/* Admin System Telemetry & Workstations Bar */}
      {adminTelemetry && (
        <AdminTelemetryBanner
          summary={adminTelemetry}
          onViewWorkstations={() => router.push('/users')}
        />
      )}

      {/* 2. Smart "Continue Where You Left Off" Hero Card */}
      <DashboardActiveCaseHero draft={data.activeDraft} />

      {/* 3. 4-Pillar Clinical Telemetry Bento Grid */}
      <DashboardKpiGrid kpis={data.kpis} />

      {/* 4. Asymmetric Bento Grid: Clinical Core & Intelligence */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-4 sm:gap-5">
        {/* Left Column: Urgent Triage Queue, Pending Cases Queue & Quick Launchpad */}
        <div className="lg:col-span-7 space-y-4 sm:space-y-5 flex flex-col">
          <div>
            <DashboardUrgentTriage
              cases={data.urgentTriageCases}
              totalShiftCases={data.kpis.totalShiftCases}
            />
          </div>

          <div>
            <DashboardPendingQueue cases={data.pendingQueue} />
          </div>

          <div>
            <DashboardQuickLaunchpad />
          </div>
        </div>

        {/* Right Column: Modality Cadence, Pending Analytics, Health Radar & Audit Stream */}
        <div className="lg:col-span-5 space-y-4 sm:space-y-5 flex flex-col">
          <DashboardModalityChart
            modalities={data.modalityDistribution}
            hourlyCurve={data.hourlyReportingCurve}
          />

          <DashboardPendingAnalytics analytics={data.pendingAnalytics} />

          {/* Admin-Only: Infrastructure Node Telemetry & Security Audit Trail */}
          {isAdmin && data.systemHealth && (
            <DashboardSystemRadar health={data.systemHealth} />
          )}

          {isAdmin && data.recentActivity && data.recentActivity.length > 0 && (
            <DashboardRecentActivity
              activities={data.recentActivity}
              isAdmin={true}
            />
          )}
        </div>
      </div>

      {/* Manual Intake Case Modal */}
      <WorklistManualCaseModal
        isOpen={isManualModalOpen}
        onClose={() => setIsManualModalOpen(false)}
        onCaseCreated={() => {
          fetchLatestTelemetry(false);
        }}
      />
    </div>
  );
}
