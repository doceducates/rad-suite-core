'use client';

import React, { useState } from 'react';
import { BarChart3, AlertCircle, Users, CheckCircle2, HelpCircle } from 'lucide-react';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card';
import type { PendingAnalytics } from '@/types/dashboard';

interface DashboardPendingAnalyticsProps {
  analytics: PendingAnalytics;
}

export function DashboardPendingAnalytics({ analytics }: DashboardPendingAnalyticsProps) {
  const [activeTab, setActiveTab] = useState<'reason' | 'consultant'>('reason');

  if (analytics.totalPending === 0) {
    return (
      <Card className="bg-surface-container-low border-outline-variant/60 shadow-xs flex flex-col h-full">
        <CardHeader className="pb-3 p-4 sm:p-5">
          <CardTitle className="text-base sm:text-lg flex items-center gap-2">
            <BarChart3 className="w-4 h-4 text-primary" />
            <span>Pending Cases Bottlenecks</span>
          </CardTitle>
          <p className="text-xs text-secondary">Analysis of hold reasons and consultant workload</p>
        </CardHeader>
        <CardContent className="p-6 text-center text-xs text-secondary my-auto">
          <CheckCircle2 className="w-8 h-8 mx-auto text-emerald-500 mb-2" />
          <p className="font-semibold text-on-surface">No Clinical Bottlenecks</p>
          <p className="text-[11px] mt-0.5">Zero cases are currently pending or waiting on clarification.</p>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className="bg-surface-container-low border-outline-variant/60 shadow-xs flex flex-col h-full">
      <CardHeader className="pb-3 p-4 sm:p-5 space-y-3">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2.5">
          <div>
            <CardTitle className="text-base sm:text-lg flex items-center gap-2">
              <BarChart3 className="w-4 h-4 text-primary" />
              <span>Pending Cases Analytics</span>
            </CardTitle>
            <p className="text-xs text-secondary">
              Distribution of clinical delay reasons & consultant allocation
            </p>
          </div>

          {/* Interactive Dual-Tab Toggle */}
          <div className="flex items-center p-0.5 rounded-lg bg-surface border border-outline-variant/50 self-start sm:self-auto">
            <button
              type="button"
              onClick={() => setActiveTab('reason')}
              className={`px-2.5 py-1 text-xs font-semibold rounded-md transition-all cursor-pointer flex items-center gap-1.5 ${
                activeTab === 'reason'
                  ? 'bg-primary text-on-primary shadow-xs'
                  : 'text-secondary hover:text-on-surface'
              }`}
            >
              <AlertCircle className="w-3.5 h-3.5" />
              <span>By Cause</span>
            </button>
            <button
              type="button"
              onClick={() => setActiveTab('consultant')}
              className={`px-2.5 py-1 text-xs font-semibold rounded-md transition-all cursor-pointer flex items-center gap-1.5 ${
                activeTab === 'consultant'
                  ? 'bg-primary text-on-primary shadow-xs'
                  : 'text-secondary hover:text-on-surface'
              }`}
            >
              <Users className="w-3.5 h-3.5" />
              <span>By Consultant</span>
            </button>
          </div>
        </div>

        {/* Executive Summary Metrics Pill Row */}
        <div className="grid grid-cols-2 sm:grid-cols-3 gap-2 pt-1">
          <div className="p-2 rounded-lg bg-surface border border-outline-variant/40">
            <p className="text-[10px] text-secondary uppercase font-semibold">Total On Hold</p>
            <p className="text-sm font-bold font-headline text-on-surface mt-0.5">
              {analytics.totalPending} Cases
            </p>
          </div>
          <div className="p-2 rounded-lg bg-surface border border-outline-variant/40">
            <p className="text-[10px] text-secondary uppercase font-semibold">Leading Bottleneck</p>
            <p className="text-xs font-bold text-amber-600 dark:text-amber-400 truncate mt-0.5" title={analytics.mostCommonReason}>
              {analytics.mostCommonReason}
            </p>
          </div>
          <div className="p-2 rounded-lg bg-surface border border-outline-variant/40 col-span-2 sm:col-span-1">
            <p className="text-[10px] text-secondary uppercase font-semibold">Highest Volume</p>
            <p className="text-xs font-bold text-primary truncate mt-0.5" title={analytics.highestVolumeConsultant}>
              {analytics.highestVolumeConsultant}
            </p>
          </div>
        </div>
      </CardHeader>

      <CardContent className="p-4 sm:p-5 pt-0 flex-1">
        {activeTab === 'reason' ? (
          /* 1. Common Causes of Holds Breakdown Bar Graph */
          <div className="space-y-3">
            <div className="flex justify-between items-center text-[11px] font-semibold text-secondary">
              <span>Primary Reason Category</span>
              <span>Case Share</span>
            </div>
            <div className="space-y-2.5 max-h-[220px] overflow-y-auto pr-1">
              {analytics.byReason.map((item) => (
                <div key={item.reason} className="space-y-1">
                  <div className="flex justify-between items-center text-xs">
                    <span className="font-medium text-on-surface truncate max-w-[200px] sm:max-w-xs" title={item.label}>
                      {item.label}
                    </span>
                    <span className="font-mono text-secondary text-[11px] font-semibold shrink-0">
                      {item.count} <span className="opacity-75">({item.percentage}%)</span>
                    </span>
                  </div>
                  {/* Visual Horizontal Frequency Bar */}
                  <div className="w-full h-2 rounded-full bg-surface-container-high overflow-hidden">
                    <div
                      className="h-full rounded-full bg-amber-500 transition-all duration-500 ease-out"
                      style={{ width: `${Math.max(4, item.percentage)}%` }}
                    />
                  </div>
                </div>
              ))}
            </div>
          </div>
        ) : (
          /* 2. Consultant Pending Workload Breakdown Bar Graph */
          <div className="space-y-3">
            <div className="flex justify-between items-center text-[11px] font-semibold text-secondary">
              <span>Consultant / Reviewer</span>
              <span>Pending Cases</span>
            </div>
            <div className="space-y-2.5 max-h-[220px] overflow-y-auto pr-1">
              {analytics.byConsultant.map((item) => (
                <div key={item.consultantName} className="space-y-1">
                  <div className="flex justify-between items-center text-xs">
                    <span className="font-medium text-on-surface truncate max-w-[200px] sm:max-w-xs flex items-center gap-1">
                      <Users className="w-3 h-3 text-secondary shrink-0" />
                      <span>{item.consultantName}</span>
                    </span>
                    <span className="font-mono text-secondary text-[11px] font-semibold shrink-0">
                      {item.count} <span className="opacity-75">({item.percentage}%)</span>
                    </span>
                  </div>
                  {/* Visual Horizontal Workload Bar */}
                  <div className="w-full h-2 rounded-full bg-surface-container-high overflow-hidden">
                    <div
                      className="h-full rounded-full bg-primary transition-all duration-500 ease-out"
                      style={{ width: `${Math.max(4, item.percentage)}%` }}
                    />
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
