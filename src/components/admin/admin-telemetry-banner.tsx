'use client';

import React from 'react';
import { Users, Monitor, Server, Download, Activity, ArrowUpRight } from 'lucide-react';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import type { TelemetrySummary } from '@/services/telemetry.service';

interface AdminTelemetryBannerProps {
  summary: TelemetrySummary;
  onViewWorkstations?: () => void;
}

export function AdminTelemetryBanner({ summary, onViewWorkstations }: AdminTelemetryBannerProps) {
  const { users, workstations, clinicNodes, downloads } = summary;

  return (
    <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4">
      {/* 1. Total Clinicians */}
      <Card className="border-outline-variant/80 bg-surface-container shadow-2xs hover:border-outline transition-colors">
        <CardContent className="p-3.5 sm:p-4 space-y-2">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-1.5 text-secondary text-xs font-medium">
              <Users className="w-3.5 h-3.5 text-primary" />
              <span>Registered Clinicians</span>
            </div>
            {users.waitlisted > 0 && (
              <Badge variant="warning" className="text-[10px] px-1.5 py-0">
                {users.waitlisted} waitlist
              </Badge>
            )}
          </div>
          <div className="flex items-baseline justify-between">
            <div className="text-2xl font-bold font-headline text-on-surface">
              {users.total}
            </div>
            <div className="text-[11px] text-secondary">
              <span className="font-semibold text-emerald-600 dark:text-emerald-400">
                {users.active} Active
              </span>
              {users.pendingInvite > 0 && ` • ${users.pendingInvite} Invites`}
            </div>
          </div>
        </CardContent>
      </Card>

      {/* 2. Active Desktop Workstations */}
      <Card
        onClick={onViewWorkstations}
        className="border-outline-variant/80 bg-surface-container shadow-2xs hover:border-primary/50 transition-colors cursor-pointer group"
      >
        <CardContent className="p-3.5 sm:p-4 space-y-2">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-1.5 text-secondary text-xs font-medium">
              <Monitor className="w-3.5 h-3.5 text-sky-500" />
              <span>Desktop Workstations</span>
            </div>
            <div className="flex items-center gap-1">
              {workstations.onlineNow > 0 ? (
                <span className="inline-flex items-center gap-1 text-[10px] text-emerald-600 dark:text-emerald-400 font-medium">
                  <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
                  {workstations.onlineNow} Online
                </span>
              ) : (
                <span className="text-[10px] text-secondary">0 Online</span>
              )}
              {onViewWorkstations && (
                <ArrowUpRight className="w-3 h-3 text-secondary opacity-0 group-hover:opacity-100 transition-opacity" />
              )}
            </div>
          </div>
          <div className="flex items-baseline justify-between">
            <div className="text-2xl font-bold font-headline text-on-surface">
              {workstations.totalInstalled}
            </div>
            <div className="text-[11px] text-secondary">
              <span>Installed Clients</span>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* 3. Hospital Clinic Nodes */}
      <Card className="border-outline-variant/80 bg-surface-container shadow-2xs hover:border-outline transition-colors">
        <CardContent className="p-3.5 sm:p-4 space-y-2">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-1.5 text-secondary text-xs font-medium">
              <Server className="w-3.5 h-3.5 text-indigo-500" />
              <span>Clinic Edge Nodes</span>
            </div>
            <span className="inline-flex items-center gap-1 text-[10px] text-indigo-600 dark:text-indigo-400 font-medium">
              <span className="w-1.5 h-1.5 rounded-full bg-indigo-500" />
              Orthanc LAN
            </span>
          </div>
          <div className="flex items-baseline justify-between">
            <div className="text-2xl font-bold font-headline text-on-surface">
              {clinicNodes.online}
              <span className="text-xs text-secondary font-normal font-sans ml-1">
                / {clinicNodes.total}
              </span>
            </div>
            <div className="text-[11px] text-secondary">
              <span>PACS Harvesters</span>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* 4. Desktop App Downloads */}
      <Card className="border-outline-variant/80 bg-surface-container shadow-2xs hover:border-outline transition-colors">
        <CardContent className="p-3.5 sm:p-4 space-y-2">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-1.5 text-secondary text-xs font-medium">
              <Download className="w-3.5 h-3.5 text-amber-500" />
              <span>Workstation Downloads</span>
            </div>
            <Badge variant="outline" className="text-[10px] px-1.5 py-0 font-mono">
              v1.0.1
            </Badge>
          </div>
          <div className="flex items-baseline justify-between">
            <div className="text-2xl font-bold font-headline text-on-surface">
              {downloads.totalDownloads}
            </div>
            <div className="text-[11px] text-secondary truncate max-w-[110px]" title={downloads.lastDownloadAt || 'No downloads yet'}>
              {downloads.lastDownloadAt
                ? new Date(downloads.lastDownloadAt).toLocaleDateString()
                : 'All-time total'}
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
